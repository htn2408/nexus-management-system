import * as vendorService from '../services/vendor.service.js';

export async function list(req, res) {
  res.json(await vendorService.list(req.query));
}

export async function stats(req, res) {
  res.json(await vendorService.stats());
}

export async function getById(req, res) {
  res.json(await vendorService.getById(req.params.id));
}

export async function create(req, res) {
  const vendor = await vendorService.create(req.body);
  res.status(201).location(`${req.baseUrl}/${encodeURIComponent(vendor.vendorId)}`).json(vendor);
}

export async function update(req, res) {
  res.json(await vendorService.update(req.params.id, req.body));
}

export async function remove(req, res) {
  res.json(await vendorService.remove(req.params.id));
}
