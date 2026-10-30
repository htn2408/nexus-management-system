// Nạp đơn / kết nối / thiết bị / tồn kho từ /api/Technical vào store chung.
// Lần nạp đầu lỗi thì để trống (không hiện dữ liệu mẫu như thể đó là dữ liệu thật);
// đã nạp được rồi mà lần sau lỗi thì giữ dữ liệu cũ và chỉ báo lỗi.
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { nexusStore } from '../context/NexusContext';
import { TechnicalApiError, loadTechnicalWorkspace } from '../lib/technicalApi';

export function technicalErrorMessage(error) {
  return error instanceof TechnicalApiError || error instanceof Error
    ? error.message
    : 'Không thể kết nối tới API kỹ thuật';
}

export function useTechnicalWorkspace() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const hasLoaded = useRef(false);

  // Gọi API rồi đổ kết quả vào store. Trả về dữ liệu mới; lỗi thì ném ra cho nơi gọi.
  const load = useCallback(
    () =>
      loadTechnicalWorkspace().then(
        (workspace) => {
          nexusStore.orders.set(workspace.orders);
          nexusStore.connections.set(workspace.connections);
          nexusStore.equipments.set(workspace.equipments);
          nexusStore.inventory.set(workspace.inventory);
          hasLoaded.current = true;
          setError('');
          setIsLoading(false);
          return workspace;
        },
        (err) => {
          setError(technicalErrorMessage(err));
          setIsLoading(false);
          if (!hasLoaded.current) {
            nexusStore.orders.set([]);
            nexusStore.connections.set([]);
            nexusStore.equipments.set([]);
            nexusStore.inventory.set([]);
          }
          throw err;
        },
      ),
    [],
  );

  // Lần nạp đầu isLoading đã là true; các lần tải lại sau thao tác mới bật lại.
  const refresh = useCallback(() => {
    setIsLoading(true);
    return load();
  }, [load]);

  useEffect(() => {
    load().catch((err) => toast.error(technicalErrorMessage(err)));
    nexusStore.refreshEquipmentRequests();
  }, [load]);

  return { isLoading, error, refresh };
}
