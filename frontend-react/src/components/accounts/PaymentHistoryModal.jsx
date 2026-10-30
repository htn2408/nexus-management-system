// Lịch sử thanh toán của một hoá đơn.
import { History, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import { money } from './billMath';

export default function PaymentHistoryModal({ bill, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const payments = bill.paymentHistory ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              {isVi ? 'Lịch sử thanh toán' : 'Payment history'}
            </h3>
            <p className="text-slate-500 mt-1">
              <span className="font-mono">{bill.invoiceNumber}</span> · {bill.customerName} · {isVi ? 'tổng' : 'total'}{' '}
              {money(bill.totalAmount)} · {isVi ? 'còn nợ' : 'due'} {money(bill.dueAmount)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {payments.length === 0 ? (
          <p className="text-slate-500 py-6 text-center">
            {isVi ? 'Chưa có khoản thanh toán nào.' : 'No payments yet.'}
          </p>
        ) : (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {payments.map((p) => (
              <div key={p.paymentId} className="flex justify-between gap-3 px-3 py-2">
                <div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">{p.paymentId}</div>
                  <div className="text-slate-500">
                    {p.paymentDate} · {p.paymentMode} · {p.referenceNumber || '—'}
                  </div>
                  <div className="text-slate-400">{p.recordedBy}</div>
                </div>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{money(p.amountPaid)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
