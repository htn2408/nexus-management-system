import { Router } from 'express';
import * as adminInventoryController from '../../controllers/adminInventory.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  createInventorySchema,
  restockSchema,
  updateInventorySchema,
} from '../../validators/admin.validator.js';

const router = Router();

router.get(['/', '/displayInventory'], adminInventoryController.list);
router.get(['/stats', '/dashboardStats'], adminInventoryController.stats);
router.get('/overview', adminInventoryController.overview);
router.get('/low-stock', adminInventoryController.lowStock);
router.get('/:id', adminInventoryController.getById);
router.post('/', validate(createInventorySchema), adminInventoryController.create);
router.put('/:id', validate(updateInventorySchema), adminInventoryController.update);
router.post('/:id/restock', validate(restockSchema), adminInventoryController.restock);
router.delete('/:id', adminInventoryController.remove);

export default router;
