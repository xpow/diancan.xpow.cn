import cors from 'cors'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import session from 'express-session'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import adminRouter from './admin.js'
import { loadGlobalCache, buildGlobalCache } from './cache.js'
import { decryptDeviceToken, encryptDeviceSN } from './crypto.js'

const app = express()
app.set('trust proxy', 1)
const port = Number(process.env.PORT || 3011)
const prisma = new PrismaClient()

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'diancan-jwt-dev-secret'
const JWT_EXPIRES_IN = '1h'

// 设备指纹有效期（测试用 30s，上线改回 7 * 24 * 60 * 60 * 1000）
const FINGERPRINT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

// JWT 认证中间件
interface JwtPayload {
  deviceId: string
  sn: string
  uuid?: string
  iat: number
  exp: number
}
declare global {
  namespace Express {
    interface Request {
      authDevice?: { deviceId: string; sn: string; uuid: string }
    }
  }
}
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 内部调用放行
  if (req.headers['x-internal-request'] === 'true') {
    req.authDevice = {
      deviceId: (req.body?.deviceId as string) || (req.query?.deviceId as string) || '',
      sn: 'internal',
      uuid: '',
    }
    return next()
  }
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '缺少认证令牌' })
  }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    // 校验设备是否仍有效
    prisma.device.findUnique({ where: { id: payload.deviceId }, select: { status: true, sn: true } }).then((device) => {
      if (!device || device.status !== 'active') {
        return res.status(401).json({ message: '设备已下线，请重新认证' })
      }
      if (device.sn !== payload.sn) {
        return res.status(401).json({ message: '设备信息已变更，请重新认证' })
      }
      req.authDevice = { deviceId: payload.deviceId, sn: payload.sn, uuid: (payload.uuid as string) || '' }
      next()
    }).catch((err) => {
      console.error('[auth] DB check failed', err)
      return res.status(500).json({ message: '服务器内部错误' })
    })
  } catch {
    return res.status(401).json({ message: '认证令牌无效或已过期' })
  }
}

// 速率限制器
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: false,
  legacyHeaders: false,
})
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  message: { message: '下单过于频繁，请稍后再试' },
  standardHeaders: false,
  legacyHeaders: false,
})
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: false,
  legacyHeaders: false,
})

// 按设备筛选促销：rules.deviceIds 为空则不限制，否则只返回包含指定设备的促销
function filterPromotionsByDevice(promotions: any[], deviceId?: string): any[] {
  if (!deviceId) return promotions
  return promotions.filter((p) => {
    const rules = typeof p.rules === 'string' ? JSON.parse(p.rules) : p.rules
    const deviceIds: string[] = rules.deviceIds ?? []
    return deviceIds.length === 0 || deviceIds.includes(deviceId)
  })
}

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : undefined
app.use(cors({
  origin: allowedOrigins ?? true,
  credentials: true,
}))

// 来源验证中间件：拒绝空来源或非合法来源的请求
const ORIGIN_WHITELIST = new Set([
  ...(allowedOrigins ?? []),
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3011',
  'http://localhost:5178',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:3011',
  'https://admin-diancan.xpow.cn',
  'http://admin-diancan.xpow.cn',
])
// 将配置中的域名也加入白名单（无协议版本，支持端口匹配）
const originPatterns = (allowedOrigins ?? []).map((o) => {
  try { return new URL(o) } catch { return null }
}).filter(Boolean).map((u) => `${u!.host}`)
app.use((req, res, next) => {
  // 内部调用放行（服务端自请求）
  if (req.headers['x-internal-request'] === 'true') return next()
  // 健康检查放行
  if (req.path === '/api/health') return next()

  const origin = req.headers.origin as string | undefined
  const referer = req.headers.referer as string | undefined
  const source = origin || referer

  if (!source) {
    return res.status(403).json({ message: '拒绝访问：缺少来源信息' })
  }

  // 精确匹配
  if (ORIGIN_WHITELIST.has(source)) return next()
  // 去掉尾部斜杠再匹配
  if (ORIGIN_WHITELIST.has(source.replace(/\/$/, ''))) return next()

  // 按 host 匹配（忽略协议和端口差异）
  try {
    const url = new URL(source)
    if (originPatterns.includes(url.host) || url.host.startsWith('localhost') || url.host === '127.0.0.1' || url.host.endsWith('.xpow.cn')) return next()
  } catch {}

  return res.status(403).json({ message: '拒绝访问：非法来源' })
})
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET || 'diancan-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 },
}))

app.use('/api/admin', adminRouter)

app.get('/api/health', generalLimiter, (_req, res) => {
  res.json({ ok: true, service: 'api-core' })
})

app.get('/api/system/bootstrap', generalLimiter, async (req, res) => {
  let cache = loadGlobalCache()
  if (!cache) {
    try { cache = await buildGlobalCache() } catch { return res.status(500).json({ message: '初始化失败' }) }
  }

  const { merchant, branch, promotions: activePromotions, featuredItems, devices: allDevices } = cache

  // 实时查询评价设置（不入缓存）
  const merchantDb = await prisma.merchant.findUnique({ where: { id: merchant.id }, select: { reviewSettings: true } })
  const reviewSettings = merchantDb ? JSON.parse(merchantDb.reviewSettings || '{}') : {}

  let device: any = null
  const deviceSn = req.query.sn as string | undefined
  if (deviceSn) {
    device = allDevices.find((d: any) => d.sn === deviceSn)
    if (device?.status !== 'active') device = null
  }
  if (!device && !deviceSn) {
    device = allDevices.find((d: any) => d.status === 'active') ?? allDevices[0] ?? null
  }

  const availablePromotions = filterPromotionsByDevice(
    activePromotions.filter((p: any) => p.status === 'active' && ['buy_get', 'full_reduction', 'welfare_item', 'time_discount', 'new_user', 'holiday_gift', 'total_discount'].includes(p.type)),
    device?.id,
  )

  res.json({
    merchantId: merchant.id,
    merchantName: merchant.name,
    branchId: branch?.id ?? '',
    branchName: branch?.name ?? '',
    branchCode: branch?.code ?? '',
    deviceId: device?.id ?? '',
    deviceCode: device?.code ?? '',
    deviceMode: device?.mode ?? 'kiosk',
    deviceActive: device?.status === 'active',
    slogan: merchant.slogan,
    businessHours: branch?.businessHours || merchant.businessHours,
    todayLocation: branch?.todayLocation ?? '',
    locationHint: branch?.locationHint ?? '',
    statusText: merchant.statusText,
    branchStatus: branch?.status ?? 'active',
    restReason: branch?.restReason ?? merchant.restReason,
    features: merchant.features,
    reviewEnabled: reviewSettings?.enabled ?? false,
    promotions: availablePromotions.map((p: any) => {
      const rules = typeof p.rules === 'string' ? JSON.parse(p.rules) : p.rules
      let subtitle = ''
      if (p.type === 'full_reduction') subtitle = `满¥${rules.threshold}减¥${rules.discount}`
      else if (p.type === 'welfare_item') subtitle = `指定商品福利价`
      else if (p.type === 'time_discount') {
        const rate = rules.discountRate
        const discountLabels: Record<number, string> = { 0.1: '1折', 0.2: '2折', 0.3: '3折', 0.4: '4折', 0.5: '5折', 0.6: '6折', 0.7: '7折', 0.8: '8折', 0.85: '85折', 0.9: '9折' }
        const label = rate ? discountLabels[rate] || '' : ''
        subtitle = label ? `指定商品${label}` : ''
      } else if (p.type === 'total_discount') {
        const val = rules.discountType === 'percentage' ? `${rules.discountValue}%` : `¥${rules.discountValue}`
        subtitle = `订单总价减${val}`
      }
      return {
        id: p.id,
        title: p.name,
        subtitle,
        type: p.type,
        tag: p.type === 'time_discount' ? '限时' : p.type === 'new_user' ? '新人' : p.type === 'holiday_gift' ? '节日' : p.type === 'total_discount' ? '折扣' : '活动',
        tone: p.type === 'full_reduction' || p.type === 'time_discount' ? 'primary' as const : 'neutral' as const,
        image: p.items?.[0]?.dish?.image || null,
        dishId: p.items?.[0]?.dishId || null,
        itemIds: p.items?.map((i: any) => i.dishId).filter(Boolean) || [],
      }
    }),
    featuredItems,
    commands: device ? await prisma.deviceCommand.findMany({
      where: { deviceId: device.id, status: 'pending' },
      select: { id: true, command: true, params: true },
    }) : [],
  })
})

app.post('/api/commands/:id/ack', generalLimiter, async (req, res) => {
  const { id } = req.params
  await prisma.deviceCommand.update({ where: { id }, data: { status: 'executed', executedAt: new Date() } })
  res.json({ success: true })
})

app.get('/api/catalog/menu', generalLimiter, async (req, res) => {
  let cache = loadGlobalCache()
  if (!cache) {
    try { cache = await buildGlobalCache() } catch { return res.status(500).json({ message: '初始化失败' }) }
  }

  const { merchant, categories, dishes: allDishes, promotions, devices } = cache
  const activeDishes = allDishes.filter((d: any) => d.status === 'active')
  const dishPriceMap = new Map(activeDishes.map((d: any) => [d.id, d.price]))

  const deviceId = req.query.deviceId as string || devices.find((d: any) => d.status === 'active')?.id
  const activePromotions = filterPromotionsByDevice(
    promotions.filter((p: any) => p.status === 'active'),
    deviceId,
  )
  const now = new Date()
  const promoDishMap = new Map<string, { promoPrice: number; type: string; name: string }>()
  for (const promo of activePromotions) {
    if (promo.endDate && new Date(promo.endDate) < now) continue
    if (promo.startDate && new Date(promo.startDate) > now) continue

    for (const pi of promo.items) {
      if (promo.type === 'time_discount') {
        const price = pi.promoPrice ?? (() => {
          const rules = typeof promo.rules === 'string' ? JSON.parse(promo.rules) : promo.rules
          const rate = rules.discountRate ?? 1
          const origPrice = dishPriceMap.get(pi.dishId) ?? 0
          return Math.round(origPrice * rate * 100) / 100
        })()
        promoDishMap.set(pi.dishId, { promoPrice: price, type: promo.type, name: promo.name })
      } else if (promo.type === 'welfare_item' && pi.promoPrice) {
        promoDishMap.set(pi.dishId, { promoPrice: pi.promoPrice, type: promo.type, name: promo.name })
      }
    }
  }

  const cacheBranch = cache.branch

  res.json({
    merchant: { id: merchant.id, name: merchant.name },
    branch: { id: cacheBranch?.id ?? '', name: cacheBranch?.name ?? '', todayLocation: cacheBranch?.todayLocation ?? '', businessHours: cacheBranch?.businessHours ?? '' },
    categories,
    dishes: activeDishes.map((d: any) => {
      const promo = promoDishMap.get(d.id)
      return {
        id: d.id,
        categoryId: d.categoryId,
        name: d.name,
        price: d.price,
        desc: d.desc,
        image: d.image,
        tags: typeof d.tags === 'string' ? JSON.parse(d.tags) : d.tags,
        specsPreset: d.specsPreset,
        specGroups: d.specGroups ? JSON.parse(d.specGroups) : [],
        portionSize: d.portionSize,
        stock: d.stock ?? 0,
        stockEnabled: d.stockEnabled ?? false,
        promoPrice: promo?.promoPrice ?? null,
        promotionName: promo?.name ?? null,
      }
    }),
  })
})

app.post('/api/cart/quote', generalLimiter, authMiddleware, async (req, res) => {
  const { items } = req.body ?? {}
  const deviceId = req.authDevice!.deviceId
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items is required' })
  }

  const normalizedItems = items
    .map((item: any) => ({
      dishId: String(item?.dishId ?? ''),
      quantity: Number(item?.quantity ?? 0),
      specs: String(item?.specs ?? ''),
      unitPrice: item?.unitPrice ? Number(item.unitPrice) : undefined,
    }))
    .filter((item) => item.dishId && item.quantity > 0)

  if (normalizedItems.length === 0) {
    return res.status(400).json({ message: 'valid items is required' })
  }

  // 查询所有菜品和活动
  const dishIds = [...new Set(normalizedItems.map((i) => i.dishId))]
  const dishes = await prisma.dish.findMany({ where: { id: { in: dishIds } } })
  const dishMap = new Map(dishes.map((d) => [d.id, d]))

  const activePromotions = filterPromotionsByDevice(
    await prisma.promotion.findMany({
      where: { status: 'active' },
      include: { items: true },
    }),
    deviceId,
  )
  const now = new Date()
  const welfarePromos = activePromotions.filter((p) => p.type === 'welfare_item')
  const fullReductionPromos = activePromotions.filter((p) => p.type === 'full_reduction')
  const timeDiscountPromos = activePromotions.filter(
    (p) => p.type === 'time_discount' && (!p.endDate || new Date(p.endDate) >= now) && (!p.startDate || new Date(p.startDate) <= now),
  )

  const itemDetails: any[] = []
  const appliedPromotions: any[] = []
  const hints: string[] = []

  let originalAmount = 0
  let payableAmount = 0
  const welfareAppliedDishIds = new Set<string>()

  for (const item of normalizedItems) {
    const dish = dishMap.get(item.dishId)
    if (!dish) continue

    const basePrice = item.unitPrice ?? dish.price
    const portionFactor = dish.portionSize || 1
    const subtotal = basePrice * item.quantity / portionFactor
    originalAmount += subtotal

    let finalUnitPrice = basePrice
    let finalSubtotal = subtotal
    let promotionLabel: string | undefined

    // 检查福利品
    const welfarePromo = welfarePromos.find((p) =>
      p.items.some((pi) => pi.dishId === item.dishId),
    )
    if (welfarePromo) {
      const promoItem = welfarePromo.items.find((pi) => pi.dishId === item.dishId)
      if (promoItem) {
        const isRedeemed = welfareAppliedDishIds.has(item.dishId)
        const unlimited = promoItem.limitType === 'unlimited'
        const welfareQty = isRedeemed ? 0 : (unlimited ? item.quantity : Math.min(item.quantity, promoItem.maxQty))
        const normalQty = item.quantity - welfareQty
        finalSubtotal = welfareQty * (promoItem.promoPrice ?? dish.price) + normalQty * dish.price
        finalSubtotal /= portionFactor
        finalUnitPrice = welfareQty === item.quantity ? (promoItem.promoPrice ?? dish.price) : dish.price
        welfareAppliedDishIds.add(item.dishId)

        if (welfareQty > 0) {
          const qtyText = unlimited ? '不限量' : `仅 ${promoItem.maxQty} 份`
          appliedPromotions.push({
            id: welfarePromo.id,
            name: welfarePromo.name,
            type: 'welfare_item',
            discount: Number(((dish.price - (promoItem.promoPrice ?? 0)) * welfareQty / portionFactor).toFixed(2)),
            description: `福利价 ¥${promoItem.promoPrice?.toFixed(2)}，${qtyText}享受福利价`,
          })
          promotionLabel = '福利价'
        }

        if (!isRedeemed && !unlimited && item.quantity > promoItem.maxQty) {
          hints.push(`${welfarePromo.name}本单仅首份按 ${promoItem.promoPrice?.toFixed(2)} 元计算，其余按原价计算。`)
        }
      }
    }

    // 限时折扣
    if (!promotionLabel) {
      const timeDiscountPromo = timeDiscountPromos.find((p) =>
        p.items.some((pi) => pi.dishId === item.dishId),
      )
      if (timeDiscountPromo) {
        const promoItem = timeDiscountPromo.items.find((pi) => pi.dishId === item.dishId)
        const rules = JSON.parse(timeDiscountPromo.rules)
        const discountRate = rules.discountRate ?? 1
        const discountedPrice = Math.round(basePrice * discountRate * 100) / 100
        if (discountRate < 1) {
          finalUnitPrice = discountedPrice
          finalSubtotal = discountedPrice * item.quantity / portionFactor
          const perItem = basePrice - discountedPrice
          const discount = Number((perItem * item.quantity / portionFactor).toFixed(2))
          if (discount > 0) {
            appliedPromotions.push({
              id: timeDiscountPromo.id,
              name: timeDiscountPromo.name,
              type: 'time_discount',
              discount,
              description: `${timeDiscountPromo.name}，${basePrice.toFixed(2)} → ${discountedPrice.toFixed(2)}`,
            })
            promotionLabel = timeDiscountPromo.name
          }
        }
      }
    }

    payableAmount += finalSubtotal

    itemDetails.push({
      dishId: dish.id,
      name: dish.name,
      quantity: item.quantity,
      unitPrice: Number(basePrice.toFixed(2)),
      finalUnitPrice: Number(finalUnitPrice.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      finalSubtotal: Number(finalSubtotal.toFixed(2)),
      specs: item.specs,
      promotionLabel,
      portionSize: dish.portionSize || undefined,
      stock: dish.stockEnabled ? dish.stock : undefined,
      stockEnabled: dish.stockEnabled || undefined,
    })
  }

  // 合并重复的营销活动（同ID折扣相加）
  const promoMap = new Map<string, any>()
  for (const p of appliedPromotions) {
    const existing = promoMap.get(p.id)
    if (existing) {
      existing.discount = Number(((existing.discount || 0) + (p.discount || 0)).toFixed(2))
    } else {
      promoMap.set(p.id, { ...p })
    }
  }
  appliedPromotions.length = 0
  appliedPromotions.push(...promoMap.values())

  // 总价折扣（优先级最高，命中后不再执行满减）
  const totalDiscountPromos = activePromotions.filter((p) => p.type === 'total_discount')
  let totalDiscountApplied = false
  let activePromoWithExclusion: { name: string; excludedItems: string[] } | null = null
  for (const promo of totalDiscountPromos) {
    const rules = JSON.parse(promo.rules)
    const { discountType, discountValue, maxDiscount, minAmount, excludedDishIds } = rules
    if (!discountType || !discountValue) continue

    let eligibleAmount = 0
    const excludedItems: string[] = []
    for (const item of itemDetails) {
      if (!(excludedDishIds ?? []).includes(item.dishId)) {
        eligibleAmount += item.finalSubtotal
      } else {
        excludedItems.push(item.name)
      }
    }

    if (minAmount && eligibleAmount < minAmount) continue

    let discount = 0
    if (discountType === 'percentage') {
      const rawDiscount = eligibleAmount * (discountValue / 100)
      discount = maxDiscount ? Math.min(rawDiscount, maxDiscount) : rawDiscount
    } else {
      discount = discountValue
      if (maxDiscount) discount = Math.min(discount, maxDiscount)
    }
    discount = Math.round(discount * 100) / 100

    if (discount > 0) {
      payableAmount -= discount
      totalDiscountApplied = true
      if (excludedItems.length > 0) {
        activePromoWithExclusion = { name: promo.name, excludedItems }
      }
      const typeText = discountType === 'percentage' ? `${discountValue}%` : `¥${discountValue}`
      const maxText = maxDiscount ? `(最高减¥${maxDiscount})` : ''
      appliedPromotions.push({
        id: promo.id,
        name: promo.name,
        type: 'total_discount',
        discount: Number(discount.toFixed(2)),
        description: `订单总价${typeText}减免${maxText}`,
      })
    }
  }

  // 满减（仅当总价折扣未命中时执行，多档满减只取最高一档）
  if (!totalDiscountApplied) {
    const sortedFullReduction = (fullReductionPromos as any[])
      .sort((a, b) => (JSON.parse(b.rules).threshold ?? 0) - (JSON.parse(a.rules).threshold ?? 0))
    for (const promo of sortedFullReduction) {
      const rules = JSON.parse(promo.rules)
      const threshold = rules.threshold ?? 0
      const discount = rules.discount ?? 0
      const excludedDishIds = rules.excludedDishIds ?? []

      let eligibleAmount = 0
      const excludedItems: string[] = []
      for (const item of itemDetails) {
        if (!excludedDishIds.includes(item.dishId)) {
          eligibleAmount += item.finalSubtotal
        } else {
          excludedItems.push(item.name)
        }
      }

      if (eligibleAmount >= threshold && discount > 0) {
        payableAmount -= discount
        if (excludedItems.length > 0) {
          activePromoWithExclusion = { name: promo.name, excludedItems }
        }
        appliedPromotions.push({
          id: promo.id,
          name: promo.name,
          type: 'full_reduction',
          discount,
          description: `订单满 ¥${threshold} 自动减 ¥${discount}`,
        })
        break
      }
    }
  }

  // ==== 买赠（满X件送Y）====
  const buyGetPromos = activePromotions.filter((p) => p.type === 'buy_get')
  const giftDishIds = new Set<string>()
  for (const promo of buyGetPromos) {
    const giftId = JSON.parse(promo.rules).giftDishId
    if (giftId) giftDishIds.add(giftId)
  }
  if (giftDishIds.size > 0) {
    const giftDishes = await prisma.dish.findMany({ where: { id: { in: [...giftDishIds] } } })
    for (const d of giftDishes) dishMap.set(d.id, d)
  }
  for (const promo of buyGetPromos) {
    const rules = JSON.parse(promo.rules)
    const threshold = rules.threshold ?? 0
    const giftQtyIncrement = rules.giftQty ?? 1
    const triggerDishIds: string[] = rules.triggerDishIds ?? []
    const mode = rules.mode ?? 'once'
    const maxGifts = rules.maxGifts ?? 0

    // 统计触发商品的合计数量
    let triggerTotal = 0
    for (const item of itemDetails) {
      if (triggerDishIds.length === 0 || triggerDishIds.includes(item.dishId)) {
        triggerTotal += item.quantity
      }
    }

    if (triggerTotal < threshold) {
      const diff = threshold - triggerTotal
      hints.push(`再点 ${diff} 件可享${promo.name}。`)
      continue
    }

    // 达标，计算赠品数量
    let giftCount = mode === 'repeat' ? Math.floor(triggerTotal / threshold) * giftQtyIncrement : giftQtyIncrement
    if (maxGifts > 0) giftCount = Math.min(giftCount, maxGifts)
    if (giftCount <= 0) continue

    const giftDishId = rules.giftDishId || ''
    const giftDish = dishMap.get(giftDishId)
    if (!giftDish) continue

    itemDetails.push({
      dishId: giftDish.id,
      name: giftDish.name,
      quantity: giftCount,
      unitPrice: 0,
      finalUnitPrice: 0,
      subtotal: 0,
      finalSubtotal: 0,
      specs: '',
      promotionLabel: promo.name,
      portionSize: giftDish.portionSize || undefined,
      stock: giftDish.stockEnabled ? giftDish.stock : undefined,
      stockEnabled: giftDish.stockEnabled || undefined,
    })

    appliedPromotions.push({
      id: promo.id,
      name: promo.name,
      type: 'buy_get',
      discount: 0,
      description: `满${threshold}件赠${giftDish.name} x${giftCount}`,
    })
  }

  // 生成提示文案：已命中的活动有排除 → 显示排除提示；再找第一个未满足的档位显示"再点..."
  // 排除提示：当前已满足档位中有排除的商品
  if (activePromoWithExclusion) {
    hints.push(`${[...new Set(activePromoWithExclusion.excludedItems)].join('、')} 不参与${activePromoWithExclusion.name}。`)
  }
  // 下一档提示：找第一个未满足的活动
  const allThresholdPromos = [
    ...fullReductionPromos.map((p) => ({ promo: p, threshold: JSON.parse(p.rules).threshold ?? 0 })),
    ...totalDiscountPromos.map((p) => ({ promo: p, threshold: JSON.parse(p.rules).minAmount ?? 0 })),
  ].sort((a, b) => a.threshold - b.threshold)
  for (const { promo } of allThresholdPromos) {
    const rules = JSON.parse(promo.rules)
    const threshold = promo.type === 'full_reduction' ? (rules.threshold ?? 0) : (rules.minAmount ?? 0)
    const excludedDishIds = rules.excludedDishIds ?? []
    let eligibleAmount = 0
    const excludedItems: string[] = []
    for (const item of itemDetails) {
      if (!excludedDishIds.includes(item.dishId)) {
        eligibleAmount += item.finalSubtotal
      } else {
        excludedItems.push(item.name)
      }
    }
    if (eligibleAmount < threshold) {
      if (eligibleAmount > 0) {
        const diff = Number((threshold - eligibleAmount).toFixed(2))
        hints.push(`再点 ¥${diff.toFixed(2)} 可享${promo.name}。`)
      } else if (excludedItems.length > 0) {
        hints.push(`${[...new Set(excludedItems)].join('、')} 不参与${promo.name}。`)
        if (threshold > 0) {
          hints.push(`再点 ¥${threshold.toFixed(2)} 可享${promo.name}。`)
        }
      }
      break
    }
  }

  const discountAmount = Number((originalAmount - payableAmount).toFixed(2))

  return res.json({
    quoteId: `quote-${Date.now()}`,
    itemDetails,
    appliedPromotions,
    totals: {
      originalAmount: Number(originalAmount.toFixed(2)),
      discountAmount,
      payableAmount: Number(payableAmount.toFixed(2)),
    },
    hints,
  })
})

app.post('/api/orders', orderLimiter, authMiddleware, async (req, res) => {
  const { merchantId, branchId, deviceId: reqDeviceId, items, orderType, paymentMethod, payLater } = req.body ?? {}
  const deviceId = req.authDevice!.deviceId

  // 校验 deviceId 与令牌一致
  if (reqDeviceId && reqDeviceId !== deviceId) {
    return res.status(403).json({ message: '设备ID与令牌不匹配' })
  }

  if (!merchantId || !branchId || !deviceId) {
    return res.status(400).json({ message: 'merchantId, branchId and deviceId are required' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items is required' })
  }

  const normalizedItems = items
    .map((item: any) => ({
      dishId: String(item?.dishId ?? ''),
      quantity: Number(item?.quantity ?? 0),
      specs: String(item?.specs ?? ''),
      unitPrice: item?.unitPrice ? Number(item.unitPrice) : undefined,
    }))
    .filter((item) => item.dishId && item.quantity > 0)

  if (normalizedItems.length === 0) {
    return res.status(400).json({ message: 'valid items is required' })
  }

  // 重新计算 quote
  const quoteReq = { body: { items: normalizedItems } } as any
  const quoteRes = await fetch(`http://localhost:${port}/api/cart/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Request': 'true' },
    body: JSON.stringify({ items: normalizedItems, deviceId }),
  })
  if (!quoteRes.ok) {
    return res.status(500).json({ message: '试算失败' })
  }
  const quote = await quoteRes.json()

  // 取餐号: branchCode(字母) + deviceCode(2位数字) + 当日流水(3位)
  const branch = await prisma.branch.findUnique({ where: { id: branchId } })
  const device = await prisma.device.findUnique({ where: { id: deviceId } })
  if (!device || device.status !== 'active') {
    return res.status(403).json({ message: '该设备已下线，无法下单' })
  }
  const branchCode = branch?.code?.toUpperCase() || 'X'
  const devCode = (device?.code || '00').padStart(2, '0')
  console.log(`[DEBUG] order deviceId=${deviceId} code=${device?.code} sn=${device?.sn} pickupCode=${branchCode}${devCode}`)
  const type = orderType === 'takeaway' ? 'takeaway' : 'dine-in'

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayOrderCount = await prisma.order.count({
    where: { createdAt: { gte: todayStart } },
  })
  const dailySeq = String(todayOrderCount + 1).padStart(3, '0')
  const pickupCode = `${branchCode}${devCode}${dailySeq}`

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  const orderNo = `DC${dateStr}${dailySeq}${devCode}${rand}`

  // 库存校验与扣减：仅对启用库存的菜品（stockEnabled），事务内条件扣减防超卖。
  // 需求口径基于试算明细 quote.itemDetails（含买赠赠品行），赠品同样占用库存
  const stockDishIds = [...new Set(quote.itemDetails.map((i: any) => i.dishId))] as string[]
  const stockDishes = await prisma.dish.findMany({
    where: { id: { in: stockDishIds }, stockEnabled: true },
    select: { id: true, name: true, stock: true },
  })
  const stockDishSet = new Set(stockDishes.map((d) => d.id))
  const stockDemand = new Map<string, number>()
  for (const item of quote.itemDetails) {
    if (!stockDishSet.has(item.dishId)) continue
    stockDemand.set(item.dishId, (stockDemand.get(item.dishId) ?? 0) + item.quantity)
  }
  const stockNameMap = new Map(stockDishes.map((d) => [d.id, d.name]))
  const insufficient = [...stockDemand.entries()].filter(([dishId, qty]) => {
    const dish = stockDishes.find((d) => d.id === dishId)
    return !dish || dish.stock < qty
  })
  if (insufficient.length) {
    return res.status(409).json({
      message: insufficient.map(([dishId]) => `「${stockNameMap.get(dishId)}」库存不足`).join('；'),
      insufficientDishes: insufficient.map(([dishId, qty]) => ({ dishId, name: stockNameMap.get(dishId), required: qty })),
    })
  }

  let order: any
  try {
    order = await prisma.$transaction(async (tx) => {
      // 条件扣减：库存不足则回滚
      for (const [dishId, qty] of stockDemand) {
        const r = await tx.dish.updateMany({
          where: { id: dishId, stockEnabled: true, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        })
        if (r.count === 0) {
          throw { isStockShort: true, dishId }
        }
      }

      return tx.order.create({
        data: {
          orderNo,
          pickupCode,
          status: payLater ? 'unpaid' : 'paid',
          paidAt: payLater ? undefined : new Date(),
          paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : '',
          orderType: type,
          merchantId,
          branchId,
          deviceId,
          originalAmount: quote.totals.originalAmount,
          discountAmount: quote.totals.discountAmount,
          payableAmount: quote.totals.payableAmount,
          items: {
            create: quote.itemDetails.map((item: any) => ({
              dishId: item.dishId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              finalUnitPrice: item.finalUnitPrice,
              subtotal: item.subtotal,
              finalSubtotal: item.finalSubtotal,
              specs: item.specs || null,
              promotionLabel: item.promotionLabel,
              portionSize: item.portionSize || 0,
            })),
          },
          promotions: {
            create: quote.appliedPromotions.map((p: any) => ({
              promotionId: p.id,
              name: p.name,
              type: p.type,
              discount: p.discount,
              description: p.description,
            })),
          },
        },
        include: { items: true, promotions: true },
      })
    })
  } catch (err: any) {
    if (err?.isStockShort) {
      return res.status(409).json({ message: `「${stockNameMap.get(err.dishId)}」库存不足，请刷新菜单后重试` })
    }
    throw err
  }

  res.status(201).json({
    orderNo: order.orderNo,
    pickupCode: order.pickupCode,
    status: order.status,
    orderType: order.orderType,
    merchantId: order.merchantId,
    branchId: order.branchId,
    deviceId: order.deviceId,
    totals: {
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      payableAmount: order.payableAmount,
    },
    items: order.items.map((i: any) => ({
      dishId: i.dishId,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      finalUnitPrice: i.finalUnitPrice,
      finalSubtotal: i.finalSubtotal,
      specs: i.specs || undefined,
      promotionLabel: i.promotionLabel || undefined,
    })),
    createdAt: order.createdAt.toISOString(),
  })
})

// 未支付订单确认付款
app.post('/api/orders/:orderNo/pay', orderLimiter, authMiddleware, async (req, res) => {
  const { orderNo } = req.params
  const { paymentMethod: pm } = req.body ?? {}

  const order = await prisma.order.findUnique({ where: { orderNo }, select: { id: true, status: true, paidAt: true } })
  if (!order) return res.status(404).json({ message: '订单不存在' })
  if (order.paidAt) return res.status(400).json({ message: '订单不是未支付状态' })

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: order.status === 'unpaid' ? 'paid' : undefined,
      paidAt: new Date(),
      paymentMethod: typeof pm === 'string' && pm ? pm : '',
    },
  })
  res.json({ orderNo: updated.orderNo, status: updated.status })
})

app.post('/api/orders/:orderNo/complete', orderLimiter, authMiddleware, async (req, res) => {
  const { orderNo } = req.params

  const order = await prisma.order.findUnique({ where: { orderNo }, select: { id: true, status: true } })
  if (!order) return res.status(404).json({ message: '订单不存在' })
  if (order.status !== 'paid' && order.status !== 'preparing' && order.status !== 'ready') return res.status(400).json({ message: '订单状态不能取餐' })

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'completed' },
  })
  res.json({ success: true })
})

app.get('/api/orders', generalLimiter, authMiddleware, async (req, res) => {
  const deviceId = req.authDevice!.deviceId
  const { scope } = req.query as Record<string, string>

  // 从令牌获取设备，按设备权限筛选
  let where: any = {}
  const device = await prisma.device.findUnique({ where: { id: deviceId } })
  if (device && device.role !== 'admin') {
    where.deviceId = device.id
  }
  if (scope === 'active') where.status = { in: ['unpaid', 'paid', 'preparing', 'ready', 'completed'] }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { items: true, promotions: true },
    take: 50,
  })

  res.json({
    items: orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      pickupCode: o.pickupCode,
      status: o.status,
      orderType: o.orderType,
      paymentMethod: o.paymentMethod || undefined,
      deviceId: o.deviceId,
      totals: {
        originalAmount: o.originalAmount,
        discountAmount: o.discountAmount,
        payableAmount: o.payableAmount,
      },
      fullReduction: o.promotions
        .filter((p) => p.type === 'full_reduction')
        .reduce((s, p) => s + p.discount, 0),
      items: o.items.map((i) => ({
        id: i.id,
        dishId: i.dishId,
        name: i.name,
        quantity: i.quantity,
        finalUnitPrice: i.finalUnitPrice,
        finalSubtotal: i.finalSubtotal,
        specs: i.specs || undefined,
        promotionLabel: i.promotionLabel || undefined,
        status: i.status,
        portionSize: i.portionSize || undefined,
      })),
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() || undefined,
    })),
  })
})

app.get('/api/orders/:orderNo', generalLimiter, authMiddleware, async (req, res) => {
  const { orderNo } = req.params
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true, promotions: true },
  })
  if (!order) return res.status(404).json({ message: 'order not found' })

  res.json({
    orderNo: order.orderNo,
    pickupCode: order.pickupCode,
    status: order.status,
    orderType: order.orderType,
    totals: {
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      payableAmount: order.payableAmount,
    },
    fullReduction: order.promotions
      .filter((p) => p.type === 'full_reduction')
      .reduce((s, p) => s + p.discount, 0),
    items: order.items.map((i) => ({
      dishId: i.dishId,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      finalUnitPrice: i.finalUnitPrice,
      finalSubtotal: i.finalSubtotal,
      specs: i.specs || undefined,
      promotionLabel: i.promotionLabel || undefined,
      portionSize: i.portionSize || undefined,
    })),
    createdAt: order.createdAt.toISOString(),
  })
})

// 设备认证
app.post('/api/system/device-auth', authLimiter, async (req, res) => {
  const { sn, uuid, userAgent } = req.body ?? {}
  if (!sn || typeof sn !== 'string' || sn.length !== 8) {
    return res.status(400).json({ message: '请输入8位设备码' })
  }
  const device = await prisma.device.findUnique({ where: { sn } })
  if (!device) {
    return res.status(404).json({ message: '设备码无效，请确认后重新输入' })
  }
  if (device.status !== 'active') {
    return res.status(403).json({ message: '该设备已下线，无法使用' })
  }
  console.log(`[DEBUG] device-auth sn=${sn} deviceId=${device.id} code=${device.code}`)
  // 复用该 uuid 已有指纹（同一设备重连），新 uuid 则作为独立设备计入
  let authUuid = ''
  if (uuid) {
    const existing = await prisma.deviceFingerprint.findUnique({
      where: { deviceId_uuid: { deviceId: device.id, uuid } },
      select: { uuid: true },
    })
    authUuid = existing ? existing.uuid : uuid
  } else {
    // 旧客户端未传 uuid 时兼容回退
    const fp = await prisma.deviceFingerprint.findFirst({
      where: { deviceId: device.id },
      orderBy: { updatedAt: 'desc' },
      select: { uuid: true },
    })
    authUuid = fp?.uuid || ''
  }
  prisma.deviceAuthLog.create({
    data: {
      deviceId: device.id,
      uuid: authUuid,
      userAgent: userAgent || '',
      ip: req.ip || req.socket.remoteAddress || '',
    },
  }).catch((e) => console.error('[device-auth] log failed', e))
  // 每日首次认证更新指纹有效期（同一天不重复写，但有效期快过期时也更新）
  if (authUuid) {
    const today = new Date().toISOString().slice(0, 10)
    const expiryThreshold = new Date(Date.now() - FINGERPRINT_EXPIRY_MS / 2)
    const fp = await prisma.deviceFingerprint.findUnique({
      where: { deviceId_uuid: { deviceId: device.id, uuid: authUuid } },
      select: { lastSeenDate: true, updatedAt: true },
    })
    if (!fp || fp.lastSeenDate !== today || fp.updatedAt < expiryThreshold) {
      prisma.deviceFingerprint.upsert({
        where: { deviceId_uuid: { deviceId: device.id, uuid: authUuid } },
        create: { deviceId: device.id, uuid: authUuid, lastSeenDate: today },
        update: { lastSeenDate: today },
      }).catch((e) => console.error('[device-auth] fingerprint upsert failed', e))
    }
  }
  // 绑定该设备当前活跃的 uuid
  if (authUuid) {
    prisma.device.update({ where: { id: device.id }, data: { uuid: authUuid } })
      .catch((e) => console.error('[device-auth] update uuid failed', e))
  }
  const token = jwt.sign(
    { deviceId: device.id, sn: device.sn, uuid: authUuid },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  )
  res.json({
    token,
    deviceId: device.id,
    deviceCode: device.code,
    deviceName: device.name,
    branchId: device.branchId,
  })
})

// 二维码加密参数解密
app.get('/api/system/decode-device', async (req, res) => {
  const code = req.query.code as string
  if (!code) return res.status(400).json({ message: '缺少参数' })
  const sn = decryptDeviceToken(code)
  if (!sn) return res.status(400).json({ message: '无效的扫码参数' })
  const device = await prisma.device.findUnique({
    where: { sn },
    select: { id: true, status: true },
  })
  if (!device || device.status !== 'active') {
    return res.status(400).json({ message: '设备不存在或已下线' })
  }
  res.json({ sn })
})

// 获取分享设备的加密 token（前端拼完整 URL）
app.get('/api/system/shared-device-qr', async (req, res) => {
  const device = await prisma.device.findFirst({
    where: { shared: true, status: 'active' },
    select: { sn: true },
  })
  if (!device || !device.sn) return res.status(404).json({ message: '未设置分享设备' })
  const token = encryptDeviceSN(device.sn)
  res.json({ token })
})

/* ===== Reviews ===== */

function genReviewCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// 检查当前设备评价状态
app.get('/api/reviews/status', generalLimiter, authMiddleware, async (req, res) => {
  const deviceId = req.authDevice!.deviceId
  const reviews = await prisma.review.findMany({
    where: { deviceId },
    include: { items: true, code: true },
    orderBy: { createdAt: 'desc' },
  })
  const latest = reviews[0]
  const now = new Date()
  // 只返回没有 code 且在 30 分钟内的 current（未完成兑换流程的续接用）
  const current = latest && !latest.code && (now.getTime() - latest.createdAt.getTime()) < 30 * 60 * 1000 ? {
    id: latest.id,
    rewardDishId: latest.rewardDishId,
    code: null,
    itemCount: latest.items.length,
    createdAt: latest.createdAt.toISOString(),
  } : null
  res.json({
    reviewed: false,
    reviewedDishIds: [],
    current,
  })
})

// 获取该设备历史点过的菜品
app.get('/api/reviews/dishes', generalLimiter, authMiddleware, async (req, res) => {
  const deviceId = req.authDevice!.deviceId
  const orders = await prisma.order.findMany({
    where: { deviceId, status: { in: ['paid', 'preparing', 'ready', 'completed'] } },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  // 去重合并
  const dishMap = new Map<string, { dishId: string; name: string; image: string | null; count: number }>()
  for (const o of orders) {
    for (const i of o.items) {
      const key = i.dishId
      if (dishMap.has(key)) dishMap.get(key)!.count += i.quantity
      else dishMap.set(key, { dishId: i.dishId, name: i.name, image: null, count: i.quantity })
    }
  }
  // 补上菜品图片，过滤饮品
  const dishIds = Array.from(dishMap.keys())
  const skipCategoryNames = ['饮品']
  if (dishIds.length > 0) {
    const dishRecords = await prisma.dish.findMany({
      where: { id: { in: dishIds } },
      select: { id: true, image: true, category: { select: { name: true } } },
    })
    for (const d of dishRecords) {
      if (skipCategoryNames.some((n) => d.category?.name.includes(n))) {
        dishMap.delete(d.id)
        continue
      }
      const entry = dishMap.get(d.id)
      if (entry) entry.image = d.image
    }
  }
  // 按点单次数排序
  const dishes = Array.from(dishMap.values()).sort((a, b) => b.count - a.count)
  res.json({ items: dishes })
})

// 提交评价
app.post('/api/reviews', generalLimiter, authMiddleware, async (req, res) => {
  const deviceId = req.authDevice!.deviceId
  const { branchId, items, comment } = req.body ?? {}
  if (!branchId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: '缺少参数' })
  }

  // 检查评价是否已关闭
  const m = await prisma.merchant.findFirst({ select: { reviewSettings: true } })
  if (m) {
    const settings = JSON.parse(m.reviewSettings || '{}')
    if (!settings.enabled) return res.status(403).json({ message: '评价功能已关闭' })
  }

  const review = await prisma.review.create({
    data: {
      branchId,
      deviceId,
      uuid: req.authDevice!.uuid,
      comment: comment || null,
      items: {
        create: items.map((it: any) => ({
          dishId: it.dishId,
          dishName: it.dishName,
          overall: it.overall,
          spiciness: it.spiciness ?? null,
          texture: it.texture ?? null,
          portion: it.portion ?? null,
          price: it.price ?? null,
          comment: it.comment || null,
        })),
      },
    },
    include: { items: true },
  })
  res.json({ id: review.id, itemCount: review.items.length })
})

// 选择赠品并生成兑换码
app.post('/api/reviews/reward', generalLimiter, authMiddleware, async (req, res) => {
  const { deviceId, uuid } = req.authDevice!
  const { reviewId, dishId, dishName } = req.body ?? {}
  if (!reviewId || !dishId || !dishName) return res.status(400).json({ message: '缺少参数' })

  const review = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!review || review.deviceId !== deviceId || review.uuid !== uuid) return res.status(404).json({ message: '评价不存在' })
  if (review.rewardDishId) return res.status(409).json({ message: '已领取过赠品' })

  // 生成唯一兑换码（重试直到不重复）
  let code = genReviewCode()
  while (await prisma.reviewCode.findUnique({ where: { code } })) code = genReviewCode()

  // 通过设备所属门店获取 branchId
  const device = await prisma.device.findUnique({ where: { id: deviceId }, select: { branchId: true } })

  const reviewCode = await prisma.reviewCode.create({
    data: {
      reviewId: review.id,
      branchId: device?.branchId || '',
      dishId,
      dishName,
      code,
    },
  })
  // 更新 review 的 rewardDishId
  await prisma.review.update({ where: { id: review.id }, data: { rewardDishId: dishId } })

  res.json({ code: reviewCode.code, dishName })
})

// 获取商家赠品池
app.get('/api/reviews/gift-dishes', generalLimiter, authMiddleware, async (req, res) => {
  const { deviceId, uuid } = req.authDevice!
  const device = await prisma.device.findUnique({ where: { id: deviceId }, include: { branch: true } })
  if (!device) return res.status(404).json({ message: 'device not found' })
  const merchantId = device.branch.merchantId

  // 今日该 uuid 已领过赠品 → 返回空列表，前端自动跳过选赠品步骤
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayCode = await prisma.reviewCode.findFirst({
    where: { review: { deviceId, uuid }, createdAt: { gte: todayStart } },
  })
  if (todayCode) return res.json({ items: [] })

  const giftEntries = await prisma.reviewGiftDish.findMany({ where: { merchantId } })
  const dishQuantityMap = new Map(giftEntries.map((g) => [g.dishId, g.quantity]))
  const dishes = await prisma.dish.findMany({
    where: { merchantId, id: { in: Array.from(dishQuantityMap.keys()) }, status: 'active' },
    orderBy: { sort: 'asc' },
  })
  res.json({ items: dishes.map((d) => ({ id: d.id, name: d.name, price: d.price, image: d.image, quantity: dishQuantityMap.get(d.id) ?? 1 })) })
})

// 获取该设备的历史评价
app.get('/api/reviews/history', generalLimiter, authMiddleware, async (req, res) => {
  const { deviceId, uuid } = req.authDevice!
  const reviews = await prisma.review.findMany({
    where: { deviceId, uuid },
    include: { items: true, code: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  res.json({
    items: reviews.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      items: r.items.map((i) => ({
        dishId: i.dishId,
        dishName: i.dishName,
        overall: i.overall,
        spiciness: i.spiciness,
        texture: i.texture,
        portion: i.portion,
        price: i.price,
        comment: i.comment,
      })),
      code: r.code ? { code: r.code.code, dishName: r.code.dishName, status: r.code.status } : null,
    })),
  })
})

app.listen(port, () => {
  console.log(`API Core server running on http://localhost:${port}`)
})
