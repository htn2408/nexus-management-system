import * as feedbackService from '../services/feedback.service.js';

export async function list(req, res) {
  res.json(await feedbackService.list());
}

export async function create(req, res) {
  res.json(await feedbackService.create(req.body, req.user));
}

export async function respond(req, res) {
  res.json(await feedbackService.respond(req.params.id, req.body ?? {}));
}

export async function remove(req, res) {
  res.json(await feedbackService.remove(req.params.id));
}
