// Sinh mã định danh theo đúng kiểu bản ASP.NET đang dùng, để dữ liệu hai bản tạo ra trông như nhau.

// Số tick (100 ns) từ 01/01/0001 tới mốc Unix 01/01/1970, giống DateTime.Ticks của .NET.
const UNIX_EPOCH_TICKS = 621355968000000000n;

/** DateTime.UtcNow.Ticks dạng chuỗi (18 chữ số). */
export function dotnetTicks(date = new Date()) {
  return String(BigInt(date.getTime()) * 10000n + UNIX_EPOCH_TICKS);
}

/** Chuỗi hex 32 ký tự giống Guid.NewGuid().ToString("N"). */
export function guidN() {
  return crypto.randomUUID().replaceAll('-', '');
}
