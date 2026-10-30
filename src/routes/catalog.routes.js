// /api/catalog: không cần đăng nhập, chỉ đọc. Thêm/sửa/xoá vẫn chỉ Manager qua /api/admin.
import { Router } from 'express';
import * as catalogController from '../controllers/catalog.controller.js';

const router = Router();

router.get('/plans', catalogController.plans);
router.get('/stores', catalogController.stores);

export default router;
