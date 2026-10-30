// Live chat giữa khách ở trang chủ và Admin, dữ liệu nằm trong MongoDB.
import * as chatRepository from '../repositories/chat.repository.js';
import { guidN } from '../utils/ids.js';
import * as notificationEvents from './notificationEvents.js';
import * as notificationService from './notification.service.js';

const GREETING_MESSAGE = 'Xin chào, chúng tôi có thể giúp gì cho bạn?';
const GREETING_SENDER = 'Hệ thống';

/** Khách mở chatbox lần đầu: tạo phiên mới kèm lời chào tự động từ Admin. */
export async function startSession(customerName) {
  const now = new Date();
  const session = {
    _id: `SESSION-${guidN()}`,
    CustomerName: customerName.trim(),
    LastMessage: GREETING_MESSAGE,
    LastSenderType: 'admin',
    LastMessageAt: now,
    // Lời chào là tin của Admin nên khách chưa nhắn gì ⇒ Admin không có gì chưa đọc.
    UnreadCount: 0,
    MessageCount: 1,
    CreatedAt: now,
  };

  await chatRepository.insertSession(session);
  await chatRepository.insertMessage({
    SessionId: session._id,
    SenderType: 'admin',
    SenderName: GREETING_SENDER,
    Message: GREETING_MESSAGE,
    CreatedAt: now,
  });

  const dto = toSessionDto(session);
  // Phiên mới hiện ngay trong màn hình Chat trực tuyến của Admin.
  notificationService.pushChatSession(dto);
  return dto;
}

/** Admin xem danh sách phiên, mới nhất lên đầu. */
export async function listSessions(search) {
  const docs = await chatRepository.findSessions(search?.trim() || null);
  return docs.map(toSessionDto);
}

export function sessionExists(sessionId) {
  return chatRepository.sessionExists(sessionId);
}

/** Toàn bộ tin nhắn của một phiên, cũ trước mới sau. */
export async function listMessages(sessionId) {
  const docs = await chatRepository.findMessages(sessionId);
  return docs.map(toMessageDto);
}

/**
 * Ghi một tin nhắn vào phiên. Khách gửi thì tăng số tin chưa đọc của Admin,
 * Admin trả lời thì coi như đã đọc hết. Trả về null nếu phiên không tồn tại.
 */
export async function sendMessage(sessionId, senderType, senderName, message) {
  const isAdmin = String(senderType ?? '').toLowerCase() === 'admin';
  const normalizedType = isAdmin ? 'admin' : 'guest';
  const now = new Date();
  const text = message.trim();

  const update = {
    $set: { LastMessage: text, LastSenderType: normalizedType, LastMessageAt: now },
    $inc: { MessageCount: 1 },
  };
  // Admin trả lời ⇒ xoá ô đếm; khách nhắn ⇒ cộng thêm 1 tin chưa đọc.
  if (isAdmin) update.$set.UnreadCount = 0;
  else update.$inc.UnreadCount = 1;

  const matched = await chatRepository.updateSession(sessionId, update);
  if (matched === 0) return null;

  const doc = await chatRepository.insertMessage({
    SessionId: sessionId,
    SenderType: normalizedType,
    SenderName: senderName.trim(),
    Message: text,
    CreatedAt: now,
  });

  const dto = toMessageDto(doc);
  // Đẩy tin nhắn thẳng xuống trình duyệt: khách thấy câu trả lời của Admin ngay và ngược lại.
  notificationService.pushChatMessage(sessionId, dto);

  const session = await chatRepository.findSession(sessionId);
  if (session) {
    notificationService.pushChatSession(toSessionDto(session));
    if (!isAdmin) {
      // Khách nhắn tin ⇒ thêm một dòng trong chuông thông báo của Admin.
      await notificationEvents.chatMessageFromGuest(sessionId, session.CustomerName, text);
    }
  }

  return dto;
}

/** Admin mở phiên ra đọc ⇒ xoá số tin chưa đọc. */
export async function markRead(sessionId) {
  const matched = await chatRepository.updateSession(sessionId, { $set: { UnreadCount: 0 } });
  if (matched === 0) return false;

  const session = await chatRepository.findSession(sessionId);
  if (session) notificationService.pushChatSession(toSessionDto(session));
  return true;
}

// ==================== Mapping document → DTO ====================

function toSessionDto(s) {
  return {
    sessionId: s._id,
    customerName: s.CustomerName,
    lastMessage: s.LastMessage,
    lastSenderType: s.LastSenderType,
    lastMessageAt: s.LastMessageAt ? new Date(s.LastMessageAt).toISOString() : null,
    lastMessageAtDisplay: relativeTime(s.LastMessageAt),
    unreadCount: s.UnreadCount,
    messageCount: s.MessageCount,
  };
}

function toMessageDto(m) {
  return {
    id: String(m._id),
    sessionId: m.SessionId,
    senderType: m.SenderType,
    senderName: m.SenderName,
    message: m.Message,
    createdAt: new Date(m.CreatedAt).toISOString(),
    createdAtDisplay: relativeTime(m.CreatedAt),
  };
}

/** Nhãn thời gian tiếng Việt hiển thị thẳng trên giao diện chat. */
function relativeTime(value) {
  if (!value) return '';

  const date = new Date(value);
  const minutes = Math.max(0, Date.now() - date.getTime()) / 60000;

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${Math.floor(minutes)} phút trước`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} giờ trước`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))} ngày trước`;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
