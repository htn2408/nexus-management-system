// Hộp xác nhận trước thao tác không hoàn tác được (xoá, ngừng hoạt động).
import { AlertTriangle } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

export default function ConfirmDialog({ title, message, confirmLabel, busy = false, onConfirm, onCancel }) {
  const isVi = useStore(languageStore.language) === 'vi';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow disabled:opacity-60"
          >
            {busy ? (isVi ? 'Đang xử lý...' : 'Working...') : (confirmLabel ?? (isVi ? 'Xoá' : 'Delete'))}
          </button>
        </div>
      </div>
    </div>
  );
}
