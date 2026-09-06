import type { SpecGroup } from './index.js'

/**
 * 站点业务配置
 *
 * 不同项目（dd.xpow.cn / diancan.xpow.cn / ...）仅修改此文件即可切换业务形态。
 */

/** 按份卖的单位选项 */
export const DISH_UNITS: string[] = ['串', '斤', '只', '份', '个']

/** 菜品默认计量单位 */
export const DEFAULT_DISH_UNIT = '串'

export interface SpecBlock {
  key: string
  cat: 'common' | 'coffee'
  label: string
  group: SpecGroup
}

/**
 * 规格预设块：后台「规格组」勾选式自由组合的候选规格。
 * key 为预设标识，cat 分区展示（common=通用 / coffee=咖啡）。
 */
export const SPEC_BLOCKS: SpecBlock[] = [
  { key: 'spice', cat: 'common', label: '辣度', group: { name: '辣度', type: 'single', options: [{ label: '不辣' }, { label: '微辣' }, { label: '中辣' }, { label: '特辣' }] } },
  { key: 'flavor', cat: 'common', label: '口味', group: { name: '口味', type: 'multi', options: [{ label: '原味' }, { label: '蒜香' }, { label: '黑胡椒' }] } },
  { key: 'count', cat: 'common', label: '串数', group: { name: '串数', type: 'single', options: [{ label: 'x1' }, { label: 'x2' }, { label: 'x3' }, { label: 'x4' }, { label: 'x5' }, { label: 'x6' }, { label: 'x8' }, { label: 'x10' }] } },
  { key: 'sweetness', cat: 'common', label: '甜度', group: { name: '甜度', type: 'single', options: [{ label: '全糖' }, { label: '七分糖' }, { label: '三分糖' }, { label: '无糖' }] } },
  { key: 'temp', cat: 'common', label: '温度', group: { name: '温度', type: 'single', options: [{ label: '冰镇' }, { label: '常温' }] } },
  { key: 'topping', cat: 'common', label: '加料', group: { name: '加料', type: 'multi', options: [{ label: '不加料' }, { label: '珍珠', priceDelta: 2 }, { label: '椰果', priceDelta: 2 }, { label: '布丁', priceDelta: 3 }, { label: '奶盖', priceDelta: 4 }] } },
  { key: 'cup', cat: 'common', label: '大小杯', group: { name: '大小杯', type: 'single', options: [{ label: '小杯', priceDelta: 0 }, { label: '中杯', priceDelta: 2 }, { label: '大杯', priceDelta: 4 }] } },
  { key: 'size', cat: 'common', label: '大小份', group: { name: '大小份', type: 'single', options: [{ label: '小份', priceDelta: 0 }, { label: '大份', priceDelta: 5 }] } },
  { key: 'cupSize', cat: 'common', label: '杯型', group: { name: '杯型', type: 'single', options: [{ label: '中杯' }, { label: '大杯' }, { label: '超大杯' }] } },
  { key: 'sugarSwap', cat: 'common', label: '可换糖', group: { name: '可换糖', type: 'single', options: [{ label: '经典糖' }, { label: '0热量代糖' }] } },
  { key: 'qty', cat: 'common', label: '份数', group: { name: '份数', type: 'single', options: [{ label: 'x1' }, { label: 'x2' }, { label: 'x3' }] } },
  { key: 'hotpotBase', cat: 'common', label: '锅底', group: { name: '锅底', type: 'single', options: [{ label: '麻辣锅底' }, { label: '番茄锅底' }, { label: '菌菇锅底' }, { label: '清汤锅底' }] } },
  { key: 'dip', cat: 'common', label: '蘸料', group: { name: '蘸料', type: 'single', options: [{ label: '油碟' }, { label: '麻酱' }, { label: '干碟' }] } },
  { key: 'coffeeBase', cat: 'coffee', label: '咖啡液', group: { name: '咖啡液', type: 'single', options: [{ label: '经典浓缩' }, { label: '金烘浓缩' }, { label: '低因咖啡' }] } },
  { key: 'coffeeExtract', cat: 'coffee', label: '萃取方式', group: { name: '萃取方式', type: 'single', options: [{ label: '原萃浓缩' }, { label: '精萃浓缩' }, { label: '满萃浓缩' }] } },
  { key: 'coffeeShots', cat: 'coffee', label: '浓缩份数', group: { name: '浓缩份数', type: 'single', options: [{ label: '1份' }, { label: '2份', default: true }, { label: '3份' }, { label: '4份' }] } },
  { key: 'coffeeMilk', cat: 'coffee', label: '加料', group: { name: '奶料', type: 'multi', options: [{ label: '牛奶' }, { label: '燕麦奶' }] } },
  { key: 'coffeeFoam', cat: 'coffee', label: '奶泡', group: { name: '奶泡', type: 'single', options: [{ label: '去奶泡' }] } },
  { key: 'coffeeSweet', cat: 'coffee', label: '甜度', group: { name: '咖啡甜度', type: 'single', options: [{ label: '标准甜' }, { label: '加甜' }] } },
]