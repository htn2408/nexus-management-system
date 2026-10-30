// Khách tự đăng ký mua dịch vụ ở trang /register và tra tiến độ đơn, không cần đăng nhập.
import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { validate } from '../middlewares/validate.js';
import { createOrderSchema } from '../validators/technical.validator.js';

const router = Router();

router.post('/', validate(createOrderSchema), orderController.createPublic);
// Tra tiến độ bằng mã đơn: không trả thông tin cá nhân của khách.
router.get('/:id', orderController.publicStatus);

export default router;
