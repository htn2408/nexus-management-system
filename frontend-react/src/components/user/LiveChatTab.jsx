// Chat trực tiếp với Admin trong cổng khách hàng.
// Mỗi mã tài khoản giữ một phiên chat (mã phiên lưu trên trình duyệt). Tin mới của Admin
// đẩy xuống qua Socket.IO; chỉ hỏi lại server định kỳ khi kênh real-time đang rớt.
// Không dùng API danh sách phiên / đánh dấu đã đọc: hai API đó chỉ dành cho Admin.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useCustomerAccount } from '../../hooks/useCustomerAccount';
import { ApiError, fetchChatMessagesApi, sendChatMessageApi, startChatSessionApi } from '../../lib/api';
import { joinGroup, leaveGroup, onRealtime, realtimeStatus, RealtimeEvents } from '../../lib/realtime';
import { useStore } from '../../lib/store';

const FALLBACK_POLL_MS = 6000;
const sessionKey = (accountId) => `nexus_chat_session_${accountId}`;

function readSession(accountId) {
  try {
    return accountId ? localStorage.getItem(sessionKey(accountId)) : null;
  } catch {
    return null;
  }
}

function ChatBubble({ msg }) {
  if (msg.senderType === 'guest') {
    // Tin của khách (bên phải)
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="px-3.5 py-2.5 rounded-2xl rounded-br-md bg-sky-600 text-white text-[13px] leading-relaxed shadow-sm">
            {msg.message}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 mr-1 text-right">
            {msg.senderName} · {msg.createdAtDisplay}
          </div>
        </div>
      </div>
    );
  }
  // Tin của Admin (bên trái)
  return (
    <div className="flex items-end gap-2">
      <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 text-[10px] font-bold">
        {msg.senderName.slice(0, 1).toUpperCase()}
      </div>
      <div className="max-w-[75%]">
        <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-[13px] leading-relaxed shadow-xs">
          {msg.message}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 ml-1">
          {msg.senderName} · {msg.createdAtDisplay}
        </div>
      </div>
    </div>
  );
}

export default function LiveChatTab() {
  const isVi = useStore(languageStore.language) === 'vi';
  const connectionStatus = useStore(realtimeStatus);
  const { user, accountId } = useCustomerAccount();
  const customerName = user?.name || 'Customer';

  const [sessionId, setSessionId] = useState(() => readSession(accountId));
  const [messages, setMessages] = useState([]);
  const [loadedSessionId, setLoadedSessionId] = useState(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const threadRef = useRef(null);
  const isLoading = !sessionId || loadedSessionId !== sessionId;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const box = threadRef.current;
      if (box) box.scrollTop = box.scrollHeight;
    });
  };

  // Chưa có phiên cho tài khoản này thì mở phiên mới.
  useEffect(() => {
    if (sessionId || !accountId) return;
    let cancelled = false;
    startChatSessionApi(customerName)
      .then((session) => {
        if (cancelled) return;
        try {
          localStorage.setItem(sessionKey(accountId), session.sessionId);
        } catch {
          // Không lưu được thì lần sau mở phiên mới, chat hiện tại vẫn dùng được.
        }
        setSessionId(session.sessionId);
      })
      .catch(() => !cancelled && toast.error(isVi ? 'Không mở được phiên chat.' : 'Could not start a chat session.'));
    return () => {
      cancelled = true;
    };
  }, [sessionId, accountId, customerName, isVi]);

  // Tải lịch sử; chỉ hỏi lại định kỳ khi kênh real-time rớt.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const reload = async () => {
      try {
        const list = await fetchChatMessagesApi(sessionId);
        if (cancelled) return;
        setMessages((previous) => {
          if (list.length !== previous.length) scrollToBottom();
          return list;
        });
        setLoadedSessionId(sessionId);
      } catch (err) {
        // Phiên đã lưu không còn trên server: bỏ đi để mở phiên mới.
        if (!cancelled && err instanceof ApiError && err.status === 404) {
          try {
            localStorage.removeItem(sessionKey(accountId));
          } catch {
            // bỏ qua
          }
          setSessionId(null);
        }
      }
    };
    reload();
    if (connectionStatus === 'connected') {
      return () => {
        cancelled = true;
      };
    }
    const timer = setInterval(reload, FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sessionId, accountId, connectionStatus]);

  // Tin mới qua Socket.IO.
  useEffect(() => {
    if (!sessionId) return;
    joinGroup('chat', sessionId);
    const off = onRealtime(RealtimeEvents.chatMessage, (incoming) => {
      if (incoming.sessionId !== sessionId) return;
      setMessages((list) => (list.some((m) => m.id === incoming.id) ? list : [...list, incoming]));
      scrollToBottom();
    });
    return () => {
      off();
      leaveGroup('chat', sessionId);
    };
  }, [sessionId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !sessionId || isSending) return;
    setIsSending(true);
    try {
      const sent = await sendChatMessageApi(sessionId, customerName, text);
      setMessages((list) => (list.some((m) => m.id === sent.id) ? list : [...list, sent]));
      setDraft('');
      scrollToBottom();
    } catch {
      toast.error(isVi ? 'Lỗi khi gửi tin nhắn' : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[600px] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-600 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              AD
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {isVi ? 'Hỗ trợ trực tuyến Nexus' : 'Nexus Live Support'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {sessionId || (isVi ? 'Đang kết nối...' : 'Connecting...')}
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
              connectionStatus === 'connected'
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
            }`}
          >
            {connectionStatus === 'connected' ? (isVi ? 'Trực tiếp' : 'Live') : isVi ? 'Đang nối lại' : 'Reconnecting'}
          </span>
        </div>

        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 dark:bg-slate-950">
          {isLoading ? (
            <div className="text-center text-xs text-slate-400 py-8">{isVi ? 'Đang tải hội thoại…' : 'Loading conversation…'}</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">
              {isVi ? 'Xin chào! Bạn cần hỗ trợ gì không?' : 'Hello! Do you need any assistance?'}
            </div>
          ) : (
            messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)
          )}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={isVi ? 'Nhập tin nhắn của bạn…' : 'Type your message…'}
            maxLength={1000}
            className="flex-1 px-3.5 py-2.5 rounded-xl text-[13px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={send}
            disabled={isSending || !draft.trim() || !sessionId}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center space-x-1"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
