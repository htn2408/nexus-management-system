// Đếm theo chi nhánh từ dữ liệu thật thay cho các số nhập tay trên bảng RetailStore.
import { nexusStore } from '../context/NexusContext';
import { useStore } from '../lib/store';

/** Số nhân viên đang làm và số thuê bao (kết nối) theo từng chi nhánh, đếm từ dữ liệu thật. */
export function useBranchCounts() {
  const employees = useStore(nexusStore.employees);
  const connections = useStore(nexusStore.connections);
  const orders = useStore(nexusStore.orders);
  const outletOfOrder = new Map(orders.map((o) => [o.id, o.retailOutletCode]));
  return (shopCode) => ({
    staff: employees.filter((e) => e.retailShopAssigned === shopCode && e.status === 'Active').length,
    subscribers: connections.filter((c) => outletOfOrder.get(c.orderId) === shopCode).length,
  });
}
