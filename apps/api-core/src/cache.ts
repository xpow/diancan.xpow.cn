import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CACHE_DIR = join(import.meta.dirname, '..', 'cache')
const GLOBAL_CACHE_FILE = join(CACHE_DIR, 'global.json')

function ensureDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
}

export interface GlobalCache {
  buildTime: number
  merchant: {
    id: string
    name: string
    slogan: string
    businessHours: string
    statusText: string
    restReason: string
    features: any
  }
  branch: {
    id: string
    name: string
    code: string
    status: string
    todayLocation: string
    locationHint: string
    businessHours: string
    restReason: string
  } | null
  categories: { id: string; name: string; sort: number; showStatusLight: boolean }[]
  dishes: any[]
  promotions: any[]
  featuredItems: any[]
  devices: { id: string; code: string; name: string; mode: string; role: string; status: string; sn: string }[]
}

export function loadGlobalCache(): GlobalCache | null {
  try {
    if (!existsSync(GLOBAL_CACHE_FILE)) return null
    const raw = readFileSync(GLOBAL_CACHE_FILE, 'utf-8')
    return JSON.parse(raw) as GlobalCache
  } catch {
    return null
  }
}

export function saveGlobalCache(data: GlobalCache): void {
  ensureDir()
  writeFileSync(GLOBAL_CACHE_FILE, JSON.stringify(data), 'utf-8')
}

export function invalidateGlobalCache(): void {
  try { unlinkSync(GLOBAL_CACHE_FILE) } catch {}
}

export async function buildGlobalCache(): Promise<GlobalCache> {
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) throw new Error('merchant not found')

  const branch = await prisma.branch.findFirst({ where: { merchantId: merchant.id } })
  const categories = branch ? await prisma.category.findMany({ where: { branchId: branch.id }, orderBy: { sort: 'asc' } }) : []
  const dishes = await prisma.dish.findMany({ where: { merchantId: merchant.id }, orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }] })
  const promotions = await prisma.promotion.findMany({
    where: { merchantId: merchant.id },
    include: { items: { include: { dish: { select: { id: true, image: true, name: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
  const featuredItems = await prisma.featuredItem.findMany({
    where: { merchantId: merchant.id, active: true },
    orderBy: { sort: 'asc' },
  })
  const devices = branch ? await prisma.device.findMany({ where: { branchId: branch.id } }) : []

  const cache: GlobalCache = {
    buildTime: Date.now(),
    merchant: {
      id: merchant.id,
      name: merchant.name,
      slogan: merchant.slogan ?? '',
      businessHours: merchant.businessHours ?? '',
      statusText: merchant.statusText ?? '',
      restReason: merchant.restReason ?? '',
      features: JSON.parse(merchant.features),
    },
    branch: branch ? {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      status: branch.status,
      todayLocation: branch.todayLocation ?? '',
      locationHint: branch.locationHint ?? '',
      businessHours: branch.businessHours ?? '',
      restReason: branch.restReason ?? '',
    } : null,
    categories: categories.map((c) => ({ id: c.id, name: c.name, sort: c.sort, showStatusLight: c.showStatusLight })),
    dishes,
    promotions,
    featuredItems: featuredItems.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      priceText: f.priceText,
      badge: f.badge,
      badgeTone: f.badgeTone,
    })),
    devices: devices.map((d) => ({ id: d.id, code: d.code, name: d.name, mode: d.mode, role: d.role, status: d.status, sn: d.sn })),
  }

  saveGlobalCache(cache)
  return cache
}
