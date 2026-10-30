// Tóm tắt chi phí trước khi đặt: cước tháng, tiền cọc (miễn khi trên 50 kết nối), chiết khấu số lượng.
import { languageStore } from '../../context/LanguageContext';
import { DEPOSIT_WAIVER_MIN_CONNECTIONS } from '../../context/NexusContext';
import { useStore } from '../../lib/store';

export default function OrderSummary({ plan, connections, discountPercent, depositWaived }) {
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  // Tiền cọc thực thu: 0 khi đơn được miễn cọc.
  const deposit = depositWaived ? 0 : plan.securityDeposit;
  const subtotal = plan.monthlyRental + deposit;
  const discount = (subtotal * discountPercent) / 100;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent border border-sky-500/20 text-xs">
      <div className="font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 mb-2">
        {t.registrationPage.summaryTitle}
      </div>
      <div className="flex items-center justify-between py-1">
        <span className="text-[#537292] dark:text-[#8DB0D4]">{plan.name}</span>
        <span className="font-mono text-[#0F1D2B] dark:text-white">{plan.speedOrBandwidth}</span>
      </div>
      <div className="flex items-center justify-between py-1">
        <span className="text-[#537292] dark:text-[#8DB0D4]">{t.registrationPage.monthlyLabel}</span>
        <span className="font-bold text-[#0F1D2B] dark:text-white">${plan.monthlyRental}</span>
      </div>
      <div className="flex items-center justify-between py-1">
        <span className="text-[#537292] dark:text-[#8DB0D4]">{t.registrationPage.depositLabel}</span>
        {depositWaived ? (
          // Trên 50 kết nối: gạch giá gốc, hiện nhãn MIỄN PHÍ
          <span className="flex items-center gap-1.5">
            <span className="line-through text-[#8FAAC2]">${plan.securityDeposit}</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              {isVi ? 'Miễn phí' : 'Free'}
            </span>
          </span>
        ) : (
          <span className="font-bold text-[#0F1D2B] dark:text-white">${plan.securityDeposit}</span>
        )}
      </div>
      {depositWaived && (
        <div className="my-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          {isVi
            ? `Đơn ${connections} kết nối (trên ${DEPOSIT_WAIVER_MIN_CONNECTIONS}) được MIỄN PHÍ tiền cọc.`
            : `${connections} connections (over ${DEPOSIT_WAIVER_MIN_CONNECTIONS}) — security deposit is FREE.`}
        </div>
      )}
      {discountPercent > 0 && (
        <div className="flex items-center justify-between py-1 text-emerald-600 dark:text-emerald-400">
          <span>
            {isVi ? `Chiết khấu gói ${connections} kết nối` : `Bulk scheme (${connections} connections)`} −{discountPercent}%
          </span>
          <span className="font-bold">−${discount.toFixed(2)}</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-sky-500/20">
        <span className="font-bold text-[#305070] dark:text-slate-200">{t.registrationPage.dueTodayLabel}</span>
        <span className="font-black text-base text-sky-700 dark:text-sky-300">${(subtotal - discount).toFixed(2)}</span>
      </div>
    </div>
  );
}
