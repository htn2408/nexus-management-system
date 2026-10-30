// Nexus Service Marketing System - Core Type Definitions
/**
 * Quy đổi chức danh lưu trong CSDL (Employee.role — "Manager", "Retail Staff",
 * "Field Engineer", "Senior Accountant"...) sang nhóm quyền dùng trong giao diện.
 * Dùng chung cho đăng nhập và cho ô tìm kiếm toàn hệ thống để chỉ có một nguồn quy ước.
 */
export function roleTypeFromJobTitle(jobTitle) {
  const r = (jobTitle || '').toLowerCase();
  if (r.includes('retail')) return 'retail';
  if (r.includes('field') || r.includes('engineer') || r.includes('technic')) return 'technical';
  if (r.includes('account') || r.includes('billing') || r.includes('finance')) return 'accounts';
  if (r.includes('manager') || r.includes('admin') || r.includes('director')) return 'admin';
  return 'user';
}
// Order ID prefix per spec: D = Dial-Up, B = Broadband, T = Telephone-only (Landline).
export const CONNECTION_TYPE_LETTER = {
  'Dial-Up': 'D',
  Broadband: 'B',
  Landline: 'T',
};
/** Statuses that still belong to the Retail (bán hàng) stage. */
export const RETAIL_STAGE_STATUSES = ['PendingRetail', 'Not Approved'];
/** True while an order has not been cleared by the branch's retail staff yet. */
export function isAwaitingRetailApproval(status) {
  return status === 'PendingRetail';
}
/** True once the branch's retail staff approved it -> Technical may assess it. */
export function isReleasedToTechnical(status) {
  return status === 'Pending' || status === 'Feasible' || status === 'Not Feasible' || status === 'Connection Provided';
}
const ORDER_STATUS_LABEL = {
  PendingRetail: { vi: 'Chờ bán hàng duyệt', en: 'Awaiting retail approval' },
  Pending: { vi: 'Chờ kỹ thuật khảo sát', en: 'Awaiting feasibility survey' },
  'Not Approved': { vi: 'Hồ sơ bị trả lại', en: 'Returned by retail' },
  Feasible: { vi: 'Khảo sát khả thi', en: 'Feasible' },
  'Not Feasible': { vi: 'Không khả thi', en: 'Not Feasible' },
  'Connection Provided': { vi: 'Đã cấp kết nối', en: 'Connection Provided' },
};
/** Localised label for any order status; falls back to the raw value. */
export function orderStatusLabel(status, language) {
  const entry = ORDER_STATUS_LABEL[status];
  if (!entry) return status;
  return language === 'vi' ? entry.vi : entry.en;
}
/** Tailwind classes for the status pill: returns [chip, dot] colour pairs. */
export function orderStatusTone(status) {
  switch (status) {
    case 'Connection Provided':
      return {
        chip: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
        dot: 'bg-emerald-500 animate-pulse',
      };
    case 'Feasible':
      return {
        chip: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700',
        dot: 'bg-sky-500',
      };
    case 'Not Feasible':
      return {
        chip: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
        dot: 'bg-rose-500',
      };
    case 'Not Approved':
      return {
        chip: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700',
        dot: 'bg-orange-500',
      };
    case 'PendingRetail':
      return {
        chip: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
        dot: 'bg-amber-500',
      };
    default:
      return {
        chip: 'bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-300 dark:border-violet-700',
        dot: 'bg-violet-500',
      };
  }
}
// Bulk / corporate scheme: discount on the advance (first rental) and the security
// deposit, based on how many connections the order covers.
//   10–15 => 25%   15–25 => 50%   25–50 => 75%   >50 => 100%
/**
 * Trên mốc này (> 50 kết nối) khách được MIỄN hoàn toàn tiền cọc. Phải khớp
 * BulkDiscounts.DepositWaiverThreshold (backend) và cột tính toán Orders.DepositWaived.
 */
export const DEPOSIT_WAIVER_MIN_CONNECTIONS = 50;
export function isDepositWaived(connectionCount) {
  return Math.floor(connectionCount || 1) > DEPOSIT_WAIVER_MIN_CONNECTIONS;
}
export function getBulkDiscountPercent(connectionCount) {
  const n = Math.max(1, Math.floor(connectionCount || 1));
  if (isDepositWaived(n)) return 100;
  if (n >= 25) return 75;
  if (n >= 15) return 50;
  if (n >= 10) return 25;
  return 0;
}
