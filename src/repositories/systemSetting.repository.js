import { query, queryOne, queryRows } from '../config/database.js';

const COLUMNS = `
  SettingKey AS settingKey, SettingValue AS settingValue, Category AS category,
  DataType AS dataType, Description AS description, LastUpdated AS lastUpdated`;

export function findAll() {
  return queryRows(`SELECT ${COLUMNS} FROM dbo.SystemSettings`);
}

export function findByKey(key) {
  return queryOne(`SELECT ${COLUMNS} FROM dbo.SystemSettings WHERE SettingKey = @key`, { key });
}

/** Giá trị một tham số cấu hình, hoặc null nếu chưa có. */
export async function getValue(key, executor) {
  const row = await queryOne('SELECT SettingValue AS value FROM dbo.SystemSettings WHERE SettingKey = @key', { key }, executor);
  return row?.value ?? null;
}

export async function insert(setting) {
  await query(
    `INSERT INTO dbo.SystemSettings (SettingKey, SettingValue, Category, DataType, Description, LastUpdated)
     VALUES (@settingKey, @settingValue, @category, @dataType, @description, @now)`,
    { ...setting, now: new Date() }
  );
}

export async function updateValue(key, value) {
  await query(
    'UPDATE dbo.SystemSettings SET SettingValue = @value, LastUpdated = @now WHERE SettingKey = @key',
    { key, value, now: new Date() }
  );
}
