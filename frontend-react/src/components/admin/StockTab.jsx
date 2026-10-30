// Kho vật tư (Admin): danh mục vật tư, ngưỡng đặt lại, đơn giá, nhà cung cấp.
// Số tồn chỉ nhập khi tạo; sau đó tăng qua "Nhập thêm hàng" (API restock) hoặc nhận đơn mua,
// giảm qua thao tác của Kỹ thuật — không gõ đè trực tiếp để số liệu kho có nguồn gốc.
import { useState } from 'react';
import { Package, PackagePlus } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useServerAction } from '../../hooks/useServerAction';
import { useStore } from '../../lib/store';
import ConfirmDialog from '../common/ConfirmDialog';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';
import CatalogTable from './CatalogTable';

const CATEGORIES = ['Modem', 'Router', 'Fiber ONT', 'Splitter', 'Patch Cord', 'VoIP Adapter'];

function StockModal({ item, vendors, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const isNew = !item.id;
  const [form, setForm] = useState(() => ({
    itemCode: item.itemCode ?? '',
    name: item.name ?? '',
    category: item.category ?? 'Modem',
    stockQuantity: String(item.stockQuantity ?? 0),
    reorderLevel: String(item.reorderLevel ?? 5),
    unitCost: String(item.unitCost ?? 0),
    location: item.location ?? '',
    vendorId: item.vendorId ?? '',
  }));
  const [restock, setRestock] = useState(() =>
    String(Math.max(1, (item.reorderLevel ?? 0) - (item.stockQuantity ?? 0)) || 10),
  );
  const { busy, run } = useServerAction(isVi);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      itemCode: form.itemCode.trim() || undefined,
      stockQuantity: Number(form.stockQuantity) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      unitCost: Number(form.unitCost) || 0,
      supplier: vendors.find((v) => v.id === form.vendorId)?.companyName,
    };
    const ok = await run(
      () => (isNew ? nexusStore.addInventoryItem(data) : nexusStore.updateInventoryItem(item.id, data)),
      isVi ? `Đã lưu vật tư ${form.name}.` : `Saved ${form.name}.`,
    );
    if (ok) onClose();
  };

  const doRestock = async () => {
    const qty = Number(restock);
    const ok = await run(
      () => nexusStore.restockInventoryItem(item.id, qty),
      isVi ? `Đã nhập thêm ${qty} × ${item.name}.` : `Restocked ${qty} × ${item.name}.`,
    );
    if (ok) onClose();
  };

  return (
    <ModalShell
      icon={Package}
      iconClass="text-indigo-500"
      title={isNew ? (isVi ? 'Thêm vật tư' : 'Add stock item') : isVi ? 'Sửa vật tư' : 'Edit stock item'}
      subtitle={item.itemCode}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Mã vật tư' : 'Item code'}</label>
            <input
              maxLength={50}
              value={form.itemCode}
              onChange={set('itemCode')}
              placeholder={isVi ? 'Để trống để tự sinh' : 'Blank = generated'}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Danh mục' : 'Category'}</label>
            <select value={form.category} onChange={set('category')} className={FIELD_CLS}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Tên vật tư *' : 'Name *'}</label>
            <input required maxLength={150} value={form.name} onChange={set('name')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Tồn kho' : 'In stock'}</label>
            <input
              type="number"
              min="0"
              step="1"
              disabled={!isNew}
              value={form.stockQuantity}
              onChange={set('stockQuantity')}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Ngưỡng đặt lại' : 'Reorder level'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.reorderLevel}
              onChange={set('reorderLevel')}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Đơn giá ($)' : 'Unit cost ($)'}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unitCost}
              onChange={set('unitCost')}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Vị trí kho' : 'Location'}</label>
            <input maxLength={100} value={form.location} onChange={set('location')} className={FIELD_CLS} />
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Nhà cung cấp' : 'Vendor'}</label>
            <select value={form.vendorId} onChange={set('vendorId')} className={FIELD_CLS}>
              <option value="">{isVi ? '— Chưa chọn —' : '— None —'}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.companyName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isNew && (
          <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isVi ? 'Nhập thêm hàng:' : 'Restock:'}
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={restock}
              onChange={(e) => setRestock(e.target.value)}
              className={`${FIELD_CLS} w-24`}
            />
            <button
              type="button"
              disabled={busy || !(Number(restock) >= 1)}
              onClick={doRestock}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
            >
              <PackagePlus className="h-3.5 w-3.5" />
              {isVi ? 'Nhập kho ngay' : 'Restock now'}
            </button>
            <span className="text-slate-500">
              {isVi ? `Tồn hiện tại: ${item.stockQuantity}` : `Current: ${item.stockQuantity}`}
            </span>
          </div>
        )}

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

export default function StockTab() {
  const isVi = useStore(languageStore.language) === 'vi';
  const inventory = useStore(nexusStore.inventory);
  const vendors = useStore(nexusStore.vendors);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { busy, run } = useServerAction(isVi);
  const lowStock = inventory.filter((i) => i.stockQuantity <= i.reorderLevel).length;

  const remove = async () => {
    const ok = await run(
      () => nexusStore.deleteInventoryItem(deleting.id),
      isVi ? `Đã xoá ${deleting.name}.` : `Deleted ${deleting.name}.`,
    );
    if (ok) setDeleting(null);
  };

  return (
    <>
      {lowStock > 0 && (
        <p className="mb-3 text-xs text-rose-600 dark:text-rose-400 font-semibold">
          {isVi ? `${lowStock} vật tư đã chạm ngưỡng đặt lại.` : `${lowStock} item(s) at or below the reorder level.`}
        </p>
      )}
      <CatalogTable
        items={inventory}
        searchText={(i) => [i.name, i.itemCode, i.location]}
        searchPlaceholder={isVi ? 'Tìm theo tên, mã vật tư, vị trí...' : 'Search name, code, location...'}
        filter={{ get: (i) => i.category, allLabel: isVi ? 'Tất cả danh mục' : 'All categories' }}
        addLabel={isVi ? 'Thêm vật tư' : 'Add item'}
        onAdd={() => setEditing({})}
        onEdit={setEditing}
        onDelete={setDeleting}
        columns={[
          {
            header: isVi ? 'Vật tư' : 'Item',
            cell: (i) => (
              <>
                <div className="font-semibold text-slate-900 dark:text-white">{i.name}</div>
                <div className="font-mono text-[10px] text-slate-500">{i.itemCode}</div>
              </>
            ),
          },
          { header: isVi ? 'Danh mục' : 'Category', cell: (i) => i.category },
          {
            header: isVi ? 'Tồn / Ngưỡng' : 'Stock / Reorder',
            align: 'right',
            cell: (i) => (
              <span className="font-mono">
                <span
                  className={
                    i.stockQuantity <= i.reorderLevel ? 'font-bold text-rose-600 dark:text-rose-400' : 'font-bold'
                  }
                >
                  {i.stockQuantity}
                </span>
                <span className="text-slate-400"> / {i.reorderLevel}</span>
              </span>
            ),
          },
          {
            header: isVi ? 'Đơn giá' : 'Unit cost',
            align: 'right',
            cell: (i) => <span className="font-mono">${Number(i.unitCost).toFixed(2)}</span>,
          },
          { header: isVi ? 'Vị trí' : 'Location', cell: (i) => i.location || '—' },
          {
            header: isVi ? 'Nhà cung cấp' : 'Vendor',
            cell: (i) => vendors.find((v) => v.id === i.vendorId)?.companyName ?? '—',
          },
        ]}
      />
      {editing && (
        <StockModal key={editing.id ?? 'new'} item={editing} vendors={vendors} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title={isVi ? 'Xoá vật tư' : 'Delete stock item'}
          message={
            isVi
              ? `Xoá "${deleting.name}" (${deleting.itemCode}) khỏi kho?`
              : `Delete "${deleting.name}" (${deleting.itemCode})?`
          }
          busy={busy}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
