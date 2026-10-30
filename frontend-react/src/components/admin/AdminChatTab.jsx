// Chat trực tuyến với khách (Admin): danh sách phiên bên trái, hội thoại bên phải.
// Tin mới đến qua Socket.IO; mở một phiên thì đánh dấu đã đọc trên server.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Headset, Send } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { fetchChatMessagesApi, markChatSessionReadApi, replyChatSessionApi } from '../../lib/api';
import { RealtimeEvents, onRealtime } from '../../lib/realtime';
import { useStore } from '../../lib/store';

export default function AdminChatTab({ sessions, initialSessionId, onRead }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const user = useStore(authStore.currentUser);
  const [activeId, setActiveId] = useState(initialSessionId || null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const threadRef = useRef(null);

  const scrollDown = () =>
    requestAnimationFrame(() =>
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }),
    );

  // Tải tin nhắn khi đổi phiên, đánh dấu đã đọc, và nhận tin mới của phiên đó qua real-time.
  useEffect(() => {
    if (!activeId) return undefined;
    let cancelled = false;
    fetchChatMessagesApi(activeId).then(
      (list) => {
        if (cancelled) return;
        setMessages(list);
        scrollDown();
      },
      (err) => toast.error(err.message),
    );
    markChatSessionReadApi(activeId).then(
      () => onRead(activeId),
      () => {},
    );
    const off = onRealtime(RealtimeEvents.chatMessage, (message) => {
      if (message.sessionId !== activeId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      scrollDown();
      if (message.senderType !== 'admin') markChatSessionReadApi(activeId).catch(() => {});
    });
    return () => {
      cancelled = true;
      off();
    };
    // onRead là hàm của trang cha, không cần chạy lại khi nó đổi tham chiếu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;
    setIsSending(true);
    try {
      const sent = await replyChatSessionApi(activeId, user?.name ? `${user.name} (Admin)` : 'Nexus Admin', text);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setDraft('');
      scrollDown();
    } catch (err) {
      toast.error(isVi ? 'Chưa gửi được tin nhắn' : 'Message not sent', { description: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = sessions.filter(
    (s) => !q || s.customerName?.toLowerCase().includes(q) || s.lastMessage?.toLowerCase().includes(q),
  );
  const active = sessions.find((s) => s.sessionId === activeId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isVi ? 'Tìm khách hoặc nội dung...' : 'Search customer or message...'}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {visible.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-500">
              {isVi ? 'Chưa có phiên chat nào.' : 'No chat sessions.'}
            </p>
          ) : (
            visible.map((s) => (
              <button
                key={s.sessionId}
                type="button"
                onClick={() => setActiveId(s.sessionId)}
                className={`w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 ${s.sessionId === activeId ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white truncate">{s.customerName}</span>
                  {s.unreadCount > 0 && (
                    <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {s.unreadCount}
                    </span>
                  )}
                </div>
                <div className="text-slate-500 truncate">
                  {s.lastSenderType === 'admin' && (isVi ? 'Bạn: ' : 'You: ')}
                  {s.lastMessage}
                </div>
                <div className="text-[10px] text-slate-400">{s.lastMessageAtDisplay}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
            <Headset className="h-10 w-10" />
            {isVi ? 'Chọn một phiên chat để trả lời khách.' : 'Pick a session to reply.'}
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-900 dark:text-white">{active.customerName}</div>
              <div className="text-[10px] font-mono text-slate-500">{active.sessionId}</div>
            </div>
            <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
              {messages.map((m) => {
                const mine = m.senderType === 'admin';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs ${mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm'}`}
                    >
                      <div className="whitespace-pre-line">{m.message}</div>
                      <div className={`text-[10px] mt-0.5 ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {m.senderName} · {m.createdAtDisplay}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <textarea
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) send(e);
                }}
                placeholder={
                  isVi
                    ? 'Nhập trả lời (Enter để gửi, Shift+Enter xuống dòng)'
                    : 'Type a reply (Enter to send, Shift+Enter for a new line)'
                }
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              ></textarea>
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="inline-flex items-center gap-1 px-4 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                {isVi ? 'Gửi' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
