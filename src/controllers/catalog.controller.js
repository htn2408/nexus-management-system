// /api/catalog: gói cước và chi nhánh đang hoạt động, ai cũng đọc được.
import * as catalogService from '../services/catalog.service.js';

export async function plans(req, res) {
  res.json(await catalogService.activePlans());
}

export async function stores(req, res) {
  res.json(await catalogService.activeStores());
}
