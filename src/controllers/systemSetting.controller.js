import * as systemSettingService from '../services/systemSetting.service.js';

export async function list(req, res) {
  res.json(await systemSettingService.list());
}

export async function upsert(req, res) {
  res.json(await systemSettingService.upsert(req.params.key, req.body));
}
