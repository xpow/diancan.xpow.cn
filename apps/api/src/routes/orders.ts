import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { pinyin } from 'pinyin-pro'

const router = Router()
const prisma = new PrismaClient()

function customerInitial(name?: string): string {
  if (!name || !name.trim()) return 'X'
  const first = name.trim()[0]
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase()
  return pinyin(first, { pattern: 'first', toneType: 'none' })[0].toUpperCase() || first
}

// 生成取餐号: {姓氏首字母}-{商家编号}{分店编号}-{全店顺序号}
// 例: Z-DX-01, L-DX-02, Z-DX-03（序号每日全店统一递增，不按首字母分组）
async function genOrderNumber(merchantId: string, branchId: string, customerName?: string): Promise<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const count = await prisma.order.count({
    where: { branchId, createdAt: { gte: today } },
  })
  const [merchant, branch] = await Promise.all([
    prisma.merchant.findUnique({ where: { id: merchantId } }),
    prisma.branch.findUnique({ where: { id: branchId } }),
  ])
  const mCode = merchant?.code || 'M'
  const bCode = branch?.code || 'B'
  const init = customerInitial(customerName)
  const seq = (count % 100 + 1).toString().padStart(2, '0')
  return `${init}-${mCode}${bCode}-${seq}`
}

// Create order
router.post('/', async (req, res) => {
  const { merchantId, branchId, orderType, items, tableId, customerName, customerPhone, note, promotions } = req.body
  if (!merchantId || !branchId || !items?.length) {
    return res.status(400).json({ error: 'merchantId, branchId, items required' })
  }

  // 校验福利品限购（按“订单维度”）
  const promoItems = items.filter((i: any) => i.promotionId)
  if (promoItems.length) {
    const promoIds = Array.from(new Set(promoItems.map((i: any) => i.promotionId)))
    const promos = await prisma.promotion.findMany({
      where: { id: { in: promoIds } },
      include: { items: true },
    })
    const promoMap = new Map(promos.map((p) => [p.id, p]))

    for (const pid of promoIds) {
      const promo = promoMap.get(pid)
      if (!promo || promo.status !== 'active') {
        return res.status(400).json({ error: `promotion ${pid} not active` })
      }

      const promoOrderItems = promoItems.filter((i: any) => i.promotionId === pid)

      const globalRule = promo.items.find((ri: any) => ri.limitType === 'global_promo')
      if (globalRule?.maxQty) {
        const totalQty = promoOrderItems.reduce((s: number, i: any) => s + (i.quantity || 0), 0)
        if (totalQty > globalRule.maxQty) {
          return res.status(400).json({ error: `该福利活动限购 ${globalRule.maxQty} 份` })
        }
      }

      for (const oi of promoOrderItems) {
        const dishId = oi.dishId
        const rule = promo.items.find((ri: any) => ri.dishId === dishId)
        if (!rule?.maxQty) continue

        if (rule.limitType === 'per_order') {
          const dishQty = promoOrderItems
            .filter((x: any) => x.dishId === dishId)
            .reduce((s: number, x: any) => s + (x.quantity || 0), 0)
          if (dishQty > rule.maxQty) {
            return res.status(400).json({ error: `${oi.name} 限购 ${rule.maxQty} 份` })
          }
        }
      }
    }
  }

  const orderNumber = await genOrderNumber(merchantId, branchId, customerName)
  const rawTotal = items.reduce((s: number, i: any) => {
    const p = i.originalPrice || i.price
    return s + p * i.quantity
  }, 0)

  // 满减自动计算
  let totalDiscount = 0
  const orderPromotions: any[] = []
  const reductionPromos = await prisma.promotion.findMany({
    where: { merchantId, type: 'full_reduction', status: 'active' },
  })
  for (const rp of reductionPromos) {
    const rule = JSON.parse(rp.rules)
    if (rawTotal >= (rule.threshold || Infinity)) {
      totalDiscount = Math.max(totalDiscount, rule.discount || 0)
    }
  }
  if (totalDiscount > 0) {
    orderPromotions.push({ promotionId: reductionPromos[0].id, discount: totalDiscount })
  }

  // 福利品折扣=原价差额
  const orderPromotionCreate: any[] = [...orderPromotions]
  for (const pi of items.filter((i: any) => i.promotionId)) {
    const origPrice = pi.originalPrice || pi.price
    orderPromotionCreate.push({
      promotionId: pi.promotionId,
      discount: (origPrice * pi.quantity) - (pi.promoPrice * pi.quantity),
      metadata: JSON.stringify({ dishId: pi.dishId, qty: pi.quantity }),
    })
  }

  const welfareDiscount = items
    .filter((i: any) => i.promotionId)
    .reduce((s: number, i: any) => {
      const orig = i.originalPrice || i.price
      return s + (orig - i.promoPrice) * i.quantity
    }, 0)
  const totalPrice = Math.round((rawTotal - totalDiscount - welfareDiscount) * 100) / 100

  const order = await prisma.order.create({
    data: {
      merchantId,
      branchId,
      orderType: orderType || 'takeaway',
      orderNumber,
      totalPrice,
      tableId,
      customerName,
      customerPhone,
      note,
      items: {
        create: items.map((i: any) => ({
          dishId: i.dishId,
          name: i.name,
          price: i.promotionId ? i.promoPrice : i.price,
          quantity: i.quantity,
          specs: i.specs || null,
        })),
      },
      promotions: {
        create: orderPromotionCreate,
      },
    },
    include: { items: true, promotions: true },
  })

  res.json(order)
})

// List orders (for admin)
router.get('/', async (req, res) => {
  const { branchId, status, limit } = req.query
  const where: any = {}
  if (branchId) where.branchId = branchId as string
  if (status) where.status = status as string

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit ? parseInt(limit as string) : 50,
    include: { items: true, promotions: true },
  })
  // Parse promotion metadata
  return orders.map((o) => ({
    ...o,
    promotions: o.promotions.map((op) => ({
      ...op,
      metadata: op.metadata ? JSON.parse(op.metadata) : null,
    })),
  }))
})

// Get by id
router.get('/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  })
  if (!order) return res.status(404).json({ error: 'not found' })
  res.json(order)
})

// Update status (pending → preparing → ready → completed)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  const valid = ['pending', 'preparing', 'ready', 'completed', 'cancelled']
  if (!valid.includes(status)) return res.status(400).json({ error: `invalid status: ${status}` })

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
    include: { items: true },
  })
  res.json(order)
})

export default router
