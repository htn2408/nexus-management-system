import { writable } from '../lib/store';
function createThemeStore() {
  const initial = (() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('nexus_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light'; // Default to light mode (#E0F1FF)
  })();
  const theme = writable(initial);
  theme.subscribe((t) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (t === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
    localStorage.setItem('nexus_theme', t);
  });
  const toggleTheme = () => theme.update((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const setTheme = (newTheme) => theme.set(newTheme);
  return { theme, toggleTheme, setTheme };
}
export const themeStore = createThemeStore();
