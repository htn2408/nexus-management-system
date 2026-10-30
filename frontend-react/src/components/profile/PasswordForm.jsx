// Đổi mật khẩu: mật khẩu hiện tại, mật khẩu mới (kèm thanh độ mạnh) và xác nhận.
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5';
const inputClass =
  'w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';

// 0-4 điểm: độ dài >= 6, >= 10, có cả chữ hoa và thường, có số, có ký tự đặc biệt.
function strengthOf(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = [
  null,
  { vi: 'Rất yếu', en: 'Very Weak', color: 'text-rose-500' },
  { vi: 'Yếu', en: 'Weak', color: 'text-amber-500' },
  { vi: 'Trung bình', en: 'Medium', color: 'text-yellow-500' },
  { vi: 'Mạnh', en: 'Strong', color: 'text-emerald-500' },
];
const BAR_COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500'];

function PasswordField({ label, icon: Icon, value, onChange, placeholder, minLength }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <Icon className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          className={inputClass}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function PasswordForm() {
  const isVi = useStore(languageStore.language) === 'vi';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const strength = strengthOf(newPassword);
  const strengthLabel = STRENGTH_LABELS[strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error(isVi ? 'Vui lòng nhập mật khẩu hiện tại.' : 'Please enter current password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error(isVi ? 'Mật khẩu mới phải có ít nhất 6 ký tự.' : 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(isVi ? 'Xác nhận mật khẩu mới không khớp.' : 'New password confirmation does not match.');
      return;
    }

    const result = await authStore.changePassword(currentPassword, newPassword);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success(
      isVi
        ? 'Đã đổi mật khẩu thành công! Mật khẩu mới có hiệu lực ngay lập tức.'
        : 'Password changed successfully! Your new password is now active.',
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <PasswordField
        label={isVi ? 'Mật khẩu hiện tại *' : 'Current Password *'}
        icon={Lock}
        value={currentPassword}
        onChange={setCurrentPassword}
        placeholder={isVi ? 'Nhập mật khẩu đang dùng' : 'Enter current password'}
      />

      <div>
        <PasswordField
          label={isVi ? 'Mật khẩu mới *' : 'New Password *'}
          icon={KeyRound}
          value={newPassword}
          onChange={setNewPassword}
          minLength={6}
          placeholder={isVi ? 'Tối thiểu 6 ký tự' : 'At least 6 characters'}
        />
        {newPassword && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Độ mạnh mật khẩu:' : 'Password strength:'}</span>
              {strengthLabel && (
                <span className={`font-bold ${strengthLabel.color}`}>{isVi ? strengthLabel.vi : strengthLabel.en}</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              {BAR_COLORS.map((color, i) => (
                <div
                  key={color}
                  className={`rounded-full transition-colors duration-300 ${strength >= i + 1 ? color : 'bg-transparent'}`}
                ></div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <PasswordField
          label={isVi ? 'Xác nhận mật khẩu mới *' : 'Confirm New Password *'}
          icon={Lock}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder={isVi ? 'Nhập lại mật khẩu mới' : 'Retype new password'}
        />
        {confirmPassword && newPassword && (
          <div className={`mt-1 text-xs ${confirmPassword === newPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
            {confirmPassword === newPassword
              ? isVi
                ? '✓ Mật khẩu xác nhận trùng khớp'
                : '✓ Passwords match'
              : isVi
                ? '✗ Mật khẩu xác nhận chưa khớp'
                : '✗ Passwords do not match'}
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          {isVi
            ? 'Lưu ý: Mật khẩu nên chứa ít nhất 8 ký tự, kết hợp chữ cái viết hoa, viết thường, chữ số và ký tự đặc biệt để đảm bảo an toàn tối đa cho hệ thống viễn thông.'
            : 'Recommendation: Passwords should be at least 8 characters long, including uppercase letters, numbers, and special symbols to comply with telecom security standards.'}
        </span>
      </div>

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition active:scale-95"
        >
          <KeyRound className="h-4 w-4" />
          <span>{isVi ? 'Cập nhật mật khẩu mới' : 'Update Password'}</span>
        </button>
      </div>
    </form>
  );
}
