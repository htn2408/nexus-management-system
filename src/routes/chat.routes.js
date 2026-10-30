// Khách vãng lai chat không cần đăng nhập: phiên chat định danh bằng mã ngẫu nhiên 128-bit
// chỉ khách đó giữ. Các thao tác của Admin (xem mọi phiên, đánh dấu đã đọc, trả lời) cần Manager.
import { Router } from 'express';
import { Roles } from '../constants/roles.js';
import * as chatController from '../controllers/chat.controller.js';
import { authenticate, optionalAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { sendMessageSchema, startSessionSchema } from '../validators/chat.validator.js';

const router = Router();
const managerOnly = [authenticate, requireRole(Roles.Manager)];

router.post('/sessions', validate(startSessionSchema), chatController.startSession);
router.get('/sessions', managerOnly, chatController.listSessions);
router.get('/sessions/:sessionId/messages', chatController.listMessages);
router.post('/sessions/:sessionId/messages', optionalAuth, validate(sendMessageSchema), chatController.sendMessage);
router.post('/sessions/:sessionId/read', managerOnly, chatController.markRead);

export default router;
