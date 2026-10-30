// Xuất PDF một hoá đơn đã lưu: lấy bản mới nhất từ server (kể cả thanh toán vừa ghi);
// server chưa trả lời thì dùng bản đang hiện trên màn hình.
import { fetchBillByIdApi } from '../../lib/api';
import { billToInvoicePdfData, exportInvoicePdf } from '../../lib/invoicePdf';

export async function exportBillPdf(bill) {
  let source = bill;
  try {
    const latest = await fetchBillByIdApi(bill.invoiceNumber);
    if (latest?.invoiceNumber) source = { ...bill, ...latest, id: latest.billId ?? bill.id };
  } catch (err) {
    console.warn('[Invoice PDF] Không lấy được bản mới nhất, dùng dữ liệu đang hiện:', err);
  }
  const data = billToInvoicePdfData(source);
  await exportInvoicePdf(data, `${data.invoiceNumber}.pdf`);
  return data.invoiceNumber;
}
