import { writable, get } from '../lib/store';
import {
  CONNECTION_TYPE_LETTER,
  getBulkDiscountPercent,
  isDepositWaived,
  DEPOSIT_WAIVER_MIN_CONNECTIONS,
  isReleasedToTechnical,
  isAwaitingRetailApproval,
  RETAIL_STAGE_STATUSES,
} from '../types/nexus';
import {
  updateEmployeeApi,
  createEmployeeApi,
  deleteEmployeeApi,
  updateInventoryItemApi,
  createInventoryItemApi,
  deleteInventoryItemApi,
  createEquipmentApi,
  createBillApi,
  updateBillApi,
  recordPaymentApi,
  recordRetailPaymentApi,
  fetchBillsApi,
  fetchMyBillsApi,
  createFeedbackApi,
  updateFeedbackApi,
  fetchConnectionsApi,
  createOrUpdateConnectionApi,
  createOrderApi,
  updateOrderStatusApi,
  fetchOrdersApi,
  createPlanApi,
  updatePlanApi,
  deletePlanApi,
  createVendorApi,
  updateVendorApi,
  deleteVendorApi,
  createRetailShopApi,
  updateRetailShopApi,
  deleteRetailShopApi,
  fetchPurchaseOrdersApi,
  createPurchaseOrderApi,
  updatePurchaseOrderStatusApi,
  deletePurchaseOrderApi,
  fetchEquipmentRequestsApi,
  createEquipmentRequestApi,
  updateEquipmentRequestStatusApi,
  deleteEquipmentRequestApi,
  fetchPlansApi,
  fetchRetailShopsApi,
  fetchVendorsApi,
  fetchEmployeesApi,
  fetchInventoryApi,
  fetchCatalogPlansApi,
  fetchCatalogStoresApi,
  fetchMyConnectionsApi,
  fetchMyOrdersApi,
  fetchRetailBillsApi,
  fetchRetailStaffApi,
  fetchAllFeedbackApi,
  restockInventoryApi,
  fetchMyFeedbackApi,
  API_BASE_URL,
  authHeaders,
} from '../lib/api';
export {
  getBulkDiscountPercent,
  isDepositWaived,
  DEPOSIT_WAIVER_MIN_CONNECTIONS,
  isReleasedToTechnical,
  isAwaitingRetailApproval,
  RETAIL_STAGE_STATUSES,
};
// 11-char Order ID: prefix D/B/T + 10-digit serial (e.g. D0000000001)
export function generateOrderId(type, count) {
  const prefix = CONNECTION_TYPE_LETTER[type];
  return `${prefix}${String(count).padStart(10, '0')}`;
}
// Display form: T064-000000000001
export function formatAccountId(raw) {
  const s = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}
// 16-char Account ID per spec: [type letter D/B/T][3-digit city code][12-digit serial]
// Returned in the canonical dashed display form (T064-000000000001).
export function generateAccountId(type, cityCode, serial) {
  const letter = CONNECTION_TYPE_LETTER[type];
  const city = (cityCode || '999').replace(/\D/g, '').padStart(3, '0').slice(0, 3);
  return formatAccountId(`${letter}${city}${String(serial).padStart(12, '0')}`);
}
// Bare comparison key (drops the dash) so lookups are format-agnostic.
export function accountIdKey(raw) {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
const INITIAL_SETTINGS = {
  serviceTaxRate: 12.24, // As explicitly specified: Service Tax (12.24%)
  latePaymentFeePercent: 5.0,
  defaultSecurityDeposits: {
    Broadband: 500,
    'Dial-Up': 325,
    Landline: 250,
  },
  installationGracePeriodDays: 7,
};
// ============ SVELTE STORE ============
function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const sanitized = saved.replace(/â€“/g, '-').replace(/â€”/g, '-').replace(/—/g, '-').replace(/–/g, '-');
    return JSON.parse(sanitized);
  } catch {
    return fallback;
  }
}
function persist(key) {
  return (value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };
}
// Hoá đơn từ API (GET /api/billing/bills, /api/retail/bills, /api/customer/bills, POST/PUT bill)
// sang dạng dùng trên giao diện.
function billFromApi(ab) {
  return {
    id: ab.billId || `bill-${Date.now()}`,
    invoiceNumber: ab.invoiceNumber,
    accountId: formatAccountId(ab.accountId),
    customerName: ab.customerName,
    billingMonth: ab.billingMonth,
    billingDate: ab.billingDate ? ab.billingDate.slice(0, 10) : '',
    dueDate: ab.dueDate ? ab.dueDate.slice(0, 10) : '',
    planName: ab.planName || '',
    connectionType: ab.connectionType || 'Broadband',
    securityDeposit: ab.securityDeposit ?? 0,
    monthlyRental: ab.monthlyRental ?? 0,
    hourlyCharges: ab.hourlyCharges ?? 0,
    discountPercent: ab.discountPercent ?? 0,
    discountAmount: ab.discountAmount ?? 0,
    subtotal: ab.subtotal ?? 0,
    serviceTaxRate: ab.serviceTaxRate ?? 12.24,
    serviceTaxAmount: ab.serviceTaxAmount ?? 0,
    lateFeeAmount: ab.lateFeeAmount ?? 0,
    description: ab.description || undefined,
    totalAmount: ab.totalAmount ?? 0,
    amountPaid: ab.amountPaid ?? 0,
    dueAmount: ab.dueAmount ?? 0,
    status: ab.status || 'Unpaid',
    paymentHistory: (ab.payments || []).map((p) => ({
      paymentId: p.paymentId,
      paymentDate: p.paymentDate ? p.paymentDate.slice(0, 10) : '',
      amountPaid: p.amountPaid,
      paymentMode: p.paymentMode,
      referenceNumber: p.referenceNumber || '',
      recordedBy: p.recordedBy || 'Accounts Cashier',
    })),
  };
}
// "2026-10-29T09:12:00.000Z" -> "2026-10-29 09:12" (cách các màn hình đang hiển thị).
const toStamp = (value) => (value ? String(value).slice(0, 16).replace('T', ' ') : undefined);
// Phản hồi từ API (GET /api/admin/feedback, /api/customer/feedback, PUT trả lời) sang dạng giao diện.
function feedbackFromApi(f) {
  return {
    id: f.feedbackId,
    accountId: f.accountId ?? undefined,
    orderId: f.orderId ?? undefined,
    customerId: f.customerId ?? undefined,
    customerName: f.customerName,
    rating: f.rating,
    category: f.category,
    message: f.message,
    status: f.status,
    createdAt: toStamp(f.createdAt),
    response: f.response ?? undefined,
    respondedBy: f.respondedBy ?? undefined,
    respondedAt: toStamp(f.respondedAt),
  };
}
// Mỗi vai trò chỉ gọi những API nó có quyền đọc (backend trả 403 cho phần còn lại).
// Chưa đăng nhập: chỉ gói cước và chi nhánh công khai. Mục nào vắng thì không tải.
const STAFF_ORDER_LOADERS = { connections: fetchConnectionsApi, orders: fetchOrdersApi };
const CATALOG_LOADERS = { plans: fetchCatalogPlansApi, shops: fetchCatalogStoresApi };
function loadersForRole(role) {
  switch (role) {
    case 'admin':
      return {
        ...STAFF_ORDER_LOADERS,
        bills: fetchRetailBillsApi,
        plans: fetchPlansApi,
        shops: fetchRetailShopsApi,
        vendors: fetchVendorsApi,
        employees: fetchEmployeesApi,
        inventory: fetchInventoryApi,
        feedbacks: fetchAllFeedbackApi,
      };
    case 'retail':
      return { ...STAFF_ORDER_LOADERS, ...CATALOG_LOADERS, bills: fetchRetailBillsApi, employees: fetchRetailStaffApi };
    case 'accounts':
      return { ...STAFF_ORDER_LOADERS, ...CATALOG_LOADERS, bills: fetchBillsApi };
    case 'technical':
      return { ...STAFF_ORDER_LOADERS, ...CATALOG_LOADERS };
    case 'user':
      return {
        ...CATALOG_LOADERS,
        connections: fetchMyConnectionsApi,
        orders: fetchMyOrdersApi,
        bills: fetchMyBillsApi,
        feedbacks: fetchMyFeedbackApi,
      };
    default:
      return CATALOG_LOADERS;
  }
}
// ============ STORE CREATION ============
function createNexusStore() {
  // Bumped when the seed schema changes so stale localStorage is not reloaded.
  // v7: added technician assignment workflow for feasibility survey
  const V = '_v7';
  const currentRole = writable('admin');
  const isSyncing = writable(false);
  const plans = writable(loadFromStorage('nexus_plans' + V, []));
  const employees = writable(loadFromStorage('nexus_employees' + V, []));
  const vendors = writable(loadFromStorage('nexus_vendors' + V, []));
  const retailShops = writable(loadFromStorage('nexus_retailShops' + V, []));
  const inventory = writable(loadFromStorage('nexus_inventory' + V, []));
  const orders = writable(loadFromStorage('nexus_orders' + V, []));
  const connections = writable(loadFromStorage('nexus_connections' + V, []));
  const equipments = writable(loadFromStorage('nexus_equipments' + V, []));
  const bills = writable(loadFromStorage('nexus_bills' + V, []));
  const feedbacks = writable(loadFromStorage('nexus_feedbacks' + V, []));
  const purchaseOrders = writable([]);
  const equipmentRequests = writable([]);
  const settings = writable(loadFromStorage('nexus_settings' + V, INITIAL_SETTINGS));
  // Auto-persist to localStorage on every change (mirrors React useEffect persistence)
  plans.subscribe(persist('nexus_plans' + V));
  employees.subscribe(persist('nexus_employees' + V));
  vendors.subscribe(persist('nexus_vendors' + V));
  retailShops.subscribe(persist('nexus_retailShops' + V));
  inventory.subscribe(persist('nexus_inventory' + V));
  orders.subscribe(persist('nexus_orders' + V));
  connections.subscribe(persist('nexus_connections' + V));
  equipments.subscribe(persist('nexus_equipments' + V));
  bills.subscribe(persist('nexus_bills' + V));
  feedbacks.subscribe(persist('nexus_feedbacks' + V));
  settings.subscribe(persist('nexus_settings' + V));
  // Ghi danh mục (gói cước, nhân viên, nhà cung cấp, cửa hàng, kho): gửi server TRƯỚC; server từ
  // chối thì ném lỗi cho màn hình báo và không đổi gì. Server nhận thì tải lại dữ liệu từ server
  // để màn hình khớp CSDL (mã do server sinh, các trường server tính).
  const persistThenReload = async (request) => {
    const result = await request();
    await syncWithDatabase();
    return result;
  };
  // ---- Plan Handlers ----
  // Ghi xuống SQL Server qua /api/admin/serviceplan (role Manager). PUT backend
  // ghi đè toàn bộ trường nên phải gửi đầy đủ, không chỉ các trường thay đổi.
  const planPayload = (p) => ({
    name: p.name ?? '',
    connectionType: p.type ?? 'Broadband',
    speedOrBandwidth: p.speedOrBandwidth ?? '',
    monthlyRental: p.monthlyRental ?? 0,
    securityDeposit: p.securityDeposit ?? 0,
    hourlyCharge: p.hourlyCharge ?? 0,
    billingCycle: p.billingCycle ?? 'Monthly',
    validity: p.validity ?? '',
    dataLimit: p.dataLimit ?? '',
    status: p.status ?? 'Active',
    description: p.description ?? '',
    callRates: p.callRates ?? '',
    includedHours: p.includedHours ?? 0,
    isPopular: p.isPopular ?? false,
  });
  const addPlan = (plan) => persistThenReload(() => createPlanApi(planPayload(plan)));
  const updatePlan = (id, updated) => {
    const merged = { ...get(plans).find((p) => p.id === id), ...updated };
    return persistThenReload(() => updatePlanApi(id, planPayload(merged)));
  };
  const deletePlan = (id) => persistThenReload(() => deletePlanApi(id));
  // ---- Employee Handlers ----
  const employeePayload = (emp, password) => ({
    employeeCode: emp.employeeCode,
    fullName: emp.name || '',
    email: emp.email || '',
    phone: emp.phone,
    role: emp.role || 'Retail Staff',
    department: emp.department || 'Retail Outlets',
    // Chi nhánh gửi thẳng mã (SH-01); không có thì backend đoán từ chuỗi "Tên (SH-01)".
    storeId: emp.storeId || undefined,
    retailShopAssigned: emp.retailShopAssigned,
    status: emp.status || 'Active',
    dateOfJoining: emp.dateOfJoining,
    password: password || undefined,
  });
  const addEmployee = (emp, password) => persistThenReload(() => createEmployeeApi(employeePayload(emp, password)));
  const updateEmployee = (id, updated, password) => {
    const merged = { ...get(employees).find((e) => e.id === id), ...updated };
    return persistThenReload(() => updateEmployeeApi(id, employeePayload(merged, password)));
  };
  // Backend không xoá hẳn: chuyển nhân viên sang Inactive.
  const deleteEmployee = (id) => persistThenReload(() => deleteEmployeeApi(id));
  // ---- Vendor Handlers ----
  // PUT backend ghi đè toàn bộ trường → gửi đủ payload; rating phải là số nguyên 1-5.
  const vendorPayload = (v) => ({
    vendorCode: v.vendorCode ?? '',
    companyName: v.companyName ?? '',
    contactPerson: v.contactPerson ?? '',
    category: v.category ?? 'Modems & Routers',
    phone: v.phone ?? '',
    email: v.email ?? '',
    address: v.address ?? '',
    rating: Math.min(5, Math.max(1, Math.round(v.rating ?? 5))),
    status: v.status ?? 'Active',
  });
  const addVendor = (vendor) => persistThenReload(() => createVendorApi(vendorPayload(vendor)));
  const updateVendor = (id, updated) => {
    const merged = { ...get(vendors).find((v) => v.id === id), ...updated };
    return persistThenReload(() => updateVendorApi(id, vendorPayload(merged)));
  };
  const deleteVendor = (id) => persistThenReload(() => deleteVendorApi(id));
  // ---- Retail Shop Handlers ----
  // PUT backend ghi đè toàn bộ trường → gửi đủ payload (kèm shopCode để giữ mã
  // hiển thị SH-xx qua các lần sửa; shopCode chỉ sống ở FE).
  // FE hiển thị "Under Renovation" nhưng CHECK DB chỉ nhận "Renovating" → map.
  const shopStatusToDb = { 'Under Renovation': 'Renovating' };
  const shopPayload = (s) => ({
    // Backend đọc mã cửa hàng ở storeId (chỉ dùng khi tạo mới; để trống thì backend tự sinh).
    storeId: s.shopCode?.trim() ? s.shopCode.trim().toUpperCase() : undefined,
    name: s.name ?? '',
    city: s.city ?? '',
    email: s.email ?? '',
    cityCode: s.cityCode ?? '999',
    address: s.address ?? '',
    managerName: s.managerName ?? '',
    phone: s.phone ?? '',
    operatingHours: s.operatingHours ?? '',
    activeEmployeesCount: s.activeEmployeesCount ?? 0,
    totalSubscribersServed: s.totalSubscribersServed ?? 0,
    status: shopStatusToDb[s.status ?? 'Active'] ?? s.status ?? 'Active',
  });
  const addRetailShop = (shop) => persistThenReload(() => createRetailShopApi(shopPayload(shop)));
  const updateRetailShop = (id, updated) => {
    const merged = { ...get(retailShops).find((s) => s.id === id), ...updated };
    return persistThenReload(() => updateRetailShopApi(id, shopPayload(merged)));
  };
  const deleteRetailShop = (id) => persistThenReload(() => deleteRetailShopApi(id));
  // ---- Inventory Handlers ----
  const inventoryPayload = (item) => ({
    itemCode: item.itemCode,
    name: item.name || '',
    category: item.category || 'Modem',
    stockQuantity: item.stockQuantity || 0,
    reorderLevel: item.reorderLevel || 0,
    unitCost: item.unitCost || 0,
    location: item.location,
    supplier: item.supplier,
    vendorId: item.vendorId || undefined,
  });
  const addInventoryItem = (item) => persistThenReload(() => createInventoryItemApi(inventoryPayload(item)));
  const updateInventoryItem = (id, updated) => {
    const merged = { ...get(inventory).find((i) => i.id === id), ...updated };
    return persistThenReload(() => updateInventoryItemApi(id, inventoryPayload(merged)));
  };
  const deleteInventoryItem = (id) => persistThenReload(() => deleteInventoryItemApi(id));
  const restockInventoryItem = (id, quantity) => persistThenReload(() => restockInventoryApi(id, quantity));
  // ---- Two-stage approval helpers ----
  // Timestamp in the same "YYYY-MM-DD HH:mm" shape used by the rest of the store.
  const nowStamp = () => {
    const now = new Date();
    return `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  // Resolves the Retail Staff member assigned to a branch so a freshly submitted
  // application lands in that specific person's queue (not in a global pool).
  // Matching is done on the shop code that appears inside Employee.retailShopAssigned
  // (e.g. 'Downtown Flagship (SH-01)'), falling back to the branch's own manager.
  const routeOrderToBranch = (shopCode, fallbackEmployeeName) => {
    const shop = get(retailShops).find((s) => s.shopCode === shopCode);
    const branchName = shop?.name ?? shopCode;
    const staff = get(employees).find(
      (e) =>
        e.role === 'Retail Staff' &&
        e.status === 'Active' &&
        !!e.retailShopAssigned &&
        e.retailShopAssigned.toUpperCase().includes(`(${shopCode.toUpperCase()})`),
    );
    if (staff) {
      return {
        assignedEmployeeId: staff.id,
        assignedBranchName: branchName,
        retailEmployeeName: staff.name,
      };
    }
    // No staff record for the branch: still route by branch code and keep whatever
    // name the caller supplied (e.g. 'Online Self-Service' for customer sign-ups).
    return {
      assignedBranchName: branchName,
      retailEmployeeName: fallbackEmployeeName ?? 'Unassigned Retail Desk',
    };
  };
  // Ghi đơn vào CSDL rồi mới trả về. Trước đây hàm này gọi API kiểu "bắn rồi quên":
  // API trả 401/400/500 thì đơn chỉ nằm trong bộ nhớ trình duyệt, trang đăng ký vẫn báo
  // thành công, còn CSDL và màn hình Kỹ thuật không hề có đơn đó. Nay lỗi được ném ra
  // để trang gọi hiện thông báo, và mã đơn lấy đúng mã do server sinh.
  // options.selfService: đơn từ trang đăng ký công khai — đi qua /api/public/orders nên
  // khách cũ dùng lại email vẫn đặt thêm được mà không cần đăng nhập.
  const placeOrder = async (orderData, options = {}) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const bulkConnectionsCount = Math.max(1, Math.floor(orderData.bulkConnectionsCount ?? 1));
    // STAGE 1 routing: pin the application to the retail staff of the branch the
    // customer chose, so it never appears in another outlet's (or Technical's) queue.
    const routing = routeOrderToBranch(orderData.retailOutletCode, orderData.retailEmployeeName);
    const created = await createOrderApi(
      {
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        // Không có email thì gửi hẳn undefined, để backend không so khớp một chuỗi rỗng.
        customerEmail: orderData.customerEmail?.trim() || undefined,
        installationAddress: orderData.installationAddress,
        idProofType: orderData.idProofType,
        idProofNumber: orderData.idProofNumber,
        connectionType: orderData.connectionType,
        planId: orderData.planId,
        planName: orderData.planName,
        retailOutletCode: orderData.retailOutletCode,
        retailEmployeeName: routing.retailEmployeeName,
        assignedEmployeeId: routing.assignedEmployeeId,
        assignedBranchName: routing.assignedBranchName,
        status: 'PendingRetail',
        bulkConnectionsCount,
        bulkDiscountPercent: getBulkDiscountPercent(bulkConnectionsCount),
        // Dial-Up: khách khai đang giữ landline Nexus → khảo sát chỉ cần lớp
        // internet (miễn landline) — spec mục feasibility.
        existingLandlineAccountId: orderData.existingLandlineAccountId || undefined,
      },
      options,
    );
    const newOrder = {
      ...orderData,
      ...routing,
      bulkConnectionsCount,
      bulkDiscountPercent: getBulkDiscountPercent(bulkConnectionsCount),
      depositWaived: created.depositWaived ?? isDepositWaived(bulkConnectionsCount),
      id: created.orderId,
      status: created.status ?? 'PendingRetail',
      createdAt: `${dateStr} ${timeStr}`,
    };
    orders.update((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
    return newOrder;
  };
  // STAGE 2a — a branch's Retail Staff approves the paperwork. The order leaves the
  // retail queue and enters the Technical feasibility queue as 'Pending'.
  // Chuyển trạng thái một đơn ở khâu chi nhánh (duyệt / trả hồ sơ / gửi lại).
  // Đơn phải đang ở trạng thái fromStatus, nếu không trả về null. Gửi lên server TRƯỚC,
  // server nhận thì mới cập nhật đơn trên màn hình; lỗi thì ném ra để màn hình báo.
  const transitionRetailOrder = async (orderId, fromStatus, apiPayload, patch) => {
    const current = get(orders).find((o) => o.id === orderId);
    if (!current || current.status !== fromStatus) return null;
    await updateOrderStatusApi(orderId, apiPayload);
    const updatedOrder = { ...current, ...patch };
    orders.update((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
    return updatedOrder;
  };
  const approveOrderByRetail = (orderId, approvedBy, notes) =>
    transitionRetailOrder(
      orderId,
      'PendingRetail',
      { status: 'Pending', retailApprovedBy: approvedBy, retailApprovalNotes: notes?.trim() || undefined },
      {
        status: 'Pending',
        retailApprovedBy: approvedBy,
        retailApprovedAt: nowStamp(),
        retailApprovalNotes: notes?.trim() || undefined,
        retailRejectionReason: undefined,
      },
    );
  const rejectOrderByRetail = (orderId, rejectedBy, reason) =>
    transitionRetailOrder(
      orderId,
      'PendingRetail',
      { status: 'Not Approved', retailApprovedBy: rejectedBy, retailRejectionReason: reason.trim() },
      {
        status: 'Not Approved',
        retailApprovedBy: rejectedBy,
        retailApprovedAt: nowStamp(),
        retailRejectionReason: reason.trim(),
      },
    );
  const resubmitOrderToRetail = (orderId) =>
    transitionRetailOrder(
      orderId,
      'Not Approved',
      { status: 'PendingRetail' },
      {
        status: 'PendingRetail',
        retailApprovedBy: undefined,
        retailApprovedAt: undefined,
        retailRejectionReason: undefined,
      },
    );
  // Guard for the Technical stage: an order must be cleared by its branch's retail
  // staff before a Field Engineer may assess it.
  const canTechnicalAssess = (ord) => isReleasedToTechnical(ord.status);
  // Account ID serial: next strictly increasing number across all connections and orders
  const nextAccountIdSerial = () => {
    let maxSerial = 0;
    const checkSerial = (rawId) => {
      if (!rawId) return;
      const clean = accountIdKey(rawId);
      // Format: [type(1)][city(3)][serial(12)] -> last 12 digits
      if (clean.length >= 16) {
        const serialNum = parseInt(clean.slice(4), 10);
        if (!isNaN(serialNum) && serialNum > maxSerial) {
          maxSerial = serialNum;
        }
      }
    };
    get(connections).forEach((c) => checkSerial(c.accountId));
    get(orders).forEach((o) => checkSerial(o.assignedAccountId));
    return Math.max(get(connections).length, maxSerial) + 1;
  };
  const cityCodeForOrder = (ord) => {
    const shop = get(retailShops).find((s) => s.shopCode === ord.retailOutletCode);
    return shop?.cityCode ?? '064';
  };
  const updateOrderStatus = (
    orderId,
    status,
    feasibilityNotes,
    cableDistanceMeters,
    dpBoxCapacity,
    signalLossDbm,
    // Dial-Up: which of the two feasibility legs passed. Omit for non-Dial-Up.
    feasibilityLegs,
  ) => {
    let updatedOrder = null;
    // STAGE GUARD: a Field Engineer may only move orders that the branch's retail
    // staff already cleared. Anything still sitting in the retail queue
    // ('PendingRetail' / 'Not Approved') is refused here as a second line of defence,
    // even if a caller bypasses the UI.
    const gate = get(orders).find((o) => o.id === orderId);
    if (gate && !isReleasedToTechnical(gate.status)) {
      return null;
    }
    orders.update((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          // The 16-char Account ID is issued the moment technical confirms the
          // line is feasible — it is the customer's only sign-in credential.
          const assignedAccountId =
            status === 'Feasible' && !ord.assignedAccountId
              ? generateAccountId(ord.connectionType, cityCodeForOrder(ord), nextAccountIdSerial())
              : ord.assignedAccountId;
          // Dial-Up needs BOTH legs; if the customer already holds a Nexus
          // landline, the landline leg is considered satisfied.
          const landlineFeasible =
            feasibilityLegs?.landline ?? (ord.existingLandlineAccountId ? true : ord.landlineFeasible);
          const internetFeasible = feasibilityLegs?.internet ?? ord.internetFeasible;
          updatedOrder = {
            ...ord,
            status,
            ...(assignedAccountId !== undefined && { assignedAccountId }),
            ...(feasibilityNotes !== undefined && { feasibilityNotes }),
            ...(cableDistanceMeters !== undefined && { cableDistanceMeters }),
            ...(dpBoxCapacity !== undefined && { dpBoxCapacity }),
            ...(signalLossDbm !== undefined && { signalLossDbm }),
            ...(ord.connectionType === 'Dial-Up' && { landlineFeasible, internetFeasible }),
            ...(ord.connectionType !== 'Dial-Up' && status === 'Feasible' && { internetFeasible: true }),
            ...(ord.connectionType !== 'Dial-Up' && status === 'Not Feasible' && { internetFeasible: false }),
          };
          return updatedOrder;
        }
        return ord;
      }),
    );
    if (updatedOrder) {
      updateOrderStatusApi(orderId, {
        status,
        reason: feasibilityNotes,
        assignedAccountId: updatedOrder.assignedAccountId,
        cableDistanceMeters,
        dpBoxCapacity,
        signalLossDbm,
      }).catch((err) => console.warn('[Nexus] Backend order status update fallback:', err));
    }
    return updatedOrder;
  };
  // ---- Assign Technician for Feasibility Survey ----
  const assignTechnicianToOrder = async (orderId, technicianName, technicianId, technicianPhone, surveyNotes) => {
    let updatedOrder;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const assignedStamp = `${dateStr} ${timeStr}`;
    // Hồ sơ phải được chi nhánh duyệt xong mới được phân công kỹ thuật viên.
    const gate = get(orders).find((o) => o.id === orderId);
    if (!gate || !isReleasedToTechnical(gate.status)) {
      return null;
    }
    const currentOrder = get(orders).find((ord) => ord.id === orderId);
    if (!currentOrder) return null;
    const notes = surveyNotes?.trim();
    const combinedNotes = notes
      ? currentOrder.feasibilityNotes
        ? `${currentOrder.feasibilityNotes} | ${notes}`
        : notes
      : currentOrder.feasibilityNotes;
    const nextOrder = {
      ...currentOrder,
      assignedTechnician: technicianName,
      assignedTechnicianId: technicianId,
      assignedTechnicianPhone: technicianPhone,
      assignedTechnicianDate: assignedStamp,
      feasibilityNotes: combinedNotes,
    };
    // Ghi backend trước; chỉ cập nhật store sau khi server xác nhận để đổi lựa chọn
    // không bị hiển thị thành công giả khi request lỗi.
    await updateOrderStatusApi(orderId, {
      status: nextOrder.status,
      assignedTechnician: technicianName,
      assignedTechnicianId: technicianId,
      assignedTechnicianPhone: technicianPhone,
    });
    orders.update((prev) => prev.map((ord) => (ord.id === orderId ? nextOrder : ord)));
    updatedOrder = nextOrder;
    return updatedOrder;
  };
  // ---- Connection Provisioning ----
  const provisionConnectionForOrder = (orderId, assignedDeviceSerial) => {
    const order = get(orders).find((o) => o.id === orderId);
    if (!order) return null;
    const plan = get(plans).find((p) => p.id === order.planId);
    const monthlyRate = plan ? plan.monthlyRental : 100;
    const deposit = plan ? plan.securityDeposit : 250;
    const existingForOrder = get(connections).filter((c) => c.orderId === orderId);
    const nextIndex = existingForOrder.length + 1;
    const totalRequired = Math.max(1, order.bulkConnectionsCount || 1);
    // If order.assignedAccountId exists and hasn't been taken by an existing connection yet, use it for Line #1;
    // otherwise generate a brand new unique Account ID for each subsequent connection.
    const isFirstIdAvailable =
      order.assignedAccountId && !get(connections).some((c) => c.accountId === order.assignedAccountId);
    const newAccountId = isFirstIdAvailable
      ? order.assignedAccountId
      : generateAccountId(order.connectionType, cityCodeForOrder(order), nextAccountIdSerial());
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const device = get(equipments).find((eq) => eq.serialNumber === assignedDeviceSerial);
    const newConnection = {
      accountId: newAccountId,
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      installationAddress: order.installationAddress,
      connectionType: order.connectionType,
      planName: order.planName,
      monthlyRental: monthlyRate,
      securityDeposit: deposit,
      status: 'Active',
      ipAddress: `198.51.${Math.floor(10 + Math.random() * 90)}.${Math.floor(2 + Math.random() * 250)}`,
      portNumber: `ETH-PORT-${nextIndex}`,
      assignedDeviceSerial,
      assignedDeviceModel: device?.deviceModel || 'Nexus Standard CPE',
      installedDate: dateStr,
      lastUpdated: `${dateStr} ${timeStr}`,
    };
    // Mark order as fulfilled only when ALL required bulk connections have been provisioned!
    const isAllFulfilled = nextIndex >= totalRequired;
    orders.update((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: isAllFulfilled ? 'Connection Provided' : o.status,
              assignedAccountId: o.assignedAccountId || newAccountId,
            }
          : o,
      ),
    );
    connections.update((prev) => [newConnection, ...prev]);
    // Persist provisioned connection to SQL Server DB
    createOrUpdateConnectionApi({
      accountId: newConnection.accountId,
      orderId: newConnection.orderId,
      customerId: order.customerId || 'CUST-0001',
      customerName: newConnection.customerName,
      customerPhone: newConnection.customerPhone,
      customerEmail: newConnection.customerEmail,
      installationAddress: newConnection.installationAddress,
      planName: newConnection.planName,
      connectionType: newConnection.connectionType,
      monthlyRental: newConnection.monthlyRental,
      securityDeposit: newConnection.securityDeposit,
      status: newConnection.status,
      ipAddress: newConnection.ipAddress,
      portNumber: newConnection.portNumber,
      assignedDeviceSerial: newConnection.assignedDeviceSerial,
      assignedDeviceModel: newConnection.assignedDeviceModel,
      installedDate: newConnection.installedDate,
    }).catch((err) => console.warn('[NexusContext] Failed to persist connection to DB:', err));
    // Bind equipment to this specific connection (1 connection = 1 router)
    if (assignedDeviceSerial) {
      equipments.update((prev) =>
        prev.map((eq) =>
          eq.serialNumber === assignedDeviceSerial
            ? {
                ...eq,
                status: 'In Service',
                assignedAccountId: newAccountId,
                assignedCustomerName:
                  totalRequired > 1 ? `${order.customerName} (Line #${nextIndex})` : order.customerName,
                installedDate: dateStr,
              }
            : eq,
        ),
      );
    }
    return newConnection;
  };
  // ---- Connection Handlers ----
  const updateConnectionStatus = (accountId, status, reason) => {
    const now = new Date();
    const stamp = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    connections.update((prev) =>
      prev.map((conn) => {
        if (conn.accountId === accountId) {
          const updated = {
            ...conn,
            status,
            lastUpdated: stamp,
            lastStatusReason: reason || conn.lastStatusReason,
          };
          // Persist status change to SQL Server DB
          createOrUpdateConnectionApi({
            accountId: updated.accountId,
            orderId: updated.orderId,
            customerName: updated.customerName,
            customerPhone: updated.customerPhone,
            customerEmail: updated.customerEmail,
            installationAddress: updated.installationAddress,
            planName: updated.planName,
            connectionType: updated.connectionType,
            monthlyRental: updated.monthlyRental,
            securityDeposit: updated.securityDeposit,
            status: updated.status,
            ipAddress: updated.ipAddress,
            portNumber: updated.portNumber,
            assignedDeviceSerial: updated.assignedDeviceSerial,
            assignedDeviceModel: updated.assignedDeviceModel,
            installedDate: updated.installedDate,
            lastStatusReason: updated.lastStatusReason,
          }).catch((err) => console.warn('[NexusContext] Failed to update connection in DB:', err));
          return updated;
        }
        return conn;
      }),
    );
  };
  // ---- Equipment Handlers ----
  const addEquipment = async (eq) => {
    const created = await createEquipmentApi({
      inventoryId: eq.inventoryId,
      serialNumber: eq.serialNumber,
      macAddress: eq.macAddress,
      deviceModel: eq.deviceModel,
      deviceType: eq.deviceType,
      vendorId: eq.vendorId,
      storeId: eq.storeId,
      firmwareVersion: eq.firmwareVersion,
      status: eq.status || 'In Stock',
    });
    const newEq = {
      ...eq,
      id: created.equipmentId || `eq-${Date.now()}`,
    };
    equipments.update((prev) => [newEq, ...prev]);
    return newEq;
  };
  const updateEquipment = (id, updated) => {
    equipments.update((prev) => prev.map((eq) => (eq.id === id ? { ...eq, ...updated } : eq)));
  };
  // ---- Billing Handlers ----
  // Lập hoá đơn: server tự tính cọc theo gói (miễn cọc với đơn trên 50 kết nối), chiết khấu,
  // thuế theo biểu cước đang áp dụng và số hoá đơn. Chờ server lưu xong mới thêm vào danh
  // sách, và dùng đúng số liệu server trả về; server từ chối thì ném lỗi cho màn hình báo.
  const generateBill = async ({
    accountId,
    billingMonth,
    securityDeposit,
    monthlyRental,
    hourlyCharges,
    discountPercent,
  }) => {
    const created = await createBillApi({
      accountId,
      billingMonth,
      securityDeposit,
      monthlyRental,
      hourlyCharges,
      discountPercent: Math.min(100, Math.max(0, discountPercent || 0)),
    });
    const bill = billFromApi(created);
    bills.update((prev) => [bill, ...prev.filter((b) => b.invoiceNumber !== bill.invoiceNumber)]);
    return bill;
  };
  // Role của người dùng hiện tại ('admin' | 'retail' | 'technical' | 'accounts' | 'user')
  // lấy từ bản currentUser mà AuthContext đồng bộ ra localStorage. Trả về null nếu
  // chưa đăng nhập hoặc JSON hỏng.
  const readStoredUserRole = () => {
    try {
      const raw = localStorage.getItem('nexus_auth_user');
      return raw ? (JSON.parse(raw).role ?? null) : null;
    } catch {
      return null;
    }
  };
  // Ghi nhận một khoản thanh toán. Gửi lên server TRƯỚC, server nhận thì mới cập nhật
  // hoá đơn trên màn hình; server từ chối (VD trả vượt số nợ, không phải hoá đơn của mình)
  // thì ném lỗi để màn hình báo cho người dùng, dữ liệu hiển thị giữ nguyên.
  // Endpoint theo role của người ghi:
  // - accounts (Senior Accountant): thu tại văn phòng -> /api/billing/bills/payments.
  // - retail và user (khách tự trả online) -> /api/retail/payments.
  // NexusContext không import được AuthContext (AuthContext đã import nexusStore)
  // nên đọc role hiện tại từ bản lưu trong localStorage.
  const recordPayment = async (invoiceNumber, amountPaid, paymentMode, referenceNumber, recordedBy) => {
    const persistApi = readStoredUserRole() === 'accounts' ? recordPaymentApi : recordRetailPaymentApi;
    await persistApi({
      invoiceNumber,
      amountPaid,
      paymentMode,
      referenceNumber,
      recordedBy,
      notes: `Recorded by ${recordedBy}`,
    });
    let updatedBill = null;
    bills.update((prev) =>
      prev.map((bill) => {
        if (bill.invoiceNumber === invoiceNumber) {
          const newTotalPaid = Number((bill.amountPaid + amountPaid).toFixed(2));
          const newDue = Number(Math.max(0, bill.totalAmount - newTotalPaid).toFixed(2));
          const status = newDue <= 0.01 ? 'Paid' : newTotalPaid > 0 ? 'Partially Paid' : 'Unpaid';
          const newPayment = {
            paymentId: `PAY-${Date.now().toString().slice(-5)}`,
            paymentDate: new Date().toISOString().slice(0, 10),
            amountPaid,
            paymentMode,
            referenceNumber,
            recordedBy,
          };
          updatedBill = {
            ...bill,
            amountPaid: newTotalPaid,
            dueAmount: newDue,
            status,
            paymentHistory: [newPayment, ...bill.paymentHistory],
          };
          return updatedBill;
        }
        return bill;
      }),
    );
    return updatedBill;
  };
  // ---- Update Bill (Accounts department, spec: "updating has to be done by the
  // accounts department alone") — PUT /api/billing/bills/{id}. Trường nào undefined
  // thì backend giữ nguyên; server luôn tính lại subtotal/thuế/total/công nợ/trạng
  // thái, FE cập nhật store từ response để UI khớp số liệu CSDL ngay lập tức.
  const updateBill = async (invoiceNumber, updates) => {
    const saved = billFromApi(await updateBillApi(invoiceNumber, updates));
    bills.update((prev) => prev.map((bill) => (bill.invoiceNumber === invoiceNumber ? { ...bill, ...saved } : bill)));
    return saved;
  };
  // ---- Purchase Order Handlers (Admin — purchase list theo spec) ----
  // Nạp lại tồn kho từ CSDL sau khi đơn mua Received (backend đã cộng số lượng).
  const refreshInventory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/inventory`, { headers: authHeaders() });
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        inventory.set(
          list.map((i) => ({
            id: i.inventoryId,
            itemCode: i.itemCode,
            name: i.name,
            category: i.category,
            stockQuantity: i.stockQuantity ?? 0,
            reorderLevel: i.reorderLevel ?? 10,
            unitCost: i.unitCost ?? 0,
            location: i.location || '',
            vendorId: i.vendorId || '',
            supplier: i.vendorName || i.supplier || '',
            status: i.status || 'In Stock',
          })),
        );
      }
    } catch (err) {
      console.warn('[Nexus] Cannot refresh inventory:', err);
    }
  };
  const mapPurchaseOrder = (p) => ({
    id: p.purchaseOrderId || p.id,
    vendorId: p.vendorId,
    vendorName: p.vendor?.companyName || p.vendorName || undefined,
    storeId: p.storeId || undefined,
    itemCode: p.itemCode,
    itemName: p.itemName,
    category: p.category,
    quantity: p.quantity,
    unitCost: p.unitCost,
    totalCost: p.totalCost,
    orderDate: p.orderDate ? String(p.orderDate).slice(0, 10) : '',
    expectedDate: p.expectedDate ? String(p.expectedDate).slice(0, 10) : undefined,
    receivedDate: p.receivedDate ? String(p.receivedDate).slice(0, 10) : undefined,
    status: p.status || 'Submitted',
    notes: p.notes || undefined,
    createdBy: p.createdBy || undefined,
  });
  const refreshPurchaseOrders = async () => {
    try {
      const list = await fetchPurchaseOrdersApi();
      purchaseOrders.set((list || []).map(mapPurchaseOrder));
    } catch (err) {
      console.warn('[Nexus] Cannot load purchase orders:', err);
    }
  };
  const addPurchaseOrder = async (order) => {
    try {
      const created = await createPurchaseOrderApi({
        vendorId: order.vendorId,
        storeId: order.storeId,
        itemCode: order.itemCode,
        itemName: order.itemName,
        category: order.category,
        quantity: order.quantity,
        unitCost: order.unitCost,
        expectedDate: order.expectedDate,
        notes: order.notes,
      });
      const mapped = mapPurchaseOrder(created);
      purchaseOrders.update((prev) => [mapped, ...prev]);
      return mapped;
    } catch (err) {
      console.warn('[Nexus] API create purchase order failed:', err);
      throw err;
    }
  };
  const setPurchaseOrderStatus = async (id, status) => {
    const updated = await updatePurchaseOrderStatusApi(id, status);
    const mapped = mapPurchaseOrder(updated);
    purchaseOrders.update((prev) => prev.map((p) => (p.id === id ? mapped : p)));
    // Đơn Received → kho được backend cộng tự động; tải lại tồn kho để UI khớp.
    if (status === 'Received') void refreshInventory();
    return mapped;
  };
  const deletePurchaseOrder = async (id) => {
    await deletePurchaseOrderApi(id);
    purchaseOrders.update((prev) => prev.filter((p) => p.id !== id));
  };
  // ---- Equipment Request Handlers (Yêu cầu nhập hàng từ KTV gửi Admin) ----
  const mapEquipmentRequest = (r) => ({
    id: r.requestId || r.id,
    orderId: r.orderId || undefined,
    storeId: r.storeId,
    storeName: r.storeName || r.store?.name || undefined,
    employeeId: r.employeeId,
    employeeName: r.employeeName || r.employee?.fullName || undefined,
    inventoryId: r.inventoryId || undefined,
    itemName: r.itemName,
    deviceType: r.deviceType,
    quantity: r.quantity || 1,
    urgency: r.urgency || 'Normal',
    status: r.status || 'Pending',
    reason: r.reason || undefined,
    adminNotes: r.adminNotes || undefined,
    createdAt: r.createdAt ? String(r.createdAt).slice(0, 19).replace('T', ' ') : '',
    updatedAt: r.updatedAt ? String(r.updatedAt).slice(0, 19).replace('T', ' ') : undefined,
  });
  const refreshEquipmentRequests = async (filters) => {
    try {
      const list = await fetchEquipmentRequestsApi(filters);
      equipmentRequests.set((list || []).map(mapEquipmentRequest));
    } catch (err) {
      console.warn('[Nexus] Cannot load equipment requests:', err);
    }
  };
  const addEquipmentRequest = async (data) => {
    try {
      const created = await createEquipmentRequestApi(data);
      const mapped = mapEquipmentRequest(created);
      equipmentRequests.update((prev) => [mapped, ...prev]);
      return mapped;
    } catch (err) {
      console.warn('[Nexus] API create equipment request failed:', err);
      throw err;
    }
  };
  const setEquipmentRequestStatus = async (id, status, adminNotes) => {
    const updated = await updateEquipmentRequestStatusApi(id, status, adminNotes);
    const mapped = mapEquipmentRequest(updated);
    equipmentRequests.update((prev) => prev.map((r) => (r.id === id ? mapped : r)));
    if (status === 'Fulfilled') {
      void refreshInventory();
      void syncWithDatabase();
    }
    return mapped;
  };
  const deleteEquipmentRequest = async (id) => {
    await deleteEquipmentRequestApi(id);
    equipmentRequests.update((prev) => prev.filter((r) => r.id !== id));
  };
  // ---- Feedback Handlers (functional requirement #2) ----
  // Gửi phản hồi của khách (POST /api/admin/feedback, mở cho mọi tài khoản đăng nhập).
  // Ghi CSDL trước, thành công mới hiện trong danh sách; lỗi thì ném ra để màn hình báo.
  const addFeedback = async (fb) => {
    const saved = await createFeedbackApi({
      customerId: fb.customerId,
      accountId: fb.accountId,
      orderId: fb.orderId,
      customerName: fb.customerName,
      rating: fb.rating,
      category: fb.category,
      message: fb.message,
      status: 'New',
    });
    const created = { ...fb, ...feedbackFromApi(saved) };
    feedbacks.update((prev) => [created, ...prev]);
    return created;
  };
  // Quản trị trả lời phản hồi: lưu server trước (phản hồi chuyển Resolved, khách nhận thông báo);
  // server từ chối thì ném lỗi cho màn hình báo.
  const respondFeedback = async (id, response, respondedBy) => {
    const saved = feedbackFromApi(await updateFeedbackApi(id, { response, respondedBy, status: 'Resolved' }));
    feedbacks.update((prev) => prev.map((f) => (f.id === id ? { ...f, ...saved } : f)));
    return saved;
  };
  // ---- SQL Server Database Sync ----
  const syncWithDatabase = async () => {
    isSyncing.set(true);
    try {
      // Nạp dữ liệu từ các API của backend: Connections, Bills, Orders, Plans,
      // Shops, Vendors, Employees, Inventory.
      try {
        const loaders = loadersForRole(readStoredUserRole());
        const load = (name) => (loaders[name] ? loaders[name]().catch(() => null) : Promise.resolve(null));
        const [apiConns, apiBills, apiOrders, apiPlans, apiShops, apiVendors, apiEmps, apiInv, apiFeedbacks] =
          await Promise.all(
            ['connections', 'bills', 'orders', 'plans', 'shops', 'vendors', 'employees', 'inventory', 'feedbacks'].map(
              load,
            ),
          );
        if (Array.isArray(apiFeedbacks)) feedbacks.set(apiFeedbacks.map(feedbackFromApi));
        // Gói cước và nhân viên: server là nguồn duy nhất, thay hẳn dữ liệu mẫu (gộp thì gói / nhân
        // viên chỉ có trong dữ liệu mẫu vẫn hiện ra và bị chọn nhầm).
        if (Array.isArray(apiPlans) && apiPlans.length > 0) {
          plans.set(
            apiPlans.map((p) => ({
              id: p.planId,
              name: p.name,
              type: p.connectionType,
              speedOrBandwidth: p.speedOrBandwidth || '',
              monthlyRental: p.monthlyRental ?? 0,
              hourlyCharge: p.hourlyCharge || undefined,
              securityDeposit: p.securityDeposit ?? 0,
              dataLimit: p.dataLimit || undefined,
              status: p.status || 'Active',
              description: p.description || '',
              billingCycle: p.billingCycle || undefined,
              validity: p.validity || undefined,
              includedHours: p.includedHours || undefined,
              callRates: p.callRates || undefined,
              isPopular: p.isPopular || undefined,
            })),
          );
        }
        if (Array.isArray(apiShops) && apiShops.length > 0) {
          // The backend is authoritative for branches. Replacing the local seed
          // also removes stale lowercase copies such as `sh-01` after login.
          retailShops.set(
            apiShops.map((s) => {
              const storeId = String(s.storeId || s.shopCode || s.id || '').toUpperCase();
              return {
                id: storeId,
                shopCode: storeId,
                name: s.name,
                city: s.city || '',
                cityCode: s.cityCode || '',
                address: s.address || '',
                managerName: s.managerName || '',
                phone: s.phone || '',
                email: s.email || '',
                operatingHours: s.operatingHours || '',
                activeEmployeesCount: s.activeEmployeesCount ?? 0,
                totalSubscribersServed: s.totalSubscribersServed ?? 0,
                status: s.status || 'Active',
              };
            }),
          );
        }
        if (Array.isArray(apiVendors) && apiVendors.length > 0) {
          vendors.set(
            apiVendors.map((v) => ({
              id: v.vendorId,
              vendorCode: v.vendorCode || '',
              companyName: v.companyName,
              contactPerson: v.contactPerson || '',
              category: v.category || 'Modems & Routers',
              phone: v.phone || '',
              email: v.email || '',
              address: v.address || '',
              rating: v.rating ?? 5,
              status: v.status || 'Active',
            })),
          );
        }
        if (Array.isArray(apiEmps) && apiEmps.length > 0) {
          employees.set(
            apiEmps.map((e) => ({
              id: e.employeeId,
              employeeCode: e.employeeCode || '',
              name: e.fullName,
              email: e.email || '',
              phone: e.phone || '',
              role: e.role || 'Retail Staff',
              department: e.department || '',
              retailShopAssigned: e.branchCode || e.storeId || undefined,
              status: e.status || 'Active',
              dateOfJoining: e.dateOfJoining ? String(e.dateOfJoining).slice(0, 10) : '',
              avatar: e.avatarUrl || undefined,
              address: e.address || undefined,
              gender: (e.gender || '').toLowerCase() || undefined,
              dateOfBirth: e.dateOfBirth ? String(e.dateOfBirth).slice(0, 10) : undefined,
              bio: e.bio || undefined,
            })),
          );
        }
        if (Array.isArray(apiInv) && apiInv.length > 0) {
          inventory.set(
            apiInv.map((i) => ({
              id: i.inventoryId,
              itemCode: i.itemCode,
              name: i.name,
              category: i.category,
              stockQuantity: i.stockQuantity ?? 0,
              reorderLevel: i.reorderLevel ?? 10,
              unitCost: i.unitCost ?? 0,
              location: i.location || '',
              vendorId: i.vendorId || '',
              supplier: '',
              status: i.status || 'In Stock',
            })),
          );
        }
        // Đơn, kết nối, hoá đơn: tải được từ server thì CHỈ giữ bản ghi server trả về (bản ghi chỉ có
        // trong dữ liệu mẫu không được hiện như thật). Bản cũ trên máy chỉ dùng bù trường API không trả.
        if (Array.isArray(apiOrders)) {
          const localOrders = get(orders);
          const localById = new Map(localOrders.map((o) => [o.id, o]));
          const mappedOrders = apiOrders.map((ao) => {
            const local = localById.get(ao.orderId);
            return {
              id: ao.orderId,
              customerName: ao.customerName,
              customerPhone: ao.customerPhone || '',
              customerEmail: ao.customerEmail || '',
              installationAddress: ao.installationAddress || '',
              idProofType: ao.idProofType || local?.idProofType || 'National ID Card',
              idProofNumber: ao.idProofNumber || local?.idProofNumber || '',
              connectionType: ao.connectionType || 'Broadband',
              planId: ao.planId,
              planName: ao.planName,
              retailOutletCode: ao.storeId || local?.retailOutletCode || 'RS-HCM-01',
              assignedBranchName: ao.storeName || local?.assignedBranchName || '',
              retailEmployeeName: local?.retailEmployeeName || 'Retail Staff',
              assignedEmployeeId: ao.employeeId || local?.assignedEmployeeId,
              status: ao.status || 'PendingRetail',
              createdAt: ao.applicationDate
                ? ao.applicationDate.slice(0, 16).replace('T', ' ')
                : local?.createdAt || '',
              cableDistanceMeters: ao.cableDistanceMeters ?? local?.cableDistanceMeters,
              dpBoxCapacity: ao.dpBoxCapacity || local?.dpBoxCapacity,
              signalLossDbm: ao.signalLossDbm ?? local?.signalLossDbm,
              feasibilityNotes: ao.feasibilityNotes || local?.feasibilityNotes,
              rejectionReason: ao.rejectionReason || local?.rejectionReason,
              retailRejectionReason: local?.retailRejectionReason,
              assignedAccountId: ao.assignedAccountId
                ? formatAccountId(ao.assignedAccountId)
                : (local?.assignedAccountId ? formatAccountId(local.assignedAccountId) : undefined),
              assignedTechnician: ao.assignedTechnicianName || local?.assignedTechnician,
              assignedTechnicianPhone: ao.assignedTechnicianPhone || local?.assignedTechnicianPhone,
              assignedTechnicianDate: ao.assignedTechnicianDate
                ? ao.assignedTechnicianDate.slice(0, 16).replace('T', ' ')
                : local?.assignedTechnicianDate,
              scheduledInstallDate: ao.scheduledInstallDate
                ? ao.scheduledInstallDate.slice(0, 16).replace('T', ' ')
                : local?.scheduledInstallDate,
              bulkConnectionsCount: ao.bulkConnectionsCount ?? local?.bulkConnectionsCount ?? 1,
              bulkDiscountPercent: ao.bulkDiscountPercent ?? local?.bulkDiscountPercent ?? 0,
              // Orders.DepositWaived (cột tính toán): > 50 kết nối thì miễn tiền cọc.
              depositWaived:
                ao.depositWaived ?? isDepositWaived(ao.bulkConnectionsCount ?? local?.bulkConnectionsCount ?? 1),
              existingLandlineAccountId: ao.existingLandlineAccountId
                ? formatAccountId(ao.existingLandlineAccountId)
                : (local?.existingLandlineAccountId ? formatAccountId(local.existingLandlineAccountId) : undefined),
              landlineFeasible: ao.landlineFeasible ?? local?.landlineFeasible,
              internetFeasible: ao.internetFeasible ?? local?.internetFeasible,
              retailApprovedBy: ao.retailApprovedBy || local?.retailApprovedBy,
              retailApprovedAt: ao.retailApprovedDate
                ? ao.retailApprovedDate.slice(0, 16).replace('T', ' ')
                : local?.retailApprovedAt,
              retailApprovalNotes: ao.retailApprovalNotes || local?.retailApprovalNotes,
            };
          });
          orders.set(mappedOrders.map((o) => ({ ...(localById.get(o.id) || {}), ...o })));
        }
        if (Array.isArray(apiConns)) {
          const localConns = get(connections);
          const localById = new Map(localConns.map((c) => [c.accountId.replace(/-/g, ''), c]));
          const mappedConns = apiConns.map((ac) => ({
            accountId: formatAccountId(ac.accountId),
            orderId: ac.orderId,
            customerName: ac.customerName,
            customerPhone: ac.customerPhone || '',
            customerEmail: ac.customerEmail || '',
            installationAddress: ac.installationAddress || '',
            connectionType: ac.connectionType || 'Broadband',
            planName: ac.planName || '',
            monthlyRental: ac.monthlyRental ?? 0,
            securityDeposit: ac.securityDeposit ?? 0,
            status: ac.status || 'Active',
            ipAddress: ac.ipAddress || '',
            portNumber: ac.portNumber || '',
            assignedDeviceSerial: ac.assignedDeviceSerial || '',
            assignedDeviceModel: ac.assignedDeviceModel || '',
            installedDate: ac.installedDate ? ac.installedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
            lastUpdated: ac.lastUpdated ? ac.lastUpdated.slice(0, 10) : new Date().toISOString().slice(0, 10),
            lastStatusReason: ac.lastStatusReason || '',
          }));
          connections.set(mappedConns.map((c) => ({ ...localById.get(c.accountId.replace(/-/g, '')), ...c })));
        }
        if (Array.isArray(apiBills)) {
          const localBills = get(bills);
          const localById = new Map(localBills.map((b) => [b.invoiceNumber, b]));
          const mappedBills = apiBills.map(billFromApi);
          bills.set(mappedBills.map((b) => ({ ...localById.get(b.invoiceNumber), ...b })));
        }
      } catch (e) {
        console.warn('[NexusContext] Background fetch of bills/connections skipped:', e);
      }
      return true;
    } catch (err) {
      console.warn('[Nexus] Could not reach SQL Server bridge, using local storage state:', err);
    } finally {
      isSyncing.set(false);
    }
    return false;
  };
  // Auto-trigger sync on browser startup
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      syncWithDatabase();
      // Đơn mua thiết bị chỉ Manager đọc được; yêu cầu nhập hàng thì mọi nhân viên.
      const role = readStoredUserRole();
      if (role === 'admin') refreshPurchaseOrders();
      if (role && role !== 'user') refreshEquipmentRequests();
    }, 150);
  }
  // ---- Settings Handlers ----
  const updateSettings = (newSettings) => {
    settings.update((prev) => ({ ...prev, ...newSettings }));
  };

  // Dọn dẹp dữ liệu phiên làm việc khi đăng xuất để bảo mật thông tin đơn hàng / hoá đơn
  const clearSessionData = () => {
    orders.set([]);
    connections.set([]);
    bills.set([]);
    feedbacks.set([]);
    purchaseOrders.set([]);
    equipmentRequests.set([]);
  };

  return {
    currentRole,
    isSyncing,
    syncWithDatabase,
    clearSessionData,
    plans,
    employees,
    vendors,
    retailShops,
    inventory,
    orders,
    connections,
    equipments,
    bills,
    feedbacks,
    settings,
    // Two-stage approval: branch routing + retail paperwork gate
    routeOrderToBranch,
    approveOrderByRetail,
    rejectOrderByRetail,
    resubmitOrderToRetail,
    canTechnicalAssess,
    addPlan,
    updatePlan,
    deletePlan,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addVendor,
    updateVendor,
    deleteVendor,
    addRetailShop,
    updateRetailShop,
    deleteRetailShop,
    purchaseOrders,
    refreshPurchaseOrders,
    addPurchaseOrder,
    setPurchaseOrderStatus,
    deletePurchaseOrder,
    equipmentRequests,
    refreshEquipmentRequests,
    addEquipmentRequest,
    setEquipmentRequestStatus,
    deleteEquipmentRequest,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    restockInventoryItem,
    placeOrder,
    assignTechnicianToOrder,
    updateOrderStatus,
    provisionConnectionForOrder,
    updateConnectionStatus,
    addEquipment,
    updateEquipment,
    generateBill,
    recordPayment,
    updateBill,
    addFeedback,
    respondFeedback,
    updateSettings,
  };
}
export const nexusStore = createNexusStore();
