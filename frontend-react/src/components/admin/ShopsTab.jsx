// Chi nhánh bán lẻ (Admin). Số nhân viên và số thuê bao đếm từ dữ liệu thật
// (nhân viên gắn chi nhánh, kết nối thuộc đơn của chi nhánh), không nhập tay.
import { useState } from 'react';
import { Store } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useBranchCounts } from '../../hooks/useBranchCounts';
import { useServerAction } from '../../hooks/useServerAction';
import { useStore } from '../../lib/store';
import ConfirmDialog from '../common/ConfirmDialog';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';
import CatalogTable from './CatalogTable';

// Đúng các giá trị CHECK của bảng RetailStore.
const STATUSES = ['Active', 'Renovating', 'Closed'];

function ShopModal({ shop, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const isNew = !shop.id;
  const [form, setForm] = useState(() => ({
    shopCode: shop.shopCode ?? '',
    name: shop.name ?? '',
    city: shop.city ?? '',
    cityCode: shop.cityCode ?? '',
    address: shop.address ?? '',
    managerName: shop.managerName ?? '',
    phone: shop.phone ?? '',
    email: shop.email ?? '',
    operatingHours: shop.operatingHours ?? '08:00 - 20:00',
    status: STATUSES.includes(shop.status) ? shop.status : 'Active',
  }));
  const { busy, run } = useServerAction(isVi);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(
      () => (isNew ? nexusStore.addRetailShop(form) : nexusStore.updateRetailShop(shop.id, form)),
      isVi ? `Đã lưu chi nhánh ${form.name}.` : `Saved ${form.name}.`,
    );
    if (ok) onClose();
  };

  return (
    <ModalShell
      icon={Store}
      iconClass="text-indigo-500"
      title={isNew ? (isVi ? 'Thêm chi nhánh' : 'Add branch') : isVi ? 'Sửa chi nhánh' : 'Edit branch'}
      subtitle={shop.shopCode}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Mã chi nhánh' : 'Branch code'}</label>
            <input
              maxLength={20}
              disabled={!isNew}
              value={form.shopCode}
              onChange={set('shopCode')}
              placeholder={isVi ? 'VD: SH-05 (trống = tự sinh)' : 'e.g. SH-05 (blank = generated)'}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Trạng thái' : 'Status'}</label>
            <select value={form.status} onChange={set('status')} className={FIELD_CLS}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Tên chi nhánh *' : 'Name *'}</label>
            <input required maxLength={150} value={form.name} onChange={set('name')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Thành phố *' : 'City *'}</label>
            <input required maxLength={100} value={form.city} onChange={set('city')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Mã thành phố (3 số) *' : 'City code (3 digits) *'}</label>
            <input
              required
              pattern="\d{3}"
              maxLength={3}
              value={form.cityCode}
              onChange={set('cityCode')}
              title={isVi ? 'Dùng trong mã tài khoản, VD 064' : 'Used in account IDs, e.g. 064'}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Địa chỉ *' : 'Address *'}</label>
            <input required maxLength={255} value={form.address} onChange={set('address')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Quản lý chi nhánh' : 'Manager'}</label>
            <input maxLength={100} value={form.managerName} onChange={set('managerName')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Giờ mở cửa' : 'Opening hours'}</label>
            <input maxLength={100} value={form.operatingHours} onChange={set('operatingHours')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Điện thoại' : 'Phone'}</label>
            <input maxLength={50} value={form.phone} onChange={set('phone')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Email</label>
            <input type="email" maxLength={150} value={form.email} onChange={set('email')} className={FIELD_CLS} />
          </div>
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

export default function ShopsTab() {
  const isVi = useStore(languageStore.language) === 'vi';
  const shops = useStore(nexusStore.retailShops);
  const countsFor = useBranchCounts();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { busy, run } = useServerAction(isVi);

  const remove = async () => {
    const ok = await run(
      () => nexusStore.deleteRetailShop(deleting.id),
      isVi ? `Đã xoá ${deleting.name}.` : `Deleted ${deleting.name}.`,
    );
    if (ok) setDeleting(null);
  };

  return (
    <>
      <CatalogTable
        items={shops}
        rowKey={(s) => s.shopCode}
        searchText={(s) => [s.name, s.shopCode, s.city, s.managerName]}
        searchPlaceholder={isVi ? 'Tìm theo tên, mã, thành phố, quản lý...' : 'Search name, code, city, manager...'}
        filter={{ get: (s) => s.city, allLabel: isVi ? 'Tất cả thành phố' : 'All cities' }}
        pageSize={6}
        addLabel={isVi ? 'Thêm chi nhánh' : 'Add branch'}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onDelete={setDeleting}
        columns={[
          {
            header: isVi ? 'Chi nhánh' : 'Branch',
            cell: (s) => (
              <>
                <div className="font-semibold text-slate-900 dark:text-white">{s.name}</div>
                <div className="font-mono text-[10px] text-slate-500">{s.shopCode}</div>
              </>
            ),
          },
          {
            header: isVi ? 'Địa chỉ' : 'Address',
            cell: (s) => (
              <>
                <div>{s.address}</div>
                <div className="text-slate-500">
                  {s.city} · {isVi ? 'mã' : 'code'} {s.cityCode}
                </div>
              </>
            ),
          },
          {
            header: isVi ? 'Quản lý / Liên hệ' : 'Manager / Contact',
            cell: (s) => (
              <>
                <div>{s.managerName || '—'}</div>
                <div className="text-slate-500">{s.phone}</div>
              </>
            ),
          },
          {
            header: isVi ? 'Nhân viên' : 'Staff',
            align: 'right',
            cell: (s) => <span className="font-mono">{countsFor(s.shopCode).staff}</span>,
          },
          {
            header: isVi ? 'Thuê bao' : 'Subscribers',
            align: 'right',
            cell: (s) => <span className="font-mono">{countsFor(s.shopCode).subscribers}</span>,
          },
          { header: isVi ? 'Trạng thái' : 'Status', cell: (s) => s.status },
        ]}
      />
      {editing && <ShopModal key={editing.id ?? 'new'} shop={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={isVi ? 'Xoá chi nhánh' : 'Delete branch'}
          message={
            isVi
              ? `Xoá "${deleting.name}" (${deleting.shopCode})? Không xoá được nếu chi nhánh đã có đơn hàng, đơn mua hoặc yêu cầu nhập hàng; khi đó hãy chuyển trạng thái sang Closed.`
              : `Delete "${deleting.name}" (${deleting.shopCode})? Not possible once it has orders, purchase orders or equipment requests; set it to Closed instead.`
          }
          busy={busy}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
