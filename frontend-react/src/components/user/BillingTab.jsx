// Tab hoá đơn của khách: tổng nợ, lọc theo trạng thái và bảng lịch sử hoá đơn.
import { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Filter, Wallet } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useCustomerAccount } from '../../hooks/useCustomerAccount';
import { useStore } from '../../lib/store';
import BillStatusBadge from './BillStatusBadge';

const FILTERS = [
  {
    id: 'all',
    vi: 'Tất cả',
    en: 'All',
    active: 'bg-sky-600 text-white shadow-xs',
    idle: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
  },
  {
    id: 'unpaid',
    vi: 'Chưa thanh toán & Còn nợ',
    en: 'Unpaid',
    icon: AlertCircle,
    active: 'bg-rose-600 text-white shadow-xs',
    idle: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40',
  },
  {
    id: 'paid',
    vi: 'Đã thanh toán',
    en: 'Paid',
    icon: CheckCircle2,
    active: 'bg-emerald-600 text-white shadow-xs',
    idle: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
  },
];

export default function BillingTab({ onPayBill, onOpenTab }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const { myBills, unpaidBills, totalDue } = useCustomerAccount();
  const [filter, setFilter] = useState('all');

  const counts = { all: myBills.length, unpaid: unpaidBills.length, paid: myBills.length - unpaidBills.length };
  const shown = myBills.filter((b) => (filter === 'unpaid' ? b.status !== 'Paid' : filter === 'paid' ? b.status === 'Paid' : true));

  const headers = [
    [isVi ? 'Số hóa đơn' : 'Invoice', ''],
    [isVi ? 'Kỳ cước & Gói' : 'Month & Plan', ''],
    [isVi ? 'Tổng cước' : 'Total', 'text-right'],
    [isVi ? 'Đã trả' : 'Paid', 'text-right'],
    [isVi ? 'Cước chưa thanh toán' : 'Outstanding Due', 'text-right text-rose-600 dark:text-rose-400'],
    [isVi ? 'Hạn thanh toán' : 'Due date', 'text-center'],
    [isVi ? 'Trạng thái' : 'Status', 'text-center'],
    [isVi ? 'Thao tác' : 'Action', 'text-right'],
  ];

  return (
    <div className="space-y-6">
      {totalDue > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-sky-500/10 border border-rose-300 dark:border-rose-800/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isVi ? 'Hóa đơn & Cước phí chưa thanh toán' : 'Unpaid Invoices & Outstanding Charges'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white font-mono">${totalDue.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isVi
                  ? `Quý khách hiện có ${unpaidBills.length} hóa đơn chưa thanh toán hoặc thanh toán 1 phần. Vui lòng thanh toán cước phí để duy trì dịch vụ liên tục và không phát sinh phí chậm trả.`
                  : `You currently have ${unpaidBills.length} unpaid or partially paid invoice(s). Please settle outstanding balance to maintain uninterrupted services.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenTab('pay-balance')}
            className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center space-x-2 shrink-0 self-start md:self-auto"
          >
            <Wallet className="h-4 w-4" />
            <span>{isVi ? 'Thanh toán số dư ngay' : 'Pay Balance Now'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-sm overflow-hidden p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#0F1D2B] dark:text-white flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <span>{isVi ? 'Lịch sử hóa đơn & cước phí' : 'Billing & Invoices History'}</span>
          </h3>
          <p className="text-xs text-[#537292] dark:text-[#8DB0D4] mt-0.5">
            {isVi
              ? 'Danh sách toàn bộ các hóa đơn định kỳ, cước phí chưa thanh toán và đã thanh toán'
              : 'Complete record of recurring invoices, due amounts, and payment status'}
          </p>
        </div>

        <div className="flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800 text-xs whitespace-nowrap">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider shrink-0 mr-1 inline-flex items-center space-x-1">
            <Filter className="h-3 w-3" />
            <span>{isVi ? 'Trạng thái:' : 'Status:'}</span>
          </span>
          {FILTERS.map(({ id, vi, en, icon: Icon, active, idle }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition shrink-0 whitespace-nowrap ${
                filter === id ? active : idle
              }`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              <span>
                {isVi ? vi : en} ({counts[id]})
              </span>
            </button>
          ))}
        </div>

        {shown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#EDF6FF] dark:bg-[#101C29] text-[#305070] dark:text-slate-300 uppercase tracking-wider">
                <tr>
                  {headers.map(([label, align]) => (
                    <th key={label} className={`px-4 py-3 font-semibold ${align}`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CCE4F7] dark:divide-[#253D56]">
                {shown.map((bill) => (
                  <tr key={bill.id} className="text-[#1B2D40] dark:text-[#E0F1FF] hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono font-bold text-sky-600 dark:text-sky-400">{bill.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{bill.billingMonth}</div>
                      <div className="text-[11px] text-slate-500">{bill.planName}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">${bill.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      ${bill.amountPaid.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-black text-sm ${
                        bill.dueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      ${bill.dueAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{bill.dueDate}</td>
                    <td className="px-4 py-3 text-center">
                      <BillStatusBadge bill={bill} isVi={isVi} showDue />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {bill.dueAmount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onPayBill(bill)}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-xs inline-flex items-center space-x-1"
                        >
                          <CreditCard className="h-3 w-3" />
                          <span>{isVi ? 'Thanh toán' : 'Pay'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold flex items-center space-x-1 justify-end">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{isVi ? 'Hoàn tất' : 'Settled'}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-slate-400 mb-2" />
            <p className="text-xs text-slate-500">
              {isVi ? 'Không có hóa đơn nào phù hợp với bộ lọc hiện tại.' : 'No invoices match this filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
