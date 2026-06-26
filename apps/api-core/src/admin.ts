import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'
import { invalidateGlobalCache } from './cache.js'

const router: ReturnType<typeof Router> = Router()
const prisma = new PrismaClient()

// 设备指纹有效期（测试用 30s，上线改回 7 * 24 * 60 * 60 * 1000）
const FINGERPRINT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

const ADMIN_PASSWORD_HASH = crypto.createHash('md5').update('xpow!1234').digest('hex')
console.log('[admin] password hash:', ADMIN_PASSWORD_HASH)

function quoteIdentifier(name: string): string {
  return `"${String(name).replace(/"/g, '""')}"`
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString('hex').toUpperCase()}'`
  }
  const text = String(value).replace(/'/g, "''")
  return `'${text}'`
}

declare module 'express-session' {
  interface SessionData {
    adminAuthed?: boolean
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.adminAuthed) return next()
  res.status(401).json({ message: '请先登录' })
}

async function checkDishConflict(dishIds: string[], excludePromotionId?: string): Promise<string[]> {
  if (!dishIds.length) return []
  const conflicts = await prisma.promotionItem.findMany({
    where: {
      dishId: { in: dishIds },
      promotion: { status: 'active' },
      ...(excludePromotionId ? { promotionId: { not: excludePromotionId } } : {}),
    },
    include: { promotion: { select: { name: true } }, dish: { select: { name: true } } },
  })
  return conflicts.map((c) => `${c.dish.name} 已在活动「${c.promotion.name}」中`)
}

/* ===== Auth ===== */
router.post('/auth/login', (req, res) => {
  const { password } = req.body ?? {}
  const hash = crypto.createHash('md5').update(String(password ?? '')).digest('hex')
  if (hash !== ADMIN_PASSWORD_HASH) {
    return res.status(403).json({ message: '密码错误' })
  }
  req.session.adminAuthed = true
  res.json({ success: true })
})

router.get('/auth/check', (req, res) => {
  res.json({ authed: !!req.session?.adminAuthed })
})

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {})
  res.json({ success: true })
})

/* ===== All routes below require auth ===== */
router.use(requireAuth)

/* ===== Backup ===== */

router.get('/backup.sql', async (_req, res) => {
  const tables = await prisma.$queryRawUnsafe<Array<{ name: string; sql: string | null }>>(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name ASC
  `)

  const postObjects = await prisma.$queryRawUnsafe<Array<{ type: string; name: string; tbl_name: string; sql: string | null }>>(`
    SELECT type, name, tbl_name, sql
    FROM sqlite_master
    WHERE type IN ('index', 'trigger', 'view')
      AND name NOT LIKE 'sqlite_%'
      AND sql IS NOT NULL
    ORDER BY
      CASE type
        WHEN 'view' THEN 1
        WHEN 'index' THEN 2
        WHEN 'trigger' THEN 3
        ELSE 4
      END,
      name ASC
  `)

  const lines: string[] = [
    '-- diancan.xpow.cn admin backup',
    `-- generated at ${new Date().toISOString()}`,
    'PRAGMA foreign_keys=OFF;',
    'BEGIN TRANSACTION;',
    '',
  ]

  for (const table of tables) {
    if (table.sql) {
      lines.push(`${table.sql};`)
    }

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM ${quoteIdentifier(table.name)}`)
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]).map(quoteIdentifier).join(', ')
      for (const row of rows) {
        const values = Object.values(row).map(sqlValue).join(', ')
        lines.push(`INSERT INTO ${quoteIdentifier(table.name)} (${columns}) VALUES (${values});`)
      }
    }

    lines.push('')
  }

  for (const obj of postObjects) {
    if (obj.sql) lines.push(`${obj.sql};`)
  }

  lines.push('', 'COMMIT;', '')

  const stamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')
  res.setHeader('Content-Type', 'application/sql; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="diancan-backup-${stamp}.sql"`)
  res.send(lines.join('\n'))
})

/* ===== Orders ===== */

router.get('/orders', async (_req, res) => {
  const { status, branchId, page = '1', limit = '50' } = _req.query as Record<string, string>
  const where: any = {}
  if (status) where.status = status
  if (branchId) where.branchId = branchId

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
  const take = Math.min(200, Math.max(1, Number(limit)))

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
    orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { items: true, promotions: true },
    }),
    prisma.order.count({ where }),
  ])

  res.json({
    items: items.map((o) => ({
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
        unitPrice: i.unitPrice,
        finalUnitPrice: i.finalUnitPrice,
        finalSubtotal: i.finalSubtotal,
        specs: i.specs || undefined,
        promotionLabel: i.promotionLabel || undefined,
        status: i.status,
        portionSize: i.portionSize || undefined,
      })),
      createdAt: o.createdAt.toISOString(),
      cancelReason: o.cancelReason || undefined,
      cancelledAt: o.cancelledAt?.toISOString() || undefined,
    })),
    total,
    page: Number(page),
    limit: take,
  })
})

router.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params
  const { status, cancelReason } = req.body ?? {}
  const validStatuses = ['pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: '无效状态' })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return res.status(404).json({ message: '订单不存在' })

  const data: any = { status }
  if (status === 'cancelled') {
    data.cancelledAt = new Date()
    if (cancelReason) data.cancelReason = cancelReason
  }

  const updated = await prisma.order.update({
    where: { id },
    data,
    include: { items: true },
  })

  res.json({ id: updated.id, status: updated.status })
})

router.put('/orders/:orderId/items/:itemId/status', async (req, res) => {
  const { orderId, itemId } = req.params
  const { status } = req.body ?? {}
  if (!['pending', 'preparing', 'ready'].includes(status)) {
    return res.status(400).json({ message: '无效状态' })
  }

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
  if (!item || item.orderId !== orderId) {
    return res.status(404).json({ message: '菜品不存在' })
  }

  await prisma.orderItem.update({ where: { id: itemId }, data: { status } })

  // 检查订单下所有菜品是否都已 ready，是则自动将订单设为 ready
  const allItems = await prisma.orderItem.findMany({ where: { orderId } })
  const allReady = allItems.length > 0 && allItems.every((i) => i.status === 'ready')
  if (allReady) {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'ready' } })
    return res.json({ itemId, status, orderStatus: 'ready' })
  }

  // 如果有菜品正在制作且订单还不是 preparing，自动设为 preparing
  const hasPreparing = allItems.some((i) => i.status === 'preparing')
  if (hasPreparing) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } })
    if (order?.status === 'paid') {
      await prisma.order.update({ where: { id: orderId }, data: { status: 'preparing' } })
      return res.json({ itemId, status, orderStatus: 'preparing' })
    }
  }

  res.json({ itemId, status })
})

/* ===== Dishes ===== */

router.get('/dishes', async (_req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const dishes = await prisma.dish.findMany({
    where: { merchantId: merchant.id },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
  })

  res.json(
    dishes.map((d) => ({
      id: d.id,
      name: d.name,
      price: d.price,
      desc: d.desc,
      image: d.image,
      tags: JSON.parse(d.tags) as string[],
      specsPreset: d.specsPreset,
      categoryId: d.categoryId,
      categoryName: d.category.name,
      status: d.status,
      sort: d.sort,
      portionSize: d.portionSize,
      createdAt: d.createdAt.toISOString(),
    })),
  )
})

router.post('/dishes', async (req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const { name, price, categoryId, desc, image, tags, specsPreset, portionSize } = req.body ?? {}
  if (!name || price === undefined || !categoryId) {
    return res.status(400).json({ message: 'name, price, categoryId 必填' })
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) return res.status(400).json({ message: '分类不存在' })

  const dish = await prisma.dish.create({
    data: {
      merchantId: merchant.id,
      categoryId,
      name,
      price: Number(price),
      desc: desc ?? '',
      image: image ?? null,
      tags: JSON.stringify(tags ?? []),
      specsPreset: specsPreset ?? 'none',
      portionSize: Number(portionSize) || 0,
    },
  })

  res.status(201).json({ id: dish.id, name: dish.name })
  invalidateGlobalCache()
})

router.put('/dishes/reorder', async (req, res) => {
  const { ids } = req.body ?? {}
  if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids 必填' })

  for (let i = 0; i < ids.length; i++) {
    await prisma.dish.update({ where: { id: ids[i] }, data: { sort: i } })
  }
  invalidateGlobalCache()
  res.json({ success: true })
})

router.put('/dishes/:id', async (req, res) => {
  const { id } = req.params
  const { name, price, categoryId, desc, image, tags, specsPreset, status, sort, portionSize } = req.body ?? {}

  const dish = await prisma.dish.findUnique({ where: { id } })
  if (!dish) return res.status(404).json({ message: '菜品不存在' })

  const data: any = {}
  if (name !== undefined) data.name = name
  if (price !== undefined) data.price = Number(price)
  if (categoryId !== undefined) data.categoryId = categoryId
  if (desc !== undefined) data.desc = desc
  if (image !== undefined) data.image = image
  if (tags !== undefined) data.tags = JSON.stringify(tags)
  if (specsPreset !== undefined) data.specsPreset = specsPreset
  if (status !== undefined) data.status = status
  if (portionSize !== undefined) data.portionSize = Number(portionSize)
  if (sort !== undefined) {
    const newSort = Number(sort)
    if (newSort !== dish.sort) {
      // 将冲突位置及之后的菜品排序后移
      const toShift = await prisma.dish.findMany({
        where: { merchantId: dish.merchantId, categoryId: dish.categoryId, id: { not: id }, sort: { gte: newSort } },
        orderBy: { sort: 'asc' },
      })
      await Promise.all(
        toShift.map((d, i) =>
          prisma.dish.update({ where: { id: d.id }, data: { sort: newSort + i + 1 } }),
        ),
      )
    }
    data.sort = newSort
  }

  await prisma.dish.update({ where: { id }, data })

  // 菜品下线时，关联的营销活动自动下线
  if (status !== undefined && status !== 'active') {
    const promoItems = await prisma.promotionItem.findMany({
      where: { dishId: id },
      include: { promotion: true },
    })
    const activePromoIds = [...new Set(promoItems
      .filter((pi) => pi.promotion.status === 'active')
      .map((pi) => pi.promotionId))]
    if (activePromoIds.length) {
      await prisma.promotion.updateMany({
        where: { id: { in: activePromoIds } },
        data: { status: 'inactive' },
      })
    }
  }

  invalidateGlobalCache()
  res.json({ id, success: true })
})

router.delete('/dishes/:id', async (req, res) => {
  const { id } = req.params
  await prisma.dish.delete({ where: { id } }).catch(() => {})
  invalidateGlobalCache()
  res.json({ success: true })
})

/* ===== Categories ===== */

router.get('/categories', async (_req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const branch = await prisma.branch.findFirst({ where: { merchantId: merchant.id } })
  if (!branch) return res.json([])

  const categories = await prisma.category.findMany({
    where: { branchId: branch.id },
    orderBy: { sort: 'asc' },
  })

  res.json(categories.map((c) => ({ id: c.id, name: c.name, sort: c.sort })))
})

router.post('/categories', async (req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const branch = await prisma.branch.findFirst({ where: { merchantId: merchant.id } })
  if (!branch) return res.status(400).json({ message: '请先创建分店' })

  const { name, sort = 0 } = req.body ?? {}
  if (!name) return res.status(400).json({ message: 'name 必填' })

  const cat = await prisma.category.create({
    data: { branchId: branch.id, name, sort: Number(sort) },
  })

  res.status(201).json({ id: cat.id, name: cat.name })
  invalidateGlobalCache()
})

router.put('/categories/:id', async (req, res) => {
  const { id } = req.params
  const { name, sort } = req.body ?? {}
  const data: any = {}
  if (name !== undefined) data.name = name
  if (sort !== undefined) data.sort = Number(sort)

  await prisma.category.update({ where: { id }, data })
  invalidateGlobalCache()
  res.json({ success: true })
})

router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params
  const dishCount = await prisma.dish.count({ where: { categoryId: id } })
  if (dishCount > 0) {
    return res.status(400).json({ message: `该分类下有 ${dishCount} 个菜品，请先移除或调整` })
  }
  await prisma.category.delete({ where: { id } }).catch(() => {})
  invalidateGlobalCache()
  res.json({ success: true })
})

/* ===== Promotions ===== */

router.get('/promotions', async (_req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const promotions = await prisma.promotion.findMany({
    where: { merchantId: merchant.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  res.json(
    promotions.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      status: p.status,
      stackable: p.stackable,
      rules: JSON.parse(p.rules),
      items: p.items.map((i) => ({
        id: i.id,
        dishId: i.dishId,
        promoPrice: i.promoPrice,
        limitType: i.limitType,
        maxQty: i.maxQty,
      })),
      startDate: p.startDate?.toISOString() ?? null,
      endDate: p.endDate?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  )
})

router.post('/promotions', async (req, res) => {
  try {
    const merchant = await prisma.merchant.findFirst()
    if (!merchant) return res.status(404).json({ message: 'merchant not found' })

    const { name, type, rules, items, status, stackable, startDate, endDate } = req.body ?? {}
    if (!name || !type) return res.status(400).json({ message: 'name, type 必填' })

    // 检查商品是否已在其他进行中的活动
    const dishIds = (items ?? []).map((i: any) => i.dishId).filter(Boolean)
    if (dishIds.length) {
      const conflicts = await checkDishConflict(dishIds)
      if (conflicts.length) {
        return res.status(409).json({ message: `以下商品已参与其他活动：${conflicts.join('；')}` })
      }
    }

    const promo = await prisma.promotion.create({
      data: {
        merchantId: merchant.id,
        name,
        type,
        stackable: stackable ?? true,
        rules: JSON.stringify(rules ?? {}),
        status: status ?? 'draft',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        items: items?.length
          ? {
              create: items.map((item: any) => ({
                dishId: item.dishId,
                promoPrice: item.promoPrice ?? null,
                limitType: item.limitType ?? 'per_order',
                maxQty: item.maxQty ?? 1,
              })),
            }
          : undefined,
      },
      include: { items: true },
    })

    res.status(201).json({ id: promo.id, name: promo.name })
    invalidateGlobalCache()
  } catch (e: any) {
    console.error('[promotions] create error:', e)
    res.status(500).json({ message: e.message, stack: e.stack })
  }
})

router.put('/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, type, rules, items, status, stackable, startDate, endDate } = req.body ?? {}

    const promo = await prisma.promotion.findUnique({ where: { id } })
    if (!promo) return res.status(404).json({ message: '活动不存在' })

    // 检查商品是否已在其他进行中的活动
    if (items !== undefined) {
      const dishIds = items.map((i: any) => i.dishId).filter(Boolean)
      const newStatus = status ?? promo.status
      if (newStatus === 'active') {
        const conflicts = await checkDishConflict(dishIds, id)
        if (conflicts.length) {
          return res.status(409).json({ message: `以下商品已参与其他活动：${conflicts.join('；')}` })
        }
      }
    }

    // 从非 active 恢复为 active 时，检查关联商品是否已上架
    const targetStatus = status ?? promo.status
    if (targetStatus === 'active' && promo.status !== 'active') {
      const promoItems = await prisma.promotionItem.findMany({
        where: { promotionId: id },
        include: { dish: true },
      })
      const offlineDishes = promoItems
        .filter((pi) => pi.dish.status !== 'active')
        .map((pi) => pi.dish.name)
      if (offlineDishes.length) {
        return res.status(409).json({ message: `以下商品已下线，请重新上架后再启用活动：${offlineDishes.join('；')}` })
      }
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (type !== undefined) data.type = type
    if (rules !== undefined) data.rules = JSON.stringify(rules)
    if (status !== undefined) data.status = status
    if (stackable !== undefined) data.stackable = stackable
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null

    await prisma.promotion.update({ where: { id }, data })

    // 重建关联商品
    if (items !== undefined) {
      await prisma.promotionItem.deleteMany({ where: { promotionId: id } })
      if (items.length > 0) {
        await prisma.promotionItem.createMany({
          data: items.map((item: any) => ({
            promotionId: id,
            dishId: item.dishId,
            promoPrice: item.promoPrice ?? null,
            limitType: item.limitType ?? 'per_order',
            maxQty: item.maxQty ?? 1,
          })),
        })
      }
    }

    res.json({ success: true })
    invalidateGlobalCache()
  } catch (e: any) {
    console.error('[promotions] update error:', e)
    res.status(500).json({ message: e.message, stack: e.stack })
  }
})

router.delete('/promotions/:id', async (req, res) => {
  const { id } = req.params
  await prisma.promotion.update({ where: { id }, data: { status: 'ended' } })
  invalidateGlobalCache()
  res.json({ success: true })
})

/* ===== Merchant ===== */

router.get('/merchant', async (_req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const branches = await prisma.branch.findMany({ where: { merchantId: merchant.id } })

  res.json({
    id: merchant.id,
    name: merchant.name,
    slogan: merchant.slogan,
    businessHours: merchant.businessHours,
    statusText: merchant.statusText,
    logoUrl: merchant.logoUrl,
    features: JSON.parse(merchant.features),
    branches: await Promise.all(branches.map(async (b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      address: b.address,
      todayLocation: b.todayLocation,
      locationHint: b.locationHint,
      status: b.status,
      deviceCount: await prisma.device.count({ where: { branchId: b.id } }),
      orderCount: await prisma.order.count({ where: { branchId: b.id } }),
    }))),
  })
})

router.put('/merchant', async (req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const { name, slogan, businessHours, statusText, logoUrl, features } = req.body ?? {}
  const data: any = {}
  if (name !== undefined) data.name = name
  if (slogan !== undefined) data.slogan = slogan
  if (businessHours !== undefined) data.businessHours = businessHours
  if (statusText !== undefined) data.statusText = statusText
  if (logoUrl !== undefined) data.logoUrl = logoUrl
  if (features !== undefined) data.features = JSON.stringify(features)

  await prisma.merchant.update({ where: { id: merchant.id }, data })
  invalidateGlobalCache()
  res.json({ success: true })
})

/* ===== Branches ===== */

router.get('/branches', async (_req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const branches = await prisma.branch.findMany({
    where: { merchantId: merchant.id },
    include: { _count: { select: { devices: true, orders: true } } },
    orderBy: { createdAt: 'desc' },
  })

  res.json(
    branches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      address: b.address,
      lat: b.lat,
      lng: b.lng,
      todayLocation: b.todayLocation,
      locationHint: b.locationHint,
      bannerUrl: b.bannerUrl,
      status: b.status,
      deviceCount: b._count.devices,
      orderCount: b._count.orders,
    })),
  )
})

router.post('/branches', async (req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const { code, name, address, lat, lng, todayLocation, locationHint, bannerUrl } = req.body ?? {}
  if (!name) return res.status(400).json({ message: 'name 必填' })

  const branch = await prisma.branch.create({
    data: {
      merchantId: merchant.id,
      code: code ?? '',
      name,
      address: address ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      todayLocation: todayLocation ?? null,
      locationHint: locationHint ?? null,
      bannerUrl: bannerUrl ?? null,
    },
  })

  res.status(201).json({ id: branch.id, name: branch.name })
  invalidateGlobalCache()
})

router.put('/branches/:id', async (req, res) => {
  const { id } = req.params
  const { code, name, address, lat, lng, todayLocation, locationHint, bannerUrl, status } = req.body ?? {}

  const branch = await prisma.branch.findUnique({ where: { id } })
  if (!branch) return res.status(404).json({ message: '分店不存在' })

  const data: any = {}
  if (code !== undefined) data.code = code
  if (name !== undefined) data.name = name
  if (address !== undefined) data.address = address
  if (lat !== undefined) data.lat = lat
  if (lng !== undefined) data.lng = lng
  if (todayLocation !== undefined) data.todayLocation = todayLocation
  if (locationHint !== undefined) data.locationHint = locationHint
  if (bannerUrl !== undefined) data.bannerUrl = bannerUrl
  if (status !== undefined) data.status = status

  await prisma.branch.update({ where: { id }, data })
  invalidateGlobalCache()
  res.json({ success: true })
})

router.delete('/branches/:id', async (req, res) => {
  const { id } = req.params
  const orderCount = await prisma.order.count({ where: { branchId: id } })
  if (orderCount > 0) {
    return res.status(400).json({ message: `该分店有关联 ${orderCount} 个订单，无法删除` })
  }
  await prisma.device.deleteMany({ where: { branchId: id } })
  await prisma.category.deleteMany({ where: { branchId: id } })
  await prisma.branch.delete({ where: { id } }).catch(() => {})
  invalidateGlobalCache()
  res.json({ success: true })
})

/* ===== Devices ===== */

router.get('/devices', async (_req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const branches = await prisma.branch.findMany({
    where: { merchantId: merchant.id },
    select: { id: true, name: true },
  })
  const branchIds = branches.map((b) => b.id)
  const branchMap = new Map(branches.map((b) => [b.id, b.name]))

  // 统计有效期内活跃的唯一 UUID 数量
  const expiryThreshold = new Date(Date.now() - FINGERPRINT_EXPIRY_MS)
  const fingerprints = await prisma.deviceFingerprint.findMany({
    where: { updatedAt: { gte: expiryThreshold } },
    orderBy: { updatedAt: 'desc' },
    select: { deviceId: true, uuid: true, updatedAt: true },
  })
  const deviceAuthCount = new Map<string, number>()
  // 每个 UUID 只计入最新（updatedAt 最晚）的那个设备
  const uuidToDevice = new Map<string, string>()
  for (const fp of fingerprints) {
    if (!uuidToDevice.has(fp.uuid)) {
      uuidToDevice.set(fp.uuid, fp.deviceId)
    }
  }
  for (const deviceId of uuidToDevice.values()) {
    deviceAuthCount.set(deviceId, (deviceAuthCount.get(deviceId) ?? 0) + 1)
  }

  const devices = await prisma.device.findMany({
    where: { branchId: { in: branchIds } },
    orderBy: { createdAt: 'desc' },
  })

  res.json(
    devices.map((d) => ({
      id: d.id,
      code: d.code,
      sn: d.sn,
      name: d.name,
      contact: d.contact,
      mode: d.mode,
      role: d.role,
      status: d.status,
      branchId: d.branchId,
      branchName: branchMap.get(d.branchId) ?? '',
      authCount: deviceAuthCount.get(d.id) ?? 0,
    })),
  )
})

router.post('/devices', async (req, res) => {
  const { branchId, code, name, mode, contact } = req.body ?? {}
  if (!branchId) return res.status(400).json({ message: 'branchId 必填' })
  const sn = String(Math.floor(10000000 + Math.random() * 90000000))

  // 自动递增编号和名称
  const existing = await prisma.device.findMany({
    where: { branchId },
    select: { code: true },
    orderBy: { createdAt: 'desc' },
  })
  let devCode = code
  let devName = name
  if (!code) {
    const maxNum = existing.reduce((max, d) => {
      const n = parseInt(d.code, 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    devCode = String(maxNum + 1).padStart(2, '0')
  }
  if (!name) {
    const CHINESE_NUMS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']
    const idx = existing.length + 1
    devName = `${CHINESE_NUMS[idx] ?? idx}号点餐机`
  }

  const device = await prisma.device.create({
    data: {
      branchId,
      code: devCode,
      sn,
      name: devName,
      contact: contact ?? '',
      mode: mode ?? 'kiosk',
    },
  })

  res.status(201).json({ id: device.id })
  invalidateGlobalCache()
})

router.put('/devices/:id', async (req, res) => {
  const { id } = req.params
  const { code, name, mode, status, contact } = req.body ?? {}
  const data: any = {}
  if (code !== undefined) data.code = code
  if (name !== undefined) data.name = name
  if (mode !== undefined) data.mode = mode
  if (status !== undefined) data.status = status
  if (contact !== undefined) data.contact = contact

  await prisma.device.update({ where: { id }, data })
  invalidateGlobalCache()
  res.json({ success: true })
})

router.post('/devices/:id/regenerate-sn', async (req, res) => {
  const { id } = req.params
  const sn = String(Math.floor(10000000 + Math.random() * 90000000))
  await prisma.device.update({ where: { id }, data: { sn } })
  invalidateGlobalCache()
  res.json({ sn })
})

router.delete('/devices/:id', async (req, res) => {
  const { id } = req.params
  await prisma.device.delete({ where: { id } }).catch(() => {})
  invalidateGlobalCache()
  res.json({ success: true })
})

// 获取设备当前关联的 UUID 列表（有效期内且最后一次认证在此设备）
router.get('/devices/:id/auth-logs', async (req, res) => {
  const { id } = req.params
  const expiryThreshold = new Date(Date.now() - FINGERPRINT_EXPIRY_MS)
  const fps = await prisma.deviceFingerprint.findMany({
    where: { deviceId: id, updatedAt: { gte: expiryThreshold } },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })
  const uuids = fps.map((fp) => fp.uuid).filter(Boolean)
  if (!uuids.length) return res.json({ count: 0, list: [] })

  // 对每个 UUID 跨设备检查最新认证记录
  const allLogs = await prisma.deviceAuthLog.findMany({
    where: { uuid: { in: uuids } },
    orderBy: { createdAt: 'desc' },
    select: { uuid: true, deviceId: true, createdAt: true, ip: true, userAgent: true },
  })
  const latestByUUID = new Map<string, typeof allLogs[0]>()
  for (const l of allLogs) {
    if (!latestByUUID.has(l.uuid)) {
      latestByUUID.set(l.uuid, l)
    }
  }
  const results = Array.from(latestByUUID.values())
    .filter((l) => l.deviceId === id)
    .map((l) => ({
      uuid: l.uuid,
      ip: l.ip,
      userAgent: l.userAgent,
      deviceType: parseDeviceType(l.userAgent),
      lastAuthAt: l.createdAt.toISOString(),
    }))
  res.json({ count: results.length, list: results })
})

function parseDeviceType(ua: string): string {
  if (!ua) return '未知'
  // iOS
  const iphone = ua.match(/iPhone\s*\d+[\d,]*/)
  if (iphone) return `iPhone ${iphone[0].replace(/\s+/g, ' ')}`
  const ipad = ua.match(/iPad[\d,]*/)
  if (ipad) return 'iPad'
  // Android 机型
  const androidModel = ua.match(/; ([\w\s]+?(?:Pro|Ultra|Max|Plus|Mini|Lite|SE|Note))[\s;]|; (SM-\w+)|; ([\w]+-\w+)/)
  if (androidModel) return androidModel[1] || androidModel[2] || androidModel[3]
  // PC 浏览器
  if (ua.includes('Windows')) return 'Windows PC'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  return '其他设备'
}

// 下发设备指令
router.post('/devices/:id/commands', async (req, res) => {
  const { id } = req.params
  const { command, params } = req.body ?? {}
  if (!command) return res.status(400).json({ message: 'command 必填' })
  try {
    const cmd = await prisma.deviceCommand.create({
      data: { deviceId: id, command, params: JSON.stringify(params ?? {}) },
    })
    res.status(201).json({ id: cmd.id })
  } catch (err) {
    console.error('[admin] sendCommand error:', err)
    res.status(500).json({ message: '指令发送失败', error: String(err) })
  }
})

// 菜品销量统计
router.get('/stats/dish-sales', async (req, res) => {
  const { startDate, endDate } = req.query
  const where: any = {
    status: { not: 'cancelled' },
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate as string)
    if (endDate) where.createdAt.lt = new Date(endDate as string)
  }

  const orders = await prisma.order.findMany({
    where,
    select: {
      items: {
        select: {
          dishId: true,
          name: true,
          quantity: true,
          finalSubtotal: true,
        },
      },
    },
  })

  const salesMap = new Map<string, {
    dishId: string
    name: string
    totalQuantity: number
    totalRevenue: number
  }>()

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.dishId || item.name
      const current = salesMap.get(key) ?? {
        dishId: item.dishId,
        name: item.name,
        totalQuantity: 0,
        totalRevenue: 0,
      }
      current.totalQuantity += item.quantity
      current.totalRevenue += item.finalSubtotal
      salesMap.set(key, current)
    }
  }

  const result = Array.from(salesMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity)
  res.json(result)
})

export default router
