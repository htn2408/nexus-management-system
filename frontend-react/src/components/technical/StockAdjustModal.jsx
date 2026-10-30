// Nhập / xuất vật tư: số âm là xuất kho, bắt buộc ghi lý do.
import { useState } from 'react';
import { toast } from 'sonner';
import { PackageOpen } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { adjustInventoryStock } from '../../lib/technicalApi';
import { useStore } from '../../lib/store';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';

export default function StockAdjustModal({ item, direction, onClose, onSaved }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [change, setChange] = useState(String(direction));
  const [reason, setReason] = useState(
    direction > 0 ? (isVi ? 'Nhập thêm vật tư kỹ thuật' : 'Restock') : isVi ? 'Xuất vật tư kỹ thuật' : 'Issue to field',
  );
  const [isSaving, setIsSaving] = useState(false);
  const value = Number(change);

  const submit = async (e) => {
    e.preventDefault();
    if (!Number.isInteger(value) || value === 0) return;
    setIsSaving(true);
    try {
      const result = await adjustInventoryStock(item.id, { quantityChange: value, reason: reason.trim() });
      toast.success(
        isVi
          ? `Tồn kho mới của ${item.itemCode}: ${result.stockQuantity}.`
          : `New stock for ${item.itemCode}: ${result.stockQuantity}.`,
      );
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
      icon={PackageOpen}
      title={isVi ? 'Điều chỉnh tồn kho' : 'Adjust inventory'}
      subtitle={`${item.itemCode} — ${item.name} · ${isVi ? 'Tồn hiện tại' : 'In stock'}: ${item.stockQuantity}`}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="stock-change" className={LABEL_CLS}>
            {isVi ? 'Số lượng thay đổi (âm là xuất kho)' : 'Quantity change (negative removes stock)'}
          </label>
          <input
            id="stock-change"
            type="number"
            step="1"
            required
            min="-1000000"
            max="1000000"
            value={change}
            onChange={(e) => setChange(e.target.value)}
            className={`${FIELD_CLS} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="stock-reason" className={LABEL_CLS}>
            {isVi ? 'Lý do *' : 'Reason *'}
          </label>
          <textarea
            id="stock-reason"
            required
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={FIELD_CLS}
          ></textarea>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving || !Number.isInteger(value) || value === 0}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow disabled:opacity-60"
          >
            {isVi ? 'Xác nhận' : 'Confirm'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
