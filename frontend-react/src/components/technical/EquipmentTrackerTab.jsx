// Tab Thiết bị: danh sách thiết bị CPE (serial, MAC, thuê bao đang dùng) và tồn kho vật tư.
import { useState } from 'react';
import { toast } from 'sonner';
import { PackageOpen, Search } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { usePagination } from '../../hooks/usePagination';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { updateEquipment } from '../../lib/technicalApi';
import { useStore } from '../../lib/store';
import Pagination from '../common/Pagination';
import StockAdjustModal from './StockAdjustModal';

const STATUS_CHIP = {
  'In Service':
    'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  'In Stock': 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  Maintenance:
    'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  Faulty: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
};
const STATUS_VI = {
  'In Service': 'Đang lắp đặt',
  'In Stock': 'Trong kho',
  Maintenance: 'Bảo trì',
  Faulty: 'Hỏng / Lỗi',
};

export default function EquipmentTrackerTab({ onSaved }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const equipments = useStore(nexusStore.equipments);
  const inventory = useStore(nexusStore.inventory);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);
  const [adjusting, setAdjusting] = useState(null);

  const q = search.trim().toLowerCase();
  const filtered = equipments.filter(
    (eq) =>
      (statusFilter === 'All' || eq.status === statusFilter) &&
      (!q ||
        eq.serialNumber.toLowerCase().includes(q) ||
        eq.macAddress.toLowerCase().includes(q) ||
        eq.deviceModel.toLowerCase().includes(q) ||
        (eq.assignedAccountId ?? '').toLowerCase().includes(q)),
  );
  const eqPager = usePagination(filtered, 10);
  const invPager = usePagination(inventory, 8);
  const label = (status) => (isVi ? (STATUS_VI[status] ?? status) : status);

  const changeStatus = async (eq, status) => {
    if (eq.status === status) return;
    setBusyId(eq.id);
    try {
      await updateEquipment(eq.id, { status });
      toast.success(
        isVi ? `Đã cập nhật trạng thái thiết bị ${eq.serialNumber}.` : `Equipment ${eq.serialNumber} updated.`,
      );
      await onSaved();
    } catch (err) {
      toast.error(technicalErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const tiles = [
    {
      label: isVi ? 'Tổng thiết bị CPE' : 'Total CPE units',
      value: equipments.length,
      tone: 'text-slate-900 dark:text-white',
    },
    {
      label: isVi ? 'Đã lắp đặt / Đang dùng' : 'Deployed / In service',
      value: equipments.filter((e) => e.status === 'In Service').length,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: isVi ? 'Sẵn có trong kho' : 'Available in stock',
      value: equipments.filter((e) => e.status === 'In Stock').length,
      tone: 'text-blue-600 dark:text-blue-400',
    },
  ];
  const headers = [
    isVi ? 'Số serial' : 'Serial',
    isVi ? 'Địa chỉ MAC' : 'MAC Address',
    isVi ? 'Model & Loại' : 'Model & Type',
    'Firmware',
    isVi ? 'Mã tài khoản' : 'Account ID',
    isVi ? 'Thuê bao' : 'Subscriber',
    isVi ? 'Trạng thái' : 'Status',
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">{t.label}</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${t.tone}`}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              isVi ? 'Tìm theo Serial, MAC, Model, Mã tài khoản...' : 'Search by serial, MAC, model, account...'
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              eqPager.setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            eqPager.setPage(1);
          }}
          className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="All">{isVi ? 'Tất cả trạng thái' : 'All statuses'}</option>
          {Object.keys(STATUS_CHIP).map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center font-sans text-sm text-slate-500">
                    {isVi ? 'Không có thiết bị nào khớp.' : 'No equipment matches.'}
                  </td>
                </tr>
              ) : (
                eqPager.items.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{eq.serialNumber}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{eq.macAddress}</td>
                    <td className="px-4 py-3 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-white">{eq.deviceModel}</div>
                      <div className="text-[11px] text-slate-500">{eq.deviceType}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{eq.firmwareVersion || '—'}</td>
                    <td className="px-4 py-3">
                      {eq.assignedAccountId ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400">{eq.assignedAccountId}</span>
                      ) : (
                        <span className="text-slate-400">{isVi ? 'CHƯA GÁN' : 'UNASSIGNED'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-700 dark:text-slate-300">
                      {eq.assignedCustomerName || '—'}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_CHIP[eq.status] ?? STATUS_CHIP.Faulty}`}
                      >
                        {label(eq.status)}
                      </span>
                      {/* Thiết bị đang gắn cho thuê bao chỉ đổi trạng thái qua thao tác trên kết nối. */}
                      {eq.status !== 'In Service' && (
                        <select
                          value={eq.status}
                          disabled={busyId === eq.id}
                          onChange={(e) => changeStatus(eq, e.target.value)}
                          className="block mt-1.5 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5"
                        >
                          <option value="In Stock">{label('In Stock')}</option>
                          <option value="Maintenance">{label('Maintenance')}</option>
                          <option value="Faulty">{label('Faulty')}</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination {...eqPager.props} />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <PackageOpen className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isVi ? 'Tồn kho vật tư kỹ thuật' : 'Technical inventory'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-2.5">{isVi ? 'Mã vật tư' : 'Item'}</th>
                <th className="px-4 py-2.5">{isVi ? 'Tên' : 'Name'}</th>
                <th className="px-4 py-2.5">{isVi ? 'Vị trí' : 'Location'}</th>
                <th className="px-4 py-2.5 text-right">{isVi ? 'Tồn / Mức đặt lại' : 'Stock / Reorder'}</th>
                <th className="px-4 py-2.5 text-right">{isVi ? 'Điều chỉnh' : 'Adjust'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invPager.items.map((item) => {
                const low = item.stockQuantity <= item.reorderLevel;
                return (
                  <tr key={item.id} className={low ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}>
                    <td className="px-4 py-3 font-mono font-semibold text-amber-600">{item.itemCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.supplier || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.location || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={`font-bold ${low ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {item.stockQuantity}
                      </span>
                      <span className="text-slate-400"> / {item.reorderLevel}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setAdjusting({ item, direction: -1 })}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        − {isVi ? 'Xuất' : 'Issue'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjusting({ item, direction: 1 })}
                        className="px-2 py-1 rounded border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                      >
                        + {isVi ? 'Nhập' : 'Restock'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination {...invPager.props} />

      {adjusting && (
        <StockAdjustModal
          item={adjusting.item}
          direction={adjusting.direction}
          onClose={() => setAdjusting(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
