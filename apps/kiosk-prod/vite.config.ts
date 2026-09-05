import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { resolve } from 'path'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// 与 api-core env.ts 相同的定位逻辑：从根 package.json 读 siteName，找 config/{siteName}/.env
const configDir = path.dirname(fileURLToPath(import.meta.url))
let rootDir = ''
let siteName = ''
let dir = configDir
for (let i = 0; i < 10 && !siteName; i++) {
  const file = path.join(dir, 'package.json')
  if (fs.existsSync(file)) {
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf-8'))
      if (typeof json.siteName === 'string' && json.siteName) {
        siteName = json.siteName
        rootDir = dir
      }
    } catch {
      /* 忽略损坏的 package.json */
    }
  }
  dir = path.dirname(dir)
}

function loadSiteEnv(): Record<string, string> {
  if (!siteName) return {}
  const envFile = path.join(rootDir, '..', 'config', siteName, '.env')
  if (!fs.existsSync(envFile)) return {}
  const vars: Record<string, string> = {}
  for (const line of fs.readFileSync(envFile, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in vars)) vars[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return vars
}

const env = loadSiteEnv()
const apiPort = env.PORT || '3011'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [VantResolver()],
    }),
    Components({
      resolvers: [VantResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5180,
    allowedHosts: ['diancan.xpow.cn'],
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
