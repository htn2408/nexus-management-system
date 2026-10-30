// Phiên bản và tình trạng hệ thống: kết nối tới API, SQL Server, MongoDB (lấy thật từ /api/health)
// và những thay đổi chính của phiên bản này.
import { useEffect, useState } from 'react';
import { CheckCircle2, Cpu, Database, RefreshCw, XCircle } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { API_BASE_URL } from '../../lib/api';
import { useStore } from '../../lib/store';

const APP_VERSION = 'v2.4';

const CHANGELOG = [
  {
    vi: [
      'Đa ngôn ngữ toàn diện:',
      'Chuyển đổi tức thì giữa Tiếng Việt và Tiếng Anh trên tất cả bảng điều khiển Quản trị, Bán lẻ, Kỹ thuật, Kế toán và Khách hàng.',
    ],
    en: [
      'Comprehensive Bilingual Support:',
      'Instant switching between Vietnamese and English across Admin, Retail, Technical, Accounts, and Customer portals.',
    ],
  },
  {
    vi: [
      'Thông báo tương tác tức thời:',
      'Bấm vào từng mục thông báo trên thanh tiêu đề để chuyển ngay tới trang và tab chức năng tương ứng.',
    ],
    en: [
      'Interactive Direct Notifications:',
      'Click on any notification in the header bell droplist to jump directly to its target section and tab.',
    ],
  },
  {
    vi: [
      'Thông báo nhanh 1,5 giây:',
      'Hộp thông báo nhỏ ở góc màn hình tự đóng sau 1,5 giây, không che khuất nội dung.',
    ],
    en: ['Optimized Toast Timing (1.5s):', 'Toast notifications close on their own after 1.5 seconds.'],
  },
  {
    vi: [
      'Thu cước trực tiếp tại quầy:',
      'Nhân viên quầy bán lẻ có thể thu tiền mặt/chuyển khoản và ghi nhận hóa đơn trực tiếp cho khách hàng.',
    ],
    en: [
      'Retail Direct Payment Settlement:',
      'Retail store representatives can record counter cash/transfer payments for subscribers.',
    ],
  },
];

function StatusPill({ ok, label }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold ${
        ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export default function SystemInfo() {
  const isVi = useStore(languageStore.language) === 'vi';
  // null = đang kiểm tra; { ok: false } = không gọi được API.
  const [health, setHealth] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => ({ ok: true, ...data }))
      .catch(() => ({ ok: false }))
      .then((result) => {
        if (cancelled) return;
        setHealth(result);
        setCheckedAt(new Date());
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const recheck = () => {
    setHealth(null);
    setReloadKey((k) => k + 1);
  };

  const up = (value) => value === 'up';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isVi ? 'Phiên bản' : 'Version'}
          </span>
          <div className="text-base font-mono font-bold text-slate-900 dark:text-white">Nexus {APP_VERSION}</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">React · Node.js / Express</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" />
            {isVi ? 'Máy chủ API' : 'API server'}
          </span>
          {health === null ? (
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              {isVi ? 'Đang kiểm tra…' : 'Checking…'}
            </span>
          ) : (
            <StatusPill
              ok={health.ok && health.status === 'ok'}
              label={health.ok ? (isVi ? 'Hoạt động' : 'Online') : isVi ? 'Không kết nối được' : 'Unreachable'}
            />
          )}
          {checkedAt && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {isVi ? 'Kiểm tra lúc' : 'Checked at'} {checkedAt.toLocaleTimeString(isVi ? 'vi-VN' : 'en-US')}
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            {isVi ? 'Cơ sở dữ liệu' : 'Databases'}
          </span>
          {health?.ok ? (
            <div className="flex flex-col gap-1">
              <StatusPill ok={up(health.sqlServer)} label={`SQL Server: ${health.sqlServer}`} />
              <StatusPill ok={up(health.mongo)} label={`MongoDB: ${health.mongo}`} />
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={recheck}
          disabled={health === null}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {isVi ? 'Kiểm tra lại' : 'Check again'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-2 text-xs">
        <div className="font-bold text-sky-600 dark:text-sky-400 text-sm">
          {isVi ? 'Có gì trong phiên bản này' : "What's in this version"}
        </div>
        <ul className="space-y-1.5 pl-4 list-disc text-slate-600 dark:text-slate-400 leading-relaxed">
          {CHANGELOG.map((item) => {
            const [title, body] = isVi ? item.vi : item.en;
            return (
              <li key={item.en[0]}>
                <strong className="text-slate-800 dark:text-slate-200">{title}</strong> {body}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
