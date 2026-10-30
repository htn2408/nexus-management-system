// Cài đặt ngôn ngữ hiển thị và giao diện sáng / tối.
import { toast } from 'sonner';
import { ChevronDown, Globe, Moon, Sun } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { themeStore } from '../../context/ThemeContext';
import { useStore } from '../../lib/store';

function SettingRow({ icon: Icon, iconTone, title, description, children }) {
  return (
    <div className="px-1 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AppearanceSettings() {
  const language = useStore(languageStore.language);
  const theme = useStore(themeStore.theme);
  const isVi = language === 'vi';
  const isDark = theme === 'dark';

  const changeLanguage = (e) => {
    const next = e.target.value;
    if (next === language) return;
    languageStore.setLanguage(next);
    toast.success(next === 'vi' ? 'Đã chuyển đổi sang Tiếng Việt' : 'Switched to English');
  };

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    themeStore.setTheme(next);
    toast.success(
      next === 'dark'
        ? isVi
          ? 'Đã bật giao diện Tối'
          : 'Activated Dark Mode'
        : isVi
          ? 'Đã bật giao diện Sáng'
          : 'Activated Light Mode',
    );
  };

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      <SettingRow
        icon={Globe}
        iconTone="bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400"
        title={isVi ? 'Ngôn ngữ hiển thị' : 'Display Language'}
        description={
          isVi
            ? 'Chọn ngôn ngữ hiển thị giao diện (Tiếng Việt hoặc Tiếng Anh)'
            : 'Select interface display language (Vietnamese or English)'
        }
      >
        <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-sky-400 dark:hover:border-sky-500 transition-all duration-200 group">
          <span className="pl-3 pr-1 text-base select-none pointer-events-none">{isVi ? '🇻🇳' : '🇬🇧'}</span>
          <select
            id="select-display-language"
            value={language}
            onChange={changeLanguage}
            className="py-2 pl-1 pr-9 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-0 cursor-pointer focus:outline-none focus:ring-0 appearance-none"
            aria-label={isVi ? 'Chọn ngôn ngữ' : 'Select language'}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">Tiếng Anh (English)</option>
          </select>
          <div className="absolute right-2.5 pointer-events-none text-slate-400 dark:text-slate-500 group-hover:text-sky-500 transition-transform duration-300 group-focus-within:rotate-180">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </SettingRow>

      <SettingRow
        icon={isDark ? Moon : Sun}
        iconTone="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
        title={isVi ? 'Giao diện Tối' : 'Dark Mode Theme'}
        description={isVi ? 'Bật chế độ màu tối giảm mỏi mắt ban đêm' : 'Enable dark theme to reduce eye strain in low-light'}
      >
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isDark ? (isVi ? 'Bật (Tối)' : 'On (Dark)') : isVi ? 'Tắt (Sáng)' : 'Off (Light)'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isDark ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            title={
              isDark
                ? isVi
                  ? 'Chuyển sang Giao diện Sáng'
                  : 'Switch to Light Mode'
                : isVi
                  ? 'Chuyển sang Giao diện Tối'
                  : 'Switch to Dark Mode'
            }
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isDark ? 'translate-x-5' : 'translate-x-0'
              }`}
            ></span>
          </button>
        </div>
      </SettingRow>
    </div>
  );
}
