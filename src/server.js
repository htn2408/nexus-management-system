// Điểm khởi động: kết nối database, mở HTTP + Socket.IO, tắt êm khi nhận tín hiệu dừng.
import http from 'node:http';
import { env } from './config/env.js';
import { getPool, closePool } from './config/database.js';
import { connectMongo, closeMongo } from './config/mongo.js';
import { createApp, corsOptions } from './app.js';
import { initSocket, closeSocket } from './sockets/index.js';

async function connectDatabases() {
  // Database chưa sẵn sàng thì vẫn cho API chạy, /api/health sẽ báo trạng thái.
  try {
    await getPool();
    console.log('[db] Đã kết nối SQL Server');
  } catch (err) {
    console.warn('[db] Chưa kết nối được SQL Server:', err.message);
  }

  try {
    await connectMongo();
    console.log('[db] Đã kết nối MongoDB');
  } catch (err) {
    console.warn('[db] Chưa kết nối được MongoDB:', err.message);
  }
}

async function start() {
  await connectDatabases();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server, corsOptions);

  server.listen(env.port, () => {
    console.log(`[server] Nexus API chạy tại http://localhost:${env.port}`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] Nhận ${signal}, đang tắt...`);
    await closeSocket();
    server.close();
    await Promise.allSettled([closePool(), closeMongo()]);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[server] Khởi động thất bại:', err);
  process.exit(1);
});
