// Tab đăng ký thêm dịch vụ: tìm / lọc gói cước đang bán, mở form đặt đơn cho gói được chọn.
import { useState } from 'react';
import { Phone, Plus, Radio, Search, ShoppingBag, Wifi } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';
import NewServiceOrderModal from './NewServiceOrderModal';
import OrderPlacedBanner from './OrderPlacedBanner';

const PLANS_PER_PAGE = 6;

const TYPE_STYLES = {
  Broadband: { icon: Wifi, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  'Dial-Up': { icon: Radio, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  Landline: { icon: Phone, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
};

const CATEGORIES = [
  ['all', 'Tất cả loại', 'All Types'],
  ['Broadband', 'Cáp quang', 'Broadband'],
  ['Dial-Up', 'Quay số', 'Dial-Up'],
  ['Landline', 'Cố định', 'Landline'],
];

function matches(plan, category, query) {
  if (plan.status !== 'Active') return false;
  if (category !== 'all' && plan.type !== category) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [plan.name, plan.description, plan.speedOrBandwidth].some((field) => field?.toLowerCase().includes(q));
}

function PlanCard({ plan, isVi, onSubscribe }) {
  const { icon: Icon, tone } = TYPE_STYLES[plan.type] ?? TYPE_STYLES.Landline;

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${tone}`}>
            <Icon className="h-3 w-3" />
            <span>{plan.type}</span>
          </span>
          {plan.isPopular && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {isVi ? 'Phổ biến' : 'Popular'}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-[#0F1D2B] dark:text-white group-hover:text-sky-600 transition-colors">{plan.name}</h3>
        <p className="text-xs text-[#537292] dark:text-[#8DB0D4] mt-1 line-clamp-2">{plan.description || plan.speedOrBandwidth}</p>

        <div className="mt-4 pt-4 border-t border-[#CCE4F7]/60 dark:border-[#253D56]/60 flex items-baseline space-x-1">
          <span className="text-2xl font-black font-mono text-[#0F1D2B] dark:text-white">${plan.monthlyRental}</span>
          <span className="text-xs text-[#537292] dark:text-[#8DB0D4]">/{(plan.billingCycle ?? 'Monthly').toLowerCase()}</span>
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">{isVi ? 'Tiền cọc thiết bị:' : 'Security Deposit:'}</span>
            <span className="font-mono font-bold">${plan.securityDeposit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{isVi ? 'Tốc độ / Băng thông:' : 'Speed:'}</span>
            <span className="font-semibold">{plan.speedOrBandwidth}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{isVi ? 'Thời hạn cước:' : 'Validity:'}</span>
            <span>{plan.validity || '—'}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-[#CCE4F7]/60 dark:border-[#253D56]/60">
        <button
          type="button"
          onClick={() => onSubscribe(plan)}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 active:scale-98 text-white transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{isVi ? 'Đăng ký gói này' : 'Subscribe Now'}</span>
        </button>
      </div>
    </div>
  );
}

export default function NewServiceTab({ lastOrder, onOrderPlaced, onDismissLastOrder }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const plans = useStore(nexusStore.plans);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [orderingPlan, setOrderingPlan] = useState(null);

  const filtered = plans.filter((p) => matches(p, category, query));
  const pager = usePagination(filtered, PLANS_PER_PAGE);

  // Đổi từ khoá hoặc loại thì quay về trang 1.
  const changeQuery = (value) => {
    setQuery(value);
    pager.setPage(1);
  };
  const changeCategory = (value) => {
    setCategory(value);
    pager.setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder={isVi ? 'Tìm gói cước theo tên, tốc độ, mô tả...' : 'Search plans by name, speed...'}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1A2C3F] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl text-[#0F1D2B] dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => changeCategory(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-[#1A2C3F] border border-[#CCE4F7] dark:border-[#253D56] rounded-xl px-3 py-2 text-[#0F1D2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer min-w-[160px]"
        >
          {CATEGORIES.map(([value, vi, en]) => (
            <option key={value} value={value}>
              {isVi ? vi : en}
            </option>
          ))}
        </select>
      </div>

      {lastOrder && <OrderPlacedBanner order={lastOrder} onDismiss={onDismissLastOrder} />}

      {pager.items.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#152434] border border-[#CCE4F7] dark:border-[#253D56] rounded-2xl text-slate-500 shadow-xs">
          <ShoppingBag className="h-10 w-10 mx-auto text-slate-400 mb-2 opacity-50" />
          <p className="font-bold text-sm text-[#0F1D2B] dark:text-white">
            {isVi ? 'Không tìm thấy gói cước nào phù hợp.' : 'No matching plans found.'}
          </p>
          <p className="text-xs text-[#537292] dark:text-[#8DB0D4] mt-1">
            {isVi
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.'
              : 'Try adjusting your search keyword or selecting another category.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pager.items.map((plan) => (
              <PlanCard key={plan.id} plan={plan} isVi={isVi} onSubscribe={setOrderingPlan} />
            ))}
          </div>
          <Pagination {...pager.props} />
        </>
      )}

      {orderingPlan && (
        <NewServiceOrderModal
          plan={orderingPlan}
          onClose={() => setOrderingPlan(null)}
          onPlaced={(order) => {
            setOrderingPlan(null);
            onOrderPlaced(order);
          }}
        />
      )}
    </div>
  );
}
