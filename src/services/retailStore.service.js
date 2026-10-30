// Quản lý cửa hàng bán lẻ / chi nhánh (tab Retail Shops của Admin).
import * as retailStoreRepository from '../repositories/retailStore.repository.js';
import { AppError } from '../utils/AppError.js';
import { dotnetTicks } from '../utils/ids.js';
import { isAllFilter } from '../utils/sqlFilters.js';
import { toNumber } from '../validators/helpers.js';

export async function list({ search, city, status }) {
  const stores = await retailStoreRepository.findAll({
    search: search?.trim() || null,
    city: isAllFilter(city, 'All Cities') ? null : city.trim(),
    status: isAllFilter(status) ? null : status.trim(),
  });
  return stores.map(toDto);
}

export async function stats() {
  const stores = await retailStoreRepository.findAll();
  const cities = new Set(stores.map((s) => s.city.toLowerCase()));

  return {
    totalShops: stores.length,
    activeShopsCount: stores.filter((s) => s.status.toLowerCase() === 'active').length,
    totalOnDutyEmployees: stores.reduce((sum, s) => sum + onDutyCount(s), 0),
    totalSubscribersServed: stores.reduce((sum, s) => sum + s.totalSubscribersServed, 0),
    totalCitiesCovered: cities.size,
  };
}

export async function getById(id) {
  const store = await retailStoreRepository.findById(id);
  if (!store) throw AppError.notFound(`Không tìm thấy điểm bán lẻ với mã: ${id}`);
  return toDto(store);
}

export async function create(input) {
  const storeId = input.storeId ?? `sh-${dotnetTicks().slice(10)}`;
  await retailStoreRepository.insert({ storeId, ...normalize(input) });
  return toDto(await retailStoreRepository.findById(storeId));
}

export async function update(id, input) {
  if (!(await retailStoreRepository.exists(id))) {
    throw AppError.notFound(`Không tìm thấy điểm bán lẻ với mã: ${id}`);
  }
  await retailStoreRepository.update(id, normalize(input));
  return toDto(await retailStoreRepository.findById(id));
}

export async function remove(id) {
  const deleted = await retailStoreRepository.remove(id);
  if (deleted === 0) throw AppError.notFound(`Không tìm thấy cửa hàng với ID = ${id}`);
  return { message: `Đã xóa cửa hàng ${id} thành công` };
}

function normalize(input) {
  return {
    name: input.name,
    city: input.city,
    cityCode: input.cityCode ?? '999',
    address: input.address,
    phone: input.phone ?? null,
    email: input.email ?? null,
    managerName: input.managerName ?? null,
    operatingHours: input.operatingHours ?? null,
    activeEmployeesCount: toNumber(input.activeEmployeesCount) ?? 0,
    totalSubscribersServed: toNumber(input.totalSubscribersServed) ?? 0,
    status: input.status ?? 'Active',
  };
}

/** Có nhân viên gắn với cửa hàng thì đếm người đang Active, chưa có thì dùng số nhập tay. */
function onDutyCount(store) {
  return store.employeeTotal > 0 ? store.employeeActive : store.activeEmployeesCount;
}

/** Trả cả id/storeId/shopCode vì các màn hình frontend dùng lẫn lộn. */
function toDto(s) {
  const onDuty = onDutyCount(s);
  return {
    id: s.storeId,
    storeId: s.storeId,
    shopCode: s.storeId,
    name: s.name,
    city: s.city,
    cityCode: s.cityCode,
    regionSubtitle: `${s.city} Regional Center · City Code: ${s.cityCode}`,
    address: s.address,
    phone: s.phone ?? '',
    managerName: s.managerName?.trim() ? s.managerName : 'Not Assigned',
    activeEmployeesCount: onDuty,
    onDutyEmployees: onDuty,
    totalSubscribersServed: s.totalSubscribersServed,
    totalSubscribers: s.totalSubscribersServed,
    email: s.email,
    operatingHours: s.operatingHours,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
