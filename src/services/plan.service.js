// Quản lý gói cước viễn thông (tab Plan Management của Admin).
import * as planRepository from '../repositories/plan.repository.js';
import { AppError } from '../utils/AppError.js';
import { dotnetTicks } from '../utils/ids.js';
import { isAllFilter } from '../utils/sqlFilters.js';
import { toNumber } from '../validators/helpers.js';

export async function list({ search, type, connectionType, status }) {
  const selectedType = type?.trim() ? type : connectionType;
  const plans = await planRepository.findAll({
    search: search?.trim() || null,
    connectionType: isAllFilter(selectedType, 'All Plans') ? null : selectedType.trim(),
    status: isAllFilter(status) ? null : status.trim(),
  });
  return plans.map(toDto);
}

/** Danh sách gói của một loại kết nối (Landline / Broadband / Dial-Up), rẻ trước. */
export async function listByType(connectionType, search) {
  const plans = await planRepository.findAll(
    { search: search?.trim() || null, connectionType },
    'MonthlyRental'
  );
  return plans.map(toDto);
}

export async function stats() {
  const row = await planRepository.countStats();
  // SUM trên bảng rỗng trả về NULL.
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ?? 0]));
}

export async function getById(id) {
  const plan = await planRepository.findByIdOrCode(id);
  if (!plan) throw AppError.notFound(`Không tìm thấy gói cước với mã: ${id}`);
  return toDto(plan);
}

export async function create(input) {
  const values = normalize(input);
  const planId = input.planId ?? `plan-${dotnetTicks().slice(8)}`;
  const planCode = input.planId ? input.planId.toUpperCase() : null;

  await planRepository.insert({ ...values, planId, planCode });
  return toDto(await planRepository.findById(planId));
}

export async function update(id, input) {
  const existing = await planRepository.findByIdOrCode(id);
  if (!existing) throw AppError.notFound(`Không tìm thấy gói cước với mã: ${id}`);

  await planRepository.update(existing.planId, normalize(input));
  return toDto(await planRepository.findById(existing.planId));
}

export async function remove(id) {
  const deleted = await planRepository.remove(id);
  if (deleted === 0) throw AppError.notFound(`Không tìm thấy gói cước với ID = ${id}`);
  return { message: `Đã xóa gói cước ${id} thành công` };
}

/** Giá trị mặc định giống CreatePlanRequest của bản ASP.NET khi client không gửi field. */
function normalize(input) {
  return {
    name: input.name,
    connectionType: input.connectionType ?? 'Broadband',
    speedOrBandwidth: input.speedOrBandwidth ?? '64 Kbps',
    monthlyRental: toNumber(input.monthlyRental) ?? 0,
    securityDeposit: toNumber(input.securityDeposit) ?? 0,
    billingCycle: input.billingCycle ?? 'Monthly',
    validity: input.validity ?? null,
    dataLimit: input.dataLimit ?? null,
    status: input.status ?? 'Active',
    includedHours: toNumber(input.includedHours) ?? 0,
    hourlyCharge: toNumber(input.hourlyCharge) ?? 0,
    description: input.description ?? null,
    callRates: input.callRates ?? null,
    isPopular: Boolean(input.isPopular),
  };
}

/** Trả cả id/planId và type/connectionType vì các màn hình frontend dùng lẫn lộn hai tên. */
function toDto(p) {
  return {
    id: p.planId,
    planId: p.planId,
    planCode: p.planCode,
    name: p.name,
    billingCycle: p.billingCycle,
    validity: p.validity,
    description: p.description,
    type: p.connectionType,
    connectionType: p.connectionType,
    speedOrBandwidth: p.speedOrBandwidth,
    securityDeposit: p.securityDeposit,
    monthlyRental: p.monthlyRental,
    hourlyCharge: p.hourlyCharge > 0 ? p.hourlyCharge : null,
    dataLimit: p.dataLimit ?? 'Unlimited',
    status: p.status,
    includedHours: p.includedHours,
    callRates: p.callRates,
    isPopular: p.isPopular,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
