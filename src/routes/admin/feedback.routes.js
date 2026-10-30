// Xem / trả lời / xoá phản hồi là việc của Manager (spec); riêng POST mở cho mọi tài khoản
// đã đăng nhập để KHÁCH HÀNG gửi phản hồi được. Vì vậy router này tự gắn quyền từng route.
import { Router } from 'express';
import { Roles } from '../../constants/roles.js';
import * as feedbackController from '../../controllers/feedback.controller.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { createFeedbackSchema } from '../../validators/admin.validator.js';

const router = Router();
const managerOnly = [authenticate, requireRole(Roles.Manager)];

router.get('/', managerOnly, feedbackController.list);
router.post('/', authenticate, validate(createFeedbackSchema), feedbackController.create);
router.put('/:id', managerOnly, feedbackController.respond);
router.delete('/:id', managerOnly, feedbackController.remove);

export default router;
