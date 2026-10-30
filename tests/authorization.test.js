// Mọi endpoint cần đăng nhập phải chặn request không có token (401) và token sai role (403).
// Danh sách bám theo các [Authorize] của bản ASP.NET; không cần database vì bị chặn trước.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Roles } from '../src/constants/roles.js';
import { signToken } from '../src/utils/jwt.js';
import { startTestServer } from './helpers/http.js';

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

const tokenFor = (role) =>
  signToken({ id: 'TEST-USER', role, accountType: role === Roles.Customer ? 'Customer' : 'Employee' });

async function call(method, path, token) {
  const response = await fetch(`${server.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: method === 'GET' || method === 'DELETE' ? undefined : '{}',
  });
  return response.status;
}

const ALL_STAFF = [Roles.Manager, Roles.RetailStaff, Roles.FieldEngineer, Roles.Accounts];

// [method, path, các role được phép]
const PROTECTED = [
  // ---- Quản trị (chỉ Manager) ----
  ...['plan', 'serviceplan', 'vendor', 'retailshop', 'retailstore', 'employee', 'inventory', 'purchaseorder'].flatMap(
    (resource) => [
      ['GET', `/api/admin/${resource}`, [Roles.Manager]],
      ['POST', `/api/admin/${resource}`, [Roles.Manager]],
      ['GET', `/api/admin/${resource}/x`, [Roles.Manager]],
      ['DELETE', `/api/admin/${resource}/x`, [Roles.Manager]],
    ]
  ),
  ['GET', '/api/admin/plan/stats', [Roles.Manager]],
  ['GET', '/api/admin/employee/search', [Roles.Manager]],
  ['GET', '/api/admin/inventory/overview', [Roles.Manager]],
  ['POST', '/api/admin/inventory/x/restock', [Roles.Manager]],
  ['PUT', '/api/admin/purchaseorder/x/status', [Roles.Manager]],
  ['GET', '/api/admin/systemsettings', [Roles.Manager]],
  ['PUT', '/api/admin/systemsettings/x', [Roles.Manager]],
  ['GET', '/api/admin/feedback', [Roles.Manager]],
  ['PUT', '/api/admin/feedback/x', [Roles.Manager]],
  ['DELETE', '/api/admin/feedback/x', [Roles.Manager]],
  // Khách hàng (và mọi tài khoản đã đăng nhập) được gửi phản hồi.
  ['POST', '/api/admin/feedback', [...ALL_STAFF, Roles.Customer]],

  // ---- Yêu cầu nhập thiết bị (cả 2 đường dẫn) ----
  ...['/api/technical/equipment-requests', '/api/admin/equipment-requests'].flatMap((base) => [
    // Chỉ nhân viên đọc được (trước đây cả khách hàng, như bản ASP.NET).
    ['GET', base, ALL_STAFF],
    ['GET', `${base}/x`, ALL_STAFF],
    ['POST', base, [Roles.FieldEngineer, Roles.Manager]],
    ['PUT', `${base}/x/status`, [Roles.Manager]],
    ['DELETE', `${base}/x`, [Roles.FieldEngineer, Roles.Manager]],
  ]),

  // ---- Kỹ thuật ----
  // Đọc: chỉ nhân viên. Bản ASP.NET cho mọi token đọc, kể cả khách hàng ⇒ khách xem được
  // họ tên, SĐT, giấy tờ của mọi khách khác. Khách đọc dữ liệu của mình qua /api/customer.
  ['GET', '/api/Technical/dashboard', ALL_STAFF],
  ['GET', '/api/Technical/orders', ALL_STAFF],
  ['GET', '/api/Technical/orders/x', ALL_STAFF],
  ['POST', '/api/Technical/orders', [Roles.RetailStaff, Roles.Manager, Roles.Customer]],
  ['PUT', '/api/Technical/orders/x/status', [Roles.RetailStaff, Roles.FieldEngineer, Roles.Manager]],
  ['PUT', '/api/Technical/orders/x/feasibility', [Roles.FieldEngineer, Roles.Manager]],
  ['PUT', '/api/Technical/orders/x/installation-schedule', [Roles.FieldEngineer, Roles.Manager]],
  ['POST', '/api/Technical/orders/x/provide-connection', [Roles.FieldEngineer, Roles.Manager]],
  ['GET', '/api/Technical/connections', ALL_STAFF],
  ['GET', '/api/Technical/connections/search', ALL_STAFF],
  ['GET', '/api/Technical/connections/x', ALL_STAFF],
  ['GET', '/api/Technical/connections/x/activity-logs', ALL_STAFF],
  ['POST', '/api/Technical/connections', [Roles.FieldEngineer, Roles.Manager]],
  ['PUT', '/api/Technical/connections/x/status', [Roles.FieldEngineer, Roles.Manager]],
  ['GET', '/api/Technical/equipment', ALL_STAFF],
  ['GET', '/api/Technical/equipment/x', ALL_STAFF],
  ['POST', '/api/Technical/equipment', [Roles.FieldEngineer, Roles.Manager]],
  ['PUT', '/api/Technical/equipment/x', [Roles.FieldEngineer, Roles.Manager]],
  ['DELETE', '/api/Technical/equipment/x', [Roles.FieldEngineer, Roles.Manager]],
  ['GET', '/api/Technical/inventory', ALL_STAFF],
  ['GET', '/api/Technical/inventory/x', ALL_STAFF],
  ['PUT', '/api/Technical/inventory/x', [Roles.FieldEngineer, Roles.Manager]],
  ['POST', '/api/Technical/inventory/x/adjust-stock', [Roles.FieldEngineer, Roles.Manager]],

  // ---- Hoá đơn / thanh toán ----
  ['GET', '/api/billing/settings', [Roles.Accounts]],
  ['PUT', '/api/billing/settings', [Roles.Accounts]],
  ['GET', '/api/billing/bills', [Roles.Accounts]],
  ['GET', '/api/billing/bills/x', [Roles.Accounts]],
  ['POST', '/api/billing/bills', [Roles.Accounts]],
  ['PUT', '/api/billing/bills/x', [Roles.Accounts]],
  ['POST', '/api/billing/bills/payments', [Roles.Accounts]],
  ['POST', '/api/retail/payments', [Roles.RetailStaff, Roles.Manager, Roles.Accounts, Roles.Customer]],
  ['GET', '/api/retail/bills', [Roles.RetailStaff, Roles.Manager]],
  ['GET', '/api/retail/staff', [Roles.RetailStaff, Roles.Manager]],

  // ---- Chat (thao tác của Admin) ----
  ['GET', '/api/chat/sessions', [Roles.Manager]],
  ['POST', '/api/chat/sessions/x/read', [Roles.Manager]],

  // ---- Cổng khách hàng / hồ sơ ----
  ['GET', '/api/customer/bills', [Roles.Customer]],
  ['GET', '/api/customer/connections', [Roles.Customer]],
  ['GET', '/api/customer/orders', [Roles.Customer]],
  ['GET', '/api/customer/feedback', [Roles.Customer]],
  ['PUT', '/api/customer/profile', [Roles.Customer]],
  ['PUT', '/api/profile', [...ALL_STAFF, Roles.Customer]],
  ['PUT', '/api/profile/password', [...ALL_STAFF, Roles.Customer]],
];

const ALL_ROLES = [...ALL_STAFF, Roles.Customer];

describe('phân quyền', () => {
  for (const [method, path, allowed] of PROTECTED) {
    it(`${method} ${path}`, async () => {
      assert.equal(await call(method, path, null), 401, 'không có token');

      for (const role of ALL_ROLES) {
        const status = await call(method, path, tokenFor(role));
        if (allowed.includes(role)) {
          assert.notEqual(status, 401, `${role} phải qua được bước xác thực`);
          assert.notEqual(status, 403, `${role} phải có quyền`);
        } else {
          assert.equal(status, 403, `${role} phải bị chặn`);
        }
      }
    });
  }
});

describe('endpoint công khai', () => {
  it('POST /api/public/orders thiếu email ⇒ 400', async () => {
    const response = await fetch(`${server.baseUrl}/api/public/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: 'An' }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: 'Vui lòng nhập email để nhận mã đơn hàng.' });
  });


  it('POST /api/chat/sessions thiếu tên ⇒ 400', async () => {
    const response = await fetch(`${server.baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(response.status, 400);
  });
});
