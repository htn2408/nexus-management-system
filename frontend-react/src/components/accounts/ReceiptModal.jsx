// Biên lai của một khoản thanh toán; "In biên lai" mở hộp thoại in của trình duyệt.
import { Printer, ShieldCheck, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import { money } from './billMath';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 dark:text-white text-right">{children || '—'}</span>
    </div>
  );
}

export default function ReceiptModal({ payment: p, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs print:shadow-none print:border-0">
        <div className="text-center">
          <ShieldCheck className="h-8 w-8 mx-auto text-emerald-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {isVi ? 'Biên lai thanh toán' : 'Payment receipt'}
          </h3>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {money(p.amountPaid)}
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <Row label={isVi ? 'Mã giao dịch' : 'Payment ID'}>
            <span className="font-mono">{p.paymentId}</span>
          </Row>
          <Row label={isVi ? 'Ngày' : 'Date'}>{p.paymentDate}</Row>
          <Row label={isVi ? 'Khách hàng' : 'Customer'}>{p.customerName}</Row>
          <Row label={isVi ? 'Mã tài khoản' : 'Account ID'}>
            <span className="font-mono">{p.accountId}</span>
          </Row>
          <Row label={isVi ? 'Hoá đơn' : 'Invoice'}>
            <span className="font-mono">{p.invoiceNumber}</span>
          </Row>
          <Row label={isVi ? 'Gói cước' : 'Plan'}>{p.planName}</Row>
          <Row label={isVi ? 'Hình thức' : 'Mode'}>{p.paymentMode}</Row>
          <Row label={isVi ? 'Mã tham chiếu' : 'Reference'}>{p.referenceNumber}</Row>
          <Row label={isVi ? 'Người ghi nhận' : 'Recorded by'}>{p.recordedBy}</Row>
        </div>
        <div className="flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" />
            {isVi ? 'Đóng' : 'Close'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="h-3.5 w-3.5" />
            {isVi ? 'In biên lai' : 'Print receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
