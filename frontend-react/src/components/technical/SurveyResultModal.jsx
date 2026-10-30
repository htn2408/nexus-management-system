// Ghi kết quả khảo sát hiện trường: số đo thật do kỹ sư nhập (khoảng cách cáp, hộp DP,
// suy hao tín hiệu) rồi kết luận Khả thi hoặc Không khả thi (bắt buộc có lý do).
// Đơn Dial-Up phải đạt cả nhánh thoại cố định và nhánh Internet; khách đã có
// đường cố định Nexus thì được miễn nhánh cố định.
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { languageStore } from '../../context/LanguageContext';
import { technicalErrorMessage } from '../../hooks/useTechnicalWorkspace';
import { updateFeasibility } from '../../lib/technicalApi';
import { useStore } from '../../lib/store';
import ModalShell from '../common/ModalShell';
import { CANCEL_BTN, FIELD_CLS, LABEL_CLS } from '../common/formStyles';

const toOptionalNumber = (text) => (text.trim() === '' ? undefined : Number(text));

export default function SurveyResultModal({ order, feasible, engineerId, onClose, onSaved }) {
  const isVi = useStore(languageStore.language) === 'vi';
  const isDialUp = order.connectionType === 'Dial-Up';
  const landlineWaived = Boolean(order.existingLandlineAccountId);

  const [distance, setDistance] = useState(order.cableDistanceMeters != null ? String(order.cableDistanceMeters) : '');
  const [dpBox, setDpBox] = useState(order.dpBoxCapacity ?? '');
  const [signalLoss, setSignalLoss] = useState(order.signalLossDbm != null ? String(order.signalLossDbm) : '');
  const [landlineOk, setLandlineOk] = useState(landlineWaived);
  const [internetOk, setInternetOk] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!engineerId) {
      toast.error(
        isVi ? 'Không xác định được nhân viên kỹ thuật đang đăng nhập.' : 'Cannot identify the signed-in engineer.',
      );
      return;
    }
    if (feasible && isDialUp && (!landlineOk || !internetOk)) {
      toast.error(
        isVi
          ? 'Đơn Dial-Up phải đạt cả nhánh cố định và nhánh Internet.'
          : 'Dial-Up needs both the landline and internet legs to pass.',
      );
      return;
    }
    if (!feasible && !notes.trim()) {
      toast.error(isVi ? 'Vui lòng nhập lý do không khả thi.' : 'A rejection reason is required.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateFeasibility(order.id, {
        isFeasible: feasible,
        checkedBy: engineerId,
        notes: notes.trim() || undefined,
        rejectionReason: feasible ? undefined : notes.trim(),
        landlineFeasible: isDialUp ? feasible && landlineOk : undefined,
        internetFeasible: isDialUp ? feasible && internetOk : feasible,
        cableDistanceMeters: toOptionalNumber(distance),
        dpBoxCapacity: dpBox.trim() || undefined,
        signalLossDbm: toOptionalNumber(signalLoss),
      });
      if (feasible) {
        toast.success(
          result.assignedAccountId
            ? isVi
              ? `Đơn ${order.id} khả thi. Đã giữ mã tài khoản ${result.assignedAccountId}.`
              : `Order ${order.id} is feasible. Account ID reserved: ${result.assignedAccountId}`
            : isVi
              ? `Đơn ${order.id} khả thi, sẵn sàng lắp đặt.`
              : `Order ${order.id} is feasible and ready for dispatch.`,
        );
      } else {
        toast.success(
          isVi ? `Đã ghi nhận đơn ${order.id} không khả thi.` : `Order ${order.id} recorded as not feasible.`,
        );
      }
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
      icon={feasible ? CheckCircle2 : ShieldAlert}
      iconClass={feasible ? 'text-emerald-500' : 'text-rose-500'}
      title={
        feasible
          ? isVi
            ? 'Xác nhận khả thi'
            : 'Confirm feasibility'
          : isVi
            ? 'Báo cáo không khả thi'
            : 'Flag as not feasible'
      }
      subtitle={`#${order.id} — ${order.customerName} · ${order.installationAddress}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Khoảng cách cáp (m)' : 'Cable distance (m)'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Suy hao tín hiệu (dBm)' : 'Signal loss (dBm)'}</label>
            <input
              type="number"
              step="0.01"
              min="-999.99"
              max="999.99"
              value={signalLoss}
              onChange={(e) => setSignalLoss(e.target.value)}
              className={`${FIELD_CLS} font-mono`}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>{isVi ? 'Hộp chia DP' : 'DP box'}</label>
            <input
              type="text"
              maxLength={100}
              value={dpBox}
              onChange={(e) => setDpBox(e.target.value)}
              placeholder={isVi ? 'VD: còn 4/16 cổng' : 'e.g. 4/16 ports free'}
              className={FIELD_CLS}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
          {isVi
            ? 'Nhập số đo thực tế tại hiện trường; để trống nếu chưa đo.'
            : 'Enter the values measured on site; leave blank if not measured.'}
        </p>

        {feasible && isDialUp && (
          <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              {isVi ? 'Đơn Dial-Up gồm 2 nhánh:' : 'Dial-Up has two legs:'}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={landlineOk}
                disabled={landlineWaived}
                onChange={(e) => setLandlineOk(e.target.checked)}
              />
              <span>
                {isVi ? 'Nhánh thoại cố định đạt' : 'Landline leg passed'}
                {landlineWaived &&
                  (isVi
                    ? ` (miễn — khách đã có ${order.existingLandlineAccountId})`
                    : ` (waived — customer has ${order.existingLandlineAccountId})`)}
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={internetOk} onChange={(e) => setInternetOk(e.target.checked)} />
              <span>{isVi ? 'Nhánh Internet (cổng DSLAM) đạt' : 'Internet leg (DSLAM port) passed'}</span>
            </label>
          </div>
        )}

        <div>
          <label className={LABEL_CLS}>
            {feasible
              ? isVi
                ? 'Ghi chú khảo sát'
                : 'Survey notes'
              : isVi
                ? 'Lý do không khả thi *'
                : 'Reason it is not feasible *'}
          </label>
          <textarea
            rows={3}
            maxLength={500}
            required={!feasible}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              feasible
                ? isVi
                  ? 'VD: Tuyến cáp đi ngầm, hộp DP đầu ngõ còn cổng.'
                  : 'e.g. Underground route, DP box at the lane entrance has free ports.'
                : isVi
                  ? 'VD: Khoảng cách tới hộp DP vượt chuẩn, suy hao quá lớn.'
                  : 'e.g. Distance to the DP box exceeds the limit; attenuation too high.'
            }
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
            className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow disabled:opacity-60 ${
              feasible ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isSaving
              ? isVi
                ? 'Đang lưu...'
                : 'Saving...'
              : feasible
                ? isVi
                  ? 'Xác nhận khả thi'
                  : 'Confirm feasible'
                : isVi
                  ? 'Gửi báo cáo'
                  : 'Submit'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
