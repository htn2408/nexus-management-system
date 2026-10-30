// Trang hồ sơ dùng chung cho mọi vai trò: ảnh đại diện, thông tin cá nhân, thông tin tài khoản,
// đổi mật khẩu và phiên đăng nhập.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Camera, KeyRound, LogOut, ShieldCheck, Sparkles, User } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import AccountInfoGrid from '../profile/AccountInfoGrid';
import CollapsibleCard from '../profile/CollapsibleCard';
import PasswordForm from '../profile/PasswordForm';
import PersonalInfoForm from '../profile/PersonalInfoForm';
import SessionCard from '../profile/SessionCard';
import { AVATAR_PRESETS, MAX_AVATAR_BYTES } from '../profile/avatar';

export default function ProfileView() {
  const navigate = useNavigate();
  const user = useStore(authStore.currentUser);
  const isVi = useStore(languageStore.language) === 'vi';
  const [preset, setPreset] = useState(AVATAR_PRESETS[0].gradient);

  if (!user) return null;
  const avatarUrl = user.avatar || '';

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(isVi ? 'Vui lòng chọn file hình ảnh hợp lệ.' : 'Please select a valid image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(isVi ? 'Dung lượng ảnh tối đa 2MB.' : 'Image size cannot exceed 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      authStore.updateUserProfile({ avatar: reader.result });
      toast.success(isVi ? 'Đã đổi ảnh đại diện thành công!' : 'Avatar photo updated!');
    };
    reader.readAsDataURL(file);
  };

  // Chọn màu nền thì bỏ ảnh đã tải lên.
  const pickPreset = (gradient) => {
    setPreset(gradient);
    authStore.updateUserProfile({ avatar: undefined });
  };

  const logout = () => {
    authStore.logout();
    toast.info(isVi ? 'Đã đăng xuất khỏi tài khoản.' : 'Signed out successfully.');
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Banner hồ sơ */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="h-32 sm:h-36 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30"></div>
          <div className="absolute right-6 -bottom-10 opacity-15 pointer-events-none">
            <Sparkles className="h-44 w-44 text-white" />
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
            <div className="flex items-end space-x-4">
              <div className="relative group">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <div
                      className={`h-full w-full rounded-xl bg-gradient-to-tr ${preset} flex items-center justify-center text-white font-black text-3xl sm:text-4xl shadow-inner`}
                    >
                      {user.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>

                <label
                  className="absolute bottom-2 right-2 h-7 w-7 rounded-lg bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center shadow-lg cursor-pointer transition active:scale-95 group-hover:scale-110"
                  title={isVi ? 'Tải ảnh đại diện mới' : 'Upload new avatar photo'}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                </label>

                <div
                  className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-sm animate-pulse"
                  title="Online"
                ></div>
              </div>

              <div className="pt-2 sm:pt-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {user.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                  <span>{user.title || (isVi ? 'Chưa có chức danh' : 'No title')}</span>
                  {user.department && (
                    <>
                      <span>•</span>
                      <span className="text-sky-600 dark:text-sky-400 font-semibold">{user.department}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 shrink-0 self-start sm:self-end">
              <button
                type="button"
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 shadow-xs transition active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{isVi ? 'Đăng xuất tài khoản' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CollapsibleCard
        icon={User}
        iconTone="bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400"
        title={isVi ? 'Thông tin cá nhân' : 'Personal Information'}
        subtitle={
          isVi
            ? 'Cập nhật họ tên, số điện thoại, email làm việc và địa chỉ liên lạc'
            : 'Update your personal identity, contact details, and residential address'
        }
        badge={
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">{user.email}</span>
        }
      >
        {/* key: đổi người dùng thì form nạp lại từ đầu */}
        <PersonalInfoForm key={user.id} user={user} avatarUrl={avatarUrl} preset={preset} onPickPreset={pickPreset} />
      </CollapsibleCard>

      <CollapsibleCard
        icon={ShieldCheck}
        iconTone="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
        title={isVi ? 'Thông tin tài khoản & Hệ thống' : 'Account & System Credentials'}
        subtitle={
          isVi
            ? 'Mã định danh tài khoản, quyền hạn truy cập, chi nhánh quản lý và trạng thái'
            : 'Account identifier, access level, assigned branch, and authorization status'
        }
        badge={
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
            {user.id}
          </span>
        }
      >
        <AccountInfoGrid user={user} />
      </CollapsibleCard>

      <CollapsibleCard
        icon={KeyRound}
        iconTone="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
        title={isVi ? 'Đổi mật khẩu & Bảo mật' : 'Password & Security Settings'}
        subtitle={
          isVi
            ? 'Cập nhật mật khẩu định kỳ để bảo vệ tài khoản và dữ liệu khách hàng'
            : 'Update your password regularly to protect your account and subscriber data'
        }
      >
        <PasswordForm />
      </CollapsibleCard>

      <CollapsibleCard
        danger
        icon={LogOut}
        iconTone="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
        title={isVi ? 'Phiên đăng nhập & Đăng xuất' : 'Session & Sign Out'}
        subtitle={isVi ? 'Phiên làm việc trên trình duyệt này' : 'Your session in this browser'}
        badge={
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/60">
            {isVi ? 'Phiên hoạt động' : 'Active Session'}
          </span>
        }
      >
        <SessionCard onLogout={logout} />
      </CollapsibleCard>
    </div>
  );
}
