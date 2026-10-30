import { Router } from 'express';
import * as purchaseOrderController from '../../controllers/purchaseOrder.controller.js';
import { validate } from '../../middlewares/validate.js';
import { createPurchaseOrderSchema, purchaseOrderStatusSchema } from '../../validators/admin.validator.js';

const router = Router();

router.get('/', purchaseOrderController.list);
router.get('/:id', purchaseOrderController.getById);
router.post('/', validate(createPurchaseOrderSchema), purchaseOrderController.create);
router.put('/:id/status', validate(purchaseOrderStatusSchema), purchaseOrderController.updateStatus);
router.delete('/:id', purchaseOrderController.remove);

export default router;
