// Biểu cước của phòng kế toán, lưu ở bảng SystemSettings trên server.
// Thuế suất áp cho hoá đơn lập SAU khi lưu; hoá đơn đã phát hành giữ nguyên.
// Tiền cọc không ở đây: lấy theo từng gói cước (Admin quản lý ở trang Gói cước).
import { useState } from 'react';
import { toast } from 'sonner';
import { Percent, Save } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { updateBillingSettingsApi } from '../../lib/api';
import { useStore } from '../../lib/store';

const INPUT =
  'w-40 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono';

export default function ChargeSettingsTab({ settings, onSaved }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [taxRate, setTaxRate] = useState(String(settings.serviceTaxRate));
  const [lateFee, setLateFee] = useState(String(settings.latePaymentFeePercent));
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const saved = await updateBillingSettingsApi({
        serviceTaxRate: Number(taxRate),
        latePaymentFeePercent: Number(lateFee),
      });
      onSaved(saved);
      toast.success(
        isVi
          ? 'Đã lưu biểu cước. Hoá đơn lập từ giờ dùng thuế suất mới.'
          : 'Charge settings saved. New invoices use the new tax rate.',
      );
    } catch (err) {
      toast.error(isVi ? 'Chưa lưu được biểu cước' : 'Charge settings were not saved', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="max-w-xl space-y-5 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm"
    >
      <div>
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Percent className="h-4 w-4 text-blue-600" />
          {isVi ? 'Biểu cước' : 'Charge settings'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {isVi
            ? 'Lưu trên server, áp cho mọi kế toán. Hoá đơn đã phát hành không đổi. Tiền cọc lấy theo từng gói cước.'
            : 'Stored on the server for every accountant. Issued invoices do not change. Deposits come from each service plan.'}
        </p>
      </div>
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {isVi ? 'Thuế dịch vụ (%)' : 'Service tax (%)'}
          </span>
          <span className="block text-xs text-slate-500">
            {isVi ? 'Áp cho hoá đơn mới.' : 'Applied to new invoices.'}
          </span>
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          required
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          className={INPUT}
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {isVi ? 'Phí trễ hạn (%)' : 'Late payment fee (%)'}
          </span>
          <span className="block text-xs text-slate-500">
            {isVi
              ? 'Gợi ý khi sửa hoá đơn quá hạn (nút "Áp phí trễ").'
              : 'Suggested when editing an overdue invoice ("Apply late fee").'}
          </span>
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          required
          value={lateFee}
          onChange={(e) => setLateFee(e.target.value)}
          className={INPUT}
        />
      </label>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu biểu cước' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
