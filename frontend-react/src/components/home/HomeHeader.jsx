// Thanh điều hướng trang chủ: logo, link tới các khu, tìm kiếm, ngôn ngữ, giao diện, đăng nhập / dashboard.
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Layers, LogOut, Sparkles, User } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { dashboardPathForRole } from '../../lib/router';
import { useStore } from '../../lib/store';
import LanguageToggle from '../layout/LanguageToggle';
import SearchDropdown from '../layout/SearchDropdown';
import ThemeToggle from '../layout/ThemeToggle';
import { scrollToSection } from './scroll';

const NAV_LINKS = [
  { section: 'intro', labelKey: 'about' },
  { section: 'plans', labelKey: 'plans' },
  { section: 'shops', labelKey: 'shops' },
];

// onLogoClick: cuộn về đầu trang (trang tự cuộn trong khung của nó, không phải window).
export default function HomeHeader({ onLogoClick }) {
  const navigate = useNavigate();
  const user = useStore(authStore.currentUser);
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  const handleLogout = () => {
    authStore.logout();
    toast.info(isVi ? 'Đã đăng xuất.' : 'Signed out.');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-[#152434]/85 border-b border-[#CCE4F7] dark:border-[#253D56] transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-[40px] h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="font-extrabold text-lg text-sky-950 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>{t.common.brandName}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 tracking-wider">
                {t.common.brandTag}
              </span>
            </div>
            <p className="text-[10px] text-[#537292] dark:text-[#8DB0D4] font-medium leading-none">
              {t.common.brandSubtitle}
            </p>
          </div>
        </button>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-[#3A5B7E] dark:text-[#94B5D6]">
          {NAV_LINKS.map(({ section, labelKey }) => (
            <button
              key={section}
              type="button"
              onClick={() => scrollToSection(section)}
              className="hover:text-sky-600 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0 text-sm font-semibold text-[#3A5B7E] dark:text-[#94B5D6]"
            >
              {t.nav[labelKey]}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-2.5">
          <SearchDropdown />
          <LanguageToggle />
          <ThemeToggle compact />

          {user ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => navigate(dashboardPathForRole(user.role))}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition flex items-center space-x-1.5"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t.common.dashboard} ({user.name.split(' ')[0]})
                </span>
                <span className="sm:hidden">{t.common.dashboard}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 w-9 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
                title={t.common.logout}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#1B2D40] dark:text-white bg-[#EDF6FF] dark:bg-[#1E3349] hover:bg-[#D8ECFC] dark:hover:bg-[#253E58] border border-[#CCE4F7] dark:border-[#253D56] transition shadow-xs"
              >
                {t.common.login}
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-md shadow-sky-600/20 transition active:scale-95 flex items-center space-x-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t.common.register}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
