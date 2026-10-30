// Tính tiền bằng số thập phân chính xác (decimal.js), không cộng trừ bằng `number` của JS
// (0.1 + 0.2 !== 0.3). Mọi phép tính hoá đơn / thanh toán đi qua các hàm ở đây.
import Decimal from 'decimal.js';

/** Chuyển giá trị (number từ CSDL, chuỗi, null) thành Decimal; null/undefined ⇒ 0. */
export function dec(value) {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return new Decimal(value instanceof Decimal ? value : String(value));
}

/**
 * Làm tròn 2 chữ số, .5 làm tròn ra xa số 0 — giống MidpointRounding.AwayFromZero của bản
 * ASP.NET và Number.toFixed(2) bên frontend, để dòng thuế không lệch 1 cent.
 */
export function roundCurrency(value) {
  return dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Decimal → number 2 chữ số để trả JSON / ghi vào cột DECIMAL(18, 2). */
export function toMoney(value) {
  return Number(roundCurrency(value).toFixed(2));
}

export { Decimal };
