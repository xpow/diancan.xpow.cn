import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'

const router: ReturnType<typeof Router> = Router()
const prisma = new PrismaClient()

const ADMIN_PASSWORD_HASH = crypto.createHash('md5').update('xpow!1234').digest('hex')
console.log('[admin] password hash:', ADMIN_PASSWORD_HASH)

declare module 'express-session' {
  interface SessionData {
    adminAuthed?: boolean
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.adminAuthed) return next()
  res.status(401).json({ message: '请先登录' })
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
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
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
      })),
      createdAt: o.createdAt.toISOString(),
    })),
    total,
    page: Number(page),
    limit: take,
  })
})

router.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body ?? {}
  const validStatuses = ['pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: '无效状态' })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return res.status(404).json({ message: '订单不存在' })

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
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
      createdAt: d.createdAt.toISOString(),
    })),
  )
})

router.post('/dishes', async (req, res) => {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const { name, price, categoryId, desc, image, tags, specsPreset } = req.body ?? {}
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
    },
  })

  res.status(201).json({ id: dish.id, name: dish.name })
})

// 批量排序（必须在 /dishes/:id 之前）
router.put('/dishes/reorder', async (req, res) => {
  const { ids } = req.body ?? {}
  if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids 必填' })

  for (let i = 0; i < ids.length; i++) {
    await prisma.dish.update({ where: { id: ids[i] }, data: { sort: i } })
  }
  res.json({ success: true })
})

router.put('/dishes/:id', async (req, res) => {
  const { id } = req.params
  const { name, price, categoryId, desc, image, tags, specsPreset, status } = req.body ?? {}

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

  await prisma.dish.update({ where: { id }, data })
  res.json({ id, success: true })
})

router.delete('/dishes/:id', async (req, res) => {
  const { id } = req.params
  await prisma.dish.delete({ where: { id } }).catch(() => {})
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
})

router.put('/categories/:id', async (req, res) => {
  const { id } = req.params
  const { name, sort } = req.body ?? {}
  const data: any = {}
  if (name !== undefined) data.name = name
  if (sort !== undefined) data.sort = Number(sort)

  await prisma.category.update({ where: { id }, data })
  res.json({ success: true })
})

router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params
  const dishCount = await prisma.dish.count({ where: { categoryId: id } })
  if (dishCount > 0) {
    return res.status(400).json({ message: `该分类下有 ${dishCount} 个菜品，请先移除或调整` })
  }
  await prisma.category.delete({ where: { id } }).catch(() => {})
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
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) return res.status(404).json({ message: 'merchant not found' })

  const { name, type, rules, items, status, startDate, endDate } = req.body ?? {}
  if (!name || !type) return res.status(400).json({ message: 'name, type 必填' })

  const promo = await prisma.promotion.create({
    data: {
      merchantId: merchant.id,
      name,
      type,
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
})

router.put('/promotions/:id', async (req, res) => {
  const { id } = req.params
  const { name, type, rules, items, status, startDate, endDate } = req.body ?? {}

  const promo = await prisma.promotion.findUnique({ where: { id } })
  if (!promo) return res.status(404).json({ message: '活动不存在' })

  const data: any = {}
  if (name !== undefined) data.name = name
  if (type !== undefined) data.type = type
  if (rules !== undefined) data.rules = JSON.stringify(rules)
  if (status !== undefined) data.status = status
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
})

router.delete('/promotions/:id', async (req, res) => {
  const { id } = req.params
  await prisma.promotionItem.deleteMany({ where: { promotionId: id } })
  await prisma.orderPromotion.deleteMany({ where: { promotionId: id } })
  await prisma.promotion.delete({ where: { id } }).catch(() => {})
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
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      todayLocation: b.todayLocation,
      locationHint: b.locationHint,
      status: b.status,
    })),
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
      status: d.status,
      branchId: d.branchId,
      branchName: branchMap.get(d.branchId) ?? '',
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
  res.json({ success: true })
})

router.post('/devices/:id/regenerate-sn', async (req, res) => {
  const { id } = req.params
  const sn = String(Math.floor(10000000 + Math.random() * 90000000))
  await prisma.device.update({ where: { id }, data: { sn } })
  res.json({ sn })
})

router.delete('/devices/:id', async (req, res) => {
  const { id } = req.params
  await prisma.device.delete({ where: { id } }).catch(() => {})
  res.json({ success: true })
})

export default router
