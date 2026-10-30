import { getPool } from '../config/database.js';
import { isMongoConnected } from '../config/mongo.js';

export async function pingSqlServer() {
  const pool = await getPool();
  await pool.request().query('SELECT 1 AS ok');
}

export function pingMongo() {
  return isMongoConnected();
}
