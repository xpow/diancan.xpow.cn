import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fileDir = path.dirname(fileURLToPath(import.meta.url))
let rootDir = ''
let siteName = ''
let dir = fileDir
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

// .env 文件搜索路径（按优先级）
const candidates: string[] = []
if (siteName) {
  // 外部规范路径：E:/www/config/{siteName}/.env（与项目平行）
  candidates.push(path.join(rootDir, '..', 'config', siteName, '.env'))
  // 项目内路径：config/{siteName}/.env（从项目根目录）
  if (rootDir) candidates.push(path.join(rootDir, 'config', siteName, '.env'))
}
// api-core 同级
candidates.push(path.join(fileDir, '..', '..', '.env'))
// 项目根目录
if (rootDir) candidates.push(path.join(rootDir, '.env'))
// api-core 目录
candidates.push(path.join(fileDir, '..', '.env'))

for (const envFile of candidates) {
  const resolved = path.resolve(envFile)
  if (fs.existsSync(resolved)) {
    process.loadEnvFile(resolved)
    console.log(`[env] loaded: ${resolved}`)
    break
  }
}
