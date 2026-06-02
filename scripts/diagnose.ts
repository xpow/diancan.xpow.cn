import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const issues: string[] = []

  // 1. 检查 schema vs DB
  console.log('=== Schema 检查 ===')
  const merchants = await prisma.merchant.findMany()
  console.log(`商家: ${merchants.length}`)
  for (const m of merchants) {
    console.log(`  ${m.id} | ${m.name} | code=${m.code}`)
  }

  const branches = await prisma.branch.findMany()
  console.log(`分店: ${branches.length}`)

  const dishes = await prisma.dish.findMany()
  console.log(`菜品: ${dishes.length}`)

  const categories = await prisma.category.findMany()
  console.log(`分类: ${categories.length}`)

  const tables = await prisma.table.findMany()
  console.log(`桌台: ${tables.length}`)

  const promotions = await prisma.promotion.findMany({ include: { items: true } })
  console.log(`活动: ${promotions.length}`)
  for (const p of promotions) {
    console.log(`  ${p.id} | ${p.name} | type=${p.type} | status=${p.status}`)
    for (const pi of p.items) {
      console.log(`    item: dishId=${pi.dishId} price=${pi.promoPrice} limit=${pi.limitType} max=${pi.maxQty}`)
    }
  }

  // 2. 检查订单
  console.log('\n=== 订单检查 ===')
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { items: true, promotions: true } })
  console.log(`订单总数: ${orders.length}`)

  const orderPromos = await prisma.orderPromotion.findMany()
  console.log(`订单活动关联: ${orderPromos.length}`)

  let ok = true
  for (const o of orders) {
    const itemTotal = o.items.reduce((s, i) => s + i.price * i.quantity, 0)
    const diff = Math.abs(itemTotal - o.totalPrice)
    if (diff > 0.01) {
      issues.push(`订单 ${o.orderNumber}: items总和=${itemTotal} != totalPrice=${o.totalPrice}`)
      ok = false
    }
  }

  // 3. 检查 order_number 格式
  const oldFormat = orders.filter((o) => !o.orderNumber?.includes('-'))
  if (oldFormat.length) {
    issues.push(`有 ${oldFormat.length} 个订单还是旧格式编号（无分隔符）: ${oldFormat.map((o) => o.orderNumber).join(', ')}`)
  }

  console.log('\n=== 问题列表 ===')
  if (issues.length) {
    issues.forEach((i) => console.log(`❌ ${i}`))
  } else {
    console.log('✅ 没有发现问题')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
