// Hàng đợi khảo sát: chỉ gồm đơn chi nhánh đã duyệt hồ sơ. Kỹ sư ghi kết quả khảo sát,
// lên lịch lắp đặt và cấp kết nối (gắn thiết bị) cho đơn khả thi.
import { useState } from 'react';
import { CalendarClock, Search, ShieldCheck, Wrench } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import { isReleasedToTechnical } from '../../types/nexus';
import Pagination from '../common/Pagination';

const STATUS_CHIP = {
  'Connection Provided':
    'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60',
  Feasible: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800/60',
  'Not Feasible':
    'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800/60',
  Pending:
    'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/60',
};
const STATUS_VI = {
  Pending: 'Chờ khảo sát',
  Feasible: 'Khả thi',
  'Not Feasible': 'Không khả thi',
  'Connection Provided': 'Đã cấp kết nối',
};
const TYPE_VI = { Broadband: 'Cáp quang', 'Dial-Up': 'Quay số', Landline: 'Cố định' };

const BTN = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs whitespace-nowrap';

export default function FeasibilityQueueTab({ onSurvey, onSchedule, onProvision }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const orders = useStore(nexusStore.orders);
  const connections = useStore(nexusStore.connections);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const awaitingRetail = orders.filter((o) => o.status === 'PendingRetail').length;
  const q = search.trim().toLowerCase();
  const queue = orders.filter(
    (o) =>
      isReleasedToTechnical(o.status) &&
      (statusFilter === 'All' || o.status === statusFilter) &&
      (!q ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.installationAddress.toLowerCase().includes(q)),
  );
  const pager = usePagination(queue, 8);

  const headers = [
    isVi ? 'Mã đơn hàng' : 'Order ID',
    isVi ? 'Khách hàng & Địa chỉ' : 'Customer & Location',
    isVi ? 'Gói cước & Loại mạng' : 'Plan & Type',
    isVi ? 'Khoảng cách cáp' : 'Loop Distance',
    isVi ? 'Suy hao tín hiệu' : 'Signal Loss',
    isVi ? 'Trạng thái khả thi' : 'Feasibility Status',
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50">
        <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-sky-900 dark:text-sky-200 leading-relaxed">
          {isVi
            ? 'Hàng đợi này chỉ chứa đơn đã được nhân viên bán hàng của chi nhánh duyệt hồ sơ. Đơn mới đăng ký (chờ bán hàng duyệt) không xuất hiện ở đây.'
            : "This queue only lists applications already cleared by the branch's retail staff. Newly submitted orders never appear here."}
          {awaitingRetail > 0 && (
            <span className="font-semibold">
              {' '}
              {isVi
                ? `Hiện có ${awaitingRetail} hồ sơ đang chờ bán hàng chi nhánh duyệt.`
                : `${awaitingRetail} application(s) still waiting on branch retail approval.`}
            </span>
          )}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              isVi ? 'Tìm theo Mã đơn, khách hàng, địa chỉ...' : 'Filter by Order ID, subscriber, or location...'
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pager.setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <label className="flex items-center space-x-2 text-xs w-full sm:w-auto">
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {isVi ? 'Trạng thái:' : 'Status:'}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              pager.setPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="All">{isVi ? 'Tất cả trạng thái' : 'All Statuses'}</option>
            <option value="Pending">{isVi ? 'Chờ khảo sát' : 'Pending Assessment'}</option>
            <option value="Feasible">{isVi ? 'Khả thi (Sẵn sàng cấp)' : 'Feasible (Ready for Provision)'}</option>
            <option value="Not Feasible">{isVi ? 'Không khả thi' : 'Not Feasible'}</option>
            <option value="Connection Provided">{isVi ? 'Đã cung cấp' : 'Connection Provided'}</option>
          </select>
        </label>
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
                <th className="px-4 py-3 text-right">{isVi ? 'Thao tác kỹ thuật' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    {isVi ? 'Không có đơn nào trong hàng đợi.' : 'No orders in the queue.'}
                  </td>
                </tr>
              ) : (
                pager.items.map((order) => {
                  const provisioned = connections.filter((c) => c.orderId === order.id);
                  const total = Math.max(1, order.bulkConnectionsCount || 1);
                  const loss = order.signalLossDbm;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{order.id}</span>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{order.createdAt}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">{order.customerName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {order.installationAddress}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{order.customerPhone}</div>
                        {order.assignedTechnician && (
                          <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                            <Wrench className="h-3 w-3" />
                            {isVi ? 'KTV:' : 'Tech:'} {order.assignedTechnician}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {isVi ? (TYPE_VI[order.connectionType] ?? order.connectionType) : order.connectionType}
                          </span>
                          {total > 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                              {total} {isVi ? 'kết nối' : 'conns'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                          {getPlanName({ name: order.planName }, language)}
                        </div>
                        {order.connectionType === 'Dial-Up' && (
                          <div
                            className={`text-[10px] mt-0.5 ${order.existingLandlineAccountId ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}`}
                          >
                            {order.existingLandlineAccountId
                              ? isVi
                                ? `Đã có cố định ${order.existingLandlineAccountId} (chỉ đo Internet)`
                                : `Internet leg only (has landline ${order.existingLandlineAccountId})`
                              : isVi
                                ? 'Cần đo: Cố định + Internet'
                                : 'Checks: landline + internet'}
                          </div>
                        )}
                      </td>
                      {/* Chưa khảo sát thì chưa có số đo. */}
                      <td className="px-4 py-3 align-top font-mono text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {order.cableDistanceMeters != null ? `${order.cableDistanceMeters} m` : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {order.dpBoxCapacity || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-xs tabular-nums">
                        {loss != null ? (
                          <span
                            className={`font-bold ${loss < -30 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                          >
                            {Number(loss).toFixed(1)} dBm
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_CHIP[order.status] ?? STATUS_CHIP.Pending}`}
                        >
                          {isVi
                            ? order.status === 'Feasible' && total > 1 && provisioned.length > 0
                              ? `Đang cấp (${provisioned.length}/${total})`
                              : (STATUS_VI[order.status] ?? order.status)
                            : order.status}
                        </span>
                        {order.retailApprovedBy && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            {isVi ? 'Bán hàng duyệt:' : 'Retail approved:'} {order.retailApprovedBy}
                            {order.retailOutletCode && ` · ${order.retailOutletCode}`}
                          </div>
                        )}
                        {total > 1 && (
                          <div className="mt-2 min-w-[120px]">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">{isVi ? 'Đã cấp:' : 'Provisioned:'}</span>
                              <span
                                className={
                                  provisioned.length >= total
                                    ? 'text-emerald-600 font-bold'
                                    : 'text-amber-600 font-bold'
                                }
                              >
                                {provisioned.length}/{total}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-0.5">
                              <div
                                className={`${provisioned.length >= total ? 'bg-emerald-500' : 'bg-amber-500'} h-full rounded-full`}
                                style={{ width: `${Math.round((provisioned.length / total) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        {order.assignedAccountId && order.status !== 'Connection Provided' && (
                          <div className="text-[10px] font-mono text-slate-500 mt-1">
                            Account ID: {order.assignedAccountId}
                          </div>
                        )}
                        {order.scheduledInstallDate && order.status === 'Feasible' && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                            <CalendarClock className="inline h-3 w-3 mr-0.5" />
                            {new Date(order.scheduledInstallDate).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        {order.status === 'Connection Provided' ? (
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              ✓ {isVi ? `Đã cấp đủ ${total} kết nối` : `All ${total} provisioned`}
                            </span>
                            {provisioned.length > 0 && (
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                {provisioned.length === 1
                                  ? provisioned[0].accountId
                                  : `${provisioned[0].accountId} … (+${provisioned.length - 1})`}
                              </div>
                            )}
                          </div>
                        ) : order.status === 'Feasible' ? (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSchedule(order)}
                              className={`${BTN} inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100`}
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                              {isVi ? 'Lịch lắp đặt' : 'Schedule'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onProvision(order)}
                              className={`${BTN} bg-amber-600 hover:bg-amber-700 text-white`}
                            >
                              {total > 1
                                ? isVi
                                  ? `Cấp kết nối (${provisioned.length + 1}/${total})`
                                  : `Provision (${provisioned.length + 1}/${total})`
                                : isVi
                                  ? 'Cung cấp kết nối'
                                  : 'Provide Connection'}
                            </button>
                          </div>
                        ) : (
                          // Chờ khảo sát, hoặc khảo sát lại đơn đã bị đánh giá không khả thi.
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSurvey(order, true)}
                              className={`${BTN} bg-emerald-600 hover:bg-emerald-700 text-white`}
                            >
                              {isVi ? 'Khả thi' : 'Feasible'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onSurvey(order, false)}
                              className={`${BTN} bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100`}
                            >
                              {isVi ? 'Không khả thi' : 'Not Feasible'}
                            </button>
                          </div>
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
    </div>
  );
}
