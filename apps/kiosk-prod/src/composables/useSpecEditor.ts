import { ref, computed } from 'vue'
import type { SpecGroup } from '@diancan/shared'
import { saveCart } from '@/utils/cart'
import type { StoredCartItem } from '@/utils/cart'
import type { MenuDish } from './useMenu'

export function useSpecEditor(dishes: { value: MenuDish[] }) {
  const showSpecEditor = ref(false)
  const editingCartItem = ref<StoredCartItem | null>(null)
  const editingSpecGroups = ref<SpecGroup[]>([])
  const editingSelections = ref<(string | string[])[]>([])

  const editingDish = computed(() => {
    if (!editingCartItem.value) return null
    return dishes.value.find((d) => String(d.id) === String(editingCartItem.value!.baseDishId)) || null
  })

  function parseSpecs(specs: string, groups: SpecGroup[]): (string | string[])[] {
    const parts = (specs || '').split(' · ')
    return groups.map((g, i) => {
      if (!g || !g.options) return ''
      if (g.type === 'multi') {
        const multiVal = parts[i] ? parts[i].split('+') : []
        return multiVal.length ? multiVal : [g.options[0]?.label].filter(Boolean)
      }
      return parts[i] || g.options[0]?.label || ''
    })
  }

  function extractMultiplier(selections: (string | string[])[], groups: SpecGroup[]): number {
    const qi = groups.findIndex((g) => g.name === '串数' || g.name === '份数')
    if (qi === -1) return 1
    const val = selections[qi]
    if (typeof val !== 'string') return 1
    return parseInt(val.replace(/^x/i, '').replace(/份$/, '')) || 1
  }

  function startEditSpice(item: StoredCartItem) {
    try {
      const dish = dishes.value.find((d) => String(d.id) === String(item.baseDishId))
      const groups = dish?.specGroups
      if (!Array.isArray(groups) || groups.length === 0) return
      editingCartItem.value = item
      editingSpecGroups.value = JSON.parse(JSON.stringify(groups))
      editingSelections.value = parseSpecs(item.specs || '', editingSpecGroups.value)
      showSpecEditor.value = true
    } catch (e) {
      console.error('startEditSpice error', e)
    }
  }

  function confirmSpiceChange(hydrate: () => void, refreshQuote?: () => void) {
    const item = editingCartItem.value
    const groups = editingSpecGroups.value
    const selections = editingSelections.value
    if (!item || !groups.length) return

    const portionFactor = editingDish.value?.portionSize || 1
    const oldMultiplier = extractMultiplier(parseSpecs(item.specs || '', groups), groups)
    const newMultiplier = extractMultiplier(selections, groups)
    const baseCount = Math.round(item.quantity / (portionFactor * oldMultiplier)) || 1
    const newQty = baseCount * portionFactor * newMultiplier

    const specsParts: string[] = []
    for (let gi = 0; gi < groups.length; gi++) {
      const val = selections[gi]
      if (!val) continue
      if (Array.isArray(val)) {
        specsParts.push(val.join('+'))
      } else if (groups[gi].name !== '串数' && groups[gi].name !== '份数') {
        specsParts.push(val)
      }
    }

    const newSpecs = specsParts.join(' · ')
    const newDishId = `${item.baseDishId}|${newSpecs}`

    let priceDelta = 0
    for (let gi = 0; gi < groups.length; gi++) {
      const val = selections[gi]
      if (!val) continue
      if (Array.isArray(val)) {
        for (const label of val) {
          const opt = groups[gi].options.find((o) => o.label === label)
          if (opt?.priceDelta) priceDelta += opt.priceDelta
        }
      } else {
        const opt = groups[gi].options.find((o) => o.label === val)
        if (opt?.priceDelta) priceDelta += opt.priceDelta
      }
    }

    const cart = JSON.parse(localStorage.getItem('kiosk-cart') || '[]') as StoredCartItem[]
    const existing = cart.find((i) => i.dishId === newDishId && i.baseDishId === item.baseDishId)
    if (existing) {
      existing.quantity += newQty
      const idx = cart.findIndex((i) => i.dishId === item.dishId)
      if (idx > -1) cart.splice(idx, 1)
    } else {
      const idx = cart.findIndex((i) => i.dishId === item.dishId && i.baseDishId === item.baseDishId)
      if (idx > -1) {
        cart[idx].dishId = newDishId
        cart[idx].specs = newSpecs
        cart[idx].price = (editingDish.value?.promoPrice ?? editingDish.value?.price ?? 0) + priceDelta
        cart[idx].quantity = newQty
      }
    }
    saveCart(cart)
    hydrate()
    refreshQuote?.()
    showSpecEditor.value = false
    editingCartItem.value = null
  }

  return {
    showSpecEditor, editingCartItem,
    editingSpecGroups, editingSelections,
    startEditSpice, confirmSpiceChange,
  }
}
