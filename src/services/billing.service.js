// Hoá đơn cước và thanh toán (Accounts department theo spec): lập hoá đơn, sửa chi tiết
// hoá đơn, ghi nhận thanh toán tại văn phòng / cửa hàng / khách tự trả online.
//
// Server LUÔN tự tính các tổng từ các khoản mục, không tin subtotal / thuế / tổng client gửi.
import { withTransaction } from '../config/database.js';
import { isDepositWaived } from '../constants/bulkDiscounts.js';
import * as billRepository from '../repositories/bill.repository.js';
import * as systemSettingRepository from '../repositories/systemSetting.repository.js';
import { AppError } from '../utils/AppError.js';
import { formatAccountId, normalizeAccountId } from '../utils/accountId.js';
import { formatDateOnly, localDateOnly, parseDateOnly } from '../utils/dates.js';
import { dotnetTicks } from '../utils/ids.js';
import { Decimal, dec, roundCurrency, toMoney } from '../utils/money.js';
import * as emailService from './email.service.js';
import * as notificationEvents from './notificationEvents.js';
import * as notificationService from './notification.service.js';
import * as systemSettingService from './systemSetting.service.js';

const DEFAULT_TAX_RATE = 12.24;
// Khoá trong bảng SystemSettings mà phòng kế toán được đổi.
const TAX_RATE_KEY = 'ServiceTaxRate';
const LATE_FEE_KEY = 'LatePaymentFeePercent';
const DEFAULT_DUE_DAYS = 20;
const DEFAULT_PAYMENT_MODE = 'Bank Transfer/NEFT';
// Còn nợ dưới mức này coi như đã trả đủ (sai số làm tròn).
const PAID_TOLERANCE = 0.01;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ==================== Biểu cước (thuế suất, phí trễ hạn) ====================

/** Thuế dịch vụ % và phí trễ hạn % đang áp dụng, đọc từ bảng SystemSettings. */
export async function billingSettings() {
  const [taxRate, lateFee] = await Promise.all([
    systemSettingRepository.getValue(TAX_RATE_KEY),
    systemSettingRepository.getValue(LATE_FEE_KEY),
  ]);
  return {
    serviceTaxRate: taxRate === null ? DEFAULT_TAX_RATE : Number(taxRate),
    latePaymentFeePercent: lateFee === null ? 0 : Number(lateFee),
  };
}

/** Phòng kế toán đổi biểu cước; hoá đơn lập sau đó dùng thuế suất mới, hoá đơn cũ giữ nguyên. */
export async function updateBillingSettings(input) {
  const setting = (key, value, description) =>
    systemSettingService.upsert(key, { settingValue: String(Number(value)), category: 'Billing', dataType: 'number', description });
  await setting(TAX_RATE_KEY, input.serviceTaxRate, 'Service tax rate applied to new invoices (%)');
  await setting(LATE_FEE_KEY, input.latePaymentFeePercent, 'Late payment surcharge applied after the due date (%)');
  return billingSettings();
}

// ==================== Đọc ====================

export async function list() {
  return withPayments(await billRepository.findAll());
}

export async function getById(key) {
  const bill = await billRepository.findByIdOrInvoice(key.trim());
  if (!bill) return null;
  return (await withPayments([bill]))[0];
}

// ==================== Lập hoá đơn ====================

export async function create(input) {
  const accountIdInput = input.accountId?.trim() ?? '';
  const connection = await resolveBillingConnection(accountIdInput);
  const accountId = connection?.accountId ?? accountIdInput;

  // Số hoá đơn duy nhất NEX-INV-<năm>-<số thứ tự>; trùng thì thêm phút-giây cho khỏi đụng.
  const count = await billRepository.count();
  const now = new Date();
  let invoiceNumber = input.invoiceNumber?.trim()
    ? input.invoiceNumber.trim()
    : `NEX-INV-${now.getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  if (await billRepository.invoiceExists(invoiceNumber)) {
    const pad = (n) => String(n).padStart(2, '0');
    invoiceNumber = `NEX-INV-${now.getFullYear()}-${String(count + 1).padStart(3, '0')}-${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }

  // Cọc chỉ thu một lần, ở hoá đơn đầu tiên của kết nối. Client không gửi thì: hoá đơn đầu lấy
  // theo gói cước (325 / 500 / 250), các kỳ sau là 0. Gửi số cụ thể (kể cả 0) thì dùng đúng số đó.
  let securityDeposit;
  if (input.securityDeposit === undefined || input.securityDeposit === null || input.securityDeposit === '') {
    const isFirstBill = (await billRepository.findByAccounts(accountIdForms(accountId))).length === 0;
    securityDeposit = isFirstBill ? dec(connection?.planSecurityDeposit) : dec(0);
  } else {
    securityDeposit = Decimal.max(0, dec(input.securityDeposit));
  }
  // Đơn trên 50 kết nối được miễn cọc: ghi 0 thẳng vào hoá đơn, kể cả khi client gửi số cọc gốc.
  if (connection && isDepositWaived(connection.bulkConnectionsCount)) securityDeposit = dec(0);

  const monthlyRental = dec(input.monthlyRental);
  const hourlyCharges = dec(input.hourlyCharges);
  const discountPercent = dec(input.discountPercent);

  // Chiết khấu áp lên cọc + cước ứng trước (advance) theo spec bulk, không áp lên cước theo giờ.
  let discountAmount = dec(input.discountAmount);
  if (discountAmount.lte(0) && discountPercent.gt(0)) {
    discountAmount = roundCurrency(securityDeposit.plus(monthlyRental).times(discountPercent).div(100));
  }

  // Thuế suất theo biểu cước của phòng kế toán (SystemSettings), trừ khi gửi rõ thuế suất khác.
  const taxRate = dec(input.serviceTaxRate).gt(0)
    ? dec(input.serviceTaxRate)
    : dec((await billingSettings()).serviceTaxRate);
  const totals = computeTotals({ securityDeposit, monthlyRental, hourlyCharges, discountAmount, taxRate, lateFee: dec(0) });

  const billId = `bill-${dotnetTicks()}`;
  await billRepository.insert({
    billId,
    invoiceNumber,
    accountId,
    billingMonth: input.billingMonth?.trim() ? input.billingMonth.trim() : `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
    billingDate: localDateOnly(),
    dueDate: parseDateOnly(input.dueDate) ?? localDateOnly(DEFAULT_DUE_DAYS),
    securityDeposit: toMoney(securityDeposit),
    monthlyRental: toMoney(monthlyRental),
    hourlyCharges: toMoney(hourlyCharges),
    discountPercent: toMoney(discountPercent),
    discountAmount: toMoney(discountAmount),
    subtotal: toMoney(totals.subtotal),
    serviceTaxRate: toMoney(taxRate),
    serviceTaxAmount: toMoney(totals.taxAmount),
    lateFeeAmount: 0,
    totalAmount: toMoney(totals.total),
    amountPaid: 0,
    dueAmount: toMoney(totals.total),
    status: 'Unpaid',
  });

  const bill = await getById(billId);
  await notificationEvents.billCreated(invoiceNumber, accountId, bill.customerName, bill.totalAmount);
  notificationService.notifyDataChanged('bills', invoiceNumber);
  return bill;
}

// ==================== Sửa hoá đơn ====================

/** Field nào không gửi thì giữ nguyên; các khoản tổng luôn được tính lại. Không tìm thấy ⇒ null. */
export async function update(key, input) {
  const bill = await billRepository.findByIdOrInvoice(key?.trim() ?? '');
  if (!bill) return null;

  const pick = (field) => (input[field] === undefined || input[field] === null ? dec(bill[field]) : dec(input[field]));
  const securityDeposit = pick('securityDeposit');
  const monthlyRental = pick('monthlyRental');
  const hourlyCharges = pick('hourlyCharges');
  const discountPercent = pick('discountPercent');
  const discountAmount = pick('discountAmount');
  const taxRate = pick('serviceTaxRate');
  const lateFee = pick('lateFeeAmount');

  const totals = computeTotals({ securityDeposit, monthlyRental, hourlyCharges, discountAmount, taxRate, lateFee });
  const amountPaid = dec(bill.amountPaid);
  const dueAmount = Decimal.max(0, roundCurrency(totals.total.minus(amountPaid)));

  await billRepository.update(bill.billId, {
    billingMonth: input.billingMonth?.trim() ? input.billingMonth.trim() : bill.billingMonth,
    dueDate: parseDateOnly(input.dueDate) ?? formatDateOnly(bill.dueDate),
    securityDeposit: toMoney(securityDeposit),
    monthlyRental: toMoney(monthlyRental),
    hourlyCharges: toMoney(hourlyCharges),
    discountPercent: toMoney(discountPercent),
    discountAmount: toMoney(discountAmount),
    subtotal: toMoney(totals.subtotal),
    serviceTaxRate: toMoney(taxRate),
    serviceTaxAmount: toMoney(totals.taxAmount),
    lateFeeAmount: toMoney(lateFee),
    totalAmount: toMoney(totals.total),
    amountPaid: toMoney(amountPaid),
    dueAmount: toMoney(dueAmount),
    status: settlementStatus(dueAmount, amountPaid),
  });

  return getById(bill.billId);
}

// ==================== Thanh toán ====================

/** Không tìm thấy hoá đơn ⇒ null. */
export async function recordPayment(input) {
  const amount = roundCurrency(input.amountPaid);
  const now = new Date();

  const result = await withTransaction(async (tx) => {
    const bill = await billRepository.findForPayment(
      { invoiceNumber: input.invoiceNumber?.trim() || null, billId: input.billId?.trim() || null },
      tx
    );
    if (!bill) return null;

    // Không nhận trả thừa: phần vượt quá không được ghi vào hoá đơn nào và sẽ mất.
    // Kiểm tra trong transaction (hoá đơn đang bị khoá UPDLOCK) nên hai lần trả cùng lúc không lọt được.
    const outstanding = Decimal.max(0, roundCurrency(dec(bill.totalAmount).minus(dec(bill.amountPaid))));
    if (amount.gt(outstanding.plus(PAID_TOLERANCE))) {
      throw new AppError(
        400,
        `Số tiền thanh toán (${toMoney(amount)}) vượt quá số còn nợ của hoá đơn (${toMoney(outstanding)}).`,
        { outstanding: toMoney(outstanding) }
      );
    }

    // Đếm trước khi ghi khoản mới: lần thanh toán đầu tiên của tài khoản chính là lúc
    // kế toán xác minh xong, khách mới được cấp mã đăng nhập.
    const previousPayments = await billRepository.countPaymentsForAccount(bill.accountId, tx);

    const paymentId = `PAY-${dotnetTicks().slice(10)}`;
    const payment = {
      paymentId,
      receiptNumber: `REC-${paymentId}`,
      billId: bill.billId,
      employeeId: input.employeeId ?? null,
      amountPaid: toMoney(amount),
      paymentDate: now,
      paymentMode: input.paymentMode?.trim() ? input.paymentMode.trim() : DEFAULT_PAYMENT_MODE,
      referenceNumber: input.referenceNumber?.trim() ? input.referenceNumber.trim() : `REF-${localStamp(now)}`,
      status: 'Completed',
      notes: input.notes ?? null,
    };
    await billRepository.insertPayment(payment, tx);

    const amountPaid = roundCurrency(dec(bill.amountPaid).plus(amount));
    const dueAmount = Decimal.max(0, roundCurrency(dec(bill.totalAmount).minus(amountPaid)));
    const status = dueAmount.lte(PAID_TOLERANCE) ? 'Paid' : 'Partially Paid';
    await billRepository.updateSettlement(bill.billId, { amountPaid: toMoney(amountPaid), dueAmount: toMoney(dueAmount), status }, tx);

    return { bill, payment, status, isFirstPayment: previousPayments === 0 };
  });

  if (!result) return null;
  const { bill, payment, status, isFirstPayment } = result;
  const customerName = bill.customerName?.trim() ? bill.customerName : null;

  // Kế toán đã xác minh thanh toán ⇒ gửi Mã tài khoản về email, đây là mã khách dùng để đăng nhập.
  if (bill.customerEmail?.trim()) {
    void emailService.sendAccountActivated(
      bill.customerEmail,
      customerName ?? 'Quý khách',
      bill.accountId,
      bill.invoiceNumber,
      payment.amountPaid,
      isFirstPayment
    );
  }

  await notificationEvents.paymentRecorded(
    bill.invoiceNumber,
    bill.accountId,
    customerName ?? 'Khách hàng',
    payment.amountPaid,
    status === 'Paid'
  );
  notificationService.notifyDataChanged('bills', bill.invoiceNumber);

  return toPaymentDto(payment);
}

/**
 * Khách tự trả online chỉ được trả hoá đơn của chính mình. subject trong token là CustomerID
 * (đăng nhập mật khẩu) hoặc Account ID (đăng nhập OTP).
 */
export async function customerOwnsBill(subject, { invoiceNumber, billId }) {
  const bill = await billRepository.findForPayment(
    { invoiceNumber: invoiceNumber?.trim() || null, billId: billId?.trim() || null },
    null
  );
  if (!bill) return false;

  const key = normalizeAccountId(subject);
  return (
    bill.accountId === subject ||
    normalizeAccountId(bill.accountId) === key ||
    bill.customerId === subject
  );
}

// ==================== Helpers ====================

/** subtotal = cọc + thuê bao + phí giờ − chiết khấu; thuế tính trên subtotal; tổng = subtotal + thuế + phí trễ. */
function computeTotals({ securityDeposit, monthlyRental, hourlyCharges, discountAmount, taxRate, lateFee }) {
  const subtotal = roundCurrency(securityDeposit.plus(monthlyRental).plus(hourlyCharges).minus(discountAmount));
  const taxAmount = roundCurrency(subtotal.times(taxRate).div(100));
  const total = roundCurrency(subtotal.plus(taxAmount).plus(lateFee));
  return { subtotal, taxAmount, total };
}

function settlementStatus(dueAmount, amountPaid) {
  if (dueAmount.lte(PAID_TOLERANCE)) return 'Paid';
  return amountPaid.gt(0) ? 'Partially Paid' : 'Unpaid';
}

/**
 * Kết nối để gắn hoá đơn. Chưa có kết nối thì tạo kết nối "Provisioned for billing" trên đơn
 * giữ chỗ mã này (hoặc đơn mới nhất), giống bản ASP.NET, để thoả khoá ngoại của bảng Bill.
 */
async function resolveBillingConnection(accountId) {
  if (!accountId) return null;

  const connection = await billRepository.findConnectionForBilling(accountIdForms(accountId));
  if (connection) return connection;

  const order = await billRepository.findOrderForBilling(accountId);
  if (!order) return null;

  await billRepository.insertBillingConnection(accountId, order.orderId);
  return { accountId, bulkConnectionsCount: order.bulkConnectionsCount, planSecurityDeposit: order.planSecurityDeposit };
}

/** Mã tài khoản ở cả dạng người dùng gõ, dạng liền và dạng có gạch (CSDL có cả hai). */
function accountIdForms(accountId) {
  const key = normalizeAccountId(accountId);
  return [...new Set([accountId, key, formatAccountId(key)])];
}

async function withPayments(bills) {
  const payments = await billRepository.findPayments(bills.map((b) => b.billId));
  const byBill = Map.groupBy(payments, (p) => p.billId);
  return bills.map((bill) => toBillDto(bill, byBill.get(bill.billId) ?? []));
}

/** yyyyMMddHHmmss theo giờ máy chạy API. */
function localStamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Mô tả hoá đơn "của cái gì" — gói cước nào, kỳ nào, gồm những khoản gì. Dùng chung cho
 * màn hình kế toán và cổng khách hàng để mọi nơi diễn đạt thống nhất.
 */
export function buildInvoiceDescription(planName, billingMonth, hourlyCharges, securityDeposit, lateFeeAmount) {
  let period = billingMonth;
  const match = /^([A-Za-z]+) (\d{4})$/.exec(billingMonth?.trim() ?? '');
  const monthIndex = match ? MONTH_NAMES.indexOf(match[1]) : -1;
  if (monthIndex >= 0) {
    // BillingMonth lưu dạng "September 2026" (khách Việt đọc "September" không tự nhiên).
    period = `tháng ${monthIndex + 1}/${match[2]}`;
  } else if (!period?.trim()) {
    const now = new Date();
    period = `tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  }

  const components = ['cước thuê bao'];
  if (dec(hourlyCharges).gt(0)) components.push('cước theo giờ');
  if (dec(securityDeposit).gt(0)) components.push('tiền cọc thiết bị');
  if (dec(lateFeeAmount).gt(0)) components.push('phí nộp trễ');
  components.push('thuế dịch vụ');

  const plan = planName?.trim() ? planName.trim() : 'viễn thông';
  return `Hóa đơn cước phí gói cước ${plan} kỳ ${period} (gồm ${components.join(', ')})`;
}

function toPaymentDto(p) {
  return {
    paymentId: p.paymentId,
    receiptNumber: p.receiptNumber,
    billId: p.billId,
    employeeId: p.employeeId,
    amountPaid: p.amountPaid,
    paymentDate: p.paymentDate,
    paymentMode: p.paymentMode,
    referenceNumber: p.referenceNumber,
    status: p.status,
    notes: p.notes,
  };
}

function toBillDto(b, payments) {
  return {
    billId: b.billId,
    invoiceNumber: b.invoiceNumber,
    description: buildInvoiceDescription(b.planName, b.billingMonth, b.hourlyCharges, b.securityDeposit, b.lateFeeAmount),
    accountId: b.accountId,
    customerName: b.customerName ?? 'Nexus Valued Subscriber',
    customerPhone: b.customerPhone ?? 'N/A',
    customerEmail: b.customerEmail ?? 'N/A',
    installationAddress: b.installationAddress ?? 'N/A',
    planName: b.planName ?? 'Telecommunications Service Plan',
    connectionType: b.connectionType ?? 'Broadband',
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
    payments: payments.map(toPaymentDto),
  };
}
