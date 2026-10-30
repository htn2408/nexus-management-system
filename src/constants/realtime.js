// Tên sự kiện, tên group và đường dẫn của kênh realtime (Socket.IO).
// Đặt ở một chỗ để backend và frontend không lệch nhau.
import { normalizeAccountId } from '../utils/accountId.js';

export const REALTIME_PATH = '/hubs/notifications';

// Sự kiện server đẩy xuống client.
export const RealtimeEvents = Object.freeze({
  Notification: 'notification',
  NotificationRead: 'notificationRead',
  NotificationsRead: 'notificationsRead',
  ChatMessage: 'chatMessage',
  ChatSession: 'chatSession',
  DataChanged: 'dataChanged',
});

// Sự kiện client gửi lên để xin vào / rời group (giữ tên giống các method của SignalR hub cũ).
export const ClientEvents = Object.freeze({
  JoinRole: 'JoinRole',
  LeaveRole: 'LeaveRole',
  JoinAccount: 'JoinAccount',
  LeaveAccount: 'LeaveAccount',
  JoinChatSession: 'JoinChatSession',
  LeaveChatSession: 'LeaveChatSession',
});

// Group mà mọi client đều ở trong, dùng để báo "dữ liệu vừa đổi, tải lại đi".
export const EVERYONE_GROUP = 'everyone';

// Các role nhân viên hợp lệ khi client xin vào group.
export const STAFF_ROLE_GROUPS = Object.freeze(['admin', 'retail', 'technical', 'accounts']);

export const NotificationAudiences = Object.freeze({
  Admin: 'role:admin',
  Retail: 'role:retail',
  Technical: 'role:technical',
  Accounts: 'role:accounts',
});

// Role trong JWT (cột Employee.Role) → tên group realtime tương ứng.
const STAFF_GROUP_BY_ROLE = Object.freeze({
  Manager: 'admin',
  'Retail Staff': 'retail',
  'Field Engineer': 'technical',
  'Senior Accountant': 'accounts',
});

/** Group mà một nhân viên được nghe, theo role trong token ("Manager" → "role:admin"). Khách ⇒ null. */
export function roleGroupForUser(role) {
  const group = STAFF_GROUP_BY_ROLE[role];
  return group ? `role:${group}` : null;
}

/** Group của một role nhân viên: "admin" -> "role:admin". Role lạ ⇒ null. */
export function groupForRole(role) {
  const value = String(role ?? '').trim().toLowerCase();
  return STAFF_ROLE_GROUPS.includes(value) ? `role:${value}` : null;
}

/**
 * Group của một khách hàng theo mã tài khoản. Chuẩn hoá vì giao diện hiển thị
 * "B064-000000000002" còn CSDL lưu "B064000000000002".
 */
export function groupForAccount(accountId) {
  return `account:${normalizeAccountId(accountId)}`;
}

/** Group riêng của một phiên chat: khách vãng lai nghe tin nhắn trả lời ở đây. */
export function groupForChatSession(sessionId) {
  return `chat:${String(sessionId).trim()}`;
}
