import { ref, computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import 'vant/es/toast/style'
import {
  readCart, clearCart as clearCartStorage,
  saveCart, updateCartQuantity as updateCartQuantityStorage,
  addToCart as addToCartStorage, type StoredCartItem,
} from '@/utils/cart'
import { apiPost } from '@/utils/api'
import type { MenuDish } from './useMenu'

export interface QuoteLineItem {
  dishId: string; name: string; quantity: number
  unitPrice: number; finalUnitPrice: number; finalSubtotal: number
  specs?: string; promotionLabel?: string
}
export interface AppliedPromotion {
  id: string; name: string; discount: number; description: string
}
export interface QuoteResponse {
  quoteId: string
  itemDetails: QuoteLineItem[]
  appliedPromotions: AppliedPromotion[]
  totals: { originalAmount: number; discountAmount: number; payableAmount: number }
  hints: string[]
}

export function useCartQuote(dishes: Ref<MenuDish[]>) {
  const router = useRouter()
  const showCart = ref(false)
  const cartItems = ref<StoredCartItem[]>([])
  const cartQuote = ref<QuoteResponse | null>(null)
  let quoteTimer: ReturnType<typeof setTimeout> | undefined

  const cartCount = computed(() => cartItems.value.reduce((s, i) => s + i.quantity, 0))
  const cartTotal = computed(() => {
    if (cartQuote.value) return cartQuote.value.totals.payableAmount
    return cartItems.value.reduce((t, i) => t + i.price * i.quantity / (i.portionSize || 1), 0)
  })
  const cartDishIds = computed(() => new Set(cartItems.value.map((i) => i.dishId)))

  function hydrateCart() {
    cartItems.value = readCart()
  }

  function quoteItemForDishId(dishId: string) {
    return cartQuote.value?.itemDetails.find((i) => i.dishId === dishId)
  }

  function isItemDiscounted(item: StoredCartItem) {
    const qi = quoteItemForDishId(item.baseDishId)
    return qi ? qi.finalUnitPrice !== qi.unitPrice : !!item.promoPrice
  }

  function getItemOriginalPrice(item: StoredCartItem) {
    const qi = quoteItemForDishId(item.baseDishId)
    return qi ? qi.unitPrice : (item.originalPrice ?? item.price)
  }

  function getItemFinalPrice(item: StoredCartItem) {
    const qi = quoteItemForDishId(item.baseDishId)
    return qi ? qi.finalUnitPrice : item.price
  }

  function cartItemPromotionLabel(item: StoredCartItem) {
    const qi = quoteItemForDishId(item.baseDishId)
    if (qi?.promotionLabel) return qi.promotionLabel
    return item.promotionName || ''
  }

  function highlightAmount(text: string) {
    return text.replace(/(¥)([\d.]+)/g, '<small class="c-sign">$1</small><strong class="hl-amount">$2</strong>')
      .replace(/(满减|折扣|优惠|活动)/g, '<strong class="hl-promo">$1</strong>')
  }

  function getPortionSize(dishId: string): number {
    const baseId = dishId.split('|')[0]
    const dish = dishes.value.find((d) => String(d.id) === String(baseId))
    return dish?.portionSize ?? 0
  }

  function addToCart(dish: MenuDish) {
    const specsParts: string[] = []
    let qty = dish.portionSize || 1
    let priceDelta = 0
    if (dish.selectedLabels) {
      for (let gi = 0; gi < dish.selectedLabels.length; gi++) {
        const val = dish.selectedLabels[gi]
        if (!val) continue
        if (Array.isArray(val)) {
          specsParts.push(val.join('+'))
          const group = dish.specGroups?.[gi]
          if (group) {
            for (const label of val) {
              const opt = group.options.find((o) => o.label === label)
              if (opt?.priceDelta) priceDelta += opt.priceDelta
            }
          }
        } else {
          const groups = dish.specGroups
          if (groups && gi === groups.findIndex((g) => g.name === '串数' || g.name === '份数')) {
            const multiplier = parseInt(val.replace(/^x/i, '').replace(/份$/, '')) || 1
            if (!dish.portionSize) {
              qty = multiplier
            } else {
              qty = dish.portionSize * multiplier
            }
          } else {
            specsParts.push(val)
            const opt = groups?.[gi]?.options.find((o) => o.label === val)
            if (opt?.priceDelta) priceDelta += opt.priceDelta
          }
        }
      }
    }
    const specsKey = specsParts.join(' · ')
    const price = (dish.promoPrice ?? dish.price) + priceDelta

    addToCartStorage({
      dishId: `${dish.id}|${specsKey}`,
      baseDishId: dish.id,
      name: dish.name,
      price,
      quantity: qty,
      specs: specsKey || undefined,
      image: dish.image,
      promoPrice: dish.promoPrice,
      originalPrice: dish.promoPrice ? dish.price : undefined,
      promotionName: dish.promotionName,
      portionSize: dish.portionSize || undefined,
    })

    hydrateCart()
    showToast({ message: '已加入购物车', icon: 'success' })
    debouncedFetchQuote()
  }

  function updateCartQuantity(dishId: string, delta: number) {
    const ps = getPortionSize(dishId)
    const step = ps > 0 ? ps : 1
    updateCartQuantityStorage(dishId, delta * step)
    hydrateCart()
    if (cartItems.value.length === 0) { showCart.value = false; return }
    debouncedFetchQuote()
  }

  function clearCart() {
    clearCartStorage()
    cartItems.value = []
    cartQuote.value = null
    showCart.value = false
  }

  function goCheckout() {
    showCart.value = false
    router.push('/checkout')
  }

  async function fetchQuote() {
    const items = readCart()
    if (!items.length) { cartQuote.value = null; return }
    try {
      cartQuote.value = await apiPost<QuoteResponse>('/api/cart/quote', {
        items: items.map((i) => ({
          dishId: i.baseDishId,
          quantity: i.quantity,
          specs: i.specs ?? '',
          unitPrice: i.price,
        })),
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      if (msg.includes('已下线') || msg.includes('已失效') || msg.includes('未认证')) {
        window.location.href = '/home'
        return
      }
      cartQuote.value = null
    }
  }

  function debouncedFetchQuote() {
    clearTimeout(quoteTimer)
    quoteTimer = setTimeout(fetchQuote, 300)
  }

  return {
    showCart, cartItems, cartQuote, cartCount, cartTotal, cartDishIds,
    hydrateCart, fetchQuote, debouncedFetchQuote,
    quoteItemForDishId, isItemDiscounted, getItemOriginalPrice,
    getItemFinalPrice, cartItemPromotionLabel, highlightAmount,
    addToCart, updateCartQuantity, clearCart, goCheckout,
  }
}
