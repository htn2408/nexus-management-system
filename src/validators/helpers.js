// Bộ luật nhỏ để viết validator cho từng API, thay cho DataAnnotations của bản ASP.NET.
// Mỗi luật nhận giá trị, trả về câu lỗi hoặc null.

/** Không gửi, null, hoặc chuỗi chỉ toàn khoảng trắng. Số / boolean luôn được coi là có giá trị. */
export function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/** Chuỗi số hoặc số đều được coi là số; trả về null nếu không phải. */
export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isMissing(value) {
  return value === undefined || value === null;
}

// Câu lỗi mặc định giống DataAnnotations của ASP.NET (dùng cho các DTO không tự đặt ErrorMessage).
export const defaultMessages = {
  required: (field) => `The ${field} field is required.`,
  maxLength: (field, max) => `The field ${field} must be a string with a maximum length of ${max}.`,
  range: (field, min, max) => `The field ${field} must be between ${min} and ${max}.`,
  number: (field) => `The value of ${field} is not a valid number.`,
  integer: (field) => `The value of ${field} is not a valid integer.`,
};

export const rules = {
  required: (message) => (value) => (isBlank(value) ? message : null),

  // Field có giá trị mặc định: không gửi thì dùng mặc định, gửi lên mà để trống thì báo lỗi.
  notBlank: (message) => (value) => (value !== undefined && isBlank(value) ? message : null),

  maxLength: (max, message) => (value) =>
    typeof value === 'string' && value.length > max ? message : null,

  /** Bỏ qua khi không gửi field; gửi lên thì phải là số. */
  number: (message) => (value) => (isMissing(value) || toNumber(value) !== null ? null : message),

  integer: (message) => (value) => {
    if (isMissing(value)) return null;
    const parsed = toNumber(value);
    return parsed !== null && Number.isInteger(parsed) ? null : message;
  },

  range: (min, max, message) => (value) => {
    if (isMissing(value)) return null;
    const parsed = toNumber(value);
    return parsed !== null && parsed >= min && parsed <= max ? null : message;
  },

  boolean: (message) => (value) => (isMissing(value) || typeof value === 'boolean' ? null : message),

  /** Bỏ qua khi không gửi / null; gửi lên thì phải là chuỗi ngày giờ hợp lệ. */
  date: (message) => (value) =>
    isMissing(value) || (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) ? null : message,

  oneOf: (allowed, message) => (value) =>
    isMissing(value) || value === '' || allowed.includes(value) ? null : message,

  pattern: (regex, message) => (value) =>
    typeof value === 'string' && !regex.test(value) ? message : null,

  // Giống [EmailAddress] của .NET: đúng một '@', không nằm ở đầu hay cuối chuỗi.
  email: (message) => (value) => {
    if (typeof value !== 'string' || value === '') return null;
    const at = value.indexOf('@');
    const valid = at > 0 && at === value.lastIndexOf('@') && at < value.length - 1;
    return valid ? null : message;
  },
};

/**
 * Dựng validator từ bảng luật theo field của req.body:
 *   bodySchema({ email: [rules.required('...'), rules.email('...')] })
 * Field trống thì chỉ báo lỗi "bắt buộc", không báo thêm lỗi định dạng.
 */
export function bodySchema(schema) {
  return (req) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const errors = {};

    for (const [field, fieldRules] of Object.entries(schema)) {
      const value = body[field];
      const messages = [];

      for (const rule of fieldRules) {
        const message = rule(value);
        if (message) messages.push(message);
        if (message && isBlank(value)) break;
      }

      if (messages.length > 0) errors[field] = messages;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };
}
