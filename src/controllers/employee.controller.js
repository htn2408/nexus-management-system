import * as employeeService from '../services/employee.service.js';

export async function list(req, res) {
  res.json(await employeeService.list(req.query));
}

/** GET /api/retail/staff */
export async function branchDirectory(req, res) {
  res.json(await employeeService.branchDirectory());
}

export async function search(req, res) {
  res.json(await employeeService.searchByKeyword(req.query.keyword));
}

export async function filter(req, res) {
  res.json(await employeeService.filter(req.query));
}

export async function getById(req, res) {
  res.json(await employeeService.getById(req.params.id));
}

export async function create(req, res) {
  const employee = await employeeService.create(req.body);
  res.status(201).location(`${req.baseUrl}/${encodeURIComponent(employee.employeeId)}`).json(employee);
}

export async function update(req, res) {
  res.json(await employeeService.update(req.params.id, req.body));
}

export async function deactivate(req, res) {
  res.json(await employeeService.deactivate(req.params.id));
}
