// Dòng trạng thái dịch vụ của khách: đã có đường truyền thì theo trạng thái đường truyền,
// chưa có thì theo tiến độ đơn hàng.
const CONNECTION_STATUS = {
  Active: { vi: '● Đang hoạt động', en: '● Online & Provisioned', tone: 'text-emerald-500' },
  'Temporarily Inactive': { vi: '● Tạm ngưng dịch vụ', en: '● Temporarily Suspended', tone: 'text-amber-500' },
  'Permanently Inactive': { vi: '● Đã ngừng vĩnh viễn', en: '● Permanently Closed', tone: 'text-rose-500' },
};

const ORDER_STATUS = {
  PendingRetail: {
    vi: '● Chi nhánh đang kiểm tra hồ sơ của bạn',
    en: '● Your branch is reviewing your paperwork',
    tone: 'text-amber-500',
  },
  'Not Approved': {
    vi: '● Hồ sơ cần bổ sung — vui lòng liên hệ chi nhánh',
    en: '● Paperwork returned — please contact your branch',
    tone: 'text-orange-500',
  },
  Pending: {
    vi: '● Hồ sơ đã duyệt, kỹ thuật đang khảo sát khả thi',
    en: '● Approved — engineers surveying feasibility',
    tone: 'text-violet-500',
  },
  Feasible: { vi: '● Khả thi, chờ lắp đặt', en: '● Feasible, awaiting installation', tone: 'text-sky-500' },
  'Not Feasible': { vi: '● Chưa thể triển khai tại địa chỉ này', en: '● Not feasible at this address', tone: 'text-rose-500' },
  'Connection Provided': { vi: '● Đã cấp kết nối', en: '● Connection provided', tone: 'text-emerald-500' },
};

export function serviceStatus(connection, order) {
  if (connection) return CONNECTION_STATUS[connection.status] ?? CONNECTION_STATUS.Active;
  return ORDER_STATUS[order?.status ?? 'Pending'] ?? ORDER_STATUS.Pending;
}
