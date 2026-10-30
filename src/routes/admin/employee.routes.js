import { Router } from 'express';
import * as employeeController from '../../controllers/employee.controller.js';
import { validate } from '../../middlewares/validate.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../../validators/admin.validator.js';

const router = Router();

router.get(['/', '/displayEmployee'], employeeController.list);
router.get('/search', employeeController.search);
router.get('/filter', employeeController.filter);
router.get('/:id', employeeController.getById);
router.post('/', validate(createEmployeeSchema), employeeController.create);
router.put('/:id', validate(updateEmployeeSchema), employeeController.update);
router.delete('/:id', employeeController.deactivate);

export default router;
