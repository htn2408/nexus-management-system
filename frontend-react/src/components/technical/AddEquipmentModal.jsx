// Đăng ký một thiết bị thật vào kho: serial và MAC lấy từ nhãn trên thiết bị, không tự sinh.
import { useState } from 'react';
import { toast } from 'sonner';
import { HardDrive } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { useStore } from '../../lib/store';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';

const MAC_PATTERN = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
const DEVICE_TYPES = ['Gigabit Router', 'Fiber ONT Modem', 'VDSL2/ADSL Modem', 'Analog Telephone Adapter'];

export default function AddEquipmentModal({ onClose, onSaved }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const inventory = useStore(nexusStore.inventory);
  const shops = useStore(nexusStore.retailShops);
  const catalog = inventory.filter((item) => item.vendorId);

  const [form, setForm] = useState({
    inventoryId: catalog[0]?.id ?? '',
    storeId: shops[0]?.shopCode ?? '',
    serialNumber: '',
    macAddress: '',
    deviceModel: catalog[0]?.name ?? '',
    deviceType: DEVICE_TYPES[0],
    firmwareVersion: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!MAC_PATTERN.test(form.macAddress.trim())) {
      toast.error(
        isVi ? 'Địa chỉ MAC phải có dạng AA:BB:CC:DD:EE:FF.' : 'MAC address must look like AA:BB:CC:DD:EE:FF.',
      );
      return;
    }
    setIsSaving(true);
    try {
      const item = inventory.find((i) => i.id === form.inventoryId);
      await nexusStore.addEquipment({
        ...form,
        serialNumber: form.serialNumber.trim(),
        macAddress: form.macAddress.trim().toUpperCase(),
        deviceModel: form.deviceModel.trim(),
        firmwareVersion: form.firmwareVersion.trim() || undefined,
        vendorId: item?.vendorId ?? '',
        status: 'In Stock',
      });
      toast.success(isVi ? `Đã lưu thiết bị ${form.serialNumber} vào kho.` : `Equipment ${form.serialNumber} saved.`);
      onClose();
      await onSaved();
    } catch (err) {
      toast.error(technicalErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      icon={HardDrive}
      title={isVi ? 'Đăng ký thiết bị phần cứng vào kho' : 'Log hardware into stock'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Mặt hàng kho *' : 'Inventory item *'}</label>
            <select
              required
              value={form.inventoryId}
              onChange={(e) => {
                const item = inventory.find((i) => i.id === e.target.value);
                setForm((prev) => ({
                  ...prev,
                  inventoryId: e.target.value,
                  deviceModel: item?.name ?? prev.deviceModel,
                }));
              }}
              className={FIELD_CLS}
            >
              <option value="" disabled>
                {isVi ? 'Chọn mặt hàng' : 'Select item'}
              </option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.itemCode} — {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Chi nhánh quản lý *' : 'Assigned store *'}</label>
            <select required value={form.storeId} onChange={set('storeId')} className={FIELD_CLS}>
              <option value="" disabled>
                {isVi ? 'Chọn chi nhánh' : 'Select store'}
              </option>
              {shops.map((shop) => (
                <option key={shop.shopCode} value={shop.shopCode}>
                  {shop.shopCode} — {shop.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Số serial *' : 'Serial number *'}</label>
            <input
              required
              maxLength={50}
              value={form.serialNumber}
              onChange={set('serialNumber')}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Địa chỉ MAC *' : 'MAC address *'}</label>
            <input
              required
              maxLength={17}
              value={form.macAddress}
              onChange={set('macAddress')}
              placeholder="AA:BB:CC:DD:EE:FF"
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>{isVi ? 'Tên model thiết bị *' : 'Device model *'}</label>
          <input
            required
            maxLength={150}
            value={form.deviceModel}
            onChange={set('deviceModel')}
            className={FIELD_CLS}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Loại thiết bị' : 'Device type'}</label>
            <select value={form.deviceType} onChange={set('deviceType')} className={FIELD_CLS}>
              {DEVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Phiên bản firmware' : 'Firmware version'}</label>
            <input
              maxLength={50}
              value={form.firmwareVersion}
              onChange={set('firmwareVersion')}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow disabled:opacity-60"
          >
            {isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu vào kho' : 'Save to stock'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
