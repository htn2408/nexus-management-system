import * as equipmentRequestService from '../services/equipmentRequest.service.js';

export async function list(req, res) {
  res.json(await equipmentRequestService.list(req.query));
}

export async function getById(req, res) {
  res.json(await equipmentRequestService.getById(req.params.id));
}

export async function create(req, res) {
  const request = await equipmentRequestService.create(req.body, req.user.id);
  res.status(201).location(`${req.baseUrl}/${encodeURIComponent(request.requestId)}`).json(request);
}

export async function updateStatus(req, res) {
  res.json(await equipmentRequestService.updateStatus(req.params.id, req.body));
}

export async function remove(req, res) {
  res.json(await equipmentRequestService.remove(req.params.id));
}
