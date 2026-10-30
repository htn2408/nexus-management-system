// Ghép điều kiện tìm kiếm / lọc cho các câu SQL viết tay ở tầng repository.

/** true khi người dùng không lọc: trống, "All" hoặc một nhãn "tất cả" khác (không phân biệt hoa thường). */
export function isAllFilter(value, ...allLabels) {
  if (typeof value !== 'string' || value.trim() === '') return true;
  const lower = value.trim().toLowerCase();
  return lower === 'all' || allLabels.some((label) => label.toLowerCase() === lower);
}

/** "(A LIKE @search OR B LIKE @search ...)": cột NULL tự động không khớp. */
export function likeAny(columns, param = 'search') {
  return `(${columns.map((column) => `${column} LIKE @${param}`).join(' OR ')})`;
}

/** Giá trị tham số cho LIKE "chứa chuỗi". */
export function containsPattern(term) {
  return `%${term.trim()}%`;
}

/** Ghép mảng điều kiện thành mệnh đề WHERE (rỗng nếu không có điều kiện nào). */
export function whereClause(conditions) {
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}
