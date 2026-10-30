// Một thông báo gửi tới đúng một "người nhận" (Audience), collection "notifications".
// Một sự kiện nghiệp vụ có thể sinh NHIỀU document: mỗi bên nhận một bản riêng,
// nhờ vậy Admin đọc rồi không làm mất chấm đỏ của Bán lẻ.
//
// Collection dùng chung với bản ASP.NET nên giữ đúng cấu trúc C# driver đã ghi:
// _id là chuỗi "NTF-{guid}", các field còn lại PascalCase.
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    // "role:admin" | "role:retail" | "role:technical" | "role:accounts" | "account:<mã tài khoản>"
    Audience: { type: String, required: true },
    // order | billing | alert | hardware | system | stock | chat | feedback
    Type: { type: String, default: 'system' },
    TitleVi: { type: String, default: '' },
    TitleEn: { type: String, default: '' },
    DescVi: { type: String, default: '' },
    DescEn: { type: String, default: '' },
    // Đường dẫn dashboard và tab mà thông báo trỏ tới, VD "/retail" + "approval-queue".
    TargetPath: { type: String, default: '/' },
    TargetTab: { type: String, default: '' },
    // Role cần có để vào được TargetPath (frontend tự chuyển role nếu lệch).
    TargetRole: { type: String, default: null },
    SectionVi: { type: String, default: '' },
    SectionEn: { type: String, default: '' },
    // Mã bản ghi liên quan (mã đơn, số hoá đơn, mã phiên chat...) để mở thẳng.
    EntityId: { type: String, default: null },
    // Thông báo mới cùng ReplaceKey sẽ XOÁ bản cũ chưa đọc (VD "kho sắp hết", "khách nhắn tin").
    ReplaceKey: { type: String, default: null },
    Read: { type: Boolean, default: false },
    CreatedAt: { type: Date, required: true },
    // Mốc TTL index tự xoá document: thông báo chỉ giữ 30 ngày.
    ExpiresAt: { type: Date, required: true },
  },
  { collection: 'notifications', versionKey: false }
);

// Truy vấn chính: thông báo của một người nhận, mới nhất lên đầu.
notificationSchema.index({ Audience: 1, CreatedAt: -1 });
notificationSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.model('Notification', notificationSchema);
