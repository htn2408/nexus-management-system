import * as adminInventoryService from '../services/adminInventory.service.js';
import { toNumber } from '../validators/helpers.js';

export async function list(req, res) {
  res.json(await adminInventoryService.list(req.query));
}

export async function stats(req, res) {
  res.json(await adminInventoryService.stats());
}

export async function overview(req, res) {
  res.json(await adminInventoryService.overview(req.query.search));
}

export async function lowStock(req, res) {
  res.json(await adminInventoryService.lowStock());
}

export async function getById(req, res) {
  res.json(await adminInventoryService.getById(req.params.id));
}

export async function create(req, res) {
  const item = await adminInventoryService.create(req.body);
  res.status(201).location(`${req.baseUrl}/${encodeURIComponent(item.inventoryId)}`).json(item);
}

export async function update(req, res) {
  res.json(await adminInventoryService.update(req.params.id, req.body));
}

export async function restock(req, res) {
  res.json(await adminInventoryService.restock(req.params.id, toNumber(req.body.quantity)));
}

export async function remove(req, res) {
  res.json(await adminInventoryService.remove(req.params.id));
}
