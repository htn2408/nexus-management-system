// Backup SQL Server + MongoDB từ Docker ra folder backups/<thời-gian>/ trên máy.
//   npm run db:backup
import fs from 'node:fs';
import path from 'node:path';
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

/** Thời gian theo giờ máy, dạng 20261027-153012, dùng làm tên folder backup. */
function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function backupSqlServer(container, config, outDir) {
  const fileName = `${config.sqlDatabase}.bak`;
  const containerFile = `${SQL_BACKUP_DIR}/${fileName}`;

  console.log(`\n[sql] Backup database ${config.sqlDatabase} trong container ${container}...`);
  docker(['exec', container, 'mkdir', '-p', SQL_BACKUP_DIR]);
  sqlcmd(
    container,
    config,
    `BACKUP DATABASE [${config.sqlDatabase}] TO DISK = N'${containerFile}' WITH INIT, FORMAT`
  );

  docker(['cp', `${container}:${containerFile}`, path.join(outDir, fileName)]);
  docker(['exec', '-u', '0', container, 'rm', '-f', containerFile]);
  return fileName;
}

function backupMongo(container, config, outDir) {
  const fileName = `${config.mongoDatabase}.archive.gz`;
  const containerFile = `${MONGO_TMP_DIR}/${fileName}`;

  console.log(`\n[mongo] Backup database ${config.mongoDatabase} trong container ${container}...`);
  docker([
    'exec',
    container,
    'mongodump',
    `--db=${config.mongoDatabase}`,
    `--archive=${containerFile}`,
    '--gzip',
  ]);

  docker(['cp', `${container}:${containerFile}`, path.join(outDir, fileName)]);
  docker(['exec', container, 'rm', '-f', containerFile]);
  return fileName;
}

function main() {
  const config = readDbConfig();
  ensureDockerRunning();

  // Tìm đủ cả hai container trước rồi mới tạo folder, tránh để lại folder backup dở dang.
  const sqlContainer = findRunningContainer(SQL_CONTAINERS);
  const mongoContainer = findRunningContainer(MONGO_CONTAINERS);

  const outDir = path.join(BACKUPS_ROOT, timestamp());
  fs.mkdirSync(outDir, { recursive: true });

  try {
    const files = [
      backupSqlServer(sqlContainer, config, outDir),
      backupMongo(mongoContainer, config, outDir),
    ];

    console.log(`\nBackup xong: ${outDir}`);
    for (const file of files) {
      const sizeKb = Math.ceil(fs.statSync(path.join(outDir, file)).size / 1024);
      console.log(`  - ${file} (${sizeKb} KB)`);
    }
  } catch (err) {
    fs.rmSync(outDir, { recursive: true, force: true });
    throw err;
  }
}

try {
  main();
} catch (err) {
  console.error(`\nBackup thất bại: ${err.message}`);
  process.exit(1);
}
