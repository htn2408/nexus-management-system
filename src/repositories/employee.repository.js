import { getPool, query, queryOne, queryRows, sql } from '../config/database.js';
import { containsPattern, likeAny, whereClause } from '../utils/sqlFilters.js';

/** Nhân viên theo email, kèm PasswordHash để đối chiếu khi đăng nhập. */
export async function findByEmail(email) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.VarChar(100), email)
    .query(`
      SELECT TOP 1 EmployeeID AS employeeId, FullName AS fullName, Email AS email,
                   Role AS role, StoreID AS storeId, PasswordHash AS passwordHash
      FROM dbo.Employee
      WHERE Email = @email`);
  return result.recordset[0] ?? null;
}

export async function existsByEmail(email) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.VarChar(100), email)
    .query('SELECT TOP 1 1 AS found FROM dbo.Employee WHERE Email = @email');
  return result.recordset.length > 0;
}

export async function existsByPhone(phone) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('phone', sql.VarChar(30), phone)
    .query('SELECT TOP 1 1 AS found FROM dbo.Employee WHERE Phone = @phone');
  return result.recordset.length > 0;
}

// ==================== Quản trị nhân viên ====================

// Kèm tên cửa hàng được phân công.
const SELECT = `
  SELECT e.EmployeeID AS employeeId, e.EmployeeCode AS employeeCode, e.FullName AS fullName,
         e.Email AS email, e.Phone AS phone, e.Role AS role, e.Department AS department,
         e.StoreID AS storeId, s.Name AS storeName, e.Status AS status, e.DateOfJoining AS dateOfJoining,
         e.AvatarUrl AS avatarUrl, e.Address AS address, e.Gender AS gender,
         e.DateOfBirth AS dateOfBirth, e.Bio AS bio, e.CreatedAt AS createdAt, e.UpdatedAt AS updatedAt
  FROM dbo.Employee e
  LEFT JOIN dbo.RetailStore s ON s.StoreID = e.StoreID`;

const SEARCH_COLUMNS = ['e.FullName', 'e.EmployeeCode', 'e.Email', 'e.Phone', 'e.EmployeeID'];

/** filters: { search?, role?, department?, status?, storeId? }; null = không lọc. */
export function findAll({ search, role, department, status, storeId } = {}) {
  const conditions = [];
  const params = {};

  if (search) {
    conditions.push(likeAny(SEARCH_COLUMNS));
    params.search = containsPattern(search);
  }
  for (const [column, name, value] of [
    ['e.Role', 'role', role],
    ['e.Department', 'department', department],
    ['e.Status', 'status', status],
    ['e.StoreID', 'storeId', storeId],
  ]) {
    if (value) {
      conditions.push(`${column} = @${name}`);
      params[name] = value;
    }
  }

  return queryRows(`${SELECT} ${whereClause(conditions)} ORDER BY e.EmployeeCode`, params);
}

/** Tìm theo EmployeeID hoặc EmployeeCode. */
export function findByIdOrCode(id) {
  return queryOne(`${SELECT} WHERE e.EmployeeID = @id OR e.EmployeeCode = @id`, { id });
}

export function findById(employeeId) {
  return queryOne(`${SELECT} WHERE e.EmployeeID = @employeeId`, { employeeId });
}

/** Email đã thuộc nhân viên khác (trừ excludeEmployeeId) hoặc khách hàng nào chưa. */
export async function emailTaken(email, excludeEmployeeId = null) {
  const row = await queryOne(
    `SELECT CASE
       WHEN EXISTS (SELECT 1 FROM dbo.Employee WHERE Email = @email
                    AND (@exclude IS NULL OR EmployeeID <> @exclude)) THEN 1
       WHEN EXISTS (SELECT 1 FROM dbo.Customer WHERE Email = @email) THEN 1
       ELSE 0 END AS taken`,
    { email, exclude: excludeEmployeeId }
  );
  return row.taken === 1;
}

export async function count() {
  return (await queryOne('SELECT COUNT(*) AS total FROM dbo.Employee')).total;
}

export async function existsById(employeeId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.Employee WHERE EmployeeID = @employeeId', { employeeId })) !== null;
}

/** Nhân viên tồn tại và đang Active (dùng khi gán người kiểm tra / thực hiện thao tác kỹ thuật). */
export async function existsActive(employeeId, executor = null) {
  const row = await queryOne(
    "SELECT 1 AS found FROM dbo.Employee WHERE EmployeeID = @employeeId AND Status = 'Active'",
    { employeeId },
    executor
  );
  return row !== null;
}

/**
 * Cửa hàng mà chuỗi hiển thị "Tên cửa hàng (SH-01)" nhắc tới (chứa mã hoặc tên cửa hàng).
 * Dùng khi frontend chỉ gửi chuỗi retailShopAssigned mà không gửi storeId.
 * Thứ tự ưu tiên: mã nằm nguyên trong ngoặc "(SH-10)", rồi mã dài nhất có trong chuỗi
 * (mã "SH-1" cũng là chuỗi con của "SH-10"), cuối cùng là tên dài nhất
 * (tránh "E2E Store" lấn "E2E Store 2 (SH-09)").
 */
export async function findStoreIdMentionedIn(text) {
  const row = await queryOne(
    `SELECT TOP 1 StoreID AS storeId FROM dbo.RetailStore
     WHERE CHARINDEX(StoreID, @text) > 0 OR CHARINDEX(Name, @text) > 0
     ORDER BY CASE WHEN CHARINDEX('(' + StoreID + ')', @text) > 0 THEN 0
                   WHEN CHARINDEX(StoreID, @text) > 0 THEN 1
                   ELSE 2 END,
              CASE WHEN CHARINDEX(StoreID, @text) > 0 THEN LEN(StoreID) ELSE 0 END DESC,
              LEN(Name) DESC`,
    { text }
  );
  return row?.storeId ?? null;
}

export async function insert(employee) {
  await query(
    `INSERT INTO dbo.Employee
       (EmployeeID, EmployeeCode, FullName, Email, Phone, PasswordHash, Role, Department,
        StoreID, Status, DateOfJoining, CreatedAt)
     VALUES
       (@employeeId, @employeeCode, @fullName, @email, @phone, @passwordHash, @role, @department,
        @storeId, @status, CAST(@dateOfJoining AS DATE), @now)`,
    { ...employee, now: new Date() }
  );
}

/**
 * Cập nhật hồ sơ. dateOfJoining / passwordHash = null nghĩa là giữ nguyên giá trị cũ.
 */
export async function update(employeeId, employee) {
  await query(
    `UPDATE dbo.Employee SET
       Email = @email, FullName = @fullName, Phone = @phone, Role = @role,
       Department = @department, Status = @status, StoreID = @storeId,
       DateOfJoining = COALESCE(CAST(@dateOfJoining AS DATE), DateOfJoining),
       PasswordHash = COALESCE(@passwordHash, PasswordHash),
       UpdatedAt = @now
     WHERE EmployeeID = @employeeId`,
    { ...employee, employeeId, now: new Date() }
  );
}

export async function setStatus(employeeId, status) {
  await query('UPDATE dbo.Employee SET Status = @status, UpdatedAt = @now WHERE EmployeeID = @employeeId', {
    employeeId,
    status,
    now: new Date(),
  });
}

// ==================== Hồ sơ cá nhân (profile) ====================

export function findProfileById(employeeId) {
  return queryOne(
    `SELECT EmployeeID AS employeeId, EmployeeCode AS employeeCode, FullName AS fullName, Email AS email,
            Phone AS phone, PasswordHash AS passwordHash, Role AS role, Department AS department,
            StoreID AS storeId, Status AS status, DateOfJoining AS dateOfJoining, AvatarUrl AS avatarUrl,
            Address AS address, Gender AS gender, DateOfBirth AS dateOfBirth, Bio AS bio,
            CreatedAt AS createdAt, UpdatedAt AS updatedAt
     FROM dbo.Employee WHERE EmployeeID = @employeeId`,
    { employeeId }
  );
}

/** Cập nhật họ tên / email / điện thoại; field null thì giữ nguyên. */
export async function updateContact(employeeId, { fullName, email, phone }) {
  await query(
    `UPDATE dbo.Employee SET
       FullName = COALESCE(@fullName, FullName), Email = COALESCE(@email, Email), Phone = COALESCE(@phone, Phone)
     WHERE EmployeeID = @employeeId`,
    { employeeId, fullName, email, phone }
  );
}

export async function updatePasswordHash(employeeId, passwordHash) {
  await query('UPDATE dbo.Employee SET PasswordHash = @passwordHash WHERE EmployeeID = @employeeId', {
    employeeId,
    passwordHash,
  });
}
