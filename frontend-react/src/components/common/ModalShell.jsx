// Khung modal dùng chung: tiêu đề + nút đóng + nội dung.
import { X } from 'lucide-react';

export default function ModalShell({
  icon: Icon,
  iconClass = 'text-amber-500',
  title,
  subtitle,
  onClose,
  maxWidth = 'max-w-lg',
  children,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
      <div
        className={`w-full ${maxWidth} my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {Icon && <Icon className={`h-5 w-5 ${iconClass}`} />}
              <span>{title}</span>
            </h3>
            {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
