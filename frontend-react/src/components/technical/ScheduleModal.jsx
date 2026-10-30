// Lên lịch lắp đặt cho đơn đã khả thi; server từ chối thời điểm trong quá khứ.
import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { updateInstallationSchedule } from '../../lib/technicalApi';
import { useStore } from '../../lib/store';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';

// Giá trị cho <input type="datetime-local"> theo giờ máy người dùng.
const toLocalInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export default function ScheduleModal({ order, engineerId, engineerName, onClose, onSaved }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const [minValue] = useState(() => toLocalInput(new Date()));
  const [value, setValue] = useState(() =>
    toLocalInput(
      order.scheduledInstallDate ? new Date(order.scheduledInstallDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateInstallationSchedule(order.id, {
        scheduledInstallDate: value,
        technicianId: engineerId || undefined,
      });
      toast.success(
        isVi ? `Đã lên lịch lắp đặt cho đơn ${order.id}.` : `Installation scheduled for order ${order.id}.`,
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
      icon={CalendarClock}
      iconClass="text-blue-500"
      title={isVi ? 'Lên lịch lắp đặt' : 'Schedule installation'}
      subtitle={`#${order.id} — ${order.customerName} · ${order.installationAddress}`}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="scheduled-install-date" className={LABEL_CLS}>
            {isVi ? 'Ngày giờ lắp đặt' : 'Installation date and time'}
          </label>
          <input
            id="scheduled-install-date"
            type="datetime-local"
            required
            min={minValue}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={FIELD_CLS}
          />
        </div>
        <div className="text-xs text-slate-500">
          {isVi ? 'Kỹ thuật viên phụ trách:' : 'Technician:'} {engineerName || '—'}{' '}
          {engineerId && <span className="font-mono">({engineerId})</span>}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            {isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow disabled:opacity-60"
          >
            {isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu lịch' : 'Save schedule'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
