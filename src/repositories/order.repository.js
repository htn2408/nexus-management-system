import { query, queryOne, queryRows } from '../config/database.js';
import { containsPattern, whereClause } from '../utils/sqlFilters.js';

// Thông tin đơn kèm khách hàng, gói cước, cửa hàng và số kết nối đã cấp.
const SELECT = `
  SELECT o.OrderID AS orderId, o.CustomerID AS customerId, c.FullName AS customerName,
         c.ContactNumber AS customerPhone, c.Email AS customerEmail,
         c.IdProofType AS idProofType, c.IdProofNumber AS idProofNumber,
         o.PlanID AS planId, p.Name AS planName, p.ConnectionType AS connectionType,
         o.StoreID AS storeId, s.Name AS storeName, s.CityCode AS cityCode, o.EmployeeID AS employeeId,
         o.InstallationAddress AS installationAddress, o.ApplicationDate AS applicationDate, o.Status AS status,
         o.CableDistanceMeters AS cableDistanceMeters, o.DpBoxCapacity AS dpBoxCapacity,
         o.SignalLossDbm AS signalLossDbm, o.FeasibilityNotes AS feasibilityNotes,
         o.FeasibilityCheckedBy AS feasibilityCheckedBy, o.FeasibilityCheckedDate AS feasibilityCheckedDate,
         o.ScheduledInstallDate AS scheduledInstallDate, o.RejectionReason AS rejectionReason,
         o.InternetFeasible AS internetFeasible, o.LandlineFeasible AS landlineFeasible,
         o.ExistingLandlineAccountId AS existingLandlineAccountId, o.AssignedAccountId AS assignedAccountId,
         (SELECT COUNT(*) FROM dbo.CustomerConnection cc WHERE cc.OrderID = o.OrderID) AS provisionedConnections,
         o.BulkConnectionsCount AS bulkConnectionsCount, o.BulkDiscountPercent AS bulkDiscountPercent,
         o.DepositWaived AS depositWaived,
         o.RetailApprovedBy AS retailApprovedBy, o.RetailApprovedDate AS retailApprovedDate,
         o.RetailApprovalNotes AS retailApprovalNotes,
         o.AssignedTechnicianName AS assignedTechnicianName, o.AssignedTechnicianPhone AS assignedTechnicianPhone,
         o.AssignedTechnicianDate AS assignedTechnicianDate,
         o.CreatedAt AS createdAt, o.UpdatedAt AS updatedAt
  FROM dbo.Orders o
  JOIN dbo.Customer c ON c.CustomerID = o.CustomerID
  JOIN dbo.ServicePlan p ON p.PlanID = o.PlanID
  JOIN dbo.RetailStore s ON s.StoreID = o.StoreID`;

/**
 * filters: { customerId?, status?, storeId?, keyword?, customerName?, phone?, connectionType?, fromDate?, toDateExclusive? }
 * Ngày là Date (so sánh theo UTC như cách CSDL lưu).
 */
export function findAll(filters = {}) {
  const conditions = [];
  const params = {};

  if (filters.customerId) {
    conditions.push('o.CustomerID = @customerId');
    params.customerId = filters.customerId;
  }
  if (filters.status) {
    conditions.push('o.Status = @status');
    params.status = filters.status;
  }
  if (filters.storeId) {
    conditions.push('o.StoreID = @storeId');
    params.storeId = filters.storeId;
  }
  if (filters.keyword) {
    conditions.push('(o.OrderID LIKE @keyword OR o.CustomerID LIKE @keyword OR o.InstallationAddress LIKE @keyword)');
    params.keyword = containsPattern(filters.keyword);
  }
  if (filters.customerName) {
    conditions.push('c.FullName LIKE @customerName');
    params.customerName = containsPattern(filters.customerName);
  }
  if (filters.phone) {
    conditions.push('c.ContactNumber LIKE @phone');
    params.phone = containsPattern(filters.phone);
  }
  if (filters.connectionType) {
    conditions.push('p.ConnectionType = @connectionType');
    params.connectionType = filters.connectionType;
  }
  if (filters.fromDate) {
    conditions.push('o.ApplicationDate >= @fromDate');
    params.fromDate = filters.fromDate;
  }
  if (filters.toDateExclusive) {
    conditions.push('o.ApplicationDate < @toDateExclusive');
    params.toDateExclusive = filters.toDateExclusive;
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY o.ApplicationDate DESC`, params);
}

/** Đơn đầy đủ thông tin. lock = true (trong transaction) để khoá đơn tới hết transaction. */
export function findById(orderId, executor = null, lock = false) {
  const sqlText = lock
    ? SELECT.replace('FROM dbo.Orders o', 'FROM dbo.Orders o WITH (UPDLOCK, HOLDLOCK)')
    : SELECT;
  return queryOne(`${sqlText} WHERE o.OrderID = @orderId`, { orderId }, executor);
}

// Các cột được phép ghi qua update(): tên field camelCase → tên cột.
const WRITABLE_COLUMNS = {
  status: 'Status',
  employeeId: 'EmployeeID',
  cableDistanceMeters: 'CableDistanceMeters',
  dpBoxCapacity: 'DpBoxCapacity',
  signalLossDbm: 'SignalLossDbm',
  feasibilityNotes: 'FeasibilityNotes',
  feasibilityCheckedBy: 'FeasibilityCheckedBy',
  feasibilityCheckedDate: 'FeasibilityCheckedDate',
  scheduledInstallDate: 'ScheduledInstallDate',
  rejectionReason: 'RejectionReason',
  retailApprovedBy: 'RetailApprovedBy',
  retailApprovedDate: 'RetailApprovedDate',
  retailApprovalNotes: 'RetailApprovalNotes',
  assignedTechnicianName: 'AssignedTechnicianName',
  assignedTechnicianPhone: 'AssignedTechnicianPhone',
  assignedTechnicianDate: 'AssignedTechnicianDate',
  landlineFeasible: 'LandlineFeasible',
  internetFeasible: 'InternetFeasible',
  assignedAccountId: 'AssignedAccountId',
};

/** Ghi các field có trong `changes` (chỉ những cột nằm trong WRITABLE_COLUMNS), kèm UpdatedAt. */
export async function update(orderId, changes, executor = null) {
  const params = { orderId, now: new Date() };
  const sets = ['UpdatedAt = @now'];

  for (const [field, value] of Object.entries(changes)) {
    const column = WRITABLE_COLUMNS[field];
    if (!column) throw new Error(`Không được phép cập nhật cột "${field}" của đơn hàng`);
    sets.push(`${column} = @${field}`);
    params[field] = value;
  }

  await query(`UPDATE dbo.Orders SET ${sets.join(', ')} WHERE OrderID = @orderId`, params, executor);
}

export async function insert(order, executor = null) {
  await query(
    `INSERT INTO dbo.Orders
       (OrderID, CustomerID, InstallationAddress, ApplicationDate, Status, PlanID, StoreID, EmployeeID,
        BulkConnectionsCount, BulkDiscountPercent, ExistingLandlineAccountId, CreatedAt, UpdatedAt)
     VALUES
       (@orderId, @customerId, @installationAddress, @now, @status, @planId, @storeId, @employeeId,
        @bulkConnectionsCount, @bulkDiscountPercent, @existingLandlineAccountId, @now, @now)`,
    { ...order, now: new Date() },
    executor
  );
}

/** Serial lớn nhất của Order ID (10 chữ số sau chữ cái loại kết nối), 0 nếu chưa có đơn. */
export async function maxOrderSerial(executor = null) {
  const row = await queryOne(
    `SELECT MAX(CAST(SUBSTRING(OrderID, 2, 10) AS BIGINT)) AS maxSerial
     FROM dbo.Orders
     WHERE LEN(OrderID) = 11 AND SUBSTRING(OrderID, 2, 10) NOT LIKE '%[^0-9]%'`,
    {},
    executor
  );
  return Number(row?.maxSerial ?? 0);
}

/**
 * Đơn giống hệt vừa tạo trong khoảng thời gian gần đây (chống bấm đúp / gửi lại request).
 * Khớp theo mã khách HOẶC email (khách mới gửi 2 request cùng lúc sẽ có 2 mã khách khác nhau).
 */
export async function findRecentDuplicate({ customerId, email, planId, storeId, installationAddress, bulkConnectionsCount, since }) {
  const row = await queryOne(
    `SELECT TOP 1 o.OrderID AS orderId
     FROM dbo.Orders o
     JOIN dbo.Customer c ON c.CustomerID = o.CustomerID
     WHERE (o.CustomerID = @customerId OR (@email IS NOT NULL AND c.Email = @email))
       AND o.PlanID = @planId AND o.StoreID = @storeId
       AND o.InstallationAddress = @installationAddress
       AND o.BulkConnectionsCount = @bulkConnectionsCount
       AND o.CreatedAt >= @since
     ORDER BY o.CreatedAt DESC`,
    { customerId, email, planId, storeId, installationAddress, bulkConnectionsCount, since }
  );
  return row?.orderId ?? null;
}

export async function hasConnections(orderId, executor = null) {
  const row = await queryOne('SELECT TOP 1 1 AS found FROM dbo.CustomerConnection WHERE OrderID = @orderId', { orderId }, executor);
  return row !== null;
}

/** Mọi mã tài khoản của một khách: kết nối đã cấp + mã đã giữ chỗ trên đơn. */
export async function accountIdsForCustomer(customerId) {
  const rows = await queryRows(
    `SELECT cc.AccountID AS accountId
     FROM dbo.CustomerConnection cc JOIN dbo.Orders o ON o.OrderID = cc.OrderID
     WHERE o.CustomerID = @customerId
     UNION
     SELECT AssignedAccountId FROM dbo.Orders WHERE CustomerID = @customerId AND AssignedAccountId IS NOT NULL`,
    { customerId }
  );
  return rows.map((row) => row.accountId);
}

/** Mọi Account ID đã dùng hoặc đã giữ chỗ (để tìm serial lớn nhất). */
export async function allAccountIds(executor = null) {
  const rows = await queryRows(
    `SELECT AccountID AS accountId FROM dbo.CustomerConnection
     UNION ALL
     SELECT AssignedAccountId FROM dbo.Orders WHERE AssignedAccountId IS NOT NULL`,
    {},
    executor
  );
  return rows.map((row) => row.accountId);
}