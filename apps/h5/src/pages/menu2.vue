<template>
  <div class="menu2">
    <header class="top-bar">
      <div class="top-left">
        <span class="material-symbols-outlined top-icon">restaurant_menu</span>
        <h1 class="top-title">Sizzling Skewers</h1>
      </div>
      <div class="top-right">
        <button class="icon-btn">
          <span class="material-symbols-outlined">search</span>
        </button>
      </div>
    </header>

    <!-- 通栏 Banner -->
    <div class="full-banner">
      <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqeOFCkRe-ogyZt9msUQ8Y95II2FqNwreGxURp0gftRhut7fp02ds1uGhH2n9Hfy7jwfBZ6FkCv-ZrKn00gAWI5ZGloBSZeHo0uKw7_BJLkcnDb-KXhzUQ78LGrQu0zvEK6MgNNiNEHA36xrQqcjz9Jhkljxce61HcqfdGXgVKzv86mnyOFAn-RpNOxeI9l2BCjYE3cJr_iVjLKBanRGPlKsDiICSgw3sEcEiTI2i8tlJED4hLAA1S7a4kM-2aN4mXfY-bAO-G_GI" alt="banner" class="full-banner-img" />
      <div class="full-banner-overlay">
        <span class="banner-tag">今日推荐</span>
        <h2 class="banner-title">招牌秘制羊肉串</h2>
      </div>
    </div>

    <main class="main-layout">
      <!-- 左侧分类导航 -->
      <aside class="sidebar">
        <a
          v-for="cat in categories" :key="cat.id"
          :class="['cat-link', activeCat === cat.id && 'cat-active']"
          @click="activeCat = cat.id"
        >
          <span class="material-symbols-outlined cat-icon">{{ cat.icon }}</span>
          <span class="cat-label">{{ cat.name }}</span>
        </a>
      </aside>

      <!-- 右侧内容 -->
      <section class="content">
        <!-- 菜品列表 -->
        <div v-for="cat in categories" :key="cat.id" :id="cat.id" class="section" v-show="activeCat === cat.id">
          <div class="section-header">
            <h3 class="section-title">{{ cat.name }}</h3>
          </div>
          <div class="dish-list">
            <div v-for="dish in filteredDishes(cat.id)" :key="dish.id" class="dish-card">
              <img :src="dish.image || placeholderImg" :alt="dish.name" class="dish-img" />
              <div class="dish-body">
                <h4 class="dish-name">
                  {{ dish.name }}
                  <span v-if="dish.promotionId" class="promo-tag">福利</span>
                </h4>
                <p class="dish-desc">{{ dish.desc }}</p>
                <div class="dish-specs" v-if="dish.spice.length || dish.qty.length">
                  <div class="spec-row" v-if="dish.spice.length">
                    <span class="spec-label">口感</span>
                    <div class="spec-options">
                      <button v-for="opt in dish.spice" :key="opt"
                        :class="['spec-chip', dish.selectedSpice === opt && 'chip-active']"
                        @click="dish.selectedSpice = opt">{{ opt }}</button>
                    </div>
                  </div>
                  <div class="spec-row" v-if="dish.qty.length">
                    <span class="spec-label">份量</span>
                    <div class="spec-options">
                      <button v-for="opt in dish.qty" :key="opt"
                        :class="['spec-chip', dish.selectedQty === opt && 'chip-active']"
                        @click="dish.selectedQty = opt">{{ opt }}</button>
                    </div>
                  </div>
                </div>
                <div class="dish-bottom">
                  <span v-if="dish.promotionId" class="dish-price-orig">¥{{ dish.price }}</span>
                  <span class="dish-price" :class="dish.promotionId && 'dish-price-promo'">¥{{ dish.promotionId ? dish.promoPrice : dish.price }}</span>
                  <button class="add-btn" @click="addToCart(dish)">
                    <span class="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 购物车浮条 -->
    <div :class="['cart-bar', totalCount > 0 && 'cart-visible']">
      <div class="cart-glass">
        <div class="cart-left">
          <div class="cart-icon-wrap">
            <span class="material-symbols-outlined cart-icon">shopping_basket</span>
            <span v-if="totalCount > 0" class="cart-badge">{{ totalCount }}</span>
          </div>
          <div class="cart-info">
            <span class="cart-label">合计金额</span>
            <span class="cart-total">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
        </div>
        <button class="cart-btn" @click="goCheckout">去结算</button>
      </div>
    </div>

    <!-- 底部导航 -->
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '@/stores/cart'
import { showToast } from 'vant'
import 'vant/es/toast/style'

const router = useRouter()
const { items, totalCount, totalPrice, add: cartAdd } = useCart()
const activeCat = ref('')

const placeholderImg = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop'

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
  items: { dishId: string; promoPrice: number; limitType: string; maxQty: number }[]
}

interface CategoryItem {
  id: string
  name: string
  icon: string
}

interface DishItem {
  id: string
  name: string
  price: number
  desc: string
  image: string
  categoryId: string
  specsPreset: string
  spice: string[]
  qty: string[]
  selectedSpice: string
  selectedQty: string
  promotionId?: string
  promoPrice?: number
  limitType?: string
  maxQty?: number
  apiDishId?: string
}

const categories = ref<CategoryItem[]>([])
const dishes = ref<DishItem[]>([])
const promotions = ref<ApiPromotion[]>([])

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

const CAT_ICON_MAP: Record<string, string> = {
  '肉串': 'kebab_dining',
  '素菜': 'eco',
  '饮品': 'local_bar',
}

const SPECS_PRESETS: Record<string, { spice: string[]; qty: string[] }> = {
  bbq: { spice: ['原味', '微辣', '加辣'], qty: ['1份', '2份', '3份'] },
  none: { spice: [], qty: [] },
}

function catIcon(name: string): string {
  for (const [key, icon] of Object.entries(CAT_ICON_MAP)) {
    if (name.includes(key)) return icon
  }
  return 'restaurant_menu'
}

function filteredDishes(categoryId: string) {
  return dishes.value.filter((d) => d.categoryId === categoryId)
}

function addToCart(dish: DishItem) {
  const price = dish.promotionId ? dish.promoPrice! : dish.price
  const specsParts: string[] = []
  if (dish.selectedSpice) specsParts.push(dish.selectedSpice)
  if (dish.selectedQty) specsParts.push(dish.selectedQty)
  const specsKey = specsParts.join(' · ')
  const qty = dish.selectedQty ? parseInt(dish.selectedQty) || 1 : 1
  const cartKey = `${dish.apiDishId || dish.id}|${specsKey}`

  if (dish.promotionId && dish.maxQty) {
    if (dish.limitType === 'per_order') {
      const existing = items
        .filter((i: any) => i.promotionId === dish.promotionId && (i.baseDishId || i.dishId?.split('|')[0]) === dish.id)
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
    baseDishId: dish.apiDishId,
    name: dish.name + (dish.promotionId ? ' (福利)' : ''),
    price,
    quantity: qty,
    specs: specsKey || undefined,
    originalPrice: dish.promotionId ? dish.price : undefined,
    promotionId: dish.promotionId,
    promoPrice: dish.promoPrice,
    limitType: dish.limitType,
  } as any)
  showToast('已加入购物车')
}

function goCheckout() {
  router.push('/checkout')
}

onMounted(async () => {
  try {
    const [dishRes, promoRes] = await Promise.all([
      fetch('/api/dishes'),
      fetch('/api/promotions?merchantId=demo-merchant&status=active'),
    ])
    const apiDishes: ApiDish[] = await dishRes.json()
    const apiPromos: ApiPromotion[] = await promoRes.json()
    promotions.value = apiPromos

    // Extract unique categories sorted by sort
    const catMap = new Map<string, { id: string; name: string; sort: number }>()
    for (const d of apiDishes) {
      if (d.category && !catMap.has(d.category.id)) {
        catMap.set(d.category.id, { id: d.category.id, name: d.category.name, sort: d.category.sort })
      }
    }
    const sorted = [...catMap.values()].sort((a, b) => a.sort - b.sort)
    categories.value = sorted.map((c) => ({ id: c.id, name: c.name, icon: catIcon(c.name) }))
    if (categories.value.length) activeCat.value = categories.value[0].id

    // Build welfare promo lookup: dishId -> promo info
    const welfareMap = new Map<string, { promotionId: string; promoPrice: number; limitType: string }>()
    for (const p of apiPromos) {
      if (p.type !== 'welfare_item') continue
      for (const item of p.items) {
        welfareMap.set(item.dishId, { promotionId: p.id, promoPrice: item.promoPrice, limitType: item.limitType })
      }
    }

    dishes.value = apiDishes.map((d) => {
      const promo = welfareMap.get(d.id)
      const preset = SPECS_PRESETS[d.specsPreset] || SPECS_PRESETS.none
      return {
        id: d.id,
        apiDishId: d.id,
        name: d.name,
        price: d.price,
        desc: d.desc || '',
        image: d.image || DISH_IMAGES[d.id] || placeholderImg,
        categoryId: d.categoryId,
        specsPreset: d.specsPreset,
        spice: preset.spice,
        qty: preset.qty,
        selectedSpice: preset.spice[0] || '',
        selectedQty: preset.qty[0] || '',
        promotionId: promo?.promotionId,
        promoPrice: promo?.promoPrice,
        limitType: promo?.limitType,
        maxQty: undefined,
      }
    })
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
.icon-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1c1b1b; }

/* Full-width Banner */
.full-banner {
  position: relative;
  width: 100%;
  height: 140px;
  flex-shrink: 0;
  overflow: hidden;
}
.full-banner-img { width: 100%; height: 100%; object-fit: cover; }
.full-banner-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 60%);
  display: flex; flex-direction: column; justify-content: flex-end; padding: 16px;
}

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

.banner-tag {
  align-self: flex-start;
  background: #ff6b00; color: #fff;
  font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 9999px; margin-bottom: 4px;
}
.banner-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: #fff; margin: 0; }

/* Section */
.section { margin-bottom: 16px; }
.section-header { margin-bottom: 12px; }
.section-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; margin: 0; }

/* Dish Card */
.dish-list { display: flex; flex-direction: column; gap: 12px; }
.dish-card {
  display: flex;
  gap: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(226, 191, 176, 0.2);
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.dish-img {
  width: 96px;
  height: 96px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: #e5e2e1;
}
.dish-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.dish-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; margin: 0; }
.dish-desc { font-size: 13px; color: #5e5e5c; margin: 4px 0 0; line-height: 1.3; }
.dish-specs { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.spec-row { display: flex; align-items: center; gap: 6px; }
.spec-label { font-size: 11px; font-weight: 600; color: #5e5e5c; white-space: nowrap; min-width: 30px; }
.spec-options { display: flex; gap: 4px; flex-wrap: wrap; }
.spec-chip {
  padding: 2px 8px; border-radius: 9999px; border: 1px solid #e2bfb0;
  background: #fff; font-size: 11px; color: #5e5e5c; cursor: pointer;
  transition: all 0.15s; font-family: inherit;
}
.spec-chip:active { transform: scale(0.95); }
.chip-active {
  background: #ff6b00; color: #fff; border-color: #ff6b00; font-weight: 700;
}
.dish-bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; }
.dish-price { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #a04100; line-height: 1; }
.dish-price-orig {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #8e7164;
  text-decoration: line-through;
  margin-right: 6px;
  line-height: 1;
}
.dish-price-promo { color: #ba1a1a; font-size: 18px; }
.promo-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #ba1a1a;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
}
.add-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: #ff6b00; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3);
  transition: transform 0.15s;
}
.add-btn:active { transform: scale(0.9); }
.add-btn .material-symbols-outlined { font-size: 18px; }

/* Cart Bar */
.cart-bar {
  position: fixed;
  bottom: 64px;
  left: 12px;
  right: 12px;
  z-index: 100;
  transition: transform 0.3s;
  transform: translateY(120%);
}
.cart-visible { transform: translateY(0); }
.cart-glass {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 12px 12px 12px 16px;
  box-shadow: 0 8px 20px rgba(255, 107, 0, 0.15);
  border: 1px solid rgba(255, 107, 0, 0.1);
}
.cart-left { display: flex; align-items: center; gap: 12px; }
.cart-icon-wrap { position: relative; }
.cart-icon { font-size: 32px; color: #a04100; }
.cart-badge {
  position: absolute; top: -4px; right: -4px;
  background: #ba1a1a; color: #fff;
  font-size: 10px; font-weight: 700;
  min-width: 20px; height: 20px; border-radius: 9999px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px; border: 2px solid #fff;
}
.cart-info { display: flex; flex-direction: column; }
.cart-label { font-size: 10px; font-weight: 700; color: #5e5e5c; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1; }
.cart-total { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 20px; font-weight: 800; color: #a04100; line-height: 1.4; }
.cart-btn {
  background: #ff6b00; color: #fff;
  border: none; border-radius: 9999px;
  padding: 12px 24px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px; font-weight: 700;
  cursor: pointer; transition: transform 0.15s;
  box-shadow: 0 4px 8px rgba(255, 107, 0, 0.2);
}
.cart-btn:active { transform: scale(0.95); }

/* Bottom Nav */
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  background: rgba(252,249,248,0.95);
  backdrop-filter: blur(12px);
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.04);
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 16px;
  text-decoration: none;
  color: #5e5e5c;
  transition: all 0.15s;
  gap: 2px;
}
.nav-active {
  background: rgba(255, 107, 0, 0.1);
  color: #572000;
  border-radius: 9999px;
  padding: 4px 16px;
}
.nav-item .material-symbols-outlined { font-size: 24px; }
.nav-label { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600; }
</style>
