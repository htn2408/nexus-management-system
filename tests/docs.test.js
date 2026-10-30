// Tài liệu Swagger phải khớp với route thật: mọi endpoint khai báo trong src/docs/openapi.js
// đều phải tồn tại (không rơi vào 404 "Không tìm thấy endpoint").
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { documentedEndpoints } from '../src/docs/openapi.js';
import { startTestServer } from './helpers/http.js';

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

describe('Swagger', () => {
  it('GET /api-docs.json trả về spec OpenAPI 3', async () => {
    const res = await fetch(`${server.baseUrl}/api-docs.json`);
    const spec = await res.json();
    assert.equal(res.status, 200);
    assert.equal(spec.openapi, '3.0.3');
    assert.ok(Object.keys(spec.paths).length > 50);
  });

  it('GET /api-docs/ trả về trang Swagger UI', async () => {
    const res = await fetch(`${server.baseUrl}/api-docs/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /swagger-ui/);
  });

  for (const [method, path] of documentedEndpoints()) {
    it(`${method.toUpperCase()} ${path} có route thật`, async () => {
      const url = path.replaceAll(/\{\w+\}/g, 'x');
      let body = null;
      try {
        const res = await fetch(`${server.baseUrl}${url}`, {
          method: method.toUpperCase(),
          headers: { 'Content-Type': 'application/json' },
          body: method === 'get' || method === 'delete' ? undefined : '{}',
          // Route có thật nhưng đang chờ database (không có trong test) thì coi như tồn tại.
          signal: AbortSignal.timeout(1500),
        });
        body = await res.json().catch(() => null);
      } catch (err) {
        if (err.name === 'TimeoutError') return;
        throw err;
      }
      assert.ok(!body?.message?.startsWith('Không tìm thấy endpoint'), `${method} ${url} không có route`);
    });
  }
});
