// Gom toàn bộ route dưới /api. Giữ đúng đường dẫn của bản ASP.NET cũ
// (VD /api/auth, /api/Technical, /api/admin/...) để frontend không phải sửa URL.
import { Router } from 'express';
import adminRoutes from './admin/index.js';
import authRoutes from './auth.routes.js';
import { billingRouter, retailRouter } from './billing.routes.js';
import catalogRoutes from './catalog.routes.js';
import chatRoutes from './chat.routes.js';
import { customerRouter, profileRouter } from './customer.routes.js';
import equipmentRequestRoutes from './equipmentRequest.routes.js';
import healthRoutes from './health.routes.js';
import notificationRoutes from './notification.routes.js';
import publicOrderRoutes from './publicOrder.routes.js';
import technicalRoutes from './technical.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/public/orders', publicOrderRoutes);
router.use('/catalog', catalogRoutes);
router.use('/billing', billingRouter);
router.use('/retail', retailRouter);
router.use('/customer', customerRouter);
router.use('/profile', profileRouter);
// Route khớp không phân biệt hoa thường: equipment-requests phải gắn trước "/Technical",
// nếu không request sẽ lọt vào router Technical trước.
router.use('/technical/equipment-requests', equipmentRequestRoutes);
router.use('/Technical', technicalRoutes);

export default router;
