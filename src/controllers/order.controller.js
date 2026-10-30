import * as orderService from '../services/order.service.js';
import { AppError } from '../utils/AppError.js';

export async function list(req, res) {
  res.json(await orderService.list(req.query));
}

export async function getById(req, res) {
  res.json(await orderService.getById(req.params.id));
}

/** GET /api/public/orders/:id: tiến độ đơn cho người chưa đăng nhập. */
export async function publicStatus(req, res) {
  res.json(await orderService.publicStatus(req.params.id));
}

/** POST /api/Technical/orders: quầy bán lẻ, Manager, hoặc khách đã đăng nhập. */
export async function create(req, res) {
  const error = orderService.validateCreateRequest(req.body);
  if (error) throw AppError.badRequest(error);

  const order = await orderService.create(req.body);
  res.status(201).location(`${req.baseUrl}/orders/${encodeURIComponent(order.orderId)}`).json(order);
}

/**
 * POST /api/public/orders: khách tự đăng ký ở trang /register, không cần đăng nhập.
 * Chỉ TẠO đơn ở trạng thái chờ chi nhánh duyệt; trạng thái, mã đơn, chiết khấu đều do server quyết.
 */
export async function createPublic(req, res) {
  // Email là thứ duy nhất để nhận ra khách cũ và gửi mã đơn — bắt buộc với khách tự đăng ký.
  if (!req.body.customerEmail?.trim()) {
    throw AppError.badRequest('Vui lòng nhập email để nhận mã đơn hàng.');
  }
  const error = orderService.validateCreateRequest(req.body);
  if (error) throw AppError.badRequest(error);

  // Khách tự đăng ký không được tự chọn nhân viên phụ trách.
  const order = await orderService.create({ ...req.body, assignedEmployeeId: null });
  res.status(201).json(order);
}

export async function updateStatus(req, res) {
  res.json(await orderService.updateStatus(req.params.id, req.body));
}

export async function updateFeasibility(req, res) {
  res.json(await orderService.updateFeasibility(req.params.id, req.body));
}

export async function updateSchedule(req, res) {
  res.json(await orderService.updateSchedule(req.params.id, req.body));
}
