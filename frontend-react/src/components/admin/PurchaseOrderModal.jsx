// Tạo đơn mua thiết bị từ nhà cung cấp (có thể điền sẵn từ một yêu cầu nhập hàng của Kỹ thuật).
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { useServerAction } from '../../hooks/useServerAction';
import { useStore } from '../../lib/store';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';

const CATEGORIES = ['Modem', 'Router', 'Fiber ONT', 'Splitter', 'Patch Cord', 'VoIP Adapter'];

export default function PurchaseOrderModal({ fromRequest, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const vendors = useStore(nexusStore.vendors);
  const shops = useStore(nexusStore.retailShops);
  const inventory = useStore(nexusStore.inventory);
  const [form, setForm] = useState(() => {
    const item = fromRequest?.inventoryId ? inventory.find((i) => i.id === fromRequest.inventoryId) : null;
    return {
      vendorId: item?.vendorId || vendors[0]?.id || '',
      storeId: fromRequest?.storeId ?? '',
      itemCode: item?.itemCode ?? '',
      itemName: fromRequest?.itemName ?? item?.name ?? '',
      category: item?.category ?? 'Modem',
      quantity: String(fromRequest?.quantity ?? 10),
      unitCost: String(item?.unitCost ?? 0),
      expectedDate: '',
      notes: fromRequest
        ? isVi
          ? `Theo yêu cầu nhập hàng #${fromRequest.id}${fromRequest.orderId ? ` (đơn ${fromRequest.orderId})` : ''}`
          : `For equipment request #${fromRequest.id}${fromRequest.orderId ? ` (order ${fromRequest.orderId})` : ''}`
        : '',
    };
  });
  const { busy, run } = useServerAction(isVi);
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));
  const total = (Number(form.quantity) || 0) * (Number(form.unitCost) || 0);

  const pickItem = (e) => {
    const item = inventory.find((i) => i.itemCode === e.target.value);
    setForm((prev) =>
      item
        ? {
            ...prev,
            itemCode: item.itemCode,
            itemName: item.name,
            category: item.category,
            unitCost: String(item.unitCost ?? 0),
            vendorId: item.vendorId || prev.vendorId,
          }
        : { ...prev, itemCode: e.target.value },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    const ok = await run(
      () =>
        nexusStore.addPurchaseOrder({
          vendorId: form.vendorId,
          storeId: form.storeId || undefined,
          itemCode: form.itemCode.trim(),
          itemName: form.itemName.trim(),
          category: form.category,
          quantity: Math.round(Number(form.quantity) || 1),
          unitCost: Number(form.unitCost) || 0,
          expectedDate: form.expectedDate || undefined,
          notes: form.notes.trim() || undefined,
        }),
      isVi ? 'Đã tạo đơn mua thiết bị.' : 'Purchase order created.',
    );
    if (ok) onClose();
  };

  return (
    <ModalShell
      icon={ShoppingCart}
      iconClass="text-indigo-500"
      title={isVi ? 'Tạo đơn mua thiết bị' : 'New purchase order'}
      subtitle={isVi ? 'Nhận hàng sẽ tự cộng vào kho.' : 'Receiving it restocks inventory.'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Nhà cung cấp *' : 'Vendor *'}</label>
            <select required value={form.vendorId} onChange={set('vendorId')} className={FIELD_CLS}>
              <option value="" disabled>
                {isVi ? 'Chọn nhà cung cấp' : 'Pick a vendor'}
              </option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.companyName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Mã vật tư *' : 'Item code *'}</label>
            <input
              required
              list="po-items"
              maxLength={50}
              value={form.itemCode}
              onChange={pickItem}
              className={`${FIELD_CLS} font-mono`}
            />
            <datalist id="po-items">
              {inventory.map((i) => (
                <option key={i.id} value={i.itemCode}>
                  {i.name}
                </option>
              ))}
            </datalist>
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
            <label className={LABEL_CLS}>{isVi ? 'Tên vật tư *' : 'Item name *'}</label>
            <input required maxLength={150} value={form.itemName} onChange={set('itemName')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Số lượng *' : 'Quantity *'}</label>
            <input
              required
              type="number"
              min="1"
              max="100000"
              step="1"
              value={form.quantity}
              onChange={set('quantity')}
              className={`${FIELD_CLS} font-mono`}
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
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Giao về chi nhánh' : 'Deliver to branch'}</label>
            <select value={form.storeId} onChange={set('storeId')} className={FIELD_CLS}>
              <option value="">{isVi ? 'Kho tổng' : 'Central stock'}</option>
              {shops.map((s) => (
                <option key={s.shopCode} value={s.shopCode}>
                  {s.name} ({s.shopCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Ngày dự kiến nhận' : 'Expected date'}</label>
            <input type="date" value={form.expectedDate} onChange={set('expectedDate')} className={FIELD_CLS} />
          </div>
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Ghi chú' : 'Notes'}</label>
            <textarea
              rows={2}
              maxLength={500}
              value={form.notes}
              onChange={set('notes')}
              className={FIELD_CLS}
            ></textarea>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-slate-500">
            {isVi ? 'Thành tiền:' : 'Total:'}{' '}
            <span className="font-mono font-bold text-slate-900 dark:text-white">${total.toFixed(2)}</span>
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={CANCEL_BTN}>
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow disabled:opacity-60"
            >
              {busy ? (isVi ? 'Đang tạo...' : 'Creating...') : isVi ? 'Tạo đơn mua' : 'Create order'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
