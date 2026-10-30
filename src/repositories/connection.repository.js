import { getPool, query, queryOne, queryRows, sql } from '../config/database.js';
import { containsPattern, whereClause } from '../utils/sqlFilters.js';

/**
 * Kết nối theo mã tài khoản, kèm thông tin khách hàng sở hữu (qua đơn hàng).
 * Nhận nhiều dạng mã (có gạch / không gạch) vì dữ liệu cũ và mới lưu khác nhau.
 */
export async function findByAccountIdsWithCustomer(accountIds) {
  const pool = await getPool();
  const request = pool.request();
  const placeholders = accountIds.map((id, index) => {
    request.input(`id${index}`, sql.VarChar(20), id);
    return `@id${index}`;
  });

  const result = await request.query(`
    SELECT TOP 1 cc.AccountID AS accountId, c.CustomerID AS customerId,
                 c.FullName AS fullName, c.Email AS email
    FROM dbo.CustomerConnection cc
    LEFT JOIN dbo.Orders o ON o.OrderID = cc.OrderID
    LEFT JOIN dbo.Customer c ON c.CustomerID = o.CustomerID
    WHERE cc.AccountID IN (${placeholders.join(', ')})`);
  return result.recordset[0] ?? null;
}

/** Mọi mã tài khoản (không trùng) thuộc các đơn hàng của một khách. */
export async function findAccountIdsByCustomer(customerId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('customerId', sql.VarChar(20), customerId)
    .query(`
      SELECT DISTINCT cc.AccountID AS accountId
      FROM dbo.CustomerConnection cc
      JOIN dbo.Orders o ON o.OrderID = cc.OrderID
      WHERE o.CustomerID = @customerId`);
  return result.recordset.map((row) => row.accountId);
}

// ==================== Quản lý kết nối (Kỹ thuật) ====================

// Kết nối kèm khách hàng, gói cước (qua đơn hàng) và thiết bị đang lắp.
const SELECT = `
  SELECT cc.AccountID AS accountId, cc.OrderID AS orderId, o.CustomerID AS customerId,
         c.FullName AS customerName, c.ContactNumber AS customerPhone, c.Email AS customerEmail,
         o.InstallationAddress AS installationAddress, p.Name AS planName, p.ConnectionType AS connectionType,
         p.MonthlyRental AS monthlyRental, p.SecurityDeposit AS securityDeposit,
         cc.EquipmentID AS equipmentId, e.SerialNumber AS equipmentSerialNumber, e.DeviceModel AS equipmentModel,
         cc.Status AS status, cc.IpAddress AS ipAddress, cc.PortNumber AS portNumber,
         cc.InstalledDate AS installedDate, cc.SuspensionStartDate AS suspensionStartDate,
         cc.SuspensionEndDate AS suspensionEndDate, cc.TerminatedDate AS terminatedDate,
         cc.LastUpdated AS lastUpdated, cc.LastStatusReason AS lastStatusReason
  FROM dbo.CustomerConnection cc
  JOIN dbo.Orders o ON o.OrderID = cc.OrderID
  JOIN dbo.Customer c ON c.CustomerID = o.CustomerID
  JOIN dbo.ServicePlan p ON p.PlanID = o.PlanID
  LEFT JOIN dbo.Equipment e ON e.EquipmentID = cc.EquipmentID`;

/**
 * filters: { customerId?, accountIdKey?, status?, equipmentId?, customerName?, phone?, connectionType?,
 *            fromDate?, toDateExclusive? }. accountIdKey so khớp "chứa" trên mã đã bỏ gạch.
 */
export function findAll(filters = {}) {
  const conditions = [];
  const params = {};

  if (filters.customerId) {
    conditions.push('o.CustomerID = @customerId');
    params.customerId = filters.customerId;
  }
  if (filters.accountIdKey) {
    conditions.push("REPLACE(cc.AccountID, '-', '') LIKE @accountIdKey");
    params.accountIdKey = containsPattern(filters.accountIdKey);
  }
  for (const [column, name] of [
    ['cc.Status', 'status'],
    ['cc.EquipmentID', 'equipmentId'],
    ['p.ConnectionType', 'connectionType'],
  ]) {
    if (filters[name]) {
      conditions.push(`${column} = @${name}`);
      params[name] = filters[name];
    }
  }
  if (filters.customerName) {
    conditions.push('c.FullName LIKE @customerName');
    params.customerName = containsPattern(filters.customerName);
  }
  if (filters.phone) {
    conditions.push('c.ContactNumber LIKE @phone');
    params.phone = containsPattern(filters.phone);
  }
  if (filters.fromDate) {
    conditions.push('cc.InstalledDate >= @fromDate');
    params.fromDate = filters.fromDate;
  }
  if (filters.toDateExclusive) {
    conditions.push('cc.InstalledDate < @toDateExclusive');
    params.toDateExclusive = filters.toDateExclusive;
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY cc.LastUpdated DESC`, params);
}

function inList(values, prefix, params) {
  return values
    .map((value, index) => {
      params[`${prefix}${index}`] = value;
      return `@${prefix}${index}`;
    })
    .join(', ');
}

/** Kết nối đầy đủ thông tin theo một trong các dạng mã tài khoản. */
export function findDetail(accountIds, executor = null) {
  const params = {};
  return queryOne(`${SELECT} WHERE cc.AccountID IN (${inList(accountIds, 'id', params)})`, params, executor);
}

/** Dữ liệu thô của kết nối, kèm tồn kho của mặt hàng gắn với thiết bị đang lắp. */
export function findRaw(accountIds, executor = null) {
  const params = {};
  return queryOne(
    `SELECT cc.AccountID AS accountId, cc.OrderID AS orderId, cc.EquipmentID AS equipmentId,
            cc.Status AS status, cc.InstalledDate AS installedDate,
            e.InventoryID AS inventoryId, i.StockQuantity AS inventoryStock, i.ReorderLevel AS inventoryReorderLevel
     FROM dbo.CustomerConnection cc WITH (UPDLOCK, HOLDLOCK)
     LEFT JOIN dbo.Equipment e ON e.EquipmentID = cc.EquipmentID
     LEFT JOIN dbo.InventoryItem i ON i.InventoryID = e.InventoryID
     WHERE cc.AccountID IN (${inList(accountIds, 'id', params)})`,
    params,
    executor
  );
}

export async function countByOrder(orderId, executor = null) {
  return (await queryOne('SELECT COUNT(*) AS total FROM dbo.CustomerConnection WHERE OrderID = @orderId', { orderId }, executor)).total;
}

export async function accountIdExists(accountId, executor = null) {
  return (await queryOne('SELECT 1 AS found FROM dbo.CustomerConnection WHERE AccountID = @accountId', { accountId }, executor)) !== null;
}

export async function equipmentInUse(equipmentId, executor = null) {
  return (await queryOne('SELECT TOP 1 1 AS found FROM dbo.CustomerConnection WHERE EquipmentID = @equipmentId', { equipmentId }, executor)) !== null;
}

export async function insert(connection, executor = null) {
  await query(
    `INSERT INTO dbo.CustomerConnection
       (AccountID, OrderID, EquipmentID, Status, IpAddress, PortNumber, InstalledDate, LastUpdated, LastStatusReason)
     VALUES
       (@accountId, @orderId, @equipmentId, @status, @ipAddress, @portNumber, @installedDate, @lastUpdated, @lastStatusReason)`,
    connection,
    executor
  );
}

const WRITABLE_COLUMNS = {
  equipmentId: 'EquipmentID',
  status: 'Status',
  ipAddress: 'IpAddress',
  portNumber: 'PortNumber',
  suspensionStartDate: 'SuspensionStartDate',
  suspensionEndDate: 'SuspensionEndDate',
  terminatedDate: 'TerminatedDate',
  lastUpdated: 'LastUpdated',
  lastStatusReason: 'LastStatusReason',
};

export async function update(accountId, changes, executor = null) {
  const params = { accountId };
  const sets = [];
  for (const [field, value] of Object.entries(changes)) {
    const column = WRITABLE_COLUMNS[field];
    if (!column) throw new Error(`Không được phép cập nhật cột "${field}" của kết nối`);
    sets.push(`${column} = @${field}`);
    params[field] = value;
  }
  if (sets.length === 0) return;
  await query(`UPDATE dbo.CustomerConnection SET ${sets.join(', ')} WHERE AccountID = @accountId`, params, executor);
}

/** Tên khách sở hữu đơn của kết nối. */
export async function customerNameForOrder(orderId) {
  const row = await queryOne(
    'SELECT c.FullName AS fullName FROM dbo.Orders o JOIN dbo.Customer c ON c.CustomerID = o.CustomerID WHERE o.OrderID = @orderId',
    { orderId }
  );
  return row?.fullName ?? null;
}

/**
 * Khách (theo CustomerID) có sở hữu mã tài khoản này không: kết nối đã cấp hoặc mã đã giữ chỗ
 * trên đơn của họ. accountKey là mã đã chuẩn hoá (bỏ gạch, viết hoa).
 */
export async function customerOwnsAccount(customerId, accountKey) {
  const row = await queryOne(
    `SELECT TOP 1 1 AS found
     FROM dbo.Orders o
     LEFT JOIN dbo.CustomerConnection cc ON cc.OrderID = o.OrderID
     WHERE o.CustomerID = @customerId
       AND (REPLACE(cc.AccountID, '-', '') = @accountKey OR REPLACE(o.AssignedAccountId, '-', '') = @accountKey)`,
    { customerId, accountKey }
  );
  return row !== null;
}
