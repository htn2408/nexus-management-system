// /api/billing (Senior Accountant) và /api/retail/payments (cửa hàng, kế toán, khách tự trả).
import { Roles } from '../constants/roles.js';
import * as billingService from '../services/billing.service.js';
import { AppError } from '../utils/AppError.js';
import { toNumber } from '../validators/helpers.js';

export async function list(req, res) {
  res.json(await billingService.list());
}

/** GET /api/billing/settings: thuế suất và phí trễ hạn đang áp dụng. */
export async function settings(req, res) {
  res.json(await billingService.billingSettings());
}

/** PUT /api/billing/settings */
export async function updateSettings(req, res) {
  res.json(await billingService.updateBillingSettings(req.body));
}

export async function getById(req, res) {
  const bill = await billingService.getById(req.params.id);
  if (!bill) throw AppError.notFound('Không tìm thấy hóa đơn');
  res.json(bill);
}

export async function create(req, res) {
  if (!req.body.accountId?.trim()) throw AppError.badRequest('Mã tài khoản (AccountId) là bắt buộc.');

  const bill = await billingService.create(req.body);
  res.status(201).location(`${req.baseUrl}/bills/${encodeURIComponent(bill.billId)}`).json(bill);
}

export async function update(req, res) {
  const bill = await billingService.update(req.params.id, req.body ?? {});
  if (!bill) throw AppError.notFound('Không tìm thấy hóa đơn cần cập nhật.');
  res.json(bill);
}

export async function recordPayment(req, res) {
  res.json(await pay(req.body, req.user));
}

/** Thu tại cửa hàng bán lẻ, hoặc khách tự trả online (chỉ hoá đơn của chính mình). */
export async function recordRetailPayment(req, res) {
  if (req.user.role === Roles.Customer) {
    const subject = req.user.id?.trim();
    if (!subject) throw AppError.unauthorized('Token không chứa danh tính khách hàng.');
    if (!(await billingService.customerOwnsBill(subject, req.body))) throw AppError.forbidden();
  }
  res.json(await pay(req.body, req.user));
}

async function pay(body, user) {
  if (!((toNumber(body.amountPaid) ?? 0) > 0)) throw AppError.badRequest('Số tiền thanh toán phải lớn hơn 0.');

  const employeeId = user?.accountType === 'Employee' ? user.id : (body.employeeId ?? null);
  const payment = await billingService.recordPayment({ ...body, employeeId });
  if (!payment) throw AppError.notFound('Không tìm thấy hóa đơn cần thanh toán.');
  return payment;
}
