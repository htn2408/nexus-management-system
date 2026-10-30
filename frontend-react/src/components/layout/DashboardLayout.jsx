// Khung chung của mọi dashboard: thanh bên (tab), header (tìm kiếm, cài đặt, ngôn ngữ, giao diện,
// thông báo, tài khoản), dòng chào và vùng nội dung của tab đang mở.
//
// Props:
//   activeTab, onTabChange(tabId), navItems: [{ id, label, icon, badge?, badgeColor? }]
//   pageTitle?, roleBadgeTitle?, customHeaderActions? (JSX thêm vào header)
//   exportAction? { label?, onClick }, primaryAction? { label, onClick, icon? }
//   Nút xuất / nút chính chỉ hiện khi trang truyền hành động thật cho nó.
import { useEffect, useState } from 'react';
import { Download, Menu, Plus, Settings } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import DashboardSidebar from './DashboardSidebar';
import GreetingBanner from './GreetingBanner';
import LanguageToggle from './LanguageToggle';
import NotificationDropdown from './NotificationDropdown';
import SearchDropdown from './SearchDropdown';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const SIDEBAR_KEY = 'nexus_sidebar_open';
const roundButtonClass =
  'h-9 w-9 rounded-full bg-[#EDF6FF] dark:bg-[#1E3349] hover:bg-[#DCEEFE] dark:hover:bg-[#253E58] text-[#1B2D40] dark:text-[#E0F1FF] border border-[#CCE4F7] dark:border-[#253D56] flex items-center justify-center transition shadow-xs';
const primaryButtonClass =
  'flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition active:scale-95';

export default function DashboardLayout({
  activeTab,
  onTabChange,
  navItems,
  pageTitle,
  roleBadgeTitle,
  children,
  exportAction,
  primaryAction,
  customHeaderActions,
}) {
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  // Thanh bên mở / đóng (nhớ trong localStorage).
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_KEY) !== 'false');
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(isSidebarOpen));
  }, [isSidebarOpen]);

  const currentTitle = pageTitle || navItems.find((item) => item.id === activeTab)?.label || t.common.dashboard;
  const showBanner = activeTab !== 'settings' && activeTab !== 'profile';
  const PrimaryIcon = primaryAction?.icon ?? Plus;

  return (
    <div className="flex h-screen w-full bg-[#E0F1FF] dark:bg-[#1B2D40] text-[#1B2D40] dark:text-[#E0F1FF] font-sans antialiased overflow-hidden transition-colors duration-300">
      <DashboardSidebar
        isOpen={isSidebarOpen}
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        roleBadgeTitle={roleBadgeTitle}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Màn hình nhỏ: lớp mờ phía sau thanh bên, bấm vào để đóng */}
        {isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[25] md:hidden transition-opacity duration-300 border-none cursor-pointer w-full h-full text-left p-0 m-0"
            aria-label={isVi ? 'Bấm vào đây để giấu menu bên' : 'Click to hide sidebar'}
          ></button>
        )}

        <header className="shrink-0 h-16 bg-white/95 dark:bg-[#172738]/95 border-b border-[#CCE4F7] dark:border-[#253D56] flex items-center justify-between px-4 sm:px-6 shadow-xs z-20 backdrop-blur-md transition-colors duration-300">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center justify-center h-9 w-9 rounded-lg text-[#1B2D40] dark:text-[#E0F1FF] hover:bg-[#EDF6FF] dark:hover:bg-[#1E3349] transition active:scale-95 shrink-0"
              title={
                isSidebarOpen
                  ? isVi
                    ? 'Thu gọn menu bên'
                    : 'Collapse sidebar'
                  : isVi
                    ? 'Mở rộng menu bên'
                    : 'Expand sidebar'
              }
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-[#0F1D2B] dark:text-white tracking-tight truncate">
              {currentTitle}
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {customHeaderActions}
            <SearchDropdown />
            <button type="button" onClick={() => onTabChange('settings')} className={roundButtonClass} title={t.common.settings}>
              <Settings className="h-4 w-4" />
            </button>
            <LanguageToggle />
            <ThemeToggle compact />
            <NotificationDropdown />
            <UserMenu activeTab={activeTab} onTabChange={onTabChange} />
          </div>
        </header>

        {/* KHÔNG đặt z-index ở thẻ bọc này: nó sẽ tạo stacking context riêng, khiến modal của trang
            con (fixed z-50 / z-[100]) nằm dưới header (z-20) và thanh bên (z-30). */}
        <div className="relative flex-1 overflow-hidden flex flex-col">
          <main className="flex-1 overflow-y-scroll p-6 sm:p-8 space-y-6 bg-[#E0F1FF] dark:bg-[#1B2D40] transition-colors duration-300">
            {showBanner && (
              <GreetingBanner>
                <div className="flex items-center space-x-2.5">
                  {exportAction && (
                    <button
                      type="button"
                      onClick={exportAction.onClick}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-[#1E3349] hover:bg-sky-50 dark:hover:bg-[#253E58] border border-[#CCE4F7] dark:border-[#253D56] text-[#1B2D40] dark:text-[#E0F1FF] shadow-xs transition active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5 text-[#537292] dark:text-[#8DB0D4]" />
                      <span>{exportAction.label || t.actions.export}</span>
                    </button>
                  )}

                  {primaryAction && (
                    <button type="button" onClick={primaryAction.onClick} className={primaryButtonClass}>
                      <PrimaryIcon className="h-3.5 w-3.5" />
                      <span>{primaryAction.label}</span>
                    </button>
                  )}
                </div>
              </GreetingBanner>
            )}

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
