// Phiên đăng nhập hiện tại: trình duyệt / hệ điều hành của máy này và nút đăng xuất.
import { Laptop, LogOut, Smartphone } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

// Đoán trình duyệt và hệ điều hành từ user agent (chỉ để hiển thị).
function describeDevice(userAgent) {
  const os = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/i.test(userAgent)
        ? 'iOS'
        : /Mac OS X/i.test(userAgent)
          ? 'macOS'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : 'Unknown OS';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Browser';
  return { os, browser, isMobile: /Mobi|Android|iPhone|iPad/i.test(userAgent) };
}

export default function SessionCard({ onLogout }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const { os, browser, isMobile } = describeDevice(navigator.userAgent);
  const DeviceIcon = isMobile ? Smartphone : Laptop;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 gap-4">
      <div className="flex items-center space-x-3.5">
        <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
          <DeviceIcon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {os} • {browser}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
              {isVi ? 'Thiết bị này (Hiện tại)' : 'This Device (Current)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isVi
              ? 'Đăng xuất sẽ xoá phiên trên trình duyệt này.'
              : 'Signing out removes the session from this browser.'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition active:scale-95"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>{isVi ? 'Đăng xuất ngay' : 'Sign Out Now'}</span>
      </button>
    </div>
  );
}
