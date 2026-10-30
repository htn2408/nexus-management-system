import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  forgotAccountIdSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Đăng ký khách hàng / đăng nhập email + mật khẩu (nhân viên và khách).
router.post('/register', authController.register);
router.post('/login', authController.login);

// Khách đăng nhập 2 bước bằng mã tài khoản + OTP qua email.
router.post('/otp/request', validate(requestOtpSchema), authController.requestOtp);
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/otp/forgot-account-id', validate(forgotAccountIdSchema), authController.forgotAccountId);

export default router;
