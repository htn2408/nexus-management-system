// Live chat giữa khách ở trang chủ và Admin. Khách vãng lai chat không cần đăng nhập;
// phân quyền các thao tác của Admin nằm ở chat.routes.js.
import { Roles } from '../constants/roles.js';
import * as chatService from '../services/chat.service.js';
import { AppError } from '../utils/AppError.js';
import { withMongo as guard } from '../utils/withMongo.js';

const UNAVAILABLE = 'Dịch vụ chat tạm thời không khả dụng (không kết nối được MongoDB).';
const SESSION_NOT_FOUND = 'Không tìm thấy phiên chat.';
const withMongo = (work) => guard(work, UNAVAILABLE);

export async function startSession(req, res) {
  res.json(await withMongo(() => chatService.startSession(req.body.customerName)));
}

export async function listSessions(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search : null;
  res.json(await withMongo(() => chatService.listSessions(search)));
}

export async function listMessages(req, res) {
  const { sessionId } = req.params;
  const messages = await withMongo(async () => {
    if (!(await chatService.sessionExists(sessionId))) return null;
    return chatService.listMessages(sessionId);
  });
  if (!messages) throw AppError.notFound(SESSION_NOT_FOUND);
  res.json(messages);
}

export async function sendMessage(req, res) {
  const { senderType = 'guest', senderName, message } = req.body;
  // Chỉ Manager được trả lời với tư cách Admin, không thì ai cũng mạo danh Admin được.
  if (String(senderType).toLowerCase() === 'admin' && req.user?.role !== Roles.Manager) {
    throw req.user ? AppError.forbidden() : AppError.unauthorized();
  }
  const dto = await withMongo(() =>
    chatService.sendMessage(req.params.sessionId, senderType, senderName, message)
  );
  if (!dto) throw AppError.notFound(SESSION_NOT_FOUND);
  res.json(dto);
}

export async function markRead(req, res) {
  const found = await withMongo(() => chatService.markRead(req.params.sessionId));
  if (!found) throw AppError.notFound(SESSION_NOT_FOUND);
  res.status(204).end();
}
