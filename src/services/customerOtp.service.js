// Đăng nhập 2 bước cho khách hàng: nhập Mã tài khoản rồi nhập mã OTP 6 chữ số gửi về
// email đã đăng ký. Nhân viên vẫn đăng nhập bằng email + mật khẩu (auth.service.js).
//
// OTP lưu trong MongoDB (dữ liệu ngắn hạn, hợp với TTL index hơn là thêm bảng SQL Server).
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { AccountTypes, Roles } from '../constants/roles.js';
import * as connectionRepository from '../repositories/connection.repository.js';
import * as customerRepository from '../repositories/customer.repository.js';
import * as loginOtpRepository from '../repositories/loginOtp.repository.js';
import { AppError } from '../utils/AppError.js';
import { formatAccountId, normalizeAccountId } from '../utils/accountId.js';
import { signToken } from '../utils/jwt.js';
import * as emailService from './email.service.js';

// Hiệu lực của một mã OTP.
export const OTP_VALID_MINUTES = 5;
// Số lần nhập sai tối đa trước khi mã bị vô hiệu.
export const OTP_MAX_ATTEMPTS = 5;
// Khoảng cách tối thiểu giữa 2 lần xin mã, tránh spam hộp thư khách.
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
// Khoảng cách tối thiểu giữa 2 lần xin gửi lại mã tài khoản cho cùng một email.
const FORGOT_COOLDOWN_SECONDS = 60;

const ACCOUNT_NOT_FOUND = 'Không tìm thấy mã tài khoản này trong hệ thống.';

// email (viết thường) → thời điểm yêu cầu gần nhất. Mỗi mục tự xoá sau thời gian chờ.
const forgotRequests = new Map();

/** Bước 1: khách nhập mã tài khoản, hệ thống gửi OTP về email đã đăng ký. */
export async function requestOtp(accountIdInput) {
  const connection = await findConnection(accountIdInput);
  if (!connection) throw AppError.notFound(ACCOUNT_NOT_FOUND);

  const email = connection.email;
  if (!email?.trim()) {
    throw AppError.conflict(
      'Tài khoản này chưa có email đăng ký nên không gửi được mã OTP. ' +
        'Vui lòng liên hệ cửa hàng bán lẻ để bổ sung email.'
    );
  }

  const accountKey = normalizeAccountId(connection.accountId);
  const wait = await getResendWaitSeconds(accountKey);
  if (wait > 0) {
    throw AppError.tooManyRequests(
      `Bạn vừa yêu cầu mã OTP. Vui lòng đợi ${wait} giây rồi thử lại.`,
      wait
    );
  }

  const customerName = connection.fullName?.trim() ? connection.fullName : 'Quý khách';
  const code = await createOtp(accountKey, email, customerName);

  // Không chờ gửi mail xong mới trả lời, SMTP chậm thì khách vẫn thấy màn hình nhập mã ngay.
  void emailService.sendLoginOtp(email, customerName, code, OTP_VALID_MINUTES);

  const maskedEmail = emailService.maskEmail(email);
  return {
    maskedEmail,
    expiresInSeconds: OTP_VALID_MINUTES * 60,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    message: `Mã OTP đã được gửi tới ${maskedEmail}.`,
  };
}

/** Bước 2: khách nhập OTP, đúng thì cấp JWT và cho vào cổng khách hàng. */
export async function verifyOtp(accountIdInput, code) {
  const connection = await findConnection(accountIdInput);
  if (!connection) throw AppError.notFound(ACCOUNT_NOT_FOUND);

  await checkOtp(normalizeAccountId(connection.accountId), code);

  // Token của luồng OTP mang mã tài khoản (không phải CustomerID), giống bản ASP.NET.
  const token = signToken({
    id: connection.accountId,
    role: Roles.Customer,
    accountType: AccountTypes.Customer,
  });

  return {
    token,
    user: {
      id: connection.customerId ?? connection.accountId,
      name: connection.fullName ?? 'Khách hàng Nexus',
      email: connection.email ?? '',
      role: Roles.Customer,
      accountType: AccountTypes.Customer,
      accountId: connection.accountId,
    },
  };
}

/**
 * Khách quên mã tài khoản: gửi lại mọi mã tài khoản gắn với email. Luôn trả cùng một câu
 * dù email có tồn tại hay không, để người ngoài không dò được email nào là khách hàng.
 */
export async function forgotAccountId(emailInput) {
  const email = emailInput.trim();
  const key = email.toLowerCase();

  const last = forgotRequests.get(key);
  const elapsedSeconds = last ? (Date.now() - last) / 1000 : Infinity;
  if (elapsedSeconds < FORGOT_COOLDOWN_SECONDS) {
    const wait = FORGOT_COOLDOWN_SECONDS - Math.floor(elapsedSeconds);
    throw AppError.tooManyRequests(`Bạn vừa yêu cầu. Vui lòng đợi ${wait} giây rồi thử lại.`, wait);
  }
  forgotRequests.set(key, Date.now());
  setTimeout(() => forgotRequests.delete(key), FORGOT_COOLDOWN_SECONDS * 1000).unref();

  const customer = await customerRepository.findByEmail(email);
  if (customer) {
    const accountIds = await connectionRepository.findAccountIdsByCustomer(customer.customerId);
    if (accountIds.length > 0) {
      const name = customer.fullName?.trim() ? customer.fullName : 'Quý khách';
      void emailService.sendAccountIdReminder(email, name, accountIds);
    } else {
      console.log(
        `[otp] Khách ${customer.customerId} yêu cầu gửi lại mã nhưng chưa có đường truyền nào được đấu nối.`
      );
    }
  }

  return {
    message: 'Nếu email này đã đăng ký dịch vụ, mã tài khoản sẽ được gửi tới hộp thư trong ít phút.',
  };
}

// ==================== Xử lý mã OTP ====================

/**
 * Số giây khách còn phải chờ trước khi được xin mã mới, 0 nếu được phép ngay.
 */
async function getResendWaitSeconds(accountKey) {
  const latest = await loginOtpRepository.findLatestActive(accountKey);
  if (!latest) return 0;

  const elapsedSeconds = Math.floor((Date.now() - latest.CreatedAt.getTime()) / 1000);
  return Math.max(0, OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
}

/** Sinh mã mới, vô hiệu các mã chưa dùng trước đó. Chỉ lưu hash, trả về mã gốc để gửi email. */
async function createOtp(accountKey, email, customerName) {
  // Xin mã mới thì mã cũ hết hiệu lực ngay, tránh việc nhiều mã cùng dùng được.
  await loginOtpRepository.invalidateActive(accountKey);

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();

  await loginOtpRepository.create({
    AccountKey: accountKey,
    Email: email,
    CustomerName: customerName,
    CodeHash: hashCode(code),
    CreatedAt: now,
    ExpiresAt: new Date(now.getTime() + OTP_VALID_MINUTES * 60 * 1000),
    Attempts: 0,
    Used: false,
  });

  return code;
}

/** Kiểm tra mã khách nhập; sai thì ném 401 kèm lý do. Đúng thì đánh dấu đã dùng. */
async function checkOtp(accountKey, code) {
  const otp = await loginOtpRepository.findLatestActive(accountKey);

  if (!otp) {
    throw AppError.unauthorized('Chưa có mã OTP nào đang hiệu lực. Vui lòng bấm gửi lại mã.');
  }

  if (otp.ExpiresAt.getTime() <= Date.now()) {
    throw AppError.unauthorized(
      `Mã OTP đã hết hạn sau ${OTP_VALID_MINUTES} phút. Vui lòng bấm gửi lại mã.`
    );
  }

  if (otp.Attempts >= OTP_MAX_ATTEMPTS) {
    await loginOtpRepository.markUsed(otp._id);
    throw AppError.unauthorized('Bạn đã nhập sai quá số lần cho phép. Vui lòng bấm gửi lại mã mới.');
  }

  // So sánh theo thời gian cố định để không lộ thông tin qua độ trễ phản hồi.
  const matched = timingSafeEqual(Buffer.from(hashCode(code ?? '')), Buffer.from(otp.CodeHash));
  if (!matched) {
    await loginOtpRepository.incrementAttempts(otp._id);
    throw AppError.unauthorized('Mã OTP không đúng. Vui lòng kiểm tra lại email.');
  }

  await loginOtpRepository.markUsed(otp._id);
}

/** SHA-256 dạng HEX viết hoa, khớp Convert.ToHexString của bản ASP.NET. */
function hashCode(code) {
  return createHash('sha256').update(code, 'utf8').digest('hex').toUpperCase();
}

/**
 * Tìm kết nối theo mã tài khoản, chấp nhận mọi cách gõ: có gạch nối, không gạch nối,
 * viết hoa hay viết thường đều ra cùng một tài khoản.
 */
async function findConnection(accountIdInput) {
  const key = normalizeAccountId(accountIdInput);
  if (!key) return null;

  // CSDL có cả dữ liệu cũ dạng "T064-000000000001" lẫn dạng mới "T064000000000001".
  const dashed = formatAccountId(key);
  return connectionRepository.findByAccountIdsWithCustomer(
    dashed === key ? [key] : [dashed, key]
  );
}
