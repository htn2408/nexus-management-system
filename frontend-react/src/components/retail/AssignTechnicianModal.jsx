// Phân công kỹ thuật viên hiện trường khảo sát một đơn đã được chi nhánh duyệt.
// Gợi ý sẵn KTV đã gán trước đó, hoặc KTV thuộc chi nhánh của đơn.
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Search, UserCheck, Wrench, X } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useStore } from '../../lib/store';

function initialsOf(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

function pickDefault(order, technicians) {
  if (order.assignedTechnicianId && technicians.some((t) => t.id === order.assignedTechnicianId)) {
    return order.assignedTechnicianId;
  }
  const byName = technicians.find((t) => t.name === order.assignedTechnician);
  const byBranch = technicians.find((t) => t.retailShopAssigned?.includes(order.retailOutletCode));
  return (byName ?? byBranch ?? technicians[0])?.id ?? '';
}

export default function AssignTechnicianModal({ order, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const employees = useStore(nexusStore.employees);
  const orders = useStore(nexusStore.orders);

  const technicians = employees.filter(
    (e) => (e.role === 'Field Engineer' || e.department === 'Technical Operations') && e.status === 'Active',
  );
  const [selectedId, setSelectedId] = useState(() => pickDefault(order, technicians));
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const q = query.trim().toLowerCase();
  const shown = technicians.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.employeeCode.toLowerCase().includes(q) || t.retailShopAssigned?.toLowerCase().includes(q),
  );
  // Số đơn đang chờ khảo sát mà KTV đó phụ trách.
  const pendingCount = (tech) => orders.filter((o) => o.assignedTechnician === tech.name && o.status === 'Pending').length;

  const confirm = async () => {
    const tech = technicians.find((t) => t.id === selectedId);
    if (!tech) {
      toast.error(isVi ? 'Vui lòng chọn kỹ thuật viên khảo sát!' : 'Please select a survey technician!');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await nexusStore.assignTechnicianToOrder(order.id, tech.name, tech.id, tech.phone, notes.trim() || undefined);
      if (!updated) {
        toast.error(isVi ? 'Đơn này chưa được duyệt hoặc không còn tồn tại.' : 'This order is not approved or no longer exists.');
        return;
      }
      toast.success(
        isVi
          ? `Đã phân công kỹ thuật viên ${tech.name} (${tech.employeeCode}) đảm nhiệm khảo sát đơn ${order.id}!`
          : `Assigned technician ${tech.name} (${tech.employeeCode}) for order ${order.id}!`,
      );
      onClose();
    } catch {
      toast.error(isVi ? 'Không thể lưu phân công kỹ thuật viên. Vui lòng thử lại.' : 'Technician assignment could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                <span>{isVi ? 'Phân công kỹ thuật viên khảo sát' : 'Assign Survey Field Engineer'}</span>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-white/20 font-bold">{order.id}</span>
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                {isVi
                  ? 'Chỉ định kỹ thuật viên hiện trường chịu trách nhiệm đo kiểm cáp & hộp chia DP'
                  : 'Designate a field engineer to perform line feasibility and DP box testing'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block">{isVi ? 'Khách hàng:' : 'Customer:'}</span>
              <strong className="text-slate-900 dark:text-white text-sm">{order.customerName}</strong>
              <span className="font-mono text-slate-500 block">{order.customerPhone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{isVi ? 'Địa chỉ lắp đặt:' : 'Installation Address:'}</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">{order.installationAddress}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{isVi ? 'Dịch vụ & Gói cước:' : 'Plan & Service:'}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {order.connectionType}
                </span>
                <strong className="text-slate-900 dark:text-white">{order.planName}</strong>
              </div>
            </div>
            <div>
              <span className="text-slate-500 block">{isVi ? 'Điểm quầy phụ trách:' : 'Branch Desk:'}</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{order.retailOutletCode}</span>
              <span className="text-slate-500 text-[11px]"> ({order.retailEmployeeName})</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span>{isVi ? 'Chọn kỹ thuật viên đảm nhiệm (*)' : 'Select Field Engineer (*)'}</span>
              </span>
              <div className="relative max-w-xs w-full">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isVi ? 'Tìm kỹ thuật viên...' : 'Search tech...'}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {shown.map((tech) => {
                const isSelected = selectedId === tech.id;
                const pending = pendingCount(tech);
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => setSelectedId(tech.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-300 dark:border-emerald-800">
                          {initialsOf(tech.name)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{tech.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">({tech.employeeCode})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{tech.phone}</div>
                        </div>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 truncate max-w-[130px]">{tech.retailShopAssigned || tech.department}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                          pending === 0
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : pending <= 2
                              ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {pending === 0
                          ? isVi
                            ? 'Sẵn sàng (0 việc)'
                            : 'Free (0 tasks)'
                          : isVi
                            ? `${pending} việc đang chờ`
                            : `${pending} active`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1">
              {isVi ? 'Ghi chú khảo sát / Hướng dẫn thêm (Tùy chọn):' : 'Survey Instructions / Notes (Optional):'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                isVi
                  ? 'Ví dụ: Khách yêu cầu đo kiểm cáp trước 11h trưa, kiểm tra hộp chia DP tầng 3...'
                  : 'e.g., Customer requested morning appointment, inspect DP box on 3rd floor...'
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              {isVi ? 'Hủy bỏ' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-md flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Xác nhận phân công' : 'Confirm Assignment'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
