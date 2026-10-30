// Thanh điều hướng của các trang công khai (đăng ký gói cước...): về trang chủ, đổi ngôn ngữ / giao diện, đăng nhập.
import { useNavigate } from 'react-router';
import { Layers, ArrowLeft } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';

export default function PublicHeader() {
  const navigate = useNavigate();
  const t = useStore(languageStore.t);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-[#152434]/85 border-b border-[#CCE4F7] dark:border-[#253D56] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Back to Home */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-9 px-3 rounded-full bg-[#EDF6FF] dark:bg-[#1E3349] hover:bg-[#DCEEFE] dark:hover:bg-[#253E58] text-[#1B2D40] dark:text-[#E0F1FF] border border-[#CCE4F7] dark:border-[#253D56] flex items-center space-x-1.5 transition text-xs font-semibold"
            title={t.common.home}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.common.home}</span>
          </button>

          <button type="button" onClick={() => navigate('/')} className="flex items-center space-x-2.5 cursor-pointer group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div className="font-extrabold text-base text-sky-950 dark:text-white tracking-tight items-center gap-1.5 hidden sm:flex">
              <span>{t.common.brandName}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 tracking-wider">
                {t.common.brandTag}
              </span>
            </div>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2.5">
          <LanguageToggle />
          <ThemeToggle compact />
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100/50 dark:hover:bg-slate-800 transition"
          >
            {t.common.login}
          </button>
        </div>
      </div>
    </header>
  );
}
