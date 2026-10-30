// Biên nhận sau khi đặt mua: mã đơn để theo dõi (mã tài khoản chỉ được cấp khi kỹ thuật xác nhận khả thi).
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, Copy, FileText, ShieldCheck } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { DEPOSIT_WAIVER_MIN_CONNECTIONS } from '../../context/NexusContext';
import { useStore } from '../../lib/store';

function SummaryTile({ label, children, className = '' }) {
  return (
    <div className={`p-3 rounded-xl bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] ${className}`}>
      <div className="text-[#537292] dark:text-[#8DB0D4]">{label}</div>
      <div className="font-bold text-[#0F1D2B] dark:text-white mt-0.5">{children}</div>
    </div>
  );
}

export default function PurchaseReceipt({ order, shopName }) {
  const navigate = useNavigate();
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      toast.success(t.registrationPage.copiedId);
    } catch {
      toast.error(isVi ? 'Không sao chép được, vui lòng chép tay.' : 'Copy failed, please note it down manually.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/95 dark:bg-[#152434]/95 border border-[#CCE4F7] dark:border-[#253D56] rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F1D2B] dark:text-white">
            {t.registrationPage.successTitle}
          </h1>
          <p className="text-sm text-[#537292] dark:text-[#8DB0D4] mt-2">{t.registrationPage.successDesc}</p>
        </div>

        {/* Order code: the Account ID comes later, at feasibility confirmation */}
        <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-transparent border border-sky-500/25">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            <FileText className="h-4 w-4" />
            <span>{t.registrationPage.orderIdIssued}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-xl sm:text-2xl font-black tracking-wider text-[#0F1D2B] dark:text-white break-all">
              {order.id}
            </span>
            <button
              type="button"
              onClick={copyOrderId}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition active:scale-95 flex items-center space-x-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{t.registrationPage.copyId}</span>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
            {t.registrationPage.saveOrderNotice}
          </p>
        </div>

        {/* Order recap */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <SummaryTile label={t.registrationPage.summaryTitle}>
            {order.connectionType} · {order.customerName}
          </SummaryTile>
          <SummaryTile label={t.registrationPage.planLabel}>{order.planName}</SummaryTile>
          <SummaryTile label={t.registrationPage.branchAssigned}>
            {shopName ?? order.retailOutletCode} ({order.retailOutletCode})
          </SummaryTile>
          <SummaryTile label={t.registrationPage.retailAgentAssigned}>
            {order.retailEmployeeName}
            {order.assignedBranchName && (
              <span className="font-medium text-[#537292] dark:text-[#8DB0D4]"> · {order.assignedBranchName}</span>
            )}
          </SummaryTile>
          <SummaryTile label={t.registrationPage.addressLabel}>{order.installationAddress}</SummaryTile>
          {order.depositWaived && (
            // Đơn trên 50 kết nối: CSDL đã ghi Orders.DepositWaived = 1
            <div className="sm:col-span-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                {isVi ? 'Tiền cọc: MIỄN PHÍ' : 'Security deposit: FREE'}
              </div>
              <div className="text-[#537292] dark:text-[#8DB0D4] mt-0.5">
                {isVi
                  ? `Đơn ${order.bulkConnectionsCount} kết nối (trên ${DEPOSIT_WAIVER_MIN_CONNECTIONS}) được miễn toàn bộ tiền cọc.`
                  : `${order.bulkConnectionsCount} connections (over ${DEPOSIT_WAIVER_MIN_CONNECTIONS}) — the full deposit is waived.`}
              </div>
            </div>
          )}
        </div>

        {/* Stage 1 notice: the order goes to the branch's retail desk first */}
        <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{t.registrationPage.retailStageHint}</span>
        </div>

        {/* Next steps */}
        <div className="mt-5 p-4 rounded-xl bg-white dark:bg-[#1E3349] border border-[#CCE4F7] dark:border-[#253D56]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#305070] dark:text-slate-300 mb-2">
            {t.registrationPage.nextStepsTitle}
          </h3>
          <ol className="space-y-1.5 text-xs text-[#537292] dark:text-[#8DB0D4] list-decimal list-inside">
            <li>{t.registrationPage.nextStep1}</li>
            <li>{t.registrationPage.nextStep2}</li>
            <li>{t.registrationPage.nextStep3}</li>
          </ol>
        </div>

        {/* Chưa có mã tài khoản: khách theo dõi đơn bằng mã đơn ở trang đăng nhập. */}
        <button
          type="button"
          onClick={() => navigate(`/login?order=${order.id}`)}
          className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white transition shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2 active:scale-95"
        >
          <span>{t.registrationPage.trackOrderBtn}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
