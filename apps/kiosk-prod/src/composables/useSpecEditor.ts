import { ref } from 'vue'
import { SPECS_PRESETS, type SpecGroup } from '@diancan/shared'
import { saveCart } from '@/utils/cart'
import type { StoredCartItem } from '@/utils/cart'
import type { MenuDish } from './useMenu'

export function useSpecEditor(dishes: { value: MenuDish[] }) {
  const showSpecEditor = ref(false)
  const editingCartItem = ref<StoredCartItem | null>(null)
  const editingSpiciness = ref('微辣')

  function getSpicinessGroup(): SpecGroup | null {
    if (!editingCartItem.value) return null
    const dish = dishes.value.find((d) => d.id === editingCartItem.value!.baseDishId)
    if (!dish?.specsPreset) return null
    const groups = SPECS_PRESETS[dish.specsPreset]
    return groups?.find((g) => g.name === '辣度') || null
  }

  function startEditSpice(item: StoredCartItem) {
    editingCartItem.value = item
    const parts = (item.specs || '').split(' · ')
    editingSpiciness.value = parts[0] || '微辣'
    showSpecEditor.value = true
  }

  function confirmSpiceChange(newSpiciness: string, hydrate: () => void) {
    editingSpiciness.value = newSpiciness
    const item = editingCartItem.value
    if (!item) return
    const parts = (item.specs || '').split(' · ')
    parts[0] = newSpiciness
    const newSpecs = parts.filter((p, i) => i === 0 || (!p.startsWith('x') && !p.endsWith('份'))).join(' · ')
    const newDishId = `${item.baseDishId}|${newSpecs}`
    const cart = JSON.parse(localStorage.getItem('kiosk-cart') || '[]') as StoredCartItem[]
    const existing = cart.find((i: StoredCartItem) => i.dishId === newDishId)
    if (existing) {
      existing.quantity += item.quantity
      const idx = cart.findIndex((i: StoredCartItem) => i.dishId === item.dishId)
      if (idx > -1) cart.splice(idx, 1)
    } else {
      item.dishId = newDishId
      item.specs = newSpecs
    }
    saveCart(cart)
    hydrate()
    showSpecEditor.value = false
    editingCartItem.value = null
  }

  return {
    showSpecEditor, editingCartItem, editingSpiciness,
    getSpicinessGroup, startEditSpice, confirmSpiceChange,
  }
}
