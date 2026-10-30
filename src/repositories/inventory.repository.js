import { query, queryOne, queryRows } from '../config/database.js';
import { containsPattern, likeAny, whereClause } from '../utils/sqlFilters.js';

// Kèm tên nhà cung cấp.
const SELECT = `
  SELECT i.InventoryID AS inventoryId, i.ItemCode AS itemCode, i.Name AS name, i.Category AS category,
         i.StockQuantity AS stockQuantity, i.ReorderLevel AS reorderLevel, i.UnitCost AS unitCost,
         i.Location AS location, i.VendorID AS vendorId, v.CompanyName AS vendorName,
         i.Status AS status, i.CreatedAt AS createdAt, i.UpdatedAt AS updatedAt
  FROM dbo.InventoryItem i
  LEFT JOIN dbo.Vendor v ON v.VendorID = i.VendorID`;

const SEARCH_COLUMNS = ['i.ItemCode', 'i.Name', 'i.Category', 'i.Location', 'v.CompanyName', 'i.InventoryID'];

/**
 * filters: { search?, category?, lowStockOnly?, vendorId?, status? }; null/false = không lọc.
 * orderBy: cột sắp xếp (chỉ truyền hằng số trong code, không lấy từ request).
 */
export function findAll({ search, category, lowStockOnly, vendorId, status } = {}, orderBy = 'i.ItemCode') {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push(likeAny(SEARCH_COLUMNS));
    params.search = containsPattern(search);
  }
  if (category) {
    conditions.push('i.Category = @category');
    params.category = category;
  }
  if (lowStockOnly) {
    conditions.push('i.StockQuantity <= i.ReorderLevel');
  }
  if (vendorId) {
    conditions.push('i.VendorID = @vendorId');
    params.vendorId = vendorId;
  }
  if (status) {
    conditions.push('i.Status = @status');
    params.status = status;
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY ${orderBy}`, params);
}

/** Tìm theo InventoryID hoặc ItemCode. */
export function findByIdOrCode(id) {
  return queryOne(`${SELECT} WHERE i.InventoryID = @id OR i.ItemCode = @id`, { id });
}

/**
 * Tìm theo InventoryID. Truyền transaction + lock = true để khoá dòng tới hết transaction
 * (điều chỉnh tồn kho đồng thời không bị ghi đè lẫn nhau).
 */
export function findById(inventoryId, executor = null, lock = false) {
  const hint = lock ? 'WITH (UPDLOCK, HOLDLOCK)' : '';
  return queryOne(
    `SELECT i.InventoryID AS inventoryId, i.ItemCode AS itemCode, i.Name AS name, i.Category AS category,
            i.StockQuantity AS stockQuantity, i.ReorderLevel AS reorderLevel, i.UnitCost AS unitCost,
            i.Location AS location, i.VendorID AS vendorId, v.CompanyName AS vendorName,
            i.Status AS status, i.CreatedAt AS createdAt, i.UpdatedAt AS updatedAt
     FROM dbo.InventoryItem i ${hint}
     LEFT JOIN dbo.Vendor v ON v.VendorID = i.VendorID
     WHERE i.InventoryID = @inventoryId`,
    { inventoryId },
    executor
  );
}

export function findByItemCode(itemCode, executor = null) {
  return queryOne(
    `SELECT TOP 1 InventoryID AS inventoryId, StockQuantity AS stockQuantity
     FROM dbo.InventoryItem WITH (UPDLOCK, HOLDLOCK) WHERE ItemCode = @itemCode`,
    { itemCode },
    executor
  );
}

export async function count() {
  return (await queryOne('SELECT COUNT(*) AS total FROM dbo.InventoryItem')).total;
}

export async function exists(inventoryId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.InventoryItem WHERE InventoryID = @inventoryId', { inventoryId })) !== null;
}

export async function insert(item, executor = null) {
  await query(
    `INSERT INTO dbo.InventoryItem
       (InventoryID, ItemCode, Name, Category, StockQuantity, ReorderLevel, UnitCost, Location,
        VendorID, Status, CreatedAt)
     VALUES
       (@inventoryId, @itemCode, @name, @category, @stockQuantity, @reorderLevel, @unitCost, @location,
        @vendorId, @status, @now)`,
    { location: null, ...item, now: new Date() },
    executor
  );
}

/** Ghi đè các field mô tả + tồn kho (dùng cho màn hình sửa vật tư). */
export async function update(inventoryId, item) {
  await query(
    `UPDATE dbo.InventoryItem SET
       ItemCode = @itemCode, Name = @name, Category = @category, StockQuantity = @stockQuantity,
       ReorderLevel = @reorderLevel, UnitCost = @unitCost, Location = @location,
       VendorID = @vendorId, Status = @status, UpdatedAt = @now
     WHERE InventoryID = @inventoryId`,
    { ...item, inventoryId, now: new Date() }
  );
}

export async function setStock(inventoryId, stockQuantity, status, executor = null) {
  await query(
    `UPDATE dbo.InventoryItem SET StockQuantity = @stockQuantity, Status = @status, UpdatedAt = @now
     WHERE InventoryID = @inventoryId`,
    { inventoryId, stockQuantity, status, now: new Date() },
    executor
  );
}

export async function incrementStock(inventoryId, quantity, executor = null) {
  await query(
    `UPDATE dbo.InventoryItem SET StockQuantity = StockQuantity + @quantity, UpdatedAt = @now
     WHERE InventoryID = @inventoryId`,
    { inventoryId, quantity, now: new Date() },
    executor
  );
}

export async function setStatus(inventoryId, status) {
  await query('UPDATE dbo.InventoryItem SET Status = @status, UpdatedAt = @now WHERE InventoryID = @inventoryId', {
    inventoryId,
    status,
    now: new Date(),
  });
}

export async function remove(inventoryId) {
  await query('DELETE FROM dbo.InventoryItem WHERE InventoryID = @inventoryId', { inventoryId });
}

/** Có thiết bị (Equipment) nào đang tham chiếu vật tư này không. */
export async function hasEquipment(inventoryId) {
  return (await queryOne('SELECT TOP 1 1 AS found FROM dbo.Equipment WHERE InventoryID = @inventoryId', { inventoryId })) !== null;
}

// ==================== Nhà cung cấp ====================

/**
 * Nhà cung cấp mà chuỗi hiển thị nhắc tới (chứa tên công ty, mã ID hoặc mã NCC).
 * Ưu tiên khớp mã, rồi tới tên dài nhất (tên cụ thể hơn).
 */
export async function findVendorMentionedIn(text, matchVendorCode = true) {
  const codeCondition = matchVendorCode ? 'OR CHARINDEX(VendorCode, @text) > 0' : '';
  const row = await queryOne(
    `SELECT TOP 1 VendorID AS vendorId FROM dbo.Vendor
     WHERE CHARINDEX(CompanyName, @text) > 0 OR CHARINDEX(VendorID, @text) > 0 ${codeCondition}
     ORDER BY CASE WHEN CHARINDEX(VendorID, @text) > 0 ${codeCondition} THEN 0 ELSE 1 END, LEN(CompanyName) DESC`,
    { text }
  );
  return row?.vendorId ?? null;
}

export async function firstVendorId() {
  return (await queryOne('SELECT TOP 1 VendorID AS vendorId FROM dbo.Vendor'))?.vendorId ?? null;
}

export async function vendorExists(vendorId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.Vendor WHERE VendorID = @vendorId', { vendorId })) !== null;
}
