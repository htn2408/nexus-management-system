// Các nhánh của API Auth bị chặn trước khi chạm database (validate dữ liệu đầu vào).
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { postJson, startTestServer } from './helpers/http.js';

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

describe('POST /api/auth/register', () => {
  const valid = { email: 'a@b.com', password: '123456', name: 'An', phoneNumber: '0912345678' };

  const cases = [
    ['thiếu field', { email: 'a@b.com' }, 'Email, password, name và phoneNumber là bắt buộc.'],
    ['email sai định dạng', { ...valid, email: 'abc' }, 'Email không hợp lệ.'],
    ['mật khẩu ngắn', { ...valid, password: '123' }, 'Mật khẩu phải có ít nhất 6 ký tự.'],
    ['số điện thoại có chữ', { ...valid, phoneNumber: '09123abc78' }, 'Số điện thoại không hợp lệ.'],
    ['số điện thoại 9 số', { ...valid, phoneNumber: '091234567' }, 'Số điện thoại không hợp lệ.'],
  ];

  for (const [name, payload, error] of cases) {
    it(`${name} ⇒ 400 { error }`, async () => {
      const { status, body } = await postJson(server.baseUrl, '/api/auth/register', payload);
      assert.equal(status, 400);
      assert.deepEqual(body, { error });
    });
  }
});

describe('POST /api/auth/login', () => {
  const cases = [
    ['email sai định dạng', { email: 'abc', password: 'x' }],
    ['thiếu mật khẩu', { email: 'a@b.com', password: '' }],
    ['body rỗng', {}],
  ];

  for (const [name, payload] of cases) {
    it(`${name} ⇒ 401 thông báo chung`, async () => {
      const { status, body } = await postJson(server.baseUrl, '/api/auth/login', payload);
      assert.equal(status, 401);
      assert.deepEqual(body, { error: 'Invalid username or password' });
    });
  }
});

describe('giới hạn đăng nhập sai', () => {
  it('sai 5 lần cùng một email ⇒ lần thứ 6 bị khoá 429 kèm Retry-After', async () => {
    const payload = { email: 'brute@force', password: 'x' };
    for (let i = 0; i < 5; i++) {
      const { status } = await postJson(server.baseUrl, '/api/auth/login', payload);
      assert.equal(status, 401);
    }

    const response = await fetch(`${server.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    assert.equal(response.status, 429);
    assert.match(body.error, /quá nhiều lần/);
    assert.ok(body.retryAfterSeconds > 0 && body.retryAfterSeconds <= 900);
    assert.equal(response.headers.get('retry-after'), String(body.retryAfterSeconds));
  });

  it('email khác vẫn đăng nhập (thử) bình thường', async () => {
    const { status } = await postJson(server.baseUrl, '/api/auth/login', { email: 'other@person', password: 'x' });
    assert.equal(status, 401);
  });
});

describe('POST /api/auth/otp/*', () => {
  it('request thiếu mã tài khoản ⇒ 400 { message, errors }', async () => {
    const { status, body } = await postJson(server.baseUrl, '/api/auth/otp/request', { accountId: '  ' });
    assert.equal(status, 400);
    assert.deepEqual(body, {
      message: 'Dữ liệu gửi lên không hợp lệ',
      errors: { accountId: ['Vui lòng nhập mã tài khoản.'] },
    });
  });

  it('request mã tài khoản quá 30 ký tự ⇒ 400', async () => {
    const { status, body } = await postJson(server.baseUrl, '/api/auth/otp/request', {
      accountId: 'T'.repeat(31),
    });
    assert.equal(status, 400);
    assert.deepEqual(body.errors, { accountId: ['Mã tài khoản không hợp lệ.'] });
  });

  it('verify OTP không đủ 6 chữ số ⇒ 400', async () => {
    const { status, body } = await postJson(server.baseUrl, '/api/auth/otp/verify', {
      accountId: 'T064000000000001',
      otp: '12a45',
    });
    assert.equal(status, 400);
    assert.deepEqual(body.errors, { otp: ['Mã OTP gồm đúng 6 chữ số.'] });
  });

  it('verify thiếu cả hai field ⇒ báo lỗi cả hai', async () => {
    const { status, body } = await postJson(server.baseUrl, '/api/auth/otp/verify', {});
    assert.equal(status, 400);
    assert.deepEqual(Object.keys(body.errors).sort(), ['accountId', 'otp']);
  });

  it('forgot-account-id email sai ⇒ 400', async () => {
    const { status, body } = await postJson(server.baseUrl, '/api/auth/otp/forgot-account-id', {
      email: 'khong-co-a-cong',
    });
    assert.equal(status, 400);
    assert.deepEqual(body.errors, { email: ['Email không hợp lệ.'] });
  });
});
