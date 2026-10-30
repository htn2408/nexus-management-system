// /api/customer (cổng khách hàng) và /api/profile (hồ sơ của người đang đăng nhập).
import * as customerPortalService from '../services/customerPortal.service.js';
import * as profileService from '../services/profile.service.js';
import { AppError } from '../utils/AppError.js';

function customerSubject(req) {
  const subject = req.user.id?.trim();
  if (!subject) throw AppError.unauthorized('Token không chứa danh tính khách hàng.');
  return subject;
}

export async function myBills(req, res) {
  res.json(await customerPortalService.myBills(customerSubject(req)));
}

export async function myConnections(req, res) {
  res.json(await customerPortalService.myConnections(customerSubject(req)));
}

export async function myOrders(req, res) {
  res.json(await customerPortalService.myOrders(customerSubject(req)));
}

export async function myFeedback(req, res) {
  res.json(await customerPortalService.myFeedback(customerSubject(req)));
}

export async function updateMyProfile(req, res) {
  res.json(await customerPortalService.updateProfile(customerSubject(req), req.body ?? {}));
}

// /api/profile của bản ASP.NET trả lỗi dưới key "error" thay vì "message".
async function withLegacyError(res, work) {
  try {
    res.json(await work());
  } catch (err) {
    if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
}

export function updateProfile(req, res) {
  if (!req.user.id) return res.status(401).json({ error: 'Unauthorized user.' });
  return withLegacyError(res, () => profileService.updateProfile(req.user, req.body ?? {}));
}

export function changePassword(req, res) {
  if (!req.user.id) return res.status(401).json({ error: 'Unauthorized user.' });
  return withLegacyError(res, () => profileService.changePassword(req.user, req.body ?? {}));
}
