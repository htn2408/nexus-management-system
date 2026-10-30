import { query, queryOne, queryRows } from '../config/database.js';

const COLUMNS = `
  FeedbackID AS feedbackId, AccountID AS accountId, OrderID AS orderId, CustomerID AS customerId,
  CustomerName AS customerName, Rating AS rating, Category AS category, Message AS message,
  Status AS status, CreatedAt AS createdAt, Response AS response, RespondedBy AS respondedBy,
  RespondedAt AS respondedAt`;

export function findAll() {
  return queryRows(`SELECT ${COLUMNS} FROM dbo.Feedback ORDER BY CreatedAt DESC`);
}

export function findById(feedbackId) {
  return queryOne(`SELECT ${COLUMNS} FROM dbo.Feedback WHERE FeedbackID = @feedbackId`, { feedbackId });
}

/** Phản hồi của một khách theo các mã tài khoản / mã khách của họ, mới nhất trước. */
export function findByAccountsOrCustomer(accountIds, customerId) {
  const params = { customerId };
  const placeholders = accountIds.map((id, index) => {
    params[`a${index}`] = id;
    return `@a${index}`;
  });
  const accountCondition = placeholders.length > 0 ? `AccountID IN (${placeholders.join(', ')}) OR ` : '';

  return queryRows(
    `SELECT ${COLUMNS} FROM dbo.Feedback
     WHERE ${accountCondition} (@customerId IS NOT NULL AND CustomerID = @customerId)
     ORDER BY CreatedAt DESC`,
    params
  );
}

export async function insert(feedback) {
  await query(
    `INSERT INTO dbo.Feedback
       (FeedbackID, AccountID, OrderID, CustomerID, CustomerName, Rating, Category, Message, Status, CreatedAt)
     VALUES
       (@feedbackId, @accountId, @orderId, @customerId, @customerName, @rating, @category, @message, @status, @now)`,
    { ...feedback, now: new Date() }
  );
}

export async function updateResponse(feedbackId, { response, respondedBy, status, respondedAt }) {
  await query(
    `UPDATE dbo.Feedback SET
       Response = @response, RespondedBy = @respondedBy, Status = @status,
       RespondedAt = COALESCE(@respondedAt, RespondedAt)
     WHERE FeedbackID = @feedbackId`,
    { feedbackId, response, respondedBy, status, respondedAt }
  );
}

export async function remove(feedbackId) {
  const result = await query('DELETE FROM dbo.Feedback WHERE FeedbackID = @feedbackId', { feedbackId });
  return result.rowsAffected[0];
}

// ==================== Kiểm tra khoá ngoại ====================

/** AccountID đang lưu trong CSDL khớp với một trong các dạng mã, hoặc null. */
export async function findStoredAccountId(candidates) {
  const params = {};
  const placeholders = candidates.map((id, index) => {
    params[`c${index}`] = id;
    return `@c${index}`;
  });
  const row = await queryOne(
    `SELECT TOP 1 AccountID AS accountId FROM dbo.CustomerConnection WHERE AccountID IN (${placeholders.join(', ')})`,
    params
  );
  return row?.accountId ?? null;
}

export async function orderExists(orderId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.Orders WHERE OrderID = @orderId', { orderId })) !== null;
}

export async function customerExists(customerId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.Customer WHERE CustomerID = @customerId', { customerId })) !== null;
}

export async function employeeExists(employeeId) {
  return (await queryOne('SELECT 1 AS found FROM dbo.Employee WHERE EmployeeID = @employeeId', { employeeId })) !== null;
}
