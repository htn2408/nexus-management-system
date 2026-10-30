import * as healthService from '../services/health.service.js';

export async function getHealth(req, res) {
  const health = await healthService.getHealth();
  res.status(health.status === 'ok' ? 200 : 503).json(health);
}
