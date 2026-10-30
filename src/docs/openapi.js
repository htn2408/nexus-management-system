// Tài liệu OpenAPI 3 cho Swagger UI (/api-docs). Mỗi endpoint khai báo một dòng trong
// ENDPOINTS; spec được dựng tự động từ bảng này. tests/docs.test.js kiểm tra mọi endpoint
// khai báo ở đây đều tồn tại thật trong app.
const MANAGER = ['Manager'];
const TECHNICAL_WRITE = ['Field Engineer', 'Manager'];
const ACCOUNTS = ['Senior Accountant'];
const SIGNED_IN = 'any';
const STAFF = ['Manager', 'Retail Staff', 'Field Engineer', 'Senior Accountant'];
const RETAIL_DESK = ['Retail Staff', 'Manager'];

const TAGS = [
  ['System', 'Trạng thái hệ thống'],
  ['Auth', 'Đăng ký, đăng nhập email + mật khẩu, đăng nhập OTP cho khách'],
  ['Admin', 'Quản trị danh mục: gói cước, nhà cung cấp, cửa hàng, nhân viên, kho, đơn mua, cài đặt'],
  ['Orders', 'Đơn đăng ký dịch vụ: đặt đơn, duyệt hồ sơ, khảo sát khả thi, lên lịch lắp đặt'],
  ['Connections', 'Cấp kết nối và đổi trạng thái đường truyền'],
  ['Equipment', 'Thiết bị, tồn kho phía kỹ thuật, yêu cầu nhập thiết bị'],
  ['Billing', 'Hoá đơn và thanh toán'],
  ['Customer', 'Cổng khách hàng và hồ sơ cá nhân'],
  ['Feedback', 'Phản hồi của khách hàng'],
  ['Chat', 'Chat trực tuyến giữa khách và Admin'],
  ['Notifications', 'Lịch sử thông báo của chính người đang đăng nhập (thông báo mới được đẩy qua Socket.IO)'],
];

// [method, path, tag, summary, roles (null = công khai), body mẫu?, query?]
const ENDPOINTS = [
  ['get', '/api/health', 'System', 'Kiểm tra kết nối SQL Server và MongoDB', null],
  ['get', '/api/catalog/plans', 'System', 'Gói cước đang hoạt động (công khai, cho trang Đăng ký và mọi vai trò)', null],
  ['get', '/api/catalog/stores', 'System', 'Chi nhánh đang hoạt động: chỉ thông tin liên hệ (công khai)', null],

  ['post', '/api/auth/register', 'Auth', 'Khách tự đăng ký tài khoản (trả về JWT role Customer)', null,
    { email: 'khach@example.com', password: '123456', name: 'Nguyễn Văn A', phoneNumber: '0912345678' }],
  ['post', '/api/auth/login', 'Auth', 'Đăng nhập email + mật khẩu (nhân viên và khách). Sai 5 lần / 15 phút thì bị khoá', null,
    { email: 'sarah.jenkins@nexus.telecom', password: '********' }],
  ['post', '/api/auth/otp/request', 'Auth', 'Khách nhập mã tài khoản để nhận OTP qua email', null, { accountId: 'B064-000000000002' }],
  ['post', '/api/auth/otp/verify', 'Auth', 'Khách nhập OTP 6 số để nhận JWT', null, { accountId: 'B064000000000002', otp: '123456' }],
  ['post', '/api/auth/otp/forgot-account-id', 'Auth', 'Gửi lại các mã tài khoản về email đã đăng ký', null, { email: 'khach@example.com' }],

  ...crud('plan', 'gói cước', {
    name: 'Broadband Unlimited 256 Kbps', connectionType: 'Broadband', speedOrBandwidth: '256 Kbps',
    monthlyRental: 450, securityDeposit: 500, billingCycle: 'Monthly', status: 'Active',
  }, 'Alias: /api/admin/serviceplan. Lọc: search, type, status'),
  ['get', '/api/admin/plan/stats', 'Admin', 'Thống kê gói cước theo loại kết nối', MANAGER],
  ['get', '/api/admin/plan/broadband', 'Admin', 'Gói Broadband (có /landline, /dial-up tương tự)', MANAGER],

  ...crud('vendor', 'nhà cung cấp', { companyName: 'Cisco Systems', contactPerson: 'Linda', category: 'Modems & Routers', rating: 5 },
    'Lọc: search, category, status'),
  ['get', '/api/admin/vendor/stats', 'Admin', 'Thống kê nhà cung cấp', MANAGER],

  ...crud('retailshop', 'cửa hàng bán lẻ', { name: 'Queens Center', city: 'Queens', cityCode: '072', address: '70 Austin St' },
    'Alias: /api/admin/retailstore. Lọc: search, city, status'),
  ['get', '/api/admin/retailshop/stats', 'Admin', 'Thống kê cửa hàng', MANAGER],

  ...crud('employee', 'nhân viên', {
    fullName: 'Trần Thị B', email: 'tran.b@nexus.telecom', role: 'Retail Staff', department: 'Retail Outlets', storeId: 'SH-01',
  }, 'Xoá = chuyển sang Inactive. Lọc: search, role, department, status, storeId'),

  ...crud('inventory', 'vật tư trong kho', { name: 'AX-100 Fiber ONT', category: 'Fiber ONT', stockQuantity: 20, reorderLevel: 5, unitCost: 45 },
    'Lọc: search, category, isLowStock, vendorId, status'),
  ['get', '/api/admin/inventory/overview', 'Admin', 'Thống kê + danh sách kho', MANAGER],
  ['get', '/api/admin/inventory/low-stock', 'Admin', 'Vật tư đã chạm ngưỡng đặt lại', MANAGER],
  ['post', '/api/admin/inventory/{id}/restock', 'Admin', 'Nhập thêm hàng', MANAGER, { quantity: 10 }],

  ['get', '/api/admin/purchaseorder', 'Admin', 'Danh sách đơn mua thiết bị (lọc: status, vendorId, storeId, search)', MANAGER],
  ['get', '/api/admin/purchaseorder/{id}', 'Admin', 'Chi tiết đơn mua', MANAGER],
  ['post', '/api/admin/purchaseorder', 'Admin', 'Tạo đơn mua thiết bị', MANAGER,
    { vendorId: 'vnd-02', itemCode: 'EQ-RTR-AX', itemName: 'AX Router', quantity: 3, unitCost: 19.99 }],
  ['put', '/api/admin/purchaseorder/{id}/status', 'Admin', 'Submitted → Received (tự cộng kho) hoặc Cancelled', MANAGER, { status: 'Received' }],
  ['delete', '/api/admin/purchaseorder/{id}', 'Admin', 'Xoá đơn mua chưa nhận hàng', MANAGER],

  ['get', '/api/admin/systemsettings', 'Admin', 'Danh sách tham số hệ thống', MANAGER],
  ['put', '/api/admin/systemsettings/{key}', 'Admin', 'Tạo hoặc cập nhật một tham số', MANAGER, { settingValue: '12.24' }],

  ['get', '/api/Technical/orders', 'Orders', 'Danh sách đơn (lọc: status, storeId, keyword, customerName, phone, connectionType, fromDate, toDate)', STAFF],
  ['get', '/api/Technical/orders/{id}', 'Orders', 'Chi tiết đơn', STAFF],
  ['post', '/api/Technical/orders', 'Orders', 'Đặt đơn tại quầy / cổng khách hàng. Mã đơn, trạng thái, chiết khấu do server quyết định',
    ['Retail Staff', 'Manager', 'Customer'], {
      customerName: 'Công ty ABC', customerEmail: 'it@abc.com', customerPhone: '0912345678', installationAddress: '99 Broadway',
      idProofType: 'Passport', idProofNumber: 'P123456', connectionType: 'Broadband', planId: 'plan-bb-64',
      retailOutletCode: 'SH-01', bulkConnectionsCount: 12,
    }],
  ['get', '/api/public/orders/{id}', 'Orders', 'Tra tiến độ đơn bằng mã đơn (không trả thông tin cá nhân, không trả mã tài khoản)', null],
  ['post', '/api/public/orders', 'Orders', 'Khách tự đặt đơn ở trang đăng ký (không cần đăng nhập, bắt buộc email)', null, {
    customerName: 'Nguyễn Văn A', customerEmail: 'a@example.com', connectionType: 'Broadband', planId: 'plan-bb-64', retailOutletCode: 'SH-01',
  }],
  ['put', '/api/Technical/orders/{id}/status', 'Orders', 'Duyệt / từ chối hồ sơ, phân công kỹ thuật viên', ['Retail Staff', 'Field Engineer', 'Manager'],
    { status: 'Pending', retailApprovedBy: 'David Chen', retailApprovalNotes: 'Đủ giấy tờ' }],
  ['put', '/api/Technical/orders/{id}/feasibility', 'Orders', 'Kết luận khảo sát; khả thi thì giữ chỗ Account ID', TECHNICAL_WRITE,
    { isFeasible: true, checkedBy: 'emp-03', cableDistanceMeters: 120, signalLossDbm: -12.5, notes: 'Đủ điều kiện' }],
  ['put', '/api/Technical/orders/{id}/installation-schedule', 'Orders', 'Lên lịch lắp đặt cho đơn khả thi', TECHNICAL_WRITE,
    { scheduledInstallDate: '2026-12-01T09:00:00Z', technicianId: 'emp-03' }],
  ['get', '/api/Technical/dashboard', 'Orders', 'Số liệu tổng quan cho dashboard kỹ thuật', STAFF],

  ['post', '/api/Technical/orders/{id}/provide-connection', 'Connections', 'Cấp một kết nối cho đơn khả thi bằng thiết bị trong kho', TECHNICAL_WRITE,
    { equipmentId: 'eq-03', ipAddress: '10.0.0.15', portNumber: 'P-1' }],
  ['get', '/api/Technical/connections', 'Connections', 'Danh sách kết nối (lọc: accountId, status, equipmentId, customerName, phone, connectionType, fromDate, toDate)', STAFF],
  ['get', '/api/Technical/connections/{accountId}', 'Connections', 'Chi tiết kết nối (mã có hoặc không có gạch)', STAFF],
  ['get', '/api/Technical/connections/{accountId}/activity-logs', 'Connections', 'Nhật ký cấp kết nối / đổi trạng thái, mới nhất trước, kèm người thực hiện', STAFF],
  ['post', '/api/Technical/connections', 'Connections', 'Tạo / đồng bộ kết nối', TECHNICAL_WRITE, { accountId: 'B064-000000000002', ipAddress: '10.0.0.99' }],
  ['put', '/api/Technical/connections/{accountId}/status', 'Connections', 'Tạm ngưng / khôi phục / ngừng vĩnh viễn (thu hồi thiết bị)', TECHNICAL_WRITE,
    { status: 'Temporarily Inactive', reason: 'Quá hạn thanh toán' }],

  ['get', '/api/Technical/equipment', 'Equipment', 'Danh sách thiết bị (lọc: status, storeId, availableOnly)', STAFF],
  ['get', '/api/Technical/equipment/{id}', 'Equipment', 'Chi tiết thiết bị', STAFF],
  ['post', '/api/Technical/equipment', 'Equipment', 'Thêm thiết bị', TECHNICAL_WRITE, {
    equipmentId: 'eq-100', serialNumber: 'SN-100', macAddress: 'AA:BB:CC:DD:EE:01', deviceModel: 'AX-100',
    deviceType: 'Gigabit Router', vendorId: 'vnd-02', storeId: 'SH-01',
  }],
  ['put', '/api/Technical/equipment/{id}', 'Equipment', 'Sửa thiết bị', TECHNICAL_WRITE, { firmwareVersion: 'v3.5.0' }],
  ['delete', '/api/Technical/equipment/{id}', 'Equipment', 'Xoá thiết bị chưa lắp cho khách', TECHNICAL_WRITE],
  ['get', '/api/Technical/inventory', 'Equipment', 'Tồn kho (lọc: category, lowStockOnly)', STAFF],
  ['get', '/api/Technical/inventory/{id}', 'Equipment', 'Chi tiết tồn kho', STAFF],
  ['put', '/api/Technical/inventory/{id}', 'Equipment', 'Sửa thông số kho', TECHNICAL_WRITE, { reorderLevel: 8, location: 'Bay 4A' }],
  ['post', '/api/Technical/inventory/{id}/adjust-stock', 'Equipment', 'Nhập (+) / xuất (−) kho có lý do', TECHNICAL_WRITE, { quantityChange: -2, reason: 'Lắp cho khách' }],
  ['get', '/api/technical/equipment-requests', 'Equipment', 'Yêu cầu nhập thiết bị (cũng có ở /api/admin/equipment-requests)', STAFF],
  ['get', '/api/technical/equipment-requests/{id}', 'Equipment', 'Chi tiết yêu cầu', STAFF],
  ['post', '/api/technical/equipment-requests', 'Equipment', 'Kỹ thuật gửi yêu cầu nhập thiết bị', TECHNICAL_WRITE,
    { storeId: 'SH-01', itemName: 'AX Modem', deviceType: 'Modem', quantity: 2, urgency: 'High' }],
  ['put', '/api/technical/equipment-requests/{id}/status', 'Equipment', 'Duyệt / đáp ứng (Fulfilled tạo thiết bị + cộng kho)', MANAGER,
    { status: 'Fulfilled', adminNotes: 'Đã giao' }],
  ['delete', '/api/technical/equipment-requests/{id}', 'Equipment', 'Xoá yêu cầu chưa đáp ứng', TECHNICAL_WRITE],

  ['get', '/api/billing/settings', 'Billing', 'Biểu cước: thuế dịch vụ % và phí trễ hạn % (bảng SystemSettings)', ACCOUNTS],
  ['put', '/api/billing/settings', 'Billing', 'Đổi biểu cước; hoá đơn lập sau đó dùng thuế suất mới', ACCOUNTS, { serviceTaxRate: 12.24, latePaymentFeePercent: 5 }],
  ['get', '/api/billing/bills', 'Billing', 'Danh sách hoá đơn kèm lịch sử thanh toán', ACCOUNTS],
  ['get', '/api/billing/bills/{id}', 'Billing', 'Chi tiết hoá đơn (BillID hoặc số hoá đơn)', ACCOUNTS],
  ['post', '/api/billing/bills', 'Billing', 'Lập hoá đơn; server tự tính cọc, chiết khấu, thuế 12.24% và tổng', ACCOUNTS,
    { accountId: 'B064-000000000002', billingMonth: 'October 2026', monthlyRental: 225, discountPercent: 25 }],
  ['put', '/api/billing/bills/{id}', 'Billing', 'Sửa khoản mục; các tổng được tính lại', ACCOUNTS, { lateFeeAmount: 10, dueDate: '2026-12-01' }],
  ['post', '/api/billing/bills/payments', 'Billing', 'Kế toán ghi nhận thanh toán', ACCOUNTS,
    { invoiceNumber: 'NEX-INV-2026-001', amountPaid: 200, paymentMode: 'Cash' }],
  ['post', '/api/retail/payments', 'Billing', 'Thu tại cửa hàng hoặc khách tự trả online (chỉ hoá đơn của mình)',
    ['Retail Staff', 'Manager', 'Senior Accountant', 'Customer'],
    { invoiceNumber: 'NEX-INV-2026-001', amountPaid: 200, paymentMode: 'Credit/Debit Card' }],
  ['get', '/api/retail/bills', 'Billing', 'Quầy bán lẻ xem hoá đơn để thu tiền tại quầy', RETAIL_DESK],
  ['get', '/api/retail/staff', 'Billing', 'Nhân viên bán lẻ và kỹ thuật viên đang làm việc (chỉ thông tin liên hệ), để quầy phân công khảo sát', RETAIL_DESK],

  ['get', '/api/customer/bills', 'Customer', 'Hoá đơn của khách đang đăng nhập', ['Customer']],
  ['get', '/api/customer/connections', 'Customer', 'Kết nối của khách đang đăng nhập', ['Customer']],
  ['get', '/api/customer/orders', 'Customer', 'Đơn đăng ký dịch vụ của khách đang đăng nhập', ['Customer']],
  ['get', '/api/customer/feedback', 'Customer', 'Phản hồi khách đã gửi, kèm câu trả lời của Quản trị', ['Customer']],
  ['put', '/api/customer/profile', 'Customer', 'Khách sửa thông tin liên hệ', ['Customer'],
    { fullName: 'Nguyễn Văn A', email: 'a@example.com', contactNumber: '0912345678', address: '1 Main St' }],
  ['put', '/api/profile', 'Customer', 'Sửa hồ sơ của người đang đăng nhập', SIGNED_IN, { name: 'Nguyễn Văn A', phoneNumber: '0912345678' }],
  ['put', '/api/profile/password', 'Customer', 'Đổi mật khẩu', SIGNED_IN, { currentPassword: '******', newPassword: '******' }],

  ['get', '/api/admin/feedback', 'Feedback', 'Danh sách phản hồi', MANAGER],
  ['post', '/api/admin/feedback', 'Feedback', 'Gửi phản hồi', SIGNED_IN,
    { accountId: 'B064-000000000002', customerName: 'Nguyễn Văn A', rating: 4, category: 'Billing', message: 'Hoá đơn rõ ràng' }],
  ['put', '/api/admin/feedback/{id}', 'Feedback', 'Trả lời phản hồi (⇒ Resolved, báo cho khách)', MANAGER, { response: 'Cảm ơn bạn', respondedBy: 'emp-01' }],
  ['delete', '/api/admin/feedback/{id}', 'Feedback', 'Xoá phản hồi', MANAGER],

  ['post', '/api/chat/sessions', 'Chat', 'Khách bắt đầu phiên chat', null, { customerName: 'Nguyễn Văn A' }],
  ['get', '/api/chat/sessions', 'Chat', 'Danh sách phiên chat (lọc: search)', MANAGER],
  ['get', '/api/chat/sessions/{sessionId}/messages', 'Chat', 'Tin nhắn của một phiên', null],
  ['post', '/api/chat/sessions/{sessionId}/messages', 'Chat', 'Gửi tin nhắn. senderType "admin" cần token Manager, "guest" thì không cần đăng nhập', null,
    { senderType: 'guest', senderName: 'Nguyễn Văn A', message: 'Cho hỏi giá gói 128 Kbps' }],
  ['post', '/api/chat/sessions/{sessionId}/read', 'Chat', 'Admin đánh dấu đã đọc', MANAGER],

  ['get', '/api/notifications', 'Notifications', 'Thông báo của một người nhận', SIGNED_IN, null, { audience: 'role:admin', limit: '50' }],
  ['get', '/api/notifications/count', 'Notifications', 'Số thông báo chưa đọc / tổng', SIGNED_IN, null, { audience: 'role:admin' }],
  ['post', '/api/notifications/{id}/read', 'Notifications', 'Đánh dấu một thông báo đã đọc', SIGNED_IN, null, { audience: 'role:admin' }],
  ['post', '/api/notifications/read-all', 'Notifications', 'Đánh dấu tất cả đã đọc', SIGNED_IN, null, { audience: 'role:admin' }],
];

/** 5 endpoint CRUD chuẩn của một danh mục quản trị. */
function crud(resource, label, example, listNote) {
  const base = `/api/admin/${resource}`;
  return [
    ['get', base, 'Admin', `Danh sách ${label}. ${listNote}`, MANAGER],
    ['get', `${base}/{id}`, 'Admin', `Chi tiết ${label}`, MANAGER],
    ['post', base, 'Admin', `Thêm ${label}`, MANAGER, example],
    ['put', `${base}/{id}`, 'Admin', `Sửa ${label}`, MANAGER, example],
    ['delete', `${base}/{id}`, 'Admin', `Xoá ${label}`, MANAGER],
  ];
}

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

function operation([method, path, tag, summary, roles, body, query]) {
  const op = {
    tags: [tag],
    summary,
    responses: { 200: { description: 'Thành công' }, 400: errorResponse('Dữ liệu không hợp lệ') },
  };

  if (roles) {
    op.security = [{ bearerAuth: [] }];
    op.description = roles === SIGNED_IN ? 'Quyền: mọi tài khoản đã đăng nhập.' : `Quyền: ${roles.join(', ')}.`;
    op.responses[401] = errorResponse('Chưa đăng nhập hoặc token hết hạn');
    if (roles !== SIGNED_IN) op.responses[403] = errorResponse('Không đủ quyền');
  }
  if (path.includes('{')) op.responses[404] = errorResponse('Không tìm thấy');

  const parameters = [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
  for (const [name, example] of Object.entries(query ?? {})) {
    parameters.push({ name, in: 'query', required: name === 'audience', schema: { type: 'string' }, example });
  }
  if (parameters.length) op.parameters = parameters;

  if (body) {
    op.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object' }, example: body } } };
  }
  return [method, path, op];
}

export function buildOpenApiSpec() {
  const paths = {};
  for (const [method, path, op] of ENDPOINTS.map(operation)) {
    paths[path] ??= {};
    paths[path][method] = op;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Nexus Service Marketing System API',
      version: '1.0.0',
      description:
        'API cho hệ thống quản lý dịch vụ viễn thông Nexus (đơn hàng, kết nối, hoá đơn, kho). ' +
        'Đăng nhập qua POST /api/auth/login, rồi bấm Authorize và dán token.',
    },
    tags: TAGS.map(([name, description]) => ({ name, description })),
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
          },
        },
      },
    },
    paths,
  };
}

/** Danh sách [method, path] đã khai báo, dùng cho test đối chiếu với app. */
export function documentedEndpoints() {
  return ENDPOINTS.map(([method, path]) => [method, path]);
}
