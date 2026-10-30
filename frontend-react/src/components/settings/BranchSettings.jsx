// Chi nhánh làm việc. Admin chọn được chi nhánh ghi trên hồ sơ của mình; vai trò khác chỉ xem
// chi nhánh được gán cho tài khoản (chi nhánh này quyết định đơn hàng Retail nhìn thấy).
import { toast } from 'sonner';
import { Check, Lock, MapPin, Phone, ShieldAlert, User } from 'lucide-react';
import { authStore } from '../../context/AuthContext';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useStore } from '../../lib/store';

const ADMIN_BRANCH_KEY = 'nexus_active_branch';

function BranchCard({ shop, isSelected, isAdmin, isVi, onSelect }) {
  return (
    <div
      className={`rounded-xl border p-5 transition flex flex-col justify-between space-y-4 ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/30'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <span
              className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {shop.shopCode} • {isVi ? 'Mã vùng' : 'Area code'}: {shop.cityCode}
            </span>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">{shop.name}</h4>
          </div>
          {isSelected && (
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
              <Check className="h-3 w-3 mr-1" />
              {isVi ? 'Đang chọn' : 'Selected'}
            </span>
          )}
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-1">
          <div className="flex items-start space-x-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {shop.address}, {shop.city}
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>{shop.phone}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              {isVi ? 'Quản lý:' : 'Manager:'} {shop.managerName}
            </span>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <button
          type="button"
          onClick={() => onSelect(shop)}
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer ${
            isSelected
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          {isSelected && <Check className="h-3.5 w-3.5" />}
          <span>{isSelected ? (isVi ? 'Chi nhánh hiện tại' : 'Current Branch') : isVi ? 'Chọn chi nhánh này' : 'Pick this Branch'}</span>
        </button>
      ) : (
        <div
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 select-none ${
            isSelected
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-800 cursor-not-allowed opacity-75'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold">{isVi ? 'Chi nhánh của bạn' : 'Your Assigned Branch'}</span>
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>{isVi ? 'Chỉ Admin được đổi' : 'Admin Only'}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BranchSettings() {
  const user = useStore(authStore.currentUser);
  const retailShops = useStore(nexusStore.retailShops);
  const isVi = useStore(languageStore.language) === 'vi';
  const isAdmin = user?.role === 'admin';

  // Chi nhánh của tài khoản; Admin có thể đã chọn chi nhánh khác (lưu trên trình duyệt).
  // Vai trò khác luôn dùng chi nhánh của chính tài khoản, không đọc lựa chọn của Admin.
  const selectedCode = (isAdmin && localStorage.getItem(ADMIN_BRANCH_KEY)) || user?.branchCode || '';

  const selectBranch = (shop) => {
    localStorage.setItem(ADMIN_BRANCH_KEY, shop.shopCode);
    authStore.currentUser.update((u) =>
      u ? { ...u, branchCode: shop.shopCode, department: `${shop.name} (${shop.shopCode})` } : u,
    );
    toast.success(isVi ? `Đã chọn chi nhánh: ${shop.name}` : `Selected branch: ${shop.name}`);
  };

  return (
    <div className="space-y-5">
      {!isAdmin && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">
              {isVi ? 'Chỉ Quản trị viên (Admin) được phép chuyển đổi cơ sở' : 'Branch Switching Restricted to Admin'}
            </div>
            <div className="mt-0.5 text-amber-700 dark:text-amber-400">
              {isVi
                ? 'Tài khoản của bạn không có quyền thay đổi cơ sở hoạt động. Dưới đây là thông tin chi nhánh bạn đang trực thuộc.'
                : 'Your account does not have permission to switch operational branches. Below is your assigned branch information.'}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {retailShops.map((shop) => (
          <BranchCard
            key={shop.id}
            shop={shop}
            // branchCode có thể kèm tên ("SH-01 Flagship"), nên so theo mã chi nhánh có trong chuỗi.
            isSelected={selectedCode.toUpperCase().includes(shop.shopCode.toUpperCase())}
            isAdmin={isAdmin}
            isVi={isVi}
            onSelect={selectBranch}
          />
        ))}
      </div>
    </div>
  );
}
