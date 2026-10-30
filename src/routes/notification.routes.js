import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', notificationController.list);
router.get('/count', notificationController.count);
router.post('/read-all', notificationController.markAllRead);
router.post('/:id/read', notificationController.markRead);

export default router;
