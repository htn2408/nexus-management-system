// Chi tiết một kết nối ở tab Quản lý kết nối: đổi trạng thái đường truyền (có lý do)
// và hồ sơ thiết bị CPE / hợp đồng. Mở lại thuê bao bị tạm ngưng do nợ cước là thao tác
// thủ công của kỹ thuật tại đây — thanh toán xong không tự mở lại.
import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, HardDrive, Power, Radio, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { getPlanName } from '../../lib/planI18n';
import { changeConnectionStatus } from '../../lib/technicalApi';
import { useStore } from '../../lib/store';
import { CONNECTION_STATUS_CHIP, connectionStatusLabel } from '../../lib/connectionStatus';
import ActivityLogList from './ActivityLogList';

const STATES = [
  {
    status: 'Active',
    vi: 'Hoạt động bình thường',
    en: 'Active',
    noteVi: 'Đang cung cấp dịch vụ',
    noteEn: 'Service running',
    on: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-500',
    dot: 'bg-emerald-500',
  },
  {
    status: 'Temporarily Inactive',
    vi: 'Tạm ngưng dịch vụ',
    en: 'Temporarily Inactive',
    noteVi: 'Bảo trì, nợ cước hoặc khách xin tạm ngưng',
    noteEn: 'Maintenance, overdue or customer request',
    on: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-500',
    dot: 'bg-amber-500',
  },
  {
    status: 'Permanently Inactive',
    vi: 'Ngắt kết nối vĩnh viễn',
    en: 'Permanently Inactive',
    noteVi: 'Ngắt cổng, thu hồi thiết bị',
    noteEn: 'Port disconnected, CPE reclaimed',
    on: 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-500',
    dot: 'bg-rose-500',
  },
];

function Info({ label, children, sub }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1 break-words">{children || '—'}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
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

export default function ConnectionControlPanel({ connection: c, engineerId, engineerName, onClose, onSaved }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Tăng sau mỗi lần đổi trạng thái để nhật ký tải lại dòng mới.
  const [logVersion, setLogVersion] = useState(0);

  const changeStatus = async (status) => {
    if (status === c.status || isSaving) return;
    if (
      status === 'Permanently Inactive' &&
      !window.confirm(
        isVi
          ? `Ngắt vĩnh viễn ${c.accountId}? Thao tác này thu hồi cổng và thiết bị của thuê bao.`
          : `Permanently disconnect ${c.accountId}? This reclaims the port and the device.`,
      )
    ) {
      return;
    }
    setIsSaving(true);
    try {
      await changeConnectionStatus(c.accountId, {
        status,
        reason:
          reason.trim() ||
          (isVi
            ? `${engineerName || 'Kỹ thuật viên'} đổi trạng thái trên trang Kỹ thuật.`
            : `Changed by ${engineerName || 'a technician'} on the Technical dashboard.`),
        performedBy: engineerId || undefined,
      });
      toast.success(
        isVi
          ? `Đã chuyển ${c.accountId} sang: ${connectionStatusLabel(status, true)}`
          : `Account ${c.accountId} is now ${status}`,
      );
      setReason('');
      setLogVersion((v) => v + 1);
      await onSaved();
    } catch (err) {
      toast.error(technicalErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {isVi ? 'Mã tài khoản:' : 'Account ID:'}{' '}
                <span className="text-amber-600 dark:text-amber-400">{c.accountId}</span>
              </h4>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${CONNECTION_STATUS_CHIP[c.status] ?? CONNECTION_STATUS_CHIP['Permanently Inactive']}`}
              >
                {connectionStatusLabel(c.status, isVi)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isVi ? 'Thuê bao:' : 'Subscriber:'}{' '}
              <strong className="text-slate-800 dark:text-slate-200">{c.customerName}</strong> • {c.installationAddress}{' '}
              • {c.customerPhone}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => copyText(c.accountId)}
            className="inline-flex items-center space-x-1 text-xs border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Power className="h-4 w-4 text-amber-500" />
            {isVi ? 'Trạng thái đường truyền' : 'Line status'}
          </h5>
          <div className="space-y-2">
            {STATES.map((s) => {
              const isCurrent = c.status === s.status;
              return (
                <button
                  key={s.status}
                  type="button"
                  disabled={isSaving || isCurrent}
                  onClick={() => changeStatus(s.status)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition disabled:cursor-default ${
                    isCurrent
                      ? s.on
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.dot}`}></span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {isVi ? s.vi : s.en}
                      {isCurrent && (
                        <span className="ml-1.5 text-[10px] font-normal text-slate-500">
                          ({isVi ? 'hiện tại' : 'current'})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{isVi ? s.noteVi : s.noteEn}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {isVi ? 'Lý do chuyển trạng thái (lưu vào hồ sơ):' : 'Reason for the change (saved on the record):'}
            </label>
            <input
              type="text"
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isVi
                  ? 'VD: Khách đã thanh toán nợ cước, mở lại dịch vụ.'
                  : 'e.g. Customer settled the overdue bill; service restored.'
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <HardDrive className="h-4 w-4 text-slate-500" />
            {isVi ? 'Thiết bị CPE & Hợp đồng thuê bao' : 'CPE hardware & subscriber contract'}
          </h5>
          <div className="grid grid-cols-2 gap-2.5">
            <Info
              label={isVi ? 'Thiết bị gán' : 'CPE hardware'}
              sub={c.assignedDeviceSerial && `SN: ${c.assignedDeviceSerial}`}
            >
              {c.assignedDeviceModel}
            </Info>
            <Info label={isVi ? 'Cổng NOC & IP' : 'NOC port & IP'} sub={c.ipAddress && `IP: ${c.ipAddress}`}>
              {c.portNumber}
            </Info>
            <Info
              label={isVi ? 'Gói cước' : 'Service plan'}
              sub={`$${Number(c.monthlyRental).toFixed(2)}/${isVi ? 'tháng' : 'mo'} • ${isVi ? 'Cọc' : 'Deposit'}: $${Number(c.securityDeposit).toFixed(2)}`}
            >
              {getPlanName({ name: c.planName }, language)}
            </Info>
            <Info
              label={isVi ? 'Đơn hàng gốc' : 'Source order'}
              sub={`${isVi ? 'Lắp đặt:' : 'Installed:'} ${c.installedDate || '—'}`}
            >
              #{c.orderId}
            </Info>
            <div className="col-span-2">
              <Info
                label={isVi ? 'Ghi chú trạng thái gần nhất' : 'Last status note'}
                sub={c.lastUpdated && `${isVi ? 'Cập nhật:' : 'Updated:'} ${c.lastUpdated}`}
              >
                {c.lastStatusReason}
              </Info>
            </div>
            {(c.suspensionStartDate || c.terminatedDate) && (
              <div className="col-span-2 text-[11px] text-slate-500 dark:text-slate-400">
                {c.suspensionStartDate &&
                  `${isVi ? 'Tạm ngưng từ' : 'Suspended from'} ${c.suspensionStartDate}${c.suspensionEndDate ? ` → ${c.suspensionEndDate}` : ''}. `}
                {c.terminatedDate && `${isVi ? 'Ngắt vĩnh viễn ngày' : 'Terminated on'} ${c.terminatedDate}.`}
              </div>
            )}
          </div>
        </div>
      </div>

      <ActivityLogList accountId={c.accountId} refreshKey={logVersion} />
    </div>
  );
}
