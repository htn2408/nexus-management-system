// Tìm đơn hàng theo một ô từ khoá: mã đơn, mã tài khoản, tên khách (có hoặc không dấu), SĐT,
// email, số giấy tờ, địa chỉ, tên gói, loại kết nối, chi nhánh, trạng thái, số hoá đơn.
import { getPlanName } from '../../lib/planI18n.js';
import { orderStatusLabel } from '../../types/nexus.js';

export function normalizeSearchText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim();
}

const digitsOf = (text) => (text ?? '').replace(/\D/g, '');

// Khớp cả cụm hoặc khớp từng từ (gõ "nguyen nam" vẫn ra "Nguyễn Văn Nam").
function matchesWords(haystack, normQuery, words) {
  return haystack.includes(normQuery) || (words.length > 1 && words.every((w) => haystack.includes(w)));
}

export function orderMatchesSearch(order, query, { bills, language }) {
  const raw = query.trim().toLowerCase();
  if (!raw) return true;
  const norm = normalizeSearchText(raw);
  const words = norm.split(/\s+/).filter(Boolean);
  const digits = digitsOf(raw);

  if (order.id.toLowerCase().includes(raw)) return true;
  if (order.assignedAccountId?.toLowerCase().includes(raw)) return true;

  const customer = normalizeSearchText(order.customerName);
  if (matchesWords(customer, norm, words)) return true;

  if (order.customerPhone?.toLowerCase().includes(raw)) return true;
  if (digits && digitsOf(order.customerPhone).includes(digits)) return true;
  if (order.customerEmail?.toLowerCase().includes(raw)) return true;
  if (order.idProofNumber?.toLowerCase().includes(raw)) return true;
  if (digits && digitsOf(order.idProofNumber).includes(digits)) return true;
  if (matchesWords(normalizeSearchText(order.installationAddress), norm, words)) return true;

  if (normalizeSearchText(order.planName).includes(norm)) return true;
  if (normalizeSearchText(getPlanName({ name: order.planName }, language)).includes(norm)) return true;
  if (normalizeSearchText(order.connectionType).includes(norm)) return true;
  if (order.retailOutletCode?.toLowerCase().includes(raw)) return true;
  if (normalizeSearchText(orderStatusLabel(order.status, language)).includes(norm)) return true;

  // Hoá đơn của chính khách này
  return bills.some((b) => {
    const sameCustomer =
      (b.accountId && order.assignedAccountId && b.accountId === order.assignedAccountId) ||
      normalizeSearchText(b.customerName) === customer;
    if (!sameCustomer) return false;
    return b.invoiceNumber.toLowerCase().includes(raw) || b.id.toLowerCase().includes(raw) || (digits && digitsOf(b.invoiceNumber).includes(digits));
  });
}
