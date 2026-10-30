// Trang đăng nhập có 2 tab: khách hàng (mã tài khoản + OTP) và nhân viên (email + mật khẩu).
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Layers, ShieldCheck, ArrowLeft, User } from 'lucide-react';
import { authStore } from '../context/AuthContext';
import { languageStore } from '../context/LanguageContext';
import { dashboardPathForRole } from '../lib/router';
import { useStore } from '../lib/store';
import LanguageToggle from '../components/layout/LanguageToggle';
import ThemeToggle from '../components/layout/ThemeToggle';
import CustomerLoginPanel from '../components/auth/CustomerLoginPanel';
import StaffLoginPanel from '../components/auth/StaffLoginPanel';

const TABS = [
  {
    id: 'user',
    icon: User,
    labelKey: 'tabUser',
    activeClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30',
  },
  {
    id: 'staff',
    icon: ShieldCheck,
    labelKey: 'tabStaff',
    activeClass: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const user = useStore(authStore.currentUser);
  const t = useStore(languageStore.t);
  const [activeTab, setActiveTab] = useState('user');

  // Đã đăng nhập thì chuyển thẳng về dashboard của mình.
  if (user) return <Navigate to={dashboardPathForRole(user.role)} replace />;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#E0F1FF] dark:bg-[#1B2D40] text-[#1B2D40] dark:text-[#E0F1FF] flex flex-col justify-start py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative transition-colors duration-300">
      {/* Top left Back to Home Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-10 px-3.5 rounded-full bg-white/85 dark:bg-[#152434]/85 hover:bg-white dark:hover:bg-[#1E3349] text-[#1B2D40] dark:text-[#E0F1FF] border border-[#CCE4F7] dark:border-[#253D56] flex items-center space-x-1.5 transition shadow-md hover:scale-105 active:scale-95 text-xs font-semibold backdrop-blur-md cursor-pointer"
          title={t.common.home}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t.common.home}</span>
        </button>
      </div>

      {/* Top right Controls: Language Toggle & Theme Toggle */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-200/40 via-[#E0F1FF] to-[#E0F1FF] dark:from-blue-900/20 dark:via-[#1B2D40] dark:to-[#1B2D40]"></div>
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#0284c70d_1px,transparent_1px),linear-gradient(to_bottom,#0284c70d_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>

      <div className="relative mx-auto w-full max-w-2xl px-2 sm:px-4 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/25 mb-1">
            <Layers className="h-8 w-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F1D2B] dark:text-white">
            NEXUS SYSTEM
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-sky-600 dark:text-blue-400">
            {t.auth.loginSubtitle}
          </p>
        </div>

        {/* Single Login Card with 2 Tabs: User | Staff */}
        <div className="bg-white/95 dark:bg-[#152434]/95 border border-[#CCE4F7] dark:border-[#253D56] rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all duration-300 relative overflow-hidden">
          <div
            className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#EDF6FF] dark:bg-[#101C29] border-b border-[#CCE4F7] dark:border-[#253D56]"
            role="tablist"
            aria-label="Login portal selector"
          >
            {TABS.map(({ id, icon: Icon, labelKey, activeClass }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`login-tab-${id}`}
                aria-selected={activeTab === id}
                aria-controls={`login-panel-${id}`}
                onClick={() => setActiveTab(id)}
                className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  activeTab === id
                    ? activeClass
                    : 'text-[#537292] dark:text-slate-400 hover:text-[#0F1D2B] dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#1E3349]/70'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{t.auth[labelKey]}</span>
              </button>
            ))}
          </div>

          {activeTab === 'user' ? <CustomerLoginPanel /> : <StaffLoginPanel />}
        </div>
      </div>
    </div>
  );
}
