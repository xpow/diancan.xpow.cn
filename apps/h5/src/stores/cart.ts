import { reactive, computed } from 'vue'
import type { CartItem } from '@diancan/shared'

const items = reactive<CartItem[]>([])

export function useCart() {
  const totalCount = computed(() => items.reduce((s, i) => s + i.quantity, 0))
  const totalPrice = computed(() => items.reduce((s, i) => s + i.price * i.quantity, 0))

  function add(item: CartItem) {
    const idx = items.findIndex((i) => i.dishId === item.dishId && JSON.stringify(i.specs) === JSON.stringify(item.specs))
    if (idx >= 0) {
      items[idx].quantity += item.quantity
    } else {
      items.push({ ...item })
    }
  }

  function updateQuantity(dishId: string, delta: number) {
    const idx = items.findIndex((i) => i.dishId === dishId)
    if (idx < 0) return
    items[idx].quantity += delta
    if (items[idx].quantity <= 0) items.splice(idx, 1)
  }

  function clear() {
    items.length = 0
  }

  return { items, totalCount, totalPrice, add, updateQuantity, clear }
}
