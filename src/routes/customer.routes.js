import { Router } from 'express';
import { Roles } from '../constants/roles.js';
import * as customerController from '../controllers/customer.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

/** /api/customer: chỉ khách hàng, mọi dữ liệu lọc theo quyền sở hữu tại server. */
export const customerRouter = Router();
customerRouter.use(authenticate, requireRole(Roles.Customer));
customerRouter.get('/bills', customerController.myBills);
customerRouter.get('/connections', customerController.myConnections);
customerRouter.get('/orders', customerController.myOrders);
customerRouter.get('/feedback', customerController.myFeedback);
customerRouter.put('/profile', customerController.updateMyProfile);

/** /api/profile: mọi tài khoản đã đăng nhập. */
export const profileRouter = Router();
profileRouter.use(authenticate);
profileRouter.put('/', customerController.updateProfile);
profileRouter.put('/password', customerController.changePassword);
