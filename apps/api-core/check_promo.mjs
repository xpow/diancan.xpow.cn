import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const r = await p.promotion.findUnique({ where: { id: 'promo-rib-50' } })
console.log(JSON.stringify({ name: r?.name, type: r?.type, status: r?.status }))
await p.$disconnect()
