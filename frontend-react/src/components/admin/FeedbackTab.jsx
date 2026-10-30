// Phản hồi của khách (Admin): đọc, trả lời (phản hồi chuyển Resolved và khách nhận thông báo).
import { useState } from 'react';
import { MessageSquare, Search, Send, Star } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { useServerAction } from '../../hooks/useServerAction';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';

const STATUS_CHIP = {
  New: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  'Under Review': 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  Closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function ReplyBox({ feedback, onDone }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const user = useStore(authStore.currentUser);
  const [text, setText] = useState('');
  const { busy, run } = useServerAction(isVi);
  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(
      () => nexusStore.respondFeedback(feedback.id, text.trim(), user?.id),
      isVi ? `Đã trả lời ${feedback.customerName}.` : `Replied to ${feedback.customerName}.`,
    );
    if (ok) onDone();
  };
  return (
    <form onSubmit={submit} className="mt-2 flex gap-2">
      <textarea
        required
        rows={2}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isVi ? 'Nội dung trả lời khách hàng...' : 'Your reply to the customer...'}
        className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      ></textarea>
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="self-end inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
      >
        <Send className="h-3.5 w-3.5" />
        {isVi ? 'Gửi' : 'Send'}
      </button>
    </form>
  );
}

export default function FeedbackTab() {
  const isVi = useStore(languageStore.language) === 'vi';
  const feedbacks = useStore(nexusStore.feedbacks);
  const employees = useStore(nexusStore.employees);
  const [search, setSearch] = useState('');
  const [replyingId, setReplyingId] = useState(null);
  const q = search.trim().toLowerCase();
  const filtered = feedbacks.filter(
    (f) =>
      !q ||
      [f.customerName, f.message, f.accountId, f.category, f.orderId].some((v) => (v ?? '').toLowerCase().includes(q)),
  );
  const pager = usePagination(filtered, 6);
  // respondedBy lưu mã nhân viên; hiện tên nếu tra được.
  const responder = (id) => employees.find((e) => e.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              pager.setPage(1);
            }}
            placeholder={
              isVi
                ? 'Tìm theo khách, nội dung, mã tài khoản, danh mục...'
                : 'Search customer, message, account, category...'
            }
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">
          {isVi ? 'Chưa có phản hồi nào.' : 'No feedback yet.'}
        </p>
      ) : (
        pager.items.map((f) => (
          <div
            key={f.id}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{f.customerName}</div>
                <div className="text-slate-500">
                  {f.accountId && <span className="font-mono">{f.accountId}</span>}{' '}
                  {f.orderId && <span className="font-mono">· #{f.orderId}</span>} · {f.createdAt}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: f.rating ?? 0 }, (_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                  {f.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CHIP[f.status] ?? STATUS_CHIP.New}`}
                >
                  {f.status}
                </span>
              </div>
            </div>
            <p className="mt-2 text-slate-700 dark:text-slate-300 whitespace-pre-line">{f.message}</p>
            {f.response ? (
              <div className="mt-3 p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50">
                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {responder(f.respondedBy)} · {f.respondedAt}
                </div>
                <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-line">{f.response}</p>
              </div>
            ) : replyingId === f.id ? (
              <ReplyBox feedback={f} onDone={() => setReplyingId(null)} />
            ) : (
              <button
                type="button"
                onClick={() => setReplyingId(f.id)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {isVi ? 'Trả lời khách' : 'Reply'}
              </button>
            )}
          </div>
        ))
      )}
      <Pagination {...pager.props} />
    </div>
  );
}
