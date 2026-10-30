// Theo dõi công nợ: danh sách hoá đơn theo trạng thái (sửa, xem, xuất PDF, ghi nhận thanh toán)
// và sổ thu tiền gồm mọi khoản thanh toán đã ghi.
import { useState } from 'react';
import { CreditCard, Download, Eye, FileText, History, Receipt, Search, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';
import BillStatusBadge from '../user/BillStatusBadge';
import { money } from './billMath';
import { exportBillPdf } from './exportBillPdf';

const FILTERS = [
  ['all', 'Tất cả', 'All'],
  ['Unpaid', 'Chưa thanh toán', 'Unpaid'],
  ['Partially Paid', 'Một phần', 'Partially paid'],
  ['Paid', 'Đã thanh toán', 'Paid'],
];
const ICON_BTN =
  'p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800';

export default function SubscriberTrackingTab({ onView, onEdit, onHistory, onPay, onReceipt }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const bills = useStore(nexusStore.bills);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentSearch, setPaymentSearch] = useState('');

  const filteredBills = bills.filter((b) => statusFilter === 'all' || b.status === statusFilter);
  const billPager = usePagination(filteredBills, 10);
  const count = (status) => (status === 'all' ? bills.length : bills.filter((b) => b.status === status).length);
  const outstanding = bills.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

  const payments = bills.flatMap((b) =>
    (b.paymentHistory ?? []).map((p) => ({
      ...p,
      customerName: b.customerName,
      accountId: b.accountId,
      invoiceNumber: b.invoiceNumber,
      planName: b.planName,
    })),
  );
  const collected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const q = paymentSearch.trim().toLowerCase();
  const filteredPayments = payments
    .filter(
      (p) =>
        !q ||
        [p.customerName, p.accountId, p.invoiceNumber, p.paymentId, p.referenceNumber, p.paymentMode].some((v) =>
          (v ?? '').toLowerCase().includes(q),
        ),
    )
    .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
  const paymentPager = usePagination(filteredPayments, 10);

  const exportPdf = async (bill) => {
    try {
      const number = await exportBillPdf(bill);
      toast.success(isVi ? `Đã xuất ${number}.pdf` : `Exported ${number}.pdf`);
    } catch (err) {
      toast.error(isVi ? 'Không xuất được PDF' : 'Could not export the PDF', {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              {isVi ? 'Hoá đơn & công nợ thuê bao' : 'Subscriber invoices & balances'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi ? 'Tổng còn nợ:' : 'Total outstanding:'}{' '}
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{money(outstanding)}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs">
            {FILTERS.map(([key, vi, en]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setStatusFilter(key);
                  billPager.setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  statusFilter === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {isVi ? vi : en} ({count(key)})
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">{isVi ? 'Hoá đơn' : 'Invoice'}</th>
                <th className="px-4 py-3">{isVi ? 'Thuê bao' : 'Subscriber'}</th>
                <th className="px-4 py-3">{isVi ? 'Kỳ cước' : 'Period'}</th>
                <th className="px-4 py-3 text-right">{isVi ? 'Tổng' : 'Total'}</th>
                <th className="px-4 py-3 text-right">{isVi ? 'Đã trả' : 'Paid'}</th>
                <th className="px-4 py-3 text-right">{isVi ? 'Còn nợ' : 'Due'}</th>
                <th className="px-4 py-3 text-center">{isVi ? 'Trạng thái' : 'Status'}</th>
                <th className="px-4 py-3 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    {isVi ? 'Không có hoá đơn nào.' : 'No invoices.'}
                  </td>
                </tr>
              ) : (
                billPager.items.map((bill) => (
                  <tr key={bill.invoiceNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                      {bill.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{bill.customerName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{bill.accountId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{bill.billingMonth}</td>
                    <td className="px-4 py-3 text-right font-mono">{money(bill.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {money(bill.amountPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {money(bill.dueAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <BillStatusBadge bill={bill} isVi={isVi} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      {bill.dueAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => onPay(bill)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white align-middle"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          {isVi ? 'Ghi nhận TT' : 'Record payment'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onView(bill)}
                        className={ICON_BTN}
                        title={isVi ? 'Xem hoá đơn' : 'View invoice'}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(bill)}
                        className={ICON_BTN}
                        title={isVi ? 'Sửa hoá đơn' : 'Edit invoice'}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onHistory(bill)}
                        className={ICON_BTN}
                        title={isVi ? 'Lịch sử thanh toán' : 'Payment history'}
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => exportPdf(bill)}
                        className={ICON_BTN}
                        title={isVi ? 'Xuất PDF' : 'Export PDF'}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination {...billPager.props} />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              {isVi ? 'Sổ thu tiền' : 'Payment ledger'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi ? `${payments.length} khoản · đã thu` : `${payments.length} payments · collected`}{' '}
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{money(collected)}</span>
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={paymentSearch}
              onChange={(e) => {
                setPaymentSearch(e.target.value);
                paymentPager.setPage(1);
              }}
              placeholder={
                isVi
                  ? 'Tìm theo khách, mã tài khoản, hoá đơn, mã giao dịch...'
                  : 'Search customer, account, invoice, reference...'
              }
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {paymentSearch && (
              <button
                type="button"
                onClick={() => setPaymentSearch('')}
                className="absolute right-3 top-2.5 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">{isVi ? 'Mã giao dịch' : 'Payment ID'}</th>
                <th className="px-4 py-3">{isVi ? 'Ngày' : 'Date'}</th>
                <th className="px-4 py-3">{isVi ? 'Khách hàng' : 'Customer'}</th>
                <th className="px-4 py-3">{isVi ? 'Hoá đơn' : 'Invoice'}</th>
                <th className="px-4 py-3">{isVi ? 'Hình thức' : 'Mode'}</th>
                <th className="px-4 py-3 text-right">{isVi ? 'Số tiền' : 'Amount'}</th>
                <th className="px-4 py-3">{isVi ? 'Người ghi' : 'Recorded by'}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    {isVi ? 'Chưa có khoản thanh toán nào khớp.' : 'No matching payments.'}
                  </td>
                </tr>
              ) : (
                paymentPager.items.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono">{p.paymentId}</td>
                    <td className="px-4 py-3">{p.paymentDate}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.customerName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{p.accountId}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{p.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      {p.paymentMode}
                      <div className="font-mono text-[10px] text-slate-500">{p.referenceNumber || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {money(p.amountPaid)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.recordedBy}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onReceipt(p)}
                        className={ICON_BTN}
                        title={isVi ? 'Biên lai' : 'Receipt'}
                      >
                        <Receipt className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination {...paymentPager.props} />
    </div>
  );
}
