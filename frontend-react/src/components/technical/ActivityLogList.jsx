// Nhật ký thao tác của một kết nối (cấp kết nối, đổi trạng thái): ai làm, lúc nào, lý do.
// Server ghi nhật ký trong cùng transaction với thao tác, nên chỉ có thao tác đã thành công.
import { useEffect, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { connectionStatusLabel } from '../../lib/connectionStatus';
import { getConnectionActivityLogs } from '../../lib/technicalApi';
import { useStore } from '../../lib/store';

const ACTION_LABEL = {
  Provisioning: { vi: 'Cấp kết nối', en: 'Provisioned' },
  StatusChange: { vi: 'Đổi trạng thái', en: 'Status change' },
};

export default function ActivityLogList({ accountId, refreshKey }) {
  const isVi = useStore(languageStore.language) === 'vi';
  // { key, logs, error }: kết quả gắn với lần tải nào, để biết đang tải hay đã xong.
  const [result, setResult] = useState(null);
  const [manualReload, setManualReload] = useState(0);
  const requestKey = `${accountId}|${refreshKey}|${manualReload}`;

  useEffect(() => {
    let cancelled = false;
    getConnectionActivityLogs(accountId).then(
      (logs) => !cancelled && setResult({ key: requestKey, logs, error: '' }),
      (err) => !cancelled && setResult({ key: requestKey, logs: [], error: technicalErrorMessage(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [accountId, requestKey]);

  const isLoading = result?.key !== requestKey;
  const status = (value) => (value ? connectionStatusLabel(value, isVi) : '—');

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <History className="h-4 w-4 text-amber-500" />
          {isVi ? 'Nhật ký thao tác' : 'Activity log'}
        </h5>
        <button
          type="button"
          onClick={() => setManualReload((n) => n + 1)}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isVi ? 'Tải lại' : 'Reload'}
        </button>
      </div>
      {isLoading && !result ? (
        <div className="px-4 py-3 text-xs text-slate-500">{isVi ? 'Đang tải nhật ký...' : 'Loading log...'}</div>
      ) : result?.error ? (
        <div className="px-4 py-3 text-xs text-rose-600 dark:text-rose-400">{result.error}</div>
      ) : result.logs.length === 0 ? (
        <div className="px-4 py-3 text-xs text-slate-500">
          {isVi ? 'Chưa có thao tác nào.' : 'No activity recorded.'}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
          {result.logs.map((log) => (
            <li
              key={log.logId}
              className="px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1"
            >
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {isVi
                    ? (ACTION_LABEL[log.actionType]?.vi ?? log.actionType)
                    : (ACTION_LABEL[log.actionType]?.en ?? log.actionType)}
                  :{' '}
                  <span className="font-normal text-slate-600 dark:text-slate-300">
                    {status(log.oldValue)} → {status(log.newValue)}
                  </span>
                </div>
                {log.reason && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{log.reason}</div>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-right shrink-0">
                <div>{new Date(log.timestamp).toLocaleString(isVi ? 'vi-VN' : 'en-US')}</div>
                <div>{log.performedByName ?? log.performedBy ?? (isVi ? 'Hệ thống' : 'System')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
