// Banner báo đơn khách vừa đặt thêm đã vào hệ thống (đơn mới luôn chờ chi nhánh duyệt hồ sơ trước).
import { toast } from 'sonner';
import { Bell, ChevronRight, Copy, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

export default function OrderPlacedBanner({ order, onDismiss, onDetails }) {
  const isVi = useStore(languageStore.language) === 'vi';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      toast.success(isVi ? 'Đã sao chép mã đơn hàng' : 'Order ID copied');
    } catch {
      toast.info(order.id);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-emerald-500/10 border border-sky-400/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
      <div className="flex items-start space-x-3.5">
        <div className="h-11 w-11 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs">
          <Bell className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              {isVi ? 'Đơn đăng ký gói cước mới' : 'New Service Order'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
              {isVi ? 'Đã ghi nhận' : 'Recorded'}
            </span>
          </div>
          <div className="text-base font-extrabold text-[#0F1D2B] dark:text-white mt-0.5">
            {isVi ? 'Đơn hàng:' : 'Order:'} <span className="font-mono text-sky-600 dark:text-sky-400">#{order.id}</span>
            <span className="text-xs font-medium text-slate-500 ml-2">({order.planName})</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
            {isVi
              ? 'Chi nhánh sẽ kiểm tra hồ sơ trước, sau đó kỹ thuật viên khảo sát hạ tầng. Email xác nhận đã được gửi tới địa chỉ bạn khai báo.'
              : 'Your branch reviews the paperwork first, then engineers survey the line. A confirmation email has been sent to the address you gave.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={copyId}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#152434] text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
        >
          <Copy className="h-4 w-4" />
          <span>{isVi ? 'Sao chép mã' : 'Copy ID'}</span>
        </button>
        {onDetails && (
          <button
            type="button"
            onClick={onDetails}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition flex items-center space-x-1 shadow-xs cursor-pointer"
          >
            <span>{isVi ? 'Xem chi tiết' : 'Details'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title={isVi ? 'Ẩn thông báo' : 'Dismiss'}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
