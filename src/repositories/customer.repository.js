import { getPool, query, queryOne, sql } from '../config/database.js';

/** Khách hàng theo email, kèm PasswordHash (có thể NULL với khách chỉ đăng nhập bằng OTP). */
export async function findByEmail(email) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.VarChar(100), email)
    .query(`
      SELECT TOP 1 CustomerID AS customerId, FullName AS fullName, Email AS email,
                   ContactNumber AS contactNumber, PasswordHash AS passwordHash
      FROM dbo.Customer
      WHERE Email = @email`);
  return result.recordset[0] ?? null;
}

export async function existsByEmail(email) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('email', sql.VarChar(100), email)
    .query('SELECT TOP 1 1 AS found FROM dbo.Customer WHERE Email = @email');
  return result.recordset.length > 0;
}

export async function existsByPhone(phone) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('phone', sql.VarChar(30), phone)
    .query('SELECT TOP 1 1 AS found FROM dbo.Customer WHERE ContactNumber = @phone');
  return result.recordset.length > 0;
}

export async function existsById(customerId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('customerId', sql.VarChar(20), customerId)
    .query('SELECT TOP 1 1 AS found FROM dbo.Customer WHERE CustomerID = @customerId');
  return result.recordset.length > 0;
}

// ==================== Luồng đặt đơn ====================

const PROFILE_COLUMNS = `
  CustomerID AS customerId, FullName AS fullName, ContactNumber AS contactNumber, Email AS email,
  Address AS address, IdProofType AS idProofType, IdProofNumber AS idProofNumber`;

export function findProfileByEmail(email) {
  return queryOne(`SELECT TOP 1 ${PROFILE_COLUMNS} FROM dbo.Customer WHERE Email = @email`, {
    email: { type: sql.VarChar(100), value: email },
  });
}

export function findProfileByPhoneAndName(phone, fullName) {
  return queryOne(
    `SELECT TOP 1 ${PROFILE_COLUMNS} FROM dbo.Customer WHERE ContactNumber = @phone AND FullName = @fullName`,
    { phone: { type: sql.VarChar(30), value: phone }, fullName }
  );
}

/** Hồ sơ khách tạo lúc đặt đơn tại quầy / tự đăng ký đơn. */
export async function insertFromOrder(customer, executor) {
  await query(
    `INSERT INTO dbo.Customer
       (CustomerID, FullName, ContactNumber, Email, Address, IdProofType, IdProofNumber, CreatedAt, UpdatedAt)
     VALUES
       (@customerId, @fullName, @contactNumber, @email, @address, @idProofType, @idProofNumber, @now, @now)`,
    { ...customer, now: new Date() },
    executor
  );
}

/** Cập nhật hồ sơ bằng thông tin mới nhất khách vừa khai trên form đặt đơn. */
export async function updateFromOrder(customerId, fields, executor) {
  await query(
    `UPDATE dbo.Customer SET
       FullName = @fullName, ContactNumber = @contactNumber, Address = @address,
       IdProofType = @idProofType, IdProofNumber = @idProofNumber, UpdatedAt = @now
     WHERE CustomerID = @customerId`,
    { ...fields, customerId, now: new Date() },
    executor
  );
}

/** Thêm khách hàng mới (luồng tự đăng ký). Các cột còn lại dùng DEFAULT của bảng. */
export async function create(customer) {
  const pool = await getPool();
  await pool
    .request()
    .input('customerId', sql.VarChar(20), customer.customerId)
    .input('fullName', sql.NVarChar(100), customer.fullName)
    .input('email', sql.VarChar(100), customer.email)
    .input('contactNumber', sql.VarChar(30), customer.contactNumber)
    .input('passwordHash', sql.NVarChar(255), customer.passwordHash)
    .input('customerType', sql.VarChar(20), customer.customerType)
    .input('idProofType', sql.VarChar(50), customer.idProofType)
    .input('idProofNumber', sql.VarChar(50), customer.idProofNumber)
    .input('address', sql.NVarChar(255), customer.address)
    .input('status', sql.VarChar(20), customer.status)
    .query(`
      INSERT INTO dbo.Customer
        (CustomerID, FullName, Email, ContactNumber, PasswordHash,
         CustomerType, IdProofType, IdProofNumber, Address, Status)
      VALUES
        (@customerId, @fullName, @email, @contactNumber, @passwordHash,
         @customerType, @idProofType, @idProofNumber, @address, @status)`);
}

// ==================== Hồ sơ khách hàng (cổng khách hàng / profile) ====================

// Dùng alias "c" cho bảng Customer ở mọi câu truy vấn bên dưới.
const FULL_COLUMNS = `
  c.CustomerID AS customerId, c.FullName AS fullName, c.CustomerType AS customerType, c.Email AS email,
  c.ContactNumber AS contactNumber, c.Address AS address, c.BillingAddress AS billingAddress,
  c.TaxNumber AS taxNumber, c.IdProofType AS idProofType, c.IdProofNumber AS idProofNumber,
  c.Status AS status, c.PasswordHash AS passwordHash, c.CreatedAt AS createdAt, c.UpdatedAt AS updatedAt`;

export function findById(customerId) {
  return queryOne(`SELECT ${FULL_COLUMNS} FROM dbo.Customer c WHERE c.CustomerID = @customerId`, { customerId });
}

/** Khách sở hữu kết nối có một trong các dạng mã tài khoản đã cho. */
export function findByAccountIds(accountIds) {
  const params = {};
  const placeholders = accountIds.map((id, index) => {
    params[`a${index}`] = id;
    return `@a${index}`;
  });
  return queryOne(
    `SELECT TOP 1 ${FULL_COLUMNS}
     FROM dbo.CustomerConnection cc
     JOIN dbo.Orders o ON o.OrderID = cc.OrderID
     JOIN dbo.Customer c ON c.CustomerID = o.CustomerID
     WHERE cc.AccountID IN (${placeholders.join(', ')})`,
    params
  );
}

/** Email đã thuộc khách khác hoặc nhân viên nào chưa. */
export async function emailTakenByOther(email, customerId) {
  const row = await queryOne(
    `SELECT CASE
       WHEN EXISTS (SELECT 1 FROM dbo.Customer WHERE Email = @email AND CustomerID <> @customerId) THEN 1
       WHEN EXISTS (SELECT 1 FROM dbo.Employee WHERE Email = @email) THEN 1
       ELSE 0 END AS taken`,
    { email, customerId }
  );
  return row.taken === 1;
}

export async function phoneTakenByOther(phone, customerId) {
  const row = await queryOne(
    `SELECT CASE
       WHEN EXISTS (SELECT 1 FROM dbo.Customer WHERE ContactNumber = @phone AND CustomerID <> @customerId) THEN 1
       WHEN EXISTS (SELECT 1 FROM dbo.Employee WHERE Phone = @phone) THEN 1
       ELSE 0 END AS taken`,
    { phone, customerId }
  );
  return row.taken === 1;
}

/** Cập nhật thông tin liên hệ; field null thì giữ nguyên. */
export async function updateContact(customerId, { fullName, email, contactNumber, address }) {
  await query(
    `UPDATE dbo.Customer SET
       FullName = COALESCE(@fullName, FullName), Email = COALESCE(@email, Email),
       ContactNumber = COALESCE(@contactNumber, ContactNumber), Address = COALESCE(@address, Address),
       UpdatedAt = @now
     WHERE CustomerID = @customerId`,
    { customerId, fullName, email, contactNumber, address, now: new Date() }
  );
}

export async function updatePasswordHash(customerId, passwordHash) {
  await query('UPDATE dbo.Customer SET PasswordHash = @passwordHash WHERE CustomerID = @customerId', {
    customerId,
    passwordHash,
  });
}
