// Tab Theo dõi đơn hàng: chỉ gồm đơn chi nhánh đã duyệt (đã chuyển Kỹ thuật).
// Lọc theo trạng thái / loại kết nối / chi nhánh, mở rộng một đơn để xem tiến trình và phân công KTV.
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  ArrowDownUp,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  Phone,
  Radio,
  RotateCcw,
  Search,
  ShoppingBag,
  UserPlus,
  Wifi,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { useRetailBranch } from '../../hooks/useRetailBranch';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import { isReleasedToTechnical } from '../../types/nexus';
import Pagination from '../common/Pagination';
import AssignTechnicianModal from './AssignTechnicianModal';
import OrderDetailsPanel from './OrderDetailsPanel';
import OrderStatusChip from './OrderStatusChip';
import { orderMatchesSearch } from './orderSearch';

const STATUS_PILLS = [
  { key: 'Connection Provided', vi: 'Đã cấp kết nối', en: 'Provided', active: 'bg-emerald-600 text-white shadow-sm' },
  { key: 'Feasible', vi: 'Khảo sát khả thi', en: 'Feasible', active: 'bg-sky-600 text-white shadow-sm' },
  { key: 'Pending', vi: 'Chờ kỹ thuật', en: 'Pending Survey', active: 'bg-amber-600 text-white shadow-sm' },
  { key: 'Not Feasible', vi: 'Không khả thi', en: 'Not Feasible', active: 'bg-rose-600 text-white shadow-sm' },
];

const TYPE_OPTIONS = [
  { key: 'Broadband', label: 'Broadband (Cáp quang)' },
  { key: 'Landline', label: 'Landline (Cố định)' },
  { key: 'Dial-Up', label: 'Dial-Up (Quay số)' },
];

const TYPE_BADGES = {
  Broadband: { icon: Wifi, cls: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  Landline: { icon: Phone, cls: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  'Dial-Up': { icon: Radio, cls: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
};

const PILL_IDLE =
  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
const SELECT_CLS =
  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500';

const newestFirst = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id.localeCompare(a.id);

function Kpi({ label, icon: Icon, value, unit, note, tone, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm ${tone.border} ${
        onClick ? 'hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer' : ''
      }`}
    >
      <div className={`text-[11px] font-mono uppercase tracking-wider flex items-center justify-between ${tone.text}`}>
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`text-2xl font-bold font-mono mt-1.5 ${tone.value}`}>
        {value}
        <span className="text-xs font-normal opacity-70 ml-1">{unit}</span>
      </div>
      <div className={`text-[10px] mt-1 opacity-80 ${tone.text}`}>{note}</div>
    </Tag>
  );
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}: ${text}`);
  } catch {
    toast.info(text);
  }
}

export default function OrderTrackingTab({ initialSearch = '', onOpenApprovalQueue, onOpenConnection }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const orders = useStore(nexusStore.orders);
  const bills = useStore(nexusStore.bills);
  const shops = useStore(nexusStore.retailShops);
  const { belongsToDesk } = useRetailBranch();

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');
  // Mở từ "Xem tiến độ" / "Theo dõi đơn này" thì mở luôn chi tiết đơn đó.
  const [expandedId, setExpandedId] = useState(initialSearch || null);
  const [assigningId, setAssigningId] = useState(null);

  const released = orders.filter((o) => isReleasedToTechnical(o.status));
  // Chọn một chi nhánh thì chỉ hiện đơn của đúng chi nhánh đó.
  const source = branchFilter === 'All' ? released : released.filter((o) => o.retailOutletCode?.toUpperCase() === branchFilter.toUpperCase());
  const countStatus = (status) => source.filter((o) => o.status === status).length;
  const countType = (type) => source.filter((o) => o.connectionType === type).length;
  const awaitingApproval = orders.filter((o) => o.status === 'PendingRetail' && belongsToDesk(o)).length;
  const latestTags = [...released].sort(newestFirst).slice(0, 10);

  const filtered = source
    .filter(
      (o) =>
        orderMatchesSearch(o, search, { bills, language }) &&
        (statusFilter === 'All' || o.status === statusFilter) &&
        (typeFilter === 'All' || o.connectionType === typeFilter),
    )
    .sort((a, b) => (sortOrder === 'oldest' ? -newestFirst(a, b) : newestFirst(a, b)));
  const pager = usePagination(filtered, 10);
  // Lấy đơn mới nhất từ store để modal thấy ngay KTV vừa phân công.
  const assigning = assigningId ? orders.find((o) => o.id === assigningId) : null;

  const update = (setter) => (value) => {
    setter(value);
    pager.setPage(1);
  };
  const changeSearch = update(setSearch);

  const resetFilters = (announce = true) => {
    setSearch('');
    setStatusFilter('All');
    setTypeFilter('All');
    setBranchFilter('All');
    setSortOrder('newest');
    setExpandedId(null);
    pager.setPage(1);
    if (announce) toast.info(isVi ? 'Đã hiển thị toàn bộ danh sách đơn hàng' : 'Showing all orders');
  };

  const focusOrder = (id) => {
    setSearch(id);
    setStatusFilter('All');
    setTypeFilter('All');
    setBranchFilter('All');
    setExpandedId(id);
    pager.setPage(1);
  };

  const toggleTag = (id) => {
    if (search.trim().toUpperCase() === id.toUpperCase()) {
      changeSearch('');
      setExpandedId(null);
    } else {
      focusOrder(id);
    }
  };

  const quickTrack = () => {
    const q = search.trim();
    if (!q) {
      toast.error(isVi ? 'Nhập mã đơn hoặc tên khách hàng để tra cứu.' : 'Enter an order ID or customer name.');
      return;
    }
    const matches = (o) => orderMatchesSearch(o, q, { bills, language });
    const found = released.find(matches);
    if (found) {
      focusOrder(found.id);
      toast.success(isVi ? `Đã mở chi tiết đơn hàng #${found.id}` : `Opened details for Order #${found.id}`);
    } else if (orders.some(matches)) {
      toast.info(isVi ? 'Đơn này đang chờ duyệt ở trang Duyệt hồ sơ chi nhánh.' : 'This order is still in the branch approval queue.');
    } else {
      toast.error(isVi ? 'Không tìm thấy đơn hàng phù hợp.' : 'No matching order found.');
    }
  };

  const headers = [
    isVi ? 'Mã đơn hàng' : 'Order ID',
    isVi ? 'Khách hàng & Địa chỉ' : 'Customer & Address',
    isVi ? 'Loại kết nối & Gói cước' : 'Connection & Plan',
    isVi ? 'Điện thoại & Xác minh' : 'Phone & ID Proof',
    isVi ? 'Trạng thái tiến độ' : 'Fulfillment Status',
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <Kpi
          label={isVi ? 'Tổng số đơn hàng' : 'Total Orders'}
          icon={ShoppingBag}
          value={source.length}
          unit={isVi ? 'đơn' : 'orders'}
          note={isVi ? 'Đã chuyển kỹ thuật' : 'Released to Technical'}
          tone={{ border: 'border-slate-200 dark:border-slate-800', text: 'text-slate-500 dark:text-slate-400', value: 'text-slate-900 dark:text-white' }}
        />
        <Kpi
          label={isVi ? 'Đã cấp kết nối' : 'Provided'}
          icon={CheckCircle2}
          value={countStatus('Connection Provided')}
          unit={isVi ? 'hoàn tất' : 'active'}
          note={isVi ? 'Đã phát hành Account ID' : 'Account ID issued'}
          tone={{ border: 'border-emerald-200 dark:border-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-600 dark:text-emerald-400' }}
        />
        <Kpi
          label={isVi ? 'Khảo sát khả thi' : 'Feasible'}
          icon={Activity}
          value={countStatus('Feasible')}
          unit={isVi ? 'khả thi' : 'ready'}
          note={isVi ? 'Chờ kỹ thuật đấu nối' : 'Ready for dispatch'}
          tone={{ border: 'border-sky-200 dark:border-sky-900/40', text: 'text-sky-600 dark:text-sky-400', value: 'text-sky-600 dark:text-sky-400' }}
        />
        <Kpi
          label={isVi ? 'Chờ bán hàng duyệt' : 'Awaiting Retail'}
          icon={FileText}
          value={awaitingApproval}
          unit={isVi ? 'hồ sơ' : 'apps'}
          note={isVi ? 'Duyệt xong mới phân công KTV →' : 'Approve first, then assign →'}
          tone={{ border: 'border-amber-200 dark:border-amber-900/40', text: 'text-amber-600 dark:text-amber-400', value: 'text-amber-700 dark:text-amber-400' }}
          onClick={onOpenApprovalQueue}
        />
        <Kpi
          label={isVi ? 'Chờ kỹ thuật' : 'Pending Survey'}
          icon={Clock}
          value={countStatus('Pending')}
          unit={isVi ? 'chờ khảo sát' : 'queued'}
          note={isVi ? 'Đã duyệt — chờ khảo sát' : 'Approved — awaiting survey'}
          tone={{ border: 'border-violet-200 dark:border-violet-900/40', text: 'text-violet-600 dark:text-violet-400', value: 'text-violet-700 dark:text-violet-400' }}
        />
        <Kpi
          label={isVi ? 'Không khả thi' : 'Not Feasible'}
          icon={XCircle}
          value={countStatus('Not Feasible')}
          unit={isVi ? 'từ chối' : 'rejected'}
          note={isVi ? 'Vượt cự ly / Hết cổng' : 'Distance / Out of ports'}
          tone={{ border: 'border-rose-200 dark:border-rose-900/40', text: 'text-rose-600 dark:text-rose-400', value: 'text-rose-700 dark:text-rose-400' }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/40 dark:bg-slate-950/30">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <form
              className="relative flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                quickTrack();
              }}
            >
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder={
                  isVi
                    ? 'Tra cứu theo Mã đơn hàng, tên khách hàng, SĐT, email, địa chỉ...'
                    : 'Search by Order ID, customer name, phone, email, address...'
                }
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => changeSearch('')}
                  className="absolute right-3 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={quickTrack}
                className="px-4 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>{isVi ? 'Tra cứu & Mở chi tiết' : 'Track & Open Details'}</span>
              </button>
              <button
                type="button"
                onClick={() => resetFilters()}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 whitespace-nowrap"
                title={isVi ? 'Xem tất cả danh sách đơn hàng và xóa bộ lọc' : 'View all orders and reset filters'}
              >
                <RotateCcw className="h-4 w-4 text-emerald-600" />
                <span>{isVi ? 'Làm mới' : 'Reset'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 max-w-full">
              <button
                type="button"
                onClick={() => update(setStatusFilter)('All')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  statusFilter === 'All' ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40' : PILL_IDLE
                }`}
              >
                {isVi ? 'Tất cả' : 'All'} ({source.length})
              </button>
              {STATUS_PILLS.map(({ key, vi, en, active }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update(setStatusFilter)(key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${statusFilter === key ? active : PILL_IDLE}`}
                >
                  {isVi ? vi : en} ({countStatus(key)})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <label className="flex items-center space-x-1.5">
                <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{isVi ? 'Loại kết nối:' : 'Connection Type:'}</span>
                <select value={typeFilter} onChange={(e) => update(setTypeFilter)(e.target.value)} className={SELECT_CLS}>
                  <option value="All">
                    {isVi ? 'Tất cả loại kết nối' : 'All Types'} ({source.length})
                  </option>
                  {TYPE_OPTIONS.map(({ key, label }) => (
                    <option key={key} value={key}>
                      {label} ({countType(key)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center space-x-1.5">
                <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{isVi ? 'Phạm vi:' : 'Scope:'}</span>
                <select value={branchFilter} onChange={(e) => update(setBranchFilter)(e.target.value)} className={SELECT_CLS}>
                  <option value="All">{isVi ? 'Toàn bộ hệ thống (Tất cả)' : 'All Outlets & Online'}</option>
                  {shops.map((shop) => (
                    <option key={shop.shopCode} value={shop.shopCode}>
                      {shop.name} ({shop.shopCode})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{isVi ? 'Mã đơn hàng mới nhất:' : 'Latest Orders:'}</span>
              {latestTags.map((o) => {
                const isActive = search.trim().toUpperCase() === o.id.toUpperCase();
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleTag(o.id)}
                    className={`px-2 py-0.5 rounded border transition font-semibold text-[11px] flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/40 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600'
                    }`}
                    title={isActive ? (isVi ? 'Bấm lại để bỏ chọn và xem tất cả' : 'Click again to deselect') : isVi ? `Lọc mã đơn ${o.id}` : `Filter order ${o.id}`}
                  >
                    <span>{o.id}</span>
                    {isActive && <X className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {expandedId && (
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5 text-slate-400" />
                  <span>{isVi ? 'Thu gọn chi tiết' : 'Collapse Details'}</span>
                </button>
              )}
              <ArrowDownUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <select
                value={sortOrder}
                onChange={(e) => update(setSortOrder)(e.target.value)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="newest">{isVi ? 'Sắp xếp: Mới nhất trước' : 'Sort: Newest First'}</option>
                <option value="oldest">{isVi ? 'Sắp xếp: Cũ nhất trước' : 'Sort: Oldest First'}</option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <ShoppingBag className="h-10 w-10 text-slate-400 mx-auto opacity-50" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
              {isVi ? 'Không tìm thấy đơn hàng nào khớp với bộ lọc.' : 'No orders match the current filter criteria.'}
            </div>
            <button
              type="button"
              onClick={() => resetFilters(false)}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              {isVi ? 'Đặt lại bộ lọc' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-[11px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-4 py-3.5">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {pager.items.map((o) => {
                  const isExpanded = expandedId === o.id;
                  const badge = TYPE_BADGES[o.connectionType] ?? TYPE_BADGES['Dial-Up'];
                  const BadgeIcon = badge.icon;
                  return [
                    <tr
                      key={o.id}
                      className={`transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 ${isExpanded ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : ''}`}
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">{o.id}</span>
                          <button
                            type="button"
                            onClick={() => copyText(o.id, 'Order ID')}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                            title={isVi ? 'Sao chép mã đơn' : 'Copy Order ID'}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">{o.createdAt}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">{o.customerName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{o.installationAddress}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.cls}`}>
                          <BadgeIcon className="h-3 w-3" />
                          <span>{o.connectionType}</span>
                        </span>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-1">{getPlanName({ name: o.planName }, language)}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{o.customerPhone}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[170px]">{o.customerEmail}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {o.idProofType}: {o.idProofNumber}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1.5">
                          <OrderStatusChip status={o.status} withDot />
                          <div className="pt-0.5">
                            {o.assignedTechnician ? (
                              <button
                                type="button"
                                onClick={() => setAssigningId(o.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition"
                                title={isVi ? 'Bấm để đổi kỹ thuật viên khảo sát' : 'Click to change survey technician'}
                              >
                                <Wrench className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-slate-500 dark:text-slate-400 font-normal">{isVi ? 'KTV:' : 'Tech:'}</span>
                                <span className="truncate max-w-[110px] font-semibold">{o.assignedTechnician}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAssigningId(o.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
                                title={isVi ? 'Bấm để phân công kỹ thuật viên khảo sát' : 'Click to assign survey technician'}
                              >
                                <UserPlus className="h-3 w-3" />
                                <span>{isVi ? '+ Phân công KTV' : '+ Assign Tech'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : o.id)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                            isExpanded
                              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>{isExpanded ? (isVi ? 'Thu gọn' : 'Collapse') : isVi ? 'Chi tiết' : 'Details'}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr
                        key={`${o.id}-details`}
                        className="bg-gradient-to-b from-emerald-50/50 to-slate-50 dark:from-emerald-950/20 dark:to-slate-950/40 border-b-2 border-emerald-400 dark:border-emerald-600/60"
                      >
                        <td colSpan={6} className="p-4 sm:p-6">
                          <OrderDetailsPanel
                            order={o}
                            onClose={() => setExpandedId(null)}
                            onAssignTechnician={(order) => setAssigningId(order.id)}
                            onOpenConnection={onOpenConnection}
                          />
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination {...pager.props} />

      {assigning && <AssignTechnicianModal order={assigning} onClose={() => setAssigningId(null)} />}
    </div>
  );
}
