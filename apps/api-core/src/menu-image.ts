import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function logoDataUri(): string {
  try {
    const buf = readFileSync(join(__dirname, '..', 'logo.jpg'))
    const b64 = buf.toString('base64')
    return `data:image/jpeg;base64,${b64}`
  } catch {
    return ''
  }
}

let _qrcodeSvg: string | null = null
async function getQrSvg(): Promise<string> {
  if (_qrcodeSvg) return _qrcodeSvg
  try {
    _qrcodeSvg = await QRCode.toString('https://diancan.xpow.cn', { type: 'svg', margin: 0, width: 120, color: { dark: '#ffffff' } })
    _qrcodeSvg = _qrcodeSvg.replace('<path fill="#ffffff"', '<path fill="none"')
    return _qrcodeSvg
  } catch {
    return ''
  }
}

interface DishItem {
  categoryName: string
  name: string
  price: number
  tags?: string[]
  portionSize?: number
}

interface MenuData {
  merchantName: string
  date: string
  todayLocation: string
  businessHours: string
  dishes: DishItem[]
}

const FONT = "'Noto Sans SC',sans-serif"

const fontPaths = [
  join(__dirname, '..', 'assets', 'NotoSansSC-Regular.ttf'),
  join(__dirname, '..', 'assets', 'NotoSansSC-Bold.ttf'),
]
let _fontLoaded = false
function ensureFonts() {
  if (_fontLoaded) return
  for (const p of fontPaths) {
    if (!readFileSync(p)) throw new Error(`font not found: ${p}`)
  }
  _fontLoaded = true
}

export async function generateMenuImage(data: MenuData): Promise<Buffer> {
  const w = 1080
  ensureFonts()

  const groups = new Map<string, DishItem[]>()
  for (const d of data.dishes) {
    const list = groups.get(d.categoryName) || []
    list.push(d)
    groups.set(d.categoryName, list)
  }

  const headerH = 220
  const catTitleH = 60
  const dishH = 60
  const catGap = 28
  const footerH = 170
  const cardPad = 60
  const cardTop = headerH + 20

  let bodyH = 0
  for (const [, items] of groups) {
    bodyH += catTitleH
    bodyH += items.length * dishH
    bodyH += catGap
  }
  const cardH = Math.max(bodyH, 200) + cardPad * 2
  const totalH = cardTop + cardH + 80 + footerH

  const parts: string[] = []
  let y = cardTop + cardPad

  const colors = ['#c0392b', '#d97706', '#059669', '#2563eb', '#7c3aed', '#db2777', '#0891b2']
  let ci = 0

  for (const [catName, items] of groups) {
    const accent = colors[ci % colors.length]
    parts.push(`<rect x="80" y="${y + 4}" width="4" height="24" rx="2" fill="${accent}"/>`)
    parts.push(`<text x="96" y="${y + 24}" font-family="${FONT}" font-size="22" font-weight="700" fill="${accent}">${esc(catName)}</text>`)
    y += catTitleH
    for (const item of items) {
      const priceStr = `¥${item.price.toFixed(2).replace(/\.?0+$/, '')}`
      const portionStr = item.portionSize ? `/ ${item.portionSize}串` : ''
      const nameEnd = 96 + estimateTextWidth(item.name, 28, false)
      const tagParts: string[] = []
      if (item.tags?.length) {
        let tx = nameEnd + 14
        for (const t of item.tags) {
          const tw = estimateTextWidth(t, 18, false) + 28
          if (tx + tw > w - 280) break
          tagParts.push(`<rect x="${tx}" y="${y + 10}" width="${tw}" height="28" rx="14" fill="rgba(192,57,43,0.12)"/><text x="${tx + tw / 2}" y="${y + 29}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="#c0392b">${esc(t)}</text>`)
          tx += tw + 8
        }
      }
      parts.push(`<text x="96" y="${y + 28}" font-family="${FONT}" font-size="28" fill="#2c2420">${esc(item.name)}</text>`)
      if (tagParts.length) parts.push(tagParts.join(''))
      parts.push(`<text x="${w - 80}" y="${y + 28}" text-anchor="end" font-family="${FONT}" font-size="26" font-weight="700" fill="#c0392b">${priceStr}<tspan font-size="16" font-weight="600" fill="#8e7164">${esc(portionStr)}</tspan></text>`)
      parts.push(`<line x1="80" y1="${y + 44}" x2="${w - 80}" y2="${y + 44}" stroke="#f0e8e2" stroke-width="1"/>`)
      y += dishH
    }
    ci++
    y += catGap
  }

  const cardBottom = cardTop + cardH
  const footTop = cardBottom + 80
  const logoUri = logoDataUri()
  const qrSvg = await getQrSvg()

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${totalH}" viewBox="0 0 ${w} ${totalH}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fdf8f5"/>
      <stop offset="100%" stop-color="#f5ece5"/>
    </linearGradient>
    <linearGradient id="headerBg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b83a2a"/>
      <stop offset="50%" stop-color="#d94f3a"/>
      <stop offset="100%" stop-color="#c0392b"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="rgba(0,0,0,0.08)"/>
    </filter>
  </defs>
  <rect width="${w}" height="${totalH}" fill="url(#bg)"/>
  <!-- header -->
  <rect x="0" y="0" width="${w}" height="220" fill="url(#headerBg)"/>
  <circle cx="100" cy="180" r="140" fill="rgba(255,255,255,0.05)"/>
  <circle cx="980" cy="60" r="100" fill="rgba(255,255,255,0.05)"/>
  <circle cx="540" cy="220" r="180" fill="rgba(255,255,255,0.04)"/>
  <!-- logo + 餐厅名 -->
  ${logoUri ? (() => { const tw = estimateTextWidth(data.merchantName, 36); const gap = 12; const total = 60 + gap + tw; const left = 540 - total / 2; return `<image x="${left}" y="42" width="60" height="60" href="${logoUri}" clip-path="inset(0 round 10px)"/><text x="${left + 60 + gap}" y="82" font-family="${FONT}" font-size="36" font-weight="800" fill="#ffffff" letter-spacing="4">${esc(data.merchantName)}</text>` })() : `<text x="540" y="80" text-anchor="middle" font-family="${FONT}" font-size="36" font-weight="800" fill="#ffffff" letter-spacing="4">${esc(data.merchantName)}</text>`}
  <text x="540" y="168" text-anchor="middle" font-family="${FONT}" font-size="48" font-weight="800" fill="#ffffff" letter-spacing="8">每日菜单</text>
  <text x="540" y="208" text-anchor="middle" font-family="${FONT}" font-size="20" fill="rgba(255,255,255,0.75)">${esc(data.date)}</text>
  <!-- 白色卡片 -->
  <rect x="40" y="${cardTop}" width="${w - 80}" height="${cardH}" rx="16" fill="#ffffff" filter="url(#shadow)"/>
  <!-- 菜品内容 -->
  ${parts.join('\n  ')}
  <!-- footer -->
  <rect x="0" y="${footTop}" width="${w}" height="${footerH}" fill="#2c2420"/>
  <!-- 二维码 + 文字（整体居中） -->
  <g transform="translate(${Math.round((w - 100 - 24 - 220) / 2)}, ${footTop + 35})">${qrSvg.replace('<?xml version="1.0" encoding="utf-8"?>', '').replace(/ width="\d+" height="\d+"/, ' width="100" height="100"')}</g>
  <text x="${Math.round((w + 100 + 24 - 220) / 2)}" y="${footTop + 55}" font-family="${FONT}" font-size="20" fill="rgba(255,255,255,0.85)">📍 ${esc(data.todayLocation || '今日出摊')}</text>
  <text x="${Math.round((w + 100 + 24 - 220) / 2)}" y="${footTop + 83}" font-family="${FONT}" font-size="20" fill="rgba(255,255,255,0.85)">🕐 ${esc(data.businessHours || '营业中')}</text>
  <text x="${Math.round((w + 100 + 24 - 220) / 2)}" y="${footTop + 117}" font-family="${FONT}" font-size="18" fill="rgba(255,255,255,0.4)">扫码点餐 · 无需排队</text>
</svg>`

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { fontFiles: fontPaths, loadSystemFonts: false },
  })
  return resvg.render().asPng()
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function estimateTextWidth(text: string, fontSize: number, withLetterSpacing = true): number {
  let w = 0
  for (const ch of text) {
    if (ch >= '\u4e00' && ch <= '\u9fff') w += fontSize
    else w += fontSize * 0.55
  }
  if (withLetterSpacing) w += (text.length - 1) * 4
  return w
}
