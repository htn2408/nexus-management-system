// Khôi phục SQL Server + MongoDB từ một bản backup trong folder backups/.
//   npm run db:restore                      → bản backup mới nhất
//   npm run db:restore -- 20261027-153012   → bản backup chỉ định
//   thêm --yes để bỏ qua bước xác nhận
//
// CẢNH BÁO: restore GHI ĐÈ toàn bộ dữ liệu hiện tại của cả hai database.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {
  MONGO_CONTAINERS,
  MONGO_TMP_DIR,
  SQL_BACKUP_DIR,
  SQL_CONTAINERS,
  docker,
  ensureDockerRunning,
  findRunningContainer,
  readDbConfig,
  sqlcmd,
} from './lib/docker.js';

const BACKUPS_ROOT = path.resolve('backups');

function listBackups() {
  if (!fs.existsSync(BACKUPS_ROOT)) return [];
  return fs
    .readdirSync(BACKUPS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function resolveBackupDir(name) {
  const backups = listBackups();
  if (backups.length === 0) {
    throw new Error(`Chưa có bản backup nào trong ${BACKUPS_ROOT}. Chạy npm run db:backup trước.`);
  }

  const chosen = name ?? backups.at(-1);
  if (!backups.includes(chosen)) {
    throw new Error(`Không có bản backup "${chosen}". Các bản hiện có:\n  ${backups.join('\n  ')}`);
  }
  return { name: chosen, dir: path.join(BACKUPS_ROOT, chosen) };
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

function restoreSqlServer(container, config, backupFile) {
  const containerFile = `${SQL_BACKUP_DIR}/restore-${config.sqlDatabase}.bak`;
  const db = config.sqlDatabase;

  console.log(`\n[sql] Restore database ${db} vào container ${container}...`);
  docker(['exec', container, 'mkdir', '-p', SQL_BACKUP_DIR]);
  docker(['cp', backupFile, `${container}:${containerFile}`]);
  // docker cp tạo file với owner root; mở quyền đọc để tiến trình SQL Server (user mssql) đọc được.
  docker(['exec', '-u', '0', container, 'chmod', '644', containerFile]);

  try {
    // Đá các kết nối đang mở (VD API đang chạy) ra để restore được, xong thì mở lại.
    // Restore lỗi giữa chừng cũng phải trả database về MULTI_USER, không thì app không vào được.
    sqlcmd(
      container,
      config,
      `IF DB_ID(N'${db}') IS NOT NULL ALTER DATABASE [${db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
       BEGIN TRY
         RESTORE DATABASE [${db}] FROM DISK = N'${containerFile}' WITH REPLACE;
         ALTER DATABASE [${db}] SET MULTI_USER;
       END TRY
       BEGIN CATCH
         IF DB_ID(N'${db}') IS NOT NULL ALTER DATABASE [${db}] SET MULTI_USER;
         THROW;
       END CATCH`
    );
  } finally {
    docker(['exec', '-u', '0', container, 'rm', '-f', containerFile]);
  }
}

function restoreMongo(container, config, backupFile) {
  const containerFile = `${MONGO_TMP_DIR}/restore-${config.mongoDatabase}.archive.gz`;

  console.log(`\n[mongo] Restore database ${config.mongoDatabase} vào container ${container}...`);
  docker(['cp', backupFile, `${container}:${containerFile}`]);

  try {
    // --drop: xoá collection hiện có trước khi nạp, để kết quả giống hệt lúc backup.
    docker([
      'exec',
      container,
      'mongorestore',
      `--archive=${containerFile}`,
      '--gzip',
      '--drop',
      `--nsInclude=${config.mongoDatabase}.*`,
    ]);
  } finally {
    docker(['exec', '-u', '0', container, 'rm', '-f', containerFile]);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skipConfirm = args.includes('--yes');
  const backupName = args.find((arg) => !arg.startsWith('--'));

  const config = readDbConfig();
  const backup = resolveBackupDir(backupName);

  const sqlFile = path.join(backup.dir, `${config.sqlDatabase}.bak`);
  const mongoFile = path.join(backup.dir, `${config.mongoDatabase}.archive.gz`);
  const hasSql = fs.existsSync(sqlFile);
  const hasMongo = fs.existsSync(mongoFile);
  if (!hasSql && !hasMongo) {
    throw new Error(`Folder ${backup.dir} không có file backup nào.`);
  }

  ensureDockerRunning();
  const sqlContainer = hasSql ? findRunningContainer(SQL_CONTAINERS) : null;
  const mongoContainer = hasMongo ? findRunningContainer(MONGO_CONTAINERS) : null;

  console.log(`Sẽ restore bản backup ${backup.name}:`);
  if (hasSql) console.log(`  - SQL Server: ${config.sqlDatabase} (container ${sqlContainer})`);
  if (hasMongo) console.log(`  - MongoDB:    ${config.mongoDatabase} (container ${mongoContainer})`);
  console.log('Toàn bộ dữ liệu hiện tại của các database trên sẽ bị GHI ĐÈ.');

  if (!skipConfirm && !(await confirm('Gõ "yes" để tiếp tục: '))) {
    console.log('Đã huỷ.');
    return;
  }

  if (hasSql) restoreSqlServer(sqlContainer, config, sqlFile);
  if (hasMongo) restoreMongo(mongoContainer, config, mongoFile);

  console.log(`\nRestore xong từ bản backup ${backup.name}.`);
}

main().catch((err) => {
  console.error(`\nRestore thất bại: ${err.message}`);
  process.exit(1);
});
