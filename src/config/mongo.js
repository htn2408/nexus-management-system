// MongoDB lưu chat, OTP (TTL index tự xoá mã hết hạn) và lịch sử thông báo.
import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectMongo() {
  await mongoose.connect(env.mongo.uri, { dbName: env.mongo.database });
}

export async function closeMongo() {
  await mongoose.disconnect();
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Lỗi do MongoDB / Mongoose ném ra (mất kết nối, hết thời gian chờ, lỗi server...).
 * Controller dùng để trả 503 thay vì 500 khi Mongo không sẵn sàng.
 */
export function isMongoError(err) {
  return typeof err?.name === 'string' && err.name.startsWith('Mongo');
}
