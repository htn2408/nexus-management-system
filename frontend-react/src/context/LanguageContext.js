import { writable, derived } from '../lib/store';
import { en } from '../locales/en';
import { vi } from '../locales/vi';
function createLanguageStore() {
  const initial = (() => {
    const saved = localStorage.getItem('nexus_language');
    return saved === 'vi' || saved === 'en' ? saved : 'en';
  })();
  const language = writable(initial);
  language.subscribe((lang) => {
    localStorage.setItem('nexus_language', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  });
  const setLanguage = (lang) => language.set(lang);
  const toggleLanguage = () => language.update((prev) => (prev === 'en' ? 'vi' : 'en'));
  // Derived translation object
  const t = derived(language, ($language) => ($language === 'vi' ? vi : en));
  return { language, setLanguage, toggleLanguage, t };
}
export const languageStore = createLanguageStore();
