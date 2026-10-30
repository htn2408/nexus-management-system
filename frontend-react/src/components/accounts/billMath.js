// Tính trước số tiền hoá đơn trên màn hình theo đúng công thức của server (billing.service):
//   chiết khấu = (cọc + cước tháng) × %   (không áp lên cước theo giờ)
//   tạm tính   = cọc + cước tháng + cước giờ − chiết khấu
//   thuế       = tạm tính × thuế suất %
//   tổng       = tạm tính + thuế + phí trễ hạn
// Server vẫn tự tính lại khi lưu; đây chỉ để kế toán xem trước.
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function previewBill({
  securityDeposit = 0,
  monthlyRental = 0,
  hourlyCharges = 0,
  discountPercent = 0,
  taxRate = 0,
  lateFee = 0,
}) {
  const discountAmount = round2(((securityDeposit + monthlyRental) * discountPercent) / 100);
  const subtotal = round2(securityDeposit + monthlyRental + hourlyCharges - discountAmount);
  const serviceTaxAmount = round2((subtotal * taxRate) / 100);
  const totalAmount = round2(subtotal + serviceTaxAmount + lateFee);
  return { discountAmount, subtotal, serviceTaxAmount, totalAmount };
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Kỳ cước hiện tại và 2 kỳ trước, dạng server lưu ("October 2026"), kèm nhãn tiếng Việt. */
export function recentBillingPeriods(today = new Date()) {
  return [0, 1, 2].map((back) => {
    const d = new Date(today.getFullYear(), today.getMonth() - back, 1);
    return {
      value: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      vi: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
      current: back === 0,
    };
  });
}

export const accountKey = (id) => (id ?? '').replace(/-/g, '').toUpperCase();

export const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;
