// Chạy validator của tầng validators/ trước khi vào controller.
// Validator là hàm (req) => { field: ['lỗi', ...] } | null.
// Response lỗi giữ đúng dạng bản ASP.NET cũ để frontend không phải sửa:
// 400 { message: 'Dữ liệu gửi lên không hợp lệ', errors: { field: [...] } }
import { AppError } from '../utils/AppError.js';

export function validate(validator) {
  return (req, res, next) => {
    const errors = validator(req);
    if (errors && Object.keys(errors).length > 0) {
      return next(AppError.badRequest('Dữ liệu gửi lên không hợp lệ', errors));
    }
    next();
  };
}
