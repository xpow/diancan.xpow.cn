import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 获取商家活动列表（含关联菜品）
router.get('/', async (req, res) => {
  const { merchantId, type, status } = req.query
  const where: any = {}
  if (merchantId) where.merchantId = merchantId as string
  if (type) where.type = type as string
  if (status) where.status = status as string

  const promotions = await prisma.promotion.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
  const result = promotions.map((p) => ({
    ...p,
    rules: JSON.parse(p.rules),
  }))
  res.json(result)
})

// 获取单个活动
router.get('/:id', async (req, res) => {
  const p = await prisma.promotion.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  })
  if (!p) return res.status(404).json({ error: 'not found' })
  res.json({ ...p, rules: JSON.parse(p.rules) })
})

// 新增活动
router.post('/', async (req, res) => {
  const { merchantId, name, type, rules, items, status } = req.body
  if (!merchantId || !name || !type) {
    return res.status(400).json({ error: 'merchantId, name, type required' })
  }
  const p = await prisma.promotion.create({
    data: {
      merchantId,
      name,
      type,
      rules: JSON.stringify(rules || {}),
      status: status || 'draft',
      items: items?.length ? {
        create: items.map((i: any) => ({
          dishId: i.dishId,
          promoPrice: i.promoPrice,
          limitType: i.limitType || 'per_order',
          maxQty: i.maxQty || 1,
        })),
      } : undefined,
    },
    include: { items: true },
  })
  res.json({ ...p, rules: JSON.parse(p.rules) })
})

// 更新活动
router.put('/:id', async (req, res) => {
  const { name, type, rules, items, status } = req.body
  // 先删子表再重建
  await prisma.promotionItem.deleteMany({ where: { promotionId: req.params.id } })
  const p = await prisma.promotion.update({
    where: { id: req.params.id },
    data: {
      name,
      type,
      rules: JSON.stringify(rules || {}),
      status,
      items: items?.length ? {
        create: items.map((i: any) => ({
          dishId: i.dishId,
          promoPrice: i.promoPrice,
          limitType: i.limitType || 'per_order',
          maxQty: i.maxQty || 1,
        })),
      } : undefined,
    },
    include: { items: true },
  })
  res.json({ ...p, rules: JSON.parse(p.rules) })
})

// 更新状态
router.patch('/:id', async (req, res) => {
  const { status } = req.body
  if (status && !['draft', 'active', 'paused', 'ended'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' })
  }
  const p = await prisma.promotion.update({
    where: { id: req.params.id },
    data: { status },
    include: { items: true },
  })
  res.json({ ...p, rules: JSON.parse(p.rules) })
})

// 删除活动
router.delete('/:id', async (req, res) => {
  await prisma.promotionItem.deleteMany({ where: { promotionId: req.params.id } })
  await prisma.orderPromotion.deleteMany({ where: { promotionId: req.params.id } })
  await prisma.promotion.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
