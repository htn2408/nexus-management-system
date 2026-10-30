// Chạy một thao tác ghi lên server: báo thành công khi server nhận, báo lỗi (kèm lý do server
// trả về) khi bị từ chối. Trả true/false để nơi gọi biết có nên đóng form hay không.
import { useState } from 'react';
import { toast } from 'sonner';

export function useServerAction(isVi) {
  const [busy, setBusy] = useState(false);

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(isVi ? 'Chưa lưu được' : 'Not saved', {
        description: err instanceof Error ? err.message : undefined,
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, run };
}
