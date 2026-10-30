// Các API quản trị dưới /api/admin. Mặc định chỉ Manager được vào; riêng feedback tự gắn
// quyền từng route (khách hàng đã đăng nhập cũng gửi phản hồi được).
import { Router } from 'express';
import { Roles } from '../../constants/roles.js';
import { authenticate, requireRole } from '../../middlewares/auth.js';
import equipmentRequestRoutes from '../equipmentRequest.routes.js';
import employeeRoutes from './employee.routes.js';
import feedbackRoutes from './feedback.routes.js';
import inventoryRoutes from './inventory.routes.js';
import planRoutes from './plan.routes.js';
import purchaseOrderRoutes from './purchaseOrder.routes.js';
import retailStoreRoutes from './retailStore.routes.js';
import systemSettingRoutes from './systemSetting.routes.js';
import vendorRoutes from './vendor.routes.js';

const router = Router();
const managerOnly = [authenticate, requireRole(Roles.Manager)];

// Đường dẫn giữ nguyên như bản ASP.NET, kể cả các alias (serviceplan, retailstore).
// equipment-requests và feedback tự gắn quyền từng route.
router.use('/equipment-requests', equipmentRequestRoutes);
router.use('/feedback', feedbackRoutes);
router.use(['/plan', '/serviceplan'], managerOnly, planRoutes);
router.use('/vendor', managerOnly, vendorRoutes);
router.use(['/retailshop', '/retailstore'], managerOnly, retailStoreRoutes);
router.use('/employee', managerOnly, employeeRoutes);
router.use('/inventory', managerOnly, inventoryRoutes);
router.use('/purchaseorder', managerOnly, purchaseOrderRoutes);
router.use('/systemsettings', managerOnly, systemSettingRoutes);

export default router;
