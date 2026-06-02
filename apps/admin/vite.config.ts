import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5178,
    host: '0.0.0.0', // 允许外部网络访问
    cors: true,      // 允许跨域
    hmr: {
      protocol: 'wss',                  // 强制使用加密的 WebSocket
      clientPort: 9002,                 // 走 443 端口，交给 Nginx 转发
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },
    allowedHosts:['admin-diancan.xpow.cn'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})