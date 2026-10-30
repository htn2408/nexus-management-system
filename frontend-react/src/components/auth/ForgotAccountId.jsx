// Quên / chưa nhận được mã tài khoản: gửi lại mã về email đã đăng ký.
import { useState } from 'react';
import { toast } from 'sonner';
import { languageStore } from '../../context/LanguageContext';
import { forgotAccountIdApi, ApiError } from '../../lib/api';
import { useStore } from '../../lib/store';
import { isValidEmail } from '../../lib/validation';

export default function ForgotAccountId({ onSent }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const value = email.trim();
    if (!isValidEmail(value)) {
      toast.error(isVi ? 'Email không hợp lệ.' : 'Invalid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await forgotAccountIdApi(value);
      toast.success(res.message);
      onSent();
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.message !== 'network'
          ? err.message
          : isVi
            ? 'Không kết nối được máy chủ.'
            : 'Could not reach the server.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 p-3 rounded-xl bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] space-y-2">
      <p className="text-[11px] text-[#537292] dark:text-slate-400">
        {isVi
          ? 'Nhập email bạn đã dùng khi đăng ký dịch vụ, hệ thống sẽ gửi lại mã tài khoản.'
          : 'Enter the email you registered with and we will resend your Account ID.'}
      </p>
      <div className="flex gap-2">
        <input
          id="forgotEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          onKeyDown={(e) => {
            // Ô này nằm trong form đăng nhập: Enter chỉ gửi lại mã, không gửi form.
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-[#0F1D2B] dark:text-white"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-3 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-60 cursor-pointer"
        >
          {submitting ? (isVi ? 'Đang gửi...' : 'Sending...') : isVi ? 'Gửi lại mã' : 'Resend'}
        </button>
      </div>
    </div>
  );
}
