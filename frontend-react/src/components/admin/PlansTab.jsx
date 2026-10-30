// Gói cước (Admin). Ngừng bán (Archived) thì gói biến mất khỏi trang Đăng ký và quầy bán lẻ
// (danh mục công khai chỉ có gói Active) nhưng đơn cũ vẫn giữ gói; xoá được khi chưa có đơn nào.
import { useState } from 'react';
import { Layers } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useServerAction } from '../../hooks/useServerAction';
import { getPlanName } from '../../lib/planI18n';
import { useStore } from '../../lib/store';
import ConfirmDialog from '../common/ConfirmDialog';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';
import CatalogTable from './CatalogTable';

const TYPES = ['Broadband', 'Dial-Up', 'Landline'];
const CYCLES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Hourly Pack'];

function PlanModal({ plan, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const isNew = !plan.id;
  const [form, setForm] = useState(() => ({
    name: plan.name ?? '',
    type: plan.type ?? 'Broadband',
    speedOrBandwidth: plan.speedOrBandwidth ?? '',
    monthlyRental: String(plan.monthlyRental ?? 0),
    securityDeposit: String(plan.securityDeposit ?? 0),
    hourlyCharge: String(plan.hourlyCharge ?? 0),
    includedHours: String(plan.includedHours ?? 0),
    dataLimit: plan.dataLimit ?? '',
    billingCycle: plan.billingCycle ?? 'Monthly',
    validity: plan.validity ?? '',
    callRates: plan.callRates ?? '',
    description: plan.description ?? '',
    isPopular: Boolean(plan.isPopular),
    status: plan.status === 'Archived' ? 'Archived' : 'Active',
  }));
  const { busy, run } = useServerAction(isVi);
  const set = (f) => (e) =>
    setForm((prev) => ({ ...prev, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      monthlyRental: Number(form.monthlyRental) || 0,
      securityDeposit: Number(form.securityDeposit) || 0,
      hourlyCharge: Number(form.hourlyCharge) || 0,
      includedHours: Math.round(Number(form.includedHours) || 0),
    };
    const ok = await run(
      () => (isNew ? nexusStore.addPlan(data) : nexusStore.updatePlan(plan.id, data)),
      isVi ? `Đã lưu gói ${form.name}.` : `Saved ${form.name}.`,
    );
    if (ok) onClose();
  };

  const money = (field, label) => (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={form[field]}
        onChange={set(field)}
        className={`${FIELD_CLS} font-mono`}
      />
    </div>
  );

  return (
    <ModalShell
      icon={Layers}
      iconClass="text-indigo-500"
      title={isNew ? (isVi ? 'Thêm gói cước' : 'Add plan') : isVi ? 'Sửa gói cước' : 'Edit plan'}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Tên gói *' : 'Name *'}</label>
            <input required maxLength={150} value={form.name} onChange={set('name')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Loại kết nối' : 'Connection type'}</label>
            <select value={form.type} onChange={set('type')} className={FIELD_CLS}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Tốc độ / băng thông' : 'Speed / bandwidth'}</label>
            <input
              maxLength={100}
              value={form.speedOrBandwidth}
              onChange={set('speedOrBandwidth')}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Chu kỳ cước' : 'Billing cycle'}</label>
            <select value={form.billingCycle} onChange={set('billingCycle')} className={FIELD_CLS}>
              {CYCLES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Thời hạn' : 'Validity'}</label>
            <input
              maxLength={50}
              value={form.validity}
              onChange={set('validity')}
              placeholder={isVi ? 'VD: 1 Month' : 'e.g. 1 Month'}
              className={FIELD_CLS}
            />
          </div>
          {money('monthlyRental', isVi ? 'Cước tháng ($)' : 'Monthly rental ($)')}
          {money('securityDeposit', isVi ? 'Tiền cọc ($)' : 'Deposit ($)')}
          {money('hourlyCharge', isVi ? 'Cước theo giờ ($)' : 'Hourly charge ($)')}
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Số giờ kèm theo' : 'Included hours'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.includedHours}
              onChange={set('includedHours')}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Giới hạn dữ liệu' : 'Data limit'}</label>
            <input
              maxLength={100}
              value={form.dataLimit}
              onChange={set('dataLimit')}
              placeholder="Unlimited"
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Trạng thái' : 'Status'}</label>
            <select value={form.status} onChange={set('status')} className={FIELD_CLS}>
              <option value="Active">{isVi ? 'Đang bán (Active)' : 'Active'}</option>
              <option value="Archived">{isVi ? 'Ngừng bán (Archived)' : 'Archived'}</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className={LABEL_CLS}>{isVi ? 'Giá cước gọi (gói thoại)' : 'Call rates (voice plans)'}</label>
            <input maxLength={500} value={form.callRates} onChange={set('callRates')} className={FIELD_CLS} />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className={LABEL_CLS}>{isVi ? 'Mô tả' : 'Description'}</label>
            <textarea
              rows={2}
              maxLength={500}
              value={form.description}
              onChange={set('description')}
              className={FIELD_CLS}
            ></textarea>
          </div>
          <label className="col-span-2 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={form.isPopular} onChange={set('isPopular')} />
            {isVi ? 'Đánh dấu "Phổ biến" trên trang chủ' : 'Mark as "Popular" on the home page'}
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow disabled:opacity-60"
          >
            {busy ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function PlansTab() {
  const language = useStore(languageStore.language);
  const isVi = language === 'vi';
  const plans = useStore(nexusStore.plans);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { busy, run } = useServerAction(isVi);

  const remove = async () => {
    const ok = await run(
      () => nexusStore.deletePlan(deleting.id),
      isVi ? `Đã xoá gói ${deleting.name}.` : `Deleted ${deleting.name}.`,
    );
    if (ok) setDeleting(null);
  };

  return (
    <>
      <CatalogTable
        items={plans}
        searchText={(p) => [p.name, p.speedOrBandwidth, p.id]}
        searchPlaceholder={isVi ? 'Tìm theo tên gói, tốc độ...' : 'Search plan name, speed...'}
        filter={{ get: (p) => p.type, allLabel: isVi ? 'Tất cả loại' : 'All types' }}
        addLabel={isVi ? 'Thêm gói cước' : 'Add plan'}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onDelete={setDeleting}
        columns={[
          {
            header: isVi ? 'Gói cước' : 'Plan',
            cell: (p) => (
              <>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {getPlanName(p, language)} {p.isPopular && <span className="ml-1 text-[10px] text-amber-600">★</span>}
                </div>
                <div className="font-mono text-[10px] text-slate-500">{p.id}</div>
              </>
            ),
          },
          { header: isVi ? 'Loại' : 'Type', cell: (p) => p.type },
          { header: isVi ? 'Tốc độ' : 'Speed', cell: (p) => p.speedOrBandwidth || '—' },
          {
            header: isVi ? 'Cước tháng' : 'Monthly',
            align: 'right',
            cell: (p) => <span className="font-mono">${Number(p.monthlyRental).toFixed(2)}</span>,
          },
          {
            header: isVi ? 'Cọc' : 'Deposit',
            align: 'right',
            cell: (p) => <span className="font-mono">${Number(p.securityDeposit).toFixed(2)}</span>,
          },
          { header: isVi ? 'Chu kỳ' : 'Cycle', cell: (p) => p.billingCycle || '—' },
          {
            header: isVi ? 'Trạng thái' : 'Status',
            cell: (p) => (
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  p.status === 'Archived'
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                }`}
              >
                {p.status === 'Archived' ? (isVi ? 'Ngừng bán' : 'Archived') : isVi ? 'Đang bán' : 'Active'}
              </span>
            ),
          },
        ]}
      />
      {editing && <PlanModal key={editing.id ?? 'new'} plan={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={isVi ? 'Xoá gói cước' : 'Delete plan'}
          message={
            isVi
              ? `Xoá "${deleting.name}"? Gói đã có đơn hàng thì không xoá được — hãy chuyển sang "Ngừng bán".`
              : `Delete "${deleting.name}"? Plans with orders cannot be deleted — archive them instead.`
          }
          busy={busy}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
