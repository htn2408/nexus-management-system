// Chi tiết một kết nối cho kế toán: liên hệ, thông số gói cước, các hoá đơn đã lập.
import { Receipt, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { connectionStatusLabel } from '../../lib/connectionStatus';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import BillStatusBadge from '../user/BillStatusBadge';
import { money } from './billMath';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900 dark:text-white break-all">{children || '—'}</span>
    </div>
  );
}

export default function ConnectionDetailModal({ connection: c, bills, onClose, onBill }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">{c.accountId}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {c.customerName} · {isVi ? 'Đơn' : 'Order'} {c.orderId}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[65vh] overflow-y-auto">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {isVi ? 'Khách hàng' : 'Subscriber'}
            </h4>
            <Row label={isVi ? 'Họ tên' : 'Name'}>{c.customerName}</Row>
            <Row label={isVi ? 'Điện thoại' : 'Phone'}>{c.customerPhone}</Row>
            <Row label="Email">{c.customerEmail}</Row>
            <Row label={isVi ? 'Địa chỉ lắp đặt' : 'Installation'}>{c.installationAddress}</Row>
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              {isVi ? 'Gói cước & đường truyền' : 'Plan & line'}
            </h4>
            <Row label={isVi ? 'Gói cước' : 'Plan'}>{getPlanName({ name: c.planName }, language)}</Row>
            <Row label={isVi ? 'Loại kết nối' : 'Type'}>{c.connectionType}</Row>
            <Row label={isVi ? 'Cước tháng' : 'Monthly rental'}>{money(c.monthlyRental)}</Row>
            <Row label={isVi ? 'Tiền cọc theo gói' : 'Plan deposit'}>{money(c.securityDeposit)}</Row>
            <Row label={isVi ? 'Trạng thái' : 'Status'}>{connectionStatusLabel(c.status, isVi)}</Row>
            <Row label={isVi ? 'Ngày lắp đặt' : 'Installed'}>{c.installedDate}</Row>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              {isVi ? `Hoá đơn đã lập (${bills.length})` : `Invoices (${bills.length})`}
            </h4>
            {bills.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {isVi ? 'Chưa có hoá đơn nào cho kết nối này.' : 'No invoices for this connection yet.'}
              </p>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {bills.map((b) => (
                  <div key={b.invoiceNumber} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">{b.invoiceNumber}</div>
                      <div className="text-slate-500">{b.billingMonth}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{money(b.totalAmount)}</div>
                      <BillStatusBadge bill={b} isVi={isVi} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isVi ? 'Đóng' : 'Close'}
          </button>
          <button
            type="button"
            onClick={() => onBill(c)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow"
          >
            <Receipt className="h-4 w-4" />
            {isVi ? 'Lập hoá đơn cho kết nối này' : 'Bill this connection'}
          </button>
        </div>
      </div>
    </div>
  );
}
