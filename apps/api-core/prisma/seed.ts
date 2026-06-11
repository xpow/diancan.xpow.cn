import { PrismaClient } from '@prisma/client'

function randomSN(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000))
}

const prisma = new PrismaClient()

async function main() {
  // 清空（按外键顺序）
  await prisma.orderPromotion.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.promotionItem.deleteMany()
  await prisma.promotion.deleteMany()
  await prisma.featuredItem.deleteMany()
  await prisma.promotionBanner.deleteMany()
  await prisma.dish.deleteMany()
  await prisma.category.deleteMany()
  await prisma.device.deleteMany()
  await prisma.branch.deleteMany()
  await prisma.merchant.deleteMany()

  // 商家
  const merchant = await prisma.merchant.create({
    data: {
      id: 'demo-merchant',
      name: '典韦烤串',
      slogan: '地道炭火 · 鲜嫩多汁 · 现烤现卖',
      businessHours: '17:00 - 02:00',
      statusText: '营业中',
      logoUrl: '',
      features: JSON.stringify({ quote: true, payment: false, pickup: false }),
    },
  })

  // 分店
  const branch = await prisma.branch.create({
    data: {
      id: 'demo-branch',
      merchantId: merchant.id,
      code: 'A',
      name: '夜市总摊',
      address: '东阳市振兴路夜市 A 区 08 号',
      todayLocation: '东阳市振兴路夜市 A 区 08 号',
      locationHint: '该位置由商家后台每日预设，不使用 GPS。',
      bannerUrl: '',
    },
  })

  // 设备
  await prisma.device.create({
    data: {
      id: 'kiosk-a01',
      branchId: branch.id,
      code: '01',
      sn: randomSN(),
      name: '一号点餐机',
      mode: 'kiosk',
    },
  })

  // 活动横幅
  await prisma.promotionBanner.create({
    data: {
      id: 'banner-full-reduction',
      merchantId: merchant.id,
      title: '限时满减',
      subtitle: '满 50 减 5，满 100 减 12',
      tag: '今日主推',
      tone: 'primary',
      sort: 0,
    },
  })

  await prisma.promotionBanner.create({
    data: {
      id: 'banner-buy-get',
      merchantId: merchant.id,
      title: '羊肉串买 5 送 1',
      subtitle: '鲜嫩多汁，现烤现卖',
      tag: '劲爆特惠',
      tone: 'neutral',
      sort: 1,
    },
  })

  // 推荐菜品
  await prisma.featuredItem.create({
    data: {
      id: 'featured-01',
      merchantId: merchant.id,
      title: '招牌红柳羊肉串',
      description: '西北空运鲜羊肉，传统红柳枝炭火慢烤。',
      priceText: '¥12/串',
      badge: '人气爆款',
      badgeTone: 'hot',
      sort: 0,
    },
  })

  await prisma.featuredItem.create({
    data: {
      id: 'featured-02',
      merchantId: merchant.id,
      title: '秘制奥尔良鸡翅',
      description: '独家配方腌制 24 小时，皮脆肉嫩。',
      priceText: '¥8/串',
      badge: '新品上市',
      badgeTone: 'new',
      sort: 1,
    },
  })

  // 菜品分类
  const categories = [
    { id: 'cat-skewer', name: '肉串', sort: 0 },
    { id: 'cat-veg', name: '素菜', sort: 1 },
    { id: 'cat-drink', name: '饮品', sort: 2 },
  ]

  for (const c of categories) {
    await prisma.category.create({
      data: { ...c, branchId: branch.id },
    })
  }

  // 菜品
  const dishes = [
    { id: 'dish-01', categoryId: 'cat-skewer', name: '招牌牛肉串', price: 5, desc: '肥瘦均匀，焦香多汁', tags: ['招牌'], specsPreset: 'bbq' },
    { id: 'dish-02', categoryId: 'cat-skewer', name: '秘制羊肉串', price: 6, desc: '孜然风味，现烤现卖', tags: ['推荐'], specsPreset: 'bbq' },
    { id: 'dish-03', categoryId: 'cat-skewer', name: '烤鸡翅', price: 8, desc: '外脆里嫩，鲜香入味', tags: [], specsPreset: 'bbq' },
    { id: 'dish-04', categoryId: 'cat-skewer', name: '烤排骨', price: 10, desc: '焦香带汁，肉感满足', tags: [], specsPreset: 'bbq' },
    { id: 'dish-05', categoryId: 'cat-skewer', name: '烤鱿鱼', price: 8, desc: '弹嫩有嚼劲，海鲜控必点', tags: [], specsPreset: 'bbq' },
    { id: 'dish-06', categoryId: 'cat-veg', name: '烤茄子', price: 6, desc: '蒜香浓郁，软糯入味', tags: [], specsPreset: 'none' },
    { id: 'dish-07', categoryId: 'cat-veg', name: '烤韭菜', price: 4, desc: '清香脆嫩，解腻搭档', tags: [], specsPreset: 'none' },
    { id: 'dish-08', categoryId: 'cat-veg', name: '烤金针菇', price: 5, desc: '福利品示例，一单限 1 份', tags: ['福利'], specsPreset: 'none' },
    { id: 'dish-09', categoryId: 'cat-veg', name: '烤玉米', price: 5, desc: '香甜软糯，口感扎实', tags: [], specsPreset: 'none' },
    { id: 'dish-10', categoryId: 'cat-drink', name: '冰镇酸梅汤', price: 8, desc: '冰爽解腻，经典搭配', tags: [], specsPreset: 'tea' },
    { id: 'dish-11', categoryId: 'cat-drink', name: '柠檬茶', price: 6, desc: '清爽回甘，饭后推荐', tags: [], specsPreset: 'tea' },
    { id: 'dish-12', categoryId: 'cat-drink', name: '矿泉水', price: 3, desc: '常温矿泉水', tags: [], specsPreset: 'none' },
  ]

  for (const d of dishes) {
    await prisma.dish.create({
      data: {
        ...d,
        merchantId: merchant.id,
        tags: JSON.stringify(d.tags),
        image: '',
      },
    })
  }

  // 营销活动
  await prisma.promotion.create({
    data: {
      id: 'promo-welfare',
      merchantId: merchant.id,
      name: '福利烤金针菇',
      type: 'welfare_item',
      rules: JSON.stringify({}),
      status: 'active',
      items: {
        create: {
          dishId: 'dish-08',
          promoPrice: 0.1,
          limitType: 'per_order',
          maxQty: 1,
        },
      },
    },
  })

  await prisma.promotion.create({
    data: {
      id: 'promo-welfare-daily',
      merchantId: merchant.id,
      name: '每日福利烤茄子',
      type: 'welfare_item',
      rules: JSON.stringify({}),
      status: 'active',
      items: {
        create: {
          dishId: 'dish-06',
          promoPrice: 0.5,
          limitType: 'daily',
          maxQty: 10,
        },
      },
    },
  })

  await prisma.promotion.create({
    data: {
      id: 'promo-full-reduction',
      merchantId: merchant.id,
      name: '满50减5',
      type: 'full_reduction',
      rules: JSON.stringify({ threshold: 50, discount: 5 }),
      status: 'active',
    },
  })

  console.log('Seed data created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
