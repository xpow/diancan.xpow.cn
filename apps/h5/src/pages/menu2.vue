<template>
  <div class="menu2">
    <header class="top-bar">
      <div class="top-left">
        <span class="material-symbols-outlined top-icon">restaurant_menu</span>
        <h1 class="top-title">Sizzling Skewers</h1>
      </div>
      <div class="top-right">
        <router-link to="/pickup" class="ticket-btn">
          <span class="material-symbols-outlined">receipt_long</span>
          <span v-if="hasActiveOrder" class="badge-dot">1</span>
        </router-link>
      </div>
    </header>

    <div class="full-banner">
      <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqeOFCkRe-ogyZt9msUQ8Y95II2FqNwreGxURp0gftRhut7fp02ds1uGhH2n9Hfy7jwfBZ6FkCv-ZrKn00gAWI5ZGloBSZeHo0uKw7_BJLkcnDb-KXhzUQ78LGrQu0zvEK6MgNNiNEHA36xrQqcjz9Jhkljxce61HcqfdGXgVKzv86mnyOFAn-RpNOxeI9l2BCjYE3cJr_iVjLKBanRGPlKsDiICSgw3sEcEiTI2i8tlJED4hLAA1S7a4kM-2aN4mXfY-bAO-G_GI" alt="banner" class="full-banner-img" />
      <div class="full-banner-overlay">
        <span class="banner-tag">今日推荐</span>
        <h2 class="banner-title">招牌秘制羊肉串</h2>
      </div>
    </div>

    <main class="main-layout">
      <aside class="sidebar">
        <a v-for="cat in categories" :key="cat.id"
          :class="['cat-link', activeCat === cat.id && 'cat-active']"
          @click="activeCat = cat.id">
          <span class="material-symbols-outlined cat-icon">{{ cat.icon }}</span>
          <span class="cat-label">{{ cat.name }}</span>
        </a>
      </aside>

      <section class="content">
        <div class="section-header">
          <h3 class="cat-title">{{ currentCat?.name || '' }}</h3>
          <span class="cat-en">{{ currentCat?.en || '' }}</span>
        </div>

        <div v-for="dish in filteredDishes" :key="dish.id" class="dish-card">
          <div class="dish-row">
            <div class="dish-img">
              <img :src="dish.image" :alt="dish.name" class="dish-img-el" />
            </div>
            <div class="dish-body">
              <h4 class="dish-name">{{ dish.name }}</h4>
              <p class="dish-desc">{{ dish.desc }}</p>
              <div class="dish-price-row">
                <span class="dish-price">{{ dish.price }}</span>
                <span v-if="dish.promotionId" class="dish-promo-tag">福利 ¥{{ dish.promoPrice?.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="dish-specs" v-if="dish.specs">
            <div class="spec-row">
              <div class="spec-group" v-if="dish.specs.spice">
                <p class="spec-label">口感选择</p>
                <div class="spec-options">
                  <button v-for="opt in dish.specs.spice" :key="opt"
                    :class="['spec-chip', dish.selectedSpice === opt && 'chip-active']"
                    @click="dish.selectedSpice = opt">{{ opt }}</button>
                </div>
              </div>
            </div>
            <div class="spec-group" v-if="dish.specs.qty">
              <p class="spec-label">数量选择</p>
              <div class="spec-options">
                <button v-for="opt in dish.specs.qty" :key="opt"
                  :class="['spec-chip', dish.selectedQty === opt && 'chip-active']"
                  @click="dish.selectedQty = opt">{{ opt }}</button>
                <input class="qty-input" type="number" placeholder="其他数量"
                  @input="dish.selectedQty = ($event.target as HTMLInputElement).value + '串'" />
              </div>
            </div>
          </div>

          <button class="add-card-btn" @click="addToCart(dish)">
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
      </section>
    </main>

    <div v-if="totalCount > 0" class="cart-floating" @click="showCart = true">
      <div class="cart-glass">
        <div class="cart-glass-left">
          <div class="cart-icon-box">
            <span class="material-symbols-outlined cart-basket">shopping_basket</span>
            <span class="cart-badge">{{ totalCount }}</span>
          </div>
          <div class="cart-glass-info">
            <span class="cart-glass-label">合计金额</span>
            <span class="cart-glass-price">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
        </div>
        <button class="cart-glass-btn" @click.stop="goCheckout">去结算</button>
      </div>
    </div>

    <van-action-sheet v-model:show="showCart" close-on-popup-close>
      <div class="cart-sheet">
        <div class="cart-sheet-header">
          <span class="cart-sheet-title">购物车</span>
          <button v-if="items.length" class="clear-btn" @click="clearCart">
            <span class="material-symbols-outlined">delete</span>
            清空
          </button>
        </div>
        <div v-for="item in items" :key="item.dishId" class="cart-item-row">
          <div class="cart-item-info">
            <p class="cart-item-name">{{ item.name }}</p>
            <p class="cart-item-spec" v-if="item.specs">{{ item.specs }}</p>
            <p class="cart-item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</p>
          </div>
          <div class="cart-qty">
            <button class="qty-btn" @click="updateQuantity(item.dishId, -1)">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <span class="qty-num">{{ item.quantity }}</span>
            <button class="qty-btn" @click="updateQuantity(item.dishId, 1)">
              <span class="material-symbols-outlined">add</span>
            </button>
            <button class="delete-btn" @click="removeItem(item.dishId)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        <div v-if="items.length === 0" class="cart-empty">购物车是空的</div>
        <div class="cart-bottom-bar">
          <span class="cart-total-label">合计：<span class="cart-total-price">¥{{ totalPrice.toFixed(2) }}</span></span>
          <button class="checkout-btn" @click="goCheckout">确认下单</button>
        </div>
      </div>
    </van-action-sheet>

    <nav class="bottom-nav">
      <router-link to="/home" class="nav-item">
        <span class="material-symbols-outlined">home</span>
        <span class="nav-label">Home</span>
      </router-link>
      <router-link to="/menu2" class="nav-item nav-active">
        <span class="material-symbols-outlined">outdoor_grill</span>
        <span class="nav-label">Menu</span>
      </router-link>
      <router-link to="/pickup" class="nav-item">
        <span class="material-symbols-outlined">confirmation_number</span>
        <span class="nav-label">取餐</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '@/stores/cart'
import { showToast } from 'vant'
import 'vant/es/toast/style'

const router = useRouter()
const { items, totalCount, totalPrice, add: cartAdd, updateQuantity, clear: clearCart } = useCart()
const showCart = ref(false)
const activeCat = ref('')
const hasActiveOrder = ref(!!localStorage.getItem('currentOrder'))

interface DishSpecs {
  spice?: string[]
  qty?: string[]
}

interface DishItem {
  id: string
  apiDishId?: string
  categoryId: string
  name: string
  price: string
  desc: string
  image: string
  specs?: DishSpecs
  selectedSpice?: string
  selectedQty?: string
  rawPrice?: number
  promoPrice?: number
  promotionId?: string
  promotionItemId?: string
  limitType?: string
  maxQty?: number
}

interface CategoryItem {
  id: string
  name: string
  en: string
  icon: string
}

interface PromoItem {
  id: string
  dishId: string
  promoPrice: number
  limitType: string
  maxQty: number
}

interface Promotion {
  id: string
  name: string
  type: string
  status: string
  items: PromoItem[]
}

const categories = ref<CategoryItem[]>([])

const CAT_ICON_MAP: Record<string, string> = {
  '肉串': 'kebab_dining',
  '素菜': 'eco',
  '饮品': 'local_bar',
}

function catIcon(name: string): string {
  for (const [key, icon] of Object.entries(CAT_ICON_MAP)) {
    if (name.includes(key)) return icon
  }
  return 'restaurant_menu'
}

const DISH_IMAGES: Record<string, string> = {
  'dish-01': '/src/assets/images/yrc-s1.jpg?raw=true',
  'dish-02': '/src/assets/images/yrc-x.webp?raw=true',
  'dish-03': '/src/assets/images/hlyrc.jpg?raw=true',
  'dish-04': '/src/assets/images/nlt.jpg?raw=true',
  'dish-05': '/src/assets/images/kqs.webp?raw=true',
  'dish-06': '/src/assets/images/kqz.jpg?raw=true',
  'dish-07': '/src/assets/images/kjc.jpg?raw=true',
  'dish-08': '/src/assets/images/kqz.jpg?raw=true',
  'dish-09': '/src/assets/images/kym.jpg?raw=true',
  'dish-10': '/src/assets/images/smt.jpg?raw=true',
  'dish-11': '/src/assets/images/sdmmc.webp?raw=true',
  'dish-12': '/src/assets/images/kqs.webp?raw=true',
}

const IMG_LAMB = '/src/assets/images/yrc-s1.jpg?raw=true'
const IMG_LAMB_BIG = '/src/assets/images/yrc-x.webp?raw=true'
const IMG_LAMB_HL = '/src/assets/images/hlyrc.jpg?raw=true'
const IMG_NLT = '/src/assets/images/nlt.jpg?raw=true'
const IMG_LEMON = '/src/assets/images/sdmmc.webp?raw=true'
const IMG_SMT = '/src/assets/images/smt.jpg?raw=true'
const IMG_KQS = '/src/assets/images/kqs.webp?raw=true'

const SPECS_PRESETS: Record<string, { spice: string[]; qty: string[] }> = {
  bbq: { spice: ['原味', '微辣', '加辣'], qty: ['1份', '2份', '3份', '5份'] },
  none: { spice: [], qty: [] },
}

function initDish(data: Omit<DishItem, 'selectedSpice' | 'selectedQty'>): DishItem {
  return {
    ...data,
    selectedSpice: data.specs?.spice?.[0],
    selectedQty: data.specs?.qty?.[0],
  }
}

const dishes = ref<DishItem[]>([])

interface ApiDish {
  id: string
  name: string
  price: number
  image: string | null
  desc: string | null
  categoryId: string
  specsPreset: string
  category: { id: string; name: string; sort: number }
}

interface ApiPromotion {
  id: string
  type: string
  items: { id: string; dishId: string; promoPrice: number; limitType: string; maxQty: number }[]
}

const currentCat = computed(() => categories.value.find((c) => c.id === activeCat.value))
const filteredDishes = computed(() => dishes.value.filter((d) => d.categoryId === activeCat.value))

function addToCart(dish: DishItem) {
  const unitPrice = parseFloat(dish.price.replace('¥', ''))
  const price = dish.promotionId ? dish.promoPrice! : unitPrice
  const specsParts: string[] = []
  if (dish.selectedSpice) specsParts.push(dish.selectedSpice)
  if (dish.selectedQty) specsParts.push(dish.selectedQty)
  const specsKey = specsParts.join(' · ')
  const qty = dish.selectedQty ? parseInt(dish.selectedQty) || 1 : 1
  const baseDishId = dish.apiDishId || dish.id
  const cartKey = `${baseDishId}|${specsKey}`

  if (dish.promotionId && dish.maxQty) {
    if (dish.limitType === 'per_order') {
      const existing = items
        .filter((i: any) => i.promotionId === dish.promotionId && (i.baseDishId || i.dishId?.split('|')[0]) === baseDishId)
        .reduce((s: number, i: any) => s + i.quantity, 0)
      if (existing + qty > dish.maxQty) {
        showToast(`该福利单品限购 ${dish.maxQty} 份`)
        return
      }
    }
    if (dish.limitType === 'global_promo') {
      const existing = items
        .filter((i: any) => i.promotionId === dish.promotionId)
        .reduce((s: number, i: any) => s + i.quantity, 0)
      if (existing + qty > dish.maxQty) {
        showToast(`该福利活动限购 ${dish.maxQty} 份`)
        return
      }
    }
  }

  cartAdd({
    dishId: cartKey,
    baseDishId,
    name: dish.name + (dish.promotionId ? ' (福利)' : ''),
    price,
    quantity: qty,
    specs: specsKey || undefined,
    originalPrice: dish.promotionId ? unitPrice : undefined,
    promotionId: dish.promotionId,
    promotionItemId: dish.promotionItemId,
    promoPrice: dish.promoPrice,
    limitType: dish.limitType,
  } as any)
  showToast('已加入购物车')
}

function removeItem(dishId: string) {
  updateQuantity(dishId, -999)
  if (items.length === 0) showCart.value = false
}

function goCheckout() {
  showCart.value = false
  router.push('/checkout')
}

const promotions = ref<Promotion[]>([])

function applyPromotions() {
  for (const promo of promotions.value) {
    if (promo.type !== 'welfare_item') continue
    for (const pi of promo.items) {
      const match = dishes.value.find((d) => d.apiDishId === pi.dishId) ||
        dishes.value.find((d) => d.name.includes(nameFromId(pi.dishId)))
      if (match) {
        match.promotionId = promo.id
        match.promotionItemId = pi.id
        match.promoPrice = pi.promoPrice
        match.limitType = pi.limitType
        match.maxQty = pi.maxQty
      }
    }
  }
}

function nameFromId(id: string): string {
  const map: Record<string, string> = { 'dish-07': '烤韭菜', 'dish-08': '烤金针菇' }
  return map[id] || id
}

onMounted(async () => {
  try {
    fetch('/api/orders?branchId=demo-branch&status=preparing&limit=1')
      .then(r => r.json())
      .then(list => { if (list.length) hasActiveOrder.value = true })
      .catch(() => {})
    fetch('/api/orders?branchId=demo-branch&status=pending&limit=1')
      .then(r => r.json())
      .then(list => { if (list.length) hasActiveOrder.value = true })
      .catch(() => {})

    const [dishRes, promoRes] = await Promise.all([
      fetch('/api/dishes'),
      fetch('/api/promotions?merchantId=demo-merchant&status=active'),
    ])
    const apiDishes: ApiDish[] = await dishRes.json()
    const apiPromos: ApiPromotion[] = await promoRes.json()

    const catMap = new Map<string, { id: string; name: string; sort: number }>()
    for (const d of apiDishes) {
      if (d.category && !catMap.has(d.category.id)) {
        catMap.set(d.category.id, { id: d.category.id, name: d.category.name, sort: d.category.sort })
      }
    }
    const sorted = [...catMap.values()].sort((a, b) => a.sort - b.sort)
    categories.value = sorted.map((c) => ({ id: c.id, name: c.name, en: '', icon: catIcon(c.name) }))
    if (categories.value.length) activeCat.value = categories.value[0].id

    promotions.value = apiPromos

    for (const d of apiDishes) {
      const preset = SPECS_PRESETS[d.specsPreset] || SPECS_PRESETS.none
      let image = d.image || DISH_IMAGES[d.id] || ''
      if (!image) {
        if (d.category?.name?.includes('肉串')) image = IMG_LAMB
        else if (d.category?.name?.includes('饮')) image = d.id === 'dish-10' ? IMG_SMT : d.id === 'dish-11' ? IMG_LEMON : IMG_KQS
        else image = '/src/assets/images/kqz.jpg?raw=true'
      }
      dishes.value.push(initDish({
        id: d.id,
        apiDishId: d.id,
        categoryId: d.categoryId,
        name: d.name,
        price: `¥${d.price}.00`,
        desc: d.desc || '',
        image,
        specs: { spice: preset.spice.length ? preset.spice : undefined, qty: preset.qty.length ? preset.qty : undefined },
      }))
    }

    applyPromotions()
  } catch {
    showToast('加载失败')
  }
})
</script>

<style scoped>
.menu2 {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #fcf9f8;
  overflow: hidden;
}

/* Top Bar */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(252, 249, 248, 0.8);
  backdrop-filter: blur(12px);
  z-index: 50;
  flex-shrink: 0;
}
.top-left { display: flex; align-items: center; gap: 8px; }
.top-icon { color: #ff6b00; font-size: 24px; }
.top-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 700; color: #ff6b00; text-transform: uppercase; letter-spacing: -0.02em; margin: 0; }
.ticket-btn {
  position: relative; width: 40px; height: 40px; border-radius: 50%;
  border: none; background: transparent; display: flex; align-items: center;
  justify-content: center; cursor: pointer; color: #1c1b1b; text-decoration: none;
}
.badge-dot {
  position: absolute; top: 4px; right: 4px; width: 10px; height: 10px;
  border-radius: 50%; background: #ba1a1a; border: 2px solid #fff;
}

/* Full-width Banner */
.full-banner {
  position: relative; width: 100%; height: 140px;
  flex-shrink: 0; overflow: hidden;
}
.full-banner-img { width: 100%; height: 100%; object-fit: cover; }
.full-banner-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 60%);
  display: flex; flex-direction: column; justify-content: flex-end; padding: 16px;
}
.banner-tag {
  align-self: flex-start; background: #ff6b00; color: #fff;
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-bottom: 4px;
}
.banner-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: #fff; margin: 0; }

/* Main Layout */
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 96px;
  flex-shrink: 0;
  background: #f6f3f2;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  overflow-y: auto;
  border-right: 1px solid rgba(226, 191, 176, 0.3);
}
.cat-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 8px;
  text-decoration: none;
  color: #5e5e5c;
  cursor: pointer;
  border-right: 4px solid transparent;
  transition: all 0.15s;
}
.cat-link:active { transform: scale(0.95); }
.cat-active {
  color: #a04100;
  background: rgba(255, 107, 0, 0.08);
  border-right-color: #a04100;
}
.cat-icon { font-size: 24px; margin-bottom: 4px; }
.cat-label { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600; text-align: center; line-height: 1.2; }

/* Content */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 100px;
}

.section-header { margin-bottom: 12px; display: flex; align-items: baseline; gap: 8px; }
.cat-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 700; margin: 0; color: #1c1b1b; }
.cat-en { font-size: 14px; color: #5e5e5c; font-weight: 400; }

/* Dish Card */
.dish-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(226, 191, 176, 0.2);
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  position: relative;
}
.dish-row { display: flex; gap: 12px; }
.dish-img { width: 96px; height: 96px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.dish-img-el { width: 100%; height: 100%; object-fit: cover; background: #e5e2e1; }
.dish-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.dish-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; margin: 0; }
.dish-desc { font-size: 13px; color: #5e5e5c; margin: 0; line-height: 1.3; }
.dish-price-row { display: flex; align-items: center; gap: 8px; margin-top: auto; }
.dish-price { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #a04100; line-height: 1; }
.dish-promo-tag {
  padding: 1px 6px; border-radius: 4px; background: #ba1a1a; color: #fff;
  font-size: 10px; font-weight: 700; white-space: nowrap;
}

/* Specs */
.dish-specs { display: flex; flex-direction: column; gap: 6px; }
.spec-group { margin-bottom: 2px; }
.spec-label { font-size: 12px; font-weight: 600; color: #5e5e5c; margin: 0 0 4px; }
.spec-options { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.spec-chip {
  padding: 4px 12px; border-radius: 9999px; border: 1px solid #e2bfb0;
  background: #fff; font-size: 12px; color: #5e5e5c; cursor: pointer;
  transition: all 0.15s; font-family: inherit;
}
.spec-chip:active { transform: scale(0.95); }
.chip-active {
  background: #ff6b00; color: #fff; border-color: #ff6b00; font-weight: 700;
}
.qty-input {
  width: 60px; padding: 4px 8px; border-radius: 9999px; border: 1px solid #e2bfb0;
  font-size: 12px; text-align: center; outline: none; font-family: inherit;
}
.qty-input:focus { border-color: #ff6b00; }

/* Add Button */
.add-card-btn {
  position: absolute; right: 12px; bottom: 12px;
  width: 36px; height: 36px; border-radius: 50%;
  border: none; background: #ff6b00; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3);
  transition: transform 0.15s;
}
.add-card-btn:active { transform: scale(0.9); }
.add-card-btn .material-symbols-outlined { font-size: 20px; }

/* Cart Floating */
.cart-floating {
  position: fixed; bottom: 64px; left: 12px; right: 12px; z-index: 100;
}
.cart-glass {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255,255,255,0.9); backdrop-filter: blur(12px);
  border-radius: 16px; padding: 12px 12px 12px 16px;
  box-shadow: 0 8px 20px rgba(255, 107, 0, 0.15);
  border: 1px solid rgba(255, 107, 0, 0.1); cursor: pointer;
}
.cart-glass-left { display: flex; align-items: center; gap: 12px; }
.cart-icon-box { position: relative; }
.cart-basket { font-size: 32px; color: #a04100; }
.cart-badge {
  position: absolute; top: -4px; right: -4px; background: #ba1a1a; color: #fff;
  font-size: 10px; font-weight: 700; min-width: 20px; height: 20px;
  border-radius: 9999px; display: flex; align-items: center; justify-content: center;
  padding: 0 4px; border: 2px solid #fff;
}
.cart-glass-info { display: flex; flex-direction: column; }
.cart-glass-label { font-size: 10px; font-weight: 700; color: #5e5e5c; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1; }
.cart-glass-price { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #a04100; line-height: 1.4; }
.cart-glass-btn {
  background: #ff6b00; color: #fff; border: none; border-radius: 9999px;
  padding: 12px 24px; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 700; cursor: pointer; transition: transform 0.15s;
  box-shadow: 0 4px 8px rgba(255, 107, 0, 0.2);
}
.cart-glass-btn:active { transform: scale(0.95); }

/* Cart Sheet */
.cart-sheet { padding: 16px; }
.cart-sheet-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.cart-sheet-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; }
.clear-btn {
  display: flex; align-items: center; gap: 4px; padding: 6px 12px;
  border: 1px solid #e2bfb0; border-radius: 9999px; background: #fff;
  font-size: 12px; color: #5e5e5c; cursor: pointer; font-family: inherit;
}
.clear-btn .material-symbols-outlined { font-size: 16px; }
.cart-item-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; border-bottom: 1px solid #e5e2e1;
}
.cart-item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.cart-item-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 600; margin: 0; }
.cart-item-spec { font-size: 12px; color: #5e5e5c; margin: 0; }
.cart-item-price { font-size: 14px; font-weight: 700; color: #a04100; margin: 0; }
.cart-qty { display: flex; align-items: center; gap: 8px; }
.qty-btn {
  width: 28px; height: 28px; border-radius: 50%; border: 1px solid #e2bfb0;
  background: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #5e5e5c;
}
.qty-btn:active { background: #e5e2e1; }
.qty-btn .material-symbols-outlined { font-size: 16px; }
.qty-num { font-size: 14px; font-weight: 600; min-width: 20px; text-align: center; }
.delete-btn {
  width: 28px; height: 28px; border-radius: 50%; border: none;
  background: transparent; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #ba1a1a;
}
.cart-empty { text-align: center; padding: 32px; color: #5e5e5c; font-size: 14px; }
.cart-bottom-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; margin-top: 8px;
}
.cart-total-label { font-size: 14px; font-weight: 600; }
.cart-total-price { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #a04100; }
.checkout-btn {
  background: #ff6b00; color: #fff; border: none; border-radius: 9999px;
  padding: 12px 32px; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 700; cursor: pointer;
}
.checkout-btn:active { transform: scale(0.95); }

/* Bottom Nav */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
  display: flex; justify-content: space-around; align-items: center;
  padding: 8px 12px; padding-bottom: max(8px, env(safe-area-inset-bottom));
  background: rgba(252,249,248,0.95); backdrop-filter: blur(12px);
  border-radius: 12px 12px 0 0; box-shadow: 0 -4px 12px rgba(0,0,0,0.04);
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 4px 16px; text-decoration: none; color: #5e5e5c;
  transition: all 0.15s; gap: 2px;
}
.nav-active {
  background: rgba(255, 107, 0, 0.1); color: #572000;
  border-radius: 9999px; padding: 4px 16px;
}
.nav-item .material-symbols-outlined { font-size: 24px; }
.nav-label { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600; }
</style>
