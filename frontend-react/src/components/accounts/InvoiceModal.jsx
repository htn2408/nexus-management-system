// Xem một hoá đơn đã lưu (vừa phát hành hoặc chọn từ danh sách) và xuất PDF.
import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Printer, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import BillStatusBadge from '../user/BillStatusBadge';
import { money } from './billMath';
import { exportBillPdf } from './exportBillPdf';

function Line({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between py-1.5 ${strong ? 'font-bold text-slate-900 dark:text-white' : ''}`}>
      <span className={strong ? '' : 'text-slate-500'}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export default function InvoiceModal({ bill, title, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = async () => {
    setIsExporting(true);
    try {
      const number = await exportBillPdf(bill);
      toast.success(isVi ? `Đã xuất ${number}.pdf` : `Exported ${number}.pdf`);
    } catch (err) {
      toast.error(isVi ? 'Không xuất được PDF' : 'Could not export the PDF', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs print:shadow-none print:border-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title ?? (isVi ? 'Hoá đơn' : 'Invoice')}
            </h3>
            <p className="font-mono text-slate-500 mt-0.5">{bill.invoiceNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white print:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <div className="font-bold text-slate-900 dark:text-white">{bill.customerName}</div>
          <div className="font-mono text-slate-500">{bill.accountId}</div>
          <div className="text-slate-500">
            {bill.planName} · {bill.billingMonth}
          </div>
          <div className="text-slate-500">
            {isVi ? 'Ngày lập' : 'Issued'} {bill.billingDate || '—'} · {isVi ? 'Hạn' : 'Due'} {bill.dueDate || '—'}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <Line label={isVi ? 'Tiền cọc' : 'Security deposit'} value={money(bill.securityDeposit)} />
          <Line label={isVi ? 'Cước tháng' : 'Monthly rental'} value={money(bill.monthlyRental)} />
          {bill.hourlyCharges > 0 && (
            <Line label={isVi ? 'Cước theo giờ' : 'Hourly charges'} value={money(bill.hourlyCharges)} />
          )}
          {bill.discountAmount > 0 && (
            <Line
              label={`${isVi ? 'Chiết khấu' : 'Discount'} (${bill.discountPercent}%)`}
              value={`−${money(bill.discountAmount)}`}
            />
          )}
          <Line label={isVi ? 'Tạm tính' : 'Subtotal'} value={money(bill.subtotal)} />
          <Line
            label={`${isVi ? 'Thuế dịch vụ' : 'Service tax'} (${bill.serviceTaxRate}%)`}
            value={money(bill.serviceTaxAmount)}
          />
          {bill.lateFeeAmount > 0 && (
            <Line label={isVi ? 'Phí trễ hạn' : 'Late fee'} value={money(bill.lateFeeAmount)} />
          )}
          <Line label={isVi ? 'Tổng cộng' : 'Total'} value={money(bill.totalAmount)} strong />
          <Line label={isVi ? 'Đã thanh toán' : 'Paid'} value={money(bill.amountPaid)} />
          <Line label={isVi ? 'Còn nợ' : 'Due'} value={money(bill.dueAmount)} strong />
        </div>
        <div className="flex justify-end">
          <BillStatusBadge bill={bill} isVi={isVi} />
        </div>

        <div className="flex justify-end gap-2 pt-1 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            {isVi ? 'In' : 'Print'}
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isExporting ? (isVi ? 'Đang xuất...' : 'Exporting...') : isVi ? 'Xuất PDF' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
