// Một thẻ gói cước trên trang chủ. Gói "Ultra" / "Prime" được làm nổi bật.
import { useNavigate } from 'react-router';
import { CheckCircle2, ChevronRight, Clock, HardDrive, Phone, ShieldCheck, Zap } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

export default function PlanCard({ plan }) {
  const navigate = useNavigate();
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';
  const isHighlight = plan.name.includes('Ultra') || plan.name.includes('Prime');

  return (
    <div
      className={`plan-card snap-start rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 relative ${
        isHighlight
          ? 'bg-gradient-to-b from-white to-sky-50/50 dark:from-[#1A2C3F] dark:to-[#152434] border-2 border-sky-500 dark:border-sky-400 shadow-lg shadow-sky-500/10'
          : 'bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-sm hover:shadow-md'
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-sky-600 text-white shadow-sm">
          {t.plans.popular}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-[#1E3349] text-sky-700 dark:text-sky-300 shrink-0">
            {plan.type}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="truncate">{t.plans.readyToInstall}</span>
          </span>
        </div>

        <h3 className="font-bold text-base text-[#0F1D2B] dark:text-white mt-2.5 truncate" title={plan.name}>
          {plan.name}
        </h3>
        <p className="text-xs text-[#537292] dark:text-[#8DB0D4] mt-1 line-clamp-2 h-8">{plan.description}</p>

        <div className="mt-4 pt-4 border-t border-[#CCE4F7]/60 dark:border-[#253D56]/60 flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">${plan.monthlyRental}</span>
          <span className="text-xs text-[#537292] dark:text-[#8DB0D4] font-medium">
            {plan.billingCycle
              ? `/ ${plan.billingCycle}${plan.validity ? ` (${plan.validity})` : ''}`
              : t.plans.perMonth}
          </span>
        </div>

        <div className="mt-5 space-y-2.5 text-xs text-[#2C4764] dark:text-[#94B5D6]">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>
              <strong>{t.plans.speed}</strong> {plan.speedOrBandwidth}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <HardDrive className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>
              <strong>{t.plans.dataLimit}</strong> {plan.dataLimit}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>
              <strong>{t.plans.securityDeposit}</strong> ${plan.securityDeposit}
            </span>
          </div>
          {plan.hourlyCharge > 0 && (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                <strong>{t.plans.hourlyCharge}</strong> ${plan.hourlyCharge}/hr
              </span>
            </div>
          )}
          {plan.includedHours > 0 && (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                <strong>{isVi ? 'Số giờ:' : 'Included hours:'}</strong> {plan.includedHours}h
              </span>
            </div>
          )}
          {plan.callRates && (
            <div className="flex items-start space-x-2">
              <Phone className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <span>{plan.callRates}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          // Mở trang mua với gói này chọn sẵn.
          onClick={() => navigate(`/register?plan=${plan.id}`)}
          className={`w-full py-2.5 rounded-xl font-bold text-xs transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer ${
            isHighlight
              ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
              : 'bg-[#EDF6FF] dark:bg-[#1E3349] hover:bg-sky-100 dark:hover:bg-[#253E58] text-sky-800 dark:text-sky-200 border border-[#CCE4F7] dark:border-[#253D56]'
          }`}
        >
          <span>{t.plans.subscribeBtn}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
