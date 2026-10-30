// Các API dưới /api/Technical ngoài đơn hàng: dashboard, kết nối, thiết bị, tồn kho.
import * as connectionService from '../services/connection.service.js';
import * as dashboardService from '../services/dashboard.service.js';
import * as equipmentService from '../services/equipment.service.js';
import * as inventoryService from '../services/inventory.service.js';
import { toNumber } from '../validators/helpers.js';

// ---- Dashboard ----

export async function dashboard(req, res) {
  res.json(await dashboardService.technicalDashboard());
}

// ---- Kết nối ----

export async function provideConnection(req, res) {
  res.json(await connectionService.provide(req.params.id, req.body));
}

export async function listConnections(req, res) {
  res.json(await connectionService.list(req.query));
}

export async function getConnection(req, res) {
  res.json(await connectionService.getById(req.params.accountId));
}

export async function connectionActivityLogs(req, res) {
  res.json(await connectionService.activityLogs(req.params.accountId));
}

export async function upsertConnection(req, res) {
  res.json(await connectionService.createOrUpdate(req.body));
}

export async function updateConnectionStatus(req, res) {
  res.json(await connectionService.updateStatus(req.params.accountId, req.body));
}

// ---- Thiết bị ----

export async function listEquipment(req, res) {
  res.json(await equipmentService.list(req.query));
}

export async function getEquipment(req, res) {
  res.json(await equipmentService.getById(req.params.id));
}

export async function createEquipment(req, res) {
  const result = await equipmentService.create(req.body);
  res.status(201).location(`${req.baseUrl}/equipment/${encodeURIComponent(result.equipmentId)}`).json(result);
}

export async function updateEquipment(req, res) {
  res.json(await equipmentService.update(req.params.id, req.body));
}

export async function deleteEquipment(req, res) {
  await equipmentService.remove(req.params.id);
  res.status(204).end();
}

// ---- Tồn kho ----

export async function listInventory(req, res) {
  const lowStockOnly = String(req.query.lowStockOnly).toLowerCase() === 'true';
  res.json(await inventoryService.list(req.query.category, lowStockOnly));
}

export async function getInventory(req, res) {
  res.json(await inventoryService.getById(req.params.id));
}

export async function updateInventory(req, res) {
  res.json(await inventoryService.update(req.params.id, req.body));
}

export async function adjustInventory(req, res) {
  const quantityChange = Math.trunc(toNumber(req.body.quantityChange) ?? 0);
  res.json(await inventoryService.adjustStock(req.params.id, quantityChange, req.body.reason));
}
