import { bodySchema, rules } from './helpers.js';

const accountIdRules = [
  rules.required('Vui lòng nhập mã tài khoản.'),
  rules.maxLength(30, 'Mã tài khoản không hợp lệ.'),
];

/** POST /api/auth/otp/request */
export const requestOtpSchema = bodySchema({
  accountId: accountIdRules,
});

/** POST /api/auth/otp/verify */
export const verifyOtpSchema = bodySchema({
  accountId: accountIdRules,
  otp: [rules.required('Vui lòng nhập mã OTP.'), rules.pattern(/^\d{6}$/, 'Mã OTP gồm đúng 6 chữ số.')],
});

/** POST /api/auth/otp/forgot-account-id */
export const forgotAccountIdSchema = bodySchema({
  email: [
    rules.required('Vui lòng nhập email.'),
    rules.email('Email không hợp lệ.'),
    rules.maxLength(100, 'Email không hợp lệ.'),
  ],
});
