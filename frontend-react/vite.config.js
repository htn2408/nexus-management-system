import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Khi chạy với VITE_API_URL rỗng, trình duyệt gọi /api và /hubs ngay trên cổng 3000,
    // Vite chuyển tiếp sang backend (mặc định 5105, đổi bằng API_PROXY_TARGET).
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:5105', changeOrigin: true },
      '/hubs': { target: process.env.API_PROXY_TARGET || 'http://localhost:5105', changeOrigin: true, ws: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
