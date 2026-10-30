// Chuẩn hoá chuỗi người dùng gửi lên.

/** Chuỗi đã trim, hoặc null nếu không phải chuỗi / chỉ toàn khoảng trắng. */
export function clean(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** Giá trị trong `allowed` khớp với `value` (không phân biệt hoa thường), không có thì null. */
export function matchIgnoreCase(allowed, value) {
  const target = clean(value)?.toLowerCase();
  return target ? (allowed.find((item) => item.toLowerCase() === target) ?? null) : null;
}
