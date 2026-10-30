import { query, queryOne, queryRows } from '../config/database.js';

// Hoá đơn kèm khách hàng và gói cước (qua kết nối → đơn hàng).
const SELECT = `
  SELECT b.BillID AS billId, b.InvoiceNumber AS invoiceNumber, b.AccountID AS accountId,
         b.BillingMonth AS billingMonth, b.BillingDate AS billingDate, b.DueDate AS dueDate,
         b.SecurityDeposit AS securityDeposit, b.MonthlyRental AS monthlyRental, b.HourlyCharges AS hourlyCharges,
         b.DiscountPercent AS discountPercent, b.DiscountAmount AS discountAmount, b.Subtotal AS subtotal,
         b.ServiceTaxRate AS serviceTaxRate, b.ServiceTaxAmount AS serviceTaxAmount,
         b.LateFeeAmount AS lateFeeAmount, b.TotalAmount AS totalAmount, b.AmountPaid AS amountPaid,
         b.DueAmount AS dueAmount, b.Status AS status, b.GeneratedDate AS generatedDate,
         c.CustomerID AS customerId, c.FullName AS customerName, c.ContactNumber AS customerPhone,
         c.Email AS customerEmail, o.InstallationAddress AS installationAddress,
         p.Name AS planName, p.ConnectionType AS connectionType
  FROM dbo.Bill b
  LEFT JOIN dbo.CustomerConnection cc ON cc.AccountID = b.AccountID
  LEFT JOIN dbo.Orders o ON o.OrderID = cc.OrderID
  LEFT JOIN dbo.Customer c ON c.CustomerID = o.CustomerID
  LEFT JOIN dbo.ServicePlan p ON p.PlanID = o.PlanID`;

const PAYMENT_COLUMNS = `
  PaymentID AS paymentId, ReceiptNumber AS receiptNumber, BillID AS billId, EmployeeID AS employeeId,
  AmountPaid AS amountPaid, PaymentDate AS paymentDate, PaymentMode AS paymentMode,
  ReferenceNumber AS referenceNumber, Status AS status, Notes AS notes`;

export function findAll() {
  return queryRows(`${SELECT} ORDER BY b.GeneratedDate DESC`);
}

/** Hoá đơn của các mã tài khoản đã cho, mới nhất trước. */
export function findByAccounts(accountIds) {
  if (accountIds.length === 0) return Promise.resolve([]);
  const params = {};
  const placeholders = accountIds.map((id, index) => {
    params[`a${index}`] = id;
    return `@a${index}`;
  });
  return queryRows(`${SELECT} WHERE b.AccountID IN (${placeholders.join(', ')}) ORDER BY b.GeneratedDate DESC`, params);
}

/** Tìm theo BillID hoặc InvoiceNumber. */
export function findByIdOrInvoice(key, executor = null) {
  return queryOne(`${SELECT} WHERE b.BillID = @key OR b.InvoiceNumber = @key`, { key }, executor);
}

/** Hoá đơn cần thanh toán: khớp số hoá đơn hoặc BillID (cái nào được gửi). Khoá dòng trong transaction. */
export function findForPayment({ invoiceNumber, billId }, executor) {
  return queryOne(
    `SELECT b.BillID AS billId, b.InvoiceNumber AS invoiceNumber, b.AccountID AS accountId,
            b.TotalAmount AS totalAmount, b.AmountPaid AS amountPaid,
            c.CustomerID AS customerId, c.FullName AS customerName, c.Email AS customerEmail
     FROM dbo.Bill b WITH (UPDLOCK, HOLDLOCK)
     LEFT JOIN dbo.CustomerConnection cc ON cc.AccountID = b.AccountID
     LEFT JOIN dbo.Orders o ON o.OrderID = cc.OrderID
     LEFT JOIN dbo.Customer c ON c.CustomerID = o.CustomerID
     WHERE (@invoiceNumber IS NOT NULL AND b.InvoiceNumber = @invoiceNumber)
        OR (@billId IS NOT NULL AND b.BillID = @billId)`,
    { invoiceNumber, billId },
    executor
  );
}

/** Thanh toán của các hoá đơn, mới nhất trước. */
export function findPayments(billIds) {
  if (billIds.length === 0) return Promise.resolve([]);
  const params = {};
  const placeholders = billIds.map((id, index) => {
    params[`b${index}`] = id;
    return `@b${index}`;
  });
  return queryRows(
    `SELECT ${PAYMENT_COLUMNS} FROM dbo.Payment WHERE BillID IN (${placeholders.join(', ')}) ORDER BY PaymentDate DESC`,
    params
  );
}

export async function count() {
  return (await queryOne('SELECT COUNT(*) AS total FROM dbo.Bill')).total;
}

export async function invoiceExists(invoiceNumber) {
  return (await queryOne('SELECT 1 AS found FROM dbo.Bill WHERE InvoiceNumber = @invoiceNumber', { invoiceNumber })) !== null;
}

/** Số lần thanh toán trước đây của một tài khoản (để biết đây có phải lần đầu). */
export async function countPaymentsForAccount(accountId, executor) {
  const row = await queryOne(
    'SELECT COUNT(*) AS total FROM dbo.Payment p JOIN dbo.Bill b ON b.BillID = p.BillID WHERE b.AccountID = @accountId',
    { accountId },
    executor
  );
  return row.total;
}

const BILL_FIELDS = [
  'billingMonth', 'securityDeposit', 'monthlyRental', 'hourlyCharges', 'discountPercent', 'discountAmount',
  'subtotal', 'serviceTaxRate', 'serviceTaxAmount', 'lateFeeAmount', 'totalAmount', 'amountPaid', 'dueAmount', 'status',
];

export async function insert(bill) {
  await query(
    `INSERT INTO dbo.Bill
       (BillID, InvoiceNumber, AccountID, BillingMonth, BillingDate, DueDate, SecurityDeposit, MonthlyRental,
        HourlyCharges, DiscountPercent, DiscountAmount, Subtotal, ServiceTaxRate, ServiceTaxAmount,
        LateFeeAmount, TotalAmount, AmountPaid, DueAmount, Status, GeneratedDate)
     VALUES
       (@billId, @invoiceNumber, @accountId, @billingMonth, CAST(@billingDate AS DATE), CAST(@dueDate AS DATE),
        @securityDeposit, @monthlyRental, @hourlyCharges, @discountPercent, @discountAmount, @subtotal,
        @serviceTaxRate, @serviceTaxAmount, @lateFeeAmount, @totalAmount, @amountPaid, @dueAmount, @status, @now)`,
    { ...bill, now: new Date() }
  );
}

/** Ghi lại toàn bộ khoản mục + tổng của hoá đơn sau khi kế toán sửa. */
export async function update(billId, bill) {
  const params = { billId, dueDate: bill.dueDate };
  for (const field of BILL_FIELDS) params[field] = bill[field];
  await query(
    `UPDATE dbo.Bill SET
       BillingMonth = @billingMonth, DueDate = CAST(@dueDate AS DATE), SecurityDeposit = @securityDeposit,
       MonthlyRental = @monthlyRental, HourlyCharges = @hourlyCharges, DiscountPercent = @discountPercent,
       DiscountAmount = @discountAmount, Subtotal = @subtotal, ServiceTaxRate = @serviceTaxRate,
       ServiceTaxAmount = @serviceTaxAmount, LateFeeAmount = @lateFeeAmount, TotalAmount = @totalAmount,
       AmountPaid = @amountPaid, DueAmount = @dueAmount, Status = @status
     WHERE BillID = @billId`,
    params
  );
}

export async function updateSettlement(billId, { amountPaid, dueAmount, status }, executor) {
  await query(
    'UPDATE dbo.Bill SET AmountPaid = @amountPaid, DueAmount = @dueAmount, Status = @status WHERE BillID = @billId',
    { billId, amountPaid, dueAmount, status },
    executor
  );
}

export async function insertPayment(payment, executor) {
  await query(
    `INSERT INTO dbo.Payment
       (PaymentID, ReceiptNumber, BillID, EmployeeID, AmountPaid, PaymentDate, PaymentMode, ReferenceNumber, Status, Notes)
     VALUES
       (@paymentId, @receiptNumber, @billId, @employeeId, @amountPaid, @paymentDate, @paymentMode, @referenceNumber, @status, @notes)`,
    payment,
    executor
  );
}

// ==================== Kết nối để lập hoá đơn ====================

/** Kết nối theo một trong các dạng mã, kèm số kết nối bulk và tiền cọc của gói cước. */
export function findConnectionForBilling(accountIds) {
  const params = {};
  const placeholders = accountIds.map((id, index) => {
    params[`a${index}`] = id;
    return `@a${index}`;
  });
  return queryOne(
    `SELECT cc.AccountID AS accountId, o.BulkConnectionsCount AS bulkConnectionsCount,
            p.SecurityDeposit AS planSecurityDeposit
     FROM dbo.CustomerConnection cc
     JOIN dbo.Orders o ON o.OrderID = cc.OrderID
     JOIN dbo.ServicePlan p ON p.PlanID = o.PlanID
     WHERE cc.AccountID IN (${placeholders.join(', ')})`,
    params
  );
}

/** Đơn giữ chỗ mã tài khoản này, không có thì đơn mới nhất (giống bản ASP.NET). */
export function findOrderForBilling(accountId) {
  return queryOne(
    `SELECT TOP 1 o.OrderID AS orderId, o.BulkConnectionsCount AS bulkConnectionsCount,
            p.SecurityDeposit AS planSecurityDeposit
     FROM dbo.Orders o JOIN dbo.ServicePlan p ON p.PlanID = o.PlanID
     ORDER BY CASE WHEN o.AssignedAccountId = @accountId THEN 0 ELSE 1 END, o.ApplicationDate DESC`,
    { accountId }
  );
}

export async function insertBillingConnection(accountId, orderId) {
  const now = new Date();
  await query(
    `INSERT INTO dbo.CustomerConnection (AccountID, OrderID, Status, InstalledDate, LastUpdated, LastStatusReason)
     VALUES (@accountId, @orderId, 'Active', @now, @now, 'Provisioned for billing')`,
    { accountId, orderId, now }
  );
}

/**
 * Hoá đơn của một khách: theo mã khách (CustomerID) hoặc theo các dạng mã tài khoản
 * (token khách mang CustomerID khi đăng nhập mật khẩu, Account ID khi đăng nhập OTP).
 */
export function findForCustomer(customerId, accountIds) {
  const params = { customerId };
  const placeholders = accountIds.map((id, index) => {
    params[`a${index}`] = id;
    return `@a${index}`;
  });
  return queryRows(
    `${SELECT} WHERE o.CustomerID = @customerId OR b.AccountID IN (${placeholders.join(', ')})
     ORDER BY b.GeneratedDate DESC`,
    params
  );
}
