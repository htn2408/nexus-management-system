import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  parseJwtPayload,
  isTokenExpired,
  onUnauthorized,
  handleUnauthorized,
  clearCachedUserData,
} from '../frontend-react/src/lib/api.js';
import { signToken } from '../src/utils/jwt.js';

// Setup mock localStorage in Node.js global environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) ?? null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
  get length() {
    return mockStorage.size;
  },
  key: (index) => Array.from(mockStorage.keys())[index] ?? null,
};

describe('Frontend session & token expiry', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('parseJwtPayload giải mã đúng phần payload của JWT', () => {
    const token = signToken({ id: 'emp-01', role: 'admin', accountType: 'Employee' });
    const payload = parseJwtPayload(token);
    assert.ok(payload);
    assert.equal(payload.sub, 'emp-01');
    assert.equal(payload.role, 'admin');
    assert.equal(payload.accountType, 'Employee');
    assert.ok(typeof payload.exp === 'number');
  });

  it('parseJwtPayload trả về null nếu token không đúng định dạng', () => {
    assert.equal(parseJwtPayload(null), null);
    assert.equal(parseJwtPayload(''), null);
    assert.equal(parseJwtPayload('invalid-token-string'), null);
  });

  it('isTokenExpired nhận diện token còn hạn và token đã hết hạn', () => {
    const validToken = signToken({ id: 'emp-02', role: 'retail', accountType: 'Employee' });
    assert.equal(isTokenExpired(validToken), false);

    // Giả lập token đã hết hạn (exp = 1000 giây sau epoch 1970)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const expiredPayload = Buffer.from(JSON.stringify({ sub: 'emp-02', exp: 1000 })).toString('base64url');
    const expiredToken = `${header}.${expiredPayload}.fake_signature`;
    assert.equal(isTokenExpired(expiredToken), true);

    // Token rỗng hoặc null coi như đã hết hạn
    assert.equal(isTokenExpired(null), true);
    assert.equal(isTokenExpired(''), true);
  });

  it('clearCachedUserData xoá sạch đơn hàng, kết nối, hoá đơn nhưng giữ nguyên cài đặt khác', () => {
    mockStorage.set('nexus_orders_v7', JSON.stringify([{ id: 'D01' }]));
    mockStorage.set('nexus_connections_v7', JSON.stringify([{ id: 'C01' }]));
    mockStorage.set('nexus_bills_v7', JSON.stringify([{ id: 'B01' }]));
    mockStorage.set('nexus_feedbacks_v7', JSON.stringify([{ id: 'F01' }]));
    mockStorage.set('nexus_theme', 'dark');
    mockStorage.set('nexus_language', 'vi');

    clearCachedUserData();

    assert.equal(localStorage.getItem('nexus_orders_v7'), null);
    assert.equal(localStorage.getItem('nexus_connections_v7'), null);
    assert.equal(localStorage.getItem('nexus_bills_v7'), null);
    assert.equal(localStorage.getItem('nexus_feedbacks_v7'), null);
    // Theme và ngôn ngữ người dùng chọn vẫn được giữ lại
    assert.equal(localStorage.getItem('nexus_theme'), 'dark');
    assert.equal(localStorage.getItem('nexus_language'), 'vi');
  });

  it('handleUnauthorized gọi callback onUnauthorized và có debounce chống spam', async () => {
    let callCount = 0;
    onUnauthorized(() => {
      callCount++;
    });

    // Gọi lần 1 -> gọi callback
    handleUnauthorized();
    assert.equal(callCount, 1);

    // Gọi liên tiếp (mô phỏng nhiều request đồng thời gặp 401) -> không bị spam nhiều lần
    handleUnauthorized();
    handleUnauthorized();
    assert.equal(callCount, 1);
  });
});
