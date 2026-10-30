// Thông tin tài khoản chỉ đọc: mã tài khoản, vai trò, trạng thái, chi nhánh, ngày tham gia, cách đăng nhập.
import { toast } from 'sonner';
import { Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

const ROLE_LABELS = {
  admin: { vi: 'Quản trị viên Hệ thống', en: 'System Administrator' },
  retail: { vi: 'Nhân viên Quầy Bán lẻ', en: 'Retail Store Staff' },
  technical: { vi: 'Kỹ sư Vận hành Kỹ thuật NOC', en: 'NOC Technical Engineer' },
  accounts: { vi: 'Kế toán Trưởng & Thu cước', en: 'Senior Finance & Billing' },
  user: { vi: 'Thuê bao Khách hàng', en: 'Customer Subscriber' },
};

function InfoTile({ label, value, note, noteClass = 'text-slate-400 dark:text-slate-500', action }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {action}
      </div>
      {value}
      <p className={`text-[11px] ${noteClass}`}>{note}</p>
    </div>
  );
}

export default function AccountInfoGrid({ user }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const roleLabel = ROLE_LABELS[user.role] ?? ROLE_LABELS.user;
  // Khách đăng nhập bằng mã tài khoản + OTP qua email; nhân viên bằng email + mật khẩu.
  const isCustomer = user.role === 'user';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      toast.success(isVi ? `Đã sao chép Account ID: ${user.id}` : `Copied Account ID: ${user.id}`);
    } catch {
      toast.info(`Account ID: ${user.id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <InfoTile
        label={isVi ? 'Mã định danh tài khoản' : 'Account ID / Code'}
        action={
          <button
            type="button"
            onClick={copyId}
            className="text-sky-600 hover:text-sky-700 p-1 rounded hover:bg-sky-50 dark:hover:bg-sky-950/60 transition"
            title={isVi ? 'Sao chép mã' : 'Copy ID'}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        }
        value={<div className="text-base font-mono font-bold text-slate-900 dark:text-white">{user.id}</div>}
        note={isVi ? 'Mã dùng để định danh tài khoản trong hệ thống' : 'Identifies this account in the system'}
      />

      <InfoTile
        label={isVi ? 'Cấp bậc phân quyền' : 'Authorization Role'}
        value={<div className="text-base font-bold text-slate-900 dark:text-white uppercase">{user.role}</div>}
        note={isVi ? roleLabel.vi : roleLabel.en}
        noteClass="text-sky-600 dark:text-sky-400 font-medium"
      />

      <InfoTile
        label={isVi ? 'Trạng thái phiên' : 'Session Status'}
        value={
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {isVi ? 'Đang đăng nhập' : 'Signed in'}
            </span>
          </div>
        }
        note={isVi ? 'Phiên được xác thực bằng JWT do máy chủ cấp' : 'Session authenticated with a server-issued JWT'}
      />

      <InfoTile
        label={isVi ? 'Chi nhánh trực thuộc' : 'Assigned Outlet'}
        value={<div className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.branchCode || '—'}</div>}
        note={isVi ? 'Điểm giao dịch và kho thiết bị khu vực' : 'Regional retail & inventory hub'}
      />

      <InfoTile
        label={isVi ? 'Ngày tham gia hệ thống' : 'Member Since'}
        value={<div className="text-sm font-bold text-slate-900 dark:text-white">{user.dateOfJoining || '—'}</div>}
        note={isVi ? 'Theo hồ sơ nhân sự' : 'From the staff record'}
      />

      <InfoTile
        label={isVi ? 'Cách đăng nhập' : 'Sign-in Method'}
        value={
          <div className="flex items-center space-x-1.5 text-sm font-bold text-sky-600 dark:text-sky-400">
            {isCustomer ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            <span>
              {isCustomer
                ? isVi
                  ? 'Mã tài khoản + OTP qua email'
                  : 'Account ID + emailed OTP'
                : isVi
                  ? 'Email + mật khẩu'
                  : 'Email + password'}
            </span>
          </div>
        }
        note={
          isCustomer
            ? isVi
              ? 'Mã OTP 6 số, hết hạn sau 5 phút'
              : 'Six-digit code, valid for 5 minutes'
            : isVi
              ? 'Khoá tạm sau 5 lần nhập sai trong 15 phút'
              : 'Locked for a while after 5 failed attempts in 15 minutes'
        }
      />
    </div>
  );
}
