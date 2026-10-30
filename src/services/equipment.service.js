// Thiết bị định danh (modem, router, ONT...) dùng để lắp cho khách. Việc gán thiết bị vào
// tài khoản khách đi qua API cấp kết nối (connection.service.js), không sửa trực tiếp ở đây.
import { EquipmentStatuses } from '../constants/statuses.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import * as equipmentRepository from '../repositories/equipment.repository.js';
import * as inventoryRepository from '../repositories/inventory.repository.js';
import * as retailStoreRepository from '../repositories/retailStore.repository.js';
import { AppError } from '../utils/AppError.js';
import { clean } from '../utils/text.js';

const EQUIPMENT_STATUSES = Object.values(EquipmentStatuses);
const NOT_FOUND = 'Không tìm thấy thiết bị';
const INVALID_STATUS = `Trạng thái không hợp lệ. Các giá trị cho phép: ${EQUIPMENT_STATUSES.join(', ')}`;

export function list({ status, storeId, availableOnly }) {
  return equipmentRepository.findAll({
    status: clean(status),
    storeId: clean(storeId),
    availableOnly: String(availableOnly).toLowerCase() === 'true',
  });
}

export async function getById(id) {
  const equipment = await equipmentRepository.findById(id);
  if (!equipment) throw AppError.notFound(NOT_FOUND);
  return equipment;
}

export async function create(input) {
  const equipmentId = clean(input.equipmentId);
  const deviceModel = clean(input.deviceModel);
  const deviceType = clean(input.deviceType);
  let vendorId = clean(input.vendorId);
  const status = normalizeStatus(input.status ?? EquipmentStatuses.InStock);

  if (!equipmentId || !deviceModel || !deviceType || !vendorId) {
    throw AppError.badRequest('EquipmentId, DeviceModel, DeviceType và VendorId không được để trống');
  }
  if (!status) throw AppError.badRequest(INVALID_STATUS);
  if (await equipmentRepository.exists(equipmentId)) throw AppError.conflict('EquipmentId đã tồn tại');

  const serialNumber = clean(input.serialNumber);
  const macAddress = clean(input.macAddress);
  if (!serialNumber || !macAddress) throw AppError.badRequest('SerialNumber và MacAddress không được để trống');
  if (await equipmentRepository.serialTaken(serialNumber)) throw AppError.conflict('Serial number đã tồn tại');
  if (await equipmentRepository.macTaken(macAddress)) throw AppError.conflict('Địa chỉ MAC đã tồn tại');

  // Nhà cung cấp không có thật thì gán tạm nhà cung cấp đầu tiên (giống bản ASP.NET).
  if (!(await inventoryRepository.vendorExists(vendorId))) {
    vendorId = (await inventoryRepository.firstVendorId()) ?? 'vnd-02';
  }

  const inventoryId = clean(input.inventoryId);
  if (inventoryId && !(await inventoryRepository.exists(inventoryId))) {
    throw AppError.badRequest('Mặt hàng tồn kho không tồn tại');
  }

  const storeId = clean(input.storeId);
  if (storeId && !(await retailStoreRepository.exists(storeId))) {
    throw AppError.badRequest('Cửa hàng không tồn tại');
  }

  await equipmentRepository.insert({
    equipmentId,
    inventoryId,
    serialNumber,
    macAddress,
    deviceModel,
    deviceType,
    vendorId,
    storeId,
    status,
    firmwareVersion: clean(input.firmwareVersion),
  });

  return { message: 'Tạo thiết bị thành công', equipmentId, status };
}

/** Sửa thông tin thiết bị; field không gửi thì giữ nguyên. */
export async function update(id, input) {
  const equipment = await equipmentRepository.findRawById(id);
  if (!equipment) throw AppError.notFound(NOT_FOUND);

  const serialNumber = clean(input.serialNumber);
  if (serialNumber && (await equipmentRepository.serialTaken(serialNumber, id))) {
    throw AppError.conflict('Serial number đã tồn tại');
  }

  const macAddress = clean(input.macAddress);
  if (macAddress && (await equipmentRepository.macTaken(macAddress, id))) {
    throw AppError.conflict('Địa chỉ MAC đã tồn tại');
  }

  const storeId = clean(input.storeId);
  if (storeId && !(await retailStoreRepository.exists(storeId))) {
    throw AppError.badRequest('Cửa hàng không tồn tại');
  }

  const technicianId = clean(input.assignedTechnicianId);
  if (technicianId && !(await employeeRepository.existsActive(technicianId))) {
    throw AppError.badRequest('Kỹ thuật viên không tồn tại hoặc đã ngừng hoạt động');
  }

  const assignedAccountId = clean(input.assignedAccountId);
  if (assignedAccountId && assignedAccountId !== equipment.assignedAccountId) {
    throw AppError.badRequest('Hãy dùng API cấp kết nối để gán thiết bị cho tài khoản');
  }

  const hasStatus = input.status !== undefined && input.status !== null;
  const status = hasStatus ? normalizeStatus(input.status) : null;
  if (hasStatus && !status) throw AppError.badRequest(INVALID_STATUS);
  if (equipment.connectionAccountId && status && status !== EquipmentStatuses.InService) {
    throw AppError.conflict('Thiết bị đang phục vụ một kết nối, không thể đổi sang trạng thái này');
  }

  const changes = {};
  if (serialNumber) changes.serialNumber = serialNumber;
  if (macAddress) changes.macAddress = macAddress;
  if (clean(input.deviceModel)) changes.deviceModel = clean(input.deviceModel);
  if (clean(input.deviceType)) changes.deviceType = clean(input.deviceType);
  if (storeId) changes.storeId = storeId;
  if (status) changes.status = status;
  if (clean(input.firmwareVersion)) changes.firmwareVersion = clean(input.firmwareVersion);
  if (technicianId) changes.assignedTechnicianId = technicianId;
  if (input.installedDate) changes.installedDate = new Date(input.installedDate);

  await equipmentRepository.update(id, changes);
  return { message: 'Cập nhật thiết bị thành công', equipmentId: id, status: status ?? equipment.status };
}

/**
 * Xoá thiết bị khỏi kho. Chặn xoá nếu thiết bị đang lắp cho khách (đã gán tài khoản
 * hoặc đang In Service) để không mất dấu vết lắp đặt.
 */
export async function remove(id) {
  const equipment = await equipmentRepository.findRawById(id);
  if (!equipment) throw AppError.notFound(NOT_FOUND);

  if (equipment.connectionAccountId || equipment.assignedAccountId?.trim()) {
    throw AppError.conflict(
      'Thiết bị đang được cấp cho một kết nối của khách hàng nên không thể xoá. Hãy thu hồi thiết bị trước.'
    );
  }
  if (equipment.status.toLowerCase() === EquipmentStatuses.InService.toLowerCase()) {
    throw AppError.conflict('Thiết bị đang ở trạng thái In Service nên không thể xoá.');
  }

  await equipmentRepository.remove(id);
}

function normalizeStatus(value) {
  const target = String(value ?? '').trim().toLowerCase();
  return EQUIPMENT_STATUSES.find((status) => status.toLowerCase() === target) ?? null;
}
