// Cột trái của trang đăng ký: giới thiệu, 4 lợi ích và đánh giá của khách.
import { Wifi, HardDrive, ShieldCheck, Receipt, Star } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

const BENEFITS = [
  { n: 1, icon: Wifi, tone: 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400' },
  { n: 2, icon: HardDrive, tone: 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400' },
  { n: 3, icon: ShieldCheck, tone: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400' },
  { n: 4, icon: Receipt, tone: 'bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400' },
];

const AVATARS = [
  { letter: 'A', color: 'bg-sky-600' },
  { letter: 'T', color: 'bg-emerald-600' },
  { letter: 'M', color: 'bg-indigo-600' },
];

export default function RegisterBenefits() {
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  return (
    <div className="lg:col-span-5 space-y-6">
      <div>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 dark:bg-sky-400/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping"></span>
          <span>NEXUS TELECOM ONBOARDING</span>
        </span>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0F1D2B] dark:text-white mt-3">
          {t.registrationPage.title}
        </h1>
        <p className="text-sm text-[#537292] dark:text-[#8DB0D4] mt-2 leading-relaxed">{t.auth.registerDescription}</p>
      </div>

      <div className="space-y-3 pt-2">
        {BENEFITS.map(({ n, icon: Icon, tone }) => (
          <div
            key={n}
            className="p-4 rounded-xl bg-white/80 dark:bg-[#152434]/80 border border-[#CCE4F7] dark:border-[#253D56] shadow-xs flex items-start space-x-3.5 backdrop-blur-sm transition"
          >
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F1D2B] dark:text-white">{t.registrationPage[`benefit${n}Title`]}</h4>
              <p className="text-xs text-[#537292] dark:text-[#8DB0D4] mt-0.5">{t.registrationPage[`benefit${n}Desc`]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Social Proof Box */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent border border-sky-500/20 flex items-center space-x-3">
        <div className="flex -space-x-1.5 overflow-hidden">
          {AVATARS.map(({ letter, color }) => (
            <div
              key={letter}
              className={`h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#152434] text-white font-bold text-xs flex items-center justify-center ${color}`}
            >
              {letter}
            </div>
          ))}
        </div>
        <div className="text-xs">
          <div className="flex items-center space-x-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
            <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">4.9/5.0</span>
          </div>
          <p className="text-[#537292] dark:text-[#8DB0D4] mt-0.5">
            {isVi
              ? 'Được tin dùng bởi hơn 10.000+ hộ gia đình và doanh nghiệp.'
              : 'Trusted by 10,000+ households and enterprises.'}
          </p>
        </div>
      </div>
    </div>
  );
}
