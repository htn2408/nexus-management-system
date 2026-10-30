// Gom hoá đơn theo mã tài khoản (so sánh bỏ dấu gạch, không phân biệt hoa thường).
const accountKey = (id) => (id ?? '').replace(/-/g, '').toUpperCase();

export function billsForAccount(bills, accountId) {
  if (!accountId) return [];
  const key = accountKey(accountId);
  return bills.filter((b) => accountKey(b.accountId) === key);
}

export const totalDue = (bills) => bills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

// Hoá đơn cũ nhất còn nợ — hoá đơn cần thu trước khi khách đến quầy.
export function oldestUnpaidBill(bills) {
  return bills
    .filter((b) => b.dueAmount > 0)
    .sort((a, b) => (a.billingMonth || '').localeCompare(b.billingMonth || '') || a.invoiceNumber.localeCompare(b.invoiceNumber))[0];
}
