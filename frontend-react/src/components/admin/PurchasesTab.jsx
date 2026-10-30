// Mua hàng: (1) yêu cầu nhập hàng từ Kỹ thuật — duyệt, nhập kho (server tạo thiết bị + cộng kho),
// từ chối kèm lý do, hoặc lập đơn mua; (2) đơn mua từ nhà cung cấp — nhận hàng (tự cộng kho), huỷ, xoá.
import { useState } from 'react';
import { CheckCircle2, PackageCheck, Plus, Search, ShoppingCart, Trash2, Truck, XCircle } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { useServerAction } from '../../hooks/useServerAction';
import { useStore } from '../../lib/store';
import ConfirmDialog from '../common/ConfirmDialog';
import ModalShell from '../common/ModalShell';
import Pagination from '../common/Pagination';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';
import PurchaseOrderModal from './PurchaseOrderModal';

const REQUEST_CHIP = {
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  Approved: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  Fulfilled: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
};
const PO_CHIP = {
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  Received: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
};
const SMALL_BTN = 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold';

function RejectRequestModal({ request, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [reason, setReason] = useState('');
  const { busy, run } = useServerAction(isVi);
  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(
      () => nexusStore.setEquipmentRequestStatus(request.id, 'Rejected', reason.trim()),
      isVi ? `Đã từ chối yêu cầu #${request.id}.` : `Rejected #${request.id}.`,
    );
    if (ok) onClose();
  };
  return (
    <ModalShell
      icon={XCircle}
      iconClass="text-rose-500"
      title={isVi ? 'Từ chối yêu cầu nhập hàng' : 'Reject equipment request'}
      subtitle={`#${request.id} — ${request.itemName} × ${request.quantity}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className={LABEL_CLS}>
            {isVi ? 'Lý do (gửi cho kỹ thuật viên) *' : 'Reason (sent to the technician) *'}
          </label>
          <textarea
            required
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={FIELD_CLS}
          ></textarea>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60"
          >
            {isVi ? 'Từ chối' : 'Reject'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function SearchBar({ value, onChange, placeholder, status, onStatus, statuses, allLabel }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
      >
        <option value="all">{allLabel}</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PurchasesTab() {
  const isVi = useStore(languageStore.language) === 'vi';
  const requests = useStore(nexusStore.equipmentRequests);
  const purchaseOrders = useStore(nexusStore.purchaseOrders);
  const [sub, setSub] = useState('requests');
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatus, setReqStatus] = useState('all');
  const [poSearch, setPoSearch] = useState('');
  const [poStatus, setPoStatus] = useState('all');
  const [poModal, setPoModal] = useState(null); // { fromRequest? }
  const [rejecting, setRejecting] = useState(null);
  const [deletingPo, setDeletingPo] = useState(null);
  const { busy, run } = useServerAction(isVi);

  const rq = reqSearch.trim().toLowerCase();
  const filteredRequests = requests.filter(
    (r) =>
      (reqStatus === 'all' || r.status === reqStatus) &&
      (!rq ||
        [r.id, r.itemName, r.deviceType, r.storeName, r.employeeName, r.orderId, r.reason].some((v) =>
          (v ?? '').toLowerCase().includes(rq),
        )),
  );
  const pq = poSearch.trim().toLowerCase();
  const filteredPos = purchaseOrders.filter(
    (p) =>
      (poStatus === 'all' || p.status === poStatus) &&
      (!pq || [p.id, p.itemCode, p.itemName, p.vendorName].some((v) => (v ?? '').toLowerCase().includes(pq))),
  );
  const reqPager = usePagination(filteredRequests, 8);
  const poPager = usePagination(filteredPos, 8);

  const setRequestStatus = (r, status, notes, message) =>
    run(() => nexusStore.setEquipmentRequestStatus(r.id, status, notes), message);
  const changePoStatus = (p, status, message) => run(() => nexusStore.setPurchaseOrderStatus(p.id, status), message);
  const deletePo = async () => {
    const ok = await run(
      () => nexusStore.deletePurchaseOrder(deletingPo.id),
      isVi ? `Đã xoá đơn mua ${deletingPo.id}.` : `Deleted ${deletingPo.id}.`,
    );
    if (ok) setDeletingPo(null);
  };

  const subTab = (key, icon, label, count) => {
    const Icon = icon;
    return (
      <button
        type="button"
        onClick={() => setSub(key)}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
          sub === key
            ? 'bg-indigo-600 text-white shadow'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
        {count > 0 && (
          <span className="px-1.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold">{count}</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {subTab(
            'requests',
            Truck,
            isVi ? 'Yêu cầu từ Kỹ thuật' : 'Requests from Technical',
            requests.filter((r) => r.status === 'Pending').length,
          )}
          {subTab('orders', ShoppingCart, isVi ? 'Đơn mua nhà cung cấp' : 'Vendor purchase orders', 0)}
        </div>
        {sub === 'orders' && (
          <button
            type="button"
            onClick={() => setPoModal({})}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow"
          >
            <Plus className="h-4 w-4" />
            {isVi ? 'Tạo đơn mua' : 'New purchase order'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {sub === 'requests' ? (
          <>
            <SearchBar
              value={reqSearch}
              onChange={(v) => {
                setReqSearch(v);
                reqPager.setPage(1);
              }}
              placeholder={
                isVi
                  ? 'Tìm mã yêu cầu, thiết bị, chi nhánh, kỹ thuật viên...'
                  : 'Search request, item, branch, technician...'
              }
              status={reqStatus}
              onStatus={(v) => {
                setReqStatus(v);
                reqPager.setPage(1);
              }}
              statuses={Object.keys(REQUEST_CHIP)}
              allLabel={isVi ? 'Tất cả trạng thái' : 'All statuses'}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">{isVi ? 'Yêu cầu' : 'Request'}</th>
                    <th className="px-3 py-2.5">{isVi ? 'Thiết bị' : 'Item'}</th>
                    <th className="px-3 py-2.5">{isVi ? 'Chi nhánh / Người gửi' : 'Branch / By'}</th>
                    <th className="px-3 py-2.5">{isVi ? 'Lý do' : 'Reason'}</th>
                    <th className="px-3 py-2.5">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th className="px-3 py-2.5 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                        {isVi ? 'Không có yêu cầu nào.' : 'No requests.'}
                      </td>
                    </tr>
                  ) : (
                    reqPager.items.map((r) => (
                      <tr key={r.id} className="align-top">
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.id}</div>
                          <div className="text-[10px] text-slate-500">{r.createdAt}</div>
                          <div className="text-[10px] text-slate-500">{r.urgency}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold">
                            {r.itemName} × {r.quantity}
                          </div>
                          <div className="text-[10px] text-slate-500">{r.deviceType}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div>{r.storeName || r.storeId}</div>
                          <div className="text-[10px] text-slate-500">{r.employeeName}</div>
                          {r.orderId && <div className="text-[10px] font-mono text-slate-500">#{r.orderId}</div>}
                        </td>
                        <td className="px-3 py-2.5 max-w-[220px]">
                          <div className="text-slate-600 dark:text-slate-300">{r.reason || '—'}</div>
                          {r.adminNotes && (
                            <div className="text-[10px] text-slate-500 mt-0.5">Admin: {r.adminNotes}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${REQUEST_CHIP[r.status] ?? REQUEST_CHIP.Pending}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                          {r.status === 'Pending' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setRequestStatus(
                                  r,
                                  'Approved',
                                  undefined,
                                  isVi ? `Đã duyệt #${r.id}.` : `Approved #${r.id}.`,
                                )
                              }
                              className={`${SMALL_BTN} bg-blue-600 hover:bg-blue-700 text-white`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {isVi ? 'Duyệt' : 'Approve'}
                            </button>
                          )}
                          {(r.status === 'Pending' || r.status === 'Approved') && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  setRequestStatus(
                                    r,
                                    'Fulfilled',
                                    undefined,
                                    isVi
                                      ? `Đã nhập ${r.quantity} × ${r.itemName} về ${r.storeName || r.storeId}.`
                                      : `Fulfilled #${r.id}.`,
                                  )
                                }
                                className={`${SMALL_BTN} bg-emerald-600 hover:bg-emerald-700 text-white`}
                                title={
                                  isVi
                                    ? 'Tạo thiết bị và cộng kho cho chi nhánh'
                                    : 'Creates the devices and restocks the branch'
                                }
                              >
                                <PackageCheck className="h-3 w-3" />
                                {isVi ? 'Nhập kho' : 'Fulfil'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPoModal({ fromRequest: r })}
                                className={`${SMALL_BTN} border border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40`}
                              >
                                <ShoppingCart className="h-3 w-3" />
                                {isVi ? 'Lập đơn mua' : 'Order'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejecting(r)}
                                className={`${SMALL_BTN} border border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
                              >
                                <XCircle className="h-3 w-3" />
                                {isVi ? 'Từ chối' : 'Reject'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination {...reqPager.props} />
          </>
        ) : (
          <>
            <SearchBar
              value={poSearch}
              onChange={(v) => {
                setPoSearch(v);
                poPager.setPage(1);
              }}
              placeholder={isVi ? 'Tìm mã đơn mua, vật tư, nhà cung cấp...' : 'Search order, item, vendor...'}
              status={poStatus}
              onStatus={(v) => {
                setPoStatus(v);
                poPager.setPage(1);
              }}
              statuses={Object.keys(PO_CHIP)}
              allLabel={isVi ? 'Tất cả trạng thái' : 'All statuses'}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">{isVi ? 'Đơn mua' : 'Order'}</th>
                    <th className="px-3 py-2.5">{isVi ? 'Vật tư' : 'Item'}</th>
                    <th className="px-3 py-2.5">{isVi ? 'Nhà cung cấp' : 'Vendor'}</th>
                    <th className="px-3 py-2.5 text-right">{isVi ? 'Thành tiền' : 'Total'}</th>
                    <th className="px-3 py-2.5">{isVi ? 'Ngày' : 'Dates'}</th>
                    <th className="px-3 py-2.5">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th className="px-3 py-2.5 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                        {isVi ? 'Chưa có đơn mua nào.' : 'No purchase orders.'}
                      </td>
                    </tr>
                  ) : (
                    poPager.items.map((p) => (
                      <tr key={p.id} className="align-top">
                        <td className="px-3 py-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.id}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold">
                            {p.itemName} × {p.quantity}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {p.itemCode} · {p.storeId || (isVi ? 'kho tổng' : 'central')}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{p.vendorName || p.vendorId}</td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          ${Number(p.totalCost ?? p.quantity * p.unitCost).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-slate-500">
                          <div>
                            {isVi ? 'Đặt' : 'Ordered'} {p.orderDate || '—'}
                          </div>
                          {p.expectedDate && (
                            <div>
                              {isVi ? 'Dự kiến' : 'Expected'} {p.expectedDate}
                            </div>
                          )}
                          {p.receivedDate && (
                            <div>
                              {isVi ? 'Đã nhận' : 'Received'} {p.receivedDate}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${PO_CHIP[p.status] ?? PO_CHIP.Draft}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                          {(p.status === 'Submitted' || p.status === 'Draft') && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  changePoStatus(
                                    p,
                                    'Received',
                                    isVi
                                      ? `Đã nhận ${p.quantity} × ${p.itemName}, kho đã được cộng.`
                                      : `Received ${p.quantity} × ${p.itemName}; stock updated.`,
                                  )
                                }
                                className={`${SMALL_BTN} bg-emerald-600 hover:bg-emerald-700 text-white`}
                              >
                                <PackageCheck className="h-3 w-3" />
                                {isVi ? 'Đã nhận hàng' : 'Received'}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  changePoStatus(p, 'Cancelled', isVi ? `Đã huỷ ${p.id}.` : `Cancelled ${p.id}.`)
                                }
                                className={`${SMALL_BTN} border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300`}
                              >
                                {isVi ? 'Huỷ' : 'Cancel'}
                              </button>
                            </>
                          )}
                          {p.status !== 'Received' && (
                            <button
                              type="button"
                              onClick={() => setDeletingPo(p)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600"
                              title={isVi ? 'Xoá' : 'Delete'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination {...poPager.props} />
          </>
        )}
      </div>

      {poModal && (
        <PurchaseOrderModal
          fromRequest={poModal.fromRequest}
          onClose={() => {
            setPoModal(null);
            setSub('orders');
          }}
        />
      )}
      {rejecting && <RejectRequestModal request={rejecting} onClose={() => setRejecting(null)} />}
      {deletingPo && (
        <ConfirmDialog
          title={isVi ? 'Xoá đơn mua' : 'Delete purchase order'}
          message={
            isVi
              ? `Xoá đơn mua ${deletingPo.id} (${deletingPo.itemName})?`
              : `Delete ${deletingPo.id} (${deletingPo.itemName})?`
          }
          busy={busy}
          onConfirm={deletePo}
          onCancel={() => setDeletingPo(null)}
        />
      )}
    </div>
  );
}
