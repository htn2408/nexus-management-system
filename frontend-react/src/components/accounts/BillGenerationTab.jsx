// Lập hoá đơn cho một kết nối. Màn hình tính trước theo công thức của server; bấm "Phát hành"
// thì server tự tính lại, lưu, và hoá đơn hiện ra là đúng số liệu server trả về.
import { useState } from 'react';
import { toast } from 'sonner';
import { Receipt, Search } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { DEPOSIT_WAIVER_MIN_CONNECTIONS, isDepositWaived, nexusStore } from '../../context/NexusContext';
import { connectionStatusLabel } from '../../lib/connectionStatus';
import { getPlanName } from '../../lib/planI18n';
import { get, useStore } from '../../lib/store';
import { accountKey, money, previewBill, recentBillingPeriods } from './billMath';

const RECENT_KEY = 'nexus_recent_billing_accounts';
const INPUT =
  'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
const MONEY_INPUT = `${INPUT} w-36 text-right font-mono`;

function readRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function rememberRecent(accountId) {
  const next = [accountId, ...readRecent().filter((id) => accountKey(id) !== accountKey(accountId))].slice(0, 3);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Chỉ là tiện ích nhớ tài khoản gần đây; trình duyệt chặn lưu thì bỏ qua.
  }
  return next;
}

// Số liệu điền sẵn khi chọn một kết nối: cước tháng theo gói, cọc chỉ ở hoá đơn đầu tiên,
// chiết khấu theo đơn hàng (bulk).
function defaultsFor(accountId) {
  const connection = get(nexusStore.connections).find((c) => accountKey(c.accountId) === accountKey(accountId));
  if (!connection) return null;
  const order =
    get(nexusStore.orders).find((o) => o.id === connection.orderId) ??
    get(nexusStore.orders).find((o) => accountKey(o.assignedAccountId) === accountKey(connection.accountId));
  const waived = !!order && (order.depositWaived ?? isDepositWaived(order.bulkConnectionsCount));
  const hasBills = get(nexusStore.bills).some((b) => accountKey(b.accountId) === accountKey(accountId));
  return {
    securityDeposit: String(waived || hasBills ? 0 : connection.securityDeposit || 0),
    monthlyRental: String(connection.monthlyRental || 0),
    hourlyCharges: '0',
    discountPercent: String(order?.bulkDiscountPercent ?? 0),
  };
}

const EMPTY = { securityDeposit: '0', monthlyRental: '0', hourlyCharges: '0', discountPercent: '0' };

export default function BillGenerationTab({ initialAccountId = '', taxRate, onCreated }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const connections = useStore(nexusStore.connections);
  const orders = useStore(nexusStore.orders);
  const bills = useStore(nexusStore.bills);

  const [periods] = useState(() => recentBillingPeriods());
  const [accountId, setAccountId] = useState(initialAccountId);
  const [form, setForm] = useState(() => (initialAccountId && defaultsFor(initialAccountId)) || EMPTY);
  const [billingMonth, setBillingMonth] = useState(periods[0].value);
  const [recent, setRecent] = useState(readRecent);
  const [isSaving, setIsSaving] = useState(false);

  const connection = connections.find((c) => accountKey(c.accountId) === accountKey(accountId)) ?? null;
  const order = connection
    ? (orders.find((o) => o.id === connection.orderId) ??
      orders.find((o) => accountKey(o.assignedAccountId) === accountKey(connection.accountId)))
    : null;
  const waived = !!order && (order.depositWaived ?? isDepositWaived(order.bulkConnectionsCount));
  const previousBills = connection
    ? bills.filter((b) => accountKey(b.accountId) === accountKey(connection.accountId))
    : [];

  const num = (field) => Math.max(0, Number(form[field]) || 0);
  const preview = previewBill({
    securityDeposit: waived ? 0 : num('securityDeposit'),
    monthlyRental: num('monthlyRental'),
    hourlyCharges: num('hourlyCharges'),
    discountPercent: Math.min(100, num('discountPercent')),
    taxRate: taxRate ?? 0,
  });
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const selectAccount = (id) => {
    setAccountId(id);
    const defaults = defaultsFor(id);
    if (defaults) setForm(defaults);
    else toast.error(isVi ? `Không tìm thấy kết nối ${id}.` : `No connection ${id}.`);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!connection) {
      toast.error(isVi ? 'Chọn một kết nối có thật trước khi lập hoá đơn.' : 'Pick an existing connection first.');
      return;
    }
    setIsSaving(true);
    try {
      const bill = await nexusStore.generateBill({
        accountId: connection.accountId,
        billingMonth,
        securityDeposit: waived ? 0 : num('securityDeposit'),
        monthlyRental: num('monthlyRental'),
        hourlyCharges: num('hourlyCharges'),
        discountPercent: Math.min(100, num('discountPercent')),
      });
      setRecent(rememberRecent(connection.accountId));
      toast.success(isVi ? `Đã phát hành hoá đơn ${bill.invoiceNumber}.` : `Invoice ${bill.invoiceNumber} issued.`);
      onCreated(bill);
      setForm(defaultsFor(connection.accountId) ?? EMPTY);
    } catch (err) {
      toast.error(isVi ? 'Chưa phát hành được hoá đơn' : 'The invoice was not issued', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const recentConnections = recent
    .map((id) => connections.find((c) => accountKey(c.accountId) === accountKey(id)))
    .filter(Boolean);

  return (
    <form
      onSubmit={submit}
      className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
    >
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {isVi ? 'Mã tài khoản thuê bao *' : 'Subscriber Account ID *'}
        </label>
        <div className="flex gap-2">
          <input
            list="billing-accounts"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="B064-000000000002"
            className={`${INPUT} font-mono`}
          />
          <datalist id="billing-accounts">
            {connections.map((c) => (
              <option key={c.accountId} value={c.accountId}>
                {c.customerName}
              </option>
            ))}
          </datalist>
          <button
            type="button"
            onClick={() => selectAccount(accountId.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <Search className="h-4 w-4" />
            {isVi ? 'Nạp thông số' : 'Load'}
          </button>
        </div>
        {recentConnections.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
            <span className="text-slate-500">{isVi ? 'Gần đây:' : 'Recent:'}</span>
            {recentConnections.map((c) => (
              <button
                key={c.accountId}
                type="button"
                onClick={() => selectAccount(c.accountId)}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:border-blue-400 font-mono"
              >
                {c.accountId} · {c.customerName}
              </button>
            ))}
          </div>
        )}
      </div>

      {connection ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-xs">
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{connection.customerName}</div>
            <div className="text-slate-500">{connection.customerPhone}</div>
            <div className="text-slate-500 line-clamp-2">{connection.installationAddress}</div>
          </div>
          <div>
            <div>
              {getPlanName({ name: connection.planName }, language)} · {connection.connectionType}
            </div>
            <div className="text-slate-500">
              {isVi ? 'Cước tháng' : 'Monthly'} {money(connection.monthlyRental)} ·{' '}
              {isVi ? 'cọc theo gói' : 'plan deposit'} {money(connection.securityDeposit)}
            </div>
            <div className="text-slate-500">{connectionStatusLabel(connection.status, isVi)}</div>
          </div>
          <div>
            <div>{isVi ? `Đã có ${previousBills.length} hoá đơn` : `${previousBills.length} previous invoice(s)`}</div>
            {order?.bulkDiscountPercent > 0 && (
              <div className="text-emerald-700 dark:text-emerald-400">
                {isVi
                  ? `Ưu đãi ${order.bulkDiscountPercent}% (${order.bulkConnectionsCount} kết nối)`
                  : `${order.bulkDiscountPercent}% bulk discount (${order.bulkConnectionsCount} connections)`}
              </div>
            )}
            {waived && (
              <div className="text-emerald-700 dark:text-emerald-400">
                {isVi
                  ? `Miễn cọc: đơn trên ${DEPOSIT_WAIVER_MIN_CONNECTIONS} kết nối`
                  : `Deposit waived: over ${DEPOSIT_WAIVER_MIN_CONNECTIONS} connections`}
              </div>
            )}
          </div>
        </div>
      ) : (
        accountId.trim() && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {isVi
              ? 'Chưa khớp kết nối nào. Gõ đủ mã hoặc chọn từ danh sách gợi ý rồi bấm "Nạp thông số".'
              : 'No matching connection. Type the full ID or pick one, then click "Load".'}
          </p>
        )
      )}

      <div className="max-w-xs">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {isVi ? 'Kỳ tính cước' : 'Billing period'}
        </label>
        <select value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} className={INPUT}>
          {periods.map((p) => (
            <option key={p.value} value={p.value}>
              {isVi ? p.vi : p.value}
              {p.current ? (isVi ? ' (kỳ hiện tại)' : ' (current)') : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5">{isVi ? 'Khoản thu' : 'Line item'}</th>
              <th className="px-4 py-2.5 text-right">{isVi ? 'Số tiền ($)' : 'Amount ($)'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr>
              <td className="px-4 py-3">
                <div className="font-semibold">
                  {isVi ? 'Tiền đặt cọc (hoàn lại khi chấm dứt)' : 'Security deposit (refundable)'}
                </div>
                <div className="text-slate-500">
                  {waived
                    ? isVi
                      ? 'Được miễn theo đơn hàng.'
                      : 'Waived for this order.'
                    : previousBills.length > 0
                      ? isVi
                        ? 'Đã thu ở hoá đơn đầu, các kỳ sau để 0.'
                        : 'Collected on the first invoice; 0 for later periods.'
                      : isVi
                        ? 'Thu một lần ở hoá đơn đầu tiên.'
                        : 'Charged once, on the first invoice.'}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={waived}
                  value={waived ? '0' : form.securityDeposit}
                  onChange={set('securityDeposit')}
                  className={MONEY_INPUT}
                />
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold">{isVi ? 'Cước thuê bao tháng' : 'Monthly rental'}</td>
              <td className="px-4 py-3 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthlyRental}
                  onChange={set('monthlyRental')}
                  className={MONEY_INPUT}
                />
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <div className="font-semibold">{isVi ? 'Cước theo giờ / lưu lượng' : 'Hourly / metered charges'}</div>
                <div className="text-slate-500">{isVi ? 'Không được chiết khấu.' : 'Not discounted.'}</div>
              </td>
              <td className="px-4 py-3 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.hourlyCharges}
                  onChange={set('hourlyCharges')}
                  className={MONEY_INPUT}
                />
              </td>
            </tr>
            <tr className="bg-emerald-50/50 dark:bg-emerald-950/20">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 font-semibold">
                  {isVi ? 'Chiết khấu' : 'Discount'}
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={form.discountPercent}
                    onChange={set('discountPercent')}
                    className={`${INPUT} w-20 py-1 text-right font-mono`}
                  />
                  <span className="text-slate-500 font-normal">
                    {isVi ? '% của (cọc + cước tháng)' : '% of (deposit + rental)'}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                −{money(preview.discountAmount)}
              </td>
            </tr>
            <tr className="bg-slate-50 dark:bg-slate-950 font-semibold">
              <td className="px-4 py-2.5">{isVi ? 'Tạm tính (cơ sở tính thuế)' : 'Subtotal (taxable)'}</td>
              <td className="px-4 py-2.5 text-right font-mono">{money(preview.subtotal)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5">
                {isVi ? 'Thuế dịch vụ' : 'Service tax'} {taxRate == null ? '' : `(${taxRate}%)`}
                <span className="text-slate-500"> · {isVi ? 'theo biểu cước' : 'per charge settings'}</span>
              </td>
              <td className="px-4 py-2.5 text-right font-mono">+{money(preview.serviceTaxAmount)}</td>
            </tr>
            <tr className="bg-slate-900 text-white font-bold text-sm">
              <td className="px-4 py-3">{isVi ? 'Tổng cộng' : 'Total'}</td>
              <td className="px-4 py-3 text-right font-mono">{money(preview.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving || !connection || taxRate == null}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow disabled:opacity-60"
        >
          <Receipt className="h-4 w-4" />
          {isSaving ? (isVi ? 'Đang phát hành...' : 'Issuing...') : isVi ? 'Phát hành hoá đơn' : 'Issue invoice'}
        </button>
      </div>
    </form>
  );
}
