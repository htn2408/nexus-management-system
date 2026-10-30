// Cụm nút phân trang: đầu / trước / các số trang / sau / cuối. Dùng cùng hook usePagination.
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

const navButtonClass =
  'inline-flex items-center gap-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs';

// Tối đa 7 ô: 1 2 3 4 … 20 / 1 … 17 18 19 20 / 1 … 9 10 11 … 20
function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '…', total];
  if (current >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

// Chuyển trang thì đưa vùng nội dung dashboard về đầu.
function scrollContentToTop() {
  requestAnimationFrame(() => {
    const main = document.querySelector('main');
    if (main && main.scrollTop > 0) main.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

export default function Pagination({ currentPage = 1, totalItems = 0, pageSize = 8, onPageChange, className = '' }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= 0) return null;

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange?.(page);
    scrollContentToTop();
  };

  return (
    <div className={`w-full flex items-center justify-center py-4 px-2 select-none ${className}`}>
      <div className="inline-flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/90 shadow-sm backdrop-blur-xs flex-wrap justify-center">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => goToPage(1)}
          title={isVi ? 'Trang đầu' : 'First page'}
          className={`p-1.5 text-slate-600 dark:text-slate-300 ${navButtonClass}`}
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          className={`px-3 py-1.5 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm ${navButtonClass}`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{isVi ? 'Trước' : 'Prev'}</span>
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers(currentPage, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-2 py-1 text-slate-400 dark:text-slate-500 text-xs">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={`min-w-8 h-8 px-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center cursor-pointer shadow-2xs ${
                  currentPage === p
                    ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-xs font-bold'
                    : 'border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
          className={`px-3 py-1.5 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm ${navButtonClass}`}
        >
          <span>{isVi ? 'Sau' : 'Next'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(totalPages)}
          title={isVi ? 'Trang cuối' : 'Last page'}
          className={`p-1.5 text-slate-600 dark:text-slate-300 ${navButtonClass}`}
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
