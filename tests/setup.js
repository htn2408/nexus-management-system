// Nạp trước mọi file test (node --import): đặt biến môi trường tối thiểu để src/config/env.js
// không dừng vì thiếu cấu hình. Test không kết nối database thật.
process.env.NODE_ENV ??= 'test';
process.env.DB_USER ??= 'test';
process.env.DB_PASSWORD ??= 'test';
process.env.JWT_KEY ??= 'test-only-jwt-key-that-is-long-enough-for-hs256';
process.env.JWT_ISSUER ??= 'nexus-system-api-test';
// Để trống SMTP ⇒ email service chạy chế độ ghi file, không gửi thật.
process.env.EMAIL_USER = '';
process.env.EMAIL_PASSWORD = '';
