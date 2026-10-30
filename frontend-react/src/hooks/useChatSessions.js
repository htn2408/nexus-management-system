// Danh sách phiên chat cho Admin: tải một lần, sau đó server đẩy cập nhật qua Socket.IO.
// Mất kênh real-time thì hỏi lại server mỗi 5 giây (bình thường 60 giây).
import { useEffect, useState } from 'react';
import { fetchChatSessionsApi } from '../lib/api';
import { RealtimeEvents, onRealtime, realtimeStatus } from '../lib/realtime';
import { useStore } from '../lib/store';

export function useChatSessions() {
  const [sessions, setSessions] = useState([]);
  const isLive = useStore(realtimeStatus) === 'connected';

  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      fetchChatSessionsApi().then(
        (list) => !cancelled && setSessions(list),
        () => {
          // Mất kết nối tạm thời; lần làm mới sau sẽ thử lại.
        },
      );
    refresh();
    const off = onRealtime(RealtimeEvents.chatSession, (session) =>
      setSessions((prev) => [session, ...prev.filter((s) => s.sessionId !== session.sessionId)]),
    );
    const timer = setInterval(refresh, isLive ? 60_000 : 5_000);
    return () => {
      cancelled = true;
      off();
      clearInterval(timer);
    };
  }, [isLive]);

  // Đã đọc một phiên (mở xem) thì bỏ huy hiệu ngay, không chờ server đẩy.
  const markReadLocally = (sessionId) =>
    setSessions((prev) => prev.map((s) => (s.sessionId === sessionId ? { ...s, unreadCount: 0 } : s)));

  return { sessions, markReadLocally, unread: sessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0) };
}
