import * as purchaseOrderService from '../services/purchaseOrder.service.js';

export async function list(req, res) {
  res.json(await purchaseOrderService.list(req.query));
}

export async function getById(req, res) {
  res.json(await purchaseOrderService.getById(req.params.id));
}

export async function create(req, res) {
  const order = await purchaseOrderService.create(req.body, req.user?.id);
  res.status(201).location(`${req.baseUrl}/${encodeURIComponent(order.purchaseOrderId)}`).json(order);
}

export async function updateStatus(req, res) {
  res.json(await purchaseOrderService.updateStatus(req.params.id, req.body.status));
}

export async function remove(req, res) {
  res.json(await purchaseOrderService.remove(req.params.id));
}
