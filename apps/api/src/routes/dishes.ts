import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

router.get('/', async (_req, res) => {
  const dishes = await prisma.dish.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  })
  res.json(dishes)
})

export default router
