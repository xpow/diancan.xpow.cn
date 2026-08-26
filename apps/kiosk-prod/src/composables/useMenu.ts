import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { SPECS_PRESETS, type SpecGroup, type SpecPreset } from '@diancan/shared'
import { getDishImage } from '@/utils/dishImages'
import heroImage from '@/assets/images/pages/hero.jpg'

export interface MenuCategory { id: string; name: string; sort: number }

export interface MenuDish {
  id: string; categoryId: string; name: string
  price: number; desc: string; image: string; tags?: string[]
  specsPreset?: SpecPreset
  specGroups?: SpecGroup[]
  selectedLabels?: (string | string[])[]
  promotionId?: string; promoPrice?: number; promotionName?: string
  portionSize?: number
  stock?: number
  stockEnabled?: boolean
}

const categoryIcons: Record<string, string> = {
  '肉串': 'kebab_dining',
  '素菜': 'eco',
  '饮品': 'local_bar',
  '果茶': 'local_drink',
}

export function useMenu() {
  const route = useRoute()
  const loading = ref(true)
  const errorMessage = ref('')
  const merchantName = ref('')
  const branchName = ref('')
  const deviceId = ref('')
  const deviceCode = ref('')
const statusText = ref('')
const branchStatus = ref('')
const businessHours = ref('')
const restReason = ref('')
  const categories = ref<MenuCategory[]>([])
  const dishes = ref<MenuDish[]>([])
  const selectedCategoryId = ref('')
  const highlightDishId = ref('')
  const navFloating = ref(false)
  const navSentinel = ref<HTMLElement | null>(null)
  let navObserver: IntersectionObserver | null = null
  // 库存轮询间隔：下单/后台改库存后菜单页库存快速同步
  const STOCK_POLL_MS = 10_000
  let stockTimer: ReturnType<typeof setInterval> | null = null

  const displayTitle = computed(() => {
    const m = merchantName.value
    const b = branchName.value
    return m && b ? `${m}（${b}）` : m || b || '典韦烤串'
  })

  const filteredDishes = computed(() => dishes.value.filter(d => d.categoryId === selectedCategoryId.value).sort((a, b) => {
    const aOut = a.stockEnabled && (a.stock ?? 0) <= 0 ? 1 : 0
    const bOut = b.stockEnabled && (b.stock ?? 0) <= 0 ? 1 : 0
    return aOut - bOut
  }))

  function initSpecs(specGroups: SpecGroup[] | null, preset?: SpecPreset): { groups: SpecGroup[]; defaults: (string | string[])[] } | null {
    const defs = specGroups?.length ? specGroups : (preset ? SPECS_PRESETS[preset] : null)
    if (!defs || defs.length === 0) return null
    const defaults = defs.map((g) => {
      if (g.type === 'multi') return [g.options[0]?.label ?? ''].filter(Boolean)
      if (g.name === '辣度') return g.options[1]?.label ?? g.options[0]?.label ?? ''
      return g.options[0]?.label ?? ''
    })
    return { groups: defs, defaults }
  }

  function qtyGroupIndex(groups: SpecGroup[]) {
    return groups.findIndex((g) => g.name === '串数' || g.name === '份数')
  }

  function onCustomQty(dish: MenuDish, gi: number, value: string) {
    if (!dish.selectedLabels) return
    dish.selectedLabels[gi] = value
      ? dish.portionSize ? `${value}份` : `x${value}`
      : dish.specGroups?.[gi]?.options?.[0]?.label || 'x2'
  }

  async function loadMenu(bootstrap: { deviceId?: string }) {
    const params = bootstrap.deviceId ? `?deviceId=${bootstrap.deviceId}` : ''
    const res = await fetch(`/api/catalog/menu${params}`)
    if (!res.ok) throw new Error('接口返回异常，请检查 api-core 是否已启动')
    return res.json()
  }

  // 就地刷新库存：仅更新 stock/stockEnabled，不重建 dishes，避免丢失用户规格选择
  async function refreshStocks() {
    if (!deviceId.value) return
    try {
      const menu = (await loadMenu({ deviceId: deviceId.value })) as {
        dishes: { id: string; stock?: number; stockEnabled?: boolean }[]
      }
      const stockMap = new Map(menu.dishes.map((d) => [d.id, d]))
      for (const dish of dishes.value) {
        const fresh = stockMap.get(dish.id)
        if (fresh) {
          dish.stock = fresh.stock
          dish.stockEnabled = fresh.stockEnabled
        }
      }
    } catch {
      // 静默失败，下次轮询重试
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') void refreshStocks()
  }

  async function loadData() {
    loading.value = true; errorMessage.value = ''
    try {
      const savedDeviceSN = localStorage.getItem('kiosk-device-sn') || ''
      const bootstrapResponse = await fetch(`/api/system/bootstrap${savedDeviceSN ? `?sn=${savedDeviceSN}` : ''}`)
      if (!bootstrapResponse.ok) throw new Error('接口返回异常，请检查 api-core 是否已启动')
      const bootstrap = await bootstrapResponse.json() as {
        merchantName?: string; branchName: string; deviceId?: string
        deviceCode?: string; statusText?: string; branchStatus?: string; businessHours?: string; restReason?: string
        deviceActive?: boolean
      }

      if (bootstrap.deviceActive === false) {
        localStorage.clear()
        throw new Error('该设备已下线，请联系管理员')
      }

      const authId = localStorage.getItem('kiosk-device-auth-id')
      if (authId && bootstrap.deviceId && bootstrap.deviceId !== authId) {
        localStorage.removeItem('kiosk-device-token')
        localStorage.removeItem('kiosk-device-auth-id')
        localStorage.removeItem('kiosk-device-sn')
        window.location.href = '/home'
        return
      }

      const menuResponse = await loadMenu(bootstrap)
      const menu = menuResponse as {
        categories: MenuCategory[]
        dishes: {
          id: string; categoryId: string; name: string; price: number
          desc: string; image?: string; tags?: string[]; specsPreset?: SpecPreset
          promoPrice?: number | null; promotionName?: string | null; portionSize?: number
        }[]
      }

      merchantName.value = bootstrap.merchantName ?? ''
      branchName.value = bootstrap.branchName
      deviceId.value = bootstrap.deviceId ?? ''
      deviceCode.value = bootstrap.deviceCode ?? ''
      statusText.value = bootstrap.statusText ?? ''
      branchStatus.value = bootstrap.branchStatus ?? ''
      businessHours.value = bootstrap.businessHours ?? ''
      restReason.value = bootstrap.restReason ?? ''
      categories.value = [...menu.categories].sort((a, b) => a.sort - b.sort)

      dishes.value = menu.dishes.map((d: any) => {
        const specResult = initSpecs(d.specGroups, d.specsPreset as SpecPreset)
        const groups = specResult?.groups ? structuredClone(specResult.groups) : undefined
        if (d.portionSize && groups) {
          const qtyGroup = groups.find((g) => g.name === '串数')
          if (qtyGroup) {
            qtyGroup.name = '份数'
            qtyGroup.options = qtyGroup.options
              .map((o) => ({ ...o, label: o.label.replace('x', '') + '份' }))
              .filter((o) => parseInt(o.label) <= 5)
          }
        }
        const defaults = specResult?.defaults ? [...specResult.defaults] : undefined
        if (d.portionSize && defaults && groups) {
          const qtyIdx = groups.findIndex((g) => g.name === '份数')
          if (qtyIdx > -1) {
            defaults[qtyIdx] = groups[qtyIdx].options[0]?.label ?? defaults[qtyIdx]
          }
        }
        return {
          id: d.id, categoryId: d.categoryId, name: d.name,
          price: d.price, desc: d.desc,
          image: d.image || getDishImage(d.id),
          tags: d.tags, specsPreset: d.specsPreset,
          specGroups: groups, selectedLabels: defaults,
          promoPrice: d.promoPrice ?? undefined,
          promotionName: d.promotionName ?? undefined,
          portionSize: d.portionSize ?? 0,
          stock: d.stock ?? undefined,
          stockEnabled: d.stockEnabled ?? undefined,
        }
      })

      selectedCategoryId.value = categories.value[0]?.id ?? ''

      const targetDishId = route.query.dishId as string
      if (targetDishId) {
        const dish = dishes.value.find((d) => d.id === targetDishId)
        if (dish) selectedCategoryId.value = dish.categoryId
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '菜单加载失败'
    } finally {
      loading.value = false
    }
  }

  watch(loading, async (val) => {
    if (val) return
    const targetDishId = route.query.dishId as string
    if (!targetDishId) return
    const dish = dishes.value.find((d) => d.id === targetDishId)
    if (!dish) return
    await nextTick(); await nextTick()
    highlightDishId.value = targetDishId
    const el = document.getElementById(`dish-${targetDishId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => { highlightDishId.value = '' }, 2000)
  })

  function setupNavObserver() {
    navObserver = new IntersectionObserver(
      ([entry]) => { navFloating.value = !entry.isIntersecting },
      { rootMargin: '-52px 0px 0px 0px' }
    )
    if (navSentinel.value) navObserver.observe(navSentinel.value)
  }

  onMounted(() => {
    void loadData()
    setupNavObserver()
    stockTimer = setInterval(() => { void refreshStocks() }, STOCK_POLL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    navObserver?.disconnect()
    if (stockTimer) { clearInterval(stockTimer); stockTimer = null }
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    loading, errorMessage,
    merchantName, branchName, deviceId, deviceCode, statusText, branchStatus, businessHours, restReason,
    displayTitle, heroImage, categoryIcons,
    categories, dishes, selectedCategoryId, filteredDishes,
    highlightDishId, navFloating, navSentinel,
    qtyGroupIndex, onCustomQty,
  }
}
