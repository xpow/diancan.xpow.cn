import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 常见姓氏拼音首字母映射（覆盖 95%+ 人口）
const SURNAME_INITIAL: Record<string, string> = {
  '李': 'L', '王': 'W', '张': 'Z', '刘': 'L', '陈': 'C',
  '杨': 'Y', '赵': 'Z', '黄': 'H', '周': 'Z', '吴': 'W',
  '徐': 'X', '孙': 'S', '胡': 'H', '朱': 'Z', '高': 'G',
  '林': 'L', '何': 'H', '郭': 'G', '马': 'M', '罗': 'L',
  '梁': 'L', '宋': 'S', '郑': 'Z', '谢': 'X', '韩': 'H',
  '唐': 'T', '冯': 'F', '于': 'Y', '董': 'D', '萧': 'X',
  '程': 'C', '曹': 'C', '袁': 'Y', '邓': 'D', '许': 'X',
  '傅': 'F', '沈': 'S', '曾': 'Z', '彭': 'P', '吕': 'L',
  '苏': 'S', '卢': 'L', '蒋': 'J', '蔡': 'C', '贾': 'J',
  '丁': 'D', '魏': 'W', '薛': 'X', '叶': 'Y', '阎': 'Y',
  '余': 'Y', '潘': 'P', '杜': 'D', '戴': 'D', '夏': 'X',
  '钟': 'Z', '汪': 'W', '田': 'T', '任': 'R', '姜': 'J',
  '范': 'F', '方': 'F', '石': 'S', '姚': 'Y', '谭': 'T',
  '廖': 'L', '邹': 'Z', '熊': 'X', '金': 'J', '陆': 'L',
  '郝': 'H', '孔': 'K', '白': 'B', '崔': 'C', '康': 'K',
  '毛': 'M', '邱': 'Q', '秦': 'Q', '江': 'J', '史': 'S',
  '顾': 'G', '侯': 'H', '邵': 'S', '孟': 'M', '龙': 'L',
  '万': 'W', '段': 'D', '漕': 'C', '钱': 'Q', '汤': 'T',
  '尹': 'Y', '黎': 'L', '易': 'Y', '常': 'C', '武': 'W',
  '乔': 'Q', '贺': 'H', '赖': 'L', '龚': 'G', '文': 'W',
}

function customerInitial(name?: string): string {
  if (!name || !name.trim()) return 'X'
  const first = name.trim()[0]
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase()
  return SURNAME_INITIAL[first] || first
}

// 生成取餐号: {顾客名首字母}{商家编号}{分店编号}{2位序号}
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
  return `${init}${mCode}${bCode}${seq}`
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
