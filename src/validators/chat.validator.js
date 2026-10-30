import { bodySchema, rules } from './helpers.js';

/** POST /api/chat/sessions */
export const startSessionSchema = bodySchema({
  customerName: [
    rules.required('Vui lòng nhập tên để bắt đầu trò chuyện.'),
    rules.maxLength(100, 'Tên không được quá 100 ký tự.'),
  ],
});

/** POST /api/chat/sessions/:sessionId/messages */
export const sendMessageSchema = bodySchema({
  senderName: [rules.required('Thiếu tên người gửi.'), rules.maxLength(100, 'Tên người gửi không được quá 100 ký tự.')],
  message: [
    rules.required('Nội dung tin nhắn không được để trống.'),
    rules.maxLength(2000, 'Tin nhắn không được quá 2000 ký tự.'),
  ],
});
