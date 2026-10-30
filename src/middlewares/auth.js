// Xác thực JWT và phân quyền theo role, thay cho [Authorize] / [Authorize(Roles = ...)].
import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

function readBearerToken(req) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** Bắt buộc đăng nhập. Token hợp lệ ⇒ gắn req.user = { id, role, accountType }. */
export function authenticate(req, res, next) {
  const token = readBearerToken(req);
  if (!token) return next(AppError.unauthorized());

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(AppError.unauthorized('Phiên đăng nhập không hợp lệ hoặc đã hết hạn'));
  }
}

/**
 * Không bắt buộc đăng nhập, nhưng có token hợp lệ thì vẫn gắn req.user.
 * Dùng cho endpoint công khai cần biết "ai đang gọi" nếu có (chat, thông báo).
 */
export function optionalAuth(req, res, next) {
  const token = readBearerToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // Token hỏng thì coi như khách vãng lai.
    }
  }
  next();
}

/**
 * Chỉ cho các role được liệt kê đi qua. Luôn đặt sau `authenticate`.
 * Nhận cả danh sách rời lẫn mảng: requireRole(Roles.Manager) hoặc requireRole(RoleGroups.TechnicalWrite).
 */
export function requireRole(...roles) {
  const allowed = new Set(roles.flat());
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowed.has(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
