// Xác nhận lại thông tin trước khi tạo đơn tại quầy: khách hàng, gói cước và chi phí ban đầu (ước tính).
import { CheckCircle2, MapPin, Receipt, RefreshCw, ShieldCheck, User, Wifi, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { DEPOSIT_WAIVER_MIN_CONNECTIONS, getBulkDiscountPercent, isDepositWaived } from '../../context/NexusContext';
import { getPlanName, getPlanSpeedOrBandwidth } from '../../lib/planI18n';
import { useStore } from '../../lib/store';

const SERVICE_TAX_PERCENT = 12.24;

function Field({ label, children, wide = false, mono = false }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <span className="text-slate-500 block mb-0.5">{label}</span>
      <span className={`font-semibold text-slate-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{children}</span>
    </div>
  );
}

function Card({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
      <div className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

const ID_LABELS = {
  'National ID Card': ['CCCD', 'National ID'],
  Passport: ['Hộ chiếu', 'Passport'],
  "Driver's License": ['Bằng lái xe', "Driver's License"],
};

export default function ConfirmOrderModal({ draft, plan, branchLabel, isCreating, onCancel, onConfirm }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const connections = draft.bulkConnectionsCount;
  const depositWaived = isDepositWaived(connections);
  const discountPercent = getBulkDiscountPercent(connections);
  const base = plan.monthlyRental + (depositWaived ? 0 : plan.securityDeposit);
  const discount = (base * discountPercent) / 100;
  const tax = ((base - discount) * SERVICE_TAX_PERCENT) / 100;
  const [idVi, idEn] = ID_LABELS[draft.idProofType] ?? [draft.idProofType, draft.idProofType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isVi ? 'Xác nhận tạo đơn hàng' : 'Confirm New Order'}
              </h3>
              <p className="text-xs text-slate-500">
                {isVi ? 'Kiểm tra thông tin chi tiết trước khi tạo đơn' : 'Check the details before creating the order'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <Card icon={User} title={isVi ? 'Thông tin khách hàng' : 'Customer Information'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Field label={isVi ? 'Họ và tên:' : 'Full Name:'}>{draft.customerName}</Field>
              <Field label={isVi ? 'Số điện thoại:' : 'Phone Number:'} mono>
                {draft.customerPhone}
              </Field>
              <Field label={isVi ? 'Email liên hệ:' : 'Email:'}>{draft.customerEmail}</Field>
              <Field label={isVi ? 'Giấy tờ tùy thân:' : 'ID Proof Document:'} mono>
                {isVi ? idVi : idEn}: {draft.idProofNumber}
              </Field>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block mb-0.5">{isVi ? 'Địa chỉ lắp đặt thực tế:' : 'Physical Installation Address:'}</span>
                <div className="font-semibold text-slate-900 dark:text-white flex items-start space-x-1.5">
                  <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{draft.installationAddress}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card icon={Wifi} title={isVi ? 'Dịch vụ & Gói cước đăng ký' : 'Service & Plan Details'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Field label={isVi ? 'Loại kết nối:' : 'Connection Type:'}>{draft.connectionType}</Field>
              <Field label={isVi ? 'Gói cước đã chọn:' : 'Selected Plan:'}>
                <span className="text-emerald-600 dark:text-emerald-400">{getPlanName(plan, language)}</span>
              </Field>
              <Field label={isVi ? 'Băng thông / Tốc độ:' : 'Bandwidth / Speed:'} mono>
                {getPlanSpeedOrBandwidth(plan.speedOrBandwidth, language)}
              </Field>
              <Field label={isVi ? 'Chi nhánh phụ trách:' : 'Processing Branch:'}>{branchLabel}</Field>
              {connections > 1 && <Field label={isVi ? 'Số kết nối:' : 'Connections:'}>{connections}</Field>}
            </div>
          </Card>

          <Card icon={Receipt} title={isVi ? 'Chi phí ban đầu (ước tính)' : 'Initial Cost (estimate)'}>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{isVi ? 'Cước thuê tháng đầu:' : 'First Month Rental:'}</span>
                <span className="font-mono font-medium">${plan.monthlyRental.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{isVi ? 'Tiền đặt cọc thiết bị:' : 'Security Deposit:'}</span>
                {depositWaived ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono line-through text-slate-400">${plan.securityDeposit.toFixed(2)}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      {isVi ? 'Miễn phí' : 'Free'}
                    </span>
                  </span>
                ) : (
                  <span className="font-mono font-medium">${plan.securityDeposit.toFixed(2)}</span>
                )}
              </div>
              {depositWaived && (
                <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {isVi
                    ? `Đơn ${connections} kết nối (trên ${DEPOSIT_WAIVER_MIN_CONNECTIONS}) được MIỄN PHÍ tiền cọc.`
                    : `${connections} connections (over ${DEPOSIT_WAIVER_MIN_CONNECTIONS}) — security deposit is FREE.`}
                </div>
              )}
              {discountPercent > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>
                    {isVi ? 'Chiết khấu số lượng' : 'Bulk Discount'} (−{discountPercent}%):
                  </span>
                  <span className="font-mono font-medium">−${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>
                  {isVi ? 'Thuế dịch vụ' : 'Service Tax'} ({SERVICE_TAX_PERCENT}%):
                </span>
                <span className="font-mono font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>{isVi ? 'Tổng thanh toán ban đầu:' : 'Total Initial Due:'}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
                  ${(base - discount + tax).toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isVi
                  ? 'Hóa đơn chính thức do bộ phận Kế toán lập sau khi đường truyền được cấp.'
                  : 'The official bill is issued by Accounts once the line is provided.'}
              </p>
            </div>
          </Card>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {isVi ? 'Quay lại chỉnh sửa' : 'Back to Edit'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCreating}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isCreating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>{isCreating ? (isVi ? 'Đang xử lý...' : 'Processing...') : isVi ? 'Xác nhận tạo đơn' : 'Confirm & Create Order'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
