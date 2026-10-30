// Nút tài khoản ở góc phải header: mở menu Hồ sơ / Cài đặt / Đăng xuất.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

function Avatar({ user, className }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-tr from-sky-600 to-blue-600 text-white overflow-hidden shrink-0 ${className}`}>
      {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : user.name.charAt(0)}
    </div>
  );
}

export default function UserMenu({ activeTab, onTabChange }) {
  const navigate = useNavigate();
  const user = useStore(authStore.currentUser);
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Bấm ra ngoài hoặc nhấn Esc thì đóng menu.
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;
  const roleLabel = (user.role && t.roles[user.role]) || user.title;

  const openTab = (tab) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  const logout = () => {
    setIsOpen(false);
    authStore.logout();
    toast.info(isVi ? 'Đã đăng xuất khỏi phiên làm việc.' : 'Signed out successfully.');
    navigate('/login');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center p-1 pl-1.5 pr-2.5 bg-[#EDF6FF]/90 dark:bg-[#1E3349]/90 border rounded-full shadow-xs space-x-2 hover:bg-[#DCEEFE] dark:hover:bg-[#253E58] transition cursor-pointer group ${
          isOpen || activeTab === 'profile'
            ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-sm'
            : 'border-[#CCE4F7] dark:border-[#253D56]'
        }`}
        title={isVi ? 'Cài đặt Profile & Tài khoản (Nhấn để mở)' : 'Profile & Account Settings (Click to open)'}
      >
        <Avatar
          user={user}
          className="h-7 w-7 rounded-full font-bold text-xs shadow-inner ring-1 ring-white/50 group-hover:scale-105 transition-transform"
        />
        <div className="text-left hidden md:block pr-0.5">
          <div className="text-xs font-bold text-[#0F1D2B] dark:text-white leading-none">{user.name}</div>
          <div className="text-[10px] text-[#537292] dark:text-[#8DB0D4] leading-none mt-0.5">{roleLabel}</div>
        </div>
        <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition">
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-4 bg-gradient-to-br from-sky-50/70 to-slate-50 dark:from-sky-950/40 dark:to-slate-900/80 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <Avatar user={user} className="h-11 w-11 rounded-xl font-black text-base shadow-md" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{user.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 uppercase tracking-wider">
                    {(user.role && t.roles[user.role]) || user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <button
              type="button"
              onClick={() => openTab('profile')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-700 dark:hover:text-sky-300 transition text-left cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold">{isVi ? 'Cài đặt Profile' : 'Profile Settings'}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {isVi ? 'Thông tin cá nhân, tài khoản, mật khẩu' : 'Personal info, account, password'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                {isVi ? 'Mở' : 'Open'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openTab('settings')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold">{isVi ? 'Cài đặt hệ thống' : 'System Settings'}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {isVi ? 'Giao diện, ngôn ngữ, thông báo, chi nhánh' : 'Theme, language, alerts, branch'}
                  </div>
                </div>
              </div>
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <LogOut className="h-4 w-4" />
              </div>
              <div>
                <div>{isVi ? 'Đăng xuất tài khoản' : 'Sign Out'}</div>
                <div className="text-[10px] text-rose-400 font-normal">
                  {isVi ? 'Kết thúc phiên làm việc an toàn' : 'End current authenticated session'}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
