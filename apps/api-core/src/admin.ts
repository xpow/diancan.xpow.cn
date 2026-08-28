import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'
import { invalidateGlobalCache } from './cache.js'
import { encryptDeviceSN } from './crypto.js'

const router: ReturnType<typeof Router> = Router()
const prisma = new PrismaClient()

// 设备指纹有效期（测试用 30s，上线改回 7 * 24 * 60 * 60 * 1000）
const FINGERPRINT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD || '34deb53eb707328254eac286931a7583'
console.log('[admin] password hash:', ADMIN_PASSWORD_HASH)

const KITCHEN_PASSWORD_HASH = process.env.KITCHEN_PASSWORD || '34deb53eb707328254eac286931a7583'
console.log('[kitchen] password hash:', KITCHEN_PASSWORD_HASH)

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
    kitchenAuthed?: boolean
  }
}

// 出餐端可访问的接口路径前缀
const KITCHEN_ALLOWED_PREFIXES = ['/orders', '/categories', '/merchant']

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.adminAuthed) return next()
  // 出餐端仅允许订单/分类相关接口
  if (req.session?.kitchenAuthed && KITCHEN_ALLOWED_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next()
  }
  res.status(401).json({ message: '请先登录' })
}

// 出餐接口鉴权：admin 或出餐端均允许
function requireKitchenAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.adminAuthed || req.session?.kitchenAuthed) return next()
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

/* ===== Kitchen Auth（出餐管理独立密码） ===== */

router.post('/kitchen/login', (req, res) => {
  const { password } = req.body ?? {}
  const hash = crypto.createHash('md5').update(String(password ?? '')).digest('hex')
  if (hash !== KITCHEN_PASSWORD_HASH) {
    return res.status(403).json({ message: '出餐密码错误' })
  }
  req.session.kitchenAuthed = true
  res.json({ success: true })
})

router.get('/kitchen/check', (req, res) => {
  res.json({ authed: !!req.session?.kitchenAuthed })
})

router.post('/kitchen/logout', (req, res) => {
  req.session.kitchenAuthed = false
  res.json({ success: true })
})

/* ===== Kitchen Terminal（出餐机管理） ===== */

// 由机码生成不可逆唯一token（用于出餐机唯一访问地址），机码变化则地址变化
function tokenFromCode(code: string): string {
  return crypto.createHash('sha256').update(String(code ?? '').trim()).digest('hex').slice(0, 16)
}

async function getMerchantId(): Promise<string> {
  const merchant = await prisma.merchant.findFirst()
  return merchant?.id ?? ''
}

// 出餐机列表
router.get('/kitchen-terminals', requireAuth, async (_req, res) => {
  const merchantId = await getMerchantId()
  const terminals = await prisma.kitchenTerminal.findMany({
    where: { merchantId },
    orderBy: { createdAt: 'asc' },
  })
  res.json(terminals.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    token: t.token,
    categoryIds: JSON.parse(t.categoryIds || '[]'),
    role: t.role,
    status: t.status,
    createdAt: t.createdAt,
  })))
})

// 新增出餐机
router.post('/kitchen-terminals', requireAuth, async (req, res) => {
  const merchantId = await getMerchantId()
  const { code, name, categoryIds = [], role = 'user' } = req.body ?? {}
  if (!code) return res.status(400).json({ message: '请填写出餐机码' })
  const trimmed = String(code).trim()
  const terminal = await prisma.kitchenTerminal.create({
    data: {
      merchantId,
      code: trimmed,
      name: String(name ?? '').trim(),
      token: tokenFromCode(trimmed),
      categoryIds: JSON.stringify(Array.isArray(categoryIds) ? categoryIds : []),
      role: role === 'admin' ? 'admin' : 'user',
      status: 'active',
    },
  })
  res.json({
    id: terminal.id,
    code: terminal.code,
    name: terminal.name,
    token: terminal.token,
    categoryIds: JSON.parse(terminal.categoryIds || '[]'),
    role: terminal.role,
    status: terminal.status,
  })
})

// 更新出餐机（机码变化时同步重新生成唯一地址token）
router.put('/kitchen-terminals/:id', requireAuth, async (req, res) => {
  const { code, name, categoryIds, role, status } = req.body ?? {}
  const data: Record<string, unknown> = {}
  if (code !== undefined) {
    const trimmed = String(code).trim()
    data.code = trimmed
    data.token = tokenFromCode(trimmed)
  }
  if (name !== undefined) data.name = String(name).trim()
  if (categoryIds !== undefined) data.categoryIds = JSON.stringify(Array.isArray(categoryIds) ? categoryIds : [])
  if (role !== undefined) data.role = role === 'admin' ? 'admin' : 'user'
  if (status !== undefined) data.status = status
  try {
    const terminal = await prisma.kitchenTerminal.update({ where: { id: String(req.params.id) }, data })
    res.json({
      id: terminal.id,
      code: terminal.code,
      name: terminal.name,
      token: terminal.token,
      categoryIds: JSON.parse(terminal.categoryIds || '[]'),
      role: terminal.role,
      status: terminal.status,
    })
  } catch {
    res.status(404).json({ message: '出餐机不存在' })
  }
})

// 删除出餐机
router.delete('/kitchen-terminals/:id', requireAuth, async (req, res) => {
  try {
    await prisma.kitchenTerminal.delete({ where: { id: String(req.params.id) } })
    res.json({ success: true })
  } catch {
    res.status(404).json({ message: '出餐机不存在' })
  }
})

// 出餐端按唯一地址token识别出餐机（requireKitchenAuth，需先出餐密码登录）
router.get('/kitchen-terminal/by-token', requireKitchenAuth, async (req, res) => {
  const token = (req.query.token as string) || ''
  if (!token) return res.status(400).json({ message: '缺少地址' })
  const terminal = await prisma.kitchenTerminal.findUnique({ where: { token } })
  if (!terminal || terminal.status !== 'active') {
    return res.status(404).json({ message: '出餐机地址无效或已停用' })
  }
  res.json({
    id: terminal.id,
    code: terminal.code,
    name: terminal.name,
    role: terminal.role,
    categoryIds: JSON.parse(terminal.categoryIds || '[]'),
  })
})

/* ===== Merchant（不需要登录） ===== */

router.get('/merchant', async (_req, res) => {
  let merchant = await prisma.merchant.findFirst()
  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        name: '典韦烤串',
        slogan: '地道炭火 · 鲜嫩多汁 · 现烤现卖',
        businessHours: '17:00 - 02:00',
        statusText: '营业中',
        features: JSON.stringify({ quote: true, payment: false, pickup: false }),
      },
    })
  }

  const branches = await prisma.branch.findMany({ where: { merchantId: merchant.id } })

  res.json({
    id: merchant.id,
    name: merchant.name,
    slogan: merchant.slogan,
    businessHours: merchant.businessHours,
    statusText: merchant.statusText,
    restReason: merchant.restReason,
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
      businessHours: b.businessHours,
      restReason: b.restReason,
      deviceCount: await prisma.device.count({ where: { branchId: b.id } }),
      orderCount: await prisma.order.count({ where: { branchId: b.id } }),
    }))),
  })
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
  const { status, scope, branchId, page = '1', limit = '50' } = _req.query as Record<string, string>
  const where: any = {}
  if (scope === 'active') where.status = { in: ['unpaid', 'paid', 'preparing', 'ready'] }
  else if (status) where.status = status.includes(',') ? { in: status.split(',') } : status
  if (branchId) where.branchId = branchId

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
  const take = Math.min(200, Math.max(1, Number(limit)))

  const merchant = await prisma.merchant.findFirst()
  const dishes = merchant
    ? await prisma.dish.findMany({
        where: { merchantId: merchant.id },
        select: { id: true, categoryId: true, category: { select: { name: true } } },
      })
    : []
  const dishMap = new Map(dishes.map((d) => [d.id, d]))

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
      paymentMethod: o.paymentMethod || undefined,
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
        categoryId: dishMap.get(i.dishId)?.categoryId,
        categoryName: dishMap.get(i.dishId)?.category.name,
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
      paidAt: o.paidAt?.toISOString() || undefined,
      dishOutAt: o.dishOutAt?.toISOString() || undefined,
    })),
    total,
    page: Number(page),
    limit: take,
  })
})

router.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params
  const { status, cancelReason, paymentMethod } = req.body ?? {}
  const validStatuses = ['pending', 'unpaid', 'paid', 'preparing', 'ready', 'completed', 'cancelled']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: '无效状态' })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return res.status(404).json({ message: '订单不存在' })

  const data: any = { status }
  if (status === 'cancelled') {
    data.cancelledAt = new Date()
    if (cancelReason) data.cancelReason = cancelReason

    // 回补库存（仅启用库存的菜品，仅首次取消时回补）
    if (order.status !== 'cancelled') {
      const items = await prisma.orderItem.findMany({ where: { orderId: id } })
      if (items.length) {
        const dishIds = [...new Set(items.map((i) => i.dishId))]
        const stockDishes = await prisma.dish.findMany({ where: { id: { in: dishIds }, stockEnabled: true }, select: { id: true } })
        if (stockDishes.length) {
          const stockSet = new Set(stockDishes.map((d) => d.id))
          const demand = new Map<string, number>()
          for (const i of items) {
            if (!stockSet.has(i.dishId)) continue
            demand.set(i.dishId, (demand.get(i.dishId) ?? 0) + i.quantity)
          }
          await Promise.all(
            [...demand.entries()].map(([dishId, qty]) =>
              prisma.dish.update({ where: { id: dishId }, data: { stock: { increment: qty } } }),
            ),
          )
          // 回补库存后失效菜单缓存，保证菜单页实时库存
          invalidateGlobalCache()
        }
      }
    }
  }
  if (status === 'paid' && typeof paymentMethod === 'string' && paymentMethod) {
    data.paymentMethod = paymentMethod
  }
  if (status === 'paid') {
    data.paidAt = new Date()
  }

  const updated = await prisma.order.update({
    where: { id },
    data,
    include: { items: true },
  })

  res.json({ id: updated.id, status: updated.status, paymentMethod: updated.paymentMethod })
})

/* ===== 加单分组 ===== */
router.post('/orders/:orderNo/group', async (req, res) => {
  const { orderNo } = req.params
  const { targetOrderNo } = req.body ?? {}
  if (!targetOrderNo || typeof targetOrderNo !== 'string') {
    return res.status(400).json({ message: 'targetOrderNo is required' })
  }

  const source = await prisma.order.findUnique({ where: { orderNo } })
  if (!source) return res.status(404).json({ message: '源订单不存在' })

  const target = await prisma.order.findUnique({ where: { orderNo: targetOrderNo } })
  if (!target) return res.status(404).json({ message: '目标订单不存在' })

  if (source.id === target.id) {
    return res.status(400).json({ message: '不能分组到自身' })
  }

  const activeStatuses = ['unpaid', 'paid', 'preparing', 'ready']
  if (!activeStatuses.includes(source.status)) {
    return res.status(400).json({ message: `源订单状态「${source.status}」不可加单` })
  }
  if (!activeStatuses.includes(target.status)) {
    return res.status(400).json({ message: `目标订单状态「${target.status}」不可加单` })
  }

  const groupId = target.groupId || `grp_${target.orderNo}`

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: target.id }, data: { groupId } })
    await tx.order.update({ where: { id: source.id }, data: { groupId } })
    if (source.groupId && source.groupId !== groupId) {
      await tx.order.updateMany({ where: { groupId: source.groupId }, data: { groupId } })
    }
  })

  res.json({ success: true, groupId, message: `已将 ${orderNo} 加入 ${targetOrderNo} 的分组` })
})

/* ===== 取消分组 ===== */
router.post('/orders/:orderNo/ungroup', async (req, res) => {
  const { orderNo } = req.params
  const order = await prisma.order.findUnique({ where: { orderNo }, select: { id: true, groupId: true } })
  if (!order) return res.status(404).json({ message: '订单不存在' })
  if (!order.groupId) return res.status(400).json({ message: '该订单未分组' })

  await prisma.order.updateMany({ where: { groupId: order.groupId }, data: { groupId: null } })
  res.json({ success: true, message: '已取消分组' })
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
      specGroups: d.specGroups ? JSON.parse(d.specGroups) : [],
      categoryId: d.categoryId,
      categoryName: d.category.name,
      status: d.status,
      sort: d.sort,
      portionSize: d.portionSize,
      stock: d.stock,
      stockEnabled: d.stockEnabled,
      alliance: d.alliance,
      createdAt: d.createdAt.toISOString(),
    })),
  )
})

router.post('/dishes', async (req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const { name, price, categoryId, desc, image, tags, specsPreset, specGroups, portionSize, stock, stockEnabled, alliance } = req.body ?? {}
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
      specGroups: JSON.stringify(specGroups ?? []),
      portionSize: Number(portionSize) || 0,
      stock: Number(stock) || 0,
      stockEnabled: Boolean(stockEnabled),
      alliance: Boolean(alliance),
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
  const { name, price, categoryId, desc, image, tags, specsPreset, specGroups, status, sort, portionSize, stock, stockEnabled, alliance } = req.body ?? {}

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
  if (specGroups !== undefined) data.specGroups = JSON.stringify(specGroups)
  if (status !== undefined) data.status = status
  if (portionSize !== undefined) data.portionSize = Number(portionSize)
  if (stock !== undefined) data.stock = Number(stock)
  if (stockEnabled !== undefined) data.stockEnabled = Boolean(stockEnabled)
  if (alliance !== undefined) data.alliance = Boolean(alliance)
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

/* ===== Menu Image ===== */

router.get('/generate-menu-image', async (_req, res) => {
  try {
    const merchant = await prisma.merchant.findFirst()
    if (!merchant) return res.status(404).json({ message: 'merchant not found' })

    const branch = await prisma.branch.findFirst({ where: { merchantId: merchant.id } })
    if (!branch) return res.status(404).json({ message: 'branch not found' })

    const dishes = await prisma.dish.findMany({
      where: { merchantId: merchant.id, status: 'active' },
      include: { category: { select: { name: true } } },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    })

    const now = new Date()
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    const dayLabel = `星期${weekDays[now.getDay()]}`

    const { generateMenuImage } = await import('./menu-image.js')
    const buf = await generateMenuImage({
      merchantName: merchant.name,
      date: `${dateStr} ${dayLabel}`,
      todayLocation: branch.todayLocation ?? '',
      businessHours: branch.businessHours ?? '',
      dishes: dishes.map((d) => ({
        categoryName: d.category.name,
        name: d.name,
        price: d.price,
        tags: typeof d.tags === 'string' ? JSON.parse(d.tags) : d.tags,
        portionSize: d.portionSize,
      })),
    })

    res.set('Content-Type', 'image/png')
    res.set('Content-Disposition', `attachment; filename="menu-${now.toISOString().slice(0, 10)}.png"`)
    res.send(buf)
  } catch (err: any) {
    console.error('[generate-menu-image]', err)
    res.status(500).json({ message: err.message || '生成失败' })
  }
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

router.put('/merchant', async (req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const { name, slogan, statusText, logoUrl, features } = req.body ?? {}
  const data: any = {}
  if (name !== undefined) data.name = name
  if (slogan !== undefined) data.slogan = slogan
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
      businessHours: b.businessHours,
      restReason: b.restReason,
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
  const { code, name, address, lat, lng, todayLocation, locationHint, bannerUrl, status, businessHours, restReason } = req.body ?? {}

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
  if (businessHours !== undefined) data.businessHours = businessHours
  if (restReason !== undefined) data.restReason = restReason

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
      shared: d.shared,
      branchId: d.branchId,
      branchName: branchMap.get(d.branchId) ?? '',
      authCount: deviceAuthCount.get(d.id) ?? 0,
    })),
  )
})

router.post('/devices', async (req, res) => {
  const { branchId, code, name, mode, role, contact } = req.body ?? {}
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
      role: role ?? 'user',
    },
  })

  res.status(201).json({ id: device.id })
  invalidateGlobalCache()
})

router.put('/devices/:id', async (req, res) => {
  const { id } = req.params
  const { code, name, mode, role, status, contact } = req.body ?? {}
  const data: any = {}
  if (code !== undefined) data.code = code
  if (name !== undefined) data.name = name
  if (mode !== undefined) data.mode = mode
  if (role !== undefined) data.role = role
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

router.get('/devices/:id/qr-url', async (req, res) => {
  const device = await prisma.device.findUnique({ where: { id: req.params.id } })
  if (!device || !device.sn) return res.status(404).json({ message: '设备不存在或无设备码' })
  const token = encryptDeviceSN(device.sn)
  res.json({ token })
})

router.post('/devices/:id/toggle-share', async (req, res) => {
  const { id } = req.params
  const device = await prisma.device.findUnique({ where: { id } })
  if (!device) return res.status(404).json({ message: '设备不存在' })
  if (device.shared) {
    await prisma.device.update({ where: { id }, data: { shared: false } })
    invalidateGlobalCache()
    return res.json({ shared: false })
  }
  // 取消其他设备的分享，启用当前设备
  await prisma.device.updateMany({ where: { shared: true }, data: { shared: false } })
  await prisma.device.update({ where: { id }, data: { shared: true } })
  invalidateGlobalCache()
  res.json({ shared: true })
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
  // 操作系统
  let os = ''
  if (ua.includes('iPhone')) {
    const m = ua.match(/iPhone OS (\S+)/)
    os = m ? `iOS ${m[1].replace(/_/g, '.')}` : 'iPhone'
  } else if (ua.includes('iPad')) {
    const m = ua.match(/iPad[\d,]*|iPad.*OS (\S+)/)
    os = m?.[1] ? `iPadOS ${m[1].replace(/_/g, '.')}` : 'iPad'
  } else if (ua.includes('Android')) {
    const m = ua.match(/Android ([\d.]+)/)
    os = m ? `Android ${m[1]}` : 'Android'
  } else if (ua.includes('Windows NT 10')) {
    os = 'Windows 10/11'
  } else if (ua.includes('Windows NT 6.3')) {
    os = 'Windows 8.1'
  } else if (ua.includes('Windows NT 6.1')) {
    os = 'Windows 7'
  } else if (ua.includes('Windows')) {
    os = 'Windows'
  } else if (ua.includes('Mac OS X')) {
    const m = ua.match(/Mac OS X ([\d_]+)/)
    os = m ? `macOS ${m[1].replace(/_/g, '.')}` : 'macOS'
  } else if (ua.includes('Linux')) {
    os = 'Linux'
  }
  // 浏览器
  let browser = ''
  if (ua.includes('Edg/') || ua.includes('Edge/')) {
    const m = ua.match(/Edg[e]?\/([\d.]+)/)
    browser = m ? `Edge ${m[1]}` : 'Edge'
  } else if (ua.includes('MicroMessenger')) {
    const m = ua.match(/MicroMessenger\/([\d.]+)/)
    browser = m ? `微信 ${m[1]}` : '微信'
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/') && !ua.includes('OPR/')) {
    const m = ua.match(/Chrome\/([\d.]+)/)
    browser = m ? `Chrome ${m[1]}` : 'Chrome'
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const m = ua.match(/Version\/([\d.]+)/)
    browser = m ? `Safari ${m[1]}` : 'Safari'
  } else if (ua.includes('Firefox/')) {
    const m = ua.match(/Firefox\/([\d.]+)/)
    browser = m ? `Firefox ${m[1]}` : 'Firefox'
  }
  // 网络类型（WeChat UA: NetType/WIFI）
  let netType = ''
  const nm = ua.match(/NetType\/(\S+)/)
  if (nm) netType = nm[1] === 'WIFI' ? 'WiFi' : nm[1]

  const parts = [os, browser, netType].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : '其他设备'
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

// 菜品销量统计（内部函数，支持过滤联盟商品）
async function getDishSales(req: any, filterAlliance: boolean | null) {
  const { startDate, endDate } = req.query
  const where: any = {
    status: { not: 'cancelled' },
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate as string)
    if (endDate) where.createdAt.lte = new Date(endDate as string)
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
          alliance: true,
        },
      },
      promotions: {
        select: {
          type: true,
          discount: true,
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

  let totalFullReduction = 0
  for (const order of orders) {
    const fullReduction = order.promotions
      .filter((p: any) => p.type === 'full_reduction')
      .reduce((s: number, p: any) => s + p.discount, 0)
    totalFullReduction += fullReduction
    for (const item of order.items) {
      if (filterAlliance === true && !item.alliance) continue
      if (filterAlliance === false && item.alliance) continue
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
  return {
    items: result,
    summary: { totalFullReduction: Number(totalFullReduction.toFixed(2)) },
  }
}

// 菜品销量统计（排除联盟商品）
router.get('/stats/dish-sales', async (req, res) => {
  const result = await getDishSales(req, false)
  res.json(result)
})

// 联盟商品销量统计
router.get('/stats/alliance-dish-sales', async (req, res) => {
  const result = await getDishSales(req, true)
  res.json(result)
})

// 总览统计（全局聚合，不依赖前端分页拉取）
router.get('/stats/overview', async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { status: { not: 'cancelled' } },
    select: { status: true, paidAt: true, payableAmount: true, createdAt: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const VALID = ['pending', 'paid', 'preparing', 'ready', 'completed']
  const ESTIMATE = ['pending', 'paid', 'preparing', 'ready']

  const valid = orders.filter((o) => VALID.includes(o.status))
  const completed = valid.filter((o) => o.status === 'completed')
  const estimated = valid.filter((o) => ESTIMATE.includes(o.status))
  const todayValid = valid.filter((o) => o.createdAt >= today)
  const todayCompleted = todayValid.filter((o) => o.status === 'completed')
  const todayEstimated = todayValid.filter((o) => ESTIMATE.includes(o.status))

  const sum = (list: typeof orders) => Number(list.reduce((s, o) => s + (o.payableAmount || 0), 0).toFixed(2))

  res.json({
    totalOrders: valid.length,
    completedRevenue: sum(completed),
    estimatedRevenue: sum(estimated),
    todayOrders: todayValid.length,
    todayCompletedRevenue: sum(todayCompleted),
    todayEstimatedRevenue: sum(todayEstimated),
    pendingOrders: valid.filter((o) => o.status === 'pending' || o.status === 'paid').length,
    readyOrders: valid.filter((o) => o.status === 'ready').length,
    unpaidOrders: orders.filter((o) => !o.paidAt).length,
  })
})

/* ===== Review Management ===== */

// 获取评价设置
router.get('/reviews/settings', async (req, res) => {
  const merchantId = req.query.merchantId as string
  if (!merchantId) return res.status(400).json({ message: 'merchantId required' })
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })
  const settings = JSON.parse(merchant.reviewSettings || '{}')
  // 获取赠品池
  const giftDishes = await prisma.reviewGiftDish.findMany({ where: { merchantId } })
  const dishIds = giftDishes.map((g) => g.dishId)
  const dishes = dishIds.length > 0 ? await prisma.dish.findMany({ where: { id: { in: dishIds } }, select: { id: true, name: true, price: true } }) : []
  const dishMap = new Map(dishes.map((d) => [d.id, d]))
  res.json({
    enabled: settings.enabled ?? false,
    giftDishes: giftDishes.map((g) => ({ dishId: g.dishId, name: dishMap.get(g.dishId)?.name || '', price: dishMap.get(g.dishId)?.price || 0, quantity: g.quantity })),
  })
})

// 保存评价设置
router.post('/reviews/settings', async (req, res) => {
  const { merchantId, enabled } = req.body ?? {}
  if (!merchantId) return res.status(400).json({ message: 'merchantId required' })
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })
  const settings = JSON.parse(merchant.reviewSettings || '{}')
  settings.enabled = !!enabled
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { reviewSettings: JSON.stringify(settings) },
  })
  res.json({ success: true })
})

// 批量添加菜品到赠品池
router.post('/reviews/gift-dishes', async (req, res) => {
  const { merchantId, items } = req.body ?? {}
  if (!merchantId || !items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: '参数不完整' })
  for (const it of items) {
    const { dishId, quantity = 1 } = it
    if (!dishId) continue
    await prisma.reviewGiftDish.upsert({
      where: { merchantId_dishId: { merchantId, dishId } },
      update: { quantity },
      create: { merchantId, dishId, quantity },
    })
  }
  res.json({ success: true })
})

// 更新赠品池菜品数量
router.put('/reviews/gift-dishes/:dishId', async (req, res) => {
  const { dishId } = req.params
  const { merchantId, quantity } = req.body ?? {}
  if (!merchantId || quantity == null) return res.status(400).json({ message: '参数不完整' })
  await prisma.reviewGiftDish.upsert({
    where: { merchantId_dishId: { merchantId, dishId } },
    update: { quantity },
    create: { merchantId, dishId, quantity },
  })
  res.json({ success: true })
})

// 从赠品池移除
router.delete('/reviews/gift-dishes/:dishId', async (req, res) => {
  const { dishId } = req.params
  const merchantId = req.query.merchantId as string
  if (!merchantId) return res.status(400).json({ message: 'merchantId required' })
  await prisma.reviewGiftDish.deleteMany({ where: { merchantId, dishId } })
  res.json({ success: true })
})

// 评价列表
router.get('/reviews', async (req, res) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (Math.max(1, Number(page)) - 1) * Number(limit)
  const take = Math.min(100, Math.max(1, Number(limit)))
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { items: true, code: true },
    }),
    prisma.review.count(),
  ])
  res.json({
    items: items.map((r) => ({
      id: r.id,
      deviceId: r.deviceId,
      comment: r.comment || undefined,
      rewardDishId: r.rewardDishId || undefined,
      code: r.code ? { code: r.code.code, dishName: r.code.dishName, status: r.code.status } : null,
      itemCount: r.items.length,
      items: r.items.map((i) => ({
        dishName: i.dishName,
        overall: i.overall,
        spiciness: i.spiciness,
        texture: i.texture,
        portion: i.portion,
        price: i.price,
        comment: i.comment,
      })),
      overallStats: {
        good: r.items.filter((i) => i.overall === 'good').length,
        okay: r.items.filter((i) => i.overall === 'okay').length,
        bad: r.items.filter((i) => i.overall === 'bad').length,
      },
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page: Number(page),
    limit: take,
  })
})

// 核销兑换码
router.post('/reviews/redeem', async (req, res) => {
  const { code } = req.body ?? {}
  if (!code) return res.status(400).json({ message: 'code required' })
  const reviewCode = await prisma.reviewCode.findUnique({ where: { code: (code as string).toUpperCase() } })
  if (!reviewCode) return res.status(404).json({ message: '兑换码无效' })
  if (reviewCode.status === 'redeemed') return res.status(409).json({ message: '已核销' })
  await prisma.reviewCode.update({
    where: { id: reviewCode.id },
    data: { status: 'redeemed', redeemedAt: new Date() },
  })
  res.json({ success: true, dishName: reviewCode.dishName })
})

/* ===== 成本利润核算 ===== */

// 获取某天所有菜品的成本录入
router.get('/cost-entries', requireAuth, async (req, res) => {
  const { date, merchantId } = req.query
  if (!date || !merchantId) return res.status(400).json({ message: 'date and merchantId required' })

  const dayStart = new Date(date as string)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  // 以实际销售为原则：包含有销量/成本记录的已下架菜品
  const [soldDishes, costDishIds] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: dayStart, lt: dayEnd }, status: { not: 'cancelled' } } },
      select: { dishId: true },
      distinct: ['dishId'],
    }),
    prisma.dishCostEntry.findMany({
      where: { date: { gte: dayStart, lt: dayEnd } },
      select: { dishId: true },
      distinct: ['dishId'],
    }),
  ])
  const activeDishIds = await prisma.dish.findMany({
    where: { merchantId: merchantId as string, status: 'active' },
    select: { id: true },
  })
  const allDishIds = Array.from(new Set([
    ...activeDishIds.map((d) => d.id),
    ...soldDishes.map((d) => d.dishId),
    ...costDishIds.map((d) => d.dishId),
  ]))

  const dishes = await prisma.dish.findMany({
    where: { merchantId: merchantId as string, id: { in: allDishIds } },
    orderBy: { sort: 'asc' },
  })

  const entries = await prisma.dishCostEntry.findMany({
    where: {
      date: { gte: dayStart, lt: dayEnd },
      dishId: { in: dishes.map((d) => d.id) },
    },
  })

  // 查当天实际销售数据
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: dayStart, lt: dayEnd }, status: { not: 'cancelled' } },
    select: { items: { select: { dishId: true, quantity: true, finalSubtotal: true, alliance: true } } },
  })
  const salesMap = new Map<string, { qty: number; rev: number }>()
  for (const order of orders) {
    for (const item of order.items) {
      if (item.alliance) continue
      const cur = salesMap.get(item.dishId) ?? { qty: 0, rev: 0 }
      cur.qty += item.quantity
      cur.rev += item.finalSubtotal
      salesMap.set(item.dishId, cur)
    }
  }

  const entryMap = new Map(entries.map((e) => [e.dishId, e]))

  const result = dishes.map((d) => {
    const entry = entryMap.get(d.id)
    const sales = salesMap.get(d.id)
    const actualAvgPrice = sales && sales.qty > 0 ? Math.round((sales.rev / sales.qty) * 100) / 100 : 0
    return {
      dishId: d.id,
      name: d.name,
      price: d.price,
      actualAvgPrice,
      totalQuantity: sales?.qty ?? 0,
      totalRevenue: sales ? Math.round(sales.rev * 100) / 100 : 0,
      weight: entry?.weight ?? null,
      skewerCount: entry?.skewerCount ?? null,
      unitCost: entry?.unitCost ?? null,
      totalCost: entry?.totalCost ?? null,
      costPerSkewer: entry?.skewerCount && entry?.totalCost ? Math.round((entry.totalCost / entry.skewerCount) * 100) / 100 : 0,
      wasteExpired: entry?.wasteExpired ?? 0,
      wasteStaff: entry?.wasteStaff ?? 0,
      wasteGiveaway: entry?.wasteGiveaway ?? 0,
      notes: entry?.notes ?? '',
    }
  })

  res.json(result)
})

// 批量保存成本录入
router.post('/cost-entries', requireAuth, async (req, res) => {
  const { date, entries } = req.body
  if (!date || !Array.isArray(entries)) return res.status(400).json({ message: 'date and entries required' })

  const dayStart = new Date(date as string)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  await prisma.$transaction(
    entries
      .filter((e: any) => e.weight != null && e.unitCost != null)
      .map((e: any) => {
        const totalCost = Math.round((e.weight * e.unitCost / 1000) * 100) / 100
        const skewerCount = e.skewerCount ?? 0
        return prisma.dishCostEntry.upsert({
          where: { dishId_date: { dishId: e.dishId, date: dayStart } },
          update: {
            weight: e.weight, skewerCount, unitCost: e.unitCost, totalCost,
            wasteExpired: e.wasteExpired ?? 0,
            wasteStaff: e.wasteStaff ?? 0,
            wasteGiveaway: e.wasteGiveaway ?? 0,
            notes: e.notes ?? '',
          },
          create: {
            dishId: e.dishId, date: dayStart, weight: e.weight, skewerCount, unitCost: e.unitCost, totalCost,
            wasteExpired: e.wasteExpired ?? 0,
            wasteStaff: e.wasteStaff ?? 0,
            wasteGiveaway: e.wasteGiveaway ?? 0,
            notes: e.notes ?? '',
          },
        })
      }),
  )

  res.json({ success: true })
})

// 毛利报表
router.get('/cost-profit-report', requireAuth, async (req, res) => {
  const { from, to, merchantId } = req.query
  if (!from || !to || !merchantId) return res.status(400).json({ message: 'from, to and merchantId required' })

  const fromDate = new Date(from as string)
  const toDate = new Date(to as string)
  toDate.setDate(toDate.getDate() + 1) // 包含结束日

  // 以实际销售为原则：包含有销量/成本记录的已下架菜品
  const [soldDishes, costDishIds] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: fromDate, lt: toDate }, status: { not: 'cancelled' } } },
      select: { dishId: true },
      distinct: ['dishId'],
    }),
    prisma.dishCostEntry.findMany({
      where: { date: { gte: fromDate, lt: toDate } },
      select: { dishId: true },
      distinct: ['dishId'],
    }),
  ])
  const activeDishIds = await prisma.dish.findMany({
    where: { merchantId: merchantId as string, status: 'active' },
    select: { id: true },
  })
  const allDishIds = Array.from(new Set([
    ...activeDishIds.map((d) => d.id),
    ...soldDishes.map((d) => d.dishId),
    ...costDishIds.map((d) => d.dishId),
  ]))

  const dishes = await prisma.dish.findMany({
    where: { merchantId: merchantId as string, id: { in: allDishIds } },
    orderBy: { sort: 'asc' },
  })

  // 成本汇总
  const costEntries = await prisma.dishCostEntry.findMany({
    where: { date: { gte: fromDate, lt: toDate }, dishId: { in: dishes.map((d) => d.id) } },
  })

  const costMap = new Map<string, { totalCost: number; entries: typeof costEntries }>()
  for (const entry of costEntries) {
    const current = costMap.get(entry.dishId) ?? { totalCost: 0, entries: [] }
    current.totalCost += entry.totalCost
    current.entries.push(entry)
    costMap.set(entry.dishId, current)
  }

  // 销量汇总
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: fromDate, lt: toDate }, status: { not: 'cancelled' } },
    select: {
      items: { select: { dishId: true, quantity: true, finalSubtotal: true, alliance: true } },
      promotions: { select: { type: true, discount: true } },
    },
  })

  const salesMap = new Map<string, { totalQuantity: number; totalRevenue: number }>()
  let totalFullReduction = 0
  for (const order of orders) {
    const fr = order.promotions.filter((p) => p.type === 'full_reduction').reduce((s, p) => s + p.discount, 0)
    totalFullReduction += fr
    for (const item of order.items) {
      if (item.alliance) continue
      const current = salesMap.get(item.dishId) ?? { totalQuantity: 0, totalRevenue: 0 }
      current.totalQuantity += item.quantity
      current.totalRevenue += item.finalSubtotal
      salesMap.set(item.dishId, current)
    }
  }

  const dishResults = dishes.map((d) => {
    const sales = salesMap.get(d.id) ?? { totalQuantity: 0, totalRevenue: 0 }
    const cost = costMap.get(d.id)
    const rawTotalCost = cost?.totalCost ?? 0
    const totalWeight = cost?.entries.reduce((s, e) => s + e.weight, 0) ?? 0
    const totalSkewers = cost?.entries.reduce((s, e) => s + e.skewerCount, 0) ?? 0
    const wasteExpired = cost?.entries.reduce((s, e) => s + e.wasteExpired, 0) ?? 0
    const wasteStaff = cost?.entries.reduce((s, e) => s + e.wasteStaff, 0) ?? 0
    const wasteGiveaway = cost?.entries.reduce((s, e) => s + e.wasteGiveaway, 0) ?? 0
    const totalWaste = wasteExpired + wasteStaff + wasteGiveaway
    const avgUnitCost = totalWeight > 0 ? Math.round((rawTotalCost / totalWeight * 1000) * 100) / 100 : 0
    const costPerSkewer = totalSkewers > 0 ? Math.round((rawTotalCost / totalSkewers) * 100) / 100 : 0
    // 总消耗 = 销量 + 过期 + 自吃 + 赠品，成本按总消耗分摊
    const totalConsumption = sales.totalQuantity + totalWaste
    const totalCost = costPerSkewer * totalConsumption
    const grossProfit = sales.totalRevenue - totalCost
    const grossMargin = sales.totalRevenue > 0 ? Math.round((grossProfit / sales.totalRevenue) * 100 * 10) / 10 : 0
    const actualAvgPrice = sales.totalQuantity > 0 ? Math.round((sales.totalRevenue / sales.totalQuantity) * 100) / 100 : 0
    return {
      dishId: d.id,
      name: d.name,
      price: d.price,
      actualAvgPrice,
      totalQuantity: sales.totalQuantity,
      totalConsumption,
      totalRevenue: Math.round(sales.totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      avgUnitCost,
      costPerSkewer,
      wasteExpired,
      wasteStaff,
      wasteGiveaway,
      totalWaste,
      wasteRate: totalConsumption > 0 ? Math.round((totalWaste / totalConsumption) * 100 * 10) / 10 : 0,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin,
    }
  })

  const totalRevenue = Math.round(dishResults.reduce((s, d) => s + d.totalRevenue, 0) * 100) / 100
  const totalCost = Math.round(dishResults.reduce((s, d) => s + d.totalCost, 0) * 100) / 100
  const netRevenue = Math.round((totalRevenue - totalFullReduction) * 100) / 100
  const grossProfit = Math.round((netRevenue - totalCost) * 100) / 100
  const grossMargin = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100 * 10) / 10 : 0
  const totalWaste = dishResults.reduce((s, d) => s + d.totalWaste, 0)
  const totalConsumption = dishResults.reduce((s, d) => s + d.totalConsumption, 0)
  const wasteRate = totalConsumption > 0 ? Math.round((totalWaste / totalConsumption) * 100 * 10) / 10 : 0
  const summary = { totalRevenue, totalCost, grossProfit, grossMargin, totalWaste, wasteRate, totalFullReduction: Math.round(totalFullReduction * 100) / 100 }

  res.json({ dishes: dishResults, summary, dateRange: { from: from as string, to: to as string } })
})

export default router
