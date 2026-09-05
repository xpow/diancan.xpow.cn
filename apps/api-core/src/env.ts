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

if (siteName) {
  const envFile = path.join(rootDir, '..', 'config', siteName, '.env')
  if (fs.existsSync(envFile)) {
    process.loadEnvFile(envFile)
  }
}