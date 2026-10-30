// Quản lý nhân viên (tab Employee Management của Admin). Chỉ admin quản lý nhân viên (theo spec).
import bcrypt from 'bcryptjs';
import { Roles } from '../constants/roles.js';
import { EmployeeStatuses } from '../constants/statuses.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import { AppError } from '../utils/AppError.js';
import { formatDateOnly, parseDateOnly, todayDateOnly } from '../utils/dates.js';
import { isAllFilter } from '../utils/sqlFilters.js';

const BCRYPT_ROUNDS = 10;
// Admin không nhập mật khẩu khi tạo nhân viên ⇒ dùng mật khẩu demo thống nhất.
const DEFAULT_PASSWORD = '1234567890';

export async function list({ search, role, department, status, storeId }) {
  const employees = await employeeRepository.findAll({
    search: search?.trim() || null,
    ...filters({ role, department, status, storeId }),
  });
  return employees.map(toDto);
}

// Vai trò có mặt trong danh bạ của quầy bán lẻ.
const BRANCH_DIRECTORY_ROLES = new Set([Roles.RetailStaff, Roles.FieldEngineer]);

/**
 * Danh bạ cho quầy bán lẻ: nhân viên bán lẻ (biết chi nhánh nào có người trực) và kỹ thuật viên
 * (chọn người khảo sát), chỉ người đang làm việc và chỉ thông tin liên hệ.
 */
export async function branchDirectory() {
  const employees = await employeeRepository.findAll({ status: EmployeeStatuses.Active });
  return employees.filter((e) => BRANCH_DIRECTORY_ROLES.has(e.role)).map((e) => ({
    employeeId: e.employeeId,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    email: e.email,
    phone: e.phone,
    role: e.role,
    storeId: e.storeId,
    storeName: e.storeName,
    status: e.status,
  }));
}

export async function searchByKeyword(keyword) {
  const employees = await employeeRepository.findAll({ search: keyword?.trim() || null });
  return employees.map(toDto);
}

export async function filter(query) {
  const employees = await employeeRepository.findAll(filters(query));
  return employees.map(toDto);
}

export async function getById(id) {
  const employee = await employeeRepository.findByIdOrCode(id);
  if (!employee) throw AppError.notFound(`Không tìm thấy nhân viên với mã: ${id}`);
  return toDto(employee);
}

export async function create(input) {
  const email = input.email.trim();
  if (await employeeRepository.emailTaken(email)) {
    throw AppError.conflict('Email này đã được sử dụng trong hệ thống.');
  }

  // emp-NN theo số thứ tự; trùng (do đã xoá/sửa tay) thì dùng mốc thời gian.
  const nextNumber = (await employeeRepository.count()) + 1;
  let employeeId = `emp-${String(nextNumber).padStart(2, '0')}`;
  if (await employeeRepository.existsById(employeeId)) {
    employeeId = `emp-${utcStamp()}`;
  }

  const employeeCode = input.employeeCode?.trim()
    ? input.employeeCode.trim().toUpperCase()
    : `EMP-${1000 + nextNumber}`;

  const rawPassword = input.password?.trim() ? input.password.trim() : DEFAULT_PASSWORD;

  await employeeRepository.insert({
    employeeId,
    employeeCode,
    fullName: input.fullName.trim(),
    email,
    phone: input.phone?.trim() || null,
    passwordHash: await bcrypt.hash(rawPassword, BCRYPT_ROUNDS),
    role: (input.role ?? 'Retail Staff').trim(),
    department: (input.department ?? 'Retail Outlets').trim(),
    storeId: await resolveStoreId(input),
    status: (input.status ?? 'Active').trim(),
    dateOfJoining: parseDateOnly(input.dateOfJoining) ?? todayDateOnly(),
  });

  return toDto(await employeeRepository.findById(employeeId));
}

export async function update(id, input) {
  const employee = await employeeRepository.findByIdOrCode(id);
  if (!employee) throw AppError.notFound(`Không tìm thấy nhân viên với mã: ${id}`);

  const email = input.email.trim();
  // Đổi email thì kiểm tra trùng với tài khoản khác.
  if (employee.email.toLowerCase() !== email.toLowerCase()) {
    if (await employeeRepository.emailTaken(email, employee.employeeId)) {
      throw AppError.conflict('Email này đã được sử dụng bởi một tài khoản khác trong hệ thống.');
    }
  }

  // Không gửi storeId / retailShopAssigned thì giữ nguyên chi nhánh cũ.
  const storeId = (await resolveStoreId(input)) ?? employee.storeId;
  const password = input.password?.trim();

  await employeeRepository.update(employee.employeeId, {
    email: employee.email.toLowerCase() === email.toLowerCase() ? employee.email : email,
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() || null,
    role: input.role.trim(),
    department: input.department.trim(),
    status: (input.status ?? 'Active').trim(),
    storeId,
    dateOfJoining: parseDateOnly(input.dateOfJoining),
    passwordHash: password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null,
  });

  return toDto(await employeeRepository.findById(employee.employeeId));
}

/** Không xoá hẳn để giữ toàn vẹn dữ liệu (đơn hàng, thanh toán đã ghi tên nhân viên). */
export async function deactivate(id) {
  const employee = await employeeRepository.findByIdOrCode(id);
  if (!employee) throw AppError.notFound(`Không tìm thấy nhân viên với mã: ${id}`);

  await employeeRepository.setStatus(employee.employeeId, 'Inactive');
  return { message: `Đã chuyển trạng thái nhân viên ${employee.fullName} sang Inactive thành công.` };
}

// ==================== Helpers ====================

function filters({ role, department, status, storeId }) {
  return {
    role: isAllFilter(role, 'All Roles') ? null : role.trim(),
    department: isAllFilter(department, 'All Departments') ? null : department.trim(),
    status: isAllFilter(status) ? null : status.trim(),
    storeId: isAllFilter(storeId) ? null : storeId,
  };
}

/** storeId gửi thẳng, hoặc suy ra từ chuỗi hiển thị "Tên cửa hàng (SH-01)". */
async function resolveStoreId(input) {
  if (input.storeId?.trim()) return input.storeId.trim();
  if (input.retailShopAssigned?.trim()) {
    return employeeRepository.findStoreIdMentionedIn(input.retailShopAssigned);
  }
  return null;
}

/** yyMMddHHmmss theo UTC. */
function utcStamp(date = new Date()) {
  return date.toISOString().replace(/[-:T]/g, '').slice(2, 14);
}

function toDto(e) {
  const assignedShop = e.storeId && e.storeName ? `${e.storeName} (${e.storeId})` : (e.storeName ?? e.storeId ?? 'Headquarters');

  return {
    id: e.employeeId,
    employeeId: e.employeeId,
    employeeCode: e.employeeCode,
    // Trả cả name và fullName để frontend gọi kiểu nào cũng có dữ liệu.
    name: e.fullName,
    fullName: e.fullName,
    email: e.email,
    phone: e.phone ?? '',
    role: e.role,
    department: e.department,
    retailShopAssigned: assignedShop,
    storeId: e.storeId,
    storeName: e.storeName,
    status: e.status ?? EmployeeStatuses.Active,
    dateOfJoining: formatDateOnly(e.dateOfJoining),
    avatarUrl: e.avatarUrl,
    address: e.address,
    gender: e.gender,
    dateOfBirth: formatDateOnly(e.dateOfBirth),
    bio: e.bio,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}
