import cors from 'cors'
import express from 'express'
import session from 'express-session'
import { PrismaClient } from '@prisma/client'
import adminRouter from './admin.js'

const app = express()
const port = Number(process.env.PORT || 3011)
const prisma = new PrismaClient()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET || 'diancan-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 },
}))

app.use('/api/admin', adminRouter)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'api-core' })
})

app.get('/api/system/bootstrap', async (_req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const branch = await prisma.branch.findFirst({ where: { merchantId: merchant.id } })
  const device = await prisma.device.findFirst({ where: { branchId: branch?.id } })
  const allDevices = branch ? await prisma.device.findMany({ where: { branchId: branch.id, status: 'active' } }) : []
  const features = JSON.parse(merchant.features)
  const featuredItems = await prisma.featuredItem.findMany({
    where: { merchantId: merchant.id, active: true },
    orderBy: { sort: 'asc' },
  })

  const activePromotions = await prisma.promotion.findMany({
    where: { merchantId: merchant.id, status: 'active' },
    include: { items: { include: { dish: { select: { id: true, image: true, name: true } } } } },
  })

  res.json({
    merchantId: merchant.id,
    merchantName: merchant.name,
    branchId: branch?.id ?? '',
    branchName: branch?.name ?? '',
    branchCode: branch?.code ?? '',
    deviceId: device?.id ?? '',
    deviceCode: device?.code ?? '',
    deviceMode: device?.mode ?? 'kiosk',
    devices: allDevices.map((d) => ({ id: d.id, code: d.code, name: d.name, mode: d.mode })),
    slogan: merchant.slogan,
    businessHours: merchant.businessHours,
    todayLocation: branch?.todayLocation ?? '',
    locationHint: branch?.locationHint ?? '',
    statusText: merchant.statusText,
    features,
    promotions: activePromotions
      .filter((p) => ['full_reduction', 'welfare_item', 'time_discount', 'new_user', 'holiday_gift', 'total_discount'].includes(p.type))
      .map((p) => {
        const rules = JSON.parse(p.rules)
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
          itemIds: p.items?.map((i) => i.dishId).filter(Boolean) || [],
        }
      }),
    featuredItems: featuredItems.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      priceText: f.priceText,
      badge: f.badge,
      badgeTone: f.badgeTone,
    })),
    commands: device ? await prisma.deviceCommand.findMany({
      where: { deviceId: device.id, status: 'pending' },
      select: { id: true, command: true, params: true },
    }) : [],
  })
})

app.post('/api/commands/:id/ack', async (req, res) => {
  const { id } = req.params
  await prisma.deviceCommand.update({ where: { id }, data: { status: 'executed', executedAt: new Date() } })
  res.json({ success: true })
})

app.get('/api/catalog/menu', async (_req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const categories = await prisma.category.findMany({
    where: { branch: { merchantId: merchant.id } },
    orderBy: { sort: 'asc' },
  })

  const dishes = await prisma.dish.findMany({
    where: { merchantId: merchant.id, status: 'active' },
    orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
  })
  const dishPriceMap = new Map(dishes.map((d) => [d.id, d.price]))

  const activePromotions = await prisma.promotion.findMany({
    where: { status: 'active' },
    include: { items: true },
  })
  const promoDishMap = new Map<string, { promoPrice: number; type: string; name: string }>()
  for (const promo of activePromotions) {
    // 已过期的限时折扣跳过
    if (promo.endDate && new Date(promo.endDate) < new Date()) continue
    if (promo.startDate && new Date(promo.startDate) > new Date()) continue

    for (const pi of promo.items) {
      if (promo.type === 'time_discount') {
        const price = pi.promoPrice ?? (() => {
          const rules = JSON.parse(promo.rules)
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

  res.json({
    merchant: { id: merchant.id, name: merchant.name },
    branch: { id: '', name: '' },
    categories: categories.map((c) => ({ id: c.id, name: c.name, sort: c.sort })),
    dishes: dishes.map((d) => {
      const promo = promoDishMap.get(d.id)
      return {
        id: d.id,
        categoryId: d.categoryId,
        name: d.name,
        price: d.price,
        desc: d.desc,
        image: d.image,
        tags: JSON.parse(d.tags) as string[],
        specsPreset: d.specsPreset,
        portionSize: d.portionSize,
        promoPrice: promo?.promoPrice ?? null,
        promotionName: promo?.name ?? null,
      }
    }),
  })
})

app.post('/api/cart/quote', async (req, res) => {
  const { items } = req.body ?? {}
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items is required' })
  }

  const normalizedItems = items
    .map((item: any) => ({
      dishId: String(item?.dishId ?? ''),
      quantity: Number(item?.quantity ?? 0),
      specs: String(item?.specs ?? ''),
    }))
    .filter((item) => item.dishId && item.quantity > 0)

  if (normalizedItems.length === 0) {
    return res.status(400).json({ message: 'valid items is required' })
  }

  // 查询所有菜品和活动
  const dishIds = [...new Set(normalizedItems.map((i) => i.dishId))]
  const dishes = await prisma.dish.findMany({ where: { id: { in: dishIds } } })
  const dishMap = new Map(dishes.map((d) => [d.id, d]))

  const activePromotions = await prisma.promotion.findMany({
    where: { status: 'active' },
    include: { items: true },
  })
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

    const portionFactor = dish.portionSize || 1
    const subtotal = dish.price * item.quantity / portionFactor
    originalAmount += subtotal

    let finalUnitPrice = dish.price
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
        const discountedPrice = Math.round(dish.price * discountRate * 100) / 100
        if (discountRate < 1) {
          finalUnitPrice = discountedPrice
          finalSubtotal = discountedPrice * item.quantity / portionFactor
          const perItem = dish.price - discountedPrice
          const discount = Number((perItem * item.quantity / portionFactor).toFixed(2))
          if (discount > 0) {
            appliedPromotions.push({
              id: timeDiscountPromo.id,
              name: timeDiscountPromo.name,
              type: 'time_discount',
              discount,
              description: `${timeDiscountPromo.name}，${dish.price.toFixed(2)} → ${discountedPrice.toFixed(2)}`,
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
      unitPrice: dish.price,
      finalUnitPrice: Number(finalUnitPrice.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      finalSubtotal: Number(finalSubtotal.toFixed(2)),
      specs: item.specs,
      promotionLabel,
      portionSize: dish.portionSize || undefined,
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

  // 收集所有有门槛的活动，按门槛从小到大排序，只对第一个有问题的活动生成提示
  const totalDiscountPromos = activePromotions.filter((p) => p.type === 'total_discount')
  const thresholdPromos = [
    ...fullReductionPromos.map((p) => ({ promo: p, threshold: JSON.parse(p.rules).threshold ?? 0 })),
    ...totalDiscountPromos.map((p) => ({ promo: p, threshold: JSON.parse(p.rules).minAmount ?? 0 })),
  ].sort((a, b) => a.threshold - b.threshold)
  for (const { promo } of thresholdPromos) {
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
    // 有排除商品 → 显示排除提示并停止
    if (excludedItems.length > 0) {
      hints.push(`${[...new Set(excludedItems)].join('、')} 不参与${promo.name}。`)
      break
    }
    // 未达门槛 → 显示"再点...可享"提示并停止
    if (eligibleAmount > 0 && eligibleAmount < threshold) {
      const diff = Number((threshold - eligibleAmount).toFixed(2))
      hints.push(`再点 ¥${diff.toFixed(2)} 可享${promo.name}。`)
      break
    }
  }

  // 总价折扣（优先级最高，命中后不再执行满减）
  let totalDiscountApplied = false
  for (const promo of totalDiscountPromos) {
    const rules = JSON.parse(promo.rules)
    const { discountType, discountValue, maxDiscount, minAmount, excludedDishIds } = rules
    if (!discountType || !discountValue) continue

    let eligibleAmount = 0
    for (const item of itemDetails) {
      if (!(excludedDishIds ?? []).includes(item.dishId)) {
        eligibleAmount += item.finalSubtotal
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
      for (const item of itemDetails) {
        if (!excludedDishIds.includes(item.dishId)) {
          eligibleAmount += item.finalSubtotal
        }
      }

      if (eligibleAmount >= threshold && discount > 0) {
        payableAmount -= discount
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

app.post('/api/orders', async (req, res) => {
  const { merchantId, branchId, deviceId, items, orderType } = req.body ?? {}

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
    }))
    .filter((item) => item.dishId && item.quantity > 0)

  if (normalizedItems.length === 0) {
    return res.status(400).json({ message: 'valid items is required' })
  }

  // 重新计算 quote
  const quoteReq = { body: { items: normalizedItems } } as any
  const quoteRes = await fetch(`http://localhost:${port}/api/cart/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: normalizedItems }),
  })
  const quote = await quoteRes.json()

  // 取餐号: branchCode(字母) + deviceCode(2位数字) + 当日流水(3位)
  const branch = await prisma.branch.findUnique({ where: { id: branchId } })
  const device = await prisma.device.findUnique({ where: { id: deviceId } })
  const branchCode = branch?.code?.toUpperCase() || 'X'
  const devCode = (device?.code || '00').padStart(2, '0')
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayOrderCount = await prisma.order.count({
    where: { createdAt: { gte: todayStart } },
  })
  const dailySeq = String(todayOrderCount + 1).padStart(3, '0')
  const pickupCode = `${branchCode}${devCode}${dailySeq}`

  // 订单号
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const orderNo = `DC${dateStr}${dailySeq}${devCode}`

  const type = orderType === 'takeaway' ? 'takeaway' : 'dine-in'

  const order = await prisma.order.create({
    data: {
      orderNo,
      pickupCode,
      status: 'paid',
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
    items: order.items.map((i) => ({
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

app.get('/api/orders', async (_req, res) => {
  const orders = await prisma.order.findMany({
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
      totals: {
        originalAmount: o.originalAmount,
        discountAmount: o.discountAmount,
        payableAmount: o.payableAmount,
      },
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
    })),
  })
})

app.get('/api/orders/:orderNo', async (req, res) => {
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

// 设备认证：通过8位SN匹配点餐机
app.post('/api/system/device-auth', async (req, res) => {
  const { sn } = req.body ?? {}
  if (!sn || typeof sn !== 'string' || sn.length !== 8) {
    return res.status(400).json({ message: '请输入8位设备码' })
  }
  const device = await prisma.device.findUnique({ where: { sn } })
  if (!device) {
    return res.status(404).json({ message: '设备码无效，请确认后重新输入' })
  }
  res.json({
    deviceId: device.id,
    deviceCode: device.code,
    deviceName: device.name,
    branchId: device.branchId,
  })
})

app.listen(port, () => {
  console.log(`API Core server running on http://localhost:${port}`)
})
