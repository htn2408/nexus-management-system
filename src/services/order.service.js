// Đơn đăng ký dịch vụ: tạo đơn (quầy bán lẻ / cổng khách hàng / trang đăng ký công khai),
// duyệt hồ sơ tại chi nhánh, phân công kỹ thuật viên, khảo sát khả thi và lên lịch lắp đặt.
import { randomInt } from 'node:crypto';
import { IsolationLevel, withTransaction } from '../config/database.js';
import { bulkDiscountPercent, isDepositWaived } from '../constants/bulkDiscounts.js';
import { OrderStatuses, RetailStageOrderStatuses } from '../constants/statuses.js';
import * as customerRepository from '../repositories/customer.repository.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as orderRepository from '../repositories/order.repository.js';
import { AppError } from '../utils/AppError.js';
import { toNumber } from '../validators/helpers.js';
import { generateAccountId } from './accountId.service.js';
import * as emailService from './email.service.js';
import * as notificationEvents from './notificationEvents.js';
import * as notificationService from './notification.service.js';
import { parseDateTime, startOfNextUtcDay } from '../utils/dates.js';
import { clean, matchIgnoreCase } from '../utils/text.js';

const ORDER_NOT_FOUND = 'Không tìm thấy đơn hàng';
// Hai lần gửi CÙNG một đơn cách nhau ít hơn chừng này giây được coi là gửi trùng.
const DUPLICATE_WINDOW_SECONDS = 60;
const ALL_ORDER_STATUSES = Object.values(OrderStatuses);
const SQL_DUPLICATE_KEY = 2627;

// ==================== Đọc đơn ====================

export async function list(query) {
  const fromDate = parseDateTime(query.fromDate);
  const toDate = parseDateTime(query.toDate);

  const orders = await orderRepository.findAll({
    status: clean(query.status),
    storeId: clean(query.storeId),
    keyword: clean(query.keyword),
    customerName: clean(query.customerName),
    phone: clean(query.phone),
    connectionType: clean(query.connectionType),
    fromDate,
    // "Đến 2026-09-26" nghĩa là lấy mọi đơn nộp trong ngày 26.
    toDateExclusive: toDate ? startOfNextUtcDay(toDate) : null,
  });
  return orders.map(toListItem);
}

export async function getById(id) {
  const order = await orderRepository.findById(id);
  if (!order) throw AppError.notFound(ORDER_NOT_FOUND);
  return toDetail(order);
}

/** Đơn của một khách (cổng khách hàng). */
export async function listForCustomer(customerId) {
  const orders = await orderRepository.findAll({ customerId });
  return orders.map(toListItem);
}

/**
 * Tra cứu công khai bằng mã đơn (trang đăng nhập, biên nhận mua hàng): chỉ trả tiến độ,
 * không trả họ tên, SĐT, email, địa chỉ hay giấy tờ của khách. Mã đơn chạy tuần tự nên
 * cũng không trả mã tài khoản (dò được cả loạt); khách nhận mã tài khoản qua email.
 */
export async function publicStatus(id) {
  const order = await orderRepository.findById(String(id ?? '').trim().toUpperCase());
  if (!order) throw AppError.notFound(ORDER_NOT_FOUND);
  return {
    orderId: order.orderId,
    status: order.status,
    applicationDate: order.applicationDate,
    connectionType: order.connectionType,
    planName: order.planName,
    storeName: order.storeName,
    accountIssued: Boolean(order.assignedAccountId),
  };
}

// ==================== Tạo đơn ====================

/**
 * Kiểm tra nghiệp vụ trước khi tạo đơn, dùng chung cho quầy/cổng khách hàng và trang đăng ký
 * công khai. Trả về câu lỗi tiếng Việt, hoặc null nếu hợp lệ.
 */
export function validateCreateRequest(input) {
  if (
    input.idProofType?.trim() &&
    input.idProofType.trim().toLowerCase() === 'national id card' &&
    !/^\d{12}$/.test(input.idProofNumber ?? '')
  ) {
    return 'Số CCCD phải gồm đúng 12 chữ số.';
  }

  if (
    String(input.connectionType ?? '').toLowerCase() === 'dial-up' &&
    (!input.existingLandlineAccountId?.trim() || !input.existingLandlineAccountId.toUpperCase().startsWith('T'))
  ) {
    return 'Khách hàng bắt buộc phải có tài khoản Landline (Cố định, mã T...) để đăng ký mạng Dial-Up.';
  }

  if ((toNumber(input.bulkConnectionsCount) ?? 1) < 1) {
    return 'Số lượng kết nối phải từ 1 trở lên.';
  }

  return null;
}

export async function create(input) {
  const email = clean(input.customerEmail)?.toLowerCase() ?? null;
  // Lưu số điện thoại dạng chỉ-có-chữ-số để "0912 345 678" và "0912345678" là một.
  const phone = normalizePhone(input.customerPhone);
  const customerName = clean(input.customerName) ?? '';

  // Chỉ dùng lại hồ sơ cũ khi CHẮC CHẮN là cùng một người: trùng email, hoặc không có
  // email nhưng trùng CẢ số điện thoại lẫn họ tên.
  let customer = null;
  if (email) {
    customer = await customerRepository.findProfileByEmail(email);
  } else if (phone && customerName) {
    customer = await customerRepository.findProfileByPhoneAndName(phone, customerName);
  }
  const isNewCustomer = customer === null;
  const customerId = customer?.customerId ?? (await generateCustomerId());

  const bulkConnectionsCount = Math.max(1, Math.trunc(toNumber(input.bulkConnectionsCount) ?? 1));
  const planId = input.planId ?? 'default-plan';
  const storeId = input.retailOutletCode ?? 'default-store';
  const installationAddress = input.installationAddress ?? '';

  // Chống tạo trùng đơn (bấm đúp, Enter + click, trình duyệt gửi lại khi mạng chập chờn):
  // cùng khách, gói, chi nhánh, địa chỉ, số lượng trong 60 giây ⇒ trả lại đơn vừa tạo.
  const duplicateKey = {
    customerId,
    email,
    planId,
    storeId,
    installationAddress,
    bulkConnectionsCount,
    since: new Date(Date.now() - DUPLICATE_WINDOW_SECONDS * 1000),
  };
  const justCreated = await orderRepository.findRecentDuplicate(duplicateKey);
  if (justCreated) return toMutation(await orderRepository.findById(justCreated));

  let orderId;
  try {
    orderId = await withTransaction(async (tx) => {
      if (isNewCustomer) {
        await customerRepository.insertFromOrder(
          {
            customerId,
            fullName: customerName,
            contactNumber: phone ?? '',
            email,
            address: clean(input.installationAddress) ?? '',
            idProofType: clean(input.idProofType) ?? 'National ID Card',
            idProofNumber: clean(input.idProofNumber) ?? '',
          },
          tx
        );
      } else {
        // Cùng một người đặt thêm đơn: thông tin vừa khai là mới nhất, nên cập nhật lại.
        await customerRepository.updateFromOrder(
          customerId,
          {
            fullName: customerName || customer.fullName,
            contactNumber: phone ?? customer.contactNumber,
            // Hồ sơ tạo lúc đăng ký tài khoản chưa có địa chỉ: bổ sung từ đơn hàng này.
            address: customer.address?.trim() ? customer.address : (clean(input.installationAddress) ?? ''),
            // Lúc đăng ký, số giấy tờ tạm lấy bằng mã khách; giấy tờ thật khai trên form thì thay vào.
            idProofType: clean(input.idProofType) ?? customer.idProofType,
            idProofNumber: clean(input.idProofNumber) ?? customer.idProofNumber,
          },
          tx
        );
      }

      // Mã đơn luôn do server sinh: [D|B|T] + 10 chữ số, serial tăng chung toàn hệ thống.
      const newOrderId = `${orderPrefix(input.connectionType)}${String((await orderRepository.maxOrderSerial(tx)) + 1).padStart(10, '0')}`;
      await orderRepository.insert(
        {
          orderId: newOrderId,
          customerId,
          installationAddress,
          // Mọi đơn mới đều phải qua bàn duyệt hồ sơ của chi nhánh — không tin trạng thái client gửi.
          status: OrderStatuses.PendingRetail,
          planId,
          storeId,
          employeeId: clean(input.assignedEmployeeId),
          // Server tự tính theo bậc bulk của spec — không tin con số client gửi.
          bulkConnectionsCount,
          bulkDiscountPercent: bulkDiscountPercent(bulkConnectionsCount),
          existingLandlineAccountId: clean(input.existingLandlineAccountId),
        },
        tx
      );
      return newOrderId;
    });
  } catch (err) {
    // Hai request gửi CÙNG LÚC sinh ra cùng một mã đơn nên request đến sau đụng khoá chính.
    // Đơn của request trước đã lưu ⇒ trả lại chính đơn đó thay vì báo lỗi 500.
    if (err.number === SQL_DUPLICATE_KEY) {
      const winner = await orderRepository.findRecentDuplicate(duplicateKey);
      if (winner) return toMutation(await orderRepository.findById(winner));
    }
    throw err;
  }

  const order = await orderRepository.findById(orderId);
  const planName = clean(input.planName);

  // Gửi mã đơn về email khách. Đơn đã lưu xong trước bước này nên mail hỏng cũng không mất đơn.
  if (email) void emailService.sendOrderPlaced(email, order.customerName, orderId, planName);

  // Khách đã có mã tài khoản (đặt thêm gói trong cổng khách hàng) cũng nhận thông báo.
  const customerAccountIds = await orderRepository.accountIdsForCustomer(customerId);
  await notificationEvents.orderPlaced(
    orderId,
    order.customerName,
    planName,
    order.status === OrderStatuses.PendingRetail,
    customerAccountIds
  );
  notificationService.notifyDataChanged('orders', orderId);

  return toMutation(order);
}

// ==================== Đổi trạng thái (duyệt hồ sơ / phân công / kết luận) ====================

/**
 * Dùng chung cho cả 3 khâu: Cửa hàng bán lẻ duyệt/từ chối hồ sơ, phân công kỹ thuật viên
 * khảo sát, và Kỹ thuật kết luận khả thi.
 */
export async function updateStatus(id, input) {
  // Chặn trạng thái lạ ở đây, nếu không CSDL sẽ chặn bằng CK_Orders_Status.
  const status = matchIgnoreCase(ALL_ORDER_STATUSES, input.status);
  if (!status) {
    throw AppError.badRequest(`Trạng thái không hợp lệ. Các giá trị cho phép: ${ALL_ORDER_STATUSES.join(', ')}`);
  }

  const order = await orderRepository.findById(id);
  if (!order) throw AppError.notFound(ORDER_NOT_FOUND);

  // Phân công kỹ thuật viên chỉ được làm sau khi chi nhánh đã duyệt hồ sơ.
  const technicianName = clean(input.assignedTechnician);
  const technicianId = clean(input.assignedTechnicianId);
  const assigningTechnician = technicianName !== null || technicianId !== null;
  if (
    assigningTechnician &&
    (RetailStageOrderStatuses.includes(order.status) || RetailStageOrderStatuses.includes(status))
  ) {
    throw AppError.badRequest('Hồ sơ chưa được chi nhánh duyệt, chưa thể phân công kỹ thuật viên.');
  }

  const now = new Date();
  const changes = { status };
  let rejectionReason = order.rejectionReason;

  if (status === OrderStatuses.NotApproved) {
    // Cửa hàng bán lẻ từ chối hồ sơ: lý do là bắt buộc để khách biết vì sao.
    const reason = clean(input.retailRejectionReason) ?? clean(input.reason);
    if (!reason) throw AppError.badRequest('Phải nhập lý do khi từ chối hồ sơ của khách.');
    changes.rejectionReason = rejectionReason = reason;
  } else if (status === OrderStatuses.Feasible || status === OrderStatuses.NotFeasible) {
    changes.feasibilityNotes = clean(input.reason) ?? order.feasibilityNotes;
  }

  // Lưu vết người xử lý hồ sơ tại cửa hàng bán lẻ — dùng chung cho cả duyệt lẫn từ chối.
  const handledBy = clean(input.retailApprovedBy);
  if (handledBy) {
    changes.retailApprovedBy = handledBy;
    changes.retailApprovedDate = now;
    changes.retailApprovalNotes = clean(input.retailApprovalNotes) ?? order.retailApprovalNotes;
  }

  if (status === OrderStatuses.PendingRetail) {
    // Hồ sơ bị trả lại rồi nộp lại ⇒ xoá dấu vết lần xử lý trước.
    Object.assign(changes, {
      retailApprovedBy: null,
      retailApprovedDate: null,
      retailApprovalNotes: null,
      rejectionReason: null,
    });
    rejectionReason = null;
  } else if (status !== OrderStatuses.NotApproved) {
    if (input.retailApprovalNotes !== undefined && input.retailApprovalNotes !== null) {
      changes.retailApprovalNotes = clean(input.retailApprovalNotes);
    }
    // Đã duyệt thì lý do từ chối của lần trước không còn đúng nữa. Chỉ xoá khi đúng là
    // thao tác duyệt (có tên người duyệt), tránh xoá nhầm khi chỉ phân công kỹ thuật viên.
    if (handledBy) {
      changes.rejectionReason = rejectionReason = null;
    }
  }

  if (assigningTechnician) {
    changes.assignedTechnicianName = technicianName ?? order.assignedTechnicianName;
    changes.assignedTechnicianPhone = clean(input.assignedTechnicianPhone) ?? order.assignedTechnicianPhone;
    changes.assignedTechnicianDate = now;
    // Orders.EmployeeID có khoá ngoại sang Employee: chỉ gán khi nhân viên thực sự tồn tại,
    // tên và số điện thoại vẫn được lưu để giao diện hiển thị đúng người.
    if (technicianId && (await employeeRepository.existsById(technicianId))) {
      changes.employeeId = technicianId;
    }
  }

  await orderRepository.update(order.orderId, changes);
  const updated = await orderRepository.findById(order.orderId);

  // Báo ngay cho khâu kế tiếp trong quy trình.
  if (status === OrderStatuses.PendingRetail) {
    await notificationEvents.orderResubmitted(order.orderId);
  } else if (status === OrderStatuses.NotApproved) {
    await notificationEvents.orderRejectedByRetail(order.orderId, rejectionReason ?? '', updated.assignedAccountId);
  } else if (status === OrderStatuses.Pending && handledBy) {
    // Có tên người duyệt ⇒ đúng là thao tác duyệt hồ sơ của cửa hàng bán lẻ.
    await notificationEvents.orderApprovedByRetail(order.orderId, handledBy);
  } else if (status === OrderStatuses.Feasible || status === OrderStatuses.NotFeasible) {
    await notificationEvents.orderFeasibility(
      order.orderId,
      status === OrderStatuses.Feasible,
      updated.assignedAccountId,
      updated.rejectionReason ?? updated.feasibilityNotes
    );
  }
  if (technicianName) await notificationEvents.technicianAssigned(order.orderId, technicianName);
  notificationService.notifyDataChanged('orders', order.orderId);

  return toMutation(updated);
}

// ==================== Khảo sát khả thi ====================

export async function updateFeasibility(id, input) {
  const isFeasible = input.isFeasible === true;

  const result = await withTransaction(
    async (tx) => {
      const order = await orderRepository.findById(id, tx, true);
      if (!order) throw AppError.notFound(ORDER_NOT_FOUND);

      if (order.status === OrderStatuses.ConnectionProvided) {
        throw AppError.conflict('Đơn hàng đã được cấp đủ kết nối, không thể đánh giá lại');
      }
      if (await orderRepository.hasConnections(order.orderId, tx)) {
        throw AppError.conflict('Đơn hàng đã có kết nối, không thể đánh giá lại');
      }
      if (!isFeasible && !clean(input.rejectionReason)) {
        throw AppError.badRequest('Đơn không khả thi phải có lý do');
      }

      const checkedBy = input.checkedBy.trim();
      if (!(await employeeRepository.existsActive(checkedBy, tx))) {
        throw AppError.badRequest('Nhân viên kiểm tra không tồn tại hoặc đã ngừng hoạt động');
      }

      const changes = {};
      const connectionType = order.connectionType.trim().toUpperCase();

      if ((connectionType === 'DIAL-UP' || connectionType === 'DIALUP') && isFeasible) {
        // Dial-Up phải đạt cả 2 nhánh; khách đã có landline Nexus thì miễn nhánh landline.
        const landlinePassed = Boolean(order.existingLandlineAccountId?.trim()) || input.landlineFeasible === true;
        if (!landlinePassed || input.internetFeasible !== true) {
          throw AppError.badRequest('Đơn Dial-Up phải đạt cả nhánh Landline và Internet');
        }
        changes.landlineFeasible = true;
        changes.internetFeasible = true;
      } else if (connectionType === 'TELEPHONE' || connectionType === 'LANDLINE') {
        changes.landlineFeasible = isFeasible;
      } else {
        changes.internetFeasible = isFeasible;
      }

      const now = new Date();
      Object.assign(changes, {
        feasibilityNotes: clean(input.notes),
        cableDistanceMeters: toNumber(input.cableDistanceMeters) ?? order.cableDistanceMeters,
        dpBoxCapacity: clean(input.dpBoxCapacity) ?? order.dpBoxCapacity,
        signalLossDbm: toNumber(input.signalLossDbm) ?? order.signalLossDbm,
        feasibilityCheckedBy: checkedBy,
        feasibilityCheckedDate: now,
        status: isFeasible ? OrderStatuses.Feasible : OrderStatuses.NotFeasible,
        rejectionReason: isFeasible ? null : input.rejectionReason.trim(),
      });

      // Khả thi ⇒ giữ chỗ Account ID cho khách ngay; không khả thi ⇒ bỏ mã đã giữ.
      if (isFeasible && !order.assignedAccountId?.trim()) {
        changes.assignedAccountId = await generateAccountId(order.connectionType, order.cityCode, tx);
      } else if (!isFeasible) {
        changes.assignedAccountId = null;
      }

      await orderRepository.update(order.orderId, changes, tx);
      return {
        orderId: order.orderId,
        status: changes.status,
        assignedAccountId: 'assignedAccountId' in changes ? changes.assignedAccountId : order.assignedAccountId,
        reason: changes.rejectionReason ?? changes.feasibilityNotes,
      };
    },
    { isolationLevel: IsolationLevel.SERIALIZABLE }
  );

  await notificationEvents.orderFeasibility(result.orderId, isFeasible, result.assignedAccountId, result.reason);
  notificationService.notifyDataChanged('orders', result.orderId);

  return {
    message: isFeasible ? 'Đã xác nhận đơn khả thi' : 'Đã xác nhận đơn không khả thi',
    orderId: result.orderId,
    status: result.status,
    assignedAccountId: result.assignedAccountId,
  };
}

// ==================== Lên lịch lắp đặt ====================

export async function updateSchedule(id, input) {
  const order = await orderRepository.findById(id);
  if (!order) throw AppError.notFound(ORDER_NOT_FOUND);

  if (order.status !== OrderStatuses.Feasible) {
    throw AppError.badRequest('Chỉ có thể lên lịch cho đơn hàng khả thi');
  }

  const scheduledInstallDate = new Date(input.scheduledInstallDate);
  if (scheduledInstallDate.getTime() <= Date.now()) {
    throw AppError.badRequest('Thời gian lắp đặt phải lớn hơn thời gian hiện tại');
  }

  const technicianId = clean(input.technicianId);
  if (technicianId && !(await employeeRepository.existsActive(technicianId))) {
    throw AppError.badRequest('Kỹ thuật viên không tồn tại hoặc đã ngừng hoạt động');
  }

  const employeeId = technicianId ?? order.employeeId;
  await orderRepository.update(order.orderId, { scheduledInstallDate, employeeId });

  return {
    message: 'Lên lịch lắp đặt thành công',
    orderId: order.orderId,
    scheduledInstallDate,
    technicianId: employeeId,
    status: order.status,
  };
}

// ==================== Helpers ====================

/** Chỉ giữ chữ số: "0912 345-678" → "0912345678". Không còn số nào thì null. */
function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

function orderPrefix(connectionType) {
  switch (String(connectionType ?? '').trim().toUpperCase()) {
    case 'DIAL-UP':
      return 'D';
    case 'LANDLINE':
    case 'TELEPHONE':
      return 'T';
    default:
      return 'B';
  }
}

/** Mã khách cùng định dạng lúc đăng ký tài khoản (CUS + 6 chữ số), có kiểm tra trùng. */
async function generateCustomerId() {
  for (;;) {
    const candidate = `CUS${randomInt(100000, 1000000)}`;
    if (!(await customerRepository.existsById(candidate))) return candidate;
  }
}

function toListItem(o) {
  return {
    orderId: o.orderId,
    customerId: o.customerId,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    planId: o.planId,
    planName: o.planName,
    connectionType: o.connectionType,
    storeId: o.storeId,
    storeName: o.storeName,
    installationAddress: o.installationAddress,
    applicationDate: o.applicationDate,
    status: o.status,
    cableDistanceMeters: o.cableDistanceMeters,
    dpBoxCapacity: o.dpBoxCapacity,
    signalLossDbm: o.signalLossDbm,
    feasibilityNotes: o.feasibilityNotes,
    rejectionReason: o.rejectionReason,
    internetFeasible: o.internetFeasible,
    feasibilityCheckedBy: o.feasibilityCheckedBy,
    feasibilityCheckedDate: o.feasibilityCheckedDate,
    scheduledInstallDate: o.scheduledInstallDate,
    assignedAccountId: o.assignedAccountId,
    provisionedConnections: o.provisionedConnections,
    bulkConnectionsCount: o.bulkConnectionsCount,
    bulkDiscountPercent: o.bulkDiscountPercent,
    existingLandlineAccountId: o.existingLandlineAccountId,
    landlineFeasible: o.landlineFeasible,
    retailApprovedBy: o.retailApprovedBy,
    retailApprovedDate: o.retailApprovedDate,
    retailApprovalNotes: o.retailApprovalNotes,
    assignedTechnicianName: o.assignedTechnicianName,
    assignedTechnicianPhone: o.assignedTechnicianPhone,
    assignedTechnicianDate: o.assignedTechnicianDate,
    employeeId: o.employeeId,
    idProofType: o.idProofType,
    idProofNumber: o.idProofNumber,
    depositWaived: o.depositWaived,
  };
}

function toDetail(o) {
  return {
    orderId: o.orderId,
    customerId: o.customerId,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail,
    planId: o.planId,
    planName: o.planName,
    connectionType: o.connectionType,
    storeId: o.storeId,
    storeName: o.storeName,
    cityCode: o.cityCode,
    employeeId: o.employeeId,
    installationAddress: o.installationAddress,
    applicationDate: o.applicationDate,
    status: o.status,
    cableDistanceMeters: o.cableDistanceMeters,
    dpBoxCapacity: o.dpBoxCapacity,
    signalLossDbm: o.signalLossDbm,
    feasibilityNotes: o.feasibilityNotes,
    feasibilityCheckedBy: o.feasibilityCheckedBy,
    feasibilityCheckedDate: o.feasibilityCheckedDate,
    scheduledInstallDate: o.scheduledInstallDate,
    rejectionReason: o.rejectionReason,
    internetFeasible: o.internetFeasible,
    landlineFeasible: o.landlineFeasible,
    assignedAccountId: o.assignedAccountId,
    provisionedConnections: o.provisionedConnections,
    bulkConnectionsCount: o.bulkConnectionsCount,
    bulkDiscountPercent: o.bulkDiscountPercent,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    retailApprovedBy: o.retailApprovedBy,
    retailApprovedDate: o.retailApprovedDate,
    retailApprovalNotes: o.retailApprovalNotes,
    assignedTechnicianName: o.assignedTechnicianName,
    assignedTechnicianPhone: o.assignedTechnicianPhone,
    assignedTechnicianDate: o.assignedTechnicianDate,
    depositWaived: o.depositWaived,
  };
}

/** Bản phẳng trả về sau khi tạo / đổi trạng thái đơn. */
function toMutation(o) {
  return {
    orderId: o.orderId,
    customerId: o.customerId,
    planId: o.planId,
    storeId: o.storeId,
    employeeId: o.employeeId,
    installationAddress: o.installationAddress,
    status: o.status,
    feasibilityNotes: o.feasibilityNotes,
    rejectionReason: o.rejectionReason,
    retailApprovedBy: o.retailApprovedBy,
    retailApprovedDate: o.retailApprovedDate,
    retailApprovalNotes: o.retailApprovalNotes,
    assignedTechnicianName: o.assignedTechnicianName,
    assignedTechnicianPhone: o.assignedTechnicianPhone,
    assignedTechnicianDate: o.assignedTechnicianDate,
    assignedAccountId: o.assignedAccountId,
    scheduledInstallDate: o.scheduledInstallDate,
    applicationDate: o.applicationDate,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    bulkConnectionsCount: o.bulkConnectionsCount,
    bulkDiscountPercent: o.bulkDiscountPercent,
    depositWaived: isDepositWaived(o.bulkConnectionsCount),
  };
}
