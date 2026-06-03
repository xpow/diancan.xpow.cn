import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { id: 'demo-merchant' },
    update: {},
    create: {
      id: 'demo-merchant',
      name: '炭火烧烤小摊',
      code: 'D',
      type: 'mobile',
      phone: '13800138000',
    },
  })

  const branch = await prisma.branch.upsert({
    where: { id: 'demo-branch' },
    update: {},
    create: {
      id: 'demo-branch',
      merchantId: merchant.id,
      name: '炭火烧烤·夜市总摊',
      code: 'X',
      address: '星光夜市 A区 08号',
      logoUrl: '',
      bannerUrl: '',
    },
  })

  const categories = [
    { id: 'cat-skewer', name: '肉串', sort: 0 },
    { id: 'cat-veg', name: '素菜', sort: 1 },
    { id: 'cat-drink', name: '饮品', sort: 2 },
  ]

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, branchId: branch.id },
    })
  }

  const dishes = [
    { id: 'dish-01', categoryId: 'cat-skewer', name: '招牌牛肉串', price: 5, specsPreset: 'bbq' },
    { id: 'dish-02', categoryId: 'cat-skewer', name: '秘制羊肉串', price: 6, specsPreset: 'bbq' },
    { id: 'dish-03', categoryId: 'cat-skewer', name: '烤鸡翅', price: 8, specsPreset: 'bbq' },
    { id: 'dish-04', categoryId: 'cat-skewer', name: '烤排骨', price: 10, specsPreset: 'bbq' },
    { id: 'dish-05', categoryId: 'cat-skewer', name: '烤鱿鱼', price: 8, specsPreset: 'bbq' },
    { id: 'dish-06', categoryId: 'cat-veg', name: '烤茄子', price: 6, specsPreset: 'none' },
    { id: 'dish-07', categoryId: 'cat-veg', name: '烤韭菜', price: 4, specsPreset: 'none' },
    { id: 'dish-08', categoryId: 'cat-veg', name: '烤金针菇', price: 5, specsPreset: 'none' },
    { id: 'dish-09', categoryId: 'cat-veg', name: '烤玉米', price: 5, specsPreset: 'none' },
    { id: 'dish-10', categoryId: 'cat-drink', name: '冰镇酸梅汤', price: 8, specsPreset: 'tea' },
    { id: 'dish-11', categoryId: 'cat-drink', name: '柠檬茶', price: 6, specsPreset: 'tea' },
    { id: 'dish-12', categoryId: 'cat-drink', name: '矿泉水', price: 3, specsPreset: 'none' },
  ]

  for (const d of dishes) {
    await prisma.dish.upsert({
      where: { id: d.id },
      update: {},
      create: { ...d, merchantId: merchant.id },
    })
  }

  await prisma.table.upsert({
    where: { id: 'table-01' },
    update: {},
    create: {
      id: 'table-01',
      branchId: branch.id,
      label: 'A01',
    },
  })

  // 清除旧的 demo 夜市，插入东阳 4 个夜市
  await prisma.nightMarket.deleteMany({ where: { id: { startsWith: 'nm-' } } })

  const nightMarkets = [
    { id: 'nm-zhenxing', name: '振兴路夜市', address: '东阳市振兴路', lat: 29.297658657508602, lng: 120.33635248259189, radius: 500, city: '东阳' },
    { id: 'nm-tingtang', name: '亭塘夜市', address: '东阳市亭塘', lat: 29.2850, lng: 120.2400, radius: 500, city: '东阳' },
    { id: 'nm-yintai', name: '银泰夜市', address: '东阳市银泰城', lat: 29.28117573378158, lng: 120.21398150807048, radius: 500, city: '东阳' },
    { id: 'nm-xifan', name: '西范夜市', address: '东阳市西范', lat: 29.304465419748222, lng: 120.20984218063381, radius: 500, city: '东阳' },
  ]

  for (const nm of nightMarkets) {
    await prisma.nightMarket.upsert({ where: { id: nm.id }, update: {}, create: nm })
  }

  // Demo 营销活动
  await prisma.orderPromotion.deleteMany({ })
  await prisma.promotionItem.deleteMany({ })
  await prisma.promotion.deleteMany({ where: { id: { startsWith: 'promo-' } } })

  await prisma.promotion.create({
    data: {
      id: 'promo-welfare',
      merchantId: merchant.id,
      name: '福利烤韭菜',
      type: 'welfare_item',
      rules: JSON.stringify({}),
      status: 'active',
      items: {
        create: {
          dishId: 'dish-08',
          promoPrice: 0.1,
          limitType: 'global_promo',
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

  await prisma.promotion.create({
    data: {
      id: 'promo-new-user',
      merchantId: merchant.id,
      name: '新人立减5元',
      type: 'new_user',
      rules: JSON.stringify({ discount: 5, minAmount: 0 }),
      status: 'active',
    },
  })

  await prisma.promotion.create({
    data: {
      id: 'promo-first-order',
      merchantId: merchant.id,
      name: '首单直减3元',
      type: 'first_order',
      rules: JSON.stringify({ discount: 3 }),
      status: 'active',
    },
  })

  await prisma.promotion.create({
    data: {
      id: 'promo-free-gift',
      merchantId: merchant.id,
      name: '赠烤韭菜',
      type: 'free_gift',
      rules: JSON.stringify({ giftDishId: 'dish-07', giftQty: 1 }),
      status: 'active',
    },
  })

  // Demo 用户
  const users = [
    { id: 'user-01', merchantId: merchant.id, phone: '13800001111', name: '张三', avatar: '' },
    { id: 'user-02', merchantId: merchant.id, phone: '13800002222', name: '李四', avatar: '' },
    { id: 'user-03', merchantId: merchant.id, phone: '13800003333', name: '王五', avatar: '' },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: u,
    })
  }

  console.log('Seed data created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
