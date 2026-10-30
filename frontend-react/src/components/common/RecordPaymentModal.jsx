// Ghi nhận một khoản thanh toán cho hoá đơn (quầy bán lẻ thu tại quầy, kế toán thu tại văn phòng).
// Chỉ đóng modal khi server đã ghi nhận khoản thu.
import { useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useStore } from '../../lib/store';

const MODES = [
  { value: 'Cash', vi: 'Tiền mặt (Tại quầy)', en: 'Cash (Counter Tender)' },
  { value: 'Credit/Debit Card', vi: 'Thẻ tín dụng / Ghi nợ (POS)', en: 'Credit/Debit Card (POS)' },
  { value: 'UPI/Digital Wallet', vi: 'Ví điện tử / QR Code', en: 'UPI / Digital Wallet' },
  { value: 'Cheque', vi: 'Séc ngân hàng', en: 'Cheque / Draft' },
  { value: 'Bank Transfer/NEFT', vi: 'Chuyển khoản trực tiếp', en: 'Bank Transfer' },
];

const INPUT_CLS =
  'w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white';

function Row({ label, children, className = '' }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span className="text-slate-500">{label}</span>
      {children}
    </div>
  );
}

export default function RecordPaymentModal({ bill, cashierName, title, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [amount, setAmount] = useState(String(bill.dueAmount));
  const [mode, setMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error(isVi ? 'Số tiền thanh toán phải lớn hơn 0.' : 'Payment amount must be greater than zero.');
      return;
    }
    if (value > bill.dueAmount + 0.001) {
      toast.error(
        isVi
          ? `Số tiền vượt quá công nợ còn lại ($${bill.dueAmount.toFixed(2)}).`
          : `Amount exceeds the outstanding balance ($${bill.dueAmount.toFixed(2)}).`,
      );
      return;
    }
    const isAccountant = title?.toLowerCase().includes('kế toán') || title?.toLowerCase().includes('account');
    const defaultPrefix =
      mode === 'Bank Transfer/NEFT'
        ? 'REC-BANK'
        : mode === 'Cheque'
          ? 'REC-CHQ'
          : mode === 'Cash'
            ? (isAccountant ? 'REC-ACC' : 'REC-CASH')
            : (isAccountant ? 'REC-ACC' : 'REC-POS');
    const autoRef = `${defaultPrefix}-${Date.now().toString().slice(-6)}`;

    try {
      const updated = await nexusStore.recordPayment(
        bill.invoiceNumber,
        value,
        mode,
        reference.trim() || autoRef,
        cashierName,
      );
      toast.success(
        isVi
          ? `Đã ghi nhận $${value.toFixed(2)} cho hóa đơn ${bill.invoiceNumber}. Còn nợ: $${(updated?.dueAmount ?? 0).toFixed(2)}`
          : `Recorded $${value.toFixed(2)} for ${bill.invoiceNumber}. Remaining: $${(updated?.dueAmount ?? 0).toFixed(2)}`,
      );
      onClose();
    } catch (err) {
      toast.error(isVi ? 'Chưa ghi nhận được khoản thu' : 'The payment was not recorded', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full sm:w-[480px] h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto flex flex-col p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {title ?? (isVi ? 'Thu tiền tại quầy & Cập nhật thanh toán' : 'Counter Payment & Settlement')}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">{bill.invoiceNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
          <Row label={isVi ? 'Khách hàng:' : 'Customer:'} className="font-sans">
            <strong className="text-slate-900 dark:text-white">{bill.customerName}</strong>
          </Row>
          <Row label={isVi ? 'Mã tài khoản:' : 'Account ID:'}>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{bill.accountId}</span>
          </Row>
          <Row label={isVi ? 'Kỳ cước:' : 'Billing cycle:'}>
            <span className="text-slate-900 dark:text-white">{bill.billingMonth}</span>
          </Row>
          <Row
            label={isVi ? 'Tổng hóa đơn:' : 'Total Bill:'}
            className="border-t border-slate-200 dark:border-slate-800 pt-1.5"
          >
            <span className="text-slate-900 dark:text-white font-bold">${bill.totalAmount.toFixed(2)}</span>
          </Row>
          <Row label={isVi ? 'Đã thanh toán:' : 'Paid:'}>
            <span className="text-emerald-600 dark:text-emerald-400">${bill.amountPaid.toFixed(2)}</span>
          </Row>
          <Row label={isVi ? 'Công nợ còn lại:' : 'Due Balance:'}>
            <span className="text-rose-600 dark:text-rose-400 font-bold">${bill.dueAmount.toFixed(2)}</span>
          </Row>
        </div>

        {bill.status === 'Paid' || bill.dueAmount <= 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center space-x-2 text-emerald-700 dark:text-emerald-300 text-sm">
            <CreditCard className="h-5 w-5" />
            <span className="font-bold">
              {isVi ? 'Hóa đơn này đã được thanh toán đầy đủ.' : 'This bill has been fully paid.'}
            </span>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Số tiền thanh toán ($) *' : 'Payment Amount ($) *'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={bill.dueAmount}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${INPUT_CLS} font-mono font-bold text-sm`}
              />
              <button
                type="button"
                onClick={() => setAmount(String(bill.dueAmount))}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline mt-1 font-medium"
              >
                {isVi ? 'Thanh toán toàn bộ số nợ' : 'Pay full due'} (${bill.dueAmount.toFixed(2)})
              </button>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Hình thức thanh toán tại quầy' : 'Payment Tender Mode'}
              </label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className={INPUT_CLS}>
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {isVi ? m.vi : m.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isVi ? 'Mã tham chiếu biên lai / Giao dịch' : 'Receipt / Reference #'}
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  isVi ? 'Để trống để hệ thống tự tạo (REC-POS-...)' : 'Leave blank to auto-generate (REC-POS-...)'
                }
                className={`${INPUT_CLS} font-mono`}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow disabled:opacity-60"
              >
                {isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Ghi nhận thanh toán' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
