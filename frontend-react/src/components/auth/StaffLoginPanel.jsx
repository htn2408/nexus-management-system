// Nhân viên đăng nhập bằng email + mật khẩu; backend trả về JWT theo đúng role.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { dashboardPathForRole } from '../../lib/router';
import { useStore } from '../../lib/store';
import { isValidEmail } from '../../lib/validation';
import ErrorAlert from '../common/ErrorAlert';

const inputClass =
  'w-full pl-10 pr-4 py-2.5 text-sm bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 text-[#0F1D2B] dark:text-white placeholder-[#7899B8] dark:placeholder-slate-500 transition';

const labelClass = 'block text-xs font-semibold text-[#305070] dark:text-slate-300 uppercase tracking-wider mb-1.5';

export default function StaffLoginPanel() {
  const navigate = useNavigate();
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  const [email, setEmail] = useState('');
  // Mật khẩu chung của các tài khoản mẫu, điền sẵn cho tiện demo.
  const [password, setPassword] = useState('1234567890');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError(t.auth.staffEmailRequired);
      return;
    }
    if (!isValidEmail(email)) {
      setError(isVi ? 'Email phải có dạng ten@mien.com.' : 'Email must have the form name@domain.com.');
      return;
    }
    if (!password) {
      setError(t.auth.staffPasswordRequired);
      return;
    }

    setSubmitting(true);
    const result = await authStore.loginWithCredentials(email, password);
    setSubmitting(false);

    if (result.success) {
      toast.success(`${t.auth.loginSuccess} ${result.user.name}`);
      navigate(dashboardPathForRole(result.user.role));
    } else {
      setError(result.error);
      toast.error(t.auth.loginFailed);
    }
  };

  return (
    <div id="login-panel-staff" role="tabpanel" aria-labelledby="login-tab-staff" className="p-6 sm:p-8">
      {/* Panel header */}
      <div className="flex items-center space-x-3 pb-5 border-b border-[#CCE4F7] dark:border-[#253D56]/80">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h2 className="text-base font-extrabold text-[#0F1D2B] dark:text-white truncate">
              {t.auth.staffPortalTitle}
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {t.auth.staffPortalBadge}
            </span>
          </div>
          <p className="text-xs text-[#537292] dark:text-slate-400 mt-0.5">{t.auth.staffPortalSubtitle}</p>
        </div>
      </div>

      <ErrorAlert message={error} />

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="staffEmail" className={labelClass}>
            {t.auth.staffEmailLabel}
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#7899B8] dark:text-slate-500" />
            <input
              id="staffEmail"
              type="email"
              autoComplete="username"
              required
              pattern=".*@.*"
              title={isVi ? 'Email phải chứa ký tự @' : 'Email must contain @ symbol'}
              placeholder={t.auth.staffEmailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="staffPassword" className={labelClass}>
            {t.auth.staffPasswordLabel}
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-[#7899B8] dark:text-slate-500" />
            <input
              id="staffPassword"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                <span>{t.auth.staffLoginButton}</span>
              </>
            ) : (
              <>
                <span>{t.auth.staffLoginButton}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security & Audit Note Footer */}
      <div className="mt-6 pt-4 border-t border-[#CCE4F7] dark:border-[#253D56]/80 flex items-center justify-between text-[11px] text-[#537292] dark:text-slate-400">
        <div className="flex items-center space-x-1.5">
          <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{t.auth.staffSecurityNotice}</span>
        </div>
        <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0 ml-2">
          v2.4 Enterprise
        </span>
      </div>
    </div>
  );
}
