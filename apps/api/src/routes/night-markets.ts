import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// --- 静态路由必须在 /:id 之前 ---

// Amap POI search
router.get('/search/poi', async (req, res) => {
  const keyword = req.query.keyword as string
  const city = req.query.city as string
  const key = (req.query.key as string) || process.env.AMAP_API_KEY
  if (!key) return res.status(400).json({ error: 'AMAP_API_KEY not configured' })
  if (!keyword) return res.status(400).json({ error: 'keyword required' })

  try {
    const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city || '')}&key=${key}&offset=10`
    const resp = await fetch(url)
    const data = await resp.json()
    if (data.status !== '1') return res.status(500).json({ error: data.info })

    const pois = (data.pois || []).map((p: any) => ({
      name: p.name,
      address: p.address,
      location: p.location,
      city: p.cityname,
      pname: p.pname,
    }))
    res.json(pois)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Find nearest night market by geo
router.get('/nearby/query', async (req, res) => {
  const lat = parseFloat(req.query.lat as string)
  const lng = parseFloat(req.query.lng as string)
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'invalid lat/lng' })

  const markets = await prisma.nightMarket.findMany({ where: { status: 'active' } })
  const withDist = markets
    .map((m) => ({ ...m, dist: Math.round(haversine(lat, lng, m.lat, m.lng) * 1000) }))
    .filter((m) => m.dist <= m.radius)
    .sort((a, b) => a.dist - b.dist)

  res.json(withDist[0] || null)
})

// Test: generate random coords near a night market
router.get('/test/random-nearby', async (req, res) => {
  const marketId = (req.query.marketId as string) || 'nm-zhenxing'
  const market = await prisma.nightMarket.findUnique({ where: { id: marketId } })
  if (!market) return res.status(404).json({ error: 'market not found' })

  const offsetM = (market.radius || 200) * 0.6
  const degPerM = 1 / 111000
  const latOff = (Math.random() - 0.5) * 2 * offsetM * degPerM
  const lngOff = (Math.random() - 0.5) * 2 * offsetM * degPerM / Math.cos((market.lat * Math.PI) / 180)

  res.json({
    market: market.name,
    marketId: market.id,
    simulatedLat: +(market.lat + latOff).toFixed(6),
    simulatedLng: +(market.lng + lngOff).toFixed(6),
  })
})

// List all
router.get('/', async (_req, res) => {
  const markets = await prisma.nightMarket.findMany({ orderBy: { name: 'asc' } })
  res.json(markets)
})

// Get by id
router.get('/:id', async (req, res) => {
  const market = await prisma.nightMarket.findUnique({ where: { id: req.params.id } })
  if (!market) return res.status(404).json({ error: 'not found' })
  res.json(market)
})

// Create
router.post('/', async (req, res) => {
  const { name, address, lat, lng, radius, city } = req.body
  const market = await prisma.nightMarket.create({
    data: { name, address, lat, lng, radius: radius || 200, city },
  })
  res.json(market)
})

// Update
router.put('/:id', async (req, res) => {
  const { name, address, lat, lng, radius, city, status } = req.body
  const market = await prisma.nightMarket.update({
    where: { id: req.params.id },
    data: { name, address, lat, lng, radius, city, status },
  })
  res.json(market)
})

// Delete
router.delete('/:id', async (req, res) => {
  await prisma.nightMarket.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
