// Đơn vừa tạo tại quầy: mã đơn 11 ký tự. Mọi đơn mới đều chờ chi nhánh duyệt hồ sơ trước.
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, Copy } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';

export default function OrderCreatedModal({ order, onClose, onReview }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      toast.success(isVi ? `Đã sao chép mã đơn: ${order.id}` : `Copied Order ID: ${order.id}`);
    } catch {
      toast.info(order.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 text-center">
        <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isVi ? 'Đã tạo đơn hàng mới thành công!' : 'New Order Successfully Booked!'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isVi
              ? 'Đơn đang ở hàng đợi Duyệt hồ sơ chi nhánh. Duyệt xong, đơn chuyển sang Kỹ thuật khảo sát.'
              : 'The order is in the Branch Approval Queue. Once approved it goes to the technical survey.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-semibold uppercase">{isVi ? 'Mã đơn hàng 11 ký tự' : '11-Character Order ID'}</div>
          <div className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider">{order.id}</div>
          <div className="text-[11px] text-slate-500">
            {isVi ? 'Khách hàng:' : 'Customer:'} {order.customerName} • {getPlanName({ name: order.planName }, language)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 space-y-1">
          <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold uppercase">
            {isVi ? 'Đang chờ cấp mã tài khoản' : 'Account ID pending'}
          </div>
          <div className="text-[11px] text-slate-500">
            {isVi
              ? 'Mã tài khoản 16 ký tự của khách hàng (thông tin đăng nhập duy nhất) sẽ được cấp sau khi bộ phận kỹ thuật xác nhận tuyến cáp khả thi. Trong thời gian này, khách hàng sử dụng mã đơn này để tra cứu.'
              : "The customer's 16-character Account ID — their only sign-in credential — is issued once technical confirms the line is feasible. Until then they track this order code."}
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={copyId}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{isVi ? 'Sao chép mã đơn' : 'Copy Order ID'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isVi ? 'Tạo đơn khác' : 'New Order'}
          </button>
          <button
            type="button"
            onClick={onReview}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center space-x-1.5"
          >
            <span>{isVi ? 'Duyệt hồ sơ này' : 'Review This Order'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
