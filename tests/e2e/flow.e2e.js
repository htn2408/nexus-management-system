// Test end-to-end toàn bộ quy trình nghiệp vụ trên SQL Server + MongoDB thật (container tạm):
// Admin quản lý danh mục → khách đặt đơn → bán lẻ duyệt → kỹ thuật khảo sát & cấp kết nối
// → kế toán lập hoá đơn → khách đăng nhập OTP, tự thanh toán, gửi phản hồi, chat.
//
// Chạy: npm run test:e2e (cần Docker). Các bước chạy tuần tự và dùng chung dữ liệu với nhau.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { TEST_PASSWORD, otpCount, startApi, startDatabases, stopDatabases, waitForOtp } from './harness.js';

let infra;
let api;
const tokens = {};
const ctx = {};

before(async () => {
  infra = await startDatabases();
  api = await startApi(infra);
});

after(async () => {
  await api?.stop();
  stopDatabases(infra);
});

async function call(method, url, { token, body, expect = 200 } = {}) {
  const res = await fetch(`${api.baseUrl}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  assert.equal(res.status, expect, `${method} ${url} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

const dashed = (accountId) => `${accountId.slice(0, 4)}-${accountId.slice(4)}`;

describe('hạ tầng & đăng nhập', () => {
  it('health: SQL Server và MongoDB đều up', async () => {
    const health = await call('GET', '/api/health');
    assert.equal(health.sqlServer, 'up');
    assert.equal(health.mongo, 'up');
  });

  for (const [key, email, role] of [
    ['manager', 'sarah.jenkins@nexus.telecom', 'Manager'],
    ['retail', 'david.chen@nexus.telecom', 'Retail Staff'],
    ['engineer', 'marcus.ramirez@nexus.telecom', 'Field Engineer'],
    ['accounts', 'elena.rostova@nexus.telecom', 'Senior Accountant'],
  ]) {
    it(`nhân viên ${role} đăng nhập`, async () => {
      const res = await call('POST', '/api/auth/login', { body: { email, password: TEST_PASSWORD } });
      assert.equal(res.user.role, role);
      // Quầy bán lẻ biết chi nhánh của mình ngay từ lúc đăng nhập.
      if (key === 'retail') assert.equal(res.user.storeId, 'SH-01');
      tokens[key] = res.token;
    });
  }

  it('sai mật khẩu ⇒ 401 với thông báo chung', async () => {
    const res = await call('POST', '/api/auth/login', {
      body: { email: 'sarah.jenkins@nexus.telecom', password: 'sai' },
      expect: 401,
    });
    assert.deepEqual(res, { error: 'Invalid username or password' });
  });

  it('khách tự đăng ký; trùng email ⇒ 409; đăng nhập được ngay', async () => {
    const email = 'e2e.register@example.com';
    const res = await call('POST', '/api/auth/register', {
      body: { email, password: '123456', name: 'E2E Khách', phoneNumber: '0900000001' },
      expect: 201,
    });
    assert.match(res.user.id, /^CUS\d{6}$/);
    ctx.registered = { email, token: res.token };
    await call('POST', '/api/auth/register', {
      body: { email, password: '123456', name: 'X', phoneNumber: '0900000002' },
      expect: 409,
    });
    const login = await call('POST', '/api/auth/login', { body: { email, password: '123456' } });
    assert.equal(login.user.role, 'Customer');
  });
});

describe('quản trị', () => {
  it('danh sách, lọc và thống kê các danh mục', async () => {
    const t = tokens.manager;
    const plans = await call('GET', '/api/admin/plan', { token: t });
    assert.equal((await call('GET', '/api/admin/plan/stats', { token: t })).totalPlans, plans.length);
    assert.ok((await call('GET', '/api/admin/serviceplan/broadband', { token: t })).every((p) => p.type === 'Broadband'));
    assert.equal((await call('GET', '/api/admin/vendor?search=cisco', { token: t })).length, 1);
    const stores = await call('GET', '/api/admin/retailstore', { token: t });
    assert.ok(stores[0].regionSubtitle.includes('City Code'));
    const staff = await call('GET', '/api/admin/employee?role=Retail Staff', { token: t });
    assert.ok(staff.length > 0 && staff.every((e) => e.role === 'Retail Staff'));
    const overview = await call('GET', '/api/admin/inventory/overview', { token: t });
    assert.equal(overview.items.length, overview.stats.totalCategoriesCount);
  });

  it('gói cước: thêm, sửa, xoá; dữ liệu sai ⇒ 400; đang có đơn ⇒ 409', async () => {
    const t = tokens.manager;
    const plan = await call('POST', '/api/admin/plan', {
      token: t,
      expect: 201,
      body: { name: 'E2E Plan', connectionType: 'Broadband', monthlyRental: 99.99, securityDeposit: 500 },
    });
    assert.match(plan.planId, /^plan-\d{10}$/);
    // Gói mới hiện ngay ở danh mục công khai (quầy bán lẻ, trang đăng ký); ngừng bán thì biến mất.
    const inCatalog = async () => (await call('GET', '/api/catalog/plans')).some((p) => p.planId === plan.planId);
    assert.equal(await inCatalog(), true);
    const updated = await call('PUT', `/api/admin/plan/${plan.planId}`, { token: t, body: { name: 'E2E Plan v2', status: 'Archived' } });
    assert.equal(updated.status, 'Archived');
    assert.equal(await inCatalog(), false);
    await call('DELETE', `/api/admin/plan/${plan.planId}`, { token: t });
    await call('GET', `/api/admin/plan/${plan.planId}`, { token: t, expect: 404 });
    const invalid = await call('POST', '/api/admin/plan', { token: t, body: { monthlyRental: -1 }, expect: 400 });
    assert.ok(invalid.errors.name && invalid.errors.monthlyRental);
    await call('DELETE', '/api/admin/plan/plan-bb-64', { token: t, expect: 409 });
  });

  it('danh mục chi nhánh công khai chỉ có thông tin liên hệ', async () => {
    const stores = await call('GET', '/api/catalog/stores');
    const sh01 = stores.find((s) => s.storeId === 'SH-01');
    assert.ok(sh01.address && sh01.cityCode);
    assert.equal(sh01.activeEmployeesCount, undefined);
    assert.equal(sh01.totalSubscribersServed, undefined);
  });

  it('nhà cung cấp, cửa hàng, nhân viên', async () => {
    const t = tokens.manager;
    const vendor = await call('POST', '/api/admin/vendor', { token: t, expect: 201, body: { companyName: 'E2E Vendor' } });
    assert.equal(vendor.category, 'Hardware');
    await call('DELETE', `/api/admin/vendor/${vendor.vendorId}`, { token: t });

    const store = await call('POST', '/api/admin/retailshop', {
      token: t,
      expect: 201,
      body: { name: 'E2E Store', city: 'Boston', cityCode: '099', address: '1 Main St' },
    });
    const employee = await call('POST', '/api/admin/employee', {
      token: t,
      expect: 201,
      body: {
        fullName: 'E2E Staff',
        email: 'e2e.staff@nexus.telecom',
        retailShopAssigned: `E2E Store (${store.storeId})`,
        dateOfJoining: '2026-01-15',
      },
    });
    assert.equal(employee.storeId, store.storeId);
    assert.equal(employee.dateOfJoining, '2026-01-15');
    // Không nhập mật khẩu ⇒ mật khẩu demo mặc định.
    await call('POST', '/api/auth/login', { body: { email: employee.email, password: '1234567890' } });
    const removed = await call('DELETE', `/api/admin/employee/${employee.employeeId}`, { token: t });
    assert.match(removed.message, /Inactive/);

    // Mã "SH-04" là chuỗi con của "SH-041": phải gán đúng cửa hàng ghi trong ngoặc.
    const similar = await call('POST', '/api/admin/retailshop', {
      token: t,
      expect: 201,
      body: { storeId: 'SH-041', name: 'E2E Similar Code', city: 'Boston', cityCode: '099', address: '2 Main St' },
    });
    const colleague = await call('POST', '/api/admin/employee', {
      token: t,
      expect: 201,
      body: { fullName: 'E2E Staff 2', email: 'e2e.staff2@nexus.telecom', retailShopAssigned: `Chi nhánh (${similar.storeId})` },
    });
    assert.equal(colleague.storeId, 'SH-041');
  });

  it('kho: thêm vật tư, nhập thêm hàng, xoá', async () => {
    const t = tokens.manager;
    const item = await call('POST', '/api/admin/inventory', {
      token: t,
      expect: 201,
      body: { name: 'E2E ONT', supplier: 'Cisco Systems Commercial Hardware', stockQuantity: 3, reorderLevel: 5 },
    });
    assert.equal(item.status, 'Low Stock');
    assert.equal(item.vendorId, 'vnd-02');
    const restocked = await call('POST', `/api/admin/inventory/${item.inventoryId}/restock`, { token: t, body: { quantity: 10 } });
    assert.equal(restocked.stockQuantity, 13);
    assert.equal(restocked.status, 'In Stock');
    await call('DELETE', `/api/admin/inventory/${item.inventoryId}`, { token: t });
  });

  it('đơn mua thiết bị: nhận hàng thì cộng kho, sau đó không xoá / huỷ được', async () => {
    const t = tokens.manager;
    const [target] = await call('GET', '/api/admin/inventory', { token: t });
    const po = await call('POST', '/api/admin/purchaseorder', {
      token: t,
      expect: 201,
      body: { vendorId: 'vnd-02', itemCode: target.itemCode, itemName: target.name, quantity: 3, unitCost: 19.99 },
    });
    assert.equal(po.totalCost, 59.97);
    assert.ok(po.vendor.companyName.includes('Cisco'));
    await call('PUT', `/api/admin/purchaseorder/${po.purchaseOrderId}/status`, { token: t, body: { status: 'Received' } });
    const after = await call('GET', `/api/admin/inventory/${target.inventoryId}`, { token: t });
    assert.equal(after.stockQuantity, target.stockQuantity + 3);
    await call('DELETE', `/api/admin/purchaseorder/${po.purchaseOrderId}`, { token: t, expect: 409 });
    await call('PUT', `/api/admin/purchaseorder/${po.purchaseOrderId}/status`, { token: t, body: { status: 'Cancelled' }, expect: 409 });
  });
});

describe('đơn hàng → khảo sát → cấp kết nối', () => {
  it('khách đặt đơn công khai; gửi trùng trong 60 giây trả lại đơn cũ', async () => {
    const body = {
      customerName: 'E2E Bulk Corp',
      customerEmail: 'bulk@example.com',
      customerPhone: '0912 345 678',
      installationAddress: '99 E2E Street',
      idProofType: 'Passport',
      idProofNumber: 'P123456',
      connectionType: 'Broadband',
      planId: 'plan-bb-64',
      planName: 'Broadband Unlimited 64 Kbps',
      retailOutletCode: 'SH-01',
      bulkConnectionsCount: 2,
      status: 'Feasible',
    };
    const order = await call('POST', '/api/public/orders', { body, expect: 201 });
    assert.match(order.orderId, /^B\d{10}$/);
    // Trạng thái client gửi bị bỏ qua: đơn mới luôn chờ chi nhánh duyệt.
    assert.equal(order.status, 'PendingRetail');
    assert.equal((await call('POST', '/api/public/orders', { body, expect: 201 })).orderId, order.orderId);
    const detail = await call('GET', `/api/Technical/orders/${order.orderId}`, { token: tokens.retail });
    assert.equal(detail.customerPhone, '0912345678');
    // Tra công khai bằng mã đơn: thấy tiến độ, không thấy thông tin cá nhân.
    const tracked = await call('GET', `/api/public/orders/${order.orderId.toLowerCase()}`);
    assert.equal(tracked.status, 'PendingRetail');
    assert.equal(tracked.accountIssued, false);
    for (const field of ['customerName', 'customerPhone', 'customerEmail', 'installationAddress', 'idProofNumber']) {
      assert.equal(tracked[field], undefined, field);
    }
    await call('GET', '/api/public/orders/B9999999999', { expect: 404 });
    ctx.order = order;
  });

  it('đơn trên 50 kết nối: chiết khấu 100% và miễn cọc', async () => {
    const order = await call('POST', '/api/Technical/orders', {
      token: tokens.retail,
      expect: 201,
      body: {
        customerName: 'E2E Mega',
        customerEmail: 'mega@example.com',
        connectionType: 'Landline',
        planId: 'plan-ll-std-m',
        retailOutletCode: 'SH-01',
        bulkConnectionsCount: 51,
      },
    });
    assert.match(order.orderId, /^T\d{10}$/);
    assert.equal(order.bulkDiscountPercent, 100);
    assert.equal(order.depositWaived, true);
  });

  it('chặn đơn sai nghiệp vụ: CCCD không đủ 12 số, Dial-Up thiếu landline', async () => {
    const base = { customerName: 'X', customerEmail: 'x@example.com', planId: 'plan-bb-64', retailOutletCode: 'SH-01' };
    const cccd = await call('POST', '/api/public/orders', {
      body: { ...base, idProofType: 'National ID Card', idProofNumber: '123' },
      expect: 400,
    });
    assert.match(cccd.message, /12 chữ số/);
    const dialUp = await call('POST', '/api/public/orders', { body: { ...base, connectionType: 'Dial-Up' }, expect: 400 });
    assert.match(dialUp.message, /Landline/);
  });

  it('lọc đơn theo trạng thái, tên khách và khoảng ngày', async () => {
    const t = tokens.engineer;
    const today = new Date().toISOString().slice(0, 10);
    for (const query of ['status=PendingRetail', 'customerName=bulk corp', `fromDate=${today}&toDate=${today}`]) {
      const orders = await call('GET', `/api/Technical/orders?${query}`, { token: t });
      assert.ok(orders.some((o) => o.orderId === ctx.order.orderId), query);
    }
  });

  it('chưa duyệt thì không phân công được; từ chối phải có lý do', async () => {
    const url = `/api/Technical/orders/${ctx.order.orderId}/status`;
    await call('PUT', url, { token: tokens.retail, body: { status: 'Pending', assignedTechnician: 'Marcus' }, expect: 400 });
    await call('PUT', url, { token: tokens.retail, body: { status: 'Not Approved' }, expect: 400 });
  });

  it('bán lẻ duyệt hồ sơ, rồi phân công kỹ thuật viên', async () => {
    // Quầy bán lẻ lấy danh bạ chi nhánh: nhân viên bán lẻ + kỹ thuật viên đang làm việc, không mật khẩu.
    const staff = await call('GET', '/api/retail/staff', { token: tokens.retail });
    assert.ok(staff.some((e) => e.employeeId === 'emp-03' && e.role === 'Field Engineer'));
    assert.ok(staff.some((e) => e.role === 'Retail Staff' && e.storeId === 'SH-01'));
    assert.ok(staff.every((e) => ['Retail Staff', 'Field Engineer'].includes(e.role) && e.status === 'Active'));
    assert.ok(staff.every((e) => !('passwordHash' in e)));
    const url = `/api/Technical/orders/${ctx.order.orderId}/status`;
    const approved = await call('PUT', url, {
      token: tokens.retail,
      body: { status: 'pending', retailApprovedBy: 'David Chen', retailApprovalNotes: 'Đủ giấy tờ' },
    });
    assert.equal(approved.status, 'Pending');
    const assigned = await call('PUT', url, {
      token: tokens.manager,
      body: { status: 'Pending', assignedTechnician: 'Marcus Ramirez', assignedTechnicianId: 'emp-03' },
    });
    assert.equal(assigned.employeeId, 'emp-03');
    assert.equal(assigned.retailApprovalNotes, 'Đủ giấy tờ');
  });

  it('khảo sát khả thi: giữ chỗ Account ID 16 ký tự theo mã thành phố', async () => {
    const url = `/api/Technical/orders/${ctx.order.orderId}/feasibility`;
    await call('PUT', url, { token: tokens.engineer, body: { isFeasible: false, checkedBy: 'emp-03' }, expect: 400 });
    await call('PUT', url, { token: tokens.engineer, body: { isFeasible: true, checkedBy: 'ghost' }, expect: 400 });
    const res = await call('PUT', url, {
      token: tokens.engineer,
      body: { isFeasible: true, checkedBy: 'emp-03', cableDistanceMeters: 120, signalLossDbm: -12.5 },
    });
    assert.equal(res.status, 'Feasible');
    assert.match(res.assignedAccountId, /^B064\d{12}$/);
    // Tra công khai chỉ báo đã có mã, không lộ chính mã tài khoản.
    const tracked = await call('GET', `/api/public/orders/${ctx.order.orderId}`);
    assert.equal(tracked.accountIssued, true);
    assert.equal(tracked.assignedAccountId, undefined);
    ctx.reservedAccountId = res.assignedAccountId;
  });

  it('lên lịch lắp đặt: quá khứ ⇒ 400, tương lai ⇒ OK', async () => {
    const url = `/api/Technical/orders/${ctx.order.orderId}/installation-schedule`;
    await call('PUT', url, { token: tokens.engineer, body: { scheduledInstallDate: '2020-01-01T08:00:00Z' }, expect: 400 });
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const res = await call('PUT', url, { token: tokens.engineer, body: { scheduledInstallDate: future, technicianId: 'emp-03' } });
    assert.equal(res.technicianId, 'emp-03');
  });

  it('thêm thiết bị; MAC sai ⇒ 400; serial trùng ⇒ 409', async () => {
    const t = tokens.engineer;
    const inventory = await call('GET', '/api/Technical/inventory', { token: t });
    ctx.inventory = inventory.find((item) => item.stockQuantity > 5);
    ctx.equipment = [];
    for (const n of [1, 2]) {
      const res = await call('POST', '/api/Technical/equipment', {
        token: t,
        expect: 201,
        body: {
          equipmentId: `eq-e2e-${n}`,
          inventoryId: ctx.inventory.inventoryId,
          serialNumber: `SN-E2E-${n}`,
          macAddress: `AA:BB:CC:DD:EE:0${n}`,
          deviceModel: 'E2E Router',
          deviceType: 'Gigabit Router',
          vendorId: 'vnd-02',
          storeId: 'SH-01',
        },
      });
      ctx.equipment.push(res.equipmentId);
    }
    const device = { serialNumber: 'X', deviceModel: 'M', deviceType: 'T', vendorId: 'vnd-02' };
    await call('POST', '/api/Technical/equipment', { token: t, body: { ...device, equipmentId: 'x1', macAddress: 'nope' }, expect: 400 });
    await call('POST', '/api/Technical/equipment', {
      token: t,
      body: { ...device, equipmentId: 'x2', serialNumber: 'SN-E2E-1', macAddress: 'AA:BB:CC:DD:EE:99' },
      expect: 409,
    });
  });

  it('cấp kết nối 1/2: dùng mã đã giữ chỗ, trừ kho, đơn vẫn Feasible', async () => {
    const url = `/api/Technical/orders/${ctx.order.orderId}/provide-connection`;
    const res = await call('POST', url, {
      token: tokens.engineer,
      body: { equipmentId: ctx.equipment[0], ipAddress: '10.0.0.15', portNumber: 'P-1' },
    });
    assert.equal(res.accountId, ctx.reservedAccountId);
    assert.equal(res.orderStatus, 'Feasible');
    const item = await call('GET', `/api/Technical/inventory/${ctx.inventory.inventoryId}`, { token: tokens.engineer });
    assert.equal(item.stockQuantity, ctx.inventory.stockQuantity - 1);
    ctx.accountId = res.accountId;
    // Thiết bị đã dùng ⇒ 409; IP sai ⇒ 400.
    await call('POST', url, { token: tokens.engineer, body: { equipmentId: ctx.equipment[0] }, expect: 409 });
    await call('POST', url, { token: tokens.engineer, body: { equipmentId: ctx.equipment[1], ipAddress: '999.1.1.1' }, expect: 400 });
  });

  it('cấp kết nối 2/2: sinh mã mới, đơn ⇒ Connection Provided', async () => {
    const res = await call('POST', `/api/Technical/orders/${ctx.order.orderId}/provide-connection`, {
      token: tokens.engineer,
      body: { equipmentId: ctx.equipment[1] },
    });
    assert.notEqual(res.accountId, ctx.accountId);
    assert.equal(res.orderStatus, 'Connection Provided');
    ctx.secondAccountId = res.accountId;
  });

  it('tra cứu kết nối theo mã liền, có gạch hoặc chữ thường', async () => {
    const t = tokens.engineer;
    const plain = await call('GET', `/api/Technical/connections/${ctx.accountId}`, { token: t });
    const withDash = await call('GET', `/api/Technical/connections/${dashed(ctx.accountId).toLowerCase()}`, { token: t });
    assert.equal(plain.accountId, withDash.accountId);
    const found = await call('GET', `/api/Technical/connections/search?accountId=${ctx.accountId.slice(-6)}`, { token: t });
    assert.ok(found.some((c) => c.accountId === ctx.accountId));
  });

  it('tạm ngưng → khôi phục → ngừng vĩnh viễn: thiết bị về kho, không kích hoạt lại được', async () => {
    const t = tokens.engineer;
    const url = `/api/Technical/connections/${ctx.secondAccountId}/status`;
    await call('PUT', url, { token: t, body: { status: 'Temporarily Inactive' }, expect: 400 });
    await call('PUT', url, { token: t, body: { status: 'temporarily inactive', reason: 'Nợ cước', performedBy: 'emp-03' } });
    await call('PUT', url, { token: t, body: { status: 'Active' } });
    const stockBefore = (await call('GET', `/api/Technical/inventory/${ctx.inventory.inventoryId}`, { token: t })).stockQuantity;
    await call('PUT', url, { token: t, body: { status: 'Permanently Inactive', reason: 'Huỷ hợp đồng' } });

    const connection = await call('GET', `/api/Technical/connections/${ctx.secondAccountId}`, { token: t });
    assert.equal(connection.equipmentId, null);
    assert.ok(connection.suspensionEndDate && connection.terminatedDate);
    assert.equal((await call('GET', `/api/Technical/equipment/${ctx.equipment[1]}`, { token: t })).status, 'In Stock');
    const stockAfter = (await call('GET', `/api/Technical/inventory/${ctx.inventory.inventoryId}`, { token: t })).stockQuantity;
    assert.equal(stockAfter, stockBefore + 1);
    await call('PUT', url, { token: t, body: { status: 'Active' }, expect: 409 });
  });

  it('nhật ký kết nối: mỗi lần cấp / đổi trạng thái thành công ghi đúng một dòng', async () => {
    const t = tokens.engineer;
    const logs = await call('GET', `/api/Technical/connections/${dashed(ctx.secondAccountId)}/activity-logs`, { token: t });
    // Mới nhất trước. Hai lần bị từ chối (thiếu lý do, kích hoạt lại sau khi ngừng) không được ghi.
    assert.deepEqual(
      logs.map((l) => [l.actionType, l.oldValue, l.newValue]),
      [
        ['StatusChange', 'Active', 'Permanently Inactive'],
        ['StatusChange', 'Temporarily Inactive', 'Active'],
        ['StatusChange', 'Active', 'Temporarily Inactive'],
        ['Provisioning', null, 'Active'],
      ]
    );
    assert.equal(logs[0].reason, 'Huỷ hợp đồng');
    assert.equal(logs[2].performedByName, 'Marcus Ramirez');
    assert.match(logs[3].reason, new RegExp(ctx.order.orderId));
    await call('GET', '/api/Technical/connections/B064999999999999/activity-logs', { token: t, expect: 404 });
    // Khách hàng không đọc được nhật ký nội bộ.
    await call('GET', `/api/Technical/connections/${ctx.secondAccountId}/activity-logs`, { token: ctx.registered.token, expect: 403 });
  });

  it('thiết bị đang phục vụ khách: không đổi sang Faulty, không xoá được', async () => {
    const t = tokens.engineer;
    await call('PUT', `/api/Technical/equipment/${ctx.equipment[0]}`, { token: t, body: { status: 'Faulty' }, expect: 409 });
    await call('DELETE', `/api/Technical/equipment/${ctx.equipment[0]}`, { token: t, expect: 409 });
    await call('DELETE', `/api/Technical/equipment/${ctx.equipment[1]}`, { token: t, expect: 204 });
  });

  it('điều chỉnh tồn kho đồng thời không mất lần nào; xuất quá tồn ⇒ 400', async () => {
    const t = tokens.engineer;
    const url = `/api/Technical/inventory/${ctx.inventory.inventoryId}`;
    const before = (await call('GET', url, { token: t })).stockQuantity;
    await call('POST', `${url}/adjust-stock`, { token: t, body: { quantityChange: -999_999, reason: 'x' }, expect: 400 });
    await Promise.all(
      Array.from({ length: 5 }, () => call('POST', `${url}/adjust-stock`, { token: t, body: { quantityChange: 1, reason: 'nhập' } }))
    );
    assert.equal((await call('GET', url, { token: t })).stockQuantity, before + 5);
  });

  it('yêu cầu nhập thiết bị: Manager đáp ứng ⇒ tạo thiết bị + cộng kho', async () => {
    const request = await call('POST', '/api/technical/equipment-requests', {
      token: tokens.engineer,
      expect: 201,
      body: { storeId: 'SH-01', inventoryId: ctx.inventory.inventoryId, itemName: 'E2E Modem', deviceType: 'Modem', quantity: 2 },
    });
    assert.equal(request.employeeId, 'emp-03');
    const url = `/api/Technical/inventory/${ctx.inventory.inventoryId}`;
    const before = (await call('GET', url, { token: tokens.engineer })).stockQuantity;
    await call('PUT', `/api/admin/equipment-requests/${request.requestId}/status`, {
      token: tokens.manager,
      body: { status: 'Fulfilled', adminNotes: 'Đã giao' },
    });
    assert.equal((await call('GET', url, { token: tokens.engineer })).stockQuantity, before + 2);
    const devices = await call('GET', '/api/Technical/equipment?storeId=SH-01', { token: tokens.engineer });
    assert.equal(devices.filter((d) => d.deviceModel === 'E2E Modem').length, 2);
    await call('DELETE', `/api/technical/equipment-requests/${request.requestId}`, { token: tokens.engineer, expect: 409 });
  });
});

describe('hoá đơn & thanh toán', () => {
  it('lập hoá đơn: server tự tính cọc theo gói, chiết khấu, thuế 12.24%', async () => {
    const bill = await call('POST', '/api/billing/bills', {
      token: tokens.accounts,
      expect: 201,
      // subtotal / totalAmount client gửi bị bỏ qua.
      body: { accountId: ctx.accountId, billingMonth: 'October 2026', monthlyRental: 225, discountPercent: 25, subtotal: 1, totalAmount: 1 },
    });
    // Cọc 500 + thuê bao 225 = 725; chiết khấu 25% = 181.25; subtotal 543.75; thuế 66.555 ⇒ 66.56.
    assert.equal(bill.securityDeposit, 500);
    assert.equal(bill.discountAmount, 181.25);
    assert.equal(bill.subtotal, 543.75);
    assert.equal(bill.serviceTaxAmount, 66.56);
    assert.equal(bill.totalAmount, 610.31);
    assert.match(bill.description, /tháng 10\/2026/);
    ctx.bill = bill;
  });

  it('biểu cước: thuế suất mới áp cho hoá đơn sau; kỳ sau không thu cọc lại; chiết khấu không áp lên cước giờ', async () => {
    const t = tokens.accounts;
    assert.deepEqual(await call('GET', '/api/billing/settings', { token: t }), { serviceTaxRate: 12.24, latePaymentFeePercent: 5 });
    await call('PUT', '/api/billing/settings', { token: t, body: { serviceTaxRate: 150, latePaymentFeePercent: 5 }, expect: 400 });
    await call('PUT', '/api/billing/settings', { token: t, body: { serviceTaxRate: 10, latePaymentFeePercent: 6 } });
    const bill = await call('POST', '/api/billing/bills', {
      token: t,
      expect: 201,
      body: { accountId: ctx.accountId, billingMonth: 'November 2026', monthlyRental: 100, hourlyCharges: 40, discountPercent: 10 },
    });
    // Kỳ thứ hai của cùng kết nối: không thu cọc lại. Chiết khấu (0 + 100) × 10% = 10;
    // subtotal 0 + 100 + 40 − 10 = 130 (cước giờ không được chiết khấu); thuế 10% = 13.
    assert.equal(bill.securityDeposit, 0);
    assert.equal(bill.discountAmount, 10);
    assert.equal(bill.serviceTaxRate, 10);
    assert.equal(bill.totalAmount, 143);
    // Trả lại biểu cước mặc định cho các bước sau.
    await call('PUT', '/api/billing/settings', { token: t, body: { serviceTaxRate: 12.24, latePaymentFeePercent: 5 } });
  });

  it('quầy bán lẻ đọc được hoá đơn để thu tại quầy; kỹ thuật thì không', async () => {
    const bills = await call('GET', '/api/retail/bills', { token: tokens.retail });
    assert.ok(bills.some((b) => b.invoiceNumber === ctx.bill.invoiceNumber));
    await call('GET', '/api/retail/bills', { token: tokens.engineer, expect: 403 });
  });

  it('sửa hoá đơn: thêm phí trễ thì tổng được tính lại', async () => {
    const bill = await call('PUT', `/api/billing/bills/${ctx.bill.invoiceNumber}`, {
      token: tokens.accounts,
      body: { lateFeeAmount: 10.1, dueDate: '2026-12-01' },
    });
    assert.equal(bill.totalAmount, 620.41);
    assert.equal(bill.dueDate, '2026-12-01');
  });

  it('kế toán thu một phần ⇒ Partially Paid', async () => {
    const t = tokens.accounts;
    const payment = await call('POST', '/api/billing/bills/payments', {
      token: t,
      body: { invoiceNumber: ctx.bill.invoiceNumber, amountPaid: 200.2, paymentMode: 'Cash' },
    });
    assert.match(payment.paymentId, /^PAY-\d{8}$/);
    const bill = await call('GET', `/api/billing/bills/${ctx.bill.billId}`, { token: t });
    assert.equal(bill.status, 'Partially Paid');
    assert.equal(bill.dueAmount, 420.21);
    await call('POST', '/api/billing/bills/payments', { token: t, body: { invoiceNumber: ctx.bill.invoiceNumber, amountPaid: 0 }, expect: 400 });
    await call('POST', '/api/billing/bills/payments', { token: t, body: { invoiceNumber: 'NOPE', amountPaid: 1 }, expect: 404 });
    // Trả vượt số còn nợ ⇒ 400, hoá đơn giữ nguyên.
    const over = await call('POST', '/api/billing/bills/payments', {
      token: t,
      body: { invoiceNumber: ctx.bill.invoiceNumber, amountPaid: 500 },
      expect: 400,
    });
    assert.equal(over.outstanding, 420.21);
    const unchanged = await call('GET', `/api/billing/bills/${ctx.bill.billId}`, { token: t });
    assert.equal(unchanged.dueAmount, 420.21);
  });
});

describe('cổng khách hàng', () => {
  it('đăng nhập OTP bằng mã tài khoản, gõ kiểu nào cũng được', async () => {
    const sentBefore = otpCount(infra);
    const requested = await call('POST', '/api/auth/otp/request', { body: { accountId: ctx.accountId.toLowerCase() } });
    assert.match(requested.maskedEmail, /\*/);
    await call('POST', '/api/auth/otp/request', { body: { accountId: ctx.accountId }, expect: 429 });

    // Email được ghi ra file (chưa cấu hình SMTP); chờ file mới xuất hiện rồi đọc mã.
    const code = await waitForOtp(infra, sentBefore);
    const wrong = code === '000000' ? '111111' : '000000';
    await call('POST', '/api/auth/otp/verify', { body: { accountId: ctx.accountId, otp: wrong }, expect: 401 });
    const verified = await call('POST', '/api/auth/otp/verify', { body: { accountId: dashed(ctx.accountId), otp: code } });
    assert.equal(verified.user.accountId, ctx.accountId);
    tokens.customer = verified.token;
  });

  it('khách xem hoá đơn của mình kèm lịch sử thanh toán', async () => {
    const bills = await call('GET', '/api/customer/bills', { token: tokens.customer });
    const mine = bills.find((b) => b.invoiceNumber === ctx.bill.invoiceNumber);
    assert.equal(mine.payments.length, 1);
  });

  it('khách chỉ đọc được đơn và kết nối của chính mình', async () => {
    const t = tokens.customer;
    for (const url of ['/api/Technical/orders', '/api/Technical/connections', '/api/Technical/dashboard', '/api/technical/equipment-requests']) {
      await call('GET', url, { token: t, expect: 403 });
    }
    const key = (id) => id.replaceAll('-', '');
    const conns = await call('GET', '/api/customer/connections', { token: t });
    assert.deepEqual(conns.map((c) => key(c.accountId)).sort(), [ctx.accountId, ctx.secondAccountId].map(key).sort());
    const orders = await call('GET', '/api/customer/orders', { token: t });
    assert.deepEqual(orders.map((o) => o.orderId), [ctx.order.orderId]);
    // Khách tự đăng ký chưa mua gì: danh sách rỗng, không lỗi.
    assert.deepEqual(await call('GET', '/api/customer/connections', { token: ctx.registered.token }), []);
  });

  it('khách tự trả online hoá đơn của mình; hoá đơn người khác ⇒ 403', async () => {
    await call('POST', '/api/retail/payments', {
      token: tokens.customer,
      body: { invoiceNumber: ctx.bill.invoiceNumber, amountPaid: 420.21, paymentMode: 'Credit/Debit Card' },
    });
    const bill = await call('GET', `/api/billing/bills/${ctx.bill.billId}`, { token: tokens.accounts });
    assert.equal(bill.status, 'Paid');
    assert.equal(bill.dueAmount, 0);
    // Đã trả đủ thì không trả thêm được nữa.
    await call('POST', '/api/retail/payments', { token: tokens.customer, body: { invoiceNumber: ctx.bill.invoiceNumber, amountPaid: 1 }, expect: 400 });
    const others = await call('GET', '/api/billing/bills', { token: tokens.accounts });
    const other = others.find((b) => b.accountId !== ctx.accountId);
    await call('POST', '/api/retail/payments', { token: tokens.customer, body: { invoiceNumber: other.invoiceNumber, amountPaid: 1 }, expect: 403 });
  });

  it('khách sửa hồ sơ: SĐT sai ⇒ 400, hợp lệ ⇒ OK', async () => {
    await call('PUT', '/api/customer/profile', { token: tokens.customer, body: { fullName: 'E2E', contactNumber: '123' }, expect: 400 });
    const profile = await call('PUT', '/api/customer/profile', {
      token: tokens.customer,
      body: { fullName: 'E2E Bulk Corporation', address: '100 New St' },
    });
    assert.equal(profile.address, '100 New St');
  });

  it('quên mã tài khoản: luôn trả cùng một câu, có giới hạn tần suất', async () => {
    const res = await call('POST', '/api/auth/otp/forgot-account-id', { body: { email: 'bulk@example.com' } });
    assert.match(res.message, /Nếu email này/);
    await call('POST', '/api/auth/otp/forgot-account-id', { body: { email: 'bulk@example.com' }, expect: 429 });
    await call('POST', '/api/auth/otp/forgot-account-id', { body: { email: 'nobody@example.com' } });
  });

  it('gửi phản hồi → Quản trị trả lời ⇒ Resolved', async () => {
    const feedback = await call('POST', '/api/admin/feedback', {
      token: tokens.customer,
      body: { accountId: ctx.accountId, customerName: 'E2E', rating: 4, category: 'billing', message: 'Hoá đơn rõ ràng' },
    });
    assert.equal(feedback.category, 'Billing');
    assert.equal(feedback.status, 'New');
    const answered = await call('PUT', `/api/admin/feedback/${feedback.feedbackId}`, {
      token: tokens.manager,
      body: { response: 'Cảm ơn bạn', respondedBy: 'emp-01' },
    });
    assert.equal(answered.status, 'Resolved');
    await call('POST', '/api/admin/feedback', { token: tokens.customer, body: { customerName: 'E2E', rating: 9, category: 'Billing', message: 'a' }, expect: 400 });
    // Khách xem lại phản hồi của mình kèm câu trả lời; khách khác không thấy.
    const mine = await call('GET', '/api/customer/feedback', { token: tokens.customer });
    const back = mine.find((f) => f.feedbackId === feedback.feedbackId);
    assert.equal(back.response, 'Cảm ơn bạn');
    assert.ok(!(await call('GET', '/api/customer/feedback', { token: ctx.registered.token })).some((f) => f.feedbackId === feedback.feedbackId));
  });

  it('đổi tên, đổi mật khẩu; response không lộ passwordHash', async () => {
    const res = await call('PUT', '/api/profile', { token: ctx.registered.token, body: { name: 'E2E Renamed' } });
    assert.equal(res.customer.fullName, 'E2E Renamed');
    assert.equal('passwordHash' in res.customer, false);
    await call('PUT', '/api/profile/password', { token: ctx.registered.token, body: { currentPassword: 'sai', newPassword: 'abcdef' }, expect: 400 });
    await call('PUT', '/api/profile/password', { token: ctx.registered.token, body: { currentPassword: '123456', newPassword: 'abcdef' } });
    await call('POST', '/api/auth/login', { body: { email: ctx.registered.email, password: 'abcdef' } });
  });
});

describe('chat & thông báo', () => {
  it('khách chat, Admin trả lời và đánh dấu đã đọc', async () => {
    const session = await call('POST', '/api/chat/sessions', { body: { customerName: 'Khách E2E' } });
    ctx.chatSessionId = session.sessionId;
    const url = `/api/chat/sessions/${session.sessionId}`;
    await call('POST', `${url}/messages`, { body: { senderName: 'Khách E2E', message: 'Xin chào' } });
    await call('POST', `${url}/messages`, { body: { senderName: 'Khách E2E', message: 'Cho hỏi giá' } });
    const sessions = await call('GET', '/api/chat/sessions?search=Khách E2E', { token: tokens.manager });
    assert.equal(sessions.find((s) => s.sessionId === session.sessionId).unreadCount, 2);
    await call('POST', `${url}/messages`, { body: { senderType: 'admin', senderName: 'Hacker', message: 'x' }, expect: 401 });
    await call('POST', `${url}/messages`, { token: tokens.manager, body: { senderType: 'admin', senderName: 'Sarah', message: 'Chào bạn' } });
    const messages = await call('GET', `${url}/messages`);
    assert.deepEqual(messages.map((m) => m.senderType), ['admin', 'guest', 'guest', 'admin']);
    await call('POST', `${url}/read`, { token: tokens.manager, expect: 204 });
    await call('GET', '/api/chat/sessions/SESSION-khong-co/messages', { expect: 404 });
  });

  it('thông báo: gửi đúng người nhận, tin chat gộp lại, đánh dấu đã đọc', async () => {
    const admin = await call('GET', '/api/notifications?audience=role:admin&limit=200', { token: tokens.manager });
    assert.ok(admin.some((n) => n.entityId === ctx.order.orderId && n.type === 'order'));
    // Khách nhắn 2 tin nhưng Admin chỉ có một dòng thông báo cho phiên đó.
    assert.equal(admin.filter((n) => n.type === 'chat' && n.entityId === ctx.chatSessionId).length, 1);
    const customer = await call('GET', `/api/notifications?audience=account:${ctx.accountId.toLowerCase()}`, { token: tokens.customer });
    // Không đọc được thông báo của Admin hay của khách khác.
    await call('GET', '/api/notifications?audience=role:admin', { token: tokens.customer, expect: 403 });
    await call('GET', `/api/notifications?audience=account:B064999999999999`, { token: tokens.customer, expect: 403 });
    await call('GET', '/api/notifications?audience=role:admin', { expect: 401 });
    assert.ok(customer.some((n) => n.type === 'billing'));

    const before = await call('GET', '/api/notifications/count?audience=role:accounts', { token: tokens.accounts });
    const unread = (await call('GET', '/api/notifications?audience=role:accounts', { token: tokens.accounts })).find((n) => !n.read);
    await call('POST', `/api/notifications/${unread.id}/read?audience=role:accounts`, { token: tokens.accounts, expect: 204 });
    const after = await call('GET', '/api/notifications/count?audience=role:accounts', { token: tokens.accounts });
    assert.equal(after.unread, before.unread - 1);
    assert.equal((await call('POST', '/api/notifications/read-all?audience=role:accounts', { token: tokens.accounts })).updated, after.unread);
  });
});
