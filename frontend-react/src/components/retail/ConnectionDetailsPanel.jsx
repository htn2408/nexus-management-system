// Chi tiết một thuê bao khi mở rộng: thông số dịch vụ, dữ liệu vật lý, liên hệ, công nợ.
// Trường kỹ thuật nào chưa có (IP, cổng, CPE) thì hiện '—', không điền giá trị mẫu.
import { toast } from 'sonner';
import { Copy, CreditCard, FileText, HardDrive, Receipt, User, Wifi, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import { CONNECTION_STATUS_CHIP, connectionStatusLabel } from '../../lib/connectionStatus';

const TYPE_VI = { Broadband: 'Cáp quang (Broadband)', 'Dial-Up': 'Quay số (Dial-Up)', Landline: 'Cố định (Landline)' };

function Box({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
      <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        <span>{title}</span>
      </h5>
      <div className="space-y-1.5 text-xs">{children}</div>
    </div>
  );
}

function Line({ label, children, mono = false }) {
  return (
    <div className={mono ? 'font-mono' : ''}>
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 ml-1 font-semibold">{children || '—'}</span>
    </div>
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied Account ID: ${text}`);
  } catch {
    toast.info(text);
  }
}

export default function ConnectionDetailsPanel({ connection: c, bills, due, payableBill, onClose, onOpenPayment }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';

  const payButton = (label) =>
    payableBill && (
      <button
        type="button"
        onClick={() => onOpenPayment(payableBill)}
        className="inline-flex items-center space-x-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition shadow-xs"
      >
        <CreditCard className="h-3.5 w-3.5" />
        <span>{label}</span>
      </button>
    );

  return (
    <div className="space-y-6 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <Wifi className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {isVi ? 'Mã tài khoản:' : 'Account ID:'} <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{c.accountId}</span>
              </h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${CONNECTION_STATUS_CHIP[c.status] ?? CONNECTION_STATUS_CHIP['Permanently Inactive']}`}>
                {connectionStatusLabel(c.status, isVi)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isVi ? 'Thuê bao:' : 'Subscriber:'} <strong className="text-slate-800 dark:text-slate-200">{c.customerName}</strong> •{' '}
              {isVi ? 'Kích hoạt ngày' : 'Activated on'} {c.installedDate || '—'} • {isVi ? 'Điện thoại:' : 'Phone:'} {c.customerPhone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {payButton(isVi ? `Thu tiền ($${due.toFixed(2)})` : `Take payment ($${due.toFixed(2)})`)}
          <button
            type="button"
            onClick={() => copyText(c.accountId)}
            className="inline-flex items-center space-x-1 text-xs border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{isVi ? 'Sao chép Account ID' : 'Copy Account ID'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center space-x-1 text-xs border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-3.5 w-3.5" />
            <span>{isVi ? 'Đóng' : 'Close'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Box icon={FileText} title={isVi ? 'Thông số dịch vụ' : 'Service Parameters'}>
          <Line label={isVi ? 'Gói cước:' : 'Plan:'}>{getPlanName({ name: c.planName }, language)}</Line>
          <Line label={isVi ? 'Loại kết nối:' : 'Connection:'}>{isVi ? (TYPE_VI[c.connectionType] ?? c.connectionType) : c.connectionType}</Line>
          <Line label={isVi ? 'Cước thuê tháng:' : 'Monthly Rental:'} mono>
            ${c.monthlyRental.toFixed(2)}
          </Line>
          <Line label={isVi ? 'Tiền đặt cọc:' : 'Security Deposit:'} mono>
            ${c.securityDeposit.toFixed(2)}
          </Line>
        </Box>

        <Box icon={HardDrive} title={isVi ? 'Dữ liệu vật lý & Tuyến cáp' : 'Physical & Circuit Data'}>
          <Line label={isVi ? 'Địa chỉ IP cấp:' : 'Assigned IP:'} mono>
            {c.ipAddress}
          </Line>
          <Line label={isVi ? 'Cổng Switch/NOC:' : 'Switch Port:'} mono>
            {c.portNumber}
          </Line>
          <Line label={isVi ? 'Thiết bị cấp:' : 'Assigned Device:'}>{c.assignedDeviceModel}</Line>
          <Line label={isVi ? 'Số sê-ri CPE:' : 'Serial:'} mono>
            {c.assignedDeviceSerial}
          </Line>
        </Box>

        <Box icon={User} title={isVi ? 'Liên hệ & Địa chỉ' : 'Contact & Address'}>
          <Line label={isVi ? 'Điện thoại:' : 'Phone:'} mono>
            {c.customerPhone}
          </Line>
          <Line label="Email:">{c.customerEmail}</Line>
          <Line label={isVi ? 'Địa chỉ lắp đặt:' : 'Installation:'}>{c.installationAddress}</Line>
          {c.lastStatusReason && (
            <div className="text-amber-600 dark:text-amber-400 pt-1">
              <span className="font-semibold">{isVi ? 'Lý do trạng thái:' : 'Reason:'}</span>
              <p className="text-[11px] mt-0.5">{c.lastStatusReason}</p>
            </div>
          )}
        </Box>

        <Box icon={Receipt} title={isVi ? 'Tài chính & Nợ cước' : 'Billing & Due Status'}>
          <div>
            <span className="block text-[11px] text-slate-500">{isVi ? 'Số tiền còn nợ:' : 'Outstanding Due:'}</span>
            <span className={`text-xl font-bold font-mono ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              ${due.toFixed(2)}
            </span>
          </div>
          <span
            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
              due > 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {due > 0 ? (isVi ? 'Chưa thanh toán' : 'Balance Outstanding') : isVi ? 'Đã quyết toán đủ' : 'Paid in Full'}
          </span>
          <div className="text-[11px] text-slate-500 pt-1">{isVi ? `Tổng số hóa đơn: ${bills.length}` : `Invoices on file: ${bills.length}`}</div>
          {payableBill && (
            <div className="text-[11px] text-slate-500">
              {isVi ? 'Thu trước hóa đơn:' : 'Next to collect:'} <span className="font-mono">{payableBill.invoiceNumber}</span> ({payableBill.billingMonth})
            </div>
          )}
          <div className="pt-1">{payButton(isVi ? 'Thu tiền tại quầy' : 'Pay at Counter')}</div>
        </Box>
      </div>
    </div>
  );
}
