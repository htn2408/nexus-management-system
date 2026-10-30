// Kênh WebSocket đẩy thông báo xuống trình duyệt ngay khi có sự kiện (thay cho SignalR hub cũ).
//
// Client tự xin vào group ứng với người đang đăng nhập (JoinRole / JoinAccount / JoinChatSession),
// gửi kèm JWT ở tham số thứ hai: (value, token). Gửi token theo từng lần xin vào group thay vì lúc
// bắt tay kết nối, vì người dùng có thể đăng nhập / đổi tài khoản khi kết nối đã mở sẵn.
//  - role / account: chỉ được vào group của chính mình (audience.service.js).
//  - chat: không cần đăng nhập, khách vãng lai chỉ biết mã phiên ngẫu nhiên của chính họ.
import { Server } from 'socket.io';
import {
  REALTIME_PATH,
  ClientEvents,
  EVERYONE_GROUP,
  groupForRole,
  groupForAccount,
  groupForChatSession,
} from '../constants/realtime.js';
import { canAccessAudience } from '../services/audience.service.js';
import { verifyToken } from '../utils/jwt.js';

let io = null;

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function userFromToken(token) {
  if (isBlank(token)) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/** Vào group nếu token cho phép; báo kết quả qua ack (nếu client có gửi callback). */
async function joinIfAllowed(socket, group, token, ack) {
  let allowed = false;
  try {
    allowed = group !== null && (await canAccessAudience(userFromToken(token), group));
  } catch (err) {
    console.warn('[socket] Không kiểm tra được quyền vào group:', err.message);
  }
  if (allowed) socket.join(group);
  if (typeof ack === 'function') ack({ ok: allowed });
}

export function initSocket(httpServer, corsOptions) {
  io = new Server(httpServer, { path: REALTIME_PATH, cors: corsOptions });

  io.on('connection', (socket) => {
    socket.join(EVERYONE_GROUP);

    socket.on(ClientEvents.JoinRole, (role, token, ack) => joinIfAllowed(socket, groupForRole(role), token, ack));
    socket.on(ClientEvents.JoinAccount, (accountId, token, ack) =>
      joinIfAllowed(socket, isBlank(accountId) ? null : groupForAccount(accountId), token, ack)
    );
    socket.on(ClientEvents.JoinChatSession, (sessionId) => {
      if (!isBlank(sessionId)) socket.join(groupForChatSession(sessionId));
    });

    // Rời group thì không cần kiểm tra quyền.
    socket.on(ClientEvents.LeaveRole, (role) => {
      const group = groupForRole(role);
      if (group) socket.leave(group);
    });
    socket.on(ClientEvents.LeaveAccount, (accountId) => {
      if (!isBlank(accountId)) socket.leave(groupForAccount(accountId));
    });
    socket.on(ClientEvents.LeaveChatSession, (sessionId) => {
      if (!isBlank(sessionId)) socket.leave(groupForChatSession(sessionId));
    });
  });

  return io;
}

/**
 * Gửi sự kiện tới một group hoặc nhiều group (mảng, client ở nhiều group chỉ nhận một lần).
 * Gọi trước initSocket (VD trong test) thì bỏ qua.
 */
export function emitToGroup(groups, event, payload) {
  io?.to(groups).emit(event, payload);
}

export function closeSocket() {
  return new Promise((resolve) => (io ? io.close(() => resolve()) : resolve()));
}
