// Điểm duy nhất biến lỗi thành HTTP response. Express 5 tự chuyển lỗi của
// async controller về đây nên controller không cần try/catch.
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

// Mã lỗi SQL Server → thông báo cho người dùng.
const SQL_CONFLICT_MESSAGES = {
  // FOREIGN KEY / CHECK constraint
  547: 'Thao tác vi phạm ràng buộc dữ liệu (bản ghi đang được dữ liệu khác tham chiếu hoặc giá trị không hợp lệ).',
  // UNIQUE constraint / unique index
  2627: 'Dữ liệu bị trùng với một bản ghi đã có.',
  2601: 'Dữ liệu bị trùng với một bản ghi đã có.',
};

export function notFoundHandler(req, res, next) {
  next(AppError.notFound(`Không tìm thấy endpoint ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, ...err.extra });
  }

  // Body JSON sai cú pháp (express.json() ném ra).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Body JSON không hợp lệ' });
  }

  // Vi phạm ràng buộc của SQL Server: báo 409 dễ hiểu thay vì 500.
  const sqlConflict = SQL_CONFLICT_MESSAGES[err.number];
  if (err.name === 'RequestError' && sqlConflict) {
    console.warn(`[sql] ${req.method} ${req.originalUrl}: ${err.message}`);
    return res.status(409).json({ message: sqlConflict });
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({
    message: 'Lỗi máy chủ, vui lòng thử lại sau',
    ...(env.isProduction ? {} : { detail: err.message }),
  });
}
