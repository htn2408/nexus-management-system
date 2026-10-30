// Danh sách kết nối cho kế toán: biết kết nối nào chưa có hoá đơn đầu kỳ để lập.
import { useState } from 'react';
import {
  AlertCircle,
  ArrowDownUp,
  CheckCircle2,
  Eye,
  Network,
  Phone,
  Radio,
  Receipt,
  Search,
  Wallet,
  Wifi,
  X,
} from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { CONNECTION_STATUS_CHIP, connectionStatusLabel } from '../../lib/connectionStatus';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';
import ConnectionDetailModal from './ConnectionDetailModal';
import { accountKey, money } from './billMath';

const TYPE_ICON = { Broadband: Wifi, 'Dial-Up': Radio, Landline: Phone };
const SORTS = [
  ['newest', 'Mới lắp đặt gần nhất', 'Newest installed'],
  ['oldest', 'Lắp đặt cũ nhất', 'Oldest installed'],
  ['unbilled-first', 'Ưu tiên: chưa lập HĐ', 'Unbilled first'],
  ['name-asc', 'Tên khách (A → Z)', 'Name (A → Z)'],
  ['rental-high', 'Cước tháng: cao → thấp', 'Rental: high to low'],
  ['rental-low', 'Cước tháng: thấp → cao', 'Rental: low to high'],
];
const PILL = 'px-2.5 py-1 rounded-lg font-semibold transition';
const PILL_ON = 'bg-blue-600 text-white shadow-sm';
const PILL_OFF =
  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';

function Kpi({ icon: Icon, tone, label, value, note }) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">{value}</div>
        <div className="text-[11px] text-slate-400">{note}</div>
      </div>
    </div>
  );
}

export default function ConnectionsTab({ onBill }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const connections = useStore(nexusStore.connections);
  const bills = useStore(nexusStore.bills);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [typeFilter, setTypeFilter] = useState('all');
  const [billingFilter, setBillingFilter] = useState('all');
  const [detail, setDetail] = useState(null);

  const billsOf = (accountId) => bills.filter((b) => accountKey(b.accountId) === accountKey(accountId));
  const billedKeys = new Set(bills.map((b) => accountKey(b.accountId)));
  const isBilled = (c) => billedKeys.has(accountKey(c.accountId));
  const unbilledCount = connections.filter((c) => !isBilled(c)).length;
  const monthlyBase = connections.reduce((sum, c) => sum + (c.monthlyRental || 0), 0);

  const q = search.trim().toLowerCase();
  const matches = (c) =>
    !q ||
    [
      c.accountId,
      c.orderId,
      c.customerName,
      c.customerPhone,
      c.customerEmail,
      c.installationAddress,
      c.planName,
      c.ipAddress,
      c.assignedDeviceSerial,
    ]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q));
  const byInstalled = (a, b) => (b.installedDate || '').localeCompare(a.installedDate || '');
  const sorters = {
    newest: byInstalled,
    oldest: (a, b) => -byInstalled(a, b),
    'unbilled-first': (a, b) => Number(isBilled(a)) - Number(isBilled(b)) || byInstalled(a, b),
    'name-asc': (a, b) => a.customerName.localeCompare(b.customerName, 'vi'),
    'rental-high': (a, b) => (b.monthlyRental || 0) - (a.monthlyRental || 0),
    'rental-low': (a, b) => (a.monthlyRental || 0) - (b.monthlyRental || 0),
  };
  const filtered = connections
    .filter(
      (c) =>
        matches(c) &&
        (typeFilter === 'all' || c.connectionType === typeFilter) &&
        (billingFilter === 'all' || (billingFilter === 'unbilled' ? !isBilled(c) : isBilled(c))),
    )
    .sort(sorters[sort]);
  const pager = usePagination(filtered, 10);
  const update = (setter) => (value) => {
    setter(value);
    pager.setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={Network}
          tone="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
          label={isVi ? 'Tổng số kết nối' : 'Total connections'}
          value={connections.length}
          note={isVi ? 'Đã cấp cho thuê bao' : 'Provisioned links'}
        />
        <Kpi
          icon={CheckCircle2}
          tone="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
          label={isVi ? 'Đang hoạt động' : 'Active lines'}
          value={connections.filter((c) => c.status === 'Active').length}
          note={isVi ? 'Đang tính cước' : 'Being billed'}
        />
        <Kpi
          icon={AlertCircle}
          tone="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
          label={isVi ? 'Chờ lập HĐ đầu kỳ' : 'Awaiting first bill'}
          value={unbilledCount}
          note={isVi ? 'Chưa có hoá đơn nào' : 'No invoice yet'}
        />
        <Kpi
          icon={Wallet}
          tone="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400"
          label={isVi ? 'Cước định kỳ/tháng' : 'Monthly recurring'}
          value={money(monthlyBase)}
          note={isVi ? 'Tổng cước gói của thuê bao' : 'Sum of monthly rentals'}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => update(setSearch)(e.target.value)}
              placeholder={
                isVi
                  ? 'Tìm theo mã tài khoản, tên khách, SĐT, địa chỉ, gói cước, IP...'
                  : 'Search by Account ID, name, phone, address, plan, IP...'
              }
              className="w-full pl-9 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => update(setSearch)('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <label className="md:col-span-4 relative flex items-center">
            <ArrowDownUp className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => update(setSort)(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORTS.map(([key, vi, en]) => (
                <option key={key} value={key}>
                  {isVi ? vi : en}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 mr-1">{isVi ? 'Loại dịch vụ:' : 'Type:'}</span>
            {['all', 'Broadband', 'Dial-Up', 'Landline'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => update(setTypeFilter)(type)}
                className={`${PILL} ${typeFilter === type ? PILL_ON : PILL_OFF}`}
              >
                {type === 'all' ? (isVi ? 'Tất cả loại' : 'All types') : type}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 mr-1">{isVi ? 'Hoá đơn:' : 'Billing:'}</span>
            {[
              ['all', 'Tất cả', 'All'],
              ['unbilled', `Chưa lập HĐ (${unbilledCount})`, `Unbilled (${unbilledCount})`],
              ['billed', 'Đã có HĐ', 'Billed'],
            ].map(([key, vi, en]) => (
              <button
                key={key}
                type="button"
                onClick={() => update(setBillingFilter)(key)}
                className={`${PILL} ${billingFilter === key ? PILL_ON : PILL_OFF}`}
              >
                {isVi ? vi : en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">{isVi ? 'Mã tài khoản / Đơn' : 'Account & order'}</th>
                <th className="px-4 py-3">{isVi ? 'Khách hàng & Địa chỉ' : 'Subscriber & address'}</th>
                <th className="px-4 py-3">{isVi ? 'Gói dịch vụ' : 'Plan'}</th>
                <th className="px-4 py-3">{isVi ? 'Cước tháng / Cọc' : 'Monthly / deposit'}</th>
                <th className="px-4 py-3 text-center">{isVi ? 'Đường truyền' : 'Line'}</th>
                <th className="px-4 py-3 text-center">{isVi ? 'Hoá đơn' : 'Billing'}</th>
                <th className="px-4 py-3 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    {isVi ? 'Không có kết nối nào khớp.' : 'No connections match.'}
                  </td>
                </tr>
              ) : (
                pager.items.map((c) => {
                  const TypeIcon = TYPE_ICON[c.connectionType] ?? Network;
                  const count = billsOf(c.accountId).length;
                  return (
                    <tr key={c.accountId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 align-top">
                        <button
                          type="button"
                          onClick={() => setDetail(c)}
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {c.accountId}
                        </button>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isVi ? 'Đơn:' : 'Order:'} {c.orderId}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isVi ? 'Lắp ngày:' : 'Installed:'} {c.installedDate || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-bold text-slate-900 dark:text-white">{c.customerName}</div>
                        <div className="text-slate-500">{c.customerPhone}</div>
                        <div className="text-slate-400 line-clamp-1 max-w-[220px]" title={c.installationAddress}>
                          {c.installationAddress}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                          <TypeIcon className="h-2.5 w-2.5" />
                          {c.connectionType}
                        </span>
                        <div className="mt-1 text-slate-700 dark:text-slate-300">
                          {getPlanName({ name: c.planName }, language)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top font-mono">
                        <div className="font-bold">{money(c.monthlyRental)}</div>
                        <div className="text-[10px] text-slate-500">
                          {isVi ? 'Cọc:' : 'Deposit:'} {money(c.securityDeposit)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${CONNECTION_STATUS_CHIP[c.status] ?? CONNECTION_STATUS_CHIP['Permanently Inactive']}`}
                        >
                          {connectionStatusLabel(c.status, isVi)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top text-center">
                        {count > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {isVi ? `${count} hoá đơn` : `${count} invoice(s)`}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                            {isVi ? 'Chưa lập HĐ' : 'Unbilled'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onBill(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          {isVi ? 'Lập HĐ' : 'Bill'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetail(c)}
                          className="ml-1.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isVi ? 'Chi tiết' : 'Details'}
                        </button>
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

      {detail && (
        <ConnectionDetailModal
          connection={detail}
          bills={billsOf(detail.accountId)}
          onClose={() => setDetail(null)}
          onBill={(c) => {
            setDetail(null);
            onBill(c);
          }}
        />
      )}
    </div>
  );
}
