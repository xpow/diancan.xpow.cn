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
  const { merchantId, branchId, orderType, items, tableId, customerName, customerPhone, note } = req.body
  if (!merchantId || !branchId || !items?.length) {
    return res.status(400).json({ error: 'merchantId, branchId, items required' })
  }

  const orderNumber = await genOrderNumber(merchantId, branchId, customerName)
  const totalPrice = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)

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
          price: i.price,
          quantity: i.quantity,
          specs: i.specs || null,
        })),
      },
    },
    include: { items: true },
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
    include: { items: true },
  })
  res.json(orders)
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
