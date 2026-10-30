import { ChatMessage, ChatSession } from '../models/chat.model.js';

const MAX_SESSIONS = 200;

export function insertSession(session) {
  return ChatSession.collection.insertOne(session);
}

export function insertMessage(message) {
  return ChatMessage.create(message).then((doc) => doc.toObject());
}

export function findSession(sessionId) {
  return ChatSession.findById(sessionId).lean();
}

export async function sessionExists(sessionId) {
  return (await ChatSession.exists({ _id: sessionId })) !== null;
}

/** Danh sách phiên, mới nhất lên đầu, lọc theo tên khách (không phân biệt hoa thường). */
export function findSessions(search) {
  const filter = search ? { CustomerName: { $regex: escapeRegex(search), $options: 'i' } } : {};
  return ChatSession.find(filter).sort({ LastMessageAt: -1 }).limit(MAX_SESSIONS).lean();
}

export function findMessages(sessionId) {
  return ChatMessage.find({ SessionId: sessionId }).sort({ CreatedAt: 1 }).lean();
}

/** Cập nhật phiên; trả về số document khớp (0 = phiên không tồn tại). */
export async function updateSession(sessionId, update) {
  const result = await ChatSession.updateOne({ _id: sessionId }, update);
  return result.matchedCount;
}

// Escape để khách gõ ký tự regex (dấu chấm, ngoặc...) không làm hỏng truy vấn.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
