import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5178,
    hmr: {
      protocol: 'wss',                  // 强制使用加密的 WebSocket
      host: 'admin-diancan.xpow.cn',   // 你的公网域名
      port: 443                        // 走 443 端口，交给 Nginx 转发
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
