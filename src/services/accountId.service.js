// Sinh Account ID chuẩn 16 ký tự: chữ cái loại kết nối + 3 số mã thành phố + 12 số serial
// toàn hệ thống (theo spec). Phải gọi bên trong transaction SERIALIZABLE lúc ghi mã,
// để hai request cùng lúc không lấy trùng serial.
import * as orderRepository from '../repositories/order.repository.js';

const MAX_SERIAL = 999_999_999_999;

const PREFIXES = {
  BROADBAND: 'B',
  'DIAL-UP': 'D',
  DIALUP: 'D',
  LANDLINE: 'T',
  TELEPHONE: 'T',
};

export async function generateAccountId(connectionType, cityCode, executor) {
  const normalizedCityCode = String(cityCode ?? '').trim();
  if (!/^\d{3}$/.test(normalizedCityCode)) {
    throw new Error('CityCode must contain exactly three digits.');
  }

  const prefix = PREFIXES[String(connectionType ?? '').trim().toUpperCase()];
  if (!prefix) throw new Error(`Unsupported connection type '${connectionType}'.`);

  // Mã đã cấp cho kết nối + mã đã giữ chỗ trên đơn khả thi đều tính.
  const existing = await orderRepository.allAccountIds(executor);
  const maxSerial = existing.reduce((max, id) => Math.max(max, parseSerial(id)), 0);

  const nextSerial = maxSerial + 1;
  if (nextSerial > MAX_SERIAL) throw new Error('Account ID serial range is exhausted.');

  return `${prefix}${normalizedCityCode}${String(nextSerial).padStart(12, '0')}`;
}

/** 12 số serial của một Account ID (có hoặc không có gạch), 0 nếu sai định dạng. */
export function parseSerial(accountId) {
  const significant = String(accountId ?? '').replace(/[^\p{L}\p{N}]/gu, '');
  if (significant.length !== 16) return 0;
  const serial = significant.slice(4);
  return /^\d{12}$/.test(serial) ? Number(serial) : 0;
}
