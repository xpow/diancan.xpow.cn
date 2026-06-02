<template>
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

  <main>
    <div class="featured-banner">
      <div class="banner-img">
        <img src="@/assets/images/yrc-s.jpg?raw=true" alt="招牌秘制羊肉串" class="banner-img-el" />
        <div class="banner-overlay">
          <span class="banner-tag">今日推荐</span>
          <h2 class="banner-title">招牌秘制羊肉串</h2>
        </div>
      </div>
    </div>

    <nav class="category-nav">
      <a v-for="cat in categories" :key="cat.id" :class="['cat-pill', activeCat === cat.id && 'cat-active']"
        @click="activeCat = cat.id">
        {{ cat.name }}
      </a>
    </nav>

    <div class="dishes-section">
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
            <span class="dish-price">{{ dish.price }}</span>
            <span v-if="dish.promotionId" class="dish-promo-tag">福利 ¥{{ dish.promoPrice?.toFixed(2) }}</span>
          </div>
        </div>

        <div class="dish-specs" v-if="dish.specs">
          <div class="spec-row">
            <div class="spec-group" v-if="dish.specs.spice">
              <p class="spec-label">口感选择</p>
              <div class="spec-options">
                <button v-for="opt in dish.specs.spice" :key="opt"
                  :class="['spec-chip', dish.selectedSpice === opt && 'chip-active']" @click="dish.selectedSpice = opt">{{
                  opt }}</button>
              </div>
            </div>
          </div>
          <div class="spec-group" v-if="dish.specs.qty">
            <p class="spec-label">数量选择</p>
            <div class="spec-options">
              <button v-for="opt in dish.specs.qty" :key="opt"
                :class="['spec-chip', dish.selectedQty === opt && 'chip-active']" @click="dish.selectedQty = opt">{{ opt
                }}</button>
              <input class="qty-input" type="number" placeholder="其他数量"
                @input="dish.selectedQty = ($event.target as HTMLInputElement).value + '串'" />
            </div>
          </div>
        </div>

        <button class="add-card-btn" @click="addToCart(dish)">
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '@/stores/cart'
import { showToast } from 'vant'
import 'vant/es/toast/style'

interface DishSpecs {
  spice?: string[]
  qty?: string[]
}

interface DishItem {
  id: string
  categoryId: string
  name: string
  price: string
  desc: string
  image: string
  specs?: DishSpecs
  selectedSpice?: string
  selectedQty?: string
  rawPrice?: number // for promo display
  promoPrice?: number
  promotionId?: string
  limitType?: string
  maxQty?: number
}

interface CategoryItem {
  id: string
  name: string
  en: string
}

interface PromoItem {
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

interface CategoryItem {
  id: string
  name: string
  en: string
}

const router = useRouter()
const { items, totalCount, totalPrice, add: cartAdd, updateQuantity, clear: clearCart } = useCart()
const showCart = ref(false)
const activeCat = ref('meat')
const hasActiveOrder = ref(!!localStorage.getItem('currentOrder'))

const categories = ref<CategoryItem[]>([
  { id: 'meat', name: '肉串类', en: 'Meat Skewers' },
  { id: 'veg', name: '素菜类', en: 'Vegetables' },
  { id: 'drinks', name: '冰镇饮品', en: 'Drinks' },
])

const IMG_LAMB = '/src/assets/images/yrc-s1.jpg?raw=true'
const IMG_LAMB_BIG = '/src/assets/images/yrc-x.webp?raw=true'
const IMG_LAMB_HL = '/src/assets/images/hlyrc.jpg?raw=true'
const IMG_NLT = '/src/assets/images/nlt.jpg?raw=true' 

const IMG_CHICKEN = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNi2StZSK00ik7rR2-C-8XBhO5E1QGB_pMY5iSavlhvyqo3dgJzgARlkxLLTY3gLfALOMP3WFFPLWLo430ltudUTgyhRkjh4sTeRKY3YNimXqGNhnxpqqNI6ri5LItfhM4623iuVdazjEXGPpTs0HU2QkeFsE_-NoV4bFdWcfjer6NLT50UA-UzRqGFVjSXUTboJGhygNl8m0jtiD82dtgwIbPZGUSKx27P0SrbbUhVMYFTTBF6cZVeZNssfgTdz0Kza-4LrJ5KpQ'
const IMG_WAGYU = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHKY4HaXrtm2lGXl2U69VRg4rKSyTSzuEdhRntKPvyU5Kx_GaaEKHD5lAwU3ovLy11pitZ-wnIpF3RRINOnzSnXRBvut1sSnU1JkKfCGnRyKvrrk59Gy3sZQlQCZQnpRiHbI6qToVvuXDcCUbNcqzuNoevYEKAvKtT0gL33D5Z77Vi_vsEFkOmWDDcGrXhLlfI-ElGN20NGNcN2bz19mNFwcwi50yVEOW344TZzLOITI5p_j6uiqOpwal8WNJb4TndAO7khGJArrs'
const IMG_SQUID = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJMlNVLhJTApxtpMnLp2Wx0KyWNInkhp4XfUxh8EhWGvN_af2wzcAilSuYPmx1tcItHhNQsE5ONyF6Cwtc2hBzjvccviMUkenV5mTLtm5Ae6evTj-gJndEsQkyF3jXACPVCXHRDR2RYuVwY0OZeXVGi8zgRTaWNuKzVP71J28yJO_Q7HQ7ETOnP2wY-Z-FlFb6ZdXUBUUXgAzD0AqMnIem1hkVgBkA1wSHgpyRlS7phcKkx8l79vp8dng9-joPcnv_ESoBHIIxWRM'
const IMG_LEMON = '/src/assets/images/sdmmc.webp?raw=true'
const IMG_SMT = '/src/assets/images/smt.jpg?raw=true'
const IMG_KQS = '/src/assets/images/kqs.webp?raw=true'



function initDish(data: Omit<DishItem, 'selectedSpice' | 'selectedQty'>): DishItem {
  return {
    ...data,
    selectedSpice: data.specs?.spice?.[0],
    selectedQty: data.specs?.qty?.[0],
  }
}

const dishes = ref<DishItem[]>([
  initDish({ id: 'd1000', categoryId: 'meat', name: '羊肉串 (10元/3串)', price: '¥10.00', desc: '肥瘦相间，孜然风味，必点', image: IMG_LAMB, specs: { spice: ['原味', '微辣', '加辣'], qty: ['1份(3串)', '2份(6串)', '3份(9串)', '5份(15串)'] } }),
  initDish({ id: 'd1010', categoryId: 'meat', name: '羊肉串 (大)', price: '¥6.00', desc: '外焦里嫩，肥而不腻', image: IMG_LAMB_BIG, specs: { spice: ['原味', '微辣', '加辣'], qty: ['5串', '10串', '15串', '20串', '30串', '50串'] } }),
  initDish({ id: 'd1011', categoryId: 'meat', name: '红柳羊肉串 (大)', price: '¥12.00', desc: '柳香清新，肥瘦适当，大串满足感超强', image: IMG_LAMB_HL, specs: { spice: ['原味', '微辣', '加辣'], qty: ['2串', '4串', '6串', '8串', '10串'] } }),
  initDish({ id: 'd1012', categoryId: 'meat', name: '安格斯牛肋条 (进口高品质)', price: '¥20.00', desc: '雪花饱满，奶香十足，入口即化，一次即满足', image: IMG_NLT, specs: { spice: ['原味', '微辣', '加辣'], qty: ['5串', '10串', '15串', '20串'] } }),
  initDish({ id: 'd2000', categoryId: 'veg', name: '烤茄子', price: '¥6.00', desc: '蒜香四溢，软糯入味', image: '/src/assets/images/kqz.jpg?raw=true', specs: { spice: ['原味', '微辣', '特辣'], qty: ['1份', '2份'] } }),
  initDish({ id: 'd2001', categoryId: 'veg', name: '烤韭菜', price: '¥4.00', desc: '鲜嫩翠绿，孜然飘香', image: '/src/assets/images/kjc.jpg?raw=true', specs: { spice: ['原味', '微辣'], qty: ['1份', '2份'] } }),
  initDish({ id: 'd2002', categoryId: 'veg', name: '炭烤玉米', price: '¥2.00', desc: '刷酱烤制，香甜可口', image: '/src/assets/images/kym.jpg?raw=true', specs: { spice: ['刷酱', '原味'], qty: ['1份', '2份'] } }),
  initDish({ id: 'd2003', categoryId: 'veg', name: '烤金针菇', price: '¥5.00', desc: '蒜香黄油，滑嫩多汁', image: '/src/assets/images/kqz.jpg?raw=true', specs: { spice: ['原味', '微辣', '特辣'], qty: ['1份', '2份'] } }),
  initDish({ id: 'd3001', categoryId: 'drinks', name: '手打柠檬茶', price: '¥18.00', desc: '少冰 · 五分糖', image: IMG_LEMON }),
  initDish({ id: 'd3002', categoryId: 'drinks', name: '冰镇酸梅汤', price: '¥8.00', desc: '解腻神器，冰爽一夏', image: IMG_SMT }),
  initDish({ id: 'd3003', categoryId: 'drinks', name: '矿泉水', price: '¥3.00', desc: '天然矿泉水', image: IMG_KQS }),
])

const currentCat = computed(() => categories.value.find((c) => c.id === activeCat.value))
const filteredDishes = computed(() => dishes.value.filter((d) => d.categoryId === activeCat.value))

function addToCart(dish: DishItem) {
  const price = dish.promotionId ? dish.promoPrice! : parseFloat(dish.price.replace('¥', ''))
  const specsParts: string[] = []
  if (dish.selectedSpice) specsParts.push(dish.selectedSpice)
  if (dish.selectedQty) specsParts.push(dish.selectedQty)
  const specsKey = specsParts.join(' · ')
  const qty = dish.selectedQty ? parseInt(dish.selectedQty) || 1 : 1

  // 福利品限购校验
  if (dish.promotionId && dish.limitType === 'per_order' && dish.maxQty) {
    const existing = items.filter((i) => i.promotionId === dish.promotionId)
      .reduce((s, i) => s + i.quantity, 0)
    if (existing + qty > dish.maxQty) {
      showToast(`该福利限购 ${dish.maxQty} 份`)
      return
    }
  }

  cartAdd({
    dishId: dish.id + specsKey,
    name: dish.name + (dish.promotionId ? ' (福利)' : ''),
    price,
    quantity: qty,
    specs: specsKey || undefined,
    originalPrice: dish.promotionId ? parseFloat(dish.price.replace('¥', '')) : undefined,
    promotionId: dish.promotionId,
    promoPrice: dish.promoPrice,
    limitType: dish.limitType,
  })
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

// Match welfare promotions to dishes by name
function applyPromotions() {
  for (const promo of promotions.value) {
    if (promo.type !== 'welfare_item') continue
    for (const pi of promo.items) {
      const match = dishes.value.find((d) => d.name.includes(pi.dishId.replace('dish-', '')) || d.name.includes(nameFromId(pi.dishId)))
      if (match) {
        match.promotionId = promo.id
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

onMounted(() => {
  fetch('/api/orders?branchId=demo-branch&status=preparing&limit=1')
    .then(r => r.json())
    .then(list => { if (list.length) hasActiveOrder.value = true })
    .catch(() => {})
  fetch('/api/orders?branchId=demo-branch&status=pending&limit=1')
    .then(r => r.json())
    .then(list => { if (list.length) hasActiveOrder.value = true })
    .catch(() => {})
  fetch('/api/promotions?merchantId=demo-merchant&status=active')
    .then(r => r.json())
    .then((data) => { promotions.value = data; applyPromotions() })
    .catch(() => {})
})</script>

<style scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(252, 249, 248, 0.8);
  backdrop-filter: blur(12px);
}

.top-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-icon {
  color: var(--primary-container);
  font-size: 24px;
}

.top-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-container);
  text-transform: uppercase;
  letter-spacing: -0.02em;
  margin: 0;
}

.ticket-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--text);
  text-decoration: none;
  position: relative;
}
.badge-dot { position: absolute; top: 2px; right: 2px; background: var(--error); color: #fff; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 1.5px solid var(--surface); }

.search-btn:active {
  background: var(--surface-container-high);
}

.featured-banner {
  position: relative;
  width: calc(100% - 32px);
  margin: 64px 16px 0;
  aspect-ratio: 2/1;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.banner-img {
  width: 100%;
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, #1a1a1a, #4a2a0a);
}

.banner-img-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, transparent 60%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
}

.banner-tag {
  align-self: flex-start;
  background: var(--primary-container);
  color: var(--on-primary);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  margin-bottom: 4px;
}

.banner-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.category-nav {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 12px 16px;
  position: sticky;
  top: 56px;
  z-index: 40;
  background: rgba(252, 249, 248, 0.95);
  backdrop-filter: blur(4px);
}

.cat-pill {
  white-space: nowrap;
  padding: 8px 24px;
  border-radius: 9999px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  background: var(--surface-container-high);
  color: var(--on-surface-variant);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-active {
  background: var(--primary-container);
  color: var(--on-primary);
}

.dishes-section {
  padding: 0 16px 100px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
}

.cat-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.cat-en {
  font-size: 14px;
  color: var(--secondary);
}

.dish-card {
  background: var(--surface-container-lowest);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
  border: 1px solid rgba(226, 191, 176, 0.2);
  position: relative;
}

.add-card-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--primary-container);
  color: var(--on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3);
  transition: transform 0.15s;
}
.add-card-btn:active {
  transform: scale(0.9);
}
.add-card-btn .material-symbols-outlined {
  font-size: 20px;
}

.dish-row {
  display: flex;
  gap: 16px;
}

.dish-img {
  width: 128px;
  height: 128px;
  border-radius: 12px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--surface-container-high);
  position: relative;
}

.dish-img-el {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dish-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dish-name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
}

.dish-desc {
  font-size: 14px;
  line-height: 20px;
  color: var(--secondary);
  margin: 0 0 auto;
}

.dish-price {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--primary-container);
  margin-top: 8px;
}

.dish-promo-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--error);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  vertical-align: middle;
}

.dish-specs {
  margin-top: 16px;
  padding-top: 16px;
  padding-bottom: 8px;
  border-top: 1px solid rgba(226, 191, 176, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spec-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spec-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--secondary);
  margin: 0;
  font-family: var(--font-display);
}

.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spec-chip {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--outline-variant);
  font-size: 12px;
  font-weight: 600;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-display);
}

.chip-active {
  border-color: var(--primary-container);
  background: rgba(255, 107, 0, 0.08);
  color: var(--primary-container);
}

.qty-input {
  width: 96px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--outline-variant);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-display);
  color: var(--text);
  outline: none;
  background: transparent;
}
.qty-input:focus {
  border-color: var(--primary-container);
}
.qty-input::placeholder {
  color: var(--outline);
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.cart-floating {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 100;
}

.cart-glass {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 12px 12px 12px 16px;
  box-shadow: 0 8px 20px rgba(255, 107, 0, 0.15);
  border: 1px solid rgba(255, 107, 0, 0.1);
  cursor: pointer;
}

.cart-glass-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cart-icon-box {
  position: relative;
  width: 56px;
  height: 56px;
  background: var(--primary-container);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 107, 0, 0.2);
}

.cart-basket {
  font-size: 30px;
  color: var(--on-primary);
}

.cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--error);
  color: var(--on-error);
  font-size: 11px;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid #fff;
}

.cart-glass-info {
  display: flex;
  flex-direction: column;
}

.cart-glass-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
}

.cart-glass-price {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--primary-container);
  line-height: 1.4;
}

.cart-glass-btn {
  background: var(--primary-container);
  color: var(--on-primary);
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s;
  box-shadow: 0 4px 8px rgba(255, 107, 0, 0.2);
}
.cart-glass-btn:active {
  transform: scale(0.95);
}

.cart-sheet {
  padding: 0 16px 16px;
  min-height: 200px;
}

.cart-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  background: var(--surface-container-lowest);
  z-index: 1;
}
.cart-sheet-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
}
.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.clear-btn:active {
  background: var(--surface-container-high);
}
.clear-btn .material-symbols-outlined {
  font-size: 18px;
}

.cart-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.cart-item-name {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.cart-item-spec {
  font-size: 12px;
  color: var(--secondary);
  margin: 2px 0;
}

.cart-item-price {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-container);
  margin: 0;
}

.cart-qty {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.qty-btn .material-symbols-outlined {
  font-size: 16px;
}

.qty-num {
  font-size: 16px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--error);
  opacity: 0.5;
}
.delete-btn:active {
  opacity: 1;
  background: var(--error-container);
}
.delete-btn .material-symbols-outlined {
  font-size: 16px;
}

.cart-empty {
  text-align: center;
  padding: 40px 0;
  color: var(--secondary);
}

.cart-bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.cart-total-label {
  font-size: 16px;
  font-weight: 600;
}

.cart-total-price {
  color: var(--primary-container);
  font-weight: 800;
}

.checkout-btn {
  padding: 12px 24px;
  border-radius: 9999px;
  border: none;
  background: var(--primary-container);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
</style>
