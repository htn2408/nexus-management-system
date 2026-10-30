// Nhãn trạng thái hoá đơn: Đã thanh toán / Thanh toán 1 phần / Chưa thanh toán.
import { AlertCircle } from 'lucide-react';

export default function BillStatusBadge({ bill, isVi, showDue = false }) {
  if (bill.status === 'Paid') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        {isVi ? 'Đã thanh toán' : 'Paid'}
      </span>
    );
  }
  if (bill.status === 'Partially Paid') {
    return (
      <span className="inline-flex flex-col items-center">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>{isVi ? 'Thanh toán 1 phần' : 'Partially Paid'}</span>
        </span>
        {showDue && (
          <span className="text-[10px] text-slate-500 mt-0.5 font-mono">
            {isVi ? `Còn nợ $${bill.dueAmount.toFixed(2)}` : `Due $${bill.dueAmount.toFixed(2)}`}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
      {isVi ? 'Chưa thanh toán' : 'Unpaid'}
    </span>
  );
}
