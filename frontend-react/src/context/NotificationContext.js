// NotificationContext.ts — Kho thông báo của người đang đăng nhập.
//
// Nguồn dữ liệu gồm hai phần:
//  1. Lịch sử: gọi REST một lần lúc đăng nhập / mở trang.
//  2. Tin mới: backend đẩy xuống qua Socket.IO nên hiện ra ngay, không cần polling.
//
// Mỗi vai trò nghe một "group" riêng trên hub: nhân viên nghe theo vai trò
// (role:admin, role:retail...), khách hàng nghe theo mã tài khoản của mình.
import { writable, derived, get, readonly } from '../lib/store';
import { toast } from 'sonner';
import { authStore } from './AuthContext';
import { languageStore } from './LanguageContext';
import { nexusStore } from './NexusContext';
import { fetchNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from '../lib/api';
import { RealtimeEvents, joinGroup, leaveGroup, onRealtime, realtimeStatus, startRealtime } from '../lib/realtime';
/** Giữ tối đa 100 thông báo trong bộ nhớ, đủ cho hộp thông báo mà không phình RAM. */
const MAX_ITEMS = 100;
/** Gộp nhiều tín hiệu "dữ liệu đã đổi" xảy ra sát nhau thành một lần tải lại. */
const SYNC_DEBOUNCE_MS = 700;
const notifications = writable([]);
const audience = writable(null);
const isLoading = writable(false);
const unreadCount = derived(notifications, (list) => list.filter((n) => !n.read).length);
/**
 * Nhân viên nghe theo vai trò, khách hàng nghe theo mã tài khoản.
 * Khách chưa được cấp mã (đơn chưa duyệt xong) thì chưa có gì để nghe.
 */
function audienceFor(user) {
  if (!user) return null;
  if (user.role === 'user') {
    const key = (user.accountId ?? user.id ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return key.length >= 8 ? `account:${key}` : null;
  }
  return `role:${user.role}`;
}
/** Tách "role:admin" -> { kind: 'role', value: 'admin' } để gọi đúng hàm trên hub. */
function splitAudience(key) {
  if (key.startsWith('role:')) return { kind: 'role', value: key.slice(5) };
  if (key.startsWith('account:')) return { kind: 'account', value: key.slice(8) };
  return null;
}
async function loadHistory(key) {
  isLoading.set(true);
  try {
    const list = await fetchNotificationsApi(key, MAX_ITEMS);
    // Trong lúc chờ mạng, người dùng có thể đã đăng xuất hoặc đổi vai trò.
    if (get(audience) === key) notifications.set(list);
  } catch {
    // Backend/Mongo chưa sẵn sàng: để danh sách trống, tin mới vẫn hiện được qua Socket.IO.
  } finally {
    isLoading.set(false);
  }
}
// ---- Đổi người nhận mỗi khi đăng nhập / đăng xuất / chuyển vai trò ----
let currentKey = null;
authStore.currentUser.subscribe((user) => {
  const nextKey = audienceFor(user);
  if (nextKey === currentKey) return;
  const previousKey = currentKey;
  currentKey = nextKey;
  audience.set(nextKey);
  notifications.set([]);
  if (previousKey) {
    const previous = splitAudience(previousKey);
    if (previous) void leaveGroup(previous.kind, previous.value);
  }
  if (!nextKey) return;
  const next = splitAudience(nextKey);
  if (next) void joinGroup(next.kind, next.value);
  void loadHistory(nextKey);
});
// ---- Nghe sự kiện từ server ----
onRealtime(RealtimeEvents.notification, (incoming) => {
  const key = get(audience);
  // Server đã gửi đúng group, kiểm tra thêm một lần để chắc chắn không lọt tin của người khác
  // (VD: vừa đổi vai trò nhưng gói tin cũ đang trên đường về).
  if (!key || incoming.audience !== key) return;
  notifications.update((list) => {
    const deduped = list.filter(
      (n) => n.id !== incoming.id && !(incoming.replaceKey && n.replaceKey === incoming.replaceKey),
    );
    return [incoming, ...deduped].slice(0, MAX_ITEMS);
  });
  const lang = get(languageStore.language);
  toast.info(lang === 'vi' ? incoming.titleVi : incoming.titleEn, {
    description: lang === 'vi' ? incoming.descVi : incoming.descEn,
  });
});
onRealtime(RealtimeEvents.notificationRead, (payload) => {
  notifications.update((list) => list.map((n) => (n.id === payload.id ? { ...n, read: true } : n)));
});
onRealtime(RealtimeEvents.notificationsRead, () => {
  notifications.update((list) => list.map((n) => ({ ...n, read: true })));
});
// ---- Dữ liệu nghiệp vụ đổi -> tự tải lại dashboard ----
// Nhờ vậy đơn hàng người khác vừa duyệt xuất hiện ngay trong bảng, không phải bấm F5.
let syncTimer = null;
onRealtime(RealtimeEvents.dataChanged, () => {
  // Khách vãng lai ở trang chủ không cần kéo lại toàn bộ dữ liệu nghiệp vụ.
  if (!get(authStore.currentUser)) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    if (get(nexusStore.isSyncing)) return;
    void nexusStore.syncWithDatabase();
  }, SYNC_DEBOUNCE_MS);
});
// ---- Hành động từ giao diện ----
const markRead = async (id) => {
  const key = get(audience);
  if (!key) return;
  const target = get(notifications).find((n) => n.id === id);
  if (!target || target.read) return;
  // Cập nhật trước cho mượt, lỗi mạng thì trả lại trạng thái cũ.
  notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  try {
    await markNotificationReadApi(key, id);
  } catch {
    notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: false } : n)));
  }
};
const markAllRead = async () => {
  const key = get(audience);
  if (!key) return;
  const snapshot = get(notifications);
  notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  try {
    await markAllNotificationsReadApi(key);
  } catch {
    notifications.set(snapshot);
  }
};
const refresh = async () => {
  const key = get(audience);
  if (key) await loadHistory(key);
};
// Mở kết nối ngay khi ứng dụng khởi động: khách chưa đăng nhập vẫn cần kênh này
// cho chatbox trang chủ.
void startRealtime();
export const notificationStore = {
  notifications: readonly(notifications),
  unreadCount,
  audience: readonly(audience),
  isLoading: readonly(isLoading),
  /** Trạng thái đường truyền real-time, dùng cho chấm "Trực tiếp" trên hộp thông báo. */
  status: realtimeStatus,
  markRead,
  markAllRead,
  refresh,
  // Cố ý KHÔNG có hàm "thêm thông báo cục bộ": thông báo nào cũng phải do backend tạo
  // và lưu vào CSDL, nếu không sẽ lại có loại thông báo chỉ hiện trên trình duyệt.
};
