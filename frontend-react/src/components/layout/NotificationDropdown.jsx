// Chuông thông báo trên thanh header.
// Dữ liệu lấy từ notificationStore: lịch sử tải một lần bằng REST, còn tin mới do backend đẩy
// xuống qua Socket.IO nên xuất hiện ngay (kèm toast) mà không cần polling.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowRight, Bell, CheckCheck, ChevronRight, HardDrive, Headset, MessageSquare,
  Package, Receipt, RefreshCw, Sparkles, Wifi, WifiOff,
} from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { notificationStore } from '../../context/NotificationContext';
import { navigateTo } from '../../lib/router';
import { useStore } from '../../lib/store';

// Biểu tượng và màu theo loại thông báo; loại khác dùng mục 'default'.
const TYPE_STYLES = {
  order: { icon: Sparkles, tone: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400' },
  billing: { icon: Receipt, tone: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' },
  alert: { icon: AlertTriangle, tone: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' },
  // Vật tư thiếu cần bổ sung
  stock: { icon: Package, tone: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' },
  // Tin nhắn chat trực tuyến từ khách
  chat: { icon: Headset, tone: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' },
  // Phản hồi khách hàng chờ trả lời
  feedback: { icon: MessageSquare, tone: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' },
  hardware: { icon: HardDrive, tone: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' },
  default: { icon: RefreshCw, tone: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' },
};

function relativeTime(iso, isVi, reference) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const minutes = Math.floor(Math.max(0, reference - then) / 60000);
  if (minutes < 1) return isVi ? 'Vừa xong' : 'Just now';
  if (minutes < 60) return isVi ? `${minutes} phút trước` : `${minutes} mins ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isVi ? `${hours} giờ trước` : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return isVi ? `${days} ngày trước` : `${days} days ago`;

  return new Date(iso).toLocaleDateString(isVi ? 'vi-VN' : 'en-US');
}

// Trạng thái kênh real-time: cho biết thông báo đang chảy về hay đã mất kết nối.
function ConnectionStatus({ status, isVi }) {
  if (status === 'connected') {
    return (
      <>
        <Wifi className="h-3 w-3 text-emerald-500" />
        <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
          {isVi ? 'Đang nhận thông báo trực tiếp' : 'Live updates on'}
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      </>
    );
  }
  if (status === 'connecting') {
    return (
      <>
        <RefreshCw className="h-3 w-3 text-amber-500 animate-spin" />
        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
          {isVi ? 'Đang kết nối máy chủ thông báo…' : 'Connecting to notification server…'}
        </span>
      </>
    );
  }
  return (
    <>
      <WifiOff className="h-3 w-3 text-slate-400" />
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        {isVi ? 'Mất kết nối trực tiếp — sẽ tự nối lại' : 'Live updates offline — retrying'}
      </span>
    </>
  );
}

function NotificationItem({ item, isVi, now, onSelect }) {
  const { icon: Icon, tone } = TYPE_STYLES[item.type] ?? TYPE_STYLES.default;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full text-left p-3.5 hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition flex items-start space-x-3 group relative cursor-pointer ${
        !item.read ? 'bg-sky-50/20 dark:bg-sky-950/10' : ''
      }`}
    >
      <div className="shrink-0 mt-0.5">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shadow-xs ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
            {isVi ? item.titleVi : item.titleEn}
          </h4>
          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
            {relativeTime(item.createdAt, isVi, now)}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
          {isVi ? item.descVi : item.descEn}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="inline-flex items-center text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/60">
            {isVi ? item.sectionVi : item.sectionEn}
          </span>
          <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 flex items-center group-hover:translate-x-0.5 transition-transform">
            <span>{isVi ? 'Xem mục này' : 'View section'}</span>
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </span>
        </div>
      </div>

      {!item.read && (
        <span className="absolute right-3 top-4 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-sky-200 dark:ring-sky-900"></span>
      )}
    </button>
  );
}

const tabClass = (active) =>
  `pb-2 border-b-2 transition cursor-pointer ${
    active
      ? 'border-sky-600 text-sky-600 dark:text-sky-400'
      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
  }`;

export default function NotificationDropdown() {
  const isVi = useStore(languageStore.language) === 'vi';
  const user = useStore(authStore.currentUser);
  const notifications = useStore(notificationStore.notifications);
  const unreadCount = useStore(notificationStore.unreadCount);
  const status = useStore(notificationStore.status);
  const isLoading = useStore(notificationStore.isLoading);

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  // Nhãn thời gian ("5 phút trước") tự trôi: nhích đồng hồ mỗi 30 giây để tính lại.
  const [now, setNow] = useState(() => Date.now());
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    // Bấm ra ngoài hoặc nhấn Esc thì đóng.
    const onClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setIsOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearInterval(timer);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const shown = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const toggle = () => {
    // Mở ra thì tính lại "x phút trước" theo giờ hiện tại.
    if (!isOpen) setNow(Date.now());
    setIsOpen(!isOpen);
  };

  const markAllAsRead = async () => {
    await notificationStore.markAllRead();
    toast.success(isVi ? 'Đã đánh dấu tất cả thông báo là đã đọc' : 'Marked all notifications as read');
  };

  const openItem = (item) => {
    // Đánh dấu đã đọc (đồng bộ luôn sang các tab khác qua Socket.IO) rồi đóng dropdown.
    notificationStore.markRead(item.id);
    setIsOpen(false);

    // Mỗi vai trò chỉ được vào dashboard của mình: gặp thông báo của vai trò khác thì chỉ đánh dấu đã đọc.
    if (item.targetRole && user?.role !== item.targetRole) {
      toast.info(
        isVi ? `Mục này thuộc vai trò khác (${item.sectionVi}).` : `This item belongs to another role (${item.sectionEn}).`,
      );
      return;
    }

    // Thông báo chat mở thẳng phiên chat tương ứng.
    if (item.type === 'chat' && item.entityId) {
      navigateTo(item.targetPath, item.targetTab, { session: item.entityId });
    } else {
      navigateTo(item.targetPath, item.targetTab);
    }
    toast.success(isVi ? `Đã chuyển tới: ${item.sectionVi}` : `Navigated to: ${item.sectionEn}`);
  };

  const reload = async () => {
    await notificationStore.refresh();
    toast.info(isVi ? 'Đã tải lại danh sách thông báo' : 'Notification list reloaded');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="h-9 w-9 rounded-full bg-[#EDF6FF] dark:bg-[#1E3349] hover:bg-[#DCEEFE] dark:hover:bg-[#253E58] text-[#1B2D40] dark:text-[#E0F1FF] border border-[#CCE4F7] dark:border-[#253D56] flex items-center justify-center transition shadow-xs relative cursor-pointer"
        title={isVi ? `Thông báo (${unreadCount} chưa đọc)` : `Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#1E3349] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="dropdown-popover absolute right-0 top-11 mt-1 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-md">
          <div className="px-4 py-3.5 border-b border-[#CCE4F7] dark:border-[#253D56] bg-slate-50/70 dark:bg-[#1B2D40]/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-[#0F1D2B] dark:text-white">
                {isVi ? 'Thông báo hệ thống' : 'System Notifications'}
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {unreadCount} {isVi ? 'mới' : 'new'}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center space-x-1 transition active:scale-95 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{isVi ? 'Đã đọc tất cả' : 'Mark all read'}</span>
              </button>
            )}
          </div>

          <div className="px-4 py-1.5 border-b border-[#CCE4F7] dark:border-[#253D56] bg-white dark:bg-[#152434] flex items-center gap-1.5">
            <ConnectionStatus status={status} isVi={isVi} />
          </div>

          <div className="flex border-b border-[#CCE4F7] dark:border-[#253D56] bg-white dark:bg-[#152434] text-xs font-semibold px-4 pt-2">
            <button type="button" onClick={() => setFilter('all')} className={`mr-4 ${tabClass(filter === 'all')}`}>
              {isVi ? 'Tất cả' : 'All'} ({notifications.length})
            </button>
            <button type="button" onClick={() => setFilter('unread')} className={tabClass(filter === 'unread')}>
              {isVi ? 'Chưa đọc' : 'Unread'} ({unreadCount})
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 notification-scroll">
            {isLoading && notifications.length === 0 ? (
              <div className="py-10 text-center px-4 space-y-2">
                <RefreshCw className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600 animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isVi ? 'Đang tải thông báo…' : 'Loading notifications…'}
                </p>
              </div>
            ) : shown.length === 0 ? (
              <div className="py-10 text-center px-4 space-y-2">
                <Bell className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isVi
                    ? 'Chưa có thông báo nào. Tin mới sẽ hiện ở đây ngay khi phát sinh.'
                    : 'No notifications yet. New ones appear here the moment they happen.'}
                </p>
              </div>
            ) : (
              shown.map((item) => <NotificationItem key={item.id} item={item} isVi={isVi} now={now} onSelect={openItem} />)
            )}
          </div>

          <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#1B2D40]/70 border-t border-[#CCE4F7] dark:border-[#253D56] text-center">
            <button
              type="button"
              onClick={reload}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 inline-flex items-center space-x-1.5 transition cursor-pointer"
            >
              <span>{isVi ? 'Tải lại thông báo' : 'Reload notifications'}</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
