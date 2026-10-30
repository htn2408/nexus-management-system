// Nhãn trạng thái đơn hàng (màu và chữ dùng chung với các trang khác qua types/nexus).
import { languageStore } from '../../context/LanguageContext';
import { useStore } from '../../lib/store';
import { orderStatusLabel, orderStatusTone } from '../../types/nexus';

export default function OrderStatusChip({ status, withDot = false }) {
  const language = useStore(languageStore.language);
  const tone = orderStatusTone(status);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full ${tone.chip}`}>
      {withDot && <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}></span>}
      {orderStatusLabel(status, language)}
    </span>
  );
}
