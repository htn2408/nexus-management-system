// Ghép địa chỉ lắp đặt thành một dòng: "số nhà đường, phường, quận, tỉnh".
export function formatAddress({ province, district, ward, specific }) {
  return [specific, ward, district, province].filter(Boolean).join(', ');
}
