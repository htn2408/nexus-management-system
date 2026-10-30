// Đơn khách vừa đặt thêm, giữ trong localStorage để banner "đã ghi nhận đơn" còn sau khi tải lại trang.
const KEY = 'nexus_last_user_order';

export function loadLastOrder() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveLastOrder(order) {
  try {
    if (order) localStorage.setItem(KEY, JSON.stringify(order));
    else localStorage.removeItem(KEY);
  } catch {
    // localStorage đầy hoặc bị chặn: chỉ mất banner, không ảnh hưởng đơn đã ghi.
  }
}
