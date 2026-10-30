import * as authService from '../services/auth.service.js';
import * as customerOtpService from '../services/customerOtp.service.js';
import { AppError } from '../utils/AppError.js';

/**
 * register và login của bản ASP.NET trả lỗi dưới key "error" (không phải "message"),
 * và frontend đang đọc đúng key đó, nên hai endpoint này tự trả lỗi thay vì qua errorHandler.
 */
function sendLegacyError(res, err, action) {
  if (err instanceof AppError) {
    if (err.extra.retryAfterSeconds) res.set('Retry-After', String(err.extra.retryAfterSeconds));
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  console.error(`[auth] Lỗi khi ${action}:`, err);
  return res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
}

export async function register(req, res) {
  try {
    const result = await authService.register(req.body ?? {});
    res.status(201).json(result);
  } catch (err) {
    sendLegacyError(res, err, 'đăng ký');
  }
}

export async function login(req, res) {
  try {
    const result = await authService.login(req.body ?? {}, req.ip);
    res.json(result);
  } catch (err) {
    sendLegacyError(res, err, 'đăng nhập');
  }
}

export async function requestOtp(req, res) {
  res.json(await customerOtpService.requestOtp(req.body.accountId));
}

export async function verifyOtp(req, res) {
  res.json(await customerOtpService.verifyOtp(req.body.accountId, req.body.otp));
}

export async function forgotAccountId(req, res) {
  res.json(await customerOtpService.forgotAccountId(req.body.email));
}
