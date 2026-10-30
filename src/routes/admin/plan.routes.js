import { Router } from 'express';
import * as planController from '../../controllers/plan.controller.js';
import { validate } from '../../middlewares/validate.js';
import { planSchema } from '../../validators/admin.validator.js';

const router = Router();

// Các route tĩnh phải đứng trước "/:id".
router.get(['/', '/displayPlans', '/displayPlan'], planController.list);
router.get('/landline', planController.listByType('Landline'));
router.get('/broadband', planController.listByType('Broadband'));
router.get('/dial-up', planController.listByType('Dial-Up'));
router.get(['/stats', '/dashboardStats'], planController.stats);
router.get('/:id', planController.getById);
router.post('/', validate(planSchema), planController.create);
router.put('/:id', validate(planSchema), planController.update);
router.delete('/:id', planController.remove);

export default router;
