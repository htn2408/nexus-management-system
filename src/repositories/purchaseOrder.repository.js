import { query, queryOne, queryRows } from '../config/database.js';
import { containsPattern, likeAny, whereClause } from '../utils/sqlFilters.js';

// Kèm thông tin nhà cung cấp (frontend đọc vendor.companyName).
const SELECT = `
  SELECT p.PurchaseOrderID AS purchaseOrderId, p.VendorID AS vendorId, p.StoreID AS storeId,
         p.ItemCode AS itemCode, p.ItemName AS itemName, p.Category AS category, p.Quantity AS quantity,
         p.UnitCost AS unitCost, p.TotalCost AS totalCost, p.OrderDate AS orderDate,
         p.ExpectedDate AS expectedDate, p.ReceivedDate AS receivedDate, p.Status AS status,
         p.Notes AS notes, p.CreatedBy AS createdBy, p.CreatedAt AS createdAt, p.UpdatedAt AS updatedAt,
         v.VendorCode AS vendorCode, v.CompanyName AS vendorCompanyName, v.ContactPerson AS vendorContactPerson,
         v.Category AS vendorCategory, v.Phone AS vendorPhone, v.Email AS vendorEmail, v.Status AS vendorStatus
  FROM dbo.PurchaseOrder p
  LEFT JOIN dbo.Vendor v ON v.VendorID = p.VendorID`;

export function findAll({ status, vendorId, storeId, search } = {}) {
  const conditions = [];
  const params = {};

  for (const [column, name, value] of [
    ['p.Status', 'status', status],
    ['p.VendorID', 'vendorId', vendorId],
    ['p.StoreID', 'storeId', storeId],
  ]) {
    if (value) {
      conditions.push(`${column} = @${name}`);
      params[name] = value;
    }
  }
  if (search) {
    conditions.push(likeAny(['p.PurchaseOrderID', 'p.ItemCode', 'p.ItemName', 'v.CompanyName']));
    params.search = containsPattern(search);
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY p.OrderDate DESC`, params);
}

export function findById(purchaseOrderId, executor) {
  return queryOne(`${SELECT} WHERE p.PurchaseOrderID = @purchaseOrderId`, { purchaseOrderId }, executor);
}

export async function insert(order) {
  await query(
    `INSERT INTO dbo.PurchaseOrder
       (PurchaseOrderID, VendorID, StoreID, ItemCode, ItemName, Category, Quantity, UnitCost, TotalCost,
        OrderDate, ExpectedDate, Status, Notes, CreatedBy, CreatedAt)
     VALUES
       (@purchaseOrderId, @vendorId, @storeId, @itemCode, @itemName, @category, @quantity, @unitCost,
        @quantity * CAST(@unitCost AS DECIMAL(18, 2)), @now, @expectedDate, @status, @notes, @createdBy, @now)`,
    { ...order, now: new Date() }
  );
}

export async function updateStatus(purchaseOrderId, status, executor) {
  await query(
    `UPDATE dbo.PurchaseOrder SET
       Status = @status, UpdatedAt = @now,
       ReceivedDate = CASE WHEN @status = 'Received' THEN @now ELSE ReceivedDate END
     WHERE PurchaseOrderID = @purchaseOrderId`,
    { purchaseOrderId, status, now: new Date() },
    executor
  );
}

export async function remove(purchaseOrderId) {
  await query('DELETE FROM dbo.PurchaseOrder WHERE PurchaseOrderID = @purchaseOrderId', { purchaseOrderId });
}

export async function vendorExists(vendorId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.Vendor WHERE VendorID = @vendorId', { vendorId })) !== null;
}
