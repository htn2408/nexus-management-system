// Nhãn và màu cho trạng thái thuê bao (Active / Temporarily Inactive / Permanently Inactive).
export const CONNECTION_STATUS_CHIP = {
  Active: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
  'Temporarily Inactive': 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
  'Permanently Inactive': 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700',
};

export const CONNECTION_STATUS_DOT = {
  Active: 'bg-emerald-500 animate-pulse',
  'Temporarily Inactive': 'bg-amber-500',
  'Permanently Inactive': 'bg-rose-500',
};

const LABEL_VI = { Active: 'Hoạt động', 'Temporarily Inactive': 'Tạm khóa', 'Permanently Inactive': 'Khóa vĩnh viễn' };

export const connectionStatusLabel = (status, isVi) => (isVi ? (LABEL_VI[status] ?? status) : status);
