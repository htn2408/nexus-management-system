// /api/Technical: mặc định phải đăng nhập; đọc chỉ dành cho nhân viên (dữ liệu có thông tin
// cá nhân của mọi khách), thao tác ghi khoá thêm theo role. Khách xem dữ liệu của mình qua
// /api/customer, chỉ được đặt đơn ở đây.
import { Router } from 'express';
import { EmployeeRoles, RoleGroups } from '../constants/roles.js';
import * as orderController from '../controllers/order.controller.js';
import * as technicalController from '../controllers/technical.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  adjustStockSchema,
  connectionStatusSchema,
  createEquipmentSchema,
  createOrderSchema,
  feasibilitySchema,
  installationScheduleSchema,
  orderStatusSchema,
  provideConnectionSchema,
  updateEquipmentSchema,
  updateTechnicalInventorySchema,
  upsertConnectionSchema,
} from '../validators/technical.validator.js';

const router = Router();
const technicalWrite = requireRole(RoleGroups.TechnicalWrite);
const staffOnly = requireRole(EmployeeRoles);

router.use(authenticate);

router.get('/dashboard', staffOnly, technicalController.dashboard);

// ---- Đơn hàng ----
router.get('/orders', staffOnly, orderController.list);
router.get('/orders/:id', staffOnly, orderController.getById);
router.post('/orders', requireRole(RoleGroups.PlaceOrder), validate(createOrderSchema), orderController.create);
router.put('/orders/:id/status', requireRole(RoleGroups.UpdateOrderStatus), validate(orderStatusSchema), orderController.updateStatus);
router.put('/orders/:id/feasibility', technicalWrite, validate(feasibilitySchema), orderController.updateFeasibility);
router.put('/orders/:id/installation-schedule', technicalWrite, validate(installationScheduleSchema), orderController.updateSchedule);
router.post('/orders/:id/provide-connection', technicalWrite, validate(provideConnectionSchema), technicalController.provideConnection);

// ---- Kết nối ("/connections/search" giữ lại cho frontend cũ, phải đứng trước "/:accountId") ----
router.get(['/connections', '/connections/search'], staffOnly, technicalController.listConnections);
router.post('/connections', technicalWrite, validate(upsertConnectionSchema), technicalController.upsertConnection);
router.get('/connections/:accountId', staffOnly, technicalController.getConnection);
router.get('/connections/:accountId/activity-logs', staffOnly, technicalController.connectionActivityLogs);
router.put('/connections/:accountId/status', technicalWrite, validate(connectionStatusSchema), technicalController.updateConnectionStatus);

// ---- Thiết bị ----
router.get('/equipment', staffOnly, technicalController.listEquipment);
router.get('/equipment/:id', staffOnly, technicalController.getEquipment);
router.post('/equipment', technicalWrite, validate(createEquipmentSchema), technicalController.createEquipment);
router.put('/equipment/:id', technicalWrite, validate(updateEquipmentSchema), technicalController.updateEquipment);
router.delete('/equipment/:id', technicalWrite, technicalController.deleteEquipment);

// ---- Tồn kho ----
router.get('/inventory', staffOnly, technicalController.listInventory);
router.get('/inventory/:id', staffOnly, technicalController.getInventory);
router.put('/inventory/:id', technicalWrite, validate(updateTechnicalInventorySchema), technicalController.updateInventory);
router.post('/inventory/:id/adjust-stock', technicalWrite, validate(adjustStockSchema), technicalController.adjustInventory);

export default router;
