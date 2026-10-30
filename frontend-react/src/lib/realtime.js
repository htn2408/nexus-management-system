// realtime.ts — Một kết nối Socket.IO duy nhất dùng chung cho cả ứng dụng.
//
// Trước đây mọi thứ đều "hỏi lại server theo giờ": thông báo 15 giây/lần, chat 4 giây/lần.
// Nay backend chủ động đẩy sự kiện xuống qua WebSocket (path /hubs/notifications), nên
// tin nhắn và thông báo hiện ra gần như tức thì mà không tốn request rỗng.
//
// Module này chỉ lo phần "đường ống": giữ kết nối, tự nối lại khi rớt mạng, và cho các
// component đăng ký nghe sự kiện. Việc hiển thị do NotificationContext và các trang lo.
import { io } from 'socket.io-client';
import { writable, readonly } from './store';
import { API_BASE_URL } from './api';
/** Tên sự kiện server đẩy xuống — phải khớp src/constants/realtime.js bên backend. */
export const RealtimeEvents = {
  notification: 'notification',
  notificationRead: 'notificationRead',
  notificationsRead: 'notificationsRead',
  chatMessage: 'chatMessage',
  chatSession: 'chatSession',
  dataChanged: 'dataChanged',
};
const REALTIME_PATH = '/hubs/notifications';
const statusStore = writable('disconnected');
/** Trạng thái kết nối, để giao diện hiện chấm "Trực tiếp / Mất kết nối". */
export const realtimeStatus = readonly(statusStore);
// Tên sự kiện xin vào / rời group, tra theo loại group.
const GROUP_EVENTS = {
  role: { join: 'JoinRole', leave: 'LeaveRole' },
  account: { join: 'JoinAccount', leave: 'LeaveAccount' },
  chat: { join: 'JoinChatSession', leave: 'LeaveChatSession' },
};
let socket = null;
// Những group đang tham gia. Giữ lại để nối lại sau khi mất mạng thì tự vào lại,
// nếu không người dùng sẽ "im lặng" dù thanh trạng thái báo đã kết nối.
const joinedGroups = new Set();
// Danh sách hàm xử lý theo từng tên sự kiện.
const handlers = new Map();
const groupKey = (kind, value) => `${kind}:${value}`;
/** JWT của người đang đăng nhập; server chỉ cho vào group role / account của chính mình. */
const currentToken = () => localStorage.getItem('nexus_jwt_token');
function emitJoin(kind, value) {
  if (!socket?.connected) return;
  // Gửi kèm token mỗi lần xin vào group, vì người dùng có thể đăng nhập khi kết nối đã mở sẵn.
  socket.emit(GROUP_EVENTS[kind].join, value, currentToken(), (result) => {
    if (result && !result.ok) console.warn(`[realtime] Không được phép vào nhóm ${groupKey(kind, value)}`);
  });
}
function rejoinGroups() {
  for (const key of joinedGroups) {
    const separator = key.indexOf(':');
    emitJoin(key.slice(0, separator), key.slice(separator + 1));
  }
}
function dispatch(event, payload) {
  const set = handlers.get(event);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(payload);
    } catch (err) {
      // Một component lỗi không được làm chết các component còn lại.
      console.warn(`[realtime] Lỗi khi xử lý sự kiện ${event}:`, err);
    }
  }
}
function createSocket() {
  // API_BASE_URL rỗng (bản build sau nginx) ⇒ kết nối cùng origin với trang.
  const created = io(API_BASE_URL || undefined, {
    path: REALTIME_PATH,
    // Rớt mạng thì thử lại sau 2 giây, giãn dần tối đa 30 giây để không đập liên tục vào server.
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
  });
  // Chỉ đăng ký MỘT lần cho mỗi tên sự kiện, sau đó phát lại cho các hàm đã đăng ký.
  for (const event of Object.values(RealtimeEvents)) {
    created.on(event, (payload) => dispatch(event, payload));
  }
  // "connect" chạy cả lần đầu lẫn mỗi lần nối lại: vào lại các group đang nghe.
  created.on('connect', () => {
    statusStore.set('connected');
    rejoinGroups();
  });
  created.on('disconnect', () => statusStore.set('connecting'));
  created.io.on('reconnect_attempt', () => statusStore.set('connecting'));
  created.on('connect_error', (err) => {
    statusStore.set('disconnected');
    console.warn('[realtime] Chưa kết nối được máy chủ thông báo:', err.message);
  });
  return created;
}
/**
 * Mở kết nối (gọi bao nhiêu lần cũng được, chỉ mở một lần). Backend chưa chạy thì
 * Socket.IO tự thử lại — giao diện vẫn hoạt động bình thường với dữ liệu tải bằng REST,
 * chỉ là không có cập nhật tức thì.
 */
export async function startRealtime() {
  if (typeof window === 'undefined') return;
  if (socket) return;
  statusStore.set('connecting');
  socket = createSocket();
}
/** Đăng ký nghe một sự kiện. Trả về hàm huỷ đăng ký để gọi trong cleanup của $effect. */
export function onRealtime(event, handler) {
  const set = handlers.get(event) ?? new Set();
  set.add(handler);
  handlers.set(event, set);
  return () => {
    set.delete(handler);
  };
}
/** Vào một group để bắt đầu nhận sự kiện của group đó. */
export async function joinGroup(kind, value) {
  if (!value) return;
  const key = groupKey(kind, value);
  if (joinedGroups.has(key)) return;
  joinedGroups.add(key);
  await startRealtime();
  // Chưa kết nối xong thì handler "connect" sẽ tự vào group này.
  emitJoin(kind, value);
}
/** Rời group (VD: nhân viên đăng xuất, hoặc khách đóng phiên chat). */
export async function leaveGroup(kind, value) {
  if (!value) return;
  const key = groupKey(kind, value);
  if (!joinedGroups.delete(key)) return;
  // Đang mất kết nối thì thôi, server cũng đã dọn group khi ngắt.
  if (socket?.connected) socket.emit(GROUP_EVENTS[kind].leave, value);
}
