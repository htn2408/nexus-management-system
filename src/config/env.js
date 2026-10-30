// Đọc cấu hình từ biến môi trường một lần duy nhất, các tầng khác chỉ import `env`
// thay vì gọi process.env rải rác. Thiếu biến bắt buộc thì dừng ngay lúc khởi động.

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function toBool(value) {
  return String(value).toLowerCase() === 'true';
}

function toList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = Object.freeze({
  nodeEnv: optional('NODE_ENV', 'development'),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  port: Number(optional('PORT', '5105')),
  corsOrigins: toList(optional('CORS_ORIGINS', '')),
  // Chạy sau reverse proxy (nginx...) thì đặt, VD "loopback" hoặc "1", để req.ip là IP thật của
  // người dùng (giới hạn đăng nhập sai tính theo IP). Để trống = không tin header X-Forwarded-For.
  trustProxy: optional('TRUST_PROXY', ''),
  // Swagger UI tại /api-docs. Đặt "false" để tắt.
  apiDocs: toBool(optional('API_DOCS', 'true')),

  db: {
    server: optional('DB_SERVER', 'localhost'),
    port: Number(optional('DB_PORT', '1433')),
    database: optional('DB_NAME', 'NexusSystem'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    encrypt: toBool(optional('DB_ENCRYPT', 'false')),
    trustServerCertificate: toBool(optional('DB_TRUST_SERVER_CERTIFICATE', 'true')),
  },

  mongo: {
    uri: optional('MONGO_URI', 'mongodb://localhost:27017'),
    database: optional('MONGO_DB', 'NexusChat'),
  },

  jwt: {
    key: required('JWT_KEY'),
    issuer: optional('JWT_ISSUER', 'nexus-system-api'),
    expiresInMinutes: Number(optional('JWT_EXPIRES_IN_MINUTES', '480')),
  },

  email: buildEmailConfig(),
});

function buildEmailConfig() {
  const host = optional('EMAIL_HOST', 'smtp.gmail.com');
  const user = optional('EMAIL_USER', '');
  const password = optional('EMAIL_PASSWORD', '');

  return {
    host,
    port: Number(optional('EMAIL_PORT', '587')),
    user,
    password,
    fromName: optional('EMAIL_FROM_NAME', 'Nexus Telecom'),
    // Để trống thì gửi bằng chính địa chỉ EMAIL_USER.
    fromAddress: optional('EMAIL_FROM_ADDRESS', user),
    timeoutSeconds: Number(optional('EMAIL_TIMEOUT_SECONDS', '15')),
    // Nơi ghi email khi chưa cấu hình SMTP.
    logDir: optional('EMAIL_LOG_DIR', 'logs/emails'),
    // Chưa điền user/password ⇒ coi như chưa cấu hình, email ghi ra file thay vì gửi thật.
    isConfigured: Boolean(host && user && password),
  };
}
