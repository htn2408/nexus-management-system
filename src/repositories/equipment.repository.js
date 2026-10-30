import { query, queryOne, queryRows } from '../config/database.js';
import { whereClause } from '../utils/sqlFilters.js';

// Thiết bị kèm tên nhà cung cấp, cửa hàng và kỹ thuật viên phụ trách.
const SELECT = `
  SELECT e.EquipmentID AS equipmentId, e.InventoryID AS inventoryId, e.SerialNumber AS serialNumber,
         e.MacAddress AS macAddress, e.DeviceModel AS deviceModel, e.DeviceType AS deviceType,
         e.VendorID AS vendorId, v.CompanyName AS vendorName, e.StoreID AS storeId, s.Name AS storeName,
         e.Status AS status, e.FirmwareVersion AS firmwareVersion, e.AssignedAccountId AS assignedAccountId,
         e.AssignedTechnicianId AS assignedTechnicianId, t.FullName AS technicianName,
         e.InstalledDate AS installedDate, e.CreatedAt AS createdAt, e.UpdatedAt AS updatedAt
  FROM dbo.Equipment e
  JOIN dbo.Vendor v ON v.VendorID = e.VendorID
  LEFT JOIN dbo.RetailStore s ON s.StoreID = e.StoreID
  LEFT JOIN dbo.Employee t ON t.EmployeeID = e.AssignedTechnicianId`;

/** availableOnly: chỉ thiết bị còn trong kho, chưa gán tài khoản, chưa thuộc kết nối nào. */
export function findAll({ status, storeId, availableOnly } = {}) {
  const conditions = [];
  const params = {};

  if (status) {
    conditions.push('e.Status = @status');
    params.status = status;
  }
  if (storeId) {
    conditions.push('e.StoreID = @storeId');
    params.storeId = storeId;
  }
  if (availableOnly) {
    conditions.push(`e.Status = 'In Stock' AND e.AssignedAccountId IS NULL
      AND NOT EXISTS (SELECT 1 FROM dbo.CustomerConnection cc WHERE cc.EquipmentID = e.EquipmentID)`);
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY e.EquipmentID`, params);
}

export function findById(equipmentId) {
  return queryOne(`${SELECT} WHERE e.EquipmentID = @equipmentId`, { equipmentId });
}

// Dữ liệu thô dùng khi cấp / thu hồi thiết bị: kèm tồn kho của mặt hàng liên kết
// và kết nối đang dùng thiết bị (nếu có).
const RAW_SELECT = `
  SELECT e.EquipmentID AS equipmentId, e.InventoryID AS inventoryId, e.SerialNumber AS serialNumber,
         e.StoreID AS storeId, e.Status AS status, e.AssignedAccountId AS assignedAccountId,
         i.StockQuantity AS inventoryStock, i.ReorderLevel AS inventoryReorderLevel,
         (SELECT TOP 1 cc.AccountID FROM dbo.CustomerConnection cc WHERE cc.EquipmentID = e.EquipmentID) AS connectionAccountId
  FROM dbo.Equipment e
  LEFT JOIN dbo.InventoryItem i ON i.InventoryID = e.InventoryID`;

export function findRawById(equipmentId, executor = null) {
  return queryOne(`${RAW_SELECT} WHERE e.EquipmentID = @equipmentId`, { equipmentId }, executor);
}

export function findRawBySerial(serialNumber, executor = null) {
  return queryOne(`${RAW_SELECT} WHERE e.SerialNumber = @serialNumber`, { serialNumber }, executor);
}

export async function exists(equipmentId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.Equipment WHERE EquipmentID = @equipmentId', { equipmentId })) !== null;
}

/** Serial / MAC đã thuộc thiết bị khác (trừ excludeId) chưa. */
export async function serialTaken(serialNumber, excludeId = null) {
  const row = await queryOne(
    'SELECT TOP 1 1 AS found FROM dbo.Equipment WHERE SerialNumber = @serialNumber AND (@excludeId IS NULL OR EquipmentID <> @excludeId)',
    { serialNumber, excludeId }
  );
  return row !== null;
}

export async function macTaken(macAddress, excludeId = null) {
  const row = await queryOne(
    'SELECT TOP 1 1 AS found FROM dbo.Equipment WHERE MacAddress = @macAddress AND (@excludeId IS NULL OR EquipmentID <> @excludeId)',
    { macAddress, excludeId }
  );
  return row !== null;
}

/** Thiết bị đang thuộc một kết nối KHÁC các mã tài khoản đã cho chưa. */
export async function usedByOtherConnection(equipmentId, accountIds, executor = null) {
  const params = { equipmentId };
  const placeholders = accountIds.map((id, index) => {
    params[`a${index}`] = id;
    return `@a${index}`;
  });
  const row = await queryOne(
    `SELECT TOP 1 1 AS found FROM dbo.CustomerConnection
     WHERE EquipmentID = @equipmentId AND AccountID NOT IN (${placeholders.join(', ')})`,
    params,
    executor
  );
  return row !== null;
}

export async function insert(equipment) {
  await query(
    `INSERT INTO dbo.Equipment
       (EquipmentID, InventoryID, SerialNumber, MacAddress, DeviceModel, DeviceType, VendorID,
        StoreID, Status, FirmwareVersion, CreatedAt)
     VALUES
       (@equipmentId, @inventoryId, @serialNumber, @macAddress, @deviceModel, @deviceType, @vendorId,
        @storeId, @status, @firmwareVersion, @now)`,
    { ...equipment, now: new Date() }
  );
}

const WRITABLE_COLUMNS = {
  serialNumber: 'SerialNumber',
  macAddress: 'MacAddress',
  deviceModel: 'DeviceModel',
  deviceType: 'DeviceType',
  storeId: 'StoreID',
  status: 'Status',
  firmwareVersion: 'FirmwareVersion',
  assignedAccountId: 'AssignedAccountId',
  assignedTechnicianId: 'AssignedTechnicianId',
  installedDate: 'InstalledDate',
};

/** Ghi các field có trong `changes` (chỉ cột trong WRITABLE_COLUMNS), kèm UpdatedAt. */
export async function update(equipmentId, changes, executor = null) {
  const params = { equipmentId, now: new Date() };
  const sets = ['UpdatedAt = @now'];
  for (const [field, value] of Object.entries(changes)) {
    const column = WRITABLE_COLUMNS[field];
    if (!column) throw new Error(`Không được phép cập nhật cột "${field}" của thiết bị`);
    sets.push(`${column} = @${field}`);
    params[field] = value;
  }
  await query(`UPDATE dbo.Equipment SET ${sets.join(', ')} WHERE EquipmentID = @equipmentId`, params, executor);
}

export async function remove(equipmentId) {
  await query('DELETE FROM dbo.Equipment WHERE EquipmentID = @equipmentId', { equipmentId });
}
