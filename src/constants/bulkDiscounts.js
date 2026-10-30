// Bậc chiết khấu bulk/corporate theo spec: 10-15 kết nối ⇒ 25%, 15-25 ⇒ 50%,
// 25-50 ⇒ 75%, trên 50 ⇒ 100% (áp lên cước ứng trước và tiền cọc).
// Biên chồng lấn trong spec được chốt: >50 ⇒ 100, ≥25 ⇒ 75, ≥15 ⇒ 50, ≥10 ⇒ 25, còn lại 0.

// Trên mốc này (> 50 kết nối) đơn được miễn hoàn toàn tiền cọc. Phải khớp cột tính toán
// Orders.DepositWaived trong CSDL và DEPOSIT_WAIVER_MIN_CONNECTIONS bên frontend.
export const DEPOSIT_WAIVER_THRESHOLD = 50;

export function isDepositWaived(connections) {
  return connections > DEPOSIT_WAIVER_THRESHOLD;
}

/** Phần trăm chiết khấu (0, 25, 50, 75, 100) theo số kết nối của đơn. */
export function bulkDiscountPercent(connections) {
  if (isDepositWaived(connections)) return 100;
  if (connections >= 25) return 75;
  if (connections >= 15) return 50;
  if (connections >= 10) return 25;
  return 0;
}
