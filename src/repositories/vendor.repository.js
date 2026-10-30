import { query, queryOne, queryRows } from '../config/database.js';
import { containsPattern, likeAny, whereClause } from '../utils/sqlFilters.js';

// Kèm số loại vật tư nhà cung cấp đang cung ứng (InventoryItem.VendorID).
const SELECT = `
  SELECT v.VendorID AS vendorId, v.VendorCode AS vendorCode, v.CompanyName AS companyName,
         v.ContactPerson AS contactPerson, v.Category AS category, v.Phone AS phone, v.Email AS email,
         v.Address AS address, v.TaxNumber AS taxNumber, v.Rating AS rating, v.Status AS status,
         v.CreatedAt AS createdAt, v.UpdatedAt AS updatedAt,
         (SELECT COUNT(*) FROM dbo.InventoryItem i WHERE i.VendorID = v.VendorID) AS totalSuppliedItemsCount
  FROM dbo.Vendor v`;

const SEARCH_COLUMNS = [
  'v.VendorCode', 'v.CompanyName', 'v.ContactPerson', 'v.Category',
  'v.Email', 'v.Phone', 'v.Address', 'v.VendorID',
];

export function findAll({ search, category, status } = {}) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push(likeAny(SEARCH_COLUMNS));
    params.search = containsPattern(search);
  }
  if (category) {
    conditions.push('v.Category = @category');
    params.category = category;
  }
  if (status) {
    conditions.push('v.Status = @status');
    params.status = status;
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY v.VendorCode`, params);
}

export function countStats() {
  return queryOne(`
    SELECT COUNT(*) AS totalVendors,
           ISNULL(SUM(CASE WHEN Status = 'Active' THEN 1 ELSE 0 END), 0) AS activeVendorsCount,
           ISNULL(SUM(CASE WHEN Status = 'Pending Review' THEN 1 ELSE 0 END), 0) AS pendingReviewCount,
           ISNULL(SUM(CASE WHEN Status = 'Terminated' THEN 1 ELSE 0 END), 0) AS terminatedCount,
           COUNT(DISTINCT Category) AS totalCategoriesCount
    FROM dbo.Vendor`);
}

/** Tìm theo VendorID hoặc VendorCode. */
export function findByIdOrCode(id) {
  return queryOne(`${SELECT} WHERE v.VendorID = @id OR v.VendorCode = @id`, { id });
}

export function findById(id) {
  return queryOne(`${SELECT} WHERE v.VendorID = @id`, { id });
}

export async function insert(vendor) {
  await query(
    `INSERT INTO dbo.Vendor
       (VendorID, VendorCode, CompanyName, ContactPerson, Category, Phone, Email, Address,
        Rating, Status, CreatedAt, UpdatedAt)
     VALUES
       (@vendorId, @vendorCode, @companyName, @contactPerson, @category, @phone, @email, @address,
        @rating, @status, @now, @now)`,
    { ...vendor, now: new Date() }
  );
}

export async function update(vendorId, vendor) {
  await query(
    `UPDATE dbo.Vendor SET
       VendorCode = @vendorCode, CompanyName = @companyName, ContactPerson = @contactPerson,
       Category = @category, Phone = @phone, Email = @email, Address = @address,
       Rating = @rating, Status = @status, UpdatedAt = @now
     WHERE VendorID = @vendorId`,
    { ...vendor, vendorId, now: new Date() }
  );
}

export async function remove(vendorId) {
  const result = await query('DELETE FROM dbo.Vendor WHERE VendorID = @vendorId', { vendorId });
  return result.rowsAffected[0];
}
