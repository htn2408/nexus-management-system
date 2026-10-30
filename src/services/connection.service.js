// Kết nối (đường truyền) của khách: cấp kết nối cho đơn khả thi, đồng bộ / sửa kết nối,
// đổi trạng thái (tạm ngưng, khôi phục, ngừng vĩnh viễn) và thu hồi thiết bị về kho.
import { isIP } from 'node:net';
import { IsolationLevel, withTransaction } from '../config/database.js';
import { ConnectionStatuses, EquipmentStatuses, OrderStatuses } from '../constants/statuses.js';
import * as activityLogRepository from '../repositories/connectionActivityLog.repository.js';
import * as connectionRepository from '../repositories/connection.repository.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as equipmentRepository from '../repositories/equipment.repository.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import * as orderRepository from '../repositories/order.repository.js';
import { AppError } from '../utils/AppError.js';
import { formatAccountId, normalizeAccountId } from '../utils/accountId.js';
import { generateAccountId } from './accountId.service.js';
import * as emailService from './email.service.js';
import { statusFor as inventoryStatusFor } from './inventory.service.js';
import * as notificationEvents from './notificationEvents.js';
import * as notificationService from './notification.service.js';
import { parseDateTime, startOfNextUtcDay } from '../utils/dates.js';
import { clean, matchIgnoreCase } from '../utils/text.js';

const CONNECTION_STATUSES = Object.values(ConnectionStatuses);
const INVALID_STATUS = `Trạng thái không hợp lệ. Các giá trị cho phép: ${CONNECTION_STATUSES.join(', ')}`;
const NOT_FOUND = 'Không tìm thấy kết nối';
// Cho phép lệch đồng hồ giữa máy kỹ thuật viên và server khi khai thời gian hoàn công.
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_INT = 2_147_483_647;

// ==================== Đọc ====================

export function list(query) {
  const toDate = parseDateTime(query.toDate);
  return connectionRepository.findAll({
    accountIdKey: clean(query.accountId) ? normalizeAccountId(query.accountId) : null,
    status: clean(query.status),
    equipmentId: clean(query.equipmentId),
    customerName: clean(query.customerName),
    phone: clean(query.phone),
    connectionType: clean(query.connectionType),
    fromDate: parseDateTime(query.fromDate),
    toDateExclusive: toDate ? startOfNextUtcDay(toDate) : null,
  });
}

export async function getById(accountId) {
  const connection = await connectionRepository.findDetail(accountIdCandidates(accountId));
  if (!connection) throw AppError.notFound(NOT_FOUND);
  return connection;
}

/** Nhật ký thao tác (cấp kết nối, đổi trạng thái) của một kết nối, mới nhất trước. */
export async function activityLogs(accountId) {
  const candidates = accountIdCandidates(accountId);
  if (!(await connectionRepository.findDetail(candidates))) throw AppError.notFound(NOT_FOUND);
  return activityLogRepository.findByAccount(candidates);
}

// ==================== Cấp kết nối cho đơn khả thi ====================

export async function provide(orderId, input) {
  const result = await withTransaction(
    async (tx) => {
      const order = await orderRepository.findById(orderId, tx, true);
      if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');
      if (order.status !== OrderStatuses.Feasible) throw AppError.badRequest('Đơn hàng chưa được xác nhận khả thi');

      const provisioned = await connectionRepository.countByOrder(orderId, tx);
      const required = Math.max(1, order.bulkConnectionsCount);
      if (provisioned >= required) throw AppError.conflict('Đơn hàng này đã được cấp đủ kết nối');

      const equipmentId = clean(input.equipmentId);
      if (!equipmentId) throw AppError.badRequest('Phải chọn thiết bị cho kết nối');

      const equipment = await equipmentRepository.findRawById(equipmentId, tx);
      if (!equipment) throw AppError.badRequest('Thiết bị không tồn tại');
      if (equipment.assignedAccountId?.trim() || equipment.connectionAccountId) {
        throw AppError.conflict('Thiết bị đã được gán cho kết nối khác');
      }
      if (equipment.status !== EquipmentStatuses.InStock) {
        throw AppError.badRequest('Thiết bị hiện không sẵn sàng để lắp đặt');
      }
      if (equipment.storeId && equipment.storeId !== order.storeId) {
        throw AppError.badRequest('Thiết bị không thuộc cửa hàng xử lý đơn hàng');
      }
      if (equipment.inventoryId && equipment.inventoryStock !== null && equipment.inventoryStock <= 0) {
        throw AppError.conflict('Mặt hàng kho liên kết với thiết bị đã hết hàng');
      }

      const performedBy = clean(input.performedBy) ?? order.employeeId ?? order.feasibilityCheckedBy;
      if (performedBy && !(await employeeRepository.existsActive(performedBy, tx))) {
        throw AppError.badRequest('Nhân viên thực hiện không tồn tại hoặc đã ngừng hoạt động');
      }

      const now = new Date();
      const installedDate = input.installedDate ? new Date(input.installedDate) : now;
      if (installedDate.getTime() > now.getTime() + CLOCK_SKEW_MS) {
        throw AppError.badRequest('Thời gian hoàn công không được ở tương lai');
      }

      const ipAddress = clean(input.ipAddress);
      if (ipAddress && !isIP(ipAddress)) throw AppError.badRequest('Địa chỉ IP không hợp lệ');

      // Dùng Account ID đã giữ chỗ lúc khảo sát khả thi nếu còn trống, không thì sinh mã mới
      // (đơn bulk nhiều kết nối: mỗi kết nối một mã).
      const reservedAvailable =
        Boolean(order.assignedAccountId?.trim()) &&
        !(await connectionRepository.accountIdExists(order.assignedAccountId, tx));
      const accountId = reservedAvailable
        ? order.assignedAccountId
        : await generateAccountId(order.connectionType, order.cityCode, tx);

      await connectionRepository.insert(
        {
          accountId,
          orderId: order.orderId,
          equipmentId: equipment.equipmentId,
          status: ConnectionStatuses.Active,
          ipAddress,
          portNumber: clean(input.portNumber),
          installedDate,
          lastUpdated: now,
          lastStatusReason: 'Connection provided',
        },
        tx
      );
      await activityLogRepository.insert(
        {
          accountId,
          actionType: 'Provisioning',
          newValue: ConnectionStatuses.Active,
          reason: `Cấp kết nối cho đơn ${order.orderId}, thiết bị ${equipment.serialNumber ?? equipment.equipmentId}`,
          performedBy,
          timestamp: now,
        },
        tx
      );

      const totalProvisioned = provisioned + 1;
      const orderStatus = totalProvisioned >= required ? OrderStatuses.ConnectionProvided : order.status;
      await orderRepository.update(
        order.orderId,
        { assignedAccountId: order.assignedAccountId ?? accountId, status: orderStatus },
        tx
      );

      await equipmentRepository.update(
        equipment.equipmentId,
        {
          assignedAccountId: accountId,
          assignedTechnicianId: performedBy,
          installedDate,
          status: EquipmentStatuses.InService,
        },
        tx
      );
      await takeFromInventory(equipment, tx);

      return { order, accountId, equipmentId: equipment.equipmentId, installedDate, totalProvisioned, required, orderStatus };
    },
    { isolationLevel: IsolationLevel.SERIALIZABLE }
  );

  const { order, accountId } = result;

  // Đã đấu nối xong ⇒ kế toán lập hoá đơn, khách nhận tin báo đường truyền sẵn sàng.
  await notificationEvents.connectionProvided(accountId, order.customerName ?? 'Khách hàng', order.planName);
  notificationService.notifyDataChanged('connections', accountId);

  // Gửi Mã tài khoản cho khách ngay khi đấu nối xong — đây là mã để đăng nhập cổng khách hàng.
  if (order.customerEmail?.trim()) {
    const customerName = order.customerName?.trim() ? order.customerName : 'Quý khách';
    void emailService.sendConnectionReady(order.customerEmail, customerName, accountId, order.orderId, order.planName);
  }

  return {
    message: 'Cung cấp kết nối thành công',
    orderId: order.orderId,
    accountId,
    connectionStatus: ConnectionStatuses.Active,
    equipmentId: result.equipmentId,
    installedDate: result.installedDate,
    provisionedConnections: result.totalProvisioned,
    requiredConnections: result.required,
    orderStatus: result.orderStatus,
  };
}

// ==================== Tạo / đồng bộ kết nối từ frontend ====================

export async function createOrUpdate(input) {
  const accountIdValue = clean(input.accountId);
  if (!accountIdValue) throw AppError.badRequest('AccountId không được để trống');

  const accountKey = normalizeAccountId(accountIdValue);
  if (!/^[BDT]\d{15}$/.test(accountKey)) {
    throw AppError.badRequest('AccountId phải gồm tiền tố B/D/T, mã thành phố 3 số và số thứ tự 12 số');
  }
  const candidates = accountIdCandidates(accountKey);

  const status = clean(input.status) ? matchIgnoreCase(CONNECTION_STATUSES, input.status) : ConnectionStatuses.Active;
  if (!status) throw AppError.badRequest(INVALID_STATUS);

  const ipAddress = clean(input.ipAddress);
  if (ipAddress && !isIP(ipAddress)) throw AppError.badRequest('Địa chỉ IP không hợp lệ');

  const accountId = await withTransaction(async (tx) => {
    const connection = await connectionRepository.findRaw(candidates, tx);
    const targetAccountId = connection?.accountId ?? formatAccountId(accountKey);

    const equipmentId = clean(input.equipmentId);
    const serialNumber = clean(input.assignedDeviceSerial);
    let requested = null;
    if (equipmentId || serialNumber) {
      requested = equipmentId
        ? await equipmentRepository.findRawById(equipmentId, tx)
        : await equipmentRepository.findRawBySerial(serialNumber, tx);
      if (!requested) throw AppError.badRequest('Thiết bị được chỉ định không tồn tại');

      if (await equipmentRepository.usedByOtherConnection(requested.equipmentId, candidates, tx)) {
        throw AppError.conflict('Thiết bị đã được gán cho kết nối khác');
      }
    }

    const now = new Date();
    if (connection) {
      await updateExisting(connection, { input, status, ipAddress, requested, now }, tx);
    } else {
      await createNew(targetAccountId, { input, status, ipAddress, requested, now }, tx);
    }
    return targetAccountId;
  });

  return connectionRepository.findDetail([accountId]);
}

async function updateExisting(connection, { input, status, ipAddress, requested, now }, tx) {
  const requestedOrderId = clean(input.orderId);
  if (requestedOrderId && requestedOrderId !== connection.orderId) {
    throw AppError.conflict('Không thể chuyển kết nối sang đơn hàng khác');
  }
  if (connection.status === ConnectionStatuses.PermanentlyInactive && status !== ConnectionStatuses.PermanentlyInactive) {
    throw AppError.conflict('Không thể kích hoạt lại kết nối đã ngừng vĩnh viễn');
  }

  const reason = clean(input.lastStatusReason);
  if (status !== ConnectionStatuses.Active && !reason) {
    throw AppError.badRequest('Phải nhập lý do khi ngừng kết nối');
  }

  const changes = { lastUpdated: now };
  let currentEquipmentId = connection.equipmentId;

  if (connection.status !== status) {
    changes.status = status;
    changes.lastStatusReason = reason ?? 'Synchronized from frontend';
    Object.assign(changes, statusDates(connection.status, status, now));
    if (status === ConnectionStatuses.PermanentlyInactive) {
      await returnEquipmentToStock(connection, tx);
      changes.equipmentId = null;
      currentEquipmentId = null;
    }
  }

  if (ipAddress) changes.ipAddress = ipAddress;
  if (clean(input.portNumber)) changes.portNumber = clean(input.portNumber);

  if (requested && currentEquipmentId !== requested.equipmentId) {
    if (currentEquipmentId) {
      throw AppError.conflict('Kết nối đã có thiết bị; hãy thu hồi thiết bị trước khi gán thiết bị khác');
    }
    if (requested.status !== EquipmentStatuses.InStock) {
      throw AppError.conflict('Thiết bị không ở trạng thái sẵn sàng trong kho');
    }
    changes.equipmentId = requested.equipmentId;
    await assignEquipment(connection.accountId, connection.installedDate, requested, tx);
  }

  await connectionRepository.update(connection.accountId, changes, tx);
}

async function createNew(accountId, { input, status, ipAddress, requested, now }, tx) {
  const orderId = clean(input.orderId);
  if (!orderId) throw AppError.badRequest('OrderId là bắt buộc khi tạo kết nối mới');

  const order = await orderRepository.findById(orderId, tx, true);
  if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');
  if (order.status !== OrderStatuses.Feasible) throw AppError.badRequest('Đơn hàng chưa được xác nhận khả thi');
  if (status !== ConnectionStatuses.Active) throw AppError.badRequest('Kết nối mới phải ở trạng thái Active');
  if (!requested) throw AppError.badRequest('Phải chọn thiết bị cho kết nối mới');
  if (requested.status !== EquipmentStatuses.InStock || requested.assignedAccountId?.trim()) {
    throw AppError.conflict('Thiết bị không sẵn sàng để lắp đặt');
  }
  if (requested.storeId && requested.storeId !== order.storeId) {
    throw AppError.badRequest('Thiết bị không thuộc cửa hàng xử lý đơn hàng');
  }
  if (requested.inventoryId && requested.inventoryStock !== null && requested.inventoryStock <= 0) {
    throw AppError.conflict('Mặt hàng kho liên kết đã hết hàng');
  }

  const provisioned = await connectionRepository.countByOrder(orderId, tx);
  const required = Math.max(1, order.bulkConnectionsCount);
  if (provisioned >= required) throw AppError.conflict('Đơn hàng đã được cấp đủ kết nối');

  const installedDate = input.installedDate ? new Date(input.installedDate) : now;
  if (installedDate.getTime() > now.getTime() + CLOCK_SKEW_MS) {
    throw AppError.badRequest('Thời gian hoàn công không được ở tương lai');
  }

  await connectionRepository.insert(
    {
      accountId,
      orderId: order.orderId,
      equipmentId: requested.equipmentId,
      status: ConnectionStatuses.Active,
      ipAddress,
      portNumber: clean(input.portNumber),
      installedDate,
      lastUpdated: now,
      lastStatusReason: clean(input.lastStatusReason) ?? 'Connection provided',
    },
    tx
  );

  await orderRepository.update(
    order.orderId,
    {
      assignedAccountId: order.assignedAccountId ?? accountId,
      status: provisioned + 1 >= required ? OrderStatuses.ConnectionProvided : order.status,
    },
    tx
  );
  await assignEquipment(accountId, installedDate, requested, tx);
}

// ==================== Đổi trạng thái ====================

export async function updateStatus(accountIdInput, input) {
  const status = matchIgnoreCase(CONNECTION_STATUSES, input.status);
  const reason = clean(input.reason);
  const performedBy = clean(input.performedBy);

  const result = await withTransaction(async (tx) => {
    const connection = await connectionRepository.findRaw(accountIdCandidates(accountIdInput), tx);
    if (!connection) throw AppError.notFound(NOT_FOUND);

    if (!status) throw AppError.badRequest(INVALID_STATUS);
    if (status !== ConnectionStatuses.Active && !reason) {
      throw AppError.badRequest('Phải nhập lý do khi ngừng kết nối');
    }
    if (connection.status === ConnectionStatuses.PermanentlyInactive && status !== ConnectionStatuses.PermanentlyInactive) {
      throw AppError.conflict('Không thể kích hoạt lại kết nối đã ngừng vĩnh viễn');
    }
    if (performedBy && !(await employeeRepository.existsActive(performedBy, tx))) {
      throw AppError.badRequest('Nhân viên thực hiện không tồn tại hoặc đã ngừng hoạt động');
    }

    const now = new Date();
    const changes = {
      status,
      lastStatusReason: reason,
      lastUpdated: now,
      ...statusDates(connection.status, status, now),
    };
    // Ngừng vĩnh viễn ⇒ thu hồi thiết bị về kho để lắp cho khách khác.
    if (status === ConnectionStatuses.PermanentlyInactive && connection.equipmentId) {
      await returnEquipmentToStock(connection, tx);
      changes.equipmentId = null;
    }

    await connectionRepository.update(connection.accountId, changes, tx);
    if (connection.status !== status) {
      await activityLogRepository.insert(
        {
          accountId: connection.accountId,
          actionType: 'StatusChange',
          oldValue: connection.status,
          newValue: status,
          reason,
          performedBy,
          timestamp: now,
        },
        tx
      );
    }
    return connection;
  });

  if (result.status !== status) {
    const subscriberName = await connectionRepository.customerNameForOrder(result.orderId);
    await notificationEvents.connectionStatusChanged(result.accountId, subscriberName ?? 'Khách hàng', status, reason);
    notificationService.notifyDataChanged('connections', result.accountId);
  }

  return {
    message: 'Cập nhật trạng thái kết nối thành công',
    accountId: result.accountId,
    oldStatus: result.status,
    status,
  };
}

// ==================== Helpers ====================

/** Ngày tạm ngưng / khôi phục / chấm dứt tương ứng khi chuyển trạng thái. */
function statusDates(oldStatus, newStatus, now) {
  switch (newStatus) {
    case ConnectionStatuses.TemporarilyInactive:
      return { suspensionStartDate: now, suspensionEndDate: null };
    case ConnectionStatuses.Active:
      return oldStatus === ConnectionStatuses.TemporarilyInactive ? { suspensionEndDate: now } : {};
    case ConnectionStatuses.PermanentlyInactive:
      return { terminatedDate: now };
    default:
      return {};
  }
}

/** Gán thiết bị cho kết nối và trừ 1 đơn vị tồn kho của mặt hàng liên kết. */
async function assignEquipment(accountId, installedDate, equipment, tx) {
  await equipmentRepository.update(
    equipment.equipmentId,
    { assignedAccountId: accountId, installedDate, status: EquipmentStatuses.InService },
    tx
  );
  await takeFromInventory(equipment, tx);
}

async function takeFromInventory(equipment, tx) {
  if (!equipment.inventoryId || equipment.inventoryStock === null) return;
  const stock = equipment.inventoryStock - 1;
  await inventoryRepository.setStock(equipment.inventoryId, stock, inventoryStatusFor(stock, equipment.inventoryReorderLevel), tx);
}

/** Thu hồi thiết bị về kho: bỏ gán tài khoản, cộng lại 1 đơn vị tồn kho. */
async function returnEquipmentToStock(connection, tx) {
  if (!connection.equipmentId) return;

  await equipmentRepository.update(
    connection.equipmentId,
    { assignedAccountId: null, assignedTechnicianId: null, installedDate: null, status: EquipmentStatuses.InStock },
    tx
  );

  if (connection.inventoryId && connection.inventoryStock !== null && connection.inventoryStock < MAX_INT) {
    const stock = connection.inventoryStock + 1;
    await inventoryRepository.setStock(connection.inventoryId, stock, inventoryStatusFor(stock, connection.inventoryReorderLevel), tx);
  }
}

/**
 * Các dạng mã cần thử khi tra cứu: CSDL có cả dữ liệu cũ dạng "T064-000000000001"
 * lẫn mã mới sinh dạng liền "T064000000000001".
 */
function accountIdCandidates(value) {
  const key = normalizeAccountId(value);
  const dashed = formatAccountId(key);
  return dashed === key ? [key] : [dashed, key];
}
