// Chi tiết một đơn khi mở rộng ở tab Theo dõi đơn: tiến trình 5 bước, hồ sơ khách,
// dữ liệu kỹ thuật (khảo sát, KTV phụ trách) và mã tài khoản đã cấp.
import { toast } from 'sonner';
import { CheckCircle2, Clock, Copy, FileText, Phone, Server, ShoppingBag, User, UserCheck, UserPlus, Wifi, Wrench, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import { orderStatusLabel, orderStatusTone } from '../../types/nexus';

const STAGES = [
  { step: 1, label: 'Order Logged', labelVi: 'Đã ghi nhận đơn', sub: 'Retail Counter', subVi: 'Quầy bán lẻ' },
  { step: 2, label: 'Retail Approved', labelVi: 'Bán hàng duyệt hồ sơ', sub: 'Branch Desk', subVi: 'Chi nhánh phụ trách' },
  { step: 3, label: 'Feasibility Checked', labelVi: 'Kỹ thuật khảo sát khả thi', sub: 'Field Survey', subVi: 'Khảo sát hiện trường' },
  { step: 4, label: 'Tech Dispatch', labelVi: 'Điều phối kỹ thuật', sub: 'CPE & Port Bind', subVi: 'Gắn cổng & CPE' },
  { step: 5, label: 'Connection Live', labelVi: 'Đường truyền hoạt động', sub: '16-char Account', subVi: 'Mã tài khoản 16 ký tự' },
];

// Bước cao nhất đã HOÀN THÀNH theo trạng thái đơn; -1 = bị từ chối ở một khâu.
function completedStage(status) {
  switch (status) {
    case 'PendingRetail':
      return 1;
    case 'Pending':
      return 2;
    case 'Feasible':
      return 3;
    case 'Connection Provided':
      return 5;
    case 'Not Approved':
    case 'Not Feasible':
      return -1;
    default:
      return 1;
  }
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}: ${text}`);
  } catch {
    toast.info(text);
  }
}

function Line({ label, children, mono = false }) {
  return (
    <div>
      <span className="text-slate-500">{label}</span>
      <span className={`text-slate-800 dark:text-slate-200 ml-1 ${mono ? 'font-mono font-semibold' : ''}`}>{children}</span>
    </div>
  );
}

function Box({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
      <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        <span>{title}</span>
      </h5>
      <div className="space-y-1.5 text-xs">{children}</div>
    </div>
  );
}

export default function OrderDetailsPanel({ order: o, onClose, onAssignTechnician, onOpenConnection }) {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const stage = completedStage(o.status);

  return (
    <div className="space-y-6 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h4 className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                {isVi ? 'Mã đơn hàng:' : 'Order ID:'} <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{o.id}</span>
              </h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${orderStatusTone(o.status).chip}`}>
                {orderStatusLabel(o.status, language)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isVi
                ? `Đăng ký lúc ${o.createdAt} bởi ${o.retailEmployeeName} (${o.retailOutletCode})`
                : `Submitted at ${o.createdAt} by ${o.retailEmployeeName} (${o.retailOutletCode})`}
            </p>
            {o.retailApprovedBy && o.status !== 'Not Approved' && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                {isVi ? 'Bán hàng duyệt:' : 'Retail approved:'} {o.retailApprovedBy} · {o.retailApprovedAt}
                {o.retailApprovalNotes && ` — ${o.retailApprovalNotes}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => copyText(o.id, 'Order ID')}
            className="inline-flex items-center space-x-1 text-xs border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{isVi ? 'Sao chép mã đơn' : 'Copy Order ID'}</span>
          </button>
          {o.assignedAccountId && (
            <button
              type="button"
              onClick={() => onOpenConnection(o.assignedAccountId)}
              className="inline-flex items-center space-x-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition shadow-xs"
            >
              <Wifi className="h-3.5 w-3.5" />
              <span>{isVi ? 'Mở chi tiết thuê bao' : 'View Connection'}</span>
            </button>
          )}
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

      <div className="py-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-5 flex items-center space-x-2">
          <Clock className="h-3.5 w-3.5 text-emerald-600" />
          <span>{isVi ? 'Quy trình xử lý đơn hàng' : 'Fulfillment Lifecycle'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 relative">
          {STAGES.map((st) => {
            const isFailed = (o.status === 'Not Approved' && st.step >= 2) || (o.status === 'Not Feasible' && st.step >= 3);
            const isComplete = stage >= st.step;
            return (
              <div key={st.step} className="text-center space-y-2">
                <div
                  className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    isFailed
                      ? 'bg-rose-500 text-white'
                      : isComplete
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isFailed ? '!' : isComplete ? <CheckCircle2 className="h-5 w-5" /> : st.step}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{isVi ? st.labelVi : st.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{isVi ? st.subVi : st.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
        {o.status === 'PendingRetail' && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-amber-800 dark:text-amber-300">
              {isVi
                ? `Chờ chi nhánh ${o.retailOutletCode} duyệt hồ sơ trước khi kỹ thuật khảo sát.`
                : `Waiting for branch ${o.retailOutletCode} to approve the paperwork before Technical surveys it.`}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Box icon={User} title={isVi ? 'Hồ sơ khách hàng' : 'Customer Profile'}>
          <div>
            <span className="text-slate-500">{isVi ? 'Họ tên:' : 'Name:'}</span>
            <strong className="text-slate-900 dark:text-white ml-1">{o.customerName}</strong>
          </div>
          <Line label={isVi ? 'Điện thoại:' : 'Phone:'} mono>
            {o.customerPhone}
          </Line>
          <Line label="Email:">{o.customerEmail}</Line>
          <Line label={isVi ? 'Xác minh ID:' : 'ID Proof:'} mono>
            {o.idProofType} ({o.idProofNumber})
          </Line>
          <Line label={isVi ? 'Địa chỉ:' : 'Address:'}>{o.installationAddress}</Line>
        </Box>

        <Box icon={Server} title={isVi ? 'Dữ liệu dịch vụ & Kỹ thuật' : 'Service & Technical'}>
          <div>
            <span className="text-slate-500">{isVi ? 'Gói cước:' : 'Plan:'}</span>
            <strong className="text-slate-900 dark:text-white ml-1">{getPlanName({ name: o.planName }, language)}</strong>
          </div>
          <Line label={isVi ? 'Loại kết nối:' : 'Type:'}>{o.connectionType}</Line>
          {/* Chỉ có sau khi kỹ thuật khảo sát. */}
          <Line label={isVi ? 'Khoảng cách cáp:' : 'Cable Distance:'} mono>
            {o.cableDistanceMeters ? `${o.cableDistanceMeters} m` : '—'}
          </Line>
          <Line label={isVi ? 'Hộp chia DP:' : 'DP Box:'}>{o.dpBoxCapacity || '—'}</Line>

          <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Wrench className="h-3 w-3 text-emerald-600" />
                {isVi ? 'Kỹ thuật viên khảo sát:' : 'Survey Technician:'}
              </span>
              <button
                type="button"
                onClick={() => onAssignTechnician(o)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <UserCheck className="h-3 w-3" />
                <span>{o.assignedTechnician ? (isVi ? 'Đổi KTV' : 'Change') : isVi ? 'Phân công' : 'Assign'}</span>
              </button>
            </div>

            {o.assignedTechnician ? (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{o.assignedTechnician}</span>
                  {o.assignedTechnicianId && (
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-semibold">
                      {o.assignedTechnicianId}
                    </span>
                  )}
                </div>
                {o.assignedTechnicianPhone && (
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-600" />
                    <span>{o.assignedTechnicianPhone}</span>
                  </div>
                )}
                {o.assignedTechnicianDate && (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {isVi ? 'Thời điểm phân công:' : 'Assigned at:'} {o.assignedTechnicianDate}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span className="text-xs">{isVi ? 'Chưa phân công kỹ thuật viên' : 'No technician assigned'}</span>
                <button
                  type="button"
                  onClick={() => onAssignTechnician(o)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold transition shadow-xs flex items-center gap-1"
                >
                  <UserPlus className="h-3 w-3" />
                  <span>{isVi ? 'Chọn người khảo sát' : 'Select Tech'}</span>
                </button>
              </div>
            )}
          </div>

          {o.feasibilityNotes && (
            <div className="text-amber-600 dark:text-amber-400 pt-1">
              <span className="font-semibold">{isVi ? 'Ghi chú kỹ thuật:' : 'Tech Notes:'}</span>
              <p className="text-[11px] mt-0.5">{o.feasibilityNotes}</p>
            </div>
          )}
        </Box>

        <Box icon={CheckCircle2} title={isVi ? 'Cấp phát tài khoản & Điểm giao dịch' : 'Issued Account & Retail Outlet'}>
          {o.assignedAccountId ? (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block">
                {isVi ? 'Mã tài khoản 16 ký tự đã cấp:' : 'Issued 16-char Account ID:'}
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">{o.assignedAccountId}</span>
                <button
                  type="button"
                  onClick={() => copyText(o.assignedAccountId, 'Account ID')}
                  className="p-1 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-600 dark:text-emerald-400 transition"
                  title={isVi ? 'Sao chép mã tài khoản' : 'Copy Account ID'}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
              <span className="text-xs font-medium">
                {isVi ? 'Chưa cấp Account ID (đang chờ kỹ thuật khảo sát)' : 'Account ID is issued after the technical survey.'}
              </span>
            </div>
          )}
          <Line label={isVi ? 'Điểm quầy bán lẻ:' : 'Retail Outlet:'} mono>
            {o.retailOutletCode}
          </Line>
          <Line label={isVi ? 'Nhân viên tiếp nhận:' : 'Staff:'}>{o.retailEmployeeName}</Line>
        </Box>
      </div>
    </div>
  );
}
