// Lỗi nghiệp vụ có kèm HTTP status. Service chỉ việc `throw AppError.notFound(...)`,
// errorHandler sẽ chuyển thành response { message, ...extra } với đúng status code.
export class AppError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message thông báo cho người dùng
   * @param {object} [extra] field bổ sung gộp vào response, VD { errors } hoặc { resendAfterSeconds }
   */
  constructor(status, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.extra = extra;
  }

  /** errors: lỗi theo từng field, VD { email: ['Email không hợp lệ'] }. */
  static badRequest(message, errors) {
    return new AppError(400, message, errors ? { errors } : {});
  }

  static unauthorized(message = 'Bạn cần đăng nhập') {
    return new AppError(401, message);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
    return new AppError(403, message);
  }

  static notFound(message = 'Không tìm thấy dữ liệu') {
    return new AppError(404, message);
  }

  static conflict(message) {
    return new AppError(409, message);
  }

  static tooManyRequests(message, retryAfterSeconds) {
    return new AppError(429, message, { resendAfterSeconds: retryAfterSeconds });
  }

  static serviceUnavailable(message) {
    return new AppError(503, message);
  }
}
