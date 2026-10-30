// Tab tổng quan của khách: tài khoản, gói đang dùng, cước chưa trả, chi nhánh, chi tiết thuê bao
// và tình trạng đường truyền.
import { Activity, ArrowRight, CreditCard, KeyRound, MapPin, Store, User } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { useCustomerAccount } from '../../hooks/useCustomerAccount';
import { useStore } from '../../lib/store';
import OrderPlacedBanner from './OrderPlacedBanner';
import { serviceStatus } from './serviceStatus';

const cardClass = 'p-6 bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl shadow-sm';

function SummaryCard({ icon: Icon, tone, title, children }) {
  return (
    <div className={cardClass}>
      <div className={`flex items-center space-x-3 mb-2 ${tone}`}>
        <Icon className="h-5 w-5" />
        <h3 className="font-semibold text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Detail({ label, value, mono = false }) {
  return (
    <div>
      <div className="text-[#537292] dark:text-[#8DB0D4]">{label}</div>
      <div className={`font-semibold text-[#0F1D2B] dark:text-white mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

const CONNECTION_TONES = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Temporarily Inactive': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Permanently Inactive': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

// Tình trạng đường truyền lấy từ hồ sơ kết nối do bộ phận kỹ thuật cập nhật.
function ConnectionStatusCard({ connection, isVi }) {
  return (
    <div className="p-6 bg-gradient-to-br from-white via-sky-50/30 to-blue-50/20 dark:from-[#152434] dark:via-[#13283f] dark:to-[#0f1d2b] border border-sky-200 dark:border-sky-900/60 rounded-xl shadow-sm">
      <div className="flex items-start space-x-3.5">
        <div className="p-2.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0">
          <Activity className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {isVi ? 'Tình trạng đường truyền' : 'Line Status'}
            </h3>
            {connection && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  CONNECTION_TONES[connection.status] ?? CONNECTION_TONES.Active
                }`}
              >
                {connection.status}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            {connection
              ? isVi
                ? 'Thông tin do bộ phận kỹ thuật cập nhật mỗi khi đổi trạng thái hoặc thiết bị.'
                : 'Updated by the technical team whenever the status or device changes.'
              : isVi
                ? 'Đường truyền sẽ hiện ở đây khi kỹ thuật lắp đặt xong.'
                : 'Your line appears here once it has been installed.'}
          </p>
        </div>
      </div>

      {connection && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-sky-100 dark:border-sky-900/40 text-xs">
          {[
            [isVi ? 'Cổng kết nối' : 'Port', connection.portNumber || '—'],
            [isVi ? 'Số serial thiết bị' : 'Device serial', connection.assignedDeviceSerial || '—'],
            [isVi ? 'Cập nhật gần nhất' : 'Last updated', connection.lastUpdated || '—'],
            [isVi ? 'Ghi chú trạng thái' : 'Status note', connection.lastStatusReason || '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-sky-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{label}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs break-words">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OverviewTab({ lastOrder, onDismissLastOrder, onOpenTab }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const { user, accountId, connection, order, shop, unpaidBills, totalDue } = useCustomerAccount();
  const status = serviceStatus(connection, order);
  const nextDueBill = unpaidBills[0] ?? null;

  return (
    <div className="space-y-6">
      {lastOrder && (
        <OrderPlacedBanner order={lastOrder} onDismiss={onDismissLastOrder} onDetails={() => onOpenTab('new-service')} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={User} tone="text-purple-600 dark:text-purple-400" title={isVi ? 'Thông tin tài khoản' : 'Account Profile'}>
          <p className="text-sm font-bold text-[#0F1D2B] dark:text-white">{user?.name || 'Customer'}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono flex items-center space-x-1">
            <KeyRound className="h-3 w-3 shrink-0" />
            <span>{accountId || '—'}</span>
          </p>
          {order && (
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              {isVi ? 'Mã đơn' : 'Order'}: {order.id}
            </p>
          )}
        </SummaryCard>

        <SummaryCard icon={Activity} tone="text-sky-600 dark:text-sky-400" title={isVi ? 'Dịch vụ đang dùng' : 'Active Subscription'}>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {connection?.planName || order?.planName || (isVi ? 'Chưa có gói cước' : 'No plan yet')}
          </p>
          <p className={`text-xs mt-1 font-semibold ${status.tone}`}>{isVi ? status.vi : status.en}</p>
        </SummaryCard>

        <SummaryCard icon={CreditCard} tone="text-rose-600 dark:text-rose-400" title={isVi ? 'Cước phí chưa thanh toán' : 'Unpaid Charges'}>
          {totalDue > 0 ? (
            <>
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">${totalDue.toFixed(2)}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                  {isVi ? `${unpaidBills.length} HĐ nợ cước` : `${unpaidBills.length} Due`}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">
                  {nextDueBill
                    ? isVi
                      ? `Hạn chót: ${nextDueBill.dueDate}`
                      : `Due: ${nextDueBill.dueDate}`
                    : isVi
                      ? 'Cần nộp cước'
                      : 'Payment required'}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenTab('pay-balance')}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center space-x-0.5"
                >
                  <span>{isVi ? 'Thanh toán' : 'Pay Now'}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">$0.00</p>
              <p className="text-xs text-slate-500 mt-2">{isVi ? 'Đã hoàn tất thanh toán cước phí' : 'All invoices fully settled'}</p>
            </>
          )}
        </SummaryCard>

        <SummaryCard icon={Store} tone="text-slate-600 dark:text-slate-400" title={isVi ? 'Chi nhánh phục vụ' : 'Serving Branch'}>
          {shop ? (
            <>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{shop.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {shop.shopCode} · {shop.phone}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {isVi ? 'Hotline hỗ trợ 24/7: 1900 6868' : '24/7 support hotline: 1900 6868'}
            </p>
          )}
        </SummaryCard>
      </div>

      <div className={cardClass}>
        <h3 className="font-bold text-base text-[#0F1D2B] dark:text-white mb-4 flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>{isVi ? 'Chi tiết thuê bao' : 'Subscription Details'}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <Detail
            label={isVi ? 'Địa chỉ lắp đặt' : 'Installation address'}
            value={connection?.installationAddress || order?.installationAddress || '—'}
          />
          <Detail label={isVi ? 'Loại kết nối' : 'Connection type'} value={connection?.connectionType || order?.connectionType || '—'} />
          <Detail label={isVi ? 'Cước hàng tháng' : 'Monthly rental'} value={connection ? `$${connection.monthlyRental.toFixed(2)}` : '—'} />
          <Detail
            label={isVi ? 'Thiết bị đầu cuối' : 'CPE device'}
            value={connection?.assignedDeviceModel || (isVi ? 'Chưa lắp đặt' : 'Not installed yet')}
          />
          <Detail label={isVi ? 'Địa chỉ IP' : 'IP address'} value={connection?.ipAddress || '—'} mono />
          <Detail
            label={isVi ? 'Ngày lắp đặt' : 'Installed date'}
            value={connection?.installedDate || (isVi ? 'Đang chờ xử lý' : 'Pending')}
          />
        </div>
      </div>

      <ConnectionStatusCard connection={connection} isVi={isVi} />
    </div>
  );
}
