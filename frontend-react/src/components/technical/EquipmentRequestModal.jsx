// Gửi yêu cầu nhập thiết bị cho Admin khi kho chi nhánh thiếu hàng.
// Mở từ một đơn thì điền sẵn chi nhánh, số lượng và mặt hàng trong kho hợp với loại kết nối.
import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Truck } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { useStore } from '../../lib/store';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';

const DEVICE_TYPES = [
  'Fiber ONT Modem',
  'Gigabit Router',
  'VDSL2/ADSL Modem',
  'Analog Telephone Adapter',
  'Optical Splitter',
  'Patch Cord / SFP',
];
const CATEGORY_DEVICE_TYPE = {
  Router: 'Gigabit Router',
  'Fiber ONT': 'Fiber ONT Modem',
  'VoIP Adapter': 'Analog Telephone Adapter',
  Modem: 'VDSL2/ADSL Modem',
};
const CONNECTION_CATEGORY = { Broadband: 'Fiber ONT', Landline: 'VoIP Adapter', 'Dial-Up': 'Modem' };

function initialForm(order, inventory, shops, isVi) {
  const item = order ? inventory.find((i) => i.category === CONNECTION_CATEGORY[order.connectionType]) : undefined;
  const storeId = order?.retailOutletCode || shops[0]?.shopCode || '';
  return {
    storeId,
    inventoryId: item?.id ?? '',
    itemName: item?.name ?? '',
    deviceType: (item && CATEGORY_DEVICE_TYPE[item.category]) || DEVICE_TYPES[0],
    quantity: String(order ? Math.max(1, order.bulkConnectionsCount || 1) : 1),
    urgency: order ? 'High' : 'Normal',
    reason: order
      ? isVi
        ? `Kho chi nhánh ${storeId} hết thiết bị để cấp kết nối cho đơn hàng #${order.id}.`
        : `Branch ${storeId} is out of hardware to provision order #${order.id}.`
      : '',
  };
}

export default function EquipmentRequestModal({ order, onClose }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const inventory = useStore(nexusStore.inventory);
  const shops = useStore(nexusStore.retailShops);
  const [form, setForm] = useState(() => initialForm(order, inventory, shops, isVi));
  const [isSaving, setIsSaving] = useState(false);
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const pickCatalogItem = (e) => {
    const item = inventory.find((i) => i.id === e.target.value);
    setForm((prev) => ({
      ...prev,
      inventoryId: e.target.value,
      itemName: item?.name ?? prev.itemName,
      deviceType: (item && CATEGORY_DEVICE_TYPE[item.category]) || prev.deviceType,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await nexusStore.addEquipmentRequest({
        orderId: order?.id || null,
        storeId: form.storeId,
        inventoryId: form.inventoryId || null,
        itemName: form.itemName.trim(),
        deviceType: form.deviceType,
        quantity: Math.max(1, Number(form.quantity) || 1),
        urgency: form.urgency,
        reason: form.reason.trim() || null,
      });
      toast.success(isVi ? 'Đã gửi yêu cầu nhập hàng tới Admin.' : 'Equipment request sent to Admin.');
      onClose();
    } catch (err) {
      toast.error(technicalErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      icon={Truck}
      title={isVi ? 'Yêu cầu nhập hàng gửi Admin' : 'Equipment import request'}
      subtitle={
        order
          ? `${isVi ? 'Phục vụ đơn hàng' : 'For customer order'} #${order.id}`
          : isVi
            ? 'Admin xem xét và nhập hàng về chi nhánh.'
            : 'Admin reviews and restocks the branch.'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Chi nhánh nhận hàng *' : 'Destination store *'}</label>
            <select required value={form.storeId} onChange={set('storeId')} className={FIELD_CLS}>
              {shops.map((s) => (
                <option key={s.shopCode} value={s.shopCode}>
                  {s.name} ({s.shopCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Mức độ ưu tiên' : 'Urgency'}</label>
            <select value={form.urgency} onChange={set('urgency')} className={FIELD_CLS}>
              <option value="Normal">{isVi ? 'Bình thường' : 'Normal'}</option>
              <option value="High">{isVi ? 'Cao (đang có đơn chờ)' : 'High'}</option>
              <option value="Urgent">{isVi ? 'Khẩn cấp' : 'Urgent'}</option>
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>{isVi ? 'Chọn từ danh mục kho (tùy chọn)' : 'Catalog item (optional)'}</label>
          <select value={form.inventoryId} onChange={pickCatalogItem} className={FIELD_CLS}>
            <option value="">{isVi ? '-- Nhập tên thiết bị bên dưới --' : '-- Enter a custom item below --'}</option>
            {inventory.map((item) => (
              <option key={item.id} value={item.id}>
                {item.itemCode} — {item.name} ({item.category})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={LABEL_CLS}>{isVi ? 'Tên thiết bị / Model *' : 'Item / model *'}</label>
            <input required maxLength={150} value={form.itemName} onChange={set('itemName')} className={FIELD_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Số lượng *' : 'Quantity *'}</label>
            <input
              type="number"
              min="1"
              max="1000"
              required
              value={form.quantity}
              onChange={set('quantity')}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>{isVi ? 'Phân loại thiết bị' : 'Device type'}</label>
          <select value={form.deviceType} onChange={set('deviceType')} className={FIELD_CLS}>
            {DEVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>{isVi ? 'Lý do / Ghi chú cho Admin' : 'Reason / notes for Admin'}</label>
          <textarea
            rows={3}
            maxLength={500}
            value={form.reason}
            onChange={set('reason')}
            className={FIELD_CLS}
          ></textarea>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            {isSaving ? (isVi ? 'Đang gửi...' : 'Sending...') : isVi ? 'Gửi yêu cầu' : 'Submit request'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
