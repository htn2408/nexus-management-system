import { Router } from 'express';
import * as systemSettingController from '../../controllers/systemSetting.controller.js';
import { validate } from '../../middlewares/validate.js';
import { systemSettingSchema } from '../../validators/admin.validator.js';

const router = Router();

router.get('/', systemSettingController.list);
router.put('/:key', validate(systemSettingSchema), systemSettingController.upsert);

export default router;
