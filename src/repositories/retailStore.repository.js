import { query, queryOne, queryRows } from '../config/database.js';
import { containsPattern, likeAny, whereClause } from '../utils/sqlFilters.js';

// Kèm số nhân viên của cửa hàng (tổng và đang Active) để tính "nhân viên trực".
const SELECT = `
  SELECT s.StoreID AS storeId, s.Name AS name, s.City AS city, s.CityCode AS cityCode,
         s.Address AS address, s.ManagerName AS managerName, s.Phone AS phone, s.Email AS email,
         s.OperatingHours AS operatingHours, s.Status AS status,
         s.ActiveEmployeesCount AS activeEmployeesCount, s.TotalSubscribersServed AS totalSubscribersServed,
         s.CreatedAt AS createdAt, s.UpdatedAt AS updatedAt,
         (SELECT COUNT(*) FROM dbo.Employee e WHERE e.StoreID = s.StoreID) AS employeeTotal,
         (SELECT COUNT(*) FROM dbo.Employee e WHERE e.StoreID = s.StoreID AND e.Status = 'Active') AS employeeActive
  FROM dbo.RetailStore s`;

const SEARCH_COLUMNS = ['s.StoreID', 's.Name', 's.City', 's.CityCode', 's.ManagerName', 's.Address', 's.Phone'];

export function findAll({ search, city, status } = {}) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push(likeAny(SEARCH_COLUMNS));
    params.search = containsPattern(search);
  }
  if (city) {
    conditions.push('s.City = @city');
    params.city = city;
  }
  if (status) {
    conditions.push('s.Status = @status');
    params.status = status;
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY s.StoreID`, params);
}

export function findById(storeId, executor) {
  return queryOne(`${SELECT} WHERE s.StoreID = @storeId`, { storeId }, executor);
}

export async function exists(storeId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.RetailStore WHERE StoreID = @storeId', { storeId })) !== null;
}

export async function insert(store) {
  await query(
    `INSERT INTO dbo.RetailStore
       (StoreID, Name, City, CityCode, Address, Phone, Email, ManagerName, OperatingHours,
        ActiveEmployeesCount, TotalSubscribersServed, Status, CreatedAt, UpdatedAt)
     VALUES
       (@storeId, @name, @city, @cityCode, @address, @phone, @email, @managerName, @operatingHours,
        @activeEmployeesCount, @totalSubscribersServed, @status, @now, @now)`,
    { ...store, now: new Date() }
  );
}

export async function update(storeId, store) {
  await query(
    `UPDATE dbo.RetailStore SET
       Name = @name, City = @city, CityCode = @cityCode, Address = @address, Phone = @phone,
       Email = @email, ManagerName = @managerName, OperatingHours = @operatingHours,
       ActiveEmployeesCount = @activeEmployeesCount, TotalSubscribersServed = @totalSubscribersServed,
       Status = @status, UpdatedAt = @now
     WHERE StoreID = @storeId`,
    { ...store, storeId, now: new Date() }
  );
}

export async function remove(storeId) {
  const result = await query('DELETE FROM dbo.RetailStore WHERE StoreID = @storeId', { storeId });
  return result.rowsAffected[0];
}
