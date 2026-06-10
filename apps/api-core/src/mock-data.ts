export interface BootstrapConfig {
  merchantId: string
  merchantName: string
  branchId: string
  branchName: string
  deviceId: string
  deviceMode: 'kiosk'
  slogan: string
  businessHours: string
  todayLocation: string
  locationHint: string
  statusText: string
  features: {
    quote: boolean
    payment: boolean
    pickup: boolean
  }
  promotions: Array<{
    id: string
    title: string
    subtitle: string
    tag?: string
    tone: 'primary' | 'neutral'
  }>
  featuredItems: Array<{
    id: string
    title: string
    description: string
    priceText: string
    badge: string
    badgeTone: 'hot' | 'new'
  }>
}

export interface MenuCategory {
  id: string
  name: string
  sort: number
}

export interface MenuDish {
  id: string
  categoryId: string
  name: string
  price: number
  desc: string
  image?: string
  tags?: string[]
}

export interface QuoteItemInput {
  dishId: string
  quantity: number
}

export interface QuoteItem {
  dishId: string
  name: string
  quantity: number
  unitPrice: number
  finalUnitPrice: number
  subtotal: number
  finalSubtotal: number
  promotionLabel?: string
}

export interface AppliedPromotion {
  id: string
  name: string
  type: 'welfare_item' | 'full_reduction'
  discount: number
  description: string
}

export interface OrderItemSnapshot {
  dishId: string
  name: string
  quantity: number
  finalSubtotal: number
}

export interface CreatedOrder {
  orderNo: string
  pickupCode: string
  status: 'pending'
  merchantId: string
  branchId: string
  deviceId: string
  totals: {
    originalAmount: number
    discountAmount: number
    payableAmount: number
  }
  items: OrderItemSnapshot[]
  createdAt: string
}

const dishes: MenuDish[] = [
  { id: 'dish-01', categoryId: 'cat-skewer', name: '招牌牛肉串', price: 5, desc: '肥瘦均匀，焦香多汁', tags: ['招牌'] },
  { id: 'dish-02', categoryId: 'cat-skewer', name: '秘制羊肉串', price: 6, desc: '孜然风味，现烤现卖', tags: ['推荐'] },
  { id: 'dish-03', categoryId: 'cat-skewer', name: '烤鸡翅', price: 8, desc: '外脆里嫩，鲜香入味' },
  { id: 'dish-04', categoryId: 'cat-skewer', name: '烤排骨', price: 10, desc: '焦香带汁，肉感满足' },
  { id: 'dish-05', categoryId: 'cat-skewer', name: '烤鱿鱼', price: 8, desc: '弹嫩有嚼劲，海鲜控必点' },
  { id: 'dish-06', categoryId: 'cat-veg', name: '烤茄子', price: 6, desc: '蒜香浓郁，软糯入味' },
  { id: 'dish-07', categoryId: 'cat-veg', name: '烤韭菜', price: 4, desc: '清香脆嫩，解腻搭档' },
  { id: 'dish-08', categoryId: 'cat-veg', name: '烤金针菇', price: 5, desc: '福利品示例，一单限 1 份', tags: ['福利'] },
  { id: 'dish-09', categoryId: 'cat-veg', name: '烤玉米', price: 5, desc: '香甜软糯，口感扎实' },
  { id: 'dish-10', categoryId: 'cat-drink', name: '冰镇酸梅汤', price: 8, desc: '冰爽解腻，经典搭配' },
  { id: 'dish-11', categoryId: 'cat-drink', name: '柠檬茶', price: 6, desc: '清爽回甘，饭后推荐' },
  { id: 'dish-12', categoryId: 'cat-drink', name: '矿泉水', price: 3, desc: '常温矿泉水' },
]

const createdOrders: CreatedOrder[] = []
let orderSequence = 1001

export const bootstrapConfig: BootstrapConfig = {
  merchantId: 'default-merchant',
  merchantName: '炭火烧烤小摊',
  branchId: 'default-branch',
  branchName: '夜市总摊',
  deviceId: 'kiosk-a01',
  deviceMode: 'kiosk',
  slogan: '地道炭火 · 鲜嫩多汁 · 现烤现卖',
  businessHours: '17:00 - 02:00',
  todayLocation: '东阳市振兴路夜市 A 区 08 号',
  locationHint: '该位置由商家后台每日预设，不使用 GPS。',
  statusText: '营业中',
  features: {
    quote: true,
    payment: false,
    pickup: false,
  },
  promotions: [
    {
      id: 'promo-full-reduction',
      title: '限时满减',
      subtitle: '满 50 减 5，满 100 减 12',
      tag: '今日主推',
      tone: 'primary',
    },
    {
      id: 'promo-buy-get',
      title: '羊肉串买 5 送 1',
      subtitle: '鲜嫩多汁，现烤现卖',
      tag: '劲爆特惠',
      tone: 'neutral',
    },
  ],
  featuredItems: [
    {
      id: 'featured-01',
      title: '招牌红柳羊肉串',
      description: '西北空运鲜羊肉，传统红柳枝炭火慢烤。',
      priceText: '¥12/串',
      badge: '人气爆款',
      badgeTone: 'hot',
    },
    {
      id: 'featured-02',
      title: '秘制奥尔良鸡翅',
      description: '独家配方腌制 24 小时，皮脆肉嫩。',
      priceText: '¥8/串',
      badge: '新品上市',
      badgeTone: 'new',
    },
  ],
}

export const menuCategories: MenuCategory[] = [
  { id: 'cat-skewer', name: '肉串', sort: 0 },
  { id: 'cat-veg', name: '素菜', sort: 1 },
  { id: 'cat-drink', name: '饮品', sort: 2 },
]

export function getMenuData() {
  return {
    merchant: {
      id: bootstrapConfig.merchantId,
      name: bootstrapConfig.merchantName,
    },
    branch: {
      id: bootstrapConfig.branchId,
      name: bootstrapConfig.branchName,
    },
    categories: menuCategories,
    dishes,
  }
}

export function buildQuote(items: QuoteItemInput[]) {
  const itemDetails: QuoteItem[] = []
  const appliedPromotions: AppliedPromotion[] = []
  const hints: string[] = []

  let originalAmount = 0
  let payableAmount = 0
  let welfareApplied = false

  for (const item of items) {
    const dish = dishes.find((entry) => entry.id === item.dishId)
    if (!dish || item.quantity <= 0) continue

    const subtotal = dish.price * item.quantity
    originalAmount += subtotal

    let finalUnitPrice = dish.price
    let finalSubtotal = subtotal
    let promotionLabel: string | undefined

    if (dish.id === 'dish-08') {
      const welfareQty: number = welfareApplied ? 0 : Math.min(item.quantity, 1)
      const normalQty: number = item.quantity - welfareQty
      finalSubtotal = welfareQty * 0.1 + normalQty * dish.price
      finalUnitPrice = welfareQty === item.quantity ? 0.1 : dish.price
      welfareApplied = welfareQty > 0

      if (welfareQty > 0) {
        appliedPromotions.push({
          id: 'promo-welfare',
          name: '福利烤金针菇',
          type: 'welfare_item',
          discount: Number((dish.price * welfareQty - 0.1 * welfareQty).toFixed(2)),
          description: '福利品 0.1 元，单笔订单仅 1 份享受福利价',
        })
        promotionLabel = '福利价'
      }

      if (item.quantity > 1) {
        hints.push('福利烤金针菇本单仅首份按 0.1 元计算，其余按原价计算。')
      }
    }

    payableAmount += finalSubtotal

    itemDetails.push({
      dishId: dish.id,
      name: dish.name,
      quantity: item.quantity,
      unitPrice: dish.price,
      finalUnitPrice: Number(finalUnitPrice.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      finalSubtotal: Number(finalSubtotal.toFixed(2)),
      promotionLabel,
    })
  }

  if (payableAmount >= 50) {
    payableAmount -= 5
    appliedPromotions.push({
      id: 'promo-full-reduction',
      name: '满 50 减 5',
      type: 'full_reduction',
      discount: 5,
      description: '订单满 50 元自动减 5 元',
    })
  } else if (payableAmount > 0) {
    const diff = Number((50 - payableAmount).toFixed(2))
    hints.push(`再点 ¥${diff.toFixed(2)} 可享满 50 减 5。`)
  }

  const discountAmount = Number((originalAmount - payableAmount).toFixed(2))

  return {
    itemDetails,
    appliedPromotions,
    totals: {
      originalAmount: Number(originalAmount.toFixed(2)),
      discountAmount,
      payableAmount: Number(payableAmount.toFixed(2)),
    },
    hints,
  }
}

export function createOrder(params: {
  merchantId: string
  branchId: string
  deviceId: string
  items: QuoteItemInput[]
}) {
  const quote = buildQuote(params.items)
  const orderNo = `DC${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(orderSequence).padStart(4, '0')}`
  const pickupCode = String(orderSequence).slice(-3).padStart(3, '0')
  orderSequence += 1

  const order: CreatedOrder = {
    orderNo,
    pickupCode,
    status: 'pending',
    merchantId: params.merchantId,
    branchId: params.branchId,
    deviceId: params.deviceId,
    totals: quote.totals,
    items: quote.itemDetails.map((item) => ({
      dishId: item.dishId,
      name: item.name,
      quantity: item.quantity,
      finalSubtotal: item.finalSubtotal,
    })),
    createdAt: new Date().toISOString(),
  }

  createdOrders.unshift(order)
  return order
}

export function listOrders() {
  return createdOrders
}
