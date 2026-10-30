// Tạo Express app: middleware chung → routes → xử lý lỗi.
// Tách khỏi server.js để test (Supertest) dùng được app mà không phải mở cổng thật.
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { buildOpenApiSpec } from './docs/openapi.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

// CORS_ORIGINS để trống ⇒ cho phép mọi origin (giống bản ASP.NET cũ khi chạy local).
export const corsOptions = {
  origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
  credentials: true,
};

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) {
    // Số ("1") = tin bấy nhiêu proxy phía trước; chuỗi = danh sách địa chỉ / "loopback".
    app.set('trust proxy', /^\d+$/.test(env.trustProxy) ? Number(env.trustProxy) : env.trustProxy);
  }
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));

  if (env.apiDocs) {
    const spec = buildOpenApiSpec();
    app.get('/api-docs.json', (req, res) => res.json(spec));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, { swaggerOptions: { persistAuthorization: true } }));
  }

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
