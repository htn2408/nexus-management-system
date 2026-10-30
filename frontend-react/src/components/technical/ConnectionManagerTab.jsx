// Tab Quản lý kết nối: danh sách mã tài khoản 16 ký tự, lọc theo trạng thái / loại mạch,
// mở rộng một dòng để đổi trạng thái đường truyền.
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, Phone, Radio, Search, Wifi, X, XCircle } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';
import { CONNECTION_STATUS_CHIP, CONNECTION_STATUS_DOT, connectionStatusLabel } from '../../lib/connectionStatus';
import ConnectionControlPanel from './ConnectionControlPanel';

const STATUS_PILLS = [
  { key: 'Active', vi: 'Hoạt động', en: 'Active', active: 'bg-emerald-600 text-white shadow-sm' },
  { key: 'Temporarily Inactive', vi: 'Tạm ngưng', en: 'Inactive', active: 'bg-amber-600 text-white shadow-sm' },
  { key: 'Permanently Inactive', vi: 'Ngắt kết nối', en: 'Disconnected', active: 'bg-rose-600 text-white shadow-sm' },
];
const TYPE_ICON = { Broadband: Wifi, Landline: Phone, 'Dial-Up': Radio };
const PILL_IDLE =
  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';

function matches(c, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    c.accountId.toLowerCase().includes(q) ||
    c.accountId.replace(/-/g, '').toLowerCase().includes(q.replace(/-/g, '')) ||
    c.customerName.toLowerCase().includes(q) ||
    (c.installationAddress ?? '').toLowerCase().includes(q) ||
    (c.assignedDeviceSerial ?? '').toLowerCase().includes(q) ||
    (c.portNumber ?? '').toLowerCase().includes(q)
  );
}

function Kpi({ label, icon: Icon, value, unit, note, tone }) {
  return (
    <div className={`p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm ${tone.border}`}>
      <div className={`text-[11px] font-mono uppercase tracking-wider flex items-center justify-between ${tone.text}`}>
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`text-2xl font-bold font-mono mt-1.5 ${tone.value}`}>
        {value}
        <span className="text-xs font-normal opacity-70 ml-1">{unit}</span>
      </div>
      <div className={`text-[10px] mt-1 opacity-80 ${tone.text}`}>{note}</div>
    </div>
  );
}

export default function ConnectionManagerTab({ initialAccountId = '', engineerId, engineerName, onSaved }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const connections = useStore(nexusStore.connections);
  const [search, setSearch] = useState(initialAccountId);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(initialAccountId || null);

  const countStatus = (s) => connections.filter((c) => c.status === s).length;
  const filtered = connections.filter(
    (c) =>
      matches(c, search) &&
      (statusFilter === 'All' || c.status === statusFilter) &&
      (typeFilter === 'All' || c.connectionType === typeFilter),
  );
  const pager = usePagination(filtered, 10);
  const update = (setter) => (value) => {
    setter(value);
    pager.setPage(1);
  };

  const quickOpen = () => {
    if (!search.trim()) {
      toast.info(
        isVi
          ? 'Vui lòng nhập Mã tài khoản hoặc tên khách hàng cần tra cứu.'
          : 'Please enter an Account ID or subscriber name.',
      );
      return;
    }
    const found = connections.find((c) => matches(c, search));
    if (found) {
      setStatusFilter('All');
      setTypeFilter('All');
      setExpandedId(found.accountId);
    } else {
      toast.error(isVi ? 'Không tìm thấy Mã tài khoản trong hệ thống.' : 'Account ID not found.');
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied Account ID: ${text}`);
    } catch {
      toast.info(text);
    }
  };

  const headers = [
    isVi ? 'Mã tài khoản' : 'Account ID',
    isVi ? 'Khách hàng & Địa chỉ' : 'Subscriber & Location',
    isVi ? 'Loại mạch & Gói cước' : 'Circuit & Plan',
    isVi ? 'Cổng NOC & IP' : 'NOC Port & IP',
    isVi ? 'Trạng thái mạch' : 'Circuit Status',
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label={isVi ? 'Mã tài khoản quản lý' : 'Managed Accounts'}
          icon={Radio}
          value={connections.length}
          unit={isVi ? 'mạch' : 'circuits'}
          note={isVi ? 'Đã cấp định danh 16 ký tự' : '16-char issued circuits'}
          tone={{
            border: 'border-slate-200 dark:border-slate-800',
            text: 'text-slate-500 dark:text-slate-400',
            value: 'text-slate-900 dark:text-white',
          }}
        />
        <Kpi
          label={isVi ? 'Đang hoạt động' : 'Active'}
          icon={CheckCircle2}
          value={countStatus('Active')}
          unit={isVi ? 'mạch' : 'circuits'}
          note={isVi ? 'Đang cung cấp dịch vụ' : 'In service'}
          tone={{
            border: 'border-emerald-200 dark:border-emerald-900/40',
            text: 'text-emerald-600 dark:text-emerald-400',
            value: 'text-emerald-600 dark:text-emerald-400',
          }}
        />
        <Kpi
          label={isVi ? 'Tạm ngưng dịch vụ' : 'Temporarily Inactive'}
          icon={AlertTriangle}
          value={countStatus('Temporarily Inactive')}
          unit={isVi ? 'tạm dừng' : 'on hold'}
          note={isVi ? 'Bảo trì / Nợ cước / Khách xin tạm ngưng' : 'Maintenance / Overdue / Customer request'}
          tone={{
            border: 'border-amber-200 dark:border-amber-900/40',
            text: 'text-amber-600 dark:text-amber-400',
            value: 'text-amber-700 dark:text-amber-400',
          }}
        />
        <Kpi
          label={isVi ? 'Ngắt kết nối vĩnh viễn' : 'Permanently Inactive'}
          icon={XCircle}
          value={countStatus('Permanently Inactive')}
          unit={isVi ? 'đã ngắt' : 'cut off'}
          note={isVi ? 'Đã thu hồi cổng & CPE' : 'CPE & Port reclaimed'}
          tone={{
            border: 'border-rose-200 dark:border-rose-900/40',
            text: 'text-rose-600 dark:text-rose-400',
            value: 'text-rose-700 dark:text-rose-400',
          }}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <form
          className="flex flex-col md:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            quickOpen();
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                isVi
                  ? 'Tra cứu theo Mã tài khoản (16 ký tự), tên khách hàng, địa chỉ, cổng NOC, serial thiết bị...'
                  : 'Search by 16-char Account ID, subscriber name, address, NOC port, device serial...'
              }
              value={search}
              onChange={(e) => update(setSearch)(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
            {search && (
              <button
                type="button"
                onClick={() => update(setSearch)('')}
                className="absolute right-3 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow whitespace-nowrap"
          >
            {isVi ? 'Tra cứu & Mở chi tiết' : 'Find & Open Details'}
          </button>
        </form>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 max-w-full">
            <button
              type="button"
              onClick={() => update(setStatusFilter)('All')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${statusFilter === 'All' ? 'bg-amber-600 text-white shadow-sm' : PILL_IDLE}`}
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
            <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {isVi ? 'Loại mạch:' : 'Circuit Type:'}
            </span>
            <select
              value={typeFilter}
              onChange={(e) => update(setTypeFilter)(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="All">{isVi ? 'Tất cả loại mạch' : 'All Types'}</option>
              <option value="Broadband">Broadband (Cáp quang)</option>
              <option value="Landline">Landline (Cố định)</option>
              <option value="Dial-Up">Dial-Up (Quay số)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Radio className="h-10 w-10 text-slate-400 mx-auto opacity-50" />
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isVi
                ? 'Không tìm thấy mã tài khoản nào khớp với bộ lọc.'
                : 'No accounts match the current filter criteria.'}
            </div>
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
                  const TypeIcon = TYPE_ICON[c.connectionType] ?? Radio;
                  return [
                    <tr
                      key={c.accountId}
                      className={`transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-950/20 ${isExpanded ? 'bg-amber-50/60 dark:bg-amber-950/30' : ''}`}
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                            {c.accountId}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(c.accountId)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
                            title={isVi ? 'Sao chép mã tài khoản' : 'Copy Account ID'}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          {isVi ? 'Đơn gốc:' : 'Order:'} #{c.orderId}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">{c.customerName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {c.installationAddress}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{c.customerPhone}</div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <TypeIcon className="h-3 w-3" />
                          {c.connectionType}
                        </span>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-1">
                          {getPlanName({ name: c.planName }, language)}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          ${Number(c.monthlyRental).toFixed(2)}/{isVi ? 'tháng' : 'mo'}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top font-mono text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.portNumber || '—'}</div>
                        <div className="text-slate-500 mt-0.5">IP: {c.ipAddress || '—'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          CPE: {c.assignedDeviceSerial || (isVi ? 'Chưa gán' : 'Not assigned')}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${CONNECTION_STATUS_CHIP[c.status] ?? CONNECTION_STATUS_CHIP['Permanently Inactive']}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${CONNECTION_STATUS_DOT[c.status] ?? 'bg-rose-500'}`}
                          ></span>
                          <span>{connectionStatusLabel(c.status, isVi)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : c.accountId)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            isExpanded
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>{isExpanded ? (isVi ? 'Thu gọn' : 'Collapse') : isVi ? 'Chi tiết' : 'Details'}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr
                        key={`${c.accountId}-details`}
                        className="bg-amber-50/30 dark:bg-amber-950/10 border-b-2 border-amber-400 dark:border-amber-600/60"
                      >
                        <td colSpan={6} className="p-4 sm:p-6">
                          <ConnectionControlPanel
                            connection={c}
                            engineerId={engineerId}
                            engineerName={engineerName}
                            onClose={() => setExpandedId(null)}
                            onSaved={onSaved}
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
