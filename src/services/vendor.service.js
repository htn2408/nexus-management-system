// Quản lý nhà cung cấp thiết bị (tab Vendor Management của Admin).
import * as vendorRepository from '../repositories/vendor.repository.js';
import { AppError } from '../utils/AppError.js';
import { dotnetTicks } from '../utils/ids.js';
import { isAllFilter } from '../utils/sqlFilters.js';
import { toNumber } from '../validators/helpers.js';

export async function list({ search, category, status }) {
  const vendors = await vendorRepository.findAll({
    search: search?.trim() || null,
    category: isAllFilter(category, 'All Categories') ? null : category.trim(),
    status: isAllFilter(status) ? null : status.trim(),
  });
  return vendors.map(toDto);
}

export function stats() {
  return vendorRepository.countStats();
}

export async function getById(id) {
  const vendor = await vendorRepository.findByIdOrCode(id);
  if (!vendor) throw AppError.notFound(`Không tìm thấy nhà cung cấp với mã: ${id}`);
  return toDto(vendor);
}

export async function create(input) {
  const vendorId = input.vendorId ?? `vnd-${dotnetTicks().slice(10)}`;
  await vendorRepository.insert({
    vendorId,
    vendorCode: input.vendorCode ?? vendorId.toUpperCase(),
    category: input.category ?? 'Hardware',
    ...editableFields(input),
  });
  return toDto(await vendorRepository.findById(vendorId));
}

export async function update(id, input) {
  const existing = await vendorRepository.findByIdOrCode(id);
  if (!existing) throw AppError.notFound(`Không tìm thấy nhà cung cấp với mã: ${id}`);

  await vendorRepository.update(existing.vendorId, {
    vendorCode: input.vendorCode ?? existing.vendorCode,
    category: input.category ?? existing.category,
    ...editableFields(input),
  });
  return toDto(await vendorRepository.findById(existing.vendorId));
}

export async function remove(id) {
  const deleted = await vendorRepository.remove(id);
  if (deleted === 0) throw AppError.notFound(`Không tìm thấy đối tác với ID = ${id}`);
  return { message: `Đã xóa đối tác ${id} thành công` };
}

/** Các field client gửi lên được ghi đè nguyên trạng (thiếu ⇒ NULL / mặc định như bản ASP.NET). */
function editableFields(input) {
  return {
    companyName: input.companyName,
    contactPerson: input.contactPerson ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    rating: toNumber(input.rating) ?? 5,
    status: input.status ?? 'Active',
  };
}

/** Trả cả category/supplyCategory và address/facilityAddress vì frontend dùng cả hai tên. */
function toDto(v) {
  return {
    id: v.vendorId,
    vendorId: v.vendorId,
    vendorCode: v.vendorCode,
    companyName: v.companyName,
    contactPerson: v.contactPerson ?? '',
    category: v.category,
    supplyCategory: v.category,
    phone: v.phone ?? '',
    email: v.email ?? '',
    address: v.address ?? '',
    facilityAddress: v.address ?? '',
    status: v.status,
    taxNumber: v.taxNumber,
    rating: v.rating,
    totalSuppliedItemsCount: v.totalSuppliedItemsCount,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}
