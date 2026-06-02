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
  // Parse rules JSON string
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

// 更新活动（状态等）
router.patch('/:id', async (req, res) => {
  const { status } = req.body
  if (status && !['active', 'disabled', 'expired'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' })
  }
  const p = await prisma.promotion.update({
    where: { id: req.params.id },
    data: { status },
    include: { items: true },
  })
  res.json({ ...p, rules: JSON.parse(p.rules) })
})

export default router
