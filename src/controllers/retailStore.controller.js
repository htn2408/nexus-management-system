import * as retailStoreService from '../services/retailStore.service.js';

export async function list(req, res) {
  res.json(await retailStoreService.list(req.query));
}

export async function stats(req, res) {
  res.json(await retailStoreService.stats());
}

export async function getById(req, res) {
  res.json(await retailStoreService.getById(req.params.id));
}

export async function create(req, res) {
  const store = await retailStoreService.create(req.body);
  res.status(201).location(`${req.baseUrl}/${encodeURIComponent(store.storeId)}`).json(store);
}

export async function update(req, res) {
  res.json(await retailStoreService.update(req.params.id, req.body));
}

export async function remove(req, res) {
  res.json(await retailStoreService.remove(req.params.id));
}
