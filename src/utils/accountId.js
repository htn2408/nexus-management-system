// Mã tài khoản (Account ID) lưu trong CSDL dạng liền "T064000000000010", hiển thị dạng
// "T064-000000000010". Người dùng gõ kiểu nào (có/không gạch, hoa/thường) cũng phải ra cùng một tài khoản.

/** Bỏ mọi ký tự không phải chữ/số và viết hoa: "t064-000000000001" → "T064000000000001". */
export function normalizeAccountId(accountId) {
  return String(accountId ?? '').replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
}

/** Dạng hiển thị: 4 ký tự đầu + gạch nối + phần còn lại. */
export function formatAccountId(accountId) {
  const key = normalizeAccountId(accountId);
  return key.length > 4 ? `${key.slice(0, 4)}-${key.slice(4)}` : key;
}
