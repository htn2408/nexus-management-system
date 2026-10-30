// Nhà cung cấp thiết bị (Admin).
import { useState } from 'react';
import { Star, Truck } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useServerAction } from '../../hooks/useServerAction';
import { useStore } from '../../lib/store';
import ConfirmDialog from '../common/ConfirmDialog';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';
import CatalogTable from './CatalogTable';

const CATEGORIES = ['Modems & Routers', 'Fiber Optics & Cabling', 'Telecom Switches', 'Field Tooling'];
// Đúng các giá trị CHECK của bảng Vendor.
const STATUSES = ['Active', 'Pending Review', 'Terminated'];

function VendorModal({ vendor, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const isNew = !vendor.id;
  const [form, setForm] = useState(() => ({
    vendorCode: vendor.vendorCode ?? '',
    companyName: vendor.companyName ?? '',
    contactPerson: vendor.contactPerson ?? '',
    category: vendor.category ?? CATEGORIES[0],
    phone: vendor.phone ?? '',
    email: vendor.email ?? '',
    address: vendor.address ?? '',
    rating: String(vendor.rating ?? 5),
    status: STATUSES.includes(vendor.status) ? vendor.status : 'Active',
  }));
  const { busy, run } = useServerAction(isVi);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const data = { ...form, rating: Number(form.rating) };
    const ok = await run(
      () => (isNew ? nexusStore.addVendor(data) : nexusStore.updateVendor(vendor.id, data)),
      isVi ? `Đã lưu nhà cung cấp ${form.companyName}.` : `Saved ${form.companyName}.`,
    );
    if (ok) onClose();
  };

  return (
    <ModalShell
      icon={Truck}
      iconClass="text-indigo-500"
      title={isNew ? (isVi ? 'Thêm nhà cung cấp' : 'Add vendor') : isVi ? 'Sửa nhà cung cấp' : 'Edit vendor'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Tên công ty *' : 'Company *'}</label>
            <input
              required
              maxLength={150}
              value={form.companyName}
              onChange={set('companyName')}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Mã nhà cung cấp' : 'Vendor code'}</label>
            <input
              maxLength={20}
              value={form.vendorCode}
              onChange={set('vendorCode')}
              placeholder={isVi ? 'Để trống để tự sinh' : 'Blank = generated'}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Người liên hệ *' : 'Contact person *'}</label>
            <input
              required
              maxLength={100}
              value={form.contactPerson}
              onChange={set('contactPerson')}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Lĩnh vực' : 'Category'}</label>
            <select value={form.category} onChange={set('category')} className={FIELD_CLS}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Điện thoại' : 'Phone'}</label>
            <input maxLength={20} value={form.phone} onChange={set('phone')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Email</label>
            <input type="email" maxLength={100} value={form.email} onChange={set('email')} className={FIELD_CLS} />
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Địa chỉ' : 'Address'}</label>
            <input maxLength={255} value={form.address} onChange={set('address')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Đánh giá (1–5)' : 'Rating (1–5)'}</label>
            <input
              type="number"
              min="1"
              max="5"
              step="1"
              value={form.rating}
              onChange={set('rating')}
              className={FIELD_CLS}
            />
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

export default function VendorsTab() {
  const isVi = useStore(languageStore.language) === 'vi';
  const vendors = useStore(nexusStore.vendors);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { busy, run } = useServerAction(isVi);

  const remove = async () => {
    const ok = await run(
      () => nexusStore.deleteVendor(deleting.id),
      isVi ? `Đã xoá ${deleting.companyName}.` : `Deleted ${deleting.companyName}.`,
    );
    if (ok) setDeleting(null);
  };

  return (
    <>
      <CatalogTable
        items={vendors}
        searchText={(v) => [v.companyName, v.vendorCode, v.contactPerson, v.email]}
        searchPlaceholder={isVi ? 'Tìm theo tên công ty, mã, người liên hệ...' : 'Search company, code, contact...'}
        filter={{ get: (v) => v.category, allLabel: isVi ? 'Tất cả lĩnh vực' : 'All categories' }}
        addLabel={isVi ? 'Thêm nhà cung cấp' : 'Add vendor'}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onDelete={setDeleting}
        columns={[
          {
            header: isVi ? 'Nhà cung cấp' : 'Vendor',
            cell: (v) => (
              <>
                <div className="font-semibold text-slate-900 dark:text-white">{v.companyName}</div>
                <div className="font-mono text-[10px] text-slate-500">{v.vendorCode}</div>
              </>
            ),
          },
          { header: isVi ? 'Lĩnh vực' : 'Category', cell: (v) => v.category },
          {
            header: isVi ? 'Liên hệ' : 'Contact',
            cell: (v) => (
              <>
                <div>{v.contactPerson}</div>
                <div className="text-slate-500">
                  {v.phone} {v.email && `· ${v.email}`}
                </div>
              </>
            ),
          },
          {
            header: isVi ? 'Đánh giá' : 'Rating',
            cell: (v) => (
              <span className="inline-flex items-center gap-0.5 text-amber-500">
                <Star className="h-3 w-3 fill-current" />
                {v.rating}
              </span>
            ),
          },
          { header: isVi ? 'Trạng thái' : 'Status', cell: (v) => v.status },
        ]}
      />
      {editing && <VendorModal key={editing.id ?? 'new'} vendor={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={isVi ? 'Xoá nhà cung cấp' : 'Delete vendor'}
          message={
            isVi
              ? `Xoá "${deleting.companyName}"? Không xoá được nếu còn thiết bị hoặc đơn mua của nhà cung cấp này.`
              : `Delete "${deleting.companyName}"? Not possible while devices or purchase orders reference it.`
          }
          busy={busy}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
