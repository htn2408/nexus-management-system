import * as dashboardRepository from '../repositories/dashboard.repository.js';

/** Số đơn chờ khảo sát / khả thi, kết nối đang chạy, thiết bị sẵn sàng, vật tư sắp hết. */
export function technicalDashboard() {
  return dashboardRepository.technicalCounts();
}
