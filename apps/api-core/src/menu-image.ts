import sharp from 'sharp'

interface DishItem {
  categoryName: string
  name: string
  price: number
}

interface MenuData {
  merchantName: string
  date: string
  dishes: DishItem[]
}

export async function generateMenuImage(data: MenuData): Promise<Buffer> {
  const w = 1080
  const yPerDish = 72
  const categoryGap = 24
  // 按分类分组
  const groups = new Map<string, DishItem[]>()
  for (const d of data.dishes) {
    const list = groups.get(d.categoryName) || []
    list.push(d)
    groups.set(d.categoryName, list)
  }

  // 计算内容总高度
  let contentH = 0
  contentH += 120 // header padding top
  contentH += 80  // 餐厅名
  contentH += 16
  contentH += 60  // 今日菜单
  contentH += 16
  contentH += 36  // 日期
  contentH += 48  // 分隔线
  for (const [, items] of groups) {
    contentH += 56 // 分类标题
    contentH += items.length * yPerDish
    contentH += categoryGap
  }
  contentH += 120 // footer padding bottom

  const h = Math.max(1400, contentH)
  const px = (v: number) => v

  const cats = [...groups.entries()]
  const catSvgs: string[] = []
  let y = 120
  for (const [catName, items] of cats) {
    catSvgs.push(`<text x="540" y="${y}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="28" font-weight="700" fill="#4a3a32">${esc(catName)}</text>`)
    y += 56
    for (const item of items) {
      const nameLen = item.name.length
      let fontSize = 34
      if (nameLen >= 8) fontSize = 28
      else if (nameLen >= 6) fontSize = 30
      catSvgs.push(`<text x="100" y="${y}" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="${fontSize}" fill="#2c2420">${esc(item.name)}</text>`)
      catSvgs.push(`<text x="980" y="${y}" text-anchor="end" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="30" font-weight="600" fill="#c0392b">¥${item.price.toFixed(2).replace(/\.?0+$/, '')}</text>`)
      // 虚线
      catSvgs.push(`<line x1="${100 + px(nameLen * fontSize * 0.55)}" y1="${y - 8}" x2="880" y2="${y - 8}" stroke="#e0d5ce" stroke-width="1.5" stroke-dasharray="4,4"/>`)
      y += yPerDish
    }
    y += categoryGap
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#faf3ef"/>
      <stop offset="100%" stop-color="#f0e6df"/>
    </linearGradient>
    <linearGradient id="headerBg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#c0392b"/>
      <stop offset="100%" stop-color="#e85d4a"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <!-- header bar -->
  <rect x="0" y="0" width="${w}" height="260" fill="url(#headerBg)" rx="0"/>
  <!-- 装饰圆 -->
  <circle cx="80" cy="200" r="120" fill="rgba(255,255,255,0.06)"/>
  <circle cx="1000" cy="80" r="80" fill="rgba(255,255,255,0.06)"/>
  <circle cx="540" cy="260" r="200" fill="rgba(255,255,255,0.04)"/>
  <!-- 餐厅名 -->
  <text x="540" y="140" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="44" font-weight="800" fill="#ffffff" letter-spacing="4">${esc(data.merchantName)}</text>
  <!-- 今日菜单 -->
  <text x="540" y="200" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="56" font-weight="800" fill="#ffffff" letter-spacing="6">今日菜单</text>
  <!-- 日期 -->
  <text x="540" y="248" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="22" fill="rgba(255,255,255,0.8)">${esc(data.date)}</text>
  <!-- 内容区 -->
  ${catSvgs.join('\n  ')}
  <!-- footer -->
  <rect x="0" y="${h - 100}" width="${w}" height="100" fill="#2c2420" rx="0"/>
  <text x="540" y="${h - 60}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="22" fill="rgba(255,255,255,0.5)">扫码点餐 · 无需排队</text>
  <text x="540" y="${h - 30}" text-anchor="middle" font-family="'PingFang SC','Microsoft YaHei',sans-serif" font-size="18" fill="rgba(255,255,255,0.35)">本菜单仅供参考，以店内实际菜单为准</text>
</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
