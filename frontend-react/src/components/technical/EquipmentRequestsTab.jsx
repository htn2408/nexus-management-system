// Tab Yêu cầu nhập hàng: theo dõi các yêu cầu đã gửi Admin và phản hồi của Admin.
import { useState } from 'react';
import { CheckCircle2, Clock, Filter, Plus, Search, Store, Truck, XCircle } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';

const STATUS = {
  Pending: {
    icon: Clock,
    vi: 'Chờ duyệt',
    en: 'Pending',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  },
  Approved: {
    icon: CheckCircle2,
    vi: 'Đã duyệt',
    en: 'Approved',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  },
  Fulfilled: {
    icon: CheckCircle2,
    vi: 'Đã nhập kho',
    en: 'Fulfilled',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
  Rejected: {
    icon: XCircle,
    vi: 'Từ chối',
    en: 'Rejected',
    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  },
};
const URGENCY = {
  Urgent: {
    vi: 'Khẩn cấp',
    en: 'Urgent',
    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-bold',
  },
  High: {
    vi: 'Cao',
    en: 'High',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 font-bold',
  },
  Normal: {
    vi: 'Bình thường',
    en: 'Normal',
    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium',
  },
};

export default function EquipmentRequestsTab({ onNewRequest }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const requests = useStore(nexusStore.equipmentRequests);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const term = search.trim().toLowerCase();
  const filtered = requests.filter(
    (r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!term ||
        r.id.toLowerCase().includes(term) ||
        r.itemName.toLowerCase().includes(term) ||
        (r.orderId ?? '').toLowerCase().includes(term) ||
        (r.storeName ?? '').toLowerCase().includes(term) ||
        (r.reason ?? '').toLowerCase().includes(term)),
  );
  const pager = usePagination(filtered, 8);
  const count = (status) => requests.filter((r) => r.status === status).length;

  const tiles = [
    {
      label: isVi ? 'Tổng yêu cầu' : 'Total',
      value: requests.length,
      cls: 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white',
    },
    {
      label: isVi ? 'Chờ duyệt' : 'Pending',
      value: count('Pending'),
      cls: 'border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400',
    },
    {
      label: isVi ? 'Admin đã duyệt' : 'Approved',
      value: count('Approved'),
      cls: 'border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400',
    },
    {
      label: isVi ? 'Đã nhập về kho' : 'Fulfilled',
      value: count('Fulfilled'),
      cls: 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400',
    },
  ];
  const headers = [
    isVi ? 'Mã yêu cầu' : 'Request ID',
    isVi ? 'Mặt hàng' : 'Item',
    isVi ? 'Chi nhánh' : 'Store',
    isVi ? 'SL' : 'Qty',
    isVi ? 'Ưu tiên' : 'Urgency',
    isVi ? 'Đơn liên quan / Lý do' : 'Order / Reason',
    isVi ? 'Trạng thái' : 'Status',
    isVi ? 'Phản hồi Admin' : 'Admin note',
    isVi ? 'Thời gian' : 'Created',
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
        <div className="flex items-start gap-3">
          <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
              {isVi ? 'Yêu cầu nhập thiết bị / vật tư gửi Admin' : 'Equipment import requests to Admin'}
            </h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
              {isVi
                ? 'Khi kho chi nhánh thiếu thiết bị để cấp kết nối, gửi yêu cầu tại đây. Admin sẽ duyệt và nhập thiết bị về kho chi nhánh.'
                : 'When your branch lacks equipment to provide connections, request it here. Admin reviews and stocks the branch.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewRequest}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          {isVi ? 'Gửi yêu cầu mới' : 'New request'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 ${t.cls}`}>
            <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">{t.label}</div>
            <div className="text-xl font-bold font-mono mt-1">{t.value}</div>
          </div>
        ))}
      </div>

      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isVi ? 'Tìm mã yêu cầu, thiết bị, đơn hàng...' : 'Search requests, devices, orders...'}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pager.setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              pager.setPage(1);
            }}
            className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2"
          >
            <option value="all">{isVi ? 'Tất cả trạng thái' : 'All statuses'}</option>
            {Object.entries(STATUS).map(([key, s]) => (
              <option key={key} value={key}>
                {isVi ? s.vi : s.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
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
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {isVi ? 'Không có yêu cầu nhập hàng nào.' : 'No equipment requests found.'}
                  </td>
                </tr>
              ) : (
                pager.items.map((req) => {
                  const status = STATUS[req.status] ?? STATUS.Pending;
                  const urgency = URGENCY[req.urgency] ?? URGENCY.Normal;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{req.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{req.itemName}</div>
                        <div className="text-[10px] text-slate-500">{req.deviceType}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Store className="h-3 w-3 text-slate-400" />
                          {req.storeName || req.storeId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{req.quantity}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] ${urgency.cls}`}>
                          {isVi ? urgency.vi : urgency.en}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {req.orderId && (
                          <div className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                            #{req.orderId}
                          </div>
                        )}
                        <div
                          className="text-[11px] text-slate-600 dark:text-slate-400 truncate"
                          title={req.reason || ''}
                        >
                          {req.reason || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.cls}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {isVi ? status.vi : status.en}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[150px] truncate"
                        title={req.adminNotes || ''}
                      >
                        {req.adminNotes || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{req.createdAt}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination {...pager.props} />
    </div>
  );
}
