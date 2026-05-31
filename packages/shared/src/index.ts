export type OrderType = 'dine_in' | 'takeaway'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export interface SpecOption {
  label: string
  priceDelta?: number
}

export interface SpecGroup {
  name: string
  type: 'single' | 'multi'
  options: SpecOption[]
}

export type SpecPreset = 'none' | 'tea' | 'bbq' | 'hotpot' | 'dessert'

export const SPECS_PRESETS: Record<SpecPreset, SpecGroup[] | null> = {
  none: null,
  tea: [
    {
      name: '甜度',
      type: 'single',
      options: [
        { label: '全糖' },
        { label: '七分糖' },
        { label: '三分糖' },
        { label: '无糖' },
      ],
    },
    {
      name: '温度',
      type: 'single',
      options: [
        { label: '热饮' },
        { label: '温' },
        { label: '常温' },
        { label: '少冰' },
        { label: '多冰' },
      ],
    },
    {
      name: '加料',
      type: 'multi',
      options: [
        { label: '珍珠', priceDelta: 2 },
        { label: '椰果', priceDelta: 2 },
        { label: '布丁', priceDelta: 3 },
        { label: '奶盖', priceDelta: 4 },
      ],
    },
  ],
  bbq: [
    {
      name: '辣度',
      type: 'single',
      options: [
        { label: '不辣' },
        { label: '微辣' },
        { label: '中辣' },
        { label: '特辣' },
      ],
    },
    {
      name: '份量',
      type: 'single',
      options: [
        { label: '小份', priceDelta: -5 },
        { label: '中份' },
        { label: '大份', priceDelta: 10 },
      ],
    },
  ],
  hotpot: [
    {
      name: '锅底',
      type: 'single',
      options: [
        { label: '麻辣锅底' },
        { label: '番茄锅底' },
        { label: '菌菇锅底' },
        { label: '清汤锅底' },
      ],
    },
    {
      name: '蘸料',
      type: 'single',
      options: [
        { label: '油碟' },
        { label: '麻酱' },
        { label: '干碟' },
      ],
    },
  ],
  dessert: [
    {
      name: '大小份',
      type: 'single',
      options: [
        { label: '小份', priceDelta: -8 },
        { label: '大份', priceDelta: 5 },
      ],
    },
    {
      name: '加料',
      type: 'multi',
      options: [
        { label: '芒果', priceDelta: 5 },
        { label: '草莓', priceDelta: 5 },
        { label: '红豆', priceDelta: 3 },
        { label: '芋圆', priceDelta: 4 },
      ],
    },
  ],
}

export interface CartItem {
  dishId: string
  name: string
  price: number
  quantity: number
  specs?: string
  image?: string
}
