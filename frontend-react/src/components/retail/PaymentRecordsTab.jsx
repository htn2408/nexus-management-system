// Sổ cái hoá đơn của mọi thuê bao; bấm một hoá đơn để thu tiền tại quầy.
import { useState } from 'react';
import { Search } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';
import BillStatusBadge from '../user/BillStatusBadge';

export default function PaymentRecordsTab({ onOpenPayment }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const bills = useStore(nexusStore.bills);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = bills.filter(
    (b) =>
      !q ||
      b.accountId.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.invoiceNumber.toLowerCase().includes(q),
  );
  const pager = usePagination(filtered, 10);

  const headers = [
    isVi ? 'Mã hóa đơn' : 'Invoice Number',
    isVi ? 'Mã tài khoản 16 ký tự' : '16-character Account ID',
    isVi ? 'Tên thuê bao' : 'Subscriber Name',
    isVi ? 'Kỳ cước' : 'Billing Cycle',
    isVi ? 'Tổng tiền ($)' : 'Total Amount ($)',
    isVi ? 'Đã thanh toán ($)' : 'Amount Paid ($)',
    isVi ? 'Còn nợ ($)' : 'Due Balance ($)',
    isVi ? 'Trạng thái' : 'Payment Status',
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={isVi ? 'Lọc theo mã tài khoản, họ tên, số hóa đơn...' : 'Filter by Account ID, name, invoice...'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              pager.setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
        </div>
        <div className="text-xs text-slate-500">
          {isVi ? 'Bấm vào hóa đơn còn nợ để thu tiền tại quầy' : 'Click an unpaid invoice to take payment at the counter'}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    {isVi ? 'Không có hóa đơn nào khớp.' : 'No invoices match.'}
                  </td>
                </tr>
              ) : (
                pager.items.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer" onClick={() => onOpenPayment(bill)}>
                    <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">{bill.invoiceNumber}</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">{bill.accountId}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{bill.customerName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{bill.billingMonth}</td>
                    <td className="px-4 py-3 font-mono tabular-nums font-medium">${bill.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">${bill.amountPaid.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">${bill.dueAmount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <BillStatusBadge bill={bill} isVi={isVi} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination {...pager.props} />
    </div>
  );
}
