import { isMongoError } from '../config/mongo.js';
import { AppError } from './AppError.js';

/**
 * Chạy `work`; nếu MongoDB không sẵn sàng thì ném 503 kèm câu thông báo riêng của module
 * (thay vì để lỗi 500 khó hiểu). Frontend bắt mã này để báo "tạm thời không khả dụng".
 */
export async function withMongo(work, unavailableMessage) {
  try {
    return await work();
  } catch (err) {
    if (isMongoError(err)) {
      console.error('[mongo] Không kết nối được MongoDB:', err.message);
      throw AppError.serviceUnavailable(unavailableMessage);
    }
    throw err;
  }
}
