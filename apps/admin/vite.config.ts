import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/src/assets/images': {
        target: 'http://localhost:5180',
        changeOrigin: true,
      },
    },
  },
})
