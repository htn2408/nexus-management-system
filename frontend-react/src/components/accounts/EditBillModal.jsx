// Kế toán sửa khoản mục của hoá đơn đã phát hành (spec: chỉ phòng kế toán được sửa).
// Chiết khấu luôn tính lại từ %, phí trễ có nút áp theo % trong biểu cước; server tính lại tổng.
import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useStore } from '../../lib/store';
import { money, previewBill } from './billMath';

const INPUT =
  'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono';
const LABEL = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';
const FIELDS = [
  'securityDeposit',
  'monthlyRental',
  'hourlyCharges',
  'discountPercent',
  'serviceTaxRate',
  'lateFeeAmount',
];

export default function EditBillModal({ bill, lateFeePercent, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [form, setForm] = useState(() => ({
    billingMonth: bill.billingMonth ?? '',
    dueDate: bill.dueDate ?? '',
    ...Object.fromEntries(FIELDS.map((f) => [f, String(bill[f] ?? 0)])),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const num = (f) => Math.max(0, Number(form[f]) || 0);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const preview = previewBill({
    securityDeposit: num('securityDeposit'),
    monthlyRental: num('monthlyRental'),
    hourlyCharges: num('hourlyCharges'),
    discountPercent: Math.min(100, num('discountPercent')),
    taxRate: num('serviceTaxRate'),
    lateFee: num('lateFeeAmount'),
  });
  // Phí trễ theo biểu cước: % trên tổng trước phí trễ.
  const suggestedLateFee = Math.round((preview.totalAmount - num('lateFeeAmount')) * lateFeePercent) / 100;

  const submit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const saved = await nexusStore.updateBill(bill.invoiceNumber, {
        billingMonth: form.billingMonth.trim() || undefined,
        dueDate: form.dueDate || undefined,
        securityDeposit: num('securityDeposit'),
        monthlyRental: num('monthlyRental'),
        hourlyCharges: num('hourlyCharges'),
        discountPercent: Math.min(100, num('discountPercent')),
        discountAmount: preview.discountAmount,
        serviceTaxRate: num('serviceTaxRate'),
        lateFeeAmount: num('lateFeeAmount'),
      });
      toast.success(
        isVi
          ? `Đã cập nhật ${bill.invoiceNumber}: tổng ${money(saved.totalAmount)}, còn nợ ${money(saved.dueAmount)}.`
          : `${bill.invoiceNumber} updated: total ${money(saved.totalAmount)}, due ${money(saved.dueAmount)}.`,
      );
      onClose();
    } catch (err) {
      toast.error(isVi ? 'Chưa lưu được hoá đơn' : 'The invoice was not saved', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const moneyField = (field, label) => (
    <div>
      <label className={LABEL}>{label}</label>
      <input type="number" step="0.01" min="0" value={form[field]} onChange={set(field)} className={INPUT} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
      <form
        onSubmit={submit}
        className="w-full max-w-xl my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {isVi ? 'Sửa hoá đơn' : 'Edit invoice'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              <span className="font-mono">{bill.invoiceNumber}</span> · {bill.customerName} ·{' '}
              {isVi ? `đã thanh toán ${money(bill.amountPaid)}` : `paid ${money(bill.amountPaid)}`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>{isVi ? 'Kỳ cước' : 'Billing period'}</label>
            <input value={form.billingMonth} onChange={set('billingMonth')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>{isVi ? 'Hạn thanh toán' : 'Due date'}</label>
            <input type="date" value={form.dueDate} onChange={set('dueDate')} className={INPUT} />
          </div>
          {moneyField('securityDeposit', isVi ? 'Tiền cọc ($)' : 'Deposit ($)')}
          {moneyField('monthlyRental', isVi ? 'Cước tháng ($)' : 'Monthly rental ($)')}
          {moneyField('hourlyCharges', isVi ? 'Cước theo giờ ($)' : 'Hourly charges ($)')}
          <div>
            <label className={LABEL}>{isVi ? 'Chiết khấu (%)' : 'Discount (%)'}</label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={form.discountPercent}
              onChange={set('discountPercent')}
              className={INPUT}
            />
            <p className="text-[10px] text-slate-500 mt-0.5">= −{money(preview.discountAmount)}</p>
          </div>
          <div>
            <label className={LABEL}>{isVi ? 'Thuế dịch vụ (%)' : 'Service tax (%)'}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.serviceTaxRate}
              onChange={set('serviceTaxRate')}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>{isVi ? 'Phí trễ hạn ($)' : 'Late fee ($)'}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.lateFeeAmount}
              onChange={set('lateFeeAmount')}
              className={INPUT}
            />
            {lateFeePercent > 0 && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, lateFeeAmount: String(suggestedLateFee) }))}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
              >
                {isVi
                  ? `Áp phí trễ ${lateFeePercent}% = ${money(suggestedLateFee)}`
                  : `Apply ${lateFeePercent}% late fee = ${money(suggestedLateFee)}`}
              </button>
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex justify-between">
          <span className="text-slate-500">{isVi ? 'Tổng mới (dự tính)' : 'New total (estimate)'}</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">{money(preview.totalAmount)}</span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow disabled:opacity-60"
          >
            {isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu & tính lại tổng' : 'Save & recalculate'}
          </button>
        </div>
      </form>
    </div>
  );
}
