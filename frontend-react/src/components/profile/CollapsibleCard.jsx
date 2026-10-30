// Thẻ có tiêu đề bấm để thu gọn / mở rộng, dùng cho các mục của trang hồ sơ.
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CollapsibleCard({
  icon: Icon,
  iconTone,
  title,
  subtitle,
  badge,
  danger = false,
  defaultOpen = true,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = () => setIsOpen((open) => !open);

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-colors duration-300 overflow-hidden ${
        danger ? 'border-rose-200/80 dark:border-rose-900/60' : 'border-slate-200 dark:border-slate-800'
      } ${isOpen ? 'p-6 sm:p-8 space-y-6' : 'p-4 sm:p-5'}`}
    >
      <div
        className={`flex items-center justify-between cursor-pointer ${
          isOpen ? `border-b pb-4 ${danger ? 'border-rose-100 dark:border-rose-900/40' : 'border-slate-100 dark:border-slate-800'}` : ''
        }`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className="flex items-center space-x-3 flex-1">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${iconTone}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {badge}
          <span className="p-1.5 rounded-lg text-slate-400">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </div>

      {isOpen && children}
    </div>
  );
}
