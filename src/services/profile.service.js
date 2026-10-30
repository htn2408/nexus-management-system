// Hồ sơ cá nhân của người đang đăng nhập (nhân viên hoặc khách): sửa thông tin, đổi mật khẩu.
import bcrypt from 'bcryptjs';
import { Roles } from '../constants/roles.js';
import * as customerRepository from '../repositories/customer.repository.js';
import * as employeeRepository from '../repositories/employee.repository.js';
import { AppError } from '../utils/AppError.js';
import { formatDateOnly } from '../utils/dates.js';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

function nonEmpty(value) {
  return typeof value === 'string' && value !== '' ? value : null;
}

export async function updateProfile(user, input) {
  if (user.role === Roles.Customer) {
    const customer = await customerRepository.findById(user.id);
    if (!customer) throw AppError.notFound('Customer not found.');

    await customerRepository.updateContact(customer.customerId, {
      fullName: nonEmpty(input.name),
      email: nonEmpty(input.email),
      contactNumber: nonEmpty(input.phoneNumber),
      address: nonEmpty(input.address),
    });
    const updated = await customerRepository.findById(customer.customerId);
    return { message: 'Customer profile updated successfully.', customer: withoutPassword(updated) };
  }

  const employee = await employeeRepository.findProfileById(user.id);
  if (!employee) throw AppError.notFound('Employee not found.');

  await employeeRepository.updateContact(employee.employeeId, {
    fullName: nonEmpty(input.name),
    email: nonEmpty(input.email),
    phone: nonEmpty(input.phoneNumber),
  });
  const updated = await employeeRepository.findProfileById(employee.employeeId);
  return {
    message: 'Employee profile updated successfully.',
    employee: {
      ...withoutPassword(updated),
      dateOfJoining: formatDateOnly(updated.dateOfJoining),
      dateOfBirth: formatDateOnly(updated.dateOfBirth),
    },
  };
}

export async function changePassword(user, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) throw AppError.badRequest('Vui lòng nhập mật khẩu cũ và mới.');
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw AppError.badRequest(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
  }

  const isCustomer = user.role === Roles.Customer;
  const account = isCustomer
    ? await customerRepository.findById(user.id)
    : await employeeRepository.findProfileById(user.id);
  if (!account) throw AppError.notFound(isCustomer ? 'Customer not found.' : 'Employee not found.');

  // Khách tạo tại quầy có thể chưa có mật khẩu (PasswordHash NULL) ⇒ coi như sai mật khẩu.
  if (!account.passwordHash || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
    throw AppError.badRequest('Mật khẩu hiện tại không chính xác.');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  if (isCustomer) await customerRepository.updatePasswordHash(user.id, passwordHash);
  else await employeeRepository.updatePasswordHash(user.id, passwordHash);

  console.log(`[audit] ${isCustomer ? 'Khách hàng' : 'Nhân viên'} ${user.id} đã đổi mật khẩu lúc ${new Date().toISOString()}.`);
  return { message: 'Đổi mật khẩu thành công.' };
}

/** Không bao giờ trả hash mật khẩu ra ngoài (bản ASP.NET trả nguyên entity, lộ PasswordHash). */
function withoutPassword(record) {
  const { passwordHash, ...rest } = record;
  return rest;
}
