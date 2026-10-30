// Tab duyệt hồ sơ chi nhánh (khâu 1): duyệt để chuyển Kỹ thuật, trả hồ sơ kèm lý do, hoặc đưa lại vào hàng đợi.
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, FileText, Filter, Search, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { useRetailBranch } from '../../hooks/useRetailBranch';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';
import AdvancedOrderSearch from './AdvancedOrderSearch';
import RejectOrderModal from './RejectOrderModal';
import { orderMatchesSearch } from './orderSearch';

// Nhóm hiển thị: chờ duyệt / đã duyệt (mọi trạng thái sau khâu chi nhánh) / đã trả.
const bucketOf = (order) =>
  order.status === 'PendingRetail' ? 'Awaiting' : order.status === 'Not Approved' ? 'Rejected' : 'Approved';

const FILTERS = [
  { key: 'Awaiting', vi: 'Chờ duyệt', en: 'Awaiting', active: 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20' },
  { key: 'Approved', vi: 'Đã duyệt', en: 'Approved', active: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' },
  { key: 'Rejected', vi: 'Đã trả', en: 'Returned', active: 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20' },
  { key: 'All', vi: 'Tất cả', en: 'All', active: 'bg-slate-800 dark:bg-slate-700 text-white shadow-sm ring-2 ring-slate-500/20' },
];

function KpiCard({ label, value, tone }) {
  return (
    <div className={`p-3.5 rounded-xl bg-white dark:bg-slate-900 border shadow-sm ${tone.border}`}>
      <div className={`text-[10px] font-mono uppercase tracking-wider ${tone.label}`}>{label}</div>
      <div className={`text-2xl font-bold font-mono mt-1 ${tone.value}`}>{value}</div>
    </div>
  );
}

function StatusCell({ order, isVi }) {
  if (order.status === 'PendingRetail') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        {isVi ? 'Chờ duyệt' : 'Awaiting'}
      </span>
    );
  }
  if (order.status === 'Not Approved') {
    return (
      <>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          {isVi ? 'Đã trả hồ sơ' : 'Returned'}
        </span>
        {order.retailRejectionReason && (
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 max-w-[220px] leading-snug">{order.retailRejectionReason}</div>
        )}
      </>
    );
  }
  return (
    <>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        {isVi ? 'Đã chuyển kỹ thuật' : 'Released'}
      </span>
      {order.retailApprovedBy && (
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
          {order.retailApprovedBy} · {order.retailApprovedAt}
        </div>
      )}
    </>
  );
}

export default function ApprovalQueueTab({ initialSearch = '', onViewProgress }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const orders = useStore(nexusStore.orders);
  const bills = useStore(nexusStore.bills);
  const { user, branchShop, belongsToDesk } = useRetailBranch();

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState('All');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [busyOrderId, setBusyOrderId] = useState(null);

  const matches = (o) => orderMatchesSearch(o, search, { bills, language });
  // Gõ tìm kiếm thì tìm cả đơn của chi nhánh khác (khách có thể đến quầy khác hỏi).
  const scoped = orders.filter((o) => belongsToDesk(o) || (search.trim() && matches(o)));
  const searched = scoped.filter(matches);
  const counts = {
    Awaiting: searched.filter((o) => bucketOf(o) === 'Awaiting').length,
    Approved: searched.filter((o) => o.retailApprovedBy && o.status !== 'Not Approved').length,
    Rejected: searched.filter((o) => bucketOf(o) === 'Rejected').length,
    All: searched.length,
  };
  const queue = searched.filter((o) => filter === 'All' || bucketOf(o) === filter);
  const pager = usePagination(queue, 10);

  const changeSearch = (value) => {
    setSearch(value);
    pager.setPage(1);
  };
  const changeFilter = (value) => {
    setFilter(value);
    pager.setPage(1);
  };

  // Chạy một thao tác trên đơn; server từ chối thì báo lỗi, null nghĩa là đơn không còn ở trạng thái đó.
  const runAction = async (order, action, successMessage) => {
    setBusyOrderId(order.id);
    try {
      const updated = await action();
      if (!updated) {
        toast.error(isVi ? 'Đơn này không còn ở trạng thái phù hợp để thao tác.' : 'This order is no longer in a state that allows this.');
        return false;
      }
      toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(isVi ? 'Chưa lưu được thao tác' : 'The action was not saved', {
        description: err instanceof Error ? err.message : undefined,
      });
      return false;
    } finally {
      setBusyOrderId(null);
    }
  };

  const who = (order) => user?.name || order.retailEmployeeName || 'Retail Desk';

  const approve = (order) =>
    runAction(
      order,
      () => nexusStore.approveOrderByRetail(order.id, who(order)),
      isVi
        ? `Đã duyệt hồ sơ ${order.id} — đơn đã sang Theo dõi đơn hàng để phân công kỹ thuật viên.`
        : `Approved ${order.id} — now in Order Tracking for technician assignment.`,
    );

  const reject = async (reason) => {
    if (!reason.trim()) {
      toast.error(isVi ? 'Vui lòng nhập lý do trả hồ sơ.' : 'A reason is required when bouncing an application.');
      return;
    }
    const order = rejecting;
    const done = await runAction(
      order,
      () => nexusStore.rejectOrderByRetail(order.id, who(order), reason),
      isVi ? `Đã trả hồ sơ ${order.id} cho khách hàng.` : `Returned ${order.id} to the customer.`,
    );
    if (done) setRejecting(null);
  };

  const resubmit = (order) =>
    runAction(
      order,
      () => nexusStore.resubmitOrderToRetail(order.id),
      isVi ? `Đã ghi nhận lại hồ sơ ${order.id} vào hàng đợi chờ duyệt.` : `Re-queued ${order.id} for approval.`,
    );

  const headers = [
    isVi ? 'Mã đơn' : 'Order ID',
    isVi ? 'Khách hàng & Địa chỉ' : 'Customer & Address',
    isVi ? 'Giấy tờ tùy thân' : 'ID Document',
    isVi ? 'Gói cước' : 'Plan',
    isVi ? 'Trạng thái' : 'Status',
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isVi ? 'Hàng đợi xét duyệt hồ sơ' : 'Application Approval Queue'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {branchShop
                  ? `${isVi ? 'Chi nhánh' : 'Branch'}: ${branchShop.name} (${branchShop.shopCode}) · ${branchShop.address}`
                  : isVi
                    ? 'Toàn bộ chi nhánh (vai trò quản lý — xem mọi đơn của mọi chi nhánh).'
                    : "All branches (manager scope — viewing every outlet's applications)."}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {isVi ? 'Người duyệt' : 'Reviewer'}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{user?.name ?? '—'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{user?.email ?? ''}</div>
          </div>
        </div>
        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-3 leading-relaxed">
          {isVi
            ? 'Đơn chỉ được chuyển sang bộ phận Kỹ thuật sau khi bàn này duyệt. Từ chối sẽ trả hồ sơ về khách hàng và đơn không bao giờ xuất hiện ở hàng đợi khảo sát.'
            : 'An order only reaches Technical once this desk approves it. Rejecting returns the paperwork to the customer and the order never appears in the survey queue.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label={isVi ? 'Chờ duyệt' : 'Awaiting'}
          value={counts.Awaiting}
          tone={{ border: 'border-amber-200 dark:border-amber-900/40', label: 'text-amber-600 dark:text-amber-400', value: 'text-amber-700 dark:text-amber-400' }}
        />
        <KpiCard
          label={isVi ? 'Đã chuyển kỹ thuật' : 'Released'}
          value={counts.Approved}
          tone={{ border: 'border-emerald-200 dark:border-emerald-900/40', label: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-400' }}
        />
        <KpiCard
          label={isVi ? 'Đã trả hồ sơ' : 'Returned'}
          value={counts.Rejected}
          tone={{ border: 'border-rose-200 dark:border-rose-900/40', label: 'text-rose-600 dark:text-rose-400', value: 'text-rose-700 dark:text-rose-400' }}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px] sm:min-w-[320px] max-w-xl">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder={
              isVi
                ? 'Nhập từ khóa tìm kiếm (Tên KH, Mã đơn, SĐT, CCCD, Địa chỉ, Hóa đơn...)'
                : 'Search by customer name, order ID, phone, ID number, address, invoice...'
            }
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => changeSearch('')}
              className="absolute right-3 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              title={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
            showAdvanced
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {isVi ? 'Tìm kiếm nâng cao' : 'Advanced Search'}
        </button>

        <div className="flex flex-row items-center gap-2 overflow-x-auto whitespace-nowrap shrink-0 lg:ml-auto">
          {FILTERS.map(({ key, vi, en, active }) => (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filter === key ? active : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{isVi ? vi : en}</span>
              <span
                className={`font-mono text-xs px-1.5 py-0.5 rounded-full ${
                  filter === key ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {showAdvanced && <AdvancedOrderSearch />}

      {search.trim() && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isVi
                ? `Kết quả tìm kiếm cho "${search.trim()}": tìm thấy ${queue.length} đơn hàng`
                : `Search results for "${search.trim()}": found ${queue.length} orders`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {filter !== 'All' && counts.All > queue.length && (
              <button type="button" onClick={() => changeFilter('All')} className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer">
                {isVi ? `Xem tất cả ${counts.All} kết quả` : `View all ${counts.All} results`}
              </button>
            )}
            <button type="button" onClick={() => changeSearch('')} className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer">
              {isVi ? 'Xóa tìm kiếm' : 'Clear filter'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    {search.trim() ? (
                      <>
                        <Search className="h-9 w-9 mx-auto text-amber-400 mb-2" />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {isVi ? `Không tìm thấy đơn hàng nào khớp với "${search}"` : `No orders found matching "${search}"`}
                        </p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-9 w-9 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                          {isVi ? 'Không có hồ sơ nào ở trạng thái này.' : 'No applications in this state.'}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                pager.items.map((o) => {
                  const busy = busyOrderId === o.id;
                  return (
                    <tr key={o.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors">
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{o.id}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{o.createdAt}</div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">{o.customerName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{o.installationAddress}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{o.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="text-xs text-slate-700 dark:text-slate-300">{o.idProofType}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{o.idProofNumber}</div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{getPlanName({ name: o.planName }, language)}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {o.connectionType} · {o.retailOutletCode}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <StatusCell order={o} isVi={isVi} />
                      </td>
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        {o.status === 'PendingRetail' ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => approve(o)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs disabled:opacity-60"
                            >
                              {isVi ? 'Duyệt & chuyển kỹ thuật' : 'Approve & Release'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setRejecting(o)}
                              className="ml-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition disabled:opacity-60"
                            >
                              {isVi ? 'Từ chối' : 'Reject'}
                            </button>
                          </>
                        ) : o.status === 'Not Approved' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => resubmit(o)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition disabled:opacity-60"
                          >
                            {isVi ? 'Đưa lại vào hàng đợi' : 'Re-queue'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onViewProgress(o.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                          >
                            {isVi ? 'Xem tiến độ' : 'View Progress'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination {...pager.props} />

      {rejecting && (
        <RejectOrderModal order={rejecting} isSaving={busyOrderId === rejecting.id} onCancel={() => setRejecting(null)} onConfirm={reject} />
      )}
    </div>
  );
}
