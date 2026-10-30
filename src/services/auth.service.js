// Đăng ký khách hàng và đăng nhập bằng email + mật khẩu (dùng chung cho nhân viên và khách).
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AccountTypes, Roles } from '../constants/roles.js';
import * as customerRepository from '../repositories/customer.repository.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import { AppError } from '../utils/AppError.js';
import { createAttemptLimiter } from '../utils/attemptLimiter.js';
import { signToken } from '../utils/jwt.js';

// Salt rounds = 10, tương thích hash BCrypt.Net của bản ASP.NET ($2a$10$...).
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{10}$/;

// Thông báo chung khi đăng nhập sai, không cho biết sai email hay sai mật khẩu.
const INVALID_LOGIN = 'Invalid username or password';

// Chặn dò mật khẩu: sai quá số lần trong 15 phút thì khoá tới hết cửa sổ thời gian.
// Theo email: bảo vệ từng tài khoản. Theo IP: chặn một máy thử lần lượt nhiều tài khoản.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const failedByEmail = createAttemptLimiter({ maxAttempts: 5, windowMs: LOGIN_WINDOW_MS });
const failedByIp = createAttemptLimiter({ maxAttempts: 30, windowMs: LOGIN_WINDOW_MS });

/**
 * Khách tự đăng ký tài khoản. Trả về token (role Customer) để khách gọi ngay
 * API đặt đơn sau khi đăng ký.
 */
export async function register(input) {
  const email = input.email?.trim() ?? '';
  const password = input.password ?? '';
  const name = input.name?.trim() ?? '';
  const phoneNumber = input.phoneNumber?.trim() ?? '';

  if (!email || !password || !name || !phoneNumber) {
    throw AppError.badRequest('Email, password, name và phoneNumber là bắt buộc.');
  }
  if (!EMAIL_PATTERN.test(email)) {
    throw AppError.badRequest('Email không hợp lệ.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw AppError.badRequest(`Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
  }
  if (!PHONE_PATTERN.test(phoneNumber)) {
    throw AppError.badRequest('Số điện thoại không hợp lệ.');
  }

  // Kiểm tra cả Employee lẫn Customer để một email/số điện thoại không thuộc hai tài khoản.
  const [employeeEmail, customerEmail] = await Promise.all([
    employeeRepository.existsByEmail(email),
    customerRepository.existsByEmail(email),
  ]);
  if (employeeEmail || customerEmail) {
    throw AppError.conflict('Email này đã được sử dụng.');
  }

  const [employeePhone, customerPhone] = await Promise.all([
    employeeRepository.existsByPhone(phoneNumber),
    customerRepository.existsByPhone(phoneNumber),
  ]);
  if (employeePhone || customerPhone) {
    throw AppError.conflict('Số điện thoại này đã được sử dụng.');
  }

  const customerId = await generateUniqueCustomerId();
  await customerRepository.create({
    customerId,
    fullName: name,
    email,
    contactNumber: phoneNumber,
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    customerType: 'Individual',
    idProofType: 'National ID Card',
    // Tạm dùng CustomerID, admin cập nhật số giấy tờ thật sau.
    idProofNumber: customerId,
    address: '',
    status: 'Active',
  });

  return {
    message: 'Đăng ký thành công.',
    token: signToken({ id: customerId, role: Roles.Customer, accountType: AccountTypes.Customer }),
    user: {
      id: customerId,
      name,
      email,
      phoneNumber,
      role: Roles.Customer,
      accountType: AccountTypes.Customer,
    },
  };
}

/**
 * Đăng nhập bằng email + mật khẩu. Tìm trong Employee trước rồi đến Customer.
 * Nhân viên nhận role theo cột Employee.Role, khách nhận role Customer.
 * clientIp dùng để giới hạn số lần đăng nhập sai.
 */
export async function login(input, clientIp = 'unknown') {
  const email = input.email?.trim() ?? '';
  const password = input.password ?? '';
  const emailKey = email.toLowerCase();

  // Đang bị khoá thì từ chối ngay, không tốn truy vấn CSDL và bcrypt.
  const wait = Math.max(failedByEmail.retryAfterSeconds(emailKey), failedByIp.retryAfterSeconds(clientIp));
  if (wait > 0) {
    throw new AppError(
      429,
      `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(wait / 60)} phút.`,
      { retryAfterSeconds: wait }
    );
  }

  const rejectLogin = () => {
    failedByEmail.recordFailure(emailKey);
    failedByIp.recordFailure(clientIp);
    return AppError.unauthorized(INVALID_LOGIN);
  };

  if (!EMAIL_PATTERN.test(email) || !password) throw rejectLogin();

  const employee = await employeeRepository.findByEmail(email);
  const customer = employee ? null : await customerRepository.findByEmail(email);

  const passwordHash = employee?.passwordHash ?? customer?.passwordHash;
  // Khách tạo tại cửa hàng có thể chưa đặt mật khẩu (PasswordHash NULL).
  if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) throw rejectLogin();

  failedByEmail.reset(emailKey);

  const user = employee
    ? {
        id: employee.employeeId,
        name: employee.fullName,
        email: employee.email ?? '',
        role: employee.role,
        accountType: AccountTypes.Employee,
        // Chi nhánh làm việc: quầy bán lẻ dùng để biết mình phụ trách đơn của chi nhánh nào.
        storeId: employee.storeId ?? null,
      }
    : {
        id: customer.customerId,
        name: customer.fullName,
        email: customer.email ?? '',
        role: Roles.Customer,
        accountType: AccountTypes.Customer,
      };

  return { token: signToken(user), user };
}

/** CUS + 6 chữ số, thử lại đến khi không trùng (bảng Customer yêu cầu khoá chính NOT NULL). */
async function generateUniqueCustomerId() {
  for (;;) {
    const candidate = `CUS${randomInt(100000, 1000000)}`;
    if (!(await customerRepository.existsById(candidate))) return candidate;
  }
}
