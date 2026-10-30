// Accounts department (spec): tính cước, sinh hoá đơn, sửa chi tiết hoá đơn — "updating has to
// be done by the accounts department alone" — và ghi thanh toán thu tại văn phòng.
import { Router } from 'express';
import { RoleGroups, Roles } from '../constants/roles.js';
import * as billingController from '../controllers/billing.controller.js';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { billingSettingsSchema, createBillSchema, paymentSchema, updateBillSchema } from '../validators/billing.validator.js';

export const billingRouter = Router();
billingRouter.use(authenticate, requireRole(Roles.Accounts));
billingRouter.get('/settings', billingController.settings);
billingRouter.put('/settings', validate(billingSettingsSchema), billingController.updateSettings);
billingRouter.get('/bills', billingController.list);
billingRouter.post('/bills/payments', validate(paymentSchema), billingController.recordPayment);
billingRouter.get('/bills/:id', billingController.getById);
billingRouter.post('/bills', validate(createBillSchema), billingController.create);
billingRouter.put('/bills/:id', validate(updateBillSchema), billingController.update);

// Nhân viên cửa hàng không gọi được /api/billing nên ghi thanh toán qua đây; khách tự trả
// online cũng đi qua đây nhưng bị chặn theo quyền sở hữu hoá đơn.
// Quầy bán lẻ còn đọc được danh sách hoá đơn (để thu tại quầy) và danh bạ nhân viên chi nhánh
// + kỹ thuật viên (để phân công khảo sát).
export const retailRouter = Router();
retailRouter.use(authenticate);
retailRouter.post('/payments', requireRole(RoleGroups.RecordRetailPayment), validate(paymentSchema), billingController.recordRetailPayment);
retailRouter.get('/bills', requireRole(RoleGroups.RetailDesk), billingController.list);
retailRouter.get('/staff', requireRole(RoleGroups.RetailDesk), employeeController.branchDirectory);
