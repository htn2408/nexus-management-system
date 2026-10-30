// Toàn bộ nội dung thông báo của hệ thống gom về một chỗ, để tầng nghiệp vụ gọi một dòng
// là xong: `await notificationEvents.orderPlaced(...)`.
//
// Mỗi sự kiện tự quyết định gửi cho ai, theo quy trình trong đề bài:
// khách đặt đơn → Bán lẻ duyệt → Kỹ thuật khảo sát & cấp kết nối → Kế toán lập hoá đơn.
// Người vừa thao tác không nhận lại thông báo của chính mình cho đỡ nhiễu.
import { ConnectionStatuses } from '../constants/statuses.js';
import { NotificationAudiences, groupForAccount } from '../constants/realtime.js';
import { publish } from './notification.service.js';

const moneyFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function money(value) {
  return `$${moneyFormat.format(Number(value))}`;
}

function short(text, max = 90) {
  const value = String(text ?? '').trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

// Các điểm đến dùng lặp lại.
const RETAIL_APPROVAL = {
  targetPath: '/retail',
  targetTab: 'approval-queue',
  targetRole: 'retail',
  sectionVi: 'Bán lẻ • Duyệt hồ sơ chi nhánh',
  sectionEn: 'Retail • Branch Approval Queue',
};
const RETAIL_TRACKING = {
  targetPath: '/retail',
  targetTab: 'order-tracking',
  targetRole: 'retail',
  sectionVi: 'Bán lẻ • Tra cứu đơn hàng',
  sectionEn: 'Retail • Order Tracking',
};
const TECHNICAL_QUEUE = {
  targetPath: '/technical',
  targetTab: 'feasibility-queue',
  targetRole: 'technical',
  sectionVi: 'Kỹ thuật • Hàng đợi khảo sát',
  sectionEn: 'Technical • Feasibility Queue',
};
const ACCOUNTS_TRACKING = {
  targetPath: '/accounts',
  targetTab: 'subscriber-tracking',
  targetRole: 'accounts',
  sectionVi: 'Kế toán • Theo dõi thuê bao',
  sectionEn: 'Accounts • Subscriber Tracking',
};
const CUSTOMER_OVERVIEW = {
  targetPath: '/user',
  targetTab: 'overview',
  targetRole: 'user',
  sectionVi: 'Khách hàng • Tổng quan',
  sectionEn: 'Customer • Overview',
};
const CUSTOMER_BILLING = {
  targetPath: '/user',
  targetTab: 'billing',
  targetRole: 'user',
  sectionVi: 'Khách hàng • Hoá đơn',
  sectionEn: 'Customer • Billing',
};

// ---- 1. Khách đặt đơn mới ----
// Đơn mới nằm ở PendingRetail nên báo cửa hàng bán lẻ; nhánh báo Kỹ thuật dành cho đơn đã qua duyệt.
// Ngoài khâu xử lý còn báo Quản trị (theo dõi toàn hệ thống) và chính khách hàng nếu khách
// đã có mã tài khoản (đặt thêm gói trong cổng khách hàng).
export function orderPlaced(orderId, customerName, planName, needsRetailApproval, customerAccountIds = []) {
  const planVi = isBlank(planName) ? '.' : ` — gói ${planName}.`;
  const planEn = isBlank(planName) ? '.' : ` — ${planName} plan.`;
  const descVi = `Khách ${customerName} vừa đặt đơn ${orderId}${planVi}`;
  const descEn = `${customerName} just placed order ${orderId}${planEn}`;

  const handler = needsRetailApproval
    ? publish(
        {
          type: 'order',
          titleVi: 'Đơn hàng mới chờ duyệt hồ sơ',
          titleEn: 'New order awaiting paperwork approval',
          descVi,
          descEn,
          ...RETAIL_APPROVAL,
          entityId: orderId,
        },
        NotificationAudiences.Retail
      )
    : publish(
        {
          type: 'order',
          titleVi: 'Đơn hàng mới cần khảo sát',
          titleEn: 'New order pending assessment',
          descVi,
          descEn,
          ...TECHNICAL_QUEUE,
          entityId: orderId,
        },
        NotificationAudiences.Technical
      );

  const admin = publish(
    {
      type: 'order',
      titleVi: 'Có đơn đăng ký dịch vụ mới',
      titleEn: 'New service order received',
      descVi,
      descEn,
      targetPath: '/admin',
      targetTab: 'overview',
      targetRole: 'admin',
      sectionVi: 'Quản trị • Tổng quan',
      sectionEn: 'Admin • Overview',
      entityId: orderId,
    },
    NotificationAudiences.Admin
  );

  const customerAudiences = (customerAccountIds ?? []).filter((id) => !isBlank(id)).map(groupForAccount);
  const customer =
    customerAudiences.length === 0
      ? Promise.resolve()
      : publish(
          {
            type: 'order',
            titleVi: 'Đã tiếp nhận đơn đăng ký của bạn',
            titleEn: 'Your order has been received',
            descVi: `Đơn ${orderId}${planVi.replace(/\.+$/, '')} đang chờ chi nhánh duyệt hồ sơ, sau đó kỹ thuật sẽ khảo sát hạ tầng.`,
            descEn: `Order ${orderId}${planEn.replace(/\.+$/, '')} is awaiting branch paperwork review, then a technical survey.`,
            targetPath: '/user',
            targetTab: 'new-service',
            targetRole: 'user',
            sectionVi: 'Khách hàng • Đăng ký gói mới',
            sectionEn: 'Customer • New Service',
            entityId: orderId,
          },
          customerAudiences
        );

  return Promise.all([handler, admin, customer]);
}

// ---- 2. Bán lẻ duyệt xong → kỹ thuật vào khảo sát ----
export function orderApprovedByRetail(orderId, approvedBy) {
  const byVi = isBlank(approvedBy) ? '' : ` (duyệt bởi ${approvedBy})`;
  const byEn = isBlank(approvedBy) ? '' : ` (approved by ${approvedBy})`;
  return publish(
    {
      type: 'order',
      titleVi: 'Đơn đã duyệt, chờ khảo sát kỹ thuật',
      titleEn: 'Order approved, awaiting feasibility check',
      descVi: `Đơn ${orderId} đã qua khâu hồ sơ${byVi} và đang chờ kiểm tra khả thi.`,
      descEn: `Order ${orderId} cleared paperwork${byEn} and is waiting for a feasibility check.`,
      ...TECHNICAL_QUEUE,
      entityId: orderId,
    },
    NotificationAudiences.Technical
  );
}

// ---- 3. Bán lẻ từ chối hồ sơ ----
// Khách chỉ nhận được thông báo khi đã có mã tài khoản để đăng nhập cổng khách hàng.
export function orderRejectedByRetail(orderId, reason, accountId) {
  if (isBlank(accountId)) return Promise.resolve();

  return publish(
    {
      type: 'alert',
      titleVi: 'Hồ sơ đăng ký chưa được duyệt',
      titleEn: 'Application was not approved',
      descVi: `Đơn ${orderId} bị trả lại: ${short(reason)}`,
      descEn: `Order ${orderId} was returned: ${short(reason)}`,
      ...CUSTOMER_OVERVIEW,
      entityId: orderId,
    },
    groupForAccount(accountId)
  );
}

// ---- 4. Hồ sơ được nộp lại sau khi bị trả ----
export function orderResubmitted(orderId) {
  return publish(
    {
      type: 'order',
      titleVi: 'Hồ sơ nộp lại chờ duyệt',
      titleEn: 'Application resubmitted for approval',
      descVi: `Đơn ${orderId} đã bổ sung giấy tờ và quay lại hàng đợi duyệt.`,
      descEn: `Order ${orderId} was amended and is back in the approval queue.`,
      ...RETAIL_APPROVAL,
      entityId: orderId,
    },
    NotificationAudiences.Retail
  );
}

// ---- 5. Phân công kỹ thuật viên đi khảo sát ----
export function technicianAssigned(orderId, technicianName) {
  return publish(
    {
      type: 'order',
      titleVi: 'Có lịch khảo sát mới được phân công',
      titleEn: 'New survey assignment',
      descVi: `${technicianName} được phân công khảo sát đơn ${orderId}.`,
      descEn: `${technicianName} has been assigned to survey order ${orderId}.`,
      ...TECHNICAL_QUEUE,
      entityId: orderId,
    },
    NotificationAudiences.Technical
  );
}

// ---- 6. Kỹ thuật kết luận khả thi / không khả thi ----
export function orderFeasibility(orderId, feasible, accountId, reason) {
  const draft = feasible
    ? {
        type: 'order',
        titleVi: 'Đơn đã khảo sát khả thi',
        titleEn: 'Order confirmed feasible',
        descVi: `Đơn ${orderId} đủ điều kiện lắp đặt${isBlank(accountId) ? '.' : `, mã tài khoản cấp cho khách: ${accountId}.`}`,
        descEn: `Order ${orderId} is ready for installation${isBlank(accountId) ? '.' : `, account ID issued: ${accountId}.`}`,
        ...RETAIL_TRACKING,
        entityId: orderId,
      }
    : {
        type: 'alert',
        titleVi: 'Đơn không khả thi về kỹ thuật',
        titleEn: 'Order is not technically feasible',
        descVi: `Đơn ${orderId} không lắp được: ${short(reason ?? 'kỹ thuật không nêu lý do')}`,
        descEn: `Order ${orderId} cannot be installed: ${short(reason ?? 'no reason given')}`,
        ...RETAIL_TRACKING,
        entityId: orderId,
      };

  return publish(draft, NotificationAudiences.Retail);
}

// ---- 7. Cấp kết nối xong → kế toán lập hoá đơn, khách được báo ----
export function connectionProvided(accountId, customerName, planName) {
  const staff = publish(
    {
      type: 'order',
      titleVi: 'Đã cấp kết nối, chờ lập hoá đơn',
      titleEn: 'Connection provided, invoice pending',
      descVi: `Tài khoản ${accountId} của ${customerName} đã đấu nối xong${isBlank(planName) ? '.' : ` (gói ${planName}).`} Cần lập hoá đơn đầu kỳ.`,
      descEn: `Account ${accountId} for ${customerName} is now live${isBlank(planName) ? '.' : ` (${planName}).`} First invoice is due.`,
      targetPath: '/accounts',
      targetTab: 'bill-generation',
      targetRole: 'accounts',
      sectionVi: 'Kế toán • Lập hoá đơn',
      sectionEn: 'Accounts • Bill Generation',
      entityId: accountId,
    },
    NotificationAudiences.Accounts
  );

  const customer = publish(
    {
      type: 'system',
      titleVi: 'Đường truyền của bạn đã sẵn sàng',
      titleEn: 'Your connection is live',
      descVi: `Kết nối cho mã tài khoản ${accountId} đã được kích hoạt${isBlank(planName) ? '.' : ` với gói ${planName}.`}`,
      descEn: `Your connection for account ${accountId} is active${isBlank(planName) ? '.' : ` on the ${planName} plan.`}`,
      ...CUSTOMER_OVERVIEW,
      entityId: accountId,
    },
    groupForAccount(accountId)
  );

  return Promise.all([staff, customer]);
}

// ---- 8. Kế toán lập hoá đơn ----
export function billCreated(invoiceNumber, accountId, customerName, totalAmount) {
  const retail = publish(
    {
      type: 'billing',
      titleVi: 'Hoá đơn mới cần thu tiền',
      titleEn: 'New invoice ready for collection',
      descVi: `Hoá đơn ${invoiceNumber} của ${customerName} (${accountId}) trị giá ${money(totalAmount)}.`,
      descEn: `Invoice ${invoiceNumber} for ${customerName} (${accountId}) totals ${money(totalAmount)}.`,
      targetPath: '/retail',
      targetTab: 'payment-records',
      targetRole: 'retail',
      sectionVi: 'Bán lẻ • Thu tiền tại quầy',
      sectionEn: 'Retail • Payment Records',
      entityId: invoiceNumber,
    },
    NotificationAudiences.Retail
  );

  const customer = publish(
    {
      type: 'billing',
      titleVi: 'Bạn có hoá đơn mới',
      titleEn: 'You have a new invoice',
      descVi: `Hoá đơn ${invoiceNumber} trị giá ${money(totalAmount)} vừa được phát hành.`,
      descEn: `Invoice ${invoiceNumber} for ${money(totalAmount)} has been issued.`,
      ...CUSTOMER_BILLING,
      entityId: invoiceNumber,
    },
    groupForAccount(accountId)
  );

  return Promise.all([retail, customer]);
}

// ---- 9. Ghi nhận thanh toán ----
export function paymentRecorded(invoiceNumber, accountId, customerName, amountPaid, fullyPaid) {
  const staff = publish(
    {
      type: 'billing',
      titleVi: fullyPaid ? 'Hoá đơn đã thanh toán đủ' : 'Vừa nhận thanh toán một phần',
      titleEn: fullyPaid ? 'Invoice fully settled' : 'Partial payment received',
      descVi: `${customerName} (${accountId}) thanh toán ${money(amountPaid)} cho hoá đơn ${invoiceNumber}.`,
      descEn: `${customerName} (${accountId}) paid ${money(amountPaid)} for invoice ${invoiceNumber}.`,
      ...ACCOUNTS_TRACKING,
      entityId: invoiceNumber,
    },
    NotificationAudiences.Accounts
  );

  const customer = publish(
    {
      type: 'billing',
      titleVi: 'Đã ghi nhận thanh toán của bạn',
      titleEn: 'Your payment was recorded',
      descVi: fullyPaid
        ? `Hoá đơn ${invoiceNumber} đã thanh toán đủ ${money(amountPaid)}. Cảm ơn quý khách.`
        : `Đã nhận ${money(amountPaid)} cho hoá đơn ${invoiceNumber}, phần còn lại vui lòng thanh toán trước hạn.`,
      descEn: fullyPaid
        ? `Invoice ${invoiceNumber} is fully settled (${money(amountPaid)}). Thank you.`
        : `We received ${money(amountPaid)} for invoice ${invoiceNumber}; the balance is still due.`,
      ...CUSTOMER_BILLING,
      entityId: invoiceNumber,
    },
    groupForAccount(accountId)
  );

  return Promise.all([staff, customer]);
}

// ---- 10. Kho chạm ngưỡng đặt lại ----
// ReplaceKey theo từng vật tư: nhập/xuất liên tục cũng chỉ còn một thông báo mới nhất.
export function lowStock(itemId, itemName, itemCode, stockQuantity, reorderLevel) {
  return publish(
    {
      type: 'stock',
      titleVi: 'Vật tư cần bổ sung kho',
      titleEn: 'Stock needs restocking',
      descVi: `${itemName} (${itemCode}) chỉ còn ${stockQuantity}/${reorderLevel} đơn vị — đã chạm ngưỡng đặt lại.`,
      descEn: `${itemName} (${itemCode}) down to ${stockQuantity}/${reorderLevel} units — reorder threshold reached.`,
      targetPath: '/admin',
      targetTab: 'stock',
      targetRole: 'admin',
      sectionVi: 'Quản trị • Kho thiết bị',
      sectionEn: 'Admin • Stock Inventory',
      entityId: itemId,
      replaceKey: `stock:${itemId}`,
    },
    NotificationAudiences.Admin
  );
}

// ---- 11. Khách nhắn tin ở chatbox trang chủ ----
// Khách nhắn 10 câu liền vẫn chỉ hiện một dòng thông báo cho phiên đó (ReplaceKey).
export function chatMessageFromGuest(sessionId, customerName, message) {
  return publish(
    {
      type: 'chat',
      titleVi: `Tin nhắn mới từ ${customerName}`,
      titleEn: `New message from ${customerName}`,
      descVi: short(message),
      descEn: short(message),
      targetPath: '/admin',
      targetTab: 'livechat',
      targetRole: 'admin',
      sectionVi: 'Quản trị • Chat trực tuyến',
      sectionEn: 'Admin • Live Chat',
      entityId: sessionId,
      replaceKey: `chat:${sessionId}`,
    },
    NotificationAudiences.Admin
  );
}

// ---- 12. Khách gửi phản hồi / đánh giá ----
export function feedbackCreated(feedbackId, customerName, rating, message) {
  const stars = '★'.repeat(Math.min(Math.max(rating, 0), 5));
  const desc = `${customerName} (${stars}): ${short(message, 70)}`;
  return publish(
    {
      type: 'feedback',
      titleVi: 'Phản hồi khách hàng chờ trả lời',
      titleEn: 'Customer feedback awaiting reply',
      descVi: desc,
      descEn: desc,
      targetPath: '/admin',
      targetTab: 'feedback',
      targetRole: 'admin',
      sectionVi: 'Quản trị • Phản hồi khách hàng',
      sectionEn: 'Admin • Customer Feedback',
      entityId: feedbackId,
    },
    NotificationAudiences.Admin
  );
}

// ---- 13. Quản trị trả lời phản hồi → báo lại cho khách ----
export function feedbackAnswered(feedbackId, accountId, response) {
  if (isBlank(accountId)) return Promise.resolve();

  return publish(
    {
      type: 'feedback',
      titleVi: 'Phản hồi của bạn đã được trả lời',
      titleEn: 'Your feedback has a reply',
      descVi: short(response),
      descEn: short(response),
      targetPath: '/user',
      targetTab: 'feedback',
      targetRole: 'user',
      sectionVi: 'Khách hàng • Phản hồi',
      sectionEn: 'Customer • Feedback',
      entityId: feedbackId,
    },
    groupForAccount(accountId)
  );
}

// ---- 14. Đổi trạng thái đường truyền (tạm ngưng / khôi phục / cắt) ----
const CONNECTION_STATUS_VI = {
  [ConnectionStatuses.Active]: 'đang hoạt động',
  [ConnectionStatuses.TemporarilyInactive]: 'tạm ngưng',
  [ConnectionStatuses.PermanentlyInactive]: 'ngừng vĩnh viễn',
};

export function connectionStatusChanged(accountId, customerName, status, reason) {
  const statusVi = CONNECTION_STATUS_VI[status] ?? status.toLowerCase();
  const reasonPart = isBlank(reason) ? null : `: ${short(reason)}`;

  const customer = publish(
    {
      type: 'alert',
      titleVi: `Đường truyền chuyển sang trạng thái ${statusVi}`,
      titleEn: `Your connection is now ${status}`,
      descVi: `Tài khoản ${accountId}${reasonPart ?? '.'}`,
      descEn: `Account ${accountId}${reasonPart ?? '.'}`,
      ...CUSTOMER_OVERVIEW,
      entityId: accountId,
    },
    groupForAccount(accountId)
  );

  const staff = publish(
    {
      type: 'alert',
      titleVi: `Thuê bao ${accountId} ${statusVi}`,
      titleEn: `Subscriber ${accountId} is now ${status}`,
      descVi: `${customerName}${reasonPart ?? ' vừa đổi trạng thái đường truyền.'}`,
      descEn: `${customerName}${reasonPart ?? ' changed connection status.'}`,
      ...ACCOUNTS_TRACKING,
      entityId: accountId,
    },
    NotificationAudiences.Accounts
  );

  return Promise.all([customer, staff]);
}
