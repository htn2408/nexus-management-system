// Khu giới thiệu công nghệ: 4 thẻ dịch vụ.
import { Wifi, Server, Phone, Radio } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

const CARDS = [
  { n: 1, icon: Wifi, tone: 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400' },
  { n: 2, icon: Server, tone: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' },
  { n: 3, icon: Phone, tone: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' },
  { n: 4, icon: Radio, tone: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' },
];

export default function IntroSection() {
  const t = useStore(languageStore.t);

  return (
    <section id="intro" className="py-16 bg-white/60 dark:bg-[#152434]/60 border-y border-[#CCE4F7] dark:border-[#253D56]">
      <div className="w-full px-4 sm:px-6 lg:px-[40px]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold tracking-wider text-sky-600 dark:text-sky-400">{t.intro.badge}</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F1D2B] dark:text-white mt-2">{t.intro.title}</h2>
          <p className="text-sm text-[#537292] dark:text-[#8DB0D4] mt-3">{t.intro.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CARDS.map(({ n, icon: Icon, tone }) => (
            <div
              key={n}
              className="p-6 rounded-2xl bg-white dark:bg-[#1E3349] border border-[#CCE4F7] dark:border-[#253D56] shadow-xs hover:shadow-md transition-shadow"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-[#0F1D2B] dark:text-white mb-2">{t.intro[`card${n}Title`]}</h3>
              <p className="text-xs text-[#537292] dark:text-[#8DB0D4] leading-relaxed">{t.intro[`card${n}Desc`]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
