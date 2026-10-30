// Yêu cầu nhập thiết bị / vật tư từ Kỹ thuật viên gửi Admin. Khi Admin đáp ứng (Fulfilled),
// hệ thống tự cộng tồn kho và tạo sẵn các thiết bị "In Stock" tại chi nhánh yêu cầu,
// để kỹ thuật viên cấp kết nối được ngay.
import { randomInt } from 'node:crypto';
import { withTransaction } from '../config/database.js';
import * as equipmentRequestRepository from '../repositories/equipmentRequest.repository.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import * as retailStoreRepository from '../repositories/retailStore.repository.js';
import { AppError } from '../utils/AppError.js';
import { dotnetTicks } from '../utils/ids.js';
import { toNumber } from '../validators/helpers.js';
import * as notificationService from './notification.service.js';
import { localCompactDate } from '../utils/dates.js';
import { clean } from '../utils/text.js';

const STATUSES = ['Approved', 'Fulfilled', 'Rejected', 'Pending'];
const DEFAULT_FIRMWARE = 'v3.4.1-STABLE';

export function list({ status, storeId, search }) {
  return equipmentRequestRepository.findAll({
    status: clean(status) && status !== 'all' ? status.trim() : null,
    storeId: clean(storeId),
    search: clean(search),
  });
}

export async function getById(id) {
  const request = await equipmentRequestRepository.findById(id);
  if (!request) throw AppError.notFound(`Không tìm thấy yêu cầu nhập hàng: ${id}`);
  return request;
}

/** employeeId lấy từ JWT của người đang đăng nhập, không tin client gửi lên. */
export async function create(input, employeeId) {
  const storeId = input.storeId.trim();
  if (!(await retailStoreRepository.exists(storeId))) {
    throw AppError.badRequest(`Chi nhánh không tồn tại: ${input.storeId}`);
  }

  if (!employeeId?.trim()) throw AppError.unauthorized('Không xác định được nhân viên thực hiện.');
  const employee = await equipmentRequestRepository.findTechnicalEmployee(employeeId);
  if (!employee) {
    throw AppError.badRequest('Nhân viên thực hiện không tồn tại, đã ngừng hoạt động hoặc không có quyền kỹ thuật.');
  }

  const requestId = `REQ-${localCompactDate()}-${randomInt(1000, 9999)}`;
  await equipmentRequestRepository.insert({
    requestId,
    orderId: clean(input.orderId),
    storeId,
    employeeId,
    inventoryId: clean(input.inventoryId),
    itemName: input.itemName.trim(),
    deviceType: input.deviceType.trim(),
    quantity: Math.max(1, Math.trunc(toNumber(input.quantity) ?? 1)),
    urgency: clean(input.urgency) ?? 'Normal',
    status: 'Pending',
    reason: input.reason?.trim() ?? null,
  });

  notificationService.notifyDataChanged('equipmentRequests', requestId);
  return equipmentRequestRepository.findById(requestId);
}

export async function updateStatus(id, input) {
  const status = input.status?.trim();
  if (!STATUSES.includes(status)) {
    throw AppError.badRequest('Trạng thái chỉ nhận: Approved, Fulfilled, Rejected, Pending.');
  }

  const request = await equipmentRequestRepository.findById(id);
  if (!request) throw AppError.notFound(`Không tìm thấy yêu cầu nhập hàng: ${id}`);
  if (request.status === 'Fulfilled' && status !== 'Fulfilled') {
    throw AppError.conflict('Yêu cầu đã được nhập hàng hoàn tất, không thể thay đổi.');
  }

  await withTransaction(async (tx) => {
    await equipmentRequestRepository.updateStatus(id, status, clean(input.adminNotes), tx);
    // Admin đáp ứng yêu cầu ⇒ nhập hàng về chi nhánh.
    if (status === 'Fulfilled') await fulfill(request, tx);
  });

  for (const entity of ['equipmentRequests', 'equipment', 'inventory']) {
    notificationService.notifyDataChanged(entity, id);
  }
  return equipmentRequestRepository.findById(id);
}

export async function remove(id) {
  const request = await equipmentRequestRepository.findById(id);
  if (!request) throw AppError.notFound(`Không tìm thấy yêu cầu: ${id}`);
  if (request.status === 'Fulfilled') {
    throw AppError.conflict('Yêu cầu đã được nhập kho hoàn tất, không thể xóa.');
  }

  await equipmentRequestRepository.remove(id);
  notificationService.notifyDataChanged('equipmentRequests', id);
  return { message: `Đã xóa yêu cầu ${id} thành công` };
}

// ==================== Nhập hàng ====================

async function fulfill(request, tx) {
  // 1. Cộng tồn kho của mặt hàng tương ứng (nếu có).
  const item = await equipmentRequestRepository.findInventoryForRequest(request, tx);
  if (item) await inventoryRepository.incrementStock(item.inventoryId, request.quantity, tx);

  // 2. Tạo thiết bị "In Stock" tại chi nhánh nhận.
  const vendorId = item?.vendorId ?? (await inventoryRepository.firstVendorId()) ?? 'vnd-02';
  const ticks = dotnetTicks().slice(9);
  for (let i = 0; i < request.quantity; i++) {
    await equipmentRequestRepository.insertEquipment(
      {
        equipmentId: `eq-${ticks}-${i}`,
        inventoryId: item?.inventoryId ?? null,
        serialNumber: `NX-${localCompactDate().slice(2)}-${randomInt(10000, 99999)}`,
        macAddress: randomMac(),
        deviceModel: request.itemName,
        deviceType: request.deviceType,
        vendorId,
        storeId: request.storeId,
        firmwareVersion: DEFAULT_FIRMWARE,
      },
      tx
    );
  }
}

/** MAC ngẫu nhiên dạng "locally administered" (bit thấp của byte đầu = 0). */
function randomMac() {
  const bytes = [randomInt(0, 0xfe) & 0xfe, ...Array.from({ length: 5 }, () => randomInt(0, 0xff))];
  return bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(':');
}
