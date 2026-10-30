// Mở app trên một cổng ngẫu nhiên để test gọi bằng fetch, không cần thư viện ngoài.
import { createApp } from '../../src/app.js';

export async function startTestServer() {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        // Không chờ các request còn treo (VD đang đợi database không có trong môi trường test).
        server.closeAllConnections();
      }),
  };
}

/** POST JSON, trả về { status, body }. */
export async function postJson(baseUrl, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}
