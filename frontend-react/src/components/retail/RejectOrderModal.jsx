// Trả hồ sơ về cho khách: bắt buộc nêu lý do để khách bổ sung giấy tờ.
import { useState } from 'react';
import { XCircle } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

export default function RejectOrderModal({ order, isSaving, onCancel, onConfirm }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(reason);
        }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-rose-300 dark:border-rose-800 shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isVi ? 'Trả hồ sơ' : 'Return application'} {order.id}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isVi
                ? 'Nêu rõ lý do để khách hàng bổ sung giấy tờ. Đơn sẽ không được chuyển sang Kỹ thuật.'
                : 'Give a clear reason so the customer can fix the paperwork. The order will not reach Technical.'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isVi ? 'Lý do trả hồ sơ *' : 'Rejection reason *'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            required
            placeholder={
              isVi
                ? 'VD: Giấy tờ tùy thân hết hạn, thiếu giấy tờ chứng minh quyền sử dụng địa chỉ lắp đặt...'
                : 'e.g. ID document expired; proof of tenure at the installation address missing...'
            }
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          ></textarea>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow disabled:opacity-60"
          >
            {isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Xác nhận trả hồ sơ' : 'Confirm Rejection'}
          </button>
        </div>
      </form>
    </div>
  );
}
