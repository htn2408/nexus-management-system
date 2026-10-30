// Tab Chi tiết thuê bao (mã tài khoản 16 ký tự): tra cứu, xem công nợ và thu tiền tại quầy.
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, Phone, Radio, Receipt, Search, Wifi, X, XCircle } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';
import ConnectionDetailsPanel from './ConnectionDetailsPanel';
import { billsForAccount, oldestUnpaidBill, totalDue } from './billsByAccount';
import { CONNECTION_STATUS_CHIP, CONNECTION_STATUS_DOT, connectionStatusLabel } from '../../lib/connectionStatus';

const STATUS_PILLS = [
  { key: 'Active', vi: 'Hoạt động', en: 'Active', active: 'bg-emerald-600 text-white shadow-sm' },
  { key: 'Temporarily Inactive', vi: 'Tạm khóa', en: 'Inactive', active: 'bg-amber-600 text-white shadow-sm' },
  { key: 'Permanently Inactive', vi: 'Khóa vĩnh viễn', en: 'Cut Off', active: 'bg-rose-600 text-white shadow-sm' },
];

const TYPE_BADGES = {
  Broadband: { icon: Wifi, cls: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  Landline: { icon: Phone, cls: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  'Dial-Up': { icon: Radio, cls: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
};

const PILL_IDLE =
  'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700';

function Kpi({ label, icon: Icon, value, unit, note, tone }) {
  return (
    <div className={`p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm ${tone.border}`}>
      <div className={`text-[11px] font-mono uppercase tracking-wider flex items-center justify-between ${tone.text}`}>
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`text-2xl font-bold font-mono mt-1.5 ${tone.value}`}>
        {value}
        {unit && <span className="text-xs font-normal opacity-70 ml-1">{unit}</span>}
      </div>
      <div className={`text-[10px] mt-1 opacity-80 ${tone.text}`}>{note}</div>
    </div>
  );
}

function matchesConnection(c, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const compact = q.replace(/-/g, '');
  const digits = q.replace(/\D/g, '');
  return (
    c.accountId.toLowerCase().includes(q) ||
    c.accountId.replace(/-/g, '').toLowerCase().includes(compact) ||
    c.customerName.toLowerCase().includes(q) ||
    (digits !== '' && (c.customerPhone ?? '').replace(/\D/g, '').includes(digits)) ||
    (c.customerEmail ?? '').toLowerCase().includes(q) ||
    (c.installationAddress ?? '').toLowerCase().includes(q) ||
    (c.portNumber ?? '').toLowerCase().includes(q) ||
    (c.assignedDeviceSerial ?? '').toLowerCase().includes(q) ||
    (c.ipAddress ?? '').toLowerCase().includes(q)
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied Account ID: ${text}`);
  } catch {
    toast.info(text);
  }
}

export default function ConnectionDetailsTab({ initialAccountId = '', onOpenPayment }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const connections = useStore(nexusStore.connections);
  const bills = useStore(nexusStore.bills);

  const [search, setSearch] = useState(initialAccountId);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(initialAccountId || null);

  const dueOf = (accountId) => totalDue(billsForAccount(bills, accountId));
  const countStatus = (status) => connections.filter((c) => c.status === status).length;
  const totalOutstanding = connections.reduce((sum, c) => sum + dueOf(c.accountId), 0);

  const filtered = connections.filter(
    (c) => matchesConnection(c, search) && (statusFilter === 'All' || c.status === statusFilter) && (typeFilter === 'All' || c.connectionType === typeFilter),
  );
  const pager = usePagination(filtered, 10);

  const update = (setter) => (value) => {
    setter(value);
    pager.setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setTypeFilter('All');
    pager.setPage(1);
  };

  const quickTrack = () => {
    if (!search.trim()) {
      toast.info(isVi ? 'Vui lòng nhập Mã tài khoản hoặc tên khách hàng.' : 'Please enter an Account ID or customer name.');
      return;
    }
    const found = connections.find((c) => matchesConnection(c, search));
    if (found) {
      setStatusFilter('All');
      setTypeFilter('All');
      setExpandedId(found.accountId);
      toast.success(isVi ? `Đã mở chi tiết hồ sơ tài khoản #${found.accountId}` : `Opened connection profile #${found.accountId}`);
    } else {
      toast.error(isVi ? 'Không tìm thấy Mã tài khoản trong hệ thống.' : 'Account ID not found.');
    }
  };

  const headers = [
    isVi ? 'Mã tài khoản (16 ký tự)' : 'Account ID (16-char)',
    isVi ? 'Thuê bao & Địa chỉ' : 'Subscriber & Location',
    isVi ? 'Loại dịch vụ & Gói cước' : 'Service & Plan',
    isVi ? 'Cổng NOC & IP' : 'NOC Port & IP',
    isVi ? 'Dư nợ cước ($)' : 'Outstanding Due ($)',
    isVi ? 'Trạng thái' : 'Status',
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <Kpi
          label={isVi ? 'Thuê bao quản lý' : 'Managed Accounts'}
          icon={Wifi}
          value={connections.length}
          unit={isVi ? 'tài khoản' : 'accounts'}
          note={isVi ? 'Mã tài khoản 16 ký tự' : '16-char Account IDs'}
          tone={{ border: 'border-slate-200 dark:border-slate-800', text: 'text-slate-500 dark:text-slate-400', value: 'text-slate-900 dark:text-white' }}
        />
        <Kpi
          label={isVi ? 'Đang hoạt động' : 'Active'}
          icon={CheckCircle2}
          value={countStatus('Active')}
          unit={isVi ? 'thuê bao' : 'online'}
          note={isVi ? 'Đang dùng dịch vụ' : 'In service'}
          tone={{ border: 'border-emerald-200 dark:border-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-600 dark:text-emerald-400' }}
        />
        <Kpi
          label={isVi ? 'Tạm khóa dịch vụ' : 'Temporarily Inactive'}
          icon={AlertTriangle}
          value={countStatus('Temporarily Inactive')}
          unit={isVi ? 'tạm khóa' : 'on hold'}
          note={isVi ? 'Nợ cước / Tạm ngưng' : 'Overdue / Suspended'}
          tone={{ border: 'border-amber-200 dark:border-amber-900/40', text: 'text-amber-600 dark:text-amber-400', value: 'text-amber-700 dark:text-amber-400' }}
        />
        <Kpi
          label={isVi ? 'Khóa vĩnh viễn' : 'Cut Off'}
          icon={XCircle}
          value={countStatus('Permanently Inactive')}
          unit={isVi ? 'đã cắt' : 'terminated'}
          note={isVi ? 'Đã thu hồi cổng CPE' : 'CPE & Port reclaimed'}
          tone={{ border: 'border-rose-200 dark:border-rose-900/40', text: 'text-rose-600 dark:text-rose-400', value: 'text-rose-700 dark:text-rose-400' }}
        />
        <Kpi
          label={isVi ? 'Tổng nợ cước' : 'Outstanding Balance'}
          icon={Receipt}
          value={`$${totalOutstanding.toFixed(2)}`}
          note={isVi ? 'Thu được tại quầy' : 'Payable at the counter'}
          tone={{
            border: 'border-slate-200 dark:border-slate-800',
            text: 'text-slate-500 dark:text-slate-400',
            value: totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
          }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/40 dark:bg-slate-950/30">
          <form
            className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between"
            onSubmit={(e) => {
              e.preventDefault();
              quickTrack();
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder={
                  isVi
                    ? 'Tra cứu theo Mã tài khoản (16 ký tự), tên thuê bao, địa chỉ, SĐT, cổng NOC, IP...'
                    : 'Search by 16-char Account ID, subscriber name, address, phone, NOC port, IP...'
                }
                value={search}
                onChange={(e) => update(setSearch)(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-mono"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => update(setSearch)('')}
                  className="absolute right-3 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title={isVi ? 'Xóa tìm kiếm' : 'Clear search'}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer"
            >
              <Wifi className="h-4 w-4" />
              <span>{isVi ? 'Tải hồ sơ & Mở chi tiết' : 'Retrieve & Open Details'}</span>
            </button>
          </form>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 max-w-full">
              <button
                type="button"
                onClick={() => update(setStatusFilter)('All')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${statusFilter === 'All' ? 'bg-emerald-600 text-white shadow-sm' : PILL_IDLE}`}
              >
                {isVi ? 'Tất cả' : 'All'} ({connections.length})
              </button>
              {STATUS_PILLS.map(({ key, vi, en, active }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update(setStatusFilter)(key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${statusFilter === key ? active : PILL_IDLE}`}
                >
                  {isVi ? vi : en} ({countStatus(key)})
                </button>
              ))}
            </div>
            <label className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{isVi ? 'Loại dịch vụ:' : 'Service Type:'}</span>
              <select
                value={typeFilter}
                onChange={(e) => update(setTypeFilter)(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="All">{isVi ? 'Tất cả loại dịch vụ' : 'All Types'}</option>
                <option value="Broadband">Broadband (Cáp quang)</option>
                <option value="Landline">Landline (Cố định)</option>
                <option value="Dial-Up">Dial-Up (Quay số)</option>
              </select>
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Wifi className="h-10 w-10 text-slate-400 mx-auto opacity-50" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
              {isVi ? 'Không tìm thấy thuê bao nào khớp với bộ lọc.' : 'No accounts match the current filter criteria.'}
            </div>
            <button type="button" onClick={resetFilters} className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
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
                {pager.items.map((c) => {
                  const isExpanded = expandedId === c.accountId;
                  const connBills = billsForAccount(bills, c.accountId);
                  const due = totalDue(connBills);
                  const badge = TYPE_BADGES[c.connectionType] ?? TYPE_BADGES['Dial-Up'];
                  const BadgeIcon = badge.icon;
                  return [
                    <tr
                      key={c.accountId}
                      className={`transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 ${isExpanded ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : ''}`}
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">{c.accountId}</span>
                          <button
                            type="button"
                            onClick={() => copyText(c.accountId)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                            title={isVi ? 'Sao chép mã tài khoản' : 'Copy Account ID'}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                          {isVi ? 'Đơn gốc:' : 'Order:'} <span className="text-slate-700 dark:text-slate-300">#{c.orderId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">{c.customerName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{c.installationAddress}</div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{c.customerPhone}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.cls}`}>
                          <BadgeIcon className="h-3 w-3" />
                          <span>{c.connectionType}</span>
                        </span>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-1">{getPlanName({ name: c.planName }, language)}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          ${c.monthlyRental.toFixed(2)}/{isVi ? 'tháng' : 'mo'}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top font-mono text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.portNumber || '—'}</div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">IP: {c.ipAddress || '—'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">CPE: {c.assignedDeviceSerial || (isVi ? 'Chưa gán' : 'Not assigned')}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className={`font-mono font-bold ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>${due.toFixed(2)}</div>
                        <span
                          className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            due > 0 ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {due > 0 ? (isVi ? 'Còn dư nợ' : 'Unpaid Balance') : isVi ? 'Đã quyết toán' : 'Paid in Full'}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            CONNECTION_STATUS_CHIP[c.status] ?? CONNECTION_STATUS_CHIP['Permanently Inactive']
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${CONNECTION_STATUS_DOT[c.status] ?? 'bg-rose-500'}`}></span>
                          <span>{connectionStatusLabel(c.status, isVi)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : c.accountId)}
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
                        key={`${c.accountId}-details`}
                        className="bg-gradient-to-b from-emerald-50/50 to-slate-50 dark:from-emerald-950/20 dark:to-slate-950/40 border-b-2 border-emerald-400 dark:border-emerald-600/60"
                      >
                        <td colSpan={7} className="p-4 sm:p-6">
                          <ConnectionDetailsPanel
                            connection={c}
                            bills={connBills}
                            due={due}
                            payableBill={oldestUnpaidBill(connBills)}
                            onClose={() => setExpandedId(null)}
                            onOpenPayment={onOpenPayment}
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
    </div>
  );
}
