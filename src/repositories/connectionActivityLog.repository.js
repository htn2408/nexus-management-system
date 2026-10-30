import { query, queryRows } from '../config/database.js';

/**
 * Ghi một dòng nhật ký thao tác trên kết nối. Gọi trong cùng transaction với thao tác
 * (executor = tx) để thao tác lỗi thì nhật ký cũng không được ghi.
 * entry: { accountId, actionType, oldValue?, newValue?, reason?, performedBy? }
 */
export async function insert(entry, executor = null) {
  await query(
    `INSERT INTO dbo.ConnectionActivityLog (AccountID, ActionType, OldValue, NewValue, Reason, PerformedBy, Timestamp)
     VALUES (@accountId, @actionType, @oldValue, @newValue, @reason, @performedBy, @timestamp)`,
    {
      accountId: entry.accountId,
      actionType: entry.actionType,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      reason: entry.reason ?? null,
      performedBy: entry.performedBy ?? null,
      timestamp: entry.timestamp ?? new Date(),
    },
    executor
  );
}

/** Nhật ký của một kết nối (theo các dạng mã có/không gạch), mới nhất trước, kèm tên người làm. */
export function findByAccount(accountIds) {
  const params = {};
  const placeholders = accountIds.map((id, index) => {
    params[`a${index}`] = id;
    return `@a${index}`;
  });
  return queryRows(
    `SELECT l.LogID AS logId, l.AccountID AS accountId, l.ActionType AS actionType, l.OldValue AS oldValue,
            l.NewValue AS newValue, l.Reason AS reason, l.PerformedBy AS performedBy,
            e.FullName AS performedByName, l.Timestamp AS timestamp
     FROM dbo.ConnectionActivityLog l
     LEFT JOIN dbo.Employee e ON e.EmployeeID = l.PerformedBy
     WHERE l.AccountID IN (${placeholders.join(', ')})
     ORDER BY l.Timestamp DESC, l.LogID DESC`,
    params
  );
}
