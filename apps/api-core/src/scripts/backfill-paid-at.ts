import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const orders = await prisma.order.findMany({
    where: {
      paidAt: null,
      createdAt: { lt: today },
      status: { not: 'cancelled' },
    },
  })

  console.log(`找到 ${orders.length} 条待补单订单`)

  for (const o of orders) {
    await prisma.order.update({
      where: { id: o.id },
      data: { paidAt: new Date(), paymentMethod: o.paymentMethod || 'cash' },
    })
    console.log(`  ${o.orderNo}  status=${o.status}  amount=¥${o.payableAmount.toFixed(2)}  → 已补paidAt`)
  }

  console.log('完成')
}

main().catch(console.error).finally(() => prisma.$disconnect())
