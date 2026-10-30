// Cấp kết nối cho đơn khả thi: mỗi kết nối gắn 1 thiết bị trong kho của chi nhánh.
// Đơn nhiều kết nối thì cấp lần lượt; modal mở tiếp cho kết nối kế đến cho tới khi đủ.
import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Zap } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { nexusStore } from '../../context/NexusContext';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { provideConnection } from '../../lib/technicalApi';
import { useStore } from '../../lib/store';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';

export default function ProvisionModal({ order, engineerId, onClose, onSaved, onRequestEquipment }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const equipments = useStore(nexusStore.equipments);
  const connections = useStore(nexusStore.connections);

  const provisioned = connections.filter((c) => c.orderId === order.id);
  const total = Math.max(1, order.bulkConnectionsCount || 1);
  const current = provisioned.length + 1;
  // Thiết bị còn trong kho, thuộc chi nhánh của đơn (hoặc chưa gán chi nhánh).
  const available = equipments.filter(
    (eq) => eq.status === 'In Stock' && (!eq.storeId || eq.storeId === order.retailOutletCode),
  );

  const [equipmentId, setEquipmentId] = useState('');
  const [portNumber, setPortNumber] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Thiết bị vừa gắn sẽ rời khỏi danh sách sau khi tải lại, nên chọn mặc định thiết bị đầu tiên còn lại.
  const selectedId = available.some((eq) => eq.id === equipmentId) ? equipmentId : (available[0]?.id ?? '');

  const submit = async (e) => {
    e.preventDefault();
    const equipment = available.find((eq) => eq.id === selectedId);
    if (!equipment) {
      toast.error(isVi ? 'Vui lòng chọn 1 thiết bị router/modem từ kho.' : 'Please pick a modem or router from stock.');
      return;
    }
    setIsSaving(true);
    try {
      const result = await provideConnection(order.id, {
        equipmentId: equipment.id,
        portNumber: portNumber.trim() || undefined,
        ipAddress: ipAddress.trim() || undefined,
        performedBy: engineerId || undefined,
      });
      toast.success(
        isVi
          ? `Đã cấp kết nối ${result.provisionedConnections}/${result.requiredConnections}: ${result.accountId} (thiết bị ${equipment.serialNumber})`
          : `Connection ${result.provisionedConnections}/${result.requiredConnections} provisioned: ${result.accountId} (device ${equipment.serialNumber})`,
      );
      setPortNumber('');
      setIpAddress('');
      const done = result.provisionedConnections >= result.requiredConnections;
      if (done) onClose();
      await onSaved(done ? result.accountId : null);
    } catch (err) {
      toast.error(technicalErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      icon={Zap}
      title={isVi ? `Cấp kết nối cho đơn #${order.id}` : `Provision connection for order #${order.id}`}
      subtitle={`${order.customerName} · ${order.planName} (${order.connectionType}) · ${order.installationAddress}`}
      onClose={onClose}
    >
      {total > 1 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {isVi ? 'Tiến độ cấp từng kết nối:' : 'Provisioning progress:'}
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {provisioned.length} / {total}
            </span>
          </div>
          <div className="grid grid-flow-col gap-1.5 auto-cols-fr">
            {Array.from({ length: total }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full ${
                  i < provisioned.length
                    ? 'bg-emerald-500'
                    : i === provisioned.length
                      ? 'bg-amber-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                }`}
              ></div>
            ))}
          </div>
        </div>
      )}

      {provisioned.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs space-y-1 max-h-28 overflow-y-auto">
          {provisioned.map((c, idx) => (
            <div key={c.accountId}>
              <span className="text-emerald-600 font-bold">✓</span>{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                #{idx + 1}: {c.accountId}
              </span>{' '}
              <span className="text-slate-500 font-mono">
                {c.assignedDeviceSerial || '—'} {c.portNumber && `(${c.portNumber})`}
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={LABEL_CLS}>
            {total > 1
              ? isVi
                ? `Thiết bị cho kết nối #${current} *`
                : `Device for connection #${current} *`
              : isVi
                ? 'Gán modem / router từ kho *'
                : 'Assign modem / router from stock *'}
          </label>
          {available.length > 0 ? (
            <>
              <select
                value={selectedId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className={`${FIELD_CLS} font-mono`}
              >
                {available.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.serialNumber} — {eq.deviceModel} ({eq.macAddress})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {isVi
                  ? `${available.length} thiết bị sẵn sàng tại chi nhánh ${order.retailOutletCode}.`
                  : `${available.length} units available at ${order.retailOutletCode}.`}
              </p>
            </>
          ) : (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 space-y-2">
              <div>
                {isVi ? 'Chi nhánh này không còn thiết bị trong kho.' : 'This branch has no equipment in stock.'}
              </div>
              <button
                type="button"
                onClick={() => onRequestEquipment(order)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <Send className="h-3.5 w-3.5" />
                {isVi ? 'Gửi yêu cầu nhập hàng cho Admin' : 'Request equipment from Admin'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Cổng NOC / Switch' : 'NOC / switch port'}</label>
            <input
              type="text"
              maxLength={50}
              value={portNumber}
              onChange={(e) => setPortNumber(e.target.value)}
              placeholder={isVi ? 'VD: PON-02/07' : 'e.g. PON-02/07'}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Địa chỉ IP cấp' : 'Assigned IP'}</label>
            <input
              type="text"
              maxLength={50}
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder={isVi ? 'Để trống nếu cấp động' : 'Blank if dynamic'}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={CANCEL_BTN}>
            {provisioned.length > 0 ? (isVi ? 'Tạm dừng & Đóng' : 'Pause & Close') : isVi ? 'Hủy' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSaving || !selectedId}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow disabled:opacity-60"
          >
            {isSaving
              ? isVi
                ? 'Đang cấp...'
                : 'Provisioning...'
              : current < total
                ? isVi
                  ? `Cấp kết nối #${current} & tiếp tục`
                  : `Provision #${current} & continue`
                : isVi
                  ? 'Xác nhận cấp & kích hoạt'
                  : 'Confirm & activate'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
