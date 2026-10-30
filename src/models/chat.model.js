// Live chat giữa khách (kể cả khách chưa đăng nhập) và Admin, lưu trong MongoDB.
// Collection dùng chung với bản ASP.NET nên giữ đúng cấu trúc C# driver đã ghi.
import mongoose from 'mongoose';

// Một phiên chat, collection "chat_sessions". _id là chuỗi "SESSION-{guid}" khách giữ trong localStorage.
const chatSessionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    CustomerName: { type: String, default: '' },
    // Tin nhắn cuối, để hiển thị nhanh ở danh sách phiên bên Admin.
    LastMessage: { type: String, default: '' },
    // "guest" hoặc "admin".
    LastSenderType: { type: String, default: 'admin' },
    LastMessageAt: { type: Date, default: null },
    // Số tin nhắn của khách mà Admin chưa đọc.
    UnreadCount: { type: Number, default: 0 },
    MessageCount: { type: Number, default: 0 },
    CreatedAt: { type: Date, required: true },
  },
  { collection: 'chat_sessions', versionKey: false }
);
chatSessionSchema.index({ LastMessageAt: -1 });

// Một tin nhắn trong phiên, collection "chat_messages".
const chatMessageSchema = new mongoose.Schema(
  {
    SessionId: { type: String, required: true },
    // "guest" (khách) hoặc "admin" (nhân viên trả lời).
    SenderType: { type: String, default: 'guest' },
    SenderName: { type: String, default: '' },
    Message: { type: String, default: '' },
    CreatedAt: { type: Date, required: true },
  },
  { collection: 'chat_messages', versionKey: false }
);
chatMessageSchema.index({ SessionId: 1, CreatedAt: 1 });

export const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
