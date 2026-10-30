// Tìm kiếm nâng cao trên CSDL (theo đề bài: mã đơn, tên người đặt, số điện thoại, loại kết nối,
// khoảng ngày nộp). Trả về đơn ở mọi trạng thái, không giới hạn chi nhánh đang xem.
import { useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { usePagination } from '../../hooks/usePagination';
import { useStore } from '../../lib/store';
import { searchOrdersAdvanced } from '../../lib/technicalApi';
import Pagination from '../common/Pagination';
import OrderStatusChip from './OrderStatusChip';

const EMPTY = { orderId: '', customerName: '', phone: '', connectionType: '', fromDate: '', toDate: '' };
const inputClass =
  'mt-1 w-full px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

function toOrderRow(o) {
  return {
    id: o.orderId,
    customerName: o.customerName,
    customerPhone: o.customerPhone || '',
    connectionType: o.connectionType,
    planName: o.planName,
    createdAt: o.applicationDate ? o.applicationDate.slice(0, 10) : '',
    status: o.status,
    assignedAccountId: o.assignedAccountId || null,
  };
}

export default function AdvancedOrderSearch() {
  const isVi = useStore(languageStore.language) === 'vi';
  const [form, setForm] = useState(EMPTY);
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const pager = usePagination(results ?? [], 10);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const criteriaCount = Object.values(form).filter((v) => v.trim()).length;

  const search = async () => {
    if (criteriaCount === 0) {
      toast.error(isVi ? 'Nhập ít nhất một tiêu chí tìm kiếm.' : 'Enter at least one search criterion.');
      return;
    }
    setIsSearching(true);
    try {
      const found = await searchOrdersAdvanced({
        keyword: form.orderId.trim() || undefined,
        customerName: form.customerName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        connectionType: form.connectionType || undefined,
        fromDate: form.fromDate || undefined,
        toDate: form.toDate || undefined,
      });
      const rows = (found || []).map(toOrderRow);
      setResults(rows);
      pager.setPage(1);
      if (rows.length === 0) toast.info(isVi ? 'Không tìm thấy đơn hàng nào khớp tiêu chí.' : 'No orders match the criteria.');
    } catch (err) {
      toast.error(`${isVi ? 'Tìm kiếm thất bại' : 'Search failed'}: ${err instanceof Error ? err.message : ''}`);
    } finally {
      setIsSearching(false);
    }
  };

  const fields = [
    ['orderId', isVi ? 'Mã đơn (Order ID)' : 'Order ID', 'text', 'D0000000001'],
    ['customerName', isVi ? 'Tên người đặt đơn' : 'Customer Name', 'text', ''],
    ['phone', isVi ? 'Số điện thoại đăng ký' : 'Contact Number', 'text', '0912…'],
  ];

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-3 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map(([field, label, type, placeholder]) => (
          <label key={field} className="block">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            <input type={type} value={form[field]} onChange={set(field)} placeholder={placeholder} className={inputClass} />
          </label>
        ))}
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{isVi ? 'Loại kết nối' : 'Connection Type'}</span>
          <select value={form.connectionType} onChange={set('connectionType')} className={inputClass}>
            <option value="">{isVi ? 'Tất cả' : 'All'}</option>
            <option value="Broadband">Broadband</option>
            <option value="Dial-Up">Dial-Up</option>
            <option value="Landline">Landline</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{isVi ? 'Từ ngày (ngày nộp)' : 'From Date (applied)'}</span>
          <input type="date" value={form.fromDate} onChange={set('fromDate')} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{isVi ? 'Đến ngày (ngày nộp)' : 'To Date (applied)'}</span>
          <input type="date" value={form.toDate} onChange={set('toDate')} className={inputClass} />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-slate-500">
          {isVi
            ? 'Tra cứu trực tiếp trên CSDL — đơn ở mọi trạng thái, không giới hạn chi nhánh hiện tại.'
            : 'Queries the database directly — orders in any status, not limited to your current branch view.'}
        </p>
        <div className="flex items-center gap-2">
          {results !== null && (
            <button
              type="button"
              onClick={() => setResults(null)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg"
            >
              {isVi ? 'Xóa kết quả' : 'Clear Results'}
            </button>
          )}
          <button
            type="button"
            onClick={search}
            disabled={isSearching}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition shadow-sm"
          >
            <Search className="h-3.5 w-3.5" />
            {isSearching ? (isVi ? 'Đang tìm…' : 'Searching…') : isVi ? 'Tìm trên CSDL' : 'Search Database'}
          </button>
        </div>
      </div>

      {results !== null && (
        <>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
              {isVi ? `Kết quả từ CSDL: ${results.length} đơn hàng` : `Database results: ${results.length} orders`}
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white dark:bg-slate-900 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2">{isVi ? 'Mã đơn' : 'Order ID'}</th>
                    <th className="px-4 py-2">{isVi ? 'Khách hàng' : 'Customer'}</th>
                    <th className="px-4 py-2">{isVi ? 'SĐT' : 'Phone'}</th>
                    <th className="px-4 py-2">{isVi ? 'Gói / Loại' : 'Plan / Type'}</th>
                    <th className="px-4 py-2">{isVi ? 'Ngày nộp' : 'Applied'}</th>
                    <th className="px-4 py-2 text-center">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th className="px-4 py-2">{isVi ? 'Mã tài khoản' : 'Account ID'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pager.items.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{o.id}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900 dark:text-white">{o.customerName}</td>
                      <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">{o.customerPhone}</td>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                        {o.planName} · {o.connectionType}
                      </td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{o.createdAt}</td>
                      <td className="px-4 py-2 text-center">
                        <OrderStatusChip status={o.status} />
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-400">{o.assignedAccountId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination {...pager.props} />
        </>
      )}
    </div>
  );
}
