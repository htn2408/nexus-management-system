// Phân quyền thông báo, chat và kênh Socket.IO: chỉ nghe / đọc được dữ liệu của chính mình.
import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { io as connect } from 'socket.io-client';
import { REALTIME_PATH } from '../src/constants/realtime.js';
import { Roles } from '../src/constants/roles.js';
import { canAccessAudience } from '../src/services/audience.service.js';
import { closeSocket, initSocket } from '../src/sockets/index.js';
import { signToken } from '../src/utils/jwt.js';
import { postJson, startTestServer } from './helpers/http.js';

const manager = { id: 'emp-01', role: Roles.Manager, accountType: 'Employee' };
const retail = { id: 'emp-02', role: Roles.RetailStaff, accountType: 'Employee' };
const otpCustomer = { id: 'B064-000000000002', role: Roles.Customer, accountType: 'Customer' };
const token = (user) => signToken(user);

describe('canAccessAudience', () => {
  it('nhân viên chỉ nghe group theo đúng role của mình', async () => {
    assert.equal(await canAccessAudience(manager, 'role:admin'), true);
    assert.equal(await canAccessAudience(manager, 'role:retail'), false);
    assert.equal(await canAccessAudience(retail, 'role:retail'), true);
    assert.equal(await canAccessAudience(retail, 'role:admin'), false);
    assert.equal(await canAccessAudience(manager, 'account:B064000000000002'), false);
  });

  it('khách đăng nhập OTP nghe được mã tài khoản trong token, không nghe group nhân viên', async () => {
    assert.equal(await canAccessAudience(otpCustomer, 'account:B064000000000002'), true);
    assert.equal(await canAccessAudience(otpCustomer, 'role:admin'), false);
  });

  it('chưa đăng nhập thì không nghe được gì', async () => {
    assert.equal(await canAccessAudience(null, 'role:admin'), false);
  });
});

describe('REST: thông báo và chat', () => {
  let server;
  before(async () => {
    server = await startTestServer();
  });
  after(async () => {
    await server.close();
  });

  const get = (path, user) =>
    fetch(`${server.baseUrl}${path}`, { headers: user ? { Authorization: `Bearer ${token(user)}` } : {} });

  it('đọc thông báo phải đăng nhập', async () => {
    assert.equal((await get('/api/notifications?audience=role:admin')).status, 401);
  });

  it('không đọc được thông báo của người khác', async () => {
    assert.equal((await get('/api/notifications?audience=role:admin', retail)).status, 403);
    // Khách đọc thông báo nội bộ của nhân viên. (Khách đọc tài khoản của khách khác cần CSDL: có trong e2e.)
    assert.equal((await get('/api/notifications/count?audience=role:accounts', otpCustomer)).status, 403);
  });

  it('audience sai định dạng vẫn trả 400', async () => {
    assert.equal((await get('/api/notifications?audience=role:hacker', manager)).status, 400);
  });

  it('danh sách phiên chat chỉ dành cho Manager', async () => {
    assert.equal((await get('/api/chat/sessions')).status, 401);
    assert.equal((await get('/api/chat/sessions', otpCustomer)).status, 403);
  });

  it('không mạo danh Admin trả lời chat được', async () => {
    const body = { senderType: 'admin', senderName: 'Fake Admin', message: 'Chuyển khoản vào số này nhé' };
    const anonymous = await postJson(server.baseUrl, '/api/chat/sessions/SESSION-x/messages', body);
    assert.equal(anonymous.status, 401);

    const res = await fetch(`${server.baseUrl}/api/chat/sessions/SESSION-x/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(retail)}` },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 403);
  });
});

describe('Socket.IO: xin vào group', () => {
  let httpServer;
  let url;

  before(async () => {
    httpServer = http.createServer();
    initSocket(httpServer, { origin: true });
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${httpServer.address().port}`;
  });

  after(async () => {
    await closeSocket();
  });

  async function tryJoin(event, value, user) {
    const socket = connect(url, { path: REALTIME_PATH, transports: ['websocket'], forceNew: true });
    try {
      return await socket.timeout(3000).emitWithAck(event, value, user ? token(user) : null);
    } finally {
      socket.close();
    }
  }

  it('Manager vào được role:admin', async () => {
    assert.deepEqual(await tryJoin('JoinRole', 'admin', manager), { ok: true });
  });

  it('nhân viên bán lẻ không nghe trộm được group Admin', async () => {
    assert.deepEqual(await tryJoin('JoinRole', 'admin', retail), { ok: false });
  });

  it('không có token thì không vào được group nào', async () => {
    assert.deepEqual(await tryJoin('JoinRole', 'admin', null), { ok: false });
    assert.deepEqual(await tryJoin('JoinAccount', 'B064000000000002', null), { ok: false });
  });

  it('khách vào được group mã tài khoản của mình', async () => {
    assert.deepEqual(await tryJoin('JoinAccount', 'b064-000000000002', otpCustomer), { ok: true });
  });
});
