const PLAN_NAME_VI = {
  // Broadband
  'plan-bb-h30': 'Cáp quang Theo giờ 30 Giờ',
  'plan-bb-h60': 'Cáp quang Theo giờ 60 Giờ',
  'plan-bb-64': 'Cáp quang Không giới hạn 64 Kbps',
  'plan-bb-128': 'Cáp quang Không giới hạn 128 Kbps',
  'plan-bb-256': 'Cáp quang Không giới hạn 256 Kbps',
  'plan-bb-512': 'Cáp quang Không giới hạn 512 Kbps',
  'plan-bb-1m': 'Cáp quang Không giới hạn 1 Mbps',
  'plan-bb-2m': 'Cáp quang Không giới hạn 2 Mbps',
  // Dial-Up
  'plan-du-h30': 'Quay số Theo giờ 30 Giờ',
  'plan-du-h60': 'Quay số Theo giờ 60 Giờ',
  'plan-du-h120': 'Quay số Theo giờ 120 Giờ',
  'plan-du-28': 'Quay số Không giới hạn 28 Kbps',
  'plan-du-56': 'Quay số Không giới hạn 56 Kbps',
  // Landline
  'plan-ll-local-y': 'Điện thoại Cố định Nội hạt - Trọn gói (Năm)',
  'plan-ll-local-m': 'Điện thoại Cố định Nội hạt - Hàng tháng',
  'plan-ll-std-m': 'Điện thoại Cố định STD - Hàng tháng',
  'plan-ll-std-h': 'Điện thoại Cố định STD - Nửa năm',
  'plan-ll-std-y': 'Điện thoại Cố định STD - Hàng năm',
  'plan-ll-std': 'Điện thoại Cố định Tiêu chuẩn Gia đình',
  'plan-ll-com': 'Điện thoại Cố định Doanh nghiệp Thương mại',
  'plan-ll-val': 'Điện thoại Cố định Gói Tiết kiệm Gia đình',
};
const PLAN_DESC_VI = {
  'plan-bb-h30': 'Gói cáp quang trả trước 30 giờ truy cập, hiệu lực sử dụng trong 1 tháng.',
  'plan-bb-h60': 'Gói cáp quang trả trước 60 giờ truy cập, hiệu lực sử dụng trong 6 tháng.',
  'plan-bb-64': 'Gói cáp quang không giới hạn lưu lượng 64 Kbps. Tùy chọn thanh toán theo quý $400.',
  'plan-bb-128': 'Gói cáp quang không giới hạn lưu lượng 128 Kbps. Tùy chọn thanh toán theo quý $445.',
  'plan-bb-256': 'Gói cáp quang không giới hạn lưu lượng 256 Kbps. Tùy chọn thanh toán theo quý $475.',
  'plan-bb-512': 'Gói cáp quang không giới hạn lưu lượng 512 Kbps. Tùy chọn thanh toán theo quý $650.',
  'plan-bb-1m': 'Gói cáp quang tốc độ cao 1 Mbps không giới hạn. Tùy chọn thanh toán theo quý $900.',
  'plan-bb-2m': 'Gói cáp quang băng thông cao cấp 2 Mbps không giới hạn. Tùy chọn thanh toán theo quý $1200.',
  'plan-du-h30': 'Gói quay số trả trước 30 giờ truy cập modem PSTN, thời hạn 1 tháng.',
  'plan-du-h60': 'Gói quay số trả trước 60 giờ truy cập modem PSTN, thời hạn 3 tháng.',
  'plan-du-h120': 'Gói quay số trả trước 120 giờ truy cập modem PSTN, thời hạn 6 tháng.',
  'plan-du-28': 'Truy cập quay số không giới hạn tốc độ 28 Kbps. Tùy chọn thanh toán theo quý $150.',
  'plan-du-56': 'Truy cập quay số không giới hạn tốc độ 56 Kbps chuẩn V.90/V.92. Gói quý $180.',
  'plan-ll-local-y': 'Gói thoại nội hạt trọn gói thanh toán theo năm $75. Cước cuộc gọi 55¢/phút.',
  'plan-ll-local-m': 'Gói thoại nội hạt thuê bao hàng tháng $35. Cước cuộc gọi 75¢/phút.',
  'plan-ll-std-m':
    'Gói thoại STD thuê bao hàng tháng $125. Cước gọi nội hạt 70¢, liên tỉnh STD $2.25/phút, tin nhắn $1.00/phút.',
  'plan-ll-std-h':
    'Gói thoại STD thuê bao nửa năm $420. Cước gọi nội hạt 60¢, liên tỉnh STD $2.00/phút, tin nhắn $1.15/phút.',
  'plan-ll-std-y': 'Gói thoại STD thuê bao năm. Cước gọi nội hạt 60¢, liên tỉnh STD $1.75/phút, tin nhắn $1.25/phút.',
  'plan-ll-std': 'Điện thoại cố định gia đình với kết nối nội hạt & đường dài. Tính cước 2 tháng/lần.',
  'plan-ll-com': 'Đường dây thoại doanh nghiệp hỗ trợ định tuyến đa số, săn dòng máy nhánh và kết nối tổng đài PBX.',
  'plan-ll-val': 'Gói thoại tiết kiệm tích hợp sẵn 100 phút gọi miễn phí hàng tháng.',
};
export function cleanPlanName(name) {
  return (name || '').replace(/â€“/g, '-').replace(/â€”/g, '-').replace(/—/g, '-').replace(/–/g, '-');
}
export function getPlanName(plan, lang) {
  if (lang === 'en') {
    return cleanPlanName(plan.name);
  }
  if (plan.id && PLAN_NAME_VI[plan.id]) {
    return PLAN_NAME_VI[plan.id];
  }
  // Generic translation fallback
  return plan.name
    .replace(/â€“/g, '-')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/Broadband/g, 'Cáp quang')
    .replace(/Dial-Up/g, 'Quay số')
    .replace(/Landline/g, 'Cố định')
    .replace(/Hourly/g, 'Theo giờ')
    .replace(/Unlimited/g, 'Không giới hạn')
    .replace(/Hrs/g, 'Giờ')
    .replace(/Standard Residential/g, 'Tiêu chuẩn Gia đình')
    .replace(/Commercial Business/g, 'Doanh nghiệp')
    .replace(/Value Saver Pack/g, 'Gói Tiết kiệm');
}
export function getPlanDescription(plan, lang) {
  if (lang === 'en') return plan.description || '';
  if (plan.id && PLAN_DESC_VI[plan.id]) {
    return PLAN_DESC_VI[plan.id];
  }
  return plan.description || '';
}
export function getPlanBillingCycle(cycle, lang) {
  if (!cycle) return '—';
  if (lang === 'en') return cycle;
  const cycleMap = {
    'Hourly Pack': 'Gói theo giờ',
    Monthly: 'Hàng tháng',
    Quarterly: 'Hàng quý (3 tháng)',
    'Half-Yearly': 'Nửa năm (6 tháng)',
    Yearly: 'Hàng năm (12 tháng)',
  };
  return cycleMap[cycle] || cycle;
}
export function getPlanSpeedOrBandwidth(speed, lang) {
  if (lang === 'en') return speed;
  if (speed === 'Broadband') return 'Băng rộng Cáp quang';
  if (speed === 'PSTN Voice') return 'Thoại cố định PSTN';
  return speed;
}
