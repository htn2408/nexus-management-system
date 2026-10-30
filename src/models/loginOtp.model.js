// Một mã OTP đăng nhập của khách hàng, collection "login_otps".
// Collection này dùng chung với bản ASP.NET nên tên field giữ kiểu PascalCase
// đúng như MongoDB C# driver đã ghi (AccountKey, CodeHash, ExpiresAt...).
import mongoose from 'mongoose';

const loginOtpSchema = new mongoose.Schema(
  {
    // Mã tài khoản đã chuẩn hoá (bỏ dấu gạch, viết hoa).
    AccountKey: { type: String, required: true },
    Email: { type: String, default: '' },
    CustomerName: { type: String, default: '' },
    // Chỉ lưu SHA-256 của mã, không lưu mã gốc.
    CodeHash: { type: String, required: true },
    CreatedAt: { type: Date, required: true },
    // MongoDB tự xoá document khi quá thời điểm này (TTL index bên dưới).
    ExpiresAt: { type: Date, required: true },
    Attempts: { type: Number, default: 0 },
    Used: { type: Boolean, default: false },
  },
  { collection: 'login_otps', versionKey: false }
);

// TTL index: Mongo tự dọn mã hết hạn, không cần job xoá thủ công.
loginOtpSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });
loginOtpSchema.index({ AccountKey: 1, CreatedAt: -1 });

export const LoginOtp = mongoose.model('LoginOtp', loginOtpSchema);
