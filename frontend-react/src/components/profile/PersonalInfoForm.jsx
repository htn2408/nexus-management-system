// Form thông tin cá nhân: họ tên, email, điện thoại, chức danh, phòng ban, địa chỉ, giới tính, ngày sinh, tiểu sử.
import { useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, Building2, Calendar, CheckCircle2, Mail, MapPin, Phone, User } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import { isValidEmail, isValidPhone } from '../../lib/validation';
import { AVATAR_PRESETS } from './avatar';

const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5';
const inputClass =
  'w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition';

function IconField({ icon: Icon, label, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <Icon className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
        {children}
      </div>
    </div>
  );
}

// user: người đang đăng nhập; avatar / preset do ProfileView giữ vì banner phía trên cũng hiển thị.
export default function PersonalInfoForm({ user, avatarUrl, preset, onPickPreset }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [form, setForm] = useState(() => ({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    title: user.title || '',
    department: user.department || '',
    address: user.address || '',
    gender: user.gender || 'male',
    dateOfBirth: user.dateOfBirth || '',
    bio: user.bio || '',
  }));
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(isVi ? 'Họ và tên không được để trống.' : 'Full name cannot be empty.');
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error(isVi ? 'Email phải có dạng ten@mien.com.' : 'Email must have the form name@domain.com.');
      return;
    }
    if (form.phone.trim() && !isValidPhone(form.phone)) {
      toast.error(isVi ? 'Số điện thoại phải gồm đúng 10 chữ số.' : 'Phone number must contain exactly 10 digits.');
      return;
    }

    const result = await authStore.updateUserProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      title: form.title.trim(),
      department: form.department.trim(),
      address: form.address.trim(),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      bio: form.bio.trim(),
      avatar: avatarUrl || undefined,
    });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isVi ? 'Đã cập nhật thông tin cá nhân thành công!' : 'Personal information updated successfully!');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
          {isVi ? 'Tùy chọn màu sắc Ảnh đại diện:' : 'Avatar Color Theme Preset:'}
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {AVATAR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPickPreset(p.gradient)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition ${
                preset === p.gradient && !avatarUrl
                  ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/60 ring-2 ring-sky-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className={`h-4 w-4 rounded-full bg-gradient-to-tr ${p.gradient}`}></div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <IconField icon={User} label={isVi ? 'Họ và tên *' : 'Full Name *'}>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            required
            className={`pl-10 pr-3.5 ${inputClass}`}
            placeholder={isVi ? 'Nhập họ và tên đầy đủ' : 'Enter full name'}
          />
        </IconField>

        <IconField icon={Mail} label={isVi ? 'Địa chỉ Email làm việc *' : 'Work Email Address *'}>
          <input
            type="email"
            pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
            title={isVi ? 'Email phải có dạng ten@mien.com' : 'Email must have the form name@domain.com'}
            value={form.email}
            onChange={set('email')}
            required
            className={`pl-10 pr-3.5 ${inputClass}`}
            placeholder="email@nexus.telecom"
          />
        </IconField>

        <IconField icon={Phone} label={isVi ? 'Số điện thoại di động' : 'Phone Number'}>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            title={isVi ? 'Số điện thoại phải gồm đúng 10 chữ số' : 'Phone number must contain exactly 10 digits'}
            value={form.phone}
            onChange={set('phone')}
            className={`pl-10 pr-3.5 ${inputClass}`}
            placeholder="0912345678"
          />
        </IconField>

        <IconField icon={Briefcase} label={isVi ? 'Chức danh / Vị trí công tác' : 'Job Title / Position'}>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            className={`pl-10 pr-3.5 ${inputClass}`}
            placeholder={isVi ? 'Ví dụ: Quản trị viên, Kỹ sư mạng' : 'e.g. System Administrator'}
          />
        </IconField>

        <IconField icon={Building2} label={isVi ? 'Phòng ban / Đơn vị' : 'Department'}>
          <input
            type="text"
            value={form.department}
            onChange={set('department')}
            className={`pl-10 pr-3.5 ${inputClass}`}
            placeholder="Executive Administration"
          />
        </IconField>

        <IconField icon={MapPin} label={isVi ? 'Địa chỉ liên lạc' : 'Address'}>
          <input
            type="text"
            value={form.address}
            onChange={set('address')}
            className={`pl-10 pr-3.5 ${inputClass}`}
            placeholder={isVi ? 'Địa chỉ cơ quan hoặc nhà riêng' : 'Work or residential address'}
          />
        </IconField>

        <div>
          <label className={labelClass}>{isVi ? 'Giới tính' : 'Gender'}</label>
          <select value={form.gender} onChange={set('gender')} className={`px-3.5 ${inputClass}`}>
            <option value="male">{isVi ? 'Nam' : 'Male'}</option>
            <option value="female">{isVi ? 'Nữ' : 'Female'}</option>
            <option value="other">{isVi ? 'Khác' : 'Other'}</option>
          </select>
        </div>

        <IconField icon={Calendar} label={isVi ? 'Ngày sinh' : 'Date of Birth'}>
          <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className={`pl-10 pr-3.5 ${inputClass}`} />
        </IconField>
      </div>

      <div>
        <label className={labelClass}>{isVi ? 'Tiểu sử & Ghi chú hồ sơ' : 'Bio & Professional Summary'}</label>
        <textarea
          value={form.bio}
          onChange={set('bio')}
          rows={2}
          className={`px-3.5 ${inputClass}`}
          placeholder={
            isVi
              ? 'Mô tả ngắn về nhiệm vụ hoặc kinh nghiệm chuyên môn...'
              : 'Brief summary of responsibilities or achievements...'
          }
        ></textarea>
      </div>

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/20 transition active:scale-95"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{isVi ? 'Lưu thay đổi thông tin' : 'Save Personal Info'}</span>
        </button>
      </div>
    </form>
  );
}
