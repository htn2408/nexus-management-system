// Dữ liệu của khách đang đăng nhập, lấy theo mã tài khoản: đường truyền, đơn hàng, chi nhánh,
// hoá đơn và phản hồi. Dùng chung cho các tab của cổng khách hàng.
import { authStore } from '../context/AuthContext';
import { accountIdKey, nexusStore } from '../context/NexusContext';
import { useStore } from '../lib/store';

export function useCustomerAccount() {
  const user = useStore(authStore.currentUser);
  const connections = useStore(nexusStore.connections);
  const orders = useStore(nexusStore.orders);
  const bills = useStore(nexusStore.bills);
  const retailShops = useStore(nexusStore.retailShops);
  const feedbacks = useStore(nexusStore.feedbacks);

  const accountId = user?.accountId ?? '';
  // So theo khoá không gạch nối: CSDL lưu "T064000000000010", phiên đăng nhập giữ dạng
  // hiển thị "T064-000000000010". So bằng === thì khách không thấy dữ liệu của mình.
  const key = accountIdKey(accountId);
  const isMine = (value) => !!value && !!key && accountIdKey(value) === key;

  const connection = connections.find((c) => isMine(c.accountId)) ?? null;
  const order = orders.find((o) => isMine(o.assignedAccountId)) ?? null;
  const shop = retailShops.find((s) => s.shopCode === order?.retailOutletCode) ?? null;
  const myBills = bills.filter((b) => isMine(b.accountId));
  const unpaidBills = myBills.filter((b) => b.status !== 'Paid');
  const totalDue = Number(unpaidBills.reduce((sum, b) => sum + b.dueAmount, 0).toFixed(2));
  const myFeedbacks = feedbacks.filter((f) => isMine(f.accountId) || (order && f.orderId === order.id));

  return { user, accountId, connection, order, shop, myBills, unpaidBills, totalDue, myFeedbacks };
}
