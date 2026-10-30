// Gắn ở cả /api/technical/equipment-requests và /api/admin/equipment-requests (như bản ASP.NET).
// Kỹ thuật gửi / xoá yêu cầu, Manager duyệt và nhập hàng.
import { Router } from 'express';
import { EmployeeRoles, RoleGroups, Roles } from '../constants/roles.js';
import * as equipmentRequestController from '../controllers/equipmentRequest.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createEquipmentRequestSchema, equipmentRequestStatusSchema } from '../validators/technical.validator.js';

const router = Router();
const technicalWrite = requireRole(RoleGroups.TechnicalWrite);
const staffOnly = requireRole(EmployeeRoles);

router.use(authenticate);

router.get('/', staffOnly, equipmentRequestController.list);
router.get('/:id', staffOnly, equipmentRequestController.getById);
router.post('/', technicalWrite, validate(createEquipmentRequestSchema), equipmentRequestController.create);
router.put('/:id/status', requireRole(Roles.Manager), validate(equipmentRequestStatusSchema), equipmentRequestController.updateStatus);
router.delete('/:id', technicalWrite, equipmentRequestController.remove);

export default router;
