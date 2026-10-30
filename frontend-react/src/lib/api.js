// Base URL của backend Node.js (Express), mặc định cổng 5105.
// Ghi đè bằng biến môi trường VITE_API_URL khi deploy (VD: VITE_API_URL=https://api.example.com).
export const API_BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:5105';
export class ApiError extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}
/**
 * JWT lấy lúc đăng nhập (nhân viên email + mật khẩu, khách OTP, hoặc khách vừa
 * đăng ký). Backend khoá phần lớn API theo [Authorize] nên mọi request nghiệp vụ
 * (billing, admin, Technical...) đều phải đính kèm header này. Endpoint công khai
 * (auth/login, OTP, chat khách vãng lai, notifications) bỏ qua header nếu thiếu.
 */
/** Lỗi từ server: lấy câu thông báo trong JSON { message }, không có thì dùng nguyên văn bản trả về. */
async function errorFromResponse(res) {
  const text = await res.text().catch(() => '');
  try {
    const body = JSON.parse(text);
    if (body?.message) return new Error(body.message);
  } catch {
    // Không phải JSON: dùng nguyên văn.
  }
  return new Error(text || `HTTP ${res.status}`);
}
// ---- JWT helpers & 401 Unauthorized handling ----
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 <= Date.now() + 5000;
}

// Dọn dẹp dữ liệu đơn hàng / kết nối / hoá đơn lưu trong localStorage (bảo vệ thông tin cá nhân)
export function clearCachedUserData() {
  if (typeof localStorage === 'undefined') return;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith('nexus_orders') ||
      key.startsWith('nexus_connections') ||
      key.startsWith('nexus_bills') ||
      key.startsWith('nexus_feedbacks')
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

let unauthorizedHandler = null;

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

let isHandlingUnauthorized = false;
export function handleUnauthorized() {
  if (isHandlingUnauthorized) return;
  isHandlingUnauthorized = true;
  setTimeout(() => {
    isHandlingUnauthorized = false;
  }, 2000);

  if (unauthorizedHandler) {
    unauthorizedHandler();
  } else {
    localStorage.removeItem('nexus_jwt_token');
    localStorage.removeItem('nexus_auth_user');
    window.location.href = '/login';
  }
}

/** Bọc fetch: tự động bắt lỗi 401 trên các request nghiệp vụ cần xác thực để đăng xuất. */
export async function apiFetch(url, init = {}) {
  const res = await globalThis.fetch(url, init);
  if (res.status === 401 && !String(url).includes('/api/auth/login') && localStorage.getItem('nexus_jwt_token')) {
    handleUnauthorized();
  }
  return res;
}

export function authHeaders() {
  const token = localStorage.getItem('nexus_jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
/** Gọi POST /api/auth/login trên backend, trả về token + thông tin user. */
export async function loginRequest(email, password) {
  let response;
  try {
    response = await apiFetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError('network');
  }
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok || !body?.user || (body.user.accountType === 'Customer' && !body.token)) {
    throw new ApiError(body?.error ?? `http_${response.status}`, response.status);
  }
  return body;
}
/**
 * Tạo tài khoản đăng nhập cho khách khi họ đăng ký dịch vụ ở trang /register.
 * Backend tự hash mật khẩu bằng BCrypt và lưu vào bảng Customer.
 * Ném ApiError với status 409 nếu email hoặc số điện thoại đã có người dùng.
 */
export async function registerCustomerApi(data) {
  let res;
  try {
    res = await apiFetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    throw new ApiError('network');
  }
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.user) {
    throw new ApiError(body?.error ?? `http_${res.status}`, res.status);
  }
  return body;
}
/** Bóc thông báo lỗi tiếng Việt do backend trả về, kèm mã HTTP để nơi gọi phân nhánh. */
async function throwApiError(res, fallback) {
  let message = fallback;
  try {
    const body = await res.json();
    if (body?.message) message = body.message;
    else if (body?.error) message = body.error;
  } catch {
    // giữ nguyên thông báo mặc định
  }
  throw new ApiError(message, res.status);
}
/**
 * Bước 1 của đăng nhập khách hàng: gửi mã tài khoản, backend gửi OTP 6 chữ số
 * về email đã đăng ký của khách.
 */
export async function requestLoginOtpApi(accountId) {
  let res;
  try {
    res = await apiFetch(`${API_BASE_URL}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });
  } catch {
    throw new ApiError('network');
  }
  if (!res.ok) {
    return throwApiError(res, `Không gửi được mã OTP (HTTP ${res.status})`);
  }
  return await res.json();
}
/**
 * Khách quên / chưa nhận được mã tài khoản: gửi lại mã về email đã đăng ký.
 * Server luôn trả cùng một câu (không tiết lộ email có tồn tại hay không).
 */
export async function forgotAccountIdApi(email) {
  let res;
  try {
    res = await apiFetch(`${API_BASE_URL}/api/auth/otp/forgot-account-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new ApiError('network');
  }
  if (!res.ok) {
    return throwApiError(res, `Không gửi được yêu cầu (HTTP ${res.status})`);
  }
  return await res.json();
}
/** Bước 2: gửi mã OTP khách nhập, đúng thì nhận JWT và thông tin tài khoản. */
export async function verifyLoginOtpApi(accountId, otp) {
  let res;
  try {
    res = await apiFetch(`${API_BASE_URL}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, otp }),
    });
  } catch {
    throw new ApiError('network');
  }
  if (!res.ok) {
    return throwApiError(res, `Mã OTP không hợp lệ (HTTP ${res.status})`);
  }
  return await res.json();
}
// ==================== EMPLOYEE APIS ====================
export async function updateEmployeeApi(id, data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/employee/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi cập nhật nhân viên (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function createEmployeeApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/employee`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi thêm mới nhân viên (HTTP ${res.status})`);
  }
  return await res.json();
}
// ==================== INVENTORY / STOCK APIS ====================
export async function updateInventoryItemApi(id, data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/inventory/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi cập nhật vật tư kho (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function createInventoryItemApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi tạo vật tư kho (HTTP ${res.status})`);
  }
  return await res.json();
}
// ==================== EQUIPMENT APIS ====================
export async function createEquipmentApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/Technical/equipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      equipmentId: data.equipmentId || `EQ-${Date.now().toString().slice(-8)}`,
      inventoryId: data.inventoryId,
      serialNumber: data.serialNumber,
      macAddress: data.macAddress,
      deviceModel: data.deviceModel,
      deviceType: data.deviceType,
      vendorId: data.vendorId || 'vnd-02',
      storeId: data.storeId,
      status: data.status || 'In Stock',
      firmwareVersion: data.firmwareVersion || 'v1.0.0',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi đăng ký thiết bị vào CSDL (HTTP ${res.status})`);
  }
  return await res.json();
}
// ==================== CONNECTIONS APIS ====================
export async function fetchConnectionsApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/Technical/connections`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Lỗi tải danh sách kết nối (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function createOrUpdateConnectionApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/Technical/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi lưu kết nối vào CSDL (HTTP ${res.status})`);
  }
  return await res.json();
}
// ==================== BILLING & INVOICE APIS ====================
export async function fetchBillsApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/billing/bills`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Lỗi tải danh sách hóa đơn (HTTP ${res.status})`);
  }
  return await res.json();
}
/** GET /api/billing/bills/{id} — nhận BillId hoặc số hóa đơn, dùng cho xuất PDF
 *  để hóa đơn luôn phản ánh dữ liệu mới nhất từ CSDL (kể cả payment vừa ghi). */
export async function fetchBillByIdApi(billIdOrInvoiceNumber) {
  const res = await apiFetch(`${API_BASE_URL}/api/billing/bills/${encodeURIComponent(billIdOrInvoiceNumber)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Lỗi tải hóa đơn ${billIdOrInvoiceNumber} (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function createBillApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/billing/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi phát hành hóa đơn vào CSDL (HTTP ${res.status})`);
  }
  return await res.json();
}
/** PUT /api/billing/bills/{id} — kế toán sửa chi tiết hóa đơn đã phát hành.
 *  Bỏ trống trường nào thì backend giữ nguyên giá trị cũ và tính lại tổng cước. */
export async function updateBillApi(billIdOrInvoiceNumber, data) {
  const res = await apiFetch(`${API_BASE_URL}/api/billing/bills/${encodeURIComponent(billIdOrInvoiceNumber)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi cập nhật hóa đơn (HTTP ${res.status})`);
  }
  return await res.json();
}
/**
 * POST /api/retail/payments — ghi thanh toán thu TẠI CỬA HÀNG BÁN LẺ (spec: retail
 * outlet employee). Endpoint cho role Retail Staff / Manager / Senior Accountant;
 * khách (Customer) tự trả online cũng đi qua đây và bị backend chặn theo quyền sở
 * hữu hóa đơn. Dùng chung BillingService với /api/billing/bills/payments.
 */
export async function recordRetailPaymentApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/retail/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi ghi nhận thanh toán vào CSDL (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function recordPaymentApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/billing/bills/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi ghi nhận thanh toán vào CSDL (HTTP ${res.status})`);
  }
  return await res.json();
}
// --- Gọi API chat thật (dữ liệu tin nhắn nằm trong MongoDB phía backend) ---
/**
 * Gọi một endpoint của /api/chat và quy lỗi về thông báo tiếng Việt dễ hiểu.
 * Mọi hàm chat bên dưới đều ném ApiError khi thất bại — nơi gọi đã có try/catch
 * để hiện toast hoặc bỏ qua (polling).
 */
async function chatFetch(path, init) {
  let res;
  try {
    res = await apiFetch(`${API_BASE_URL}/api/chat${path}`, {
      ...init,
      // Khách vãng lai chat không cần token; thao tác của Admin (xem phiên, trả lời) thì cần.
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ chat.');
  }
  if (res.status === 404) {
    // Phiên cũ lưu trong localStorage nhưng server không còn -> nơi gọi sẽ reset phiên.
    throw new ApiError('Phiên chat không còn tồn tại.', 404);
  }
  if (res.status === 503) {
    throw new ApiError('Dịch vụ chat tạm thời không khả dụng (chưa kết nối được MongoDB).', 503);
  }
  if (!res.ok) {
    let message = `Lỗi chat (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // giữ nguyên thông báo mặc định
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined;
  return await res.json();
}
/** Khách bắt đầu phiên chat mới — backend tự tạo lời chào từ Admin. */
export async function startChatSessionApi(customerName) {
  return chatFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify({ customerName }),
  });
}
/** Tải toàn bộ tin nhắn của một phiên chat (dùng chung cho khách và admin). */
export async function fetchChatMessagesApi(sessionId) {
  return chatFetch(`/sessions/${encodeURIComponent(sessionId)}/messages`);
}
/** Khách gửi tin nhắn tới Admin. */
export async function sendChatMessageApi(sessionId, senderName, message) {
  return chatFetch(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ senderType: 'guest', senderName, message }),
  });
}
/** Admin xem danh sách tất cả phiên chat đang có, lọc theo tên khách nếu cần. */
export async function fetchChatSessionsApi(search) {
  const keyword = search?.trim();
  const query = keyword ? `?search=${encodeURIComponent(keyword)}` : '';
  return chatFetch(`/sessions${query}`);
}
/** Admin trả lời khách trong một phiên chat. */
export async function replyChatSessionApi(sessionId, adminName, message) {
  return chatFetch(`/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ senderType: 'admin', senderName: adminName, message }),
  });
}
/** Admin đánh dấu đã đọc mọi tin nhắn của khách trong phiên. */
export async function markChatSessionReadApi(sessionId) {
  await chatFetch(`/sessions/${encodeURIComponent(sessionId)}/read`, { method: 'POST' });
}
async function notificationFetch(path, init) {
  let res;
  try {
    res = await apiFetch(`${API_BASE_URL}/api/notifications${path}`, {
      ...init,
      // Backend chỉ trả thông báo của chính người đang đăng nhập (theo JWT).
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ thông báo.');
  }
  if (!res.ok) {
    let message = `Lỗi thông báo (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // giữ nguyên thông báo mặc định
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined;
  return await res.json();
}
/** Lịch sử thông báo của một người nhận, mới nhất lên đầu. */
export async function fetchNotificationsApi(audience, limit = 50) {
  const query = `?audience=${encodeURIComponent(audience)}&limit=${limit}`;
  return notificationFetch(query);
}
/** Đánh dấu một thông báo đã đọc. */
export async function markNotificationReadApi(audience, id) {
  await notificationFetch(`/${encodeURIComponent(id)}/read?audience=${encodeURIComponent(audience)}`, {
    method: 'POST',
  });
}
/** Đánh dấu tất cả thông báo của người nhận này là đã đọc. */
export async function markAllNotificationsReadApi(audience) {
  const res = await notificationFetch(`/read-all?audience=${encodeURIComponent(audience)}`, { method: 'POST' });
  return res?.updated ?? 0;
}
// ==================== NEW MODULES API (PLANS, SHOPS, VENDORS, ORDERS) ====================
// --- PLANS ---
export async function createPlanApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/serviceplan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function updatePlanApi(id, data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/serviceplan/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- RETAIL SHOPS ---
export async function createRetailShopApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/retailstore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function updateRetailShopApi(id, data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/retailstore/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- VENDORS ---
export async function createVendorApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/vendor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function updateVendorApi(id, data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/vendor/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- ORDERS ---
/**
 * Ghi một đơn đăng ký dịch vụ vào CSDL. Trả về đơn do server tạo (mã đơn là mã thật).
 * Ném ApiError kèm câu tiếng Việt dễ hiểu để trang gọi hiện thẳng cho người dùng.
 */
export async function createOrderApi(data, options = {}) {
  // selfService: trang đăng ký công khai gọi /api/public/orders (không cần JWT), nhờ vậy
  // khách cũ mua thêm bằng email đã dùng không bị chặn 401 như ở /api/Technical/orders.
  const url = options.selfService ? `${API_BASE_URL}/api/public/orders` : `${API_BASE_URL}/api/Technical/orders`;
  let res;
  try {
    res = await apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.selfService ? {} : authHeaders()),
      },
      body: JSON.stringify(data),
    });
  } catch {
    throw new ApiError('network');
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError(
      'Phiên đăng nhập không hợp lệ hoặc đã hết hạn, đơn chưa được lưu. Vui lòng đăng nhập lại rồi đặt đơn.',
      res.status,
    );
  }
  if (!res.ok) {
    let message = `Không lưu được đơn hàng (HTTP ${res.status}).`;
    try {
      const body = await res.json();
      const details = body?.errors ? Object.values(body.errors).flat().join('; ') : '';
      message = details || body?.message || body?.error || message;
    } catch {
      // Giữ thông báo mặc định khi server không trả JSON
    }
    throw new ApiError(message, res.status);
  }
  return await res.json();
}
export async function updateOrderStatusApi(id, data) {
  const res = await apiFetch(`${API_BASE_URL}/api/Technical/orders/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// ==================== FETCH & DELETE APIS (Full DB Sync) ====================
// --- PLANS ---
export async function fetchPlansApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/serviceplan`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function deletePlanApi(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/serviceplan/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- RETAIL SHOPS ---
export async function fetchRetailShopsApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/retailstore`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function deleteRetailShopApi(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/retailstore/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- VENDORS ---
export async function fetchVendorsApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/vendor`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function deleteVendorApi(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/vendor/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- ORDERS ---
export async function fetchOrdersApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/Technical/orders`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- EMPLOYEES ---
export async function fetchEmployeesApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/employee`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function deleteEmployeeApi(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/employee/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- INVENTORY ---
export async function fetchInventoryApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/inventory`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function deleteInventoryItemApi(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/inventory/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- EQUIPMENT ---
// --- FEEDBACKS ---
export async function createFeedbackApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
export async function updateFeedbackApi(id, data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/feedback/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return await res.json();
}
// --- SYSTEM SETTINGS ---
// ==================== CỔNG KHÁCH HÀNG (Customer portal) ====================
// /api/billing khoá role Senior Accountant, nên khách đọc hoá đơn của chính
// mình qua 2 endpoint riêng bên dưới (quyền sở hữu lọc tại server).
export async function updateCustomerProfileApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/customer/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi cập nhật hồ sơ (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function fetchMyBillsApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/customer/bills`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Lỗi tải hóa đơn của bạn (HTTP ${res.status})`);
  return await res.json();
}
// --- Đọc theo vai trò: mỗi vai trò chỉ gọi API mình có quyền ---
async function getJson(path, label) {
  const res = await apiFetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Lỗi tải ${label} (HTTP ${res.status})`);
  return await res.json();
}
/** Gói cước đang bán và chi nhánh đang hoạt động: công khai, không cần đăng nhập. */
export const fetchCatalogPlansApi = () => getJson('/api/catalog/plans', 'gói cước');
export const fetchCatalogStoresApi = () => getJson('/api/catalog/stores', 'chi nhánh');
/** Kết nối và đơn của khách đang đăng nhập. */
export const fetchMyConnectionsApi = () => getJson('/api/customer/connections', 'kết nối của bạn');
export const fetchMyOrdersApi = () => getJson('/api/customer/orders', 'đơn hàng của bạn');
/** Quầy bán lẻ: hoá đơn (thu tại quầy) và danh bạ nhân viên bán lẻ + kỹ thuật viên. */
export const fetchRetailBillsApi = () => getJson('/api/retail/bills', 'hóa đơn');
export const fetchRetailStaffApi = () => getJson('/api/retail/staff', 'danh bạ nhân viên');
/** Tra tiến độ đơn bằng mã đơn khi chưa đăng nhập; null nếu không có đơn này. */
export async function fetchPublicOrderStatusApi(orderId) {
  const res = await apiFetch(`${API_BASE_URL}/api/public/orders/${encodeURIComponent(orderId.trim())}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lỗi tra cứu đơn hàng (HTTP ${res.status})`);
  return await res.json();
}
export async function updateProfileApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Lỗi cập nhật hồ sơ (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function updatePasswordApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/profile/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Lỗi đổi mật khẩu (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function fetchPurchaseOrdersApi() {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/purchaseorder`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Lỗi tải danh sách đơn đặt mua (HTTP ${res.status})`);
  return await res.json();
}
export async function createPurchaseOrderApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/purchaseorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi tạo đơn đặt mua (HTTP ${res.status})`);
  }
  return await res.json();
}
/** Đổi trạng thái đơn mua: Submitted → Received (tự cộng kho) hoặc Cancelled. */
export async function updatePurchaseOrderStatusApi(id, status) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/purchaseorder/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi cập nhật đơn đặt mua (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function deletePurchaseOrderApi(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/purchaseorder/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi xóa đơn đặt mua (HTTP ${res.status})`);
  }
}
export async function fetchEquipmentRequestsApi(filters) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.storeId) params.set('storeId', filters.storeId);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  const url = `${API_BASE_URL}/api/technical/equipment-requests${qs ? `?${qs}` : ''}`;
  const res = await apiFetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi tải danh sách yêu cầu nhập hàng (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function createEquipmentRequestApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/technical/equipment-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi gửi yêu cầu nhập hàng (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function updateEquipmentRequestStatusApi(id, status, adminNotes) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/equipment-requests/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status, adminNotes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi cập nhật trạng thái yêu cầu nhập hàng (HTTP ${res.status})`);
  }
  return await res.json();
}
export async function deleteEquipmentRequestApi(id) {
  const res = await apiFetch(`${API_BASE_URL}/api/technical/equipment-requests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi xóa yêu cầu nhập hàng (HTTP ${res.status})`);
  }
}
// --- Biểu cước của phòng kế toán (bảng SystemSettings) ---
export const fetchBillingSettingsApi = () => getJson('/api/billing/settings', 'biểu cước');
export async function updateBillingSettingsApi(data) {
  const res = await apiFetch(`${API_BASE_URL}/api/billing/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi lưu biểu cước (HTTP ${res.status})`);
  }
  return await res.json();
}
// --- Phản hồi của khách: Quản trị đọc tất cả, khách đọc phản hồi của mình ---
export const fetchAllFeedbackApi = () => getJson('/api/admin/feedback', 'phản hồi');
export const fetchMyFeedbackApi = () => getJson('/api/customer/feedback', 'phản hồi của bạn');
/** Admin nhập thêm hàng cho một vật tư (cộng tồn kho trên server). */
export async function restockInventoryApi(id, quantity) {
  const res = await apiFetch(`${API_BASE_URL}/api/admin/inventory/${encodeURIComponent(id)}/restock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi nhập thêm hàng (HTTP ${res.status})`);
  }
  return await res.json();
}
