export interface StoredCartItem {
  dishId: string
  baseDishId: string
  name: string
  price: number
  quantity: number
  specs?: string
  image?: string
  promotionId?: string
  promoPrice?: number
  originalPrice?: number
  promotionName?: string
  portionSize?: number
}

const CART_STORAGE_KEY = 'diancan-kiosk-cart'

export function readCart(): StoredCartItem[] {
  const raw = localStorage.getItem(CART_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as StoredCartItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item.dishId && item.quantity > 0)
  } catch {
    return []
  }
}

export function saveCart(items: StoredCartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

export function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY)
}

export function upsertCartItem(dishId: string, quantity: number) {
  const cart = readCart()
  const existingItem = cart.find((item) => item.dishId === dishId)
  
  if (existingItem) {
    if (quantity > 0) {
      existingItem.quantity = quantity
    } else {
      const idx = cart.indexOf(existingItem)
      if (idx > -1) cart.splice(idx, 1)
    }
  } else if (quantity > 0) {
    // New item - need full info, caller should use addToCart instead
    return cart
  }
  
  saveCart(cart)
  return cart
}

export function addToCart(item: StoredCartItem) {
  const cart = readCart()
  const existingItem = cart.find((i) => i.dishId === item.dishId)
  
  if (existingItem) {
    existingItem.quantity += item.quantity
  } else {
    cart.push(item)
  }
  
  saveCart(cart)
  return cart
}

export function updateCartQuantity(dishId: string, delta: number) {
  const cart = readCart()
  const item = cart.find((i) => i.dishId === dishId)
  
  if (item) {
    item.quantity += delta
    if (item.quantity <= 0) {
      const idx = cart.indexOf(item)
      if (idx > -1) cart.splice(idx, 1)
    }
    saveCart(cart)
  }
  
  return cart
}

export function removeCartItem(dishId: string) {
  const cart = readCart()
  const idx = cart.findIndex((i) => i.dishId === dishId)
  if (idx > -1) {
    cart.splice(idx, 1)
    saveCart(cart)
  }
  return cart
}
