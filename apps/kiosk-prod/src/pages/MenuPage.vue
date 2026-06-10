<template>
  <main class="page">
    <header class="top-bar">
      <div class="brand">
        <span class="material-icons">restaurant_menu</span>
        <h1>{{ branchName || 'Sizzling Skewers' }}</h1>
      </div>
      <div class="top-bar-right">
        <button class="theme-btn" @click="themeIcon = doToggleTheme()">
          <span class="material-icons">{{ themeIcon }}</span>
        </button>
        <router-link to="/pickup" class="ticket-btn">
          <span class="material-icons">receipt_long</span>
          <span v-if="hasActiveOrder" class="badge-dot">1</span>
        </router-link>
      </div>
    </header>

    <div class="page-content">
      <section class="featured-banner">
        <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80" alt="今日推荐" class="featured-img" />
        <div class="featured-overlay">
          <span class="featured-tag">今日推荐</span>
          <h2>招牌秘制羊肉串</h2>
        </div>
      </section>

<nav class="category-nav">
  <button
    v-for="category in categories" :key="category.id"
    :class="['category-pill', selectedCategoryId === category.id && 'category-pill-active']"
    @click="selectedCategoryId = category.id"
  >
    <span class="material-icons">{{ categoryIcons[category.name] || 'restaurant' }}</span>
    {{ category.name }}
  </button>
</nav>

      <section v-if="errorMessage" class="status-card error-card">
        <span class="material-icons">error_outline</span>
        <p>{{ errorMessage }}</p>
      </section>
      <section v-else-if="loading" class="status-card loading-card">
        <div class="spinner"></div>
        <p>菜单加载中...</p>
      </section>

      <section v-else class="dish-list">
        <article v-for="dish in filteredDishes" :key="dish.id" class="dish-card">
          <div class="dish-row">
            <img :src="dish.image" :alt="dish.name" class="dish-image" />
            <div class="dish-body">
              <div class="dish-header">
                <h3 class="dish-name">{{ dish.name }}</h3>
                <span v-for="tag in dish.tags ?? []" :key="tag" class="dish-tag">{{ tag }}</span>
              </div>
              <p class="dish-desc">{{ dish.desc }}</p>
              <div class="dish-price-row">
                <span class="dish-price">¥{{ dish.price.toFixed(2) }}</span>
                <span v-if="dish.promotionId" class="dish-promo-tag">福利 ¥{{ dish.promoPrice?.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div v-if="dish.specGroups" class="dish-specs">
            <div v-for="(group, gi) in dish.specGroups" :key="gi" class="spec-group">
              <p class="spec-label">{{ group.name }}</p>
              <div class="spec-options">
                <button
                  v-for="(opt, oi) in group.options" :key="oi"
                  :class="['spec-chip', dish.selectedLabels?.[gi] === opt.label && 'spec-chip-active']"
                  @click="dish.selectedLabels![gi] = opt.label"
                >{{ opt.label }}{{ opt.priceDelta ? (opt.priceDelta > 0 ? ` +¥${opt.priceDelta}` : ` -¥${-opt.priceDelta}`) : '' }}</button>
                <input v-if="gi === qtyGroupIndex" class="qty-input" type="number" placeholder="其他数量"
                  @input="onCustomQty(dish, gi, ($event.target as HTMLInputElement).value)" />
              </div>
            </div>
          </div>

          <button class="add-card-btn" @click="addToCart(dish)">
            <span class="material-icons">add</span>
          </button>
        </article>
      </section>
    </div>

    <div v-if="cartCount > 0" class="cart-bar" @click="showCart = true">
      <div class="cart-left">
        <div class="cart-icon-wrap">
          <span class="material-icons">shopping_basket</span>
          <span class="cart-badge">{{ cartCount }}</span>
        </div>
        <div class="cart-info">
          <span class="cart-label">合计金额</span>
          <span class="cart-total">¥{{ cartTotal.toFixed(2) }}</span>
        </div>
      </div>
      <button class="cart-btn" @click.stop="goCheckout">去结算</button>
    </div>

    <van-action-sheet v-model:show="showCart" close-on-popup-close>
      <div class="cart-sheet">
        <div class="cart-sheet-header">
          <span class="cart-sheet-title">购物车</span>
          <button v-if="cartItems.length" class="clear-btn" @click="clearCart">
            <span class="material-icons">delete</span><span>清空</span>
          </button>
        </div>
        <div class="cart-items">
          <div v-for="item in cartItems" :key="item.dishId" class="cart-item">
            <div class="cart-item-info">
              <p class="cart-item-name">{{ item.name }}</p>
              <p v-if="item.specs" class="cart-item-spec">{{ item.specs }}</p>
              <p class="cart-item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</p>
            </div>
            <div class="cart-item-qty">
              <button class="qty-btn" @click="updateCartQuantity(item.dishId, -1)"><span class="material-icons">remove</span></button>
              <span class="qty-num">{{ item.quantity }}</span>
              <button class="qty-btn qty-btn-plus" @click="updateCartQuantity(item.dishId, 1)"><span class="material-icons">add</span></button>
            </div>
          </div>
        </div>
        <div v-if="cartItems.length === 0" class="cart-empty">购物车是空的</div>
        <div class="cart-sheet-footer">
          <span class="cart-total-label">合计：<span class="cart-total-price">¥{{ cartTotal.toFixed(2) }}</span></span>
          <button class="checkout-btn" @click="goCheckout">确认下单</button>
        </div>
      </div>
    </van-action-sheet>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item"><span class="material-icons">home</span><span class="nav-label">首页</span></router-link>
      <router-link to="/menu" class="nav-item nav-item-active"><span class="material-icons">outdoor_grill</span><span class="nav-label">菜单</span></router-link>
      <router-link to="/pickup" class="nav-item"><span class="material-icons">confirmation_number</span><span class="nav-label">订单</span></router-link>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import 'vant/es/toast/style'
import { SPECS_PRESETS, type SpecGroup, type SpecPreset } from '@diancan/shared'
import { readCart, clearCart as clearCartStorage, addToCart as addToCartStorage, updateCartQuantity as updateCartQuantityStorage, StoredCartItem } from '@/utils/cart'
import { getTheme, setTheme } from '@/utils/theme'

interface Category { id: string; name: string; sort: number }

const categoryIcons: Record<string, string> = {
  '肉串': 'kebab_dining',
  '素菜': 'eco',
  '饮品': 'local_bar',
}
interface Dish {
  id: string; categoryId: string; name: string
  price: number; desc: string; image: string; tags?: string[]
  specsPreset?: SpecPreset
  specGroups?: SpecGroup[]
  selectedLabels?: string[]
  promotionId?: string; promoPrice?: number
}

const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')
const branchName = ref('')
const categories = ref<Category[]>([])
const dishes = ref<Dish[]>([])
const selectedCategoryId = ref('')
const showCart = ref(false)
const hasActiveOrder = ref(false)
const cartItems = ref<StoredCartItem[]>([])

const qtyGroupIndex = 1

function getThemeIcon(): string {
  const t = getTheme()
  return t === 'auto' ? 'brightness_auto' : t === 'dark' ? 'dark_mode' : 'light_mode'
}
const themeIcon = ref(getThemeIcon())
function doToggleTheme(): string {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
  return getThemeIcon()
}

const cartCount = computed(() => cartItems.value.reduce((s, i) => s + i.quantity, 0))
const cartTotal = computed(() => cartItems.value.reduce((t, i) => t + i.price * i.quantity, 0))
const filteredDishes = computed(() => dishes.value.filter(d => d.categoryId === selectedCategoryId.value))

function initSpecs(preset: SpecPreset): { groups: SpecGroup[]; defaults: string[] } | null {
  const specDefs = SPECS_PRESETS[preset]
  if (!specDefs || specDefs.length === 0) return null
  const defaults = specDefs.map((g) => g.options[0]?.label ?? '')
  return { groups: specDefs, defaults }
}

function onCustomQty(dish: Dish, gi: number, value: string) {
  if (!dish.selectedLabels) return
  dish.selectedLabels[gi] = value ? `${value}${dish.specGroups?.[gi]?.options?.[0]?.label?.replace(/\d+/g, '') || '串'}` : dish.specGroups?.[gi]?.options?.[0]?.label || ''
}

function hydrateCart() {
  cartItems.value = readCart()
}

function addToCart(dish: Dish) {
  const specsParts: string[] = []
  let qty = 1
  if (dish.selectedLabels) {
    for (let gi = 0; gi < dish.selectedLabels.length; gi++) {
      const label = dish.selectedLabels[gi]
      if (!label) continue
      specsParts.push(label)
      if (gi === qtyGroupIndex) {
        qty = parseInt(label) || 1
      }
    }
  }
  const specsKey = specsParts.join(' · ')
  const price = dish.promotionId && dish.promoPrice ? dish.promoPrice : dish.price

  addToCartStorage({
    dishId: `${dish.id}|${specsKey}`,
    baseDishId: dish.id,
    name: dish.name + (dish.promotionId ? ' (福利)' : ''),
    price,
    quantity: qty,
    specs: specsKey || undefined,
    image: dish.image,
    promotionId: dish.promotionId,
    promoPrice: dish.promoPrice,
    originalPrice: dish.promotionId ? dish.price : undefined,
  })

  hydrateCart()
  showToast('已加入购物车')
}

function updateCartQuantity(dishId: string, delta: number) {
  updateCartQuantityStorage(dishId, delta)
  hydrateCart()
  if (cartItems.value.length === 0) showCart.value = false
}

function clearCart() {
  clearCartStorage()
  cartItems.value = []
  showCart.value = false
}

function goCheckout() {
  showCart.value = false
  router.push('/checkout')
}

const dishImages: Record<string, string> = {
  'dish-01': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'dish-02': 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&q=80',
  'dish-03': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&q=80',
  'dish-04': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
  'dish-05': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&q=80',
  'dish-06': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',
  'dish-07': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',
  'dish-08': 'https://images.unsplash.com/photo-1506280754576-f6fa8a873550?w=400&q=80',
  'dish-09': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80',
  'dish-10': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  'dish-11': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  'dish-12': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80',
}

async function loadData() {
  loading.value = true; errorMessage.value = ''
  try {
    const [bootstrapResponse, menuResponse] = await Promise.all([
      fetch('/api/system/bootstrap'),
      fetch('/api/catalog/menu'),
    ])
    if (!bootstrapResponse.ok || !menuResponse.ok) throw new Error('接口返回异常，请检查 api-core 是否已启动')

    const bootstrap = await bootstrapResponse.json() as { branchName: string }
    const menu = await menuResponse.json() as {
      categories: Category[]
      dishes: { id: string; categoryId: string; name: string; price: number; desc: string; image?: string; tags?: string[]; specsPreset?: SpecPreset }[]
    }

    branchName.value = bootstrap.branchName
    categories.value = [...menu.categories].sort((a, b) => a.sort - b.sort)

    dishes.value = menu.dishes.map((d) => {
      const specResult = d.specsPreset ? initSpecs(d.specsPreset) : null
      return {
        id: d.id,
        categoryId: d.categoryId,
        name: d.name,
        price: d.price,
        desc: d.desc,
        image: d.image || dishImages[d.id] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
        tags: d.tags,
        specsPreset: d.specsPreset,
        specGroups: specResult?.groups,
        selectedLabels: specResult?.defaults ? [...specResult.defaults] : undefined,
      }
    })

    selectedCategoryId.value = categories.value[0]?.id ?? ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '菜单加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadData()
  hydrateCart()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
.material-icons { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; font-size: 24px; line-height: 1; }
.page { min-height: 100vh; background: var(--surface); padding-bottom: 180px; }
.top-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) var(--container-margin); background: var(--frosted-bg); backdrop-filter: blur(12px); }
.brand { display: flex; align-items: center; gap: var(--spacing-sm); }
.brand .material-icons { color: var(--primary-container); font-size: 28px !important; }
.brand h1 { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-lg-mobile); font-weight: 700; color: var(--primary-container); text-transform: uppercase; }
.ticket-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 50%; cursor: pointer; color: var(--secondary); text-decoration: none; position: relative; }
.top-bar-right { display: flex; align-items: center; gap: var(--spacing-xs); }
.theme-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; border-radius: var(--radius-full); background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.theme-btn .material-icons { font-size: 22px !important; }
.theme-btn:hover { background: var(--surface-container-high); }
.badge-dot { position: absolute; top: 2px; right: 2px; background: var(--error); color: #fff; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 1.5px solid var(--surface); }
.page-content { padding: 70px var(--container-margin) var(--spacing-lg); max-width: 600px; margin: 0 auto; }
.featured-banner { position: relative; width: 100%; aspect-ratio: 2 / 1; border-radius: var(--radius-xl); overflow: hidden; margin-bottom: var(--spacing-lg); }
.featured-img { width: 100%; height: 100%; object-fit: cover; }
.featured-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: var(--spacing-md); background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); }
.featured-tag { width: fit-content; padding: 4px 8px; margin-bottom: var(--spacing-xs); border-radius: var(--radius-full); background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: 10px; font-weight: 700; }
.featured-overlay h2 { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; color: #fff; }
.category-nav { display: flex; justify-content: center; gap: var(--spacing-sm); padding: var(--spacing-md) 0; position: sticky; top: 56px; z-index: 40; }
.category-pill { display: flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-sm) var(--spacing-lg); border: none; border-radius: var(--radius-full); background: var(--surface-container-high); color: var(--on-surface-variant); font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
.category-pill .material-icons { font-size: 18px !important; }
.category-pill-active { background: var(--primary-container); color: var(--on-primary); }
.status-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-md); padding: var(--spacing-xl); margin-top: var(--spacing-lg); border-radius: var(--radius-xl); background: var(--surface-container-low); }
.status-card .material-icons { font-size: 48px !important; }
.error-card { color: var(--error); }
.loading-card { color: var(--secondary); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--surface-container); border-top-color: var(--primary-container); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.dish-list { display: flex; flex-direction: column; gap: var(--spacing-md); }
.dish-card { position: relative; padding: var(--spacing-md); background: var(--surface-container-lowest); border-radius: var(--radius-xl); border: 1px solid var(--card-border-light); box-shadow: var(--shadow-md); }
.dish-row { display: flex; gap: var(--spacing-md); }
.dish-image { width: 128px; height: 128px; border-radius: var(--radius-lg); object-fit: cover; flex-shrink: 0; }
.dish-body { flex: 1; display: flex; flex-direction: column; }
.dish-header { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; margin-bottom: var(--spacing-xs); }
.dish-name { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; color: var(--on-surface); }
.dish-tag { padding: 2px 8px; border-radius: var(--radius-full); background: rgba(255, 107, 0, 0.1); color: var(--primary-container); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; }
.dish-desc { margin: 0 0 var(--spacing-sm); font-family: var(--font-body); font-size: var(--text-body-md); color: var(--secondary); line-height: 20px; flex: 1; }
.dish-price-row { display: flex; align-items: center; gap: var(--spacing-sm); }
.dish-price { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.dish-promo-tag { display: inline-block; padding: 1px 6px; border-radius: 4px; background: var(--error); color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700; }
.dish-specs { margin-top: var(--spacing-md); padding-top: var(--spacing-md); padding-bottom: var(--spacing-sm); border-top: 1px solid var(--card-border-subtle); display: flex; flex-direction: column; gap: var(--spacing-md); }
.spec-group { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.spec-label { margin: 0; font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; color: var(--secondary); }
.spec-options { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.spec-chip { padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--outline-variant); background: transparent; color: var(--on-surface); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
.spec-chip-active { border-color: var(--primary-container); background: rgba(255, 107, 0, 0.08); color: var(--primary-container); }
.qty-input { width: 96px; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--outline-variant); background: transparent; font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; color: var(--on-surface); outline: none; }
.qty-input:focus { border-color: var(--primary-container); }
.qty-input::placeholder { color: var(--outline); }
.add-card-btn { position: absolute; bottom: var(--spacing-md); right: var(--spacing-md); width: 36px; height: 36px; border: none; border-radius: 50%; background: var(--primary-container); color: var(--on-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3); transition: transform var(--transition-fast); }
.add-card-btn .material-icons { font-size: 20px !important; }
.add-card-btn:active { transform: scale(0.9); }

.cart-bar { position: fixed; bottom: 80px; left: var(--container-margin); right: var(--container-margin); z-index: 80; display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md); background: var(--frosted-bg); backdrop-filter: blur(12px); border-radius: var(--radius-xl); border: 1px solid var(--card-border-strong); box-shadow: var(--shadow-lg); cursor: pointer; }
.cart-bar:active { transform: scale(0.99); }
.cart-left { display: flex; align-items: center; gap: var(--spacing-md); }
.cart-icon-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--primary-container); box-shadow: var(--shadow-primary); }
.cart-icon-wrap .material-icons { font-size: 30px !important; color: var(--on-primary); }
.cart-badge { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: var(--radius-full); background: var(--error); color: var(--on-error); font-family: var(--font-display); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
.cart-info { display: flex; flex-direction: column; }
.cart-label { font-family: var(--font-display); font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--secondary); }
.cart-total { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.cart-btn { padding: var(--spacing-md) var(--spacing-xl); border: none; border-radius: var(--radius-xl); background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; cursor: pointer; box-shadow: var(--shadow-primary); }
.cart-sheet { padding: 0 var(--container-margin) var(--container-margin); min-height: 200px; max-width: 600px; margin: 0 auto; }
.cart-sheet-header { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md) 0; border-bottom: 1px solid var(--surface-variant); position: sticky; top: 0; background: var(--surface-container-lowest); z-index: 1; }
.cart-sheet-title { font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; }
.clear-btn { display: flex; align-items: center; gap: var(--spacing-xs); border: none; background: transparent; color: var(--secondary); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; cursor: pointer; padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-md); }
.clear-btn:active { background: var(--surface-container-high); }
.cart-items { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.cart-item { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--surface-variant); }
.cart-item-info { flex: 1; }
.cart-item-name { margin: 0; font-family: var(--font-display); font-size: var(--text-body-lg); font-weight: 600; }
.cart-item-spec { margin: var(--spacing-xs) 0 0; font-size: var(--text-label-sm); color: var(--secondary); }
.cart-item-price { margin: var(--spacing-xs) 0 0; font-size: var(--text-body-md); font-weight: 700; color: var(--primary-container); }
.cart-item-qty { display: flex; align-items: center; gap: var(--spacing-sm); }
.qty-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--outline-variant); background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--on-surface-variant); }
.qty-btn .material-icons { font-size: 16px !important; }
.qty-btn-plus { background: var(--primary-container); border-color: var(--primary-container); color: var(--on-primary); }
.qty-num { font-size: var(--text-body-lg); font-weight: 600; min-width: 20px; text-align: center; }
.cart-empty { text-align: center; padding: var(--spacing-xl); color: var(--secondary); }
.cart-sheet-footer { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md) 0; }
.cart-total-label { font-size: var(--text-body-lg); font-weight: 600; }
.cart-total-price { color: var(--primary-container); font-weight: 800; }
.checkout-btn { padding: var(--spacing-md) var(--spacing-xl); border-radius: var(--radius-full); border: none; background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700; cursor: pointer; }

.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; display: flex; justify-content: space-around; align-items: center; padding: var(--spacing-xs) var(--gutter); background: var(--frosted-bg-heavy); backdrop-filter: blur(12px); border-top-left-radius: var(--radius-xl); border-top-right-radius: var(--radius-xl); box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04); }
.nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-full); color: var(--secondary); text-decoration: none; transition: all var(--transition-fast); }
.nav-item-active { background: rgba(255, 107, 0, 0.1); color: var(--primary-container); }
.nav-label { font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; }

</style>
