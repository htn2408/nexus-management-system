// Dựng SQL Server + MongoDB tạm bằng Docker cho test end-to-end, nạp schema và dữ liệu mẫu,
// rồi chạy API ngay trong tiến trình test. Mọi thứ bị xoá khi test xong.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docker } from '../../scripts/lib/docker.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SEED_FILE = path.join(ROOT, 'database', 'NexusSystem_Database.sql');
const SQL_IMAGE = 'mcr.microsoft.com/mssql/server:2022-latest';
const MONGO_IMAGE = 'mongo:7.0';
const SQLCMD = '/opt/mssql-tools18/bin/sqlcmd';
const READY_TIMEOUT_MS = 180_000;

// Mật khẩu dùng chung cho mọi tài khoản mẫu trong database tạm.
export const TEST_PASSWORD = 'E2e-Test-123';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function hostPort(container, containerPort) {
  // "127.0.0.1:49153" → 49153
  const mapping = docker(['port', container, `${containerPort}/tcp`], { capture: true }).split(/\r?\n/)[0];
  return Number(mapping.slice(mapping.lastIndexOf(':') + 1));
}

function sqlcmd(state, args) {
  return docker(
    ['exec', '-e', 'SQLCMDPASSWORD', state.sqlContainer, SQLCMD, '-S', 'localhost', '-U', 'sa', '-C', ...args],
    { capture: true, env: { SQLCMDPASSWORD: state.saPassword } }
  );
}

async function waitForSqlServer(state) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    try {
      sqlcmd(state, ['-Q', 'SELECT 1']);
      return;
    } catch (err) {
      if (Date.now() > deadline) throw new Error(`SQL Server không sẵn sàng sau ${READY_TIMEOUT_MS / 1000}s: ${err.message}`);
      await sleep(2000);
    }
  }
}

/** Khởi động container, nạp dữ liệu mẫu. Trả về state dùng cho startApi / teardown. */
export async function startDatabases() {
  const suffix = randomBytes(4).toString('hex');
  const state = {
    sqlContainer: `nexus_e2e_sql_${suffix}`,
    mongoContainer: `nexus_e2e_mongo_${suffix}`,
    // Đủ điều kiện độ phức tạp mật khẩu của SQL Server.
    saPassword: `E2e!${randomBytes(9).toString('base64url')}9a`,
    emailDir: fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-e2e-mail-')),
  };

  docker(['run', '-d', '--name', state.sqlContainer, '-e', 'ACCEPT_EULA=Y', '-e', 'MSSQL_SA_PASSWORD',
    '-e', 'MSSQL_PID=Developer', '-p', '127.0.0.1::1433', SQL_IMAGE], { capture: true, env: { MSSQL_SA_PASSWORD: state.saPassword } });
  docker(['run', '-d', '--name', state.mongoContainer, '-p', '127.0.0.1::27017', MONGO_IMAGE], { capture: true });

  state.sqlPort = hostPort(state.sqlContainer, 1433);
  state.mongoPort = hostPort(state.mongoContainer, 27017);

  await waitForSqlServer(state);
  docker(['cp', SEED_FILE, `${state.sqlContainer}:/tmp/seed.sql`], { capture: true });
  sqlcmd(state, ['-b', '-f', '65001', '-i', '/tmp/seed.sql']);

  return state;
}

/**
 * Đặt biến môi trường trỏ vào database tạm rồi mới import code ứng dụng (env.js đọc cấu hình
 * lúc import), sau đó chạy API trên một cổng ngẫu nhiên. Trả về { baseUrl, stop }.
 */
export async function startApi(state) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DB_SERVER: '127.0.0.1',
    DB_PORT: String(state.sqlPort),
    DB_NAME: 'NexusSystem',
    DB_USER: 'sa',
    DB_PASSWORD: state.saPassword,
    MONGO_URI: `mongodb://127.0.0.1:${state.mongoPort}`,
    MONGO_DB: 'NexusChat',
    JWT_KEY: randomBytes(32).toString('hex'),
    JWT_ISSUER: 'nexus-system-api-e2e',
    EMAIL_USER: '',
    EMAIL_PASSWORD: '',
    EMAIL_LOG_DIR: state.emailDir,
    CORS_ORIGINS: '',
  });

  const { getPool, closePool, query } = await import('../../src/config/database.js');
  const { connectMongo, closeMongo } = await import('../../src/config/mongo.js');
  const { createApp } = await import('../../src/app.js');
  const bcrypt = (await import('bcryptjs')).default;

  await getPool();
  await connectMongo();

  // Dữ liệu mẫu không công bố mật khẩu: đặt một mật khẩu test cho mọi tài khoản.
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);
  await query('UPDATE dbo.Employee SET PasswordHash = @hash', { hash });
  await query('UPDATE dbo.Customer SET PasswordHash = @hash WHERE Email IS NOT NULL', { hash });

  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await Promise.allSettled([closePool(), closeMongo()]);
    },
  };
}

export function stopDatabases(state) {
  if (!state) return;
  for (const container of [state.sqlContainer, state.mongoContainer]) {
    try {
      docker(['rm', '-fv', container], { capture: true });
    } catch {
      // Container có thể chưa kịp tạo nếu bước khởi động lỗi.
    }
  }
  fs.rmSync(state.emailDir, { recursive: true, force: true });
}

const otpFiles = (state) =>
  fs
    .readdirSync(state.emailDir)
    .filter((name) => name.includes('OTP'))
    .sort();

/** Số email OTP đã ghi ra file; gọi trước khi xin mã để biết mã nào là mới. */
export function otpCount(state) {
  return otpFiles(state).length;
}

/**
 * Chờ email OTP thứ (previousCount + 1) được ghi ra file rồi trả mã trong đó.
 * Server gửi email không chờ (fire-and-forget) nên phải đợi file xuất hiện; máy CI chậm
 * có thể mất hơn 1 giây, chờ cứng một khoảng ngắn sẽ lúc qua lúc không.
 */
export async function waitForOtp(state, previousCount, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const files = otpFiles(state);
    const match = files.length > previousCount ? /(\d{6})\.html$/.exec(files.at(-1)) : null;
    if (match) return match[1];
    if (Date.now() > deadline) throw new Error(`Không thấy email OTP mới sau ${timeoutMs / 1000}s`);
    await sleep(100);
  }
}
