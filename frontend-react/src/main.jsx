import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import './index.css';
import './responsive.css';
// Bật giao diện sáng/tối đã lưu trước khi vẽ trang.
import './context/ThemeContext';
// Nạp sớm kho thông báo: module này tự mở kết nối Socket.IO và bám theo
// người đang đăng nhập, nhờ vậy toast thông báo chạy trên mọi trang.
import './context/NotificationContext';
import { routes } from './routes';
import { migrateHashUrl, registerRouter } from './lib/router';

migrateHashUrl();
const router = createBrowserRouter(routes);
registerRouter(router);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
