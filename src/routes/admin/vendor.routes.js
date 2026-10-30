import { Router } from 'express';
import * as vendorController from '../../controllers/vendor.controller.js';
import { validate } from '../../middlewares/validate.js';
import { vendorSchema } from '../../validators/admin.validator.js';

const router = Router();

router.get(['/', '/displayVendor'], vendorController.list);
router.get(['/stats', '/dashboardStats'], vendorController.stats);
router.get('/:id', vendorController.getById);
router.post('/', validate(vendorSchema), vendorController.create);
router.put('/:id', validate(vendorSchema), vendorController.update);
router.delete('/:id', vendorController.remove);

export default router;
