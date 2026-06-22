import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const promos = await p.promotion.findMany({ where: { status: 'active', type: { in: ['full_reduction','total_discount'] } } })
for (const promo of promos) {
  console.log(JSON.stringify({ id: promo.id, name: promo.name, type: promo.type, rules: JSON.parse(promo.rules) }))
}
await p.$disconnect()
