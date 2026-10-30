import { Router } from 'express';
import * as retailStoreController from '../../controllers/retailStore.controller.js';
import { validate } from '../../middlewares/validate.js';
import { retailShopSchema } from '../../validators/admin.validator.js';

const router = Router();

router.get(['/', '/displayRetailShops'], retailStoreController.list);
router.get(['/stats', '/dashboardStats'], retailStoreController.stats);
router.get('/:id', retailStoreController.getById);
router.post('/', validate(retailShopSchema), retailStoreController.create);
router.put('/:id', validate(retailShopSchema), retailStoreController.update);
router.delete('/:id', retailStoreController.remove);

export default router;
