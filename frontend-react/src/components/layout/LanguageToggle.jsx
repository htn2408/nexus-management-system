import { Globe } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

export default function LanguageToggle({ className = '' }) {
  const language = useStore(languageStore.language);

  return (
    <button
      type="button"
      onClick={languageStore.toggleLanguage}
      className={`h-9 px-2.5 rounded-full bg-[#EDF6FF] dark:bg-[#1E3349] hover:bg-[#DCEEFE] dark:hover:bg-[#253E58] text-[#1B2D40] dark:text-[#E0F1FF] border border-[#CCE4F7] dark:border-[#253D56] flex items-center space-x-1.5 transition shadow-xs active:scale-95 group text-xs font-bold ${className}`}
      title={language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
    >
      <Globe className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 group-hover:rotate-45 transition-transform" />
      <span className="uppercase tracking-wider">{language === 'en' ? 'EN' : 'VI'}</span>
    </button>
  );
}
