// Chatbox nổi ở góc phải màn hình (trang chủ): khách, kể cả chưa đăng nhập, chat trực tiếp với Admin.
// Phiên chat lưu trong CSDL qua API /api/chat/* và định danh bằng SessionID giữ trong localStorage,
// nên khách quay lại vẫn xem được lịch sử.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MessageCircle, X, Send, Headset } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { startChatSessionApi, fetchChatMessagesApi, sendChatMessageApi, ApiError } from '../../lib/api';
import { joinGroup, leaveGroup, onRealtime, realtimeStatus, RealtimeEvents } from '../../lib/realtime';
import { useStore } from '../../lib/store';
import './ChatBox.css';

const SESSION_KEY = 'nexus_chat_session_id';
const NAME_KEY = 'nexus_chat_customer_name';
// Chỉ dùng khi kênh real-time bị rớt; bình thường tin nhắn được đẩy xuống ngay.
const FALLBACK_POLL_MS = 6000;

function chatText(isVi) {
  return {
    bubbleTitle: isVi ? 'Chat với Admin' : 'Chat with Admin',
    panelTitle: isVi ? 'Hỗ trợ Nexus' : 'Nexus Support',
    online: isVi ? 'Đang hoạt động' : 'Online',
    welcomeTitle: isVi ? 'Xin chào 👋' : 'Hello 👋',
    welcomeText: isVi
      ? 'Nhập tên của bạn để bắt đầu trò chuyện với Admin Nexus Telecom.'
      : 'Enter your name to start chatting with the Nexus Telecom Admin.',
    nameLabel: isVi ? 'Tên của bạn' : 'Your name',
    namePlaceholder: isVi ? 'VD: Minh Anh' : 'e.g. Alex',
    startBtn: isVi ? 'Bắt đầu chat' : 'Start chat',
    connecting: isVi ? 'Đang kết nối…' : 'Connecting…',
    inputPlaceholder: isVi ? 'Nhập tin nhắn…' : 'Type a message…',
    loading: isVi ? 'Đang tải tin nhắn…' : 'Loading messages…',
    emptyChat: isVi ? 'Hãy gửi tin nhắn đầu tiên!' : 'Send your first message!',
    endSession: isVi ? 'Kết thúc phiên' : 'End session',
    send: isVi ? 'Gửi' : 'Send',
  };
}

function ChatMessage({ msg }) {
  if (msg.senderType === 'admin') {
    // Tin nhắn của Admin (bên trái)
    return (
      <div className="flex items-end gap-2">
        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-sky-600 to-blue-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
          A
        </div>
        <div className="max-w-[78%]">
          <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white dark:bg-[#1E3349] border border-[#CCE4F7] dark:border-[#253D56] text-[#1B2D40] dark:text-[#E0F1FF] text-[13px] leading-relaxed shadow-xs">
            {msg.message}
          </div>
          <div className="text-[10px] text-[#8FAAC2] dark:text-[#5E7B99] mt-1 ml-1">
            {msg.senderName} · {msg.createdAtDisplay}
          </div>
        </div>
      </div>
    );
  }

  // Tin nhắn của khách (bên phải)
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%]">
        <div className="px-3.5 py-2.5 rounded-2xl rounded-br-md bg-sky-600 text-white text-[13px] leading-relaxed shadow-md shadow-sky-600/20">
          {msg.message}
        </div>
        <div className="text-[10px] text-[#8FAAC2] dark:text-[#5E7B99] mt-1 mr-1 text-right">{msg.createdAtDisplay}</div>
      </div>
    </div>
  );
}

export default function ChatBox() {
  const isVi = useStore(languageStore.language) === 'vi';
  const currentUser = useStore(authStore.currentUser);
  const connectionStatus = useStore(realtimeStatus);
  const text = chatText(isVi);

  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Khôi phục phiên chat cũ từ localStorage
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY));
  const [customerName, setCustomerName] = useState(() => localStorage.getItem(NAME_KEY) ?? 'Khách');
  // Khách đã đăng nhập thì tự điền sẵn tên cho tiện
  const [nameInput, setNameInput] = useState(() => currentUser?.name ?? '');

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  // Phiên đã tải xong lịch sử; khác sessionId nghĩa là đang tải.
  const [loadedSessionId, setLoadedSessionId] = useState(null);
  const isLoadingHistory = sessionId !== loadedSessionId && messages.length === 0;

  const messagesRef = useRef(null);
  // Listener realtime cần biết hộp chat đang mở hay đóng mà không phải đăng ký lại.
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const scrollToBottom = (behavior = 'smooth') => {
    requestAnimationFrame(() => {
      const box = messagesRef.current;
      box?.scrollTo({ top: box.scrollHeight, behavior });
    });
  };

  // Nghe tin nhắn của phiên này qua Socket.IO, cả khi hộp chat đang đóng để hiện chấm đỏ báo Admin vừa trả lời.
  useEffect(() => {
    if (!sessionId) return;
    joinGroup('chat', sessionId);

    const off = onRealtime(RealtimeEvents.chatMessage, (incoming) => {
      if (incoming.sessionId !== sessionId) return;
      // Tin khách vừa gửi đã được thêm ngay lúc bấm gửi.
      setMessages((list) => (list.some((m) => m.id === incoming.id) ? list : [...list, incoming]));
      if (incoming.senderType === 'admin' && !isOpenRef.current) setHasUnread(true);
      scrollToBottom();
    });

    return () => {
      off();
      leaveGroup('chat', sessionId);
    };
  }, [sessionId]);

  // Tải lịch sử khi mở hộp chat. Chỉ hỏi lại server định kỳ nếu kênh real-time đang rớt.
  useEffect(() => {
    if (!isOpen || !sessionId) return;
    let cancelled = false;

    const reload = async () => {
      try {
        const list = await fetchChatMessagesApi(sessionId);
        if (cancelled) return;
        setMessages((previous) => {
          // Tự cuộn xuống cuối khi có tin nhắn mới
          if (list.length !== previous.length) scrollToBottom();
          return list;
        });
        setLoadedSessionId(sessionId);
      } catch (err) {
        // Phiên lưu trong localStorage không còn trên server (CSDL chat đã bị xoá, hoặc phiên
        // quá cũ): bỏ phiên hỏng để khách nhập tên chat lại từ đầu.
        if (!cancelled && err instanceof ApiError && err.status === 404) {
          localStorage.removeItem(SESSION_KEY);
          setSessionId(null);
          setMessages([]);
        }
        // Mất kết nối tạm thời thì để lần sau thử lại
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
  }, [isOpen, sessionId, connectionStatus]);

  const openChat = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  // Khách bắt đầu phiên chat: lưu SessionID + tên vào localStorage
  const startSession = async () => {
    const name = nameInput.trim();
    if (!name) {
      toast.error(isVi ? 'Vui lòng nhập tên của bạn.' : 'Please enter your name.');
      return;
    }
    setIsSending(true);
    try {
      const session = await startChatSessionApi(name);
      localStorage.setItem(SESSION_KEY, session.sessionId);
      localStorage.setItem(NAME_KEY, name);
      setSessionId(session.sessionId);
      setCustomerName(name);
      setMessages(await fetchChatMessagesApi(session.sessionId));
      setLoadedSessionId(session.sessionId);
      scrollToBottom('auto');
      toast.success(isVi ? 'Đã kết nối với Admin.' : 'Connected with Admin.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể bắt đầu phiên chat.');
    } finally {
      setIsSending(false);
    }
  };

  // Kết thúc phiên: xoá phiên hiện tại, lần sau hỏi lại tên
  const endSession = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(NAME_KEY);
    setSessionId(null);
    setCustomerName('');
    setNameInput('');
    setMessages([]);
  };

  const sendMessage = async () => {
    const message = draft.trim();
    if (!message || !sessionId || isSending) return;
    setIsSending(true);
    try {
      const sent = await sendChatMessageApi(sessionId, customerName, message);
      setMessages((list) => (list.some((m) => m.id === sent.id) ? list : [...list, sent]));
      setDraft('');
      scrollToBottom();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không gửi được tin nhắn.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    // Bong bóng chat nổi góc phải
    return (
      <button
        type="button"
        onClick={openChat}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-tr from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-xl shadow-sky-600/40 flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer group"
        title={text.bubbleTitle}
        aria-label={text.bubbleTitle}
      >
        <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-rose-500 border-2 border-white dark:border-[#1B2D40]"></span>
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[370px] rounded-2xl bg-white dark:bg-[#1E3349] border border-[#CCE4F7] dark:border-[#253D56] shadow-2xl shadow-sky-900/20 overflow-hidden flex flex-col transition-colors duration-300"
      role="dialog"
      aria-label={text.bubbleTitle}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
            <Headset className="h-5 w-5" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">{text.panelTitle}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-sky-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              <span>{text.online}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {sessionId && (
            <button
              type="button"
              onClick={endSession}
              className="text-[11px] font-semibold text-sky-100 hover:text-white hover:bg-white/10 rounded-md px-2 py-1 transition cursor-pointer border-0 bg-transparent"
              title={text.endSession}
            >
              {text.endSession}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 rounded-lg text-white hover:bg-white/15 flex items-center justify-center transition cursor-pointer border-0 bg-transparent"
            aria-label="Đóng"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {!sessionId ? (
        // Chưa có phiên: form nhập tên
        <div className="p-5 space-y-4">
          <div className="text-center">
            <div className="text-lg font-extrabold text-sky-950 dark:text-white">{text.welcomeTitle}</div>
            <p className="text-xs text-[#537292] dark:text-[#8DB0D4] mt-1.5 leading-relaxed">{text.welcomeText}</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{text.nameLabel}</span>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startSession()}
              placeholder={text.namePlaceholder}
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#F3F9FF] dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] text-[#1B2D40] dark:text-[#E0F1FF] placeholder:text-[#8FAAC2] focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
          <button
            type="button"
            onClick={startSession}
            disabled={isSending}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-md shadow-sky-600/25 transition active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {isSending ? text.connecting : text.startBtn}
          </button>
        </div>
      ) : (
        <>
          {/* Có phiên: khung tin nhắn */}
          <div
            ref={messagesRef}
            className="h-[320px] overflow-y-auto px-4 py-4 space-y-3 bg-[#F3F9FF] dark:bg-[#152434] chatbox-scrollbar"
          >
            {isLoadingHistory ? (
              <div className="text-center text-xs text-[#537292] dark:text-[#8DB0D4] py-8">{text.loading}</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-[#537292] dark:text-[#8DB0D4] py-8">{text.emptyChat}</div>
            ) : (
              messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)
            )}
          </div>

          {/* Ô nhập tin nhắn */}
          <div className="p-3 border-t border-[#CCE4F7] dark:border-[#253D56] flex items-center gap-2 bg-white dark:bg-[#1E3349] shrink-0">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={text.inputPlaceholder}
              maxLength={1000}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-[13px] bg-[#F3F9FF] dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] text-[#1B2D40] dark:text-[#E0F1FF] placeholder:text-[#8FAAC2] focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isSending || !draft.trim()}
              className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-md shadow-sky-600/25 flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
              aria-label={text.send}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
