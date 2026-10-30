// Cổng khách hàng (spec: khách xem hoá đơn + sửa thông tin liên hệ của mình).
// subject trong JWT là CustomerID (đăng nhập mật khẩu / đăng ký) HOẶC Account ID (đăng nhập OTP),
// cả hai đều phải phân giải về đúng khách.
import * as billRepository from '../repositories/bill.repository.js';
import * as connectionRepository from '../repositories/connection.repository.js';
import * as customerRepository from '../repositories/customer.repository.js';
import * as feedbackRepository from '../repositories/feedback.repository.js';
import * as orderRepository from '../repositories/order.repository.js';
import { AppError } from '../utils/AppError.js';
import { normalizeAccountId } from '../utils/accountId.js';
import { formatDateOnly } from '../utils/dates.js';
import { buildInvoiceDescription } from './billing.service.js';
import * as orderService from './order.service.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Kết nối của khách đang đăng nhập; khách chưa có đơn nào thì trả mảng rỗng. */
export async function myConnections(subject) {
  const customer = await resolveCustomer(subject);
  return customer ? connectionRepository.findAll({ customerId: customer.customerId }) : [];
}

/** Đơn đăng ký dịch vụ của khách đang đăng nhập. */
export async function myOrders(subject) {
  const customer = await resolveCustomer(subject);
  return customer ? orderService.listForCustomer(customer.customerId) : [];
}

/** Phản hồi khách đã gửi (kèm câu trả lời của Quản trị), theo mã khách và mọi mã tài khoản của khách. */
export async function myFeedback(subject) {
  const customer = await resolveCustomer(subject);
  const customerId = customer?.customerId ?? null;
  const accountIds = customerId ? await orderRepository.accountIdsForCustomer(customerId) : [];
  const forms = [...new Set([...accountIdForms(subject), ...accountIds.flatMap(accountIdForms)])];
  return feedbackRepository.findByAccountsOrCustomer(forms, customerId);
}

export async function myBills(subject) {
  const bills = await billRepository.findForCustomer(subject, accountIdForms(subject));
  const payments = await billRepository.findPayments(bills.map((b) => b.billId));
  const byBill = Map.groupBy(payments, (p) => p.billId);

  return bills.map((b) => ({
    billId: b.billId,
    invoiceNumber: b.invoiceNumber,
    description: buildInvoiceDescription(b.planName, b.billingMonth, b.hourlyCharges, b.securityDeposit, b.lateFeeAmount),
    accountId: b.accountId,
    customerName: b.customerName,
    billingMonth: b.billingMonth,
    billingDate: formatDateOnly(b.billingDate),
    dueDate: formatDateOnly(b.dueDate),
    securityDeposit: b.securityDeposit,
    monthlyRental: b.monthlyRental,
    hourlyCharges: b.hourlyCharges,
    discountPercent: b.discountPercent,
    discountAmount: b.discountAmount,
    subtotal: b.subtotal,
    serviceTaxRate: b.serviceTaxRate,
    serviceTaxAmount: b.serviceTaxAmount,
    lateFeeAmount: b.lateFeeAmount,
    totalAmount: b.totalAmount,
    amountPaid: b.amountPaid,
    dueAmount: b.dueAmount,
    status: b.status,
    generatedDate: b.generatedDate,
    payments: (byBill.get(b.billId) ?? []).map((p) => ({
      paymentId: p.paymentId,
      receiptNumber: p.receiptNumber,
      amountPaid: p.amountPaid,
      paymentDate: p.paymentDate,
      paymentMode: p.paymentMode,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
    })),
  }));
}

export async function updateProfile(subject, input) {
  const customer = await resolveCustomer(subject);
  if (!customer) throw AppError.notFound('Không tìm thấy hồ sơ khách hàng của bạn.');

  const fullName = input.fullName?.trim() ?? '';
  if (!fullName) throw AppError.badRequest('Họ và tên không được để trống.');

  const email = input.email?.trim().toLowerCase() || null;
  if (email) {
    if (!EMAIL_PATTERN.test(email)) throw AppError.badRequest('Email không hợp lệ.');
    if (await customerRepository.emailTakenByOther(email, customer.customerId)) {
      throw AppError.conflict('Email này đã được sử dụng.');
    }
  }

  const phone = input.contactNumber?.trim() || null;
  if (phone) {
    if (!/^\d{10}$/.test(phone)) throw AppError.badRequest('Số điện thoại phải gồm đúng 10 chữ số.');
    if (await customerRepository.phoneTakenByOther(phone, customer.customerId)) {
      throw AppError.conflict('Số điện thoại này đã được sử dụng.');
    }
  }

  await customerRepository.updateContact(customer.customerId, {
    fullName,
    email,
    contactNumber: phone,
    // Gửi chuỗi rỗng là xoá địa chỉ; không gửi field thì giữ nguyên.
    address: typeof input.address === 'string' ? input.address.trim() : null,
  });

  const updated = await customerRepository.findById(customer.customerId);
  return {
    id: updated.customerId,
    name: updated.fullName,
    email: updated.email ?? '',
    phoneNumber: updated.contactNumber,
    address: updated.address,
  };
}

/** Thử CustomerID trước, không có thì coi subject là Account ID. */
export async function resolveCustomer(subject) {
  const customer = await customerRepository.findById(subject);
  if (customer) return customer;
  return customerRepository.findByAccountIds([subject, ...accountIdForms(subject)]);
}

/**
 * Account ID tồn tại ở hai dạng "T064-000000000001" và "T064000000000001". Dạng có gạch chỉ
 * có nghĩa khi chuỗi 16 ký tự bắt đầu bằng D/B/T; CustomerID (CUSxxxxxx) không bị biến dạng.
 */
function accountIdForms(value) {
  const key = normalizeAccountId(value);
  const forms = [value, key];
  if (key.length === 16 && 'DBT'.includes(key[0])) forms.push(`${key.slice(0, 4)}-${key.slice(4)}`);
  return [...new Set(forms)];
}
