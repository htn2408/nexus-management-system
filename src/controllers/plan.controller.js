import * as planService from '../services/plan.service.js';

export async function list(req, res) {
  res.json(await planService.list(req.query));
}

export function listByType(connectionType) {
  return async (req, res) => {
    res.json(await planService.listByType(connectionType, req.query.search));
  };
}

export async function stats(req, res) {
  res.json(await planService.stats());
}

export async function getById(req, res) {
  res.json(await planService.getById(req.params.id));
}

export async function create(req, res) {
  const plan = await planService.create(req.body);
  res.status(201).location(`${req.baseUrl}/${encodeURIComponent(plan.planId)}`).json(plan);
}

export async function update(req, res) {
  res.json(await planService.update(req.params.id, req.body));
}

export async function remove(req, res) {
  res.json(await planService.remove(req.params.id));
}
