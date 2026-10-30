// Sinh và kiểm tra JWT cho cả nhân viên (email + mật khẩu) lẫn khách hàng
// (mã tài khoản + OTP), để hai luồng đăng nhập không sinh token theo hai kiểu khác nhau.
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const CLOCK_TOLERANCE_SECONDS = 60;

export function signToken({ id, role, accountType }) {
  return jwt.sign({ role, accountType }, env.jwt.key, {
    subject: String(id),
    issuer: env.jwt.issuer,
    expiresIn: env.jwt.expiresInMinutes * 60,
    algorithm: 'HS256',
  });
}

/** Trả về { id, role, accountType }; token sai hoặc hết hạn thì ném lỗi của jsonwebtoken. */
export function verifyToken(token) {
  const payload = jwt.verify(token, env.jwt.key, {
    issuer: env.jwt.issuer,
    algorithms: ['HS256'],
    clockTolerance: CLOCK_TOLERANCE_SECONDS,
  });
  return { id: payload.sub, role: payload.role, accountType: payload.accountType };
}
