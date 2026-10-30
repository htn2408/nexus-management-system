// Trang cài đặt dùng chung cho mọi dashboard: giao diện & ngôn ngữ, chi nhánh, tình trạng hệ thống.
import { Building2, Info, Lock, Sparkles } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import CollapsibleCard from '../profile/CollapsibleCard';
import AppearanceSettings from '../settings/AppearanceSettings';
import BranchSettings from '../settings/BranchSettings';
import SystemInfo from '../settings/SystemInfo';

export default function SettingsView({ showBranchSwitcher = true }) {
  const user = useStore(authStore.currentUser);
  const isVi = useStore(languageStore.language) === 'vi';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 w-full pb-10">
      <CollapsibleCard
        defaultOpen={false}
        icon={Sparkles}
        iconTone="bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400"
        title={isVi ? 'Cài đặt giao diện & Ngôn ngữ' : 'Interface & Language Settings'}
        subtitle={
          isVi
            ? 'Tùy chỉnh chế độ hiển thị sáng/tối và ngôn ngữ hệ thống'
            : 'Customize system display theme and interface language'
        }
      >
        <AppearanceSettings />
      </CollapsibleCard>

      {/* Khách hàng không có chi nhánh làm việc */}
      {showBranchSwitcher && user?.role !== 'user' && (
        <CollapsibleCard
          defaultOpen={false}
          icon={Building2}
          iconTone={
            isAdmin
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }
          title={
            isAdmin
              ? isVi
                ? 'Chi nhánh trên hồ sơ'
                : 'Branch on Your Profile'
              : isVi
                ? 'Chi nhánh làm việc (Cố định theo tài khoản)'
                : 'Current Working Branch (Fixed to Account)'
          }
          subtitle={
            isAdmin
              ? isVi
                ? 'Chọn chi nhánh hiển thị trên hồ sơ của bạn. Admin vẫn xem được dữ liệu của mọi chi nhánh.'
                : 'Pick the branch shown on your profile. Admins still see data from every branch.'
              : isVi
                ? 'Chi nhánh làm việc được chỉ định cố định. Chỉ Quản trị viên (Admin) mới có quyền chuyển đổi cơ sở.'
                : 'Operational branch is fixed for your account. Only System Administrators can change branches.'
          }
          badge={
            !isAdmin && (
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                <Lock className="h-2.5 w-2.5 mr-1" />
                {isVi ? 'Chỉ Admin được đổi' : 'Admin Only'}
              </span>
            )
          }
        >
          <BranchSettings />
        </CollapsibleCard>
      )}

      <CollapsibleCard
        defaultOpen={false}
        icon={Info}
        iconTone="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
        title={isVi ? 'Phiên bản & Tình trạng hệ thống' : 'Version & System Status'}
        subtitle={
          isVi
            ? 'Kết nối tới máy chủ API và cơ sở dữ liệu, các thay đổi chính'
            : 'API and database connectivity, main changes'
        }
      >
        <SystemInfo />
      </CollapsibleCard>
    </div>
  );
}
