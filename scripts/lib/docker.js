// Hàm dùng chung cho script backup/restore: gọi docker CLI, tìm container, chạy sqlcmd.
import { spawnSync } from 'node:child_process';

// Hai stack (bản Node và bản ASP.NET) dùng chung volume dữ liệu, nên container
// đang chạy có thể là của bên nào cũng được. Thứ tự = thứ tự ưu tiên.
export const SQL_CONTAINERS = ['nexus_node_sqlserver', 'nexus_sqlserver'];
export const MONGO_CONTAINERS = ['nexus_node_mongodb', 'nexus_mongodb'];

// Thư mục tạm bên trong container để chứa file trước khi copy ra/vào máy.
export const SQL_BACKUP_DIR = '/var/opt/mssql/backup';
export const MONGO_TMP_DIR = '/tmp';

/**
 * Chạy `docker <args>`. Mặc định in thẳng output ra terminal;
 * capture = true thì trả về stdout (dùng khi cần đọc kết quả).
 */
export function docker(args, { capture = false, env } = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: env ? { ...process.env, ...env } : process.env,
  });

  if (result.error) {
    throw new Error(`Không chạy được lệnh docker: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = capture ? (result.stderr || result.stdout || '').trim() : '';
    throw new Error(`docker ${args[0]} thất bại (mã ${result.status})${detail ? `: ${detail}` : ''}`);
  }
  return capture ? result.stdout.trim() : '';
}

export function ensureDockerRunning() {
  try {
    docker(['info', '--format', '{{.ServerVersion}}'], { capture: true });
  } catch {
    throw new Error('Docker chưa chạy. Bật Docker Desktop rồi thử lại.');
  }
}

export function findRunningContainer(candidates) {
  const running = docker(['ps', '--format', '{{.Names}}'], { capture: true }).split(/\r?\n/);
  const name = candidates.find((candidate) => running.includes(candidate));
  if (!name) {
    throw new Error(
      `Không có container nào đang chạy trong: ${candidates.join(', ')}.\n` +
        'Chạy "docker compose up -d sqlserver mongodb" trước.'
    );
  }
  return name;
}

/**
 * Chạy một câu T-SQL bằng sqlcmd bên trong container SQL Server.
 * Mật khẩu và câu query truyền qua biến môi trường để khỏi lo escape dấu nháy.
 * Image mới có sqlcmd ở mssql-tools18 (cần -C để tin chứng chỉ tự ký), image cũ ở mssql-tools.
 */
export function sqlcmd(container, { user, password }, query) {
  const script =
    'if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then ' +
    'exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U "$DB_USER" -P "$DB_PASSWORD" -C -b -Q "$QUERY"; ' +
    'else exec /opt/mssql-tools/bin/sqlcmd -S localhost -U "$DB_USER" -P "$DB_PASSWORD" -b -Q "$QUERY"; fi';

  docker(
    ['exec', '-e', 'DB_USER', '-e', 'DB_PASSWORD', '-e', 'QUERY', container, 'bash', '-c', script],
    { env: { DB_USER: user, DB_PASSWORD: password, QUERY: query } }
  );
}

/** Đọc cấu hình database từ .env (script chạy với --env-file-if-exists=.env). */
export function readDbConfig() {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (!user || !password) {
    throw new Error('Thiếu DB_USER hoặc DB_PASSWORD. Tạo file .env từ .env.example trước.');
  }

  const sqlDatabase = process.env.DB_NAME || 'NexusSystem';
  const mongoDatabase = process.env.MONGO_DB || 'NexusChat';

  // Tên database được ghép thẳng vào câu T-SQL nên chỉ chấp nhận ký tự an toàn.
  for (const name of [sqlDatabase, mongoDatabase]) {
    if (!/^[A-Za-z0-9_]+$/.test(name)) {
      throw new Error(`Tên database không hợp lệ: "${name}"`);
    }
  }

  return { user, password, sqlDatabase, mongoDatabase };
}
