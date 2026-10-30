// Banner đầu trang chủ: tiêu đề, nút xem gói / đăng ký và 4 chỉ số nổi bật.
import { useNavigate } from 'react-router';
import { ArrowRight, Sparkles } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import { scrollToSection } from './scroll';

const STATS = [
  { value: '99.99%', labelKey: 'statUptime' },
  { value: '300+ Mbps', labelKey: 'statSpeed' },
  { value: '50,000+', labelKey: 'statUsers' },
  { value: '24/7/365', labelKey: 'statSupport' },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const t = useStore(languageStore.t);

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-400/20 dark:bg-sky-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full px-4 sm:px-6 lg:px-[40px] relative z-10 text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-300 text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t.hero.badge}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          {t.hero.titleLine1} <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t.hero.titleLine2}
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[#537292] dark:text-[#94B5D6] max-w-2xl mx-auto font-normal">
          {t.hero.subtitle}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => scrollToSection('plans')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-lg shadow-sky-600/25 transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{t.hero.explorePlans}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-white dark:bg-[#1E3349] hover:bg-sky-50 dark:hover:bg-[#253E58] text-[#1B2D40] dark:text-white border border-[#CCE4F7] dark:border-[#253D56] shadow-sm transition active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>{t.hero.registerFree}</span>
          </button>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-6xl mx-auto">
          {STATS.map(({ value, labelKey }) => (
            <div
              key={labelKey}
              className="p-4 rounded-2xl bg-white/70 dark:bg-[#152434]/70 border border-[#CCE4F7] dark:border-[#253D56] backdrop-blur-sm shadow-xs"
            >
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400">{value}</div>
              <div className="text-xs font-medium text-[#537292] dark:text-[#8DB0D4] mt-1">{t.hero[labelKey]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
