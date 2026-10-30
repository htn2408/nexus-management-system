// Gửi email cho khách hàng: mã đơn hàng, mã tài khoản, mã OTP đăng nhập.
//
// Chưa cấu hình SMTP (EMAIL_USER / EMAIL_PASSWORD trống) thì mọi email được ghi ra
// folder logs/emails thay vì gửi thật, để vẫn chạy thử được toàn bộ luồng.
import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { formatAccountId } from '../utils/accountId.js';

const EMAIL_LOG_DIR = path.resolve(env.email.logDir);

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const timeout = env.email.timeoutSeconds * 1000;
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      // Cổng 465 dùng SSL ngay từ đầu, cổng 587 (Gmail) nâng cấp TLS bằng STARTTLS.
      secure: env.email.port === 465,
      requireTLS: env.email.port !== 465,
      auth: { user: env.email.user, pass: env.email.password },
      connectionTimeout: timeout,
      greetingTimeout: timeout,
      socketTimeout: timeout,
    });
  }
  return transporter;
}

if (!env.email.isConfigured) {
  console.warn('[email] Chưa cấu hình SMTP, email sẽ được ghi ra logs/emails thay vì gửi thật.');
}

// ==================== Các loại email của hệ thống ====================

/** 1. Khách vừa đặt đơn: gửi mã đơn hàng để tra cứu tiến độ. */
export function sendOrderPlaced(toEmail, customerName, orderId, planName) {
  const body = layout({
    title: 'Đã tiếp nhận đơn đăng ký',
    greeting: `Chào ${escapeHtml(customerName)},`,
    intro:
      'Nexus Telecom đã tiếp nhận đơn đăng ký dịch vụ của bạn. ' +
      'Vui lòng giữ lại mã đơn hàng bên dưới để tra cứu tiến độ xử lý.',
    codeLabel: 'MÃ ĐƠN HÀNG',
    code: orderId,
    details: [
      ['Dịch vụ đăng ký', isBlank(planName) ? '—' : escapeHtml(planName)],
      ['Trạng thái', 'Chờ cửa hàng bán lẻ duyệt hồ sơ'],
    ],
    footer:
      'Đơn của bạn sẽ được cửa hàng bán lẻ duyệt hồ sơ, sau đó bộ phận kỹ thuật ' +
      'khảo sát khả thi. Chúng tôi sẽ gửi email khi có kết quả.',
  });

  return send(toEmail, `[Nexus] Đã tiếp nhận đơn đăng ký ${orderId}`, body);
}

/** 2. Kế toán đã xác minh thanh toán: gửi Mã tài khoản, cũng là mã để khách đăng nhập. */
export function sendAccountActivated(
  toEmail,
  customerName,
  accountId,
  invoiceNumber,
  amountPaid,
  isFirstPayment
) {
  const intro = isFirstPayment
    ? 'Bộ phận kế toán đã xác minh khoản thanh toán của bạn. Tài khoản dịch vụ đã được ' +
      'kích hoạt — dùng mã bên dưới để đăng nhập vào cổng khách hàng.'
    : 'Bộ phận kế toán đã ghi nhận khoản thanh toán của bạn. Mã đăng nhập của bạn vẫn như sau.';

  const body = layout({
    title: isFirstPayment ? 'Tài khoản đã được kích hoạt' : 'Đã nhận thanh toán',
    greeting: `Chào ${escapeHtml(customerName)},`,
    intro,
    codeLabel: 'MÃ ĐĂNG NHẬP (MÃ TÀI KHOẢN)',
    code: formatAccountId(accountId),
    details: [
      ['Số hoá đơn', escapeHtml(invoiceNumber)],
      ['Số tiền đã ghi nhận', `$${Number(amountPaid).toFixed(2)}`],
    ],
    footer:
      'Khi đăng nhập, bạn nhập mã tài khoản này rồi nhập tiếp mã OTP gồm 6 chữ số ' +
      'mà hệ thống gửi về chính email này. Tuyệt đối không chia sẻ mã cho người khác.',
  });

  const subject = isFirstPayment
    ? `[Nexus] Kích hoạt tài khoản ${accountId}`
    : `[Nexus] Đã nhận thanh toán hoá đơn ${invoiceNumber}`;

  return send(toEmail, subject, body);
}

/**
 * 2b. Kỹ thuật vừa đấu nối xong: gửi Mã tài khoản ngay lúc này, vì khách cần chính
 * mã đó để đăng nhập (kể cả để thanh toán online hoá đơn đầu tiên).
 */
export function sendConnectionReady(toEmail, customerName, accountId, orderId, planName) {
  const body = layout({
    title: 'Đường truyền đã sẵn sàng',
    greeting: `Chào ${escapeHtml(customerName)},`,
    intro:
      'Bộ phận kỹ thuật đã đấu nối xong dịch vụ của bạn. Dưới đây là Mã tài khoản — ' +
      'đây cũng là mã để đăng nhập vào cổng khách hàng Nexus Telecom.',
    codeLabel: 'MÃ ĐĂNG NHẬP (MÃ TÀI KHOẢN)',
    code: formatAccountId(accountId),
    details: [
      ['Mã đơn hàng', escapeHtml(orderId)],
      ['Dịch vụ', isBlank(planName) ? '—' : escapeHtml(planName)],
    ],
    footer:
      'Khi đăng nhập, bạn nhập mã tài khoản này (có hoặc không có dấu gạch đều được) rồi ' +
      'nhập mã OTP 6 chữ số mà hệ thống gửi về chính email này. Hoá đơn đầu kỳ sẽ được gửi sau.',
  });

  return send(
    toEmail,
    `[Nexus] Mã tài khoản ${formatAccountId(accountId)} — đường truyền đã sẵn sàng`,
    body
  );
}

/** 2c. Khách quên mã tài khoản: gửi lại mọi mã tài khoản gắn với email này. */
export function sendAccountIdReminder(toEmail, customerName, accountIds) {
  const formatted = accountIds.map(formatAccountId);

  const body = layout({
    title: 'Mã tài khoản của bạn',
    greeting: `Chào ${escapeHtml(customerName)},`,
    intro:
      'Bạn vừa yêu cầu gửi lại mã tài khoản Nexus Telecom. Dùng mã bên dưới để đăng nhập ' +
      'cổng khách hàng.',
    codeLabel: formatted.length > 1 ? 'CÁC MÃ TÀI KHOẢN' : 'MÃ TÀI KHOẢN',
    code: formatted.join(' · '),
    details: [['Số tài khoản', String(formatted.length)]],
    footer:
      'Nếu bạn không yêu cầu, hãy bỏ qua email này — không ai đăng nhập được nếu thiếu ' +
      'mã OTP gửi về chính hộp thư của bạn.',
  });

  return send(toEmail, '[Nexus] Mã tài khoản đăng nhập của bạn', body);
}

/** 3. Khách nhập mã tài khoản ở màn hình đăng nhập: gửi OTP 6 chữ số. */
export function sendLoginOtp(toEmail, customerName, otp, validMinutes) {
  const body = layout({
    title: 'Mã OTP đăng nhập',
    greeting: `Chào ${escapeHtml(customerName)},`,
    intro: 'Đây là mã OTP dùng một lần để đăng nhập vào cổng khách hàng Nexus Telecom.',
    codeLabel: 'MÃ OTP',
    code: otp,
    details: [
      ['Hiệu lực', `${validMinutes} phút kể từ lúc nhận email`],
      ['Số lần nhập tối đa', '5 lần'],
    ],
    footer:
      'Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này — tài khoản của bạn ' +
      'vẫn an toàn vì không ai đăng nhập được nếu thiếu mã OTP.',
  });

  return send(toEmail, `[Nexus] Mã OTP đăng nhập: ${otp}`, body);
}

// ==================== Hạ tầng gửi mail ====================

/**
 * Gửi một email. Không bao giờ ném lỗi ra ngoài: gửi mail thất bại thì chỉ ghi log,
 * để không làm hỏng nghiệp vụ chính (đơn hàng, thanh toán) đã lưu xong trước đó.
 * Trả về true nếu gửi (hoặc ghi ra file khi chưa cấu hình SMTP) thành công.
 */
export async function send(toEmail, subject, htmlBody) {
  if (isBlank(toEmail)) {
    console.warn(`[email] Bỏ qua "${subject}": không có địa chỉ người nhận.`);
    return false;
  }

  if (!env.email.isConfigured) {
    return writeToFile(toEmail, subject, htmlBody);
  }

  try {
    await getTransporter().sendMail({
      from: { name: env.email.fromName, address: env.email.fromAddress },
      to: toEmail.trim(),
      subject,
      html: htmlBody,
    });
    console.log(`[email] Đã gửi "${subject}" tới ${maskEmail(toEmail)}.`);
    return true;
  } catch (err) {
    console.error(`[email] Gửi "${subject}" tới ${maskEmail(toEmail)} thất bại:`, err.message);
    return false;
  }
}

/** Chế độ chưa cấu hình SMTP: ghi email ra logs/emails để kiểm tra nội dung. */
async function writeToFile(toEmail, subject, htmlBody) {
  try {
    await fs.mkdir(EMAIL_LOG_DIR, { recursive: true });

    const safeSubject = subject.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    const file = path.join(EMAIL_LOG_DIR, `${fileTimestamp()}_${safeSubject}.html`);
    await fs.writeFile(file, `<!-- To: ${toEmail} | Subject: ${subject} -->\n${htmlBody}`, 'utf8');

    console.warn(`[email] SMTP chưa cấu hình, đã ghi "${subject}" gửi tới ${maskEmail(toEmail)} ra ${file}`);
    return true;
  } catch (err) {
    console.error('[email] Không ghi được email ra file:', err.message);
    return false;
  }
}

// ==================== Dựng nội dung HTML ====================

/** Khung email dùng chung cho mọi loại thư. */
function layout({ title, greeting, intro, codeLabel, code, details, footer }) {
  const rows = details
    .map(
      ([label, value]) => `
            <tr>
              <td style="padding:6px 0;color:#537292;font-size:13px;">${label}</td>
              <td style="padding:6px 0;color:#0F1D2B;font-size:13px;font-weight:600;text-align:right;">${value}</td>
            </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#E0F1FF;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(15,29,43,.08);">
    <tr>
      <td style="background:#0369a1;padding:20px 24px;">
        <div style="color:#ffffff;font-size:18px;font-weight:700;">Nexus Telecom</div>
        <div style="color:#bae6fd;font-size:12px;margin-top:2px;">${title}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 12px;color:#0F1D2B;font-size:15px;font-weight:600;">${greeting}</p>
        <p style="margin:0 0 20px;color:#305070;font-size:14px;line-height:1.6;">${intro}</p>

        <div style="background:#EDF6FF;border:1px solid #CCE4F7;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
          <div style="color:#537292;font-size:11px;letter-spacing:1px;font-weight:700;">${codeLabel}</div>
          <div style="color:#0369a1;font-size:26px;font-weight:800;letter-spacing:2px;font-family:Consolas,Menlo,monospace;margin-top:6px;">${code}</div>
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2EFFB;">${rows}
        </table>

        <p style="margin:20px 0 0;color:#537292;font-size:12px;line-height:1.6;">${footer}</p>
      </td>
    </tr>
    <tr>
      <td style="background:#F5FAFF;padding:14px 24px;color:#7899B8;font-size:11px;text-align:center;">
        Email tự động từ hệ thống Nexus Service Marketing System — vui lòng không trả lời thư này.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ==================== Tiện ích ====================

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Chặn HTML injection khi chèn dữ liệu do người dùng nhập vào email. */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

/** Che bớt email khi ghi log hoặc trả về client: "nguyenvan@gmail.com" → "ng*******@gmail.com". */
export function maskEmail(email) {
  if (isBlank(email)) return '(trống)';

  const at = email.indexOf('@');
  if (at <= 0) return '***';

  const name = email.slice(0, at);
  const domain = email.slice(at);
  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);

  return `${visible}${'*'.repeat(Math.max(1, name.length - visible.length))}${domain}`;
}

/** yyyyMMdd_HHmmss_fff theo giờ máy, dùng cho tên file email. */
function fileTimestamp(date = new Date()) {
  const pad = (n, size = 2) => String(n).padStart(size, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}_` +
    pad(date.getMilliseconds(), 3)
  );
}
