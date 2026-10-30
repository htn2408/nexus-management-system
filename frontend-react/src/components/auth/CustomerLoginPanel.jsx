// Khách hàng đăng nhập 2 bước: nhập mã tài khoản -> nhập mã OTP gửi về email đã đăng ký.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { KeyRound, Mail, ShieldCheck, ArrowLeft, ArrowRight, ShoppingCart, User } from 'lucide-react';
import { authStore, normalizeAccountId } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import ErrorAlert from '../common/ErrorAlert';
import ForgotAccountId from './ForgotAccountId';
import OrderTracker from './OrderTracker';

const formatCountdown = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const inputClass =
  'bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-blue-500 text-[#0F1D2B] dark:text-white transition font-mono';

const submitClass =
  'w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100';

export default function CustomerLoginPanel() {
  const navigate = useNavigate();
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  const [accountId, setAccountId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotId, setShowForgotId] = useState(false);

  const [step, setStep] = useState('account'); // 'account' | 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Số giây mã OTP còn hiệu lực và số giây phải chờ trước khi được xin mã mới.
  const [validSeconds, setValidSeconds] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);

  // Một bộ đếm lùi duy nhất cho cả hai đồng hồ ở trên.
  useEffect(() => {
    if (step !== 'otp') return;
    const timer = setInterval(() => {
      setValidSeconds((s) => Math.max(0, s - 1));
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  /** Bước 1: gửi mã tài khoản, hệ thống gửi OTP về email đã đăng ký của khách. */
  const sendOtp = async (id = accountId) => {
    setErrorMessage('');
    setSubmitting(true);
    try {
      const result = await authStore.requestLoginOtp(id);
      if (!result.success) {
        setErrorMessage(result.error);
        toast.error(result.error);
        return;
      }
      setMaskedEmail(result.maskedEmail);
      setValidSeconds(result.expiresInSeconds);
      setResendSeconds(result.resendAfterSeconds);
      setOtpCode('');
      setStep('otp');
      toast.success(isVi ? `Đã gửi mã OTP tới ${result.maskedEmail}` : `OTP sent to ${result.maskedEmail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    if (!accountId.trim()) {
      setErrorMessage(t.auth.accountIdRequired);
      return;
    }
    await sendOtp();
  };

  /** Bước 2: khách nhập mã OTP 6 chữ số nhận được trong email. */
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (otpCode.trim().length !== 6) {
      setErrorMessage(isVi ? 'Mã OTP gồm đúng 6 chữ số.' : 'The OTP is exactly 6 digits.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await authStore.loginWithOtp(accountId, otpCode);
      if (result.success) {
        toast.success(`${t.auth.loginSuccess} ${result.user.name}`);
        navigate('/user');
      } else {
        setErrorMessage(result.error);
        toast.error(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Quay lại bước nhập mã tài khoản (khách gõ nhầm mã). */
  const backToAccountStep = () => {
    setStep('account');
    setOtpCode('');
    setErrorMessage('');
  };

  // Bấm "Đăng nhập" ở kết quả tra cứu đơn: điền sẵn mã tài khoản rồi gửi OTP luôn.
  return (
    <div id="login-panel-user" role="tabpanel" aria-labelledby="login-tab-user" className="p-6 sm:p-8">
      {/* Panel header */}
      <div className="flex items-center space-x-3 pb-5 border-b border-[#CCE4F7] dark:border-[#253D56]/80">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
          <User className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h2 className="text-base font-extrabold text-[#0F1D2B] dark:text-white truncate">{t.auth.userPortalTitle}</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              {t.auth.userPortalBadge}
            </span>
          </div>
          <p className="text-xs text-[#537292] dark:text-slate-400 mt-0.5">{t.auth.userPortalSubtitle}</p>
        </div>
      </div>

      <ErrorAlert message={errorMessage} />

      {step === 'account' ? (
        <form onSubmit={handleAccountSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="accountId"
              className="block text-xs font-semibold text-[#305070] dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              {t.auth.accountIdLabel}
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-[#7899B8] dark:text-slate-500" />
              <input
                id="accountId"
                type="text"
                autoComplete="off"
                maxLength={17}
                required
                placeholder={t.auth.accountIdPlaceholder}
                value={accountId}
                // Giữ đúng dạng T064-000000000001 trong lúc gõ.
                onChange={(e) => setAccountId(normalizeAccountId(e.target.value))}
                className={`w-full pl-10 pr-4 py-2.5 text-sm placeholder-[#7899B8] dark:placeholder-slate-500 tracking-wider ${inputClass}`}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[#537292] dark:text-slate-400">
              {isVi
                ? 'Mã tài khoản được gửi về email của bạn ngay khi kỹ thuật đấu nối xong đường truyền.'
                : 'Your Account ID is emailed to you as soon as your line is connected.'}
              <button
                type="button"
                onClick={() => setShowForgotId((v) => !v)}
                className="ml-1 font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                {isVi ? 'Quên / chưa nhận được mã?' : 'Forgot your Account ID?'}
              </button>
            </p>

            {showForgotId && <ForgotAccountId onSent={() => setShowForgotId(false)} />}
          </div>

          <div className="pt-1">
            <button type="submit" disabled={submitting} className={submitClass}>
              <Mail className="h-4 w-4" />
              <span>
                {submitting
                  ? isVi
                    ? 'Đang gửi mã...'
                    : 'Sending code...'
                  : isVi
                    ? 'Gửi mã OTP về email'
                    : 'Email me a login code'}
              </span>
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="mt-5 space-y-4">
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-[11px] text-[#305070] dark:text-sky-200 flex items-start space-x-2">
            <Mail className="h-4 w-4 mt-px shrink-0 text-sky-600 dark:text-sky-400" />
            <span>
              {isVi ? 'Mã OTP đã gửi tới' : 'OTP sent to'} <strong className="font-mono">{maskedEmail}</strong>.{' '}
              {validSeconds > 0 ? (
                <>
                  {isVi ? 'Mã hết hạn sau' : 'Expires in'} <strong>{formatCountdown(validSeconds)}</strong>.
                </>
              ) : (
                <strong className="text-rose-600 dark:text-rose-400">
                  {isVi ? 'Mã đã hết hạn, vui lòng gửi lại.' : 'Code expired, please resend.'}
                </strong>
              )}
            </span>
          </div>

          <div>
            <label
              htmlFor="otpCode"
              className="block text-xs font-semibold text-[#305070] dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              {isVi ? 'Mã OTP (6 chữ số)' : 'OTP code (6 digits)'}
            </label>
            <input
              id="otpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              placeholder="000000"
              value={otpCode}
              // Chỉ nhận chữ số để khách không dán nhầm ký tự lạ.
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`w-full px-4 py-3 text-center text-2xl font-black placeholder-[#B9D4EC] dark:placeholder-slate-700 tracking-[0.5em] ${inputClass}`}
            />
          </div>

          <div className="pt-1">
            <button type="submit" disabled={submitting || otpCode.length !== 6} className={submitClass}>
              <ShieldCheck className="h-4 w-4" />
              <span>{submitting ? (isVi ? 'Đang xác thực...' : 'Verifying...') : t.auth.loginButton}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={backToAccountStep}
              className="flex items-center space-x-1 text-[#537292] dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 font-semibold transition cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>{isVi ? 'Đổi mã tài khoản' : 'Change Account ID'}</span>
            </button>

            <button
              type="button"
              onClick={() => sendOtp()}
              disabled={submitting || resendSeconds > 0}
              className="font-bold text-sky-700 dark:text-sky-300 hover:underline disabled:text-slate-400 disabled:dark:text-slate-600 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
            >
              {resendSeconds > 0
                ? isVi
                  ? `Gửi lại sau ${resendSeconds}s`
                  : `Resend in ${resendSeconds}s`
                : isVi
                  ? 'Gửi lại mã'
                  : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      <OrderTracker />

      {/* Purchase flow footer */}
      <div className="mt-6 pt-4 border-t border-[#CCE4F7] dark:border-[#253D56]/80 text-center text-xs text-[#537292] dark:text-slate-400 flex items-center justify-center space-x-1.5">
        <span>{t.auth.noAccount}</span>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center space-x-1 cursor-pointer"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>{t.auth.registerLink}</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
