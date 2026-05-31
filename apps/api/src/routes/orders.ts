import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 生成取餐号：字母(A-Z) + 2位数字，按分支每日递增
async function genOrderNumber(branchId: string): Promise<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const count = await prisma.order.count({
    where: { branchId, createdAt: { gte: today } },
  })
  const prefix = String.fromCharCode(65 + Math.floor(count / 100)) // A=0-99, B=100-199...
  const seq = (count % 100 + 1).toString().padStart(2, '0')
  return `${prefix}${seq}`
}

// Create order
router.post('/', async (req, res) => {
  const { merchantId, branchId, orderType, items, tableId, customerName, customerPhone, note } = req.body
  if (!merchantId || !branchId || !items?.length) {
    return res.status(400).json({ error: 'merchantId, branchId, items required' })
  }

  const orderNumber = await genOrderNumber(branchId)
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
