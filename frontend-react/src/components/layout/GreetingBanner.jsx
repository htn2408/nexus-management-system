// Dòng chào đầu dashboard ("Chào buổi sáng, Sarah") kèm ngày giờ chạy từng giây.
// Đồng hồ nằm riêng trong component này để mỗi giây chỉ vẽ lại dòng giờ,
// không vẽ lại cả dashboard.
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function formatDateTime(date, isVi) {
  const locale = isVi ? 'vi-VN' : 'en-US';
  const day = date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return `${day}${isVi ? ' lúc ' : ' at '}${time}`;
}

export default function GreetingBanner({ children }) {
  const now = useNow();
  const user = useStore(authStore.currentUser);
  const t = useStore(languageStore.t);
  const isVi = useStore(languageStore.language) === 'vi';

  const hour = now.getHours();
  const greeting = hour < 12 ? t.greetings.morning : hour < 18 ? t.greetings.afternoon : t.greetings.evening;

  return (
    <div className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#0F1D2B] dark:text-white tracking-tight flex items-center gap-2">
          <span>
            {greeting}, {user?.name ? user.name.split(' ')[0] : 'Admin'}
          </span>
          <span className="text-xl">👋</span>
        </h2>
        <div className="flex items-center space-x-1.5 text-xs text-[#537292] dark:text-[#8DB0D4] mt-1.5 font-medium">
          <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>{formatDateTime(now, isVi)}</span>
        </div>
      </div>
      {/* Nút hành động của trang (xuất báo cáo, tạo mới...) */}
      {children}
    </div>
  );
}
