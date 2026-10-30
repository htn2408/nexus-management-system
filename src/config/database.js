// Connection pool SQL Server dùng chung cho cả ứng dụng. Chỉ tầng repository được
// import file này — service và controller không bao giờ đụng trực tiếp tới SQL.
import sql from 'mssql';
import { env } from './env.js';

const config = {
  server: env.db.server,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  options: {
    encrypt: env.db.encrypt,
    trustServerCertificate: env.db.trustServerCertificate,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise = null;

/** Trả về pool đã kết nối; lần gọi đầu sẽ mở kết nối, các lần sau dùng lại. */
export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
      // Kết nối hỏng thì cho phép lần gọi sau thử lại thay vì giữ promise lỗi mãi.
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/**
 * Chạy một câu SQL có tham số. `params` là { tên: giá trị } (mssql tự đoán kiểu)
 * hoặc { tên: { type, value } } khi cần chỉ rõ kiểu, VD { id: { type: sql.VarChar(20), value } }.
 * Truyền `executor` là transaction để câu lệnh chạy trong transaction đó.
 */
export async function query(text, params = {}, executor = null) {
  const request = (executor ?? (await getPool())).request();
  for (const [name, param] of Object.entries(params)) {
    if (param !== null && typeof param === 'object' && 'type' in param && 'value' in param) {
      request.input(name, param.type, param.value ?? null);
    } else {
      request.input(name, param === undefined ? null : param);
    }
  }
  return request.query(text);
}

/** Như query() nhưng trả về mảng dòng. */
export async function queryRows(text, params, executor) {
  return (await query(text, params, executor)).recordset;
}

/** Như query() nhưng trả về dòng đầu tiên, hoặc null. */
export async function queryOne(text, params, executor) {
  return (await query(text, params, executor)).recordset[0] ?? null;
}

export const IsolationLevel = sql.ISOLATION_LEVEL;

/**
 * Chạy `work` trong một transaction. Ném lỗi bất kỳ ⇒ rollback, xong ⇒ commit.
 * Dùng cho các thao tác nhiều bước như tạo đơn + sinh Order ID, cấp kết nối + sinh Account ID.
 * isolationLevel: VD IsolationLevel.SERIALIZABLE khi cần chặn hai request sinh trùng mã.
 */
export async function withTransaction(work, { isolationLevel } = {}) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(isolationLevel);
  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {
      // SQL Server có thể đã tự huỷ transaction khi lỗi; giữ lại lỗi gốc để báo ra ngoài.
    }
    throw err;
  }
}

export async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = null;
  await pool.close();
}

export { sql };
