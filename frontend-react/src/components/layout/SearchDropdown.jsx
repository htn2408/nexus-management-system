// Ô tìm kiếm nhanh trên thanh điều hướng (Ctrl+K): bấm kính lúp để mở, gõ để thấy kết quả,
// chọn một kết quả để mở đúng trang / tab. Danh sách tìm kiếm dựng ở lib/searchIndex.js.
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Globe, Search, X } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { navigate, navigateTo } from '../../lib/router';
import { buildSearchItems, filterSearchItems } from '../../lib/searchIndex';
import { useStore } from '../../lib/store';

function SearchResult({ item, isVi, onSelect }) {
  const Icon = item.icon;
  const badge = isVi ? item.badgeTextVi : item.badgeTextEn;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50/70 dark:hover:bg-slate-800/60 transition flex items-center space-x-3 group cursor-pointer"
    >
      <div className="h-8 w-8 rounded-lg bg-[#EDF6FF] dark:bg-[#1E3349] text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-[#CCE4F7] dark:border-[#253D56] group-hover:scale-105 transition-transform">
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
          >
            {isVi ? item.categoryLabelVi : item.categoryLabelEn}
          </span>
          {badge && <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">• {badge}</span>}
        </div>
        <div className="text-xs font-bold text-[#0F1D2B] dark:text-white truncate">
          {isVi ? item.titleVi : item.titleEn}
        </div>
        <div className="text-[11px] text-[#537292] dark:text-[#8DB0D4] truncate">
          {isVi ? item.subtitleVi : item.subtitleEn}
        </div>
      </div>

      <div className="shrink-0 text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

export default function SearchDropdown() {
  const isVi = useStore(languageStore.language) === 'vi';
  const user = useStore(authStore.currentUser);
  const plans = useStore(nexusStore.plans);
  const orders = useStore(nexusStore.orders);
  const connections = useStore(nexusStore.connections);
  const bills = useStore(nexusStore.bills);
  const equipments = useStore(nexusStore.equipments);
  const inventory = useStore(nexusStore.inventory);
  const retailShops = useStore(nexusStore.retailShops);
  const employees = useStore(nexusStore.employees);
  const vendors = useStore(nexusStore.vendors);
  const feedbacks = useStore(nexusStore.feedbacks);

  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const allItems = useMemo(
    () =>
      buildSearchItems(
        { plans, orders, connections, bills, equipments, inventory, retailShops, employees, vendors, feedbacks },
        user,
      ),
    [plans, orders, connections, bills, equipments, inventory, retailShops, employees, vendors, feedbacks, user],
  );
  const results = useMemo(() => filterSearchItems(allItems, query), [allItems, query]);

  const collapse = () => {
    setIsExpanded(false);
    setQuery('');
  };

  const toggleExpand = () => {
    if (isExpanded) {
      collapse();
    } else {
      setIsExpanded(true);
      // Chờ ô nhập xuất hiện rồi mới focus.
      setTimeout(() => inputRef.current?.focus(), 70);
    }
  };

  // Bấm ra ngoài thì thu lại; Esc để thu lại; Ctrl+K (Cmd+K) để mở / đóng.
  const toggleRef = useRef(toggleExpand);
  useEffect(() => {
    toggleRef.current = toggleExpand;
  });
  useEffect(() => {
    if (!isExpanded) return;
    const onClick = (e) => {
      if (!containerRef.current?.contains(e.target)) collapse();
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [isExpanded]);
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        collapse();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectResult = (item) => {
    if (!item.targetPath) return;
    if (item.targetTab) navigateTo(item.targetPath, item.targetTab);
    else navigate(item.targetPath);
    const title = isVi ? item.titleVi : item.titleEn;
    toast.success(isVi ? `Đã chuyển tới: ${title}` : `Navigated to: ${title}`);
    collapse();
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-end">
      {/* Ô tìm kiếm trượt dài sang trái khi mở */}
      <div
        className={`flex items-center h-9 rounded-full transition-all duration-300 ease-out overflow-hidden shadow-xs border ${
          isExpanded
            ? 'w-64 sm:w-80 md:w-96 bg-white dark:bg-[#101C29] border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/20 px-1.5'
            : 'w-9 bg-[#EDF6FF] dark:bg-[#1E3349] border-[#CCE4F7] dark:border-[#253D56] hover:bg-[#DCEEFE] dark:hover:bg-[#253E58]'
        }`}
      >
        <button
          type="button"
          onClick={toggleExpand}
          className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[#1B2D40] dark:text-[#E0F1FF] hover:bg-sky-50 dark:hover:bg-[#1E3349] transition cursor-pointer"
          title={isVi ? 'Tìm kiếm nhanh (Ctrl+K)' : 'Quick Search (Ctrl+K)'}
          aria-expanded={isExpanded}
        >
          <Search className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        </button>

        {isExpanded && (
          <>
            <input
              ref={inputRef}
              type="text"
              placeholder={isVi ? 'Nhập từ khóa tìm kiếm...' : 'Type to search anything...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs sm:text-sm text-[#0F1D2B] dark:text-white placeholder-[#7899B8] dark:placeholder-slate-400 w-full px-2 animate-in fade-in slide-in-from-right-3 duration-200"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="shrink-0 p-1 ml-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                title={isVi ? 'Xóa từ khóa' : 'Clear search'}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Danh sách kết quả chỉ hiện khi đang gõ */}
      {isExpanded && query.trim().length > 0 && (
        <div className="dropdown-popover absolute right-0 top-11 mt-1 w-80 sm:w-[440px] max-h-96 rounded-2xl bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="px-3.5 py-2.5 border-b border-[#CCE4F7] dark:border-[#253D56] bg-slate-50/70 dark:bg-[#1B2D40]/50 flex items-center justify-between text-xs font-bold text-[#0F1D2B] dark:text-white">
            <div className="flex items-center gap-1.5">
              <span>{isVi ? 'Kết quả tìm kiếm' : 'Search Results'}</span>
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                • {results.length} {isVi ? 'mục phù hợp' : 'matches'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                languageStore.toggleLanguage();
                inputRef.current?.focus();
              }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 transition flex items-center gap-1 cursor-pointer active:scale-95"
              title={isVi ? 'Chuyển đổi ngôn ngữ sang Tiếng Anh' : 'Switch language to Vietnamese'}
            >
              <Globe className="h-2.5 w-2.5 text-sky-600 dark:text-sky-400" />
              <span>{isVi ? 'Tiếng Việt' : 'English'}</span>
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 notification-scroll p-1.5">
            {results.length === 0 ? (
              <div className="py-7 text-center px-4 space-y-1.5">
                <Search className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isVi ? `Không có mục nào khớp với "${query}".` : `No items matched "${query}".`}
                </p>
              </div>
            ) : (
              results.map((item) => (
                // id có thể trùng giữa hai loại (VD: mã thiết bị và mã kho) nên ghép thêm loại.
                <SearchResult key={`${item.category}:${item.id}`} item={item} isVi={isVi} onSelect={selectResult} />
              ))
            )}
          </div>

          <div className="px-3.5 py-2 border-t border-[#CCE4F7] dark:border-[#253D56] bg-slate-50/70 dark:bg-[#1B2D40]/50 flex items-center justify-between text-[11px] text-[#537292] dark:text-[#8DB0D4]">
            <span>{isVi ? 'Bấm để chuyển trang' : 'Click to navigate'}</span>
            <span className="text-[10px]">{isVi ? 'ESC để thu nhỏ' : 'ESC to collapse'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
