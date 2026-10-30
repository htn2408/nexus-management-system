import { query, queryOne, queryRows } from '../config/database.js';
import { containsPattern, likeAny, whereClause } from '../utils/sqlFilters.js';

// Yêu cầu kèm tên chi nhánh và tên kỹ thuật viên gửi yêu cầu.
const SELECT = `
  SELECT r.RequestID AS requestId, r.OrderID AS orderId, r.StoreID AS storeId, s.Name AS storeName,
         r.EmployeeID AS employeeId, e.FullName AS employeeName, r.InventoryID AS inventoryId,
         r.ItemName AS itemName, r.DeviceType AS deviceType, r.Quantity AS quantity, r.Urgency AS urgency,
         r.Status AS status, r.Reason AS reason, r.AdminNotes AS adminNotes,
         r.CreatedAt AS createdAt, r.UpdatedAt AS updatedAt
  FROM dbo.EquipmentRequest r
  JOIN dbo.RetailStore s ON s.StoreID = r.StoreID
  JOIN dbo.Employee e ON e.EmployeeID = r.EmployeeID`;

const SEARCH_COLUMNS = ['r.RequestID', 'r.ItemName', 'r.OrderID', 'r.Reason', 's.Name', 'e.FullName'];

export function findAll({ status, storeId, search } = {}) {
  const conditions = [];
  const params = {};

  if (status) {
    conditions.push('r.Status = @status');
    params.status = status;
  }
  if (storeId) {
    conditions.push('r.StoreID = @storeId');
    params.storeId = storeId;
  }
  if (search) {
    conditions.push(likeAny(SEARCH_COLUMNS));
    params.search = containsPattern(search);
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY r.CreatedAt DESC`, params);
}

export function findById(requestId, executor = null) {
  return queryOne(`${SELECT} WHERE r.RequestID = @requestId`, { requestId }, executor);
}

export async function insert(request) {
  await query(
    `INSERT INTO dbo.EquipmentRequest
       (RequestID, OrderID, StoreID, EmployeeID, InventoryID, ItemName, DeviceType, Quantity,
        Urgency, Status, Reason, CreatedAt)
     VALUES
       (@requestId, @orderId, @storeId, @employeeId, @inventoryId, @itemName, @deviceType, @quantity,
        @urgency, @status, @reason, @now)`,
    { ...request, now: new Date() }
  );
}

/** adminNotes = null nghĩa là giữ nguyên ghi chú cũ. */
export async function updateStatus(requestId, status, adminNotes, executor = null) {
  await query(
    `UPDATE dbo.EquipmentRequest SET
       Status = @status, AdminNotes = COALESCE(@adminNotes, AdminNotes), UpdatedAt = @now
     WHERE RequestID = @requestId`,
    { requestId, status, adminNotes, now: new Date() },
    executor
  );
}

export async function remove(requestId) {
  await query('DELETE FROM dbo.EquipmentRequest WHERE RequestID = @requestId', { requestId });
}

/** Nhân viên được phép gửi yêu cầu: đang Active và là Field Engineer hoặc Manager. */
export function findTechnicalEmployee(employeeId) {
  return queryOne(
    `SELECT EmployeeID AS employeeId, FullName AS fullName FROM dbo.Employee
     WHERE EmployeeID = @employeeId AND Status = 'Active' AND Role IN ('Field Engineer', 'Manager')`,
    { employeeId }
  );
}

// ==================== Nhập hàng khi yêu cầu được đáp ứng ====================

/** Mặt hàng kho theo InventoryID, không có thì theo đúng tên vật tư. */
export async function findInventoryForRequest({ inventoryId, itemName }, executor) {
  if (inventoryId) {
    const byId = await queryOne(
      'SELECT InventoryID AS inventoryId, VendorID AS vendorId FROM dbo.InventoryItem WITH (UPDLOCK) WHERE InventoryID = @inventoryId',
      { inventoryId },
      executor
    );
    if (byId) return byId;
  }
  return queryOne(
    'SELECT TOP 1 InventoryID AS inventoryId, VendorID AS vendorId FROM dbo.InventoryItem WITH (UPDLOCK) WHERE Name = @itemName',
    { itemName },
    executor
  );
}

export async function insertEquipment(equipment, executor) {
  await query(
    `INSERT INTO dbo.Equipment
       (EquipmentID, InventoryID, SerialNumber, MacAddress, DeviceModel, DeviceType, VendorID,
        StoreID, Status, FirmwareVersion, CreatedAt)
     VALUES
       (@equipmentId, @inventoryId, @serialNumber, @macAddress, @deviceModel, @deviceType, @vendorId,
        @storeId, 'In Stock', @firmwareVersion, @now)`,
    { ...equipment, now: new Date() },
    executor
  );
}
