// Chi nhánh của nhân viên bán lẻ đang đăng nhập, và những đơn hàng quầy đó phụ trách.
import { authStore } from '../context/AuthContext';
import { nexusStore } from '../context/NexusContext';
import { useStore } from '../lib/store';

// Lấy mã chi nhánh "SH-01" từ chuỗi tự do như "Downtown Flagship (SH-01)".
export function shopCodeFrom(text) {
  const match = (text ?? '').toUpperCase().match(/\b(SH-\d+)\b/);
  return match ? match[1] : null;
}

export function useRetailBranch() {
  const user = useStore(authStore.currentUser);
  const employees = useStore(nexusStore.employees);
  const retailShops = useStore(nexusStore.retailShops);

  // Admin / Kỹ thuật không gắn với một chi nhánh nên xem được mọi chi nhánh.
  const canSeeAllBranches = user?.role === 'admin' || user?.role === 'technical';

  // Backend trả chi nhánh (storeId) lúc đăng nhập; thiếu thì tra danh bạ nhân viên chi nhánh
  // (/api/retail/staff), rồi mới đoán từ phòng ban / chức danh.
  let branchCode = null;
  if (user && !canSeeAllBranches) {
    if (user.branchCode) {
      branchCode = shopCodeFrom(user.branchCode) ?? user.branchCode;
    } else {
      const record =
        employees.find((e) => e.id.toLowerCase() === (user.id ?? '').toLowerCase()) ??
        employees.find((e) => e.email.toLowerCase() === (user.email ?? '').toLowerCase());
      branchCode =
        shopCodeFrom(record?.retailShopAssigned) ?? shopCodeFrom(user.department) ?? shopCodeFrom(user.title);
    }
  }
  const branchShop = branchCode ? (retailShops.find((s) => s.shopCode === branchCode) ?? null) : null;

  // Chi nhánh đang có nhân viên bán lẻ trực quầy. Khách tự đăng ký có thể chọn chi nhánh
  // chưa có nhân viên nào; đơn đó quầy nào cũng thấy để xử lý thay, kẻo không ai duyệt.
  const staffedBranchCodes = new Set(
    employees
      .filter((e) => e.role === 'Retail Staff' && e.status !== 'Inactive')
      .map((e) => shopCodeFrom(e.retailShopAssigned))
      .filter(Boolean),
  );

  // Đơn thuộc quầy này: được giao đích danh cho nhân viên, đúng chi nhánh, hoặc chi nhánh không có người trực.
  const belongsToDesk = (order) => {
    if (canSeeAllBranches || !branchCode) return true;
    const routed =
      !!order.assignedEmployeeId && order.assignedEmployeeId.toLowerCase() === (user?.id ?? '').toLowerCase();
    const outlet = order.retailOutletCode?.toUpperCase();
    const orphanBranch = !!outlet && !staffedBranchCodes.has(outlet);
    return routed || outlet === branchCode || orphanBranch;
  };

  return { user, canSeeAllBranches, branchCode, branchShop, belongsToDesk };
}
