// Ai được nghe / đọc thông báo của "người nhận" nào (dùng cho REST /api/notifications và Socket.IO).
//  - Nhân viên: chỉ group theo đúng role trong token (Manager → role:admin...).
//  - Khách: chỉ group của mã tài khoản mình sở hữu. Token khách mang Account ID (đăng nhập OTP)
//    hoặc CustomerID (đăng nhập mật khẩu); với CustomerID thì kiểm tra quyền sở hữu trong CSDL.
import { Roles } from '../constants/roles.js';
import { roleGroupForUser } from '../constants/realtime.js';
import * as connectionRepository from '../repositories/connection.repository.js';
import { normalizeAccountId } from '../utils/accountId.js';

/** audience đã chuẩn hoá: "role:admin" hoặc "account:B064000000000002". user = req.user / null. */
export async function canAccessAudience(user, audience) {
  if (!user || !audience) return false;

  if (audience.startsWith('role:')) {
    return roleGroupForUser(user.role) === audience;
  }

  if (audience.startsWith('account:') && user.role === Roles.Customer) {
    const accountKey = audience.slice('account:'.length);
    if (normalizeAccountId(user.id) === accountKey) return true;
    return connectionRepository.customerOwnsAccount(user.id, accountKey);
  }

  return false;
}
