// Cột DATE của SQL Server (ngày không có giờ). Driver mssql trả về Date lúc 00:00 UTC,
// nên luôn đọc/ghi theo UTC để không bị lệch một ngày do múi giờ của máy chạy API.

/** Date (từ cột DATE) → "yyyy-MM-dd", null giữ nguyên null. */
export function formatDateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * Chuỗi ngày người dùng gửi lên → "yyyy-MM-dd", không hợp lệ thì null.
 * Nhận "2026-10-27", "2026-10-27T08:00:00Z" hoặc chuỗi Date.parse hiểu được.
 */
export function parseDateOnly(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const text = value.trim();

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoDate) {
    const [, year, month, day] = isoDate.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    return valid ? text : null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/** Ngày theo giờ máy chạy API (cộng thêm `addDays`) dạng "yyyy-MM-dd". */
export function localDateOnly(addDays = 0, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + addDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** yyyyMMdd theo giờ máy chạy API (dùng trong mã PO-…, REQ-…). */
export function localCompactDate(date = new Date()) {
  return localDateOnly(0, date).replaceAll('-', '');
}

/** Chuỗi ngày giờ (ISO hoặc Date.parse hiểu được) → Date, không hợp lệ thì null. */
export function parseDateTime(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 00:00 UTC của ngày kế tiếp: dùng làm mốc "đến hết ngày" khi lọc theo khoảng ngày. */
export function startOfNextUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

/** Hôm nay theo UTC dạng "yyyy-MM-dd". */
export function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}
