// Tra cứu đơn hàng: trước khi kỹ thuật xác nhận khả thi thì khách chưa có mã tài khoản,
// nên khách mới theo dõi đơn bằng mã đơn (VD: B0000000016).
// Gọi API công khai /api/public/orders/:id: chỉ có tiến độ, không có thông tin cá nhân,
// và không in mã tài khoản (mã đơn chạy tuần tự, ai cũng dò được) — mã được gửi qua email.
import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { fetchPublicOrderStatusApi } from '../../lib/api';
import { queryParam } from '../../lib/router';
import { useStore } from '../../lib/store';
import { orderStatusLabel } from '../../types/nexus';

export default function OrderTracker() {
  const t = useStore(languageStore.t);
  const language = useStore(languageStore.language);
  const [query, setQuery] = useState(() => queryParam('order') ?? '');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const lookUp = async (rawId) => {
    setIsLoading(true);
    try {
      const found = await fetchPublicOrderStatusApi(rawId);
      setTrackedOrder(found);
      setError(found ? '' : t.auth.trackNotFound);
    } catch {
      setTrackedOrder(null);
      setError(t.auth.serverUnreachable);
    } finally {
      setIsLoading(false);
    }
  };

  // Mở từ biên nhận mua hàng (/login?order=...): tra ngay một lần.
  const lookedUpFromUrl = useRef(false);
  useEffect(() => {
    const fromUrl = queryParam('order');
    if (!fromUrl || lookedUpFromUrl.current) return;
    lookedUpFromUrl.current = true;
    fetchPublicOrderStatusApi(fromUrl).then(
      (found) => {
        setTrackedOrder(found);
        setError(found ? '' : t.auth.trackNotFound);
      },
      () => setError(t.auth.serverUnreachable),
    );
  }, [t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) lookUp(query);
  };

  return (
    <div className="mt-6 pt-5 border-t border-[#CCE4F7] dark:border-[#253D56]/80">
      <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#537292] dark:text-slate-400 mb-1">
        <Search className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
        <span>{t.auth.trackTitle}</span>
      </div>
      <p className="text-[11px] text-[#537292] dark:text-slate-400 mb-2.5">{t.auth.trackHint}</p>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          autoComplete="off"
          placeholder={t.auth.trackPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-0 px-3.5 py-2 text-sm bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-blue-500 text-[#0F1D2B] dark:text-white placeholder-[#7899B8] dark:placeholder-slate-500 transition font-mono"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#EDF6FF] dark:bg-[#1E3349] hover:bg-[#D8ECFC] dark:hover:bg-[#253E58] text-[#1B2D40] dark:text-white border border-[#CCE4F7] dark:border-[#253D56] transition active:scale-95 cursor-pointer disabled:opacity-60"
        >
          {t.auth.trackButton}
        </button>
      </form>

      {error && <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}

      {!error && trackedOrder && (
        <div className="mt-3 p-3 rounded-xl bg-[#EDF6FF] dark:bg-[#101C29] border border-[#CCE4F7] dark:border-[#253D56] text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-[#0F1D2B] dark:text-white">{trackedOrder.orderId}</span>
            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
              {t.auth.trackStatusLabel}: {orderStatusLabel(trackedOrder.status, language)}
            </span>
          </div>
          {trackedOrder.planName && (
            <div className="mt-1 text-[11px] text-[#537292] dark:text-slate-400">
              {trackedOrder.planName} · {trackedOrder.storeName}
            </div>
          )}

          {trackedOrder.accountIssued ? (
            <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {t.auth.trackAccountIssued}
            </p>
          ) : trackedOrder.status === 'Not Feasible' ? (
            <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{t.auth.trackRejected}</p>
          ) : (
            <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">{t.auth.trackPending}</p>
          )}
        </div>
      )}
    </div>
  );
}
