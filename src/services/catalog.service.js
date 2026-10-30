// Danh mục công khai: gói cước và chi nhánh đang hoạt động. Dùng cho trang Đăng ký (chưa
// đăng nhập) và các vai trò không phải Manager; thêm/sửa/xoá vẫn chỉ qua /api/admin.
import * as planService from './plan.service.js';
import * as retailStoreService from './retailStore.service.js';

export function activePlans() {
  return planService.list({ status: 'Active' });
}

/** Chỉ thông tin liên hệ của chi nhánh, không kèm số liệu nội bộ (nhân sự, số thuê bao). */
export async function activeStores() {
  const stores = await retailStoreService.list({ status: 'Active' });
  return stores.map((s) => ({
    id: s.id,
    storeId: s.storeId,
    shopCode: s.shopCode,
    name: s.name,
    city: s.city,
    cityCode: s.cityCode,
    address: s.address,
    phone: s.phone,
    email: s.email,
    managerName: s.managerName,
    operatingHours: s.operatingHours,
    status: s.status,
  }));
}
