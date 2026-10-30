import * as healthRepository from '../repositories/health.repository.js';

/** Kiểm tra từng database; một cái hỏng thì vẫn báo trạng thái của cái còn lại. */
export async function getHealth() {
  let sqlServer = 'up';
  try {
    await healthRepository.pingSqlServer();
  } catch {
    sqlServer = 'down';
  }

  const mongo = healthRepository.pingMongo() ? 'up' : 'down';

  return {
    status: sqlServer === 'up' && mongo === 'up' ? 'ok' : 'degraded',
    sqlServer,
    mongo,
    uptimeSeconds: Math.round(process.uptime()),
  };
}
