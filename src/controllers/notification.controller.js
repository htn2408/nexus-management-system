// Đọc lịch sử thông báo và đánh dấu đã đọc. Thông báo MỚI thì server tự đẩy qua Socket.IO;
// các endpoint này dùng lúc vừa mở trang và khi bấm "đã đọc".
// Phải đăng nhập, và chỉ thao tác được trên thông báo của chính mình (audience.service.js).
import { groupForRole } from '../constants/realtime.js';
import { canAccessAudience } from '../services/audience.service.js';
import * as notificationService from '../services/notification.service.js';
import { AppError } from '../utils/AppError.js';
import { normalizeAccountId } from '../utils/accountId.js';
import { withMongo as guard } from '../utils/withMongo.js';

const UNAVAILABLE = 'Dịch vụ thông báo tạm thời không khả dụng (không kết nối được MongoDB).';
const withMongo = (work) => guard(work, UNAVAILABLE);

/**
 * Chỉ chấp nhận đúng dạng "role:<vai trò hợp lệ>" hoặc "account:<mã tài khoản>",
 * tránh việc client gửi chuỗi tuỳ ý rồi tạo ra vô số nhóm rác trong CSDL.
 */
async function readAudience(req) {
  const value = typeof req.query.audience === 'string' ? req.query.audience.trim() : '';
  const lower = value.toLowerCase();

  let audience = null;
  if (lower.startsWith('role:')) {
    audience = groupForRole(value.slice(5));
  } else if (lower.startsWith('account:')) {
    const accountId = normalizeAccountId(value.slice(8));
    audience = accountId.length >= 8 && accountId.length <= 24 ? `account:${accountId}` : null;
  }

  if (!audience) {
    throw AppError.badRequest(
      "Tham số 'audience' phải có dạng role:admin|retail|technical|accounts hoặc account:<mã tài khoản>."
    );
  }
  if (!(await canAccessAudience(req.user, audience))) {
    throw AppError.forbidden('Bạn không được xem thông báo của người nhận này.');
  }
  return audience;
}

export async function list(req, res) {
  const audience = await readAudience(req);
  const limit = req.query.limit === undefined ? notificationService.DEFAULT_LIMIT : Number.parseInt(req.query.limit, 10);
  res.json(await withMongo(() => notificationService.list(audience, limit)));
}

export async function count(req, res) {
  const audience = await readAudience(req);
  res.json(await withMongo(() => notificationService.count(audience)));
}

export async function markRead(req, res) {
  const audience = await readAudience(req);
  const found = await withMongo(() => notificationService.markRead(audience, req.params.id));
  if (!found) throw AppError.notFound('Không tìm thấy thông báo.');
  res.status(204).end();
}

export async function markAllRead(req, res) {
  const audience = await readAudience(req);
  const updated = await withMongo(() => notificationService.markAllRead(audience));
  res.json({ updated });
}
