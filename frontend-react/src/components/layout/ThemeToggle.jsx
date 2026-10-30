// Nút chuyển giao diện sáng / tối. compact = cỡ nhỏ dùng trên các thanh header.
import { Sun, Moon } from 'lucide-react';
import { themeStore } from '../../context/ThemeContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

const SIZES = {
  regular: {
    button:
      'h-10 w-10 bg-white/85 dark:bg-[#152434]/85 hover:bg-white dark:hover:bg-[#1E3349] shadow-md hover:scale-105 active:scale-95 backdrop-blur-md cursor-pointer',
    icon: 'h-5 w-5',
  },
  compact: {
    button:
      'h-9 w-9 bg-[#EDF6FF] dark:bg-[#1E3349] hover:bg-[#DCEEFE] dark:hover:bg-[#253E58] shadow-xs hover:scale-105 active:scale-95',
    icon: 'h-4 w-4',
  },
};

export default function ThemeToggle({ compact = false }) {
  const theme = useStore(themeStore.theme);
  const t = useStore(languageStore.t);
  const size = compact ? SIZES.compact : SIZES.regular;

  return (
    <button
      type="button"
      onClick={themeStore.toggleTheme}
      className={`rounded-full text-[#1B2D40] dark:text-[#E0F1FF] border border-[#CCE4F7] dark:border-[#253D56] flex items-center justify-center transition-all duration-200 group ${size.button}`}
      title={theme === 'dark' ? t.common.themeLight : t.common.themeDark}
    >
      {theme === 'dark' ? (
        <Sun className={`${size.icon} text-amber-400 group-hover:rotate-45 transition-transform`} />
      ) : (
        <Moon className={`${size.icon} text-sky-700 group-hover:-rotate-12 transition-transform`} />
      )}
    </button>
  );
}
