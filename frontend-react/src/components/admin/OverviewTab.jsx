// Tổng quan cho Admin: số liệu đếm thẳng từ dữ liệu đã tải (không có số nhập tay hay số mẫu).
import { AlertTriangle, Layers, MessageSquare, Network, Package, Store, Truck, Users } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useBranchCounts } from '../../hooks/useBranchCounts';
import { useStore } from '../../lib/store';

function Tile({ icon: Icon, label, value, note, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition"
    >
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        {label}
        <Icon className="h-4 w-4 text-indigo-500" />
      </div>
      <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{value}</div>
      <div className="text-[11px] text-slate-400">{note}</div>
    </button>
  );
}

export default function OverviewTab({ onOpenTab, chatUnread }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const employees = useStore(nexusStore.employees);
  const shops = useStore(nexusStore.retailShops);
  const plans = useStore(nexusStore.plans);
  const vendors = useStore(nexusStore.vendors);
  const inventory = useStore(nexusStore.inventory);
  const connections = useStore(nexusStore.connections);
  const requests = useStore(nexusStore.equipmentRequests);
  const feedbacks = useStore(nexusStore.feedbacks);
  const countsFor = useBranchCounts();

  const lowStock = inventory.filter((i) => i.stockQuantity <= i.reorderLevel);
  const pendingRequests = requests.filter((r) => r.status === 'Pending').length;
  const newFeedback = feedbacks.filter((f) => !f.response).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          icon={Users}
          label={isVi ? 'Nhân viên đang làm' : 'Active employees'}
          value={employees.filter((e) => e.status === 'Active').length}
          note={isVi ? `trên tổng ${employees.length}` : `of ${employees.length}`}
          onClick={() => onOpenTab('employees')}
        />
        <Tile
          icon={Store}
          label={isVi ? 'Chi nhánh hoạt động' : 'Active branches'}
          value={shops.filter((s) => s.status === 'Active').length}
          note={isVi ? `trên tổng ${shops.length}` : `of ${shops.length}`}
          onClick={() => onOpenTab('shops')}
        />
        <Tile
          icon={Network}
          label={isVi ? 'Thuê bao (kết nối)' : 'Subscribers (lines)'}
          value={connections.length}
          note={
            isVi
              ? `${connections.filter((c) => c.status === 'Active').length} đang hoạt động`
              : `${connections.filter((c) => c.status === 'Active').length} active`
          }
          onClick={() => onOpenTab('shops')}
        />
        <Tile
          icon={Layers}
          label={isVi ? 'Gói cước đang bán' : 'Plans on sale'}
          value={plans.filter((p) => p.status !== 'Archived').length}
          note={isVi ? `trên tổng ${plans.length}` : `of ${plans.length}`}
          onClick={() => onOpenTab('plans')}
        />
        <Tile
          icon={Package}
          label={isVi ? 'Vật tư dưới ngưỡng' : 'Items below reorder'}
          value={lowStock.length}
          note={isVi ? `${inventory.length} mặt hàng trong kho` : `${inventory.length} stock items`}
          onClick={() => onOpenTab('stock')}
        />
        <Tile
          icon={Truck}
          label={isVi ? 'Yêu cầu nhập hàng chờ duyệt' : 'Pending equipment requests'}
          value={pendingRequests}
          note={isVi ? `${vendors.length} nhà cung cấp` : `${vendors.length} vendors`}
          onClick={() => onOpenTab('purchases')}
        />
        <Tile
          icon={MessageSquare}
          label={isVi ? 'Phản hồi chưa trả lời' : 'Unanswered feedback'}
          value={newFeedback}
          note={isVi ? `trên tổng ${feedbacks.length}` : `of ${feedbacks.length}`}
          onClick={() => onOpenTab('feedback')}
        />
        <Tile
          icon={MessageSquare}
          label={isVi ? 'Tin chat chưa đọc' : 'Unread chat messages'}
          value={chatUnread}
          note={isVi ? 'Chat trực tuyến với khách' : 'Live chat'}
          onClick={() => onOpenTab('livechat')}
        />
      </div>

      {lowStock.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-xs">
          <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4" />
            {isVi ? 'Vật tư cần nhập thêm' : 'Items to restock'}
          </div>
          <div className="text-rose-700/90 dark:text-rose-300/90">
            {lowStock.map((i) => `${i.name} (${i.stockQuantity}/${i.reorderLevel})`).join(' · ')}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
          {isVi ? 'Chi nhánh' : 'Branches'}
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5">{isVi ? 'Chi nhánh' : 'Branch'}</th>
              <th className="px-4 py-2.5">{isVi ? 'Thành phố' : 'City'}</th>
              <th className="px-4 py-2.5">{isVi ? 'Quản lý' : 'Manager'}</th>
              <th className="px-4 py-2.5 text-right">{isVi ? 'Nhân viên' : 'Staff'}</th>
              <th className="px-4 py-2.5 text-right">{isVi ? 'Thuê bao' : 'Subscribers'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {shops.map((s) => {
              const counts = countsFor(s.shopCode);
              return (
                <tr key={s.shopCode}>
                  <td className="px-4 py-2.5">
                    <span className="font-semibold">{s.name}</span>{' '}
                    <span className="font-mono text-slate-500">({s.shopCode})</span>
                  </td>
                  <td className="px-4 py-2.5">{s.city}</td>
                  <td className="px-4 py-2.5">{s.managerName || '—'}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{counts.staff}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{counts.subscribers}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
