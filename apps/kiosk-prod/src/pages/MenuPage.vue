<template>
  <main class="page">
    <KioskTopBar
      :title="displayTitle"
      :device-code="deviceCode"
      :status-text="statusText"
      :show-ticket="true"
      :has-active-order="hasActiveOrder"
    />

    <div class="page-content">
      <section class="hero-context">
        <img :src="heroImage" alt="菜单横幅" class="hero-img" />
        <div class="hero-overlay">
          <h2>精选食材，炭火现烤</h2>
          <p>{{ displayTitle }}</p>
        </div>
      </section>

      <div ref="navSentinel" class="nav-sentinel"></div>
      <nav :class="['category-nav', navFloating && 'floating']">
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
        <template v-if="filteredDishes.length">
          <article v-for="dish in filteredDishes" :key="dish.id" :id="`dish-${dish.id}`" :class="['dish-card', dish.id === highlightDishId ? 'dish-highlight' : '']">
          <div class="dish-row">
            <div class="dish-image-wrap">
              <img :src="dish.image" :alt="dish.name" class="dish-image" />
              <span class="dish-image-disclaimer">*手工制作，实物与图片可能存在差异</span>
            </div>
            <div class="dish-body">
              <div class="dish-header">
                <h3 class="dish-name">{{ dish.name }}</h3>
                <span v-for="tag in dish.tags ?? []" :key="tag" class="dish-tag">{{ tag }}</span>
              </div>
              <p class="dish-desc">{{ dish.desc }}</p>
              <div class="dish-price-row">
                <template v-if="dish.promoPrice">
                  <span class="dish-price dish-price-original"><small class="c-sign">¥</small>{{ dish.price.toFixed(2) }}<template v-if="dish.portionSize">/{{ dish.portionSize }}串</template></span>
                  <span class="dish-promo-price"><small class="c-sign">¥</small>{{ dish.promoPrice.toFixed(2) }}<template v-if="dish.portionSize">/{{ dish.portionSize }}串</template></span>
                  <span class="dish-promo-tag">{{ dish.promotionName }}</span>
                </template>
                <span v-else class="dish-price"><small class="c-sign">¥</small>{{ dish.price.toFixed(2) }}<template v-if="dish.portionSize">/{{ dish.portionSize }}串</template></span>
              </div>
            </div>
          </div>

          <div v-if="dish.specGroups" class="dish-specs">
            <div v-for="(group, gi) in dish.specGroups" :key="gi" class="spec-group">
              <SpecSelector
                :group="group"
                :model-value="dish.selectedLabels?.[gi] ?? ''"
                @update:model-value="dish.selectedLabels![gi] = $event"
              />
              <input v-if="gi === qtyGroupIndex(dish.specGroups!)" class="qty-input" type="number" placeholder="其他数量"
                @input="onCustomQty(dish, gi, ($event.target as HTMLInputElement).value)" />
            </div>
          </div>

          <button class="add-card-btn" :class="{ 'in-cart': cartDishIds.has(dish.id) }" @click="addToCart(dish)">
            <span class="material-icons">{{ cartDishIds.has(dish.id) ? 'check_circle' : 'add' }}</span>
          </button>
        </article>
        </template>
        <p v-else class="empty-category">该分类暂无商品</p>
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
          <span class="cart-total"><small class="c-sign">¥</small>{{ cartTotal.toFixed(2) }}</span>
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
            <div class="cart-item-left">
              <div class="cart-item-name-row">
                <span class="cart-item-name">{{ item.name }}</span>
                <template v-if="isItemDiscounted(item)">
                  <span class="cart-original-price"><small class="c-sign">¥</small>{{ getItemOriginalPrice(item).toFixed(2) }}<template v-if="item.portionSize">/{{ item.portionSize }}串</template></span>
                  <span class="cart-final-price"><small class="c-sign">¥</small>{{ getItemFinalPrice(item).toFixed(2) }}<template v-if="item.portionSize">/{{ item.portionSize }}串</template></span>
                </template>
                <span v-else class="cart-final-price"><small class="c-sign">¥</small>{{ item.price.toFixed(2) }}<template v-if="item.portionSize">/{{ item.portionSize }}串</template></span>
              </div>
              <p class="cart-item-spec" @click="startEditSpice(item)">
                {{ item.specs }}
                <span class="spec-edit-icon material-icons">edit</span>
              </p>
            </div>
            <div class="cart-item-right">
              <div class="cart-item-qty">
                <button class="qty-btn" @click="updateCartQuantity(item.dishId, -1)"><span class="material-icons">remove</span></button>
                <span class="qty-num">{{ item.quantity }}</span>
                <button class="qty-btn qty-btn-plus" @click="updateCartQuantity(item.dishId, 1)"><span class="material-icons">add</span></button>
              </div>
              <span v-if="cartItemPromotionLabel(item)" class="cart-promo-tag">{{ cartItemPromotionLabel(item) }}</span>
            </div>
          </div>
        </div>

        <!-- 营销活动区 -->
        <div v-if="cartQuote" class="cart-promo-section">
          <div v-for="promo in cartQuote.appliedPromotions" :key="promo.id" class="promo-row">
            <span class="promo-icon material-icons">sell</span>
            <div class="promo-info">
              <span class="promo-name">{{ promo.name }}</span>
              <!-- <span class="promo-desc">{{ promo.description }}</span> -->
            </div>
            <span class="promo-saving">- <small class="c-sign">¥</small>{{ promo.discount.toFixed(2) }}</span>
          </div>
          <div v-for="hint in cartQuote.hints" :key="hint" class="promo-hint">
            <span class="material-icons">lightbulb</span>
            <span v-html="highlightAmount(hint)"></span>
            <button v-if="hint.includes('可享')" class="continue-order-btn" @click="showCart = false">继续点餐</button>
          </div>
          <div v-if="cartQuote.totals.discountAmount > 0" class="promo-summary">
            <span>已优惠</span>
            <span class="promo-summary-amount">- <small class="c-sign">¥</small>{{ cartQuote.totals.discountAmount.toFixed(2) }}</span>
          </div>
        </div>
        <!-- Spiciness Editor -->
        <van-action-sheet v-model:show="showSpecEditor" title="修改辣度" close-on-popup-close>
          <div class="spec-editor-content">
            <SpecSelector
              v-if="getSpicinessGroup()"
              :group="getSpicinessGroup()!"
              :model-value="editingSpiciness"
              @update:model-value="confirmSpiceChange"
            />
          </div>
        </van-action-sheet>
        <div v-if="cartItems.length === 0" class="cart-empty">购物车是空的</div>
        <div class="cart-sheet-footer">
          <span class="cart-total-label">
            合计：
            <template v-if="cartQuote && cartQuote.totals.discountAmount > 0">
              <span class="strikethrough-price"><small class="c-sign">¥</small>{{ cartQuote.totals.originalAmount.toFixed(2) }}</span>
            </template>
            <span class="cart-total-price">&nbsp;<small class="c-sign">¥</small>{{ cartTotal.toFixed(2) }}</span>
          </span>
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
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import 'vant/es/toast/style'
import { SPECS_PRESETS, type SpecGroup, type SpecPreset } from '@diancan/shared'
import SpecSelector from '@/components/SpecSelector.vue'
import { readCart, clearCart as clearCartStorage, addToCart as addToCartStorage, saveCart, updateCartQuantity as updateCartQuantityStorage, StoredCartItem } from '@/utils/cart'
import { getDishImage } from '@/utils/dishImages'
import { apiPost } from '@/utils/api'
import heroImage from '@/assets/images/pages/hero.jpg'
import KioskTopBar from '@/components/KioskTopBar.vue'

interface QuoteLineItem {
  dishId: string; name: string; quantity: number
  unitPrice: number; finalUnitPrice: number; finalSubtotal: number
  specs?: string; promotionLabel?: string
}
interface AppliedPromotion {
  id: string; name: string; discount: number; description: string
}
interface QuoteResponse {
  quoteId: string
  itemDetails: QuoteLineItem[]
  appliedPromotions: AppliedPromotion[]
  totals: { originalAmount: number; discountAmount: number; payableAmount: number }
  hints: string[]
}

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
  selectedLabels?: (string | string[])[]
  promotionId?: string; promoPrice?: number; promotionName?: string
  portionSize?: number
}

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const errorMessage = ref('')
const highlightDishId = ref('')
const navFloating = ref(false)
const navSentinel = ref<HTMLElement | null>(null)
let navObserver: IntersectionObserver | null = null
const merchantName = ref('')
const branchName = ref('')
const deviceId = ref('')
const deviceCode = ref('')
const statusText = ref('')
const displayTitle = computed(() => {
  const m = merchantName.value
  const b = branchName.value
  return m && b ? `${m}（${b}）` : m || b || '典韦烤串'
})
const categories = ref<Category[]>([])
const dishes = ref<Dish[]>([])
const selectedCategoryId = ref('')
const showCart = ref(false)
const hasActiveOrder = ref(false)
const cartItems = ref<StoredCartItem[]>([])
const cartQuote = ref<QuoteResponse | null>(null)
let quoteTimer: ReturnType<typeof setTimeout> | undefined

function qtyGroupIndex(groups: SpecGroup[]) {
  return groups.findIndex((g) => g.name === '串数' || g.name === '份数')
}

watch(showCart, (val) => {
  if (val) debouncedFetchQuote()
})

function debouncedFetchQuote() {
  clearTimeout(quoteTimer)
  quoteTimer = setTimeout(fetchQuote, 300)
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

async function fetchQuote() {
  const items = readCart()
  if (!items.length) { cartQuote.value = null; return }

  try {
    cartQuote.value = await apiPost<QuoteResponse>('/api/cart/quote', {
      items: items.map((i) => ({
        dishId: i.baseDishId,
        quantity: i.quantity,
        specs: i.specs ?? '',
      })),
    })
  } catch {
    cartQuote.value = null
  }
}


const cartCount = computed(() => cartItems.value.reduce((s, i) => s + i.quantity, 0))
const cartTotal = computed(() => {
  if (cartQuote.value) return cartQuote.value.totals.payableAmount
  return cartItems.value.reduce((t, i) => t + i.price * i.quantity / (i.portionSize || 1), 0)
})
const cartDishIds = computed(() => new Set(cartItems.value.map((i) => i.dishId)))
const filteredDishes = computed(() => dishes.value.filter(d => d.categoryId === selectedCategoryId.value))

function initSpecs(preset: SpecPreset): { groups: SpecGroup[]; defaults: (string | string[])[] } | null {
  const specDefs = SPECS_PRESETS[preset]
  if (!specDefs || specDefs.length === 0) return null
  const defaults = specDefs.map((g) => {
    if (g.type === 'multi') return [g.options[0]?.label ?? ''].filter(Boolean)
    if (g.name === '辣度') return g.options[1]?.label ?? g.options[0]?.label ?? ''
    return g.options[0]?.label ?? ''
  })
  return { groups: specDefs, defaults }
}

function onCustomQty(dish: Dish, gi: number, value: string) {
  if (!dish.selectedLabels) return
  dish.selectedLabels[gi] = value
    ? dish.portionSize ? `${value}份` : `x${value}`
    : dish.specGroups?.[gi]?.options?.[0]?.label || 'x2'
}

function hydrateCart() {
  cartItems.value = readCart()
}

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

function confirmSpiceChange(newSpiciness: string) {
  editingSpiciness.value = newSpiciness
  const item = editingCartItem.value
  if (!item) return
  const parts = (item.specs || '').split(' · ')
  parts[0] = newSpiciness
  const newSpecs = parts.filter((p, i) => i === 0 || (!p.startsWith('x') && !p.endsWith('份'))).join(' · ')
  const newDishId = `${item.baseDishId}|${newSpecs}`
  const existing = cartItems.value.find((i) => i.dishId === newDishId)
  if (existing) {
    existing.quantity += item.quantity
    const idx = cartItems.value.findIndex((i) => i.dishId === item.dishId)
    if (idx > -1) cartItems.value.splice(idx, 1)
  } else {
    item.dishId = newDishId
    item.specs = newSpecs
  }
  saveCart(cartItems.value)
  hydrateCart()
  showSpecEditor.value = false
  editingCartItem.value = null
}

function addToCart(dish: Dish) {
  const specsParts: string[] = []
  let qty = dish.portionSize || 1
  if (dish.selectedLabels) {
    for (let gi = 0; gi < dish.selectedLabels.length; gi++) {
      const val = dish.selectedLabels[gi]
      if (!val) continue
      if (Array.isArray(val)) {
        specsParts.push(val.join('+'))
      } else if (dish.specGroups && gi === qtyGroupIndex(dish.specGroups)) {
        const multiplier = parseInt(val.replace(/^x/i, '').replace(/份$/, '')) || 1
        if (!dish.portionSize) {
          qty = multiplier
        } else {
          qty = dish.portionSize * multiplier
        }
      } else {
        specsParts.push(val)
      }
    }
  }
  const specsKey = specsParts.join(' · ')
  const price = dish.promoPrice ?? dish.price

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

function getPortionSize(dishId: string): number {
  const baseId = dishId.split('|')[0]
  const dish = dishes.value.find((d) => String(d.id) === String(baseId))
  return dish?.portionSize ?? 0
}

function isPortionDish(dishId: string): boolean {
  return getPortionSize(dishId) > 0
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


async function loadMenu(bootstrap: { deviceId?: string }) {
  const params = bootstrap.deviceId ? `?deviceId=${bootstrap.deviceId}` : ''
  const res = await fetch(`/api/catalog/menu${params}`)
  if (!res.ok) throw new Error('接口返回异常，请检查 api-core 是否已启动')
  return res.json()
}

async function loadData() {
  loading.value = true; errorMessage.value = ''
  try {
    const savedDeviceSN = localStorage.getItem('kiosk-device-sn') || ''
    const bootstrapResponse = await fetch(`/api/system/bootstrap${savedDeviceSN ? `?sn=${savedDeviceSN}` : ''}`)
    if (!bootstrapResponse.ok) throw new Error('接口返回异常，请检查 api-core 是否已启动')
    const bootstrap = await bootstrapResponse.json() as { merchantName?: string; branchName: string; deviceId?: string; deviceCode?: string; statusText?: string; deviceActive?: boolean }

    if (bootstrap.deviceActive === false) {
      localStorage.clear()
      throw new Error('该设备已下线，请联系管理员')
    }

    // 验证 token 对应的设备与 SN 匹配
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
      categories: Category[]
      dishes: { id: string; categoryId: string; name: string; price: number; desc: string; image?: string; tags?: string[]; specsPreset?: SpecPreset; promoPrice?: number | null; promotionName?: string | null; portionSize?: number }[]
    }

    merchantName.value = bootstrap.merchantName ?? ''
    branchName.value = bootstrap.branchName
    deviceId.value = bootstrap.deviceId ?? ''
    deviceCode.value = bootstrap.deviceCode ?? ''
    statusText.value = bootstrap.statusText ?? ''
    categories.value = [...menu.categories].sort((a, b) => a.sort - b.sort)

    dishes.value = menu.dishes.map((d) => {
      const specResult = d.specsPreset ? initSpecs(d.specsPreset) : null
      const groups = specResult?.groups ? structuredClone(specResult.groups) : undefined
      // 按份卖时，串数 → 份数，x1 → 1份，最多5份
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
        id: d.id,
        categoryId: d.categoryId,
        name: d.name,
        price: d.price,
        desc: d.desc,
        image: d.image || getDishImage(d.id),
        tags: d.tags,
        specsPreset: d.specsPreset,
        specGroups: groups,
        selectedLabels: defaults,
        promoPrice: d.promoPrice ?? undefined,
        promotionName: d.promotionName ?? undefined,
        portionSize: d.portionSize ?? 0,
      }
    })

    selectedCategoryId.value = categories.value[0]?.id ?? ''

    // 锚定菜品（在 loading=false 后执行，确保 DOM 已渲染）
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

// 加载完成后执行锚定滚动
watch(loading, async (val) => {
  if (val) return
  const targetDishId = route.query.dishId as string
  if (!targetDishId) return
  const dish = dishes.value.find((d) => d.id === targetDishId)
  if (!dish) return
  await nextTick()
  await nextTick()
  highlightDishId.value = targetDishId
  const el = document.getElementById(`dish-${targetDishId}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => { highlightDishId.value = '' }, 2000)
})

onMounted(() => {
  void loadData()
  hydrateCart()
  navObserver = new IntersectionObserver(
    ([entry]) => { navFloating.value = !entry.isIntersecting },
    { rootMargin: '-52px 0px 0px 0px' } // top bar height
  )
  if (navSentinel.value) navObserver.observe(navSentinel.value)
})

onBeforeUnmount(() => {
  navObserver?.disconnect()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
.material-icons { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; font-size: 24px; line-height: 1; }
.page { min-height: 100vh; background: var(--surface); padding-top: 56px; padding-bottom: 180px; }
.page-content { padding: 0 var(--container-margin) var(--spacing-lg); max-width: 600px; margin: 0 auto; }
.hero-context { position: relative; width: auto; height: 228px; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); overflow: hidden; margin-bottom: var(--spacing-lg); }
.hero-img { width: 100%; height: auto; display: block; object-fit: cover; filter: brightness(0.72); }
.hero-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: var(--spacing-md) max(var(--container-margin), calc(50vw - 300px + var(--container-margin))); background: linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.48) 100%); }
.hero-overlay h2 { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 800; line-height: 1.2; color: #fff; }
.hero-overlay p { margin: var(--spacing-xs) 0 0; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; color: rgba(255, 255, 255, 0.92); }
.category-nav { display: flex; justify-content: center; gap: var(--spacing-sm); width: auto; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); padding: var(--spacing-md) var(--container-margin) 14px; position: sticky; top: 52px; z-index: 40; overflow-x: auto; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: box-shadow var(--transition-fast); }
.category-nav.floating { box-shadow: 0 6px 18px rgba(87, 32, 0, 0.05); }
.nav-sentinel { width: 1px; height: 1px; pointer-events: none; }
.category-pill { display: flex; align-items: center; gap: 10px; padding: 12px 22px; border: 1px solid rgba(0,0,0,0.06); border-radius: var(--radius-full); background: var(--surface-container-high); color: var(--on-surface-variant); font-family: var(--font-display); font-size: var(--text-body-lg); font-weight: 700; cursor: pointer; transition: all var(--transition-fast); }
.category-pill .material-icons { font-size: 20px !important; }
.category-pill-active { background: var(--primary-container); color: var(--on-primary); box-shadow: 0 8px 20px rgba(255, 107, 0, 0.18); }
.status-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-md); padding: var(--spacing-xl); margin-top: var(--spacing-lg); border-radius: var(--radius-xl); background: var(--surface-container-low); }
.status-card .material-icons { font-size: 48px !important; }
.error-card { color: var(--error); }
.loading-card { color: var(--secondary); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--surface-container); border-top-color: var(--primary-container); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.dish-list { display: flex; flex-direction: column; gap: var(--spacing-md); }
.empty-category { text-align: center; padding: var(--spacing-xl); color: var(--secondary); font-family: var(--font-display); font-size: var(--text-body-md); }
@media (min-width: 500px) {
  .dish-list { display: grid; grid-template-columns: 1fr 1fr; }
  .page-content { max-width: none; }
  .hero-overlay { padding-bottom: var(--spacing-lg); }
  .category-nav { gap: 14px; padding-bottom: 18px; }
  .category-pill {
    padding: 14px 26px;
    font-size: var(--text-label-lg);
  }
  .category-pill .material-icons { font-size: 22px !important; }
}
@media (min-width: 1200px) {
  .dish-list { grid-template-columns: repeat(4, 1fr); }
}
.dish-card { position: relative; padding: var(--spacing-md); background: var(--surface-container-lowest); border-radius: var(--radius-xl); border: 1px solid var(--card-border-light); box-shadow: var(--shadow-md); transition: border-color 0.3s; }

@keyframes dish-blink {
  0%, 100% { border-color: var(--primary-container); }
  50% { border-color: transparent; }
}
.dish-highlight { animation: dish-blink 0.3s ease 6; }
.dish-row { display: flex; flex-direction: column; gap: var(--spacing-md); }
.dish-image { width: 100%; height: 200px; border-radius: var(--radius-lg); object-fit: cover; }
.dish-image-wrap { position: relative; }
.dish-image-disclaimer { position: absolute; bottom: 4px; right: 4px; font-size: 10px; color: rgba(255,255,255,0.85); background: rgba(0,0,0,0.55); padding: 1px 6px; border-radius: 4px; line-height: 1.4; pointer-events: none; }
.dish-body { display: flex; flex-direction: column; }
.dish-header { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; margin-bottom: var(--spacing-xs); }
.dish-name { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; line-height: 1.3; color: var(--on-surface); }
.dish-tag { padding: 2px 8px; border-radius: var(--radius-full); background: rgba(255, 107, 0, 0.1); color: var(--primary-container); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; }
.dish-desc { margin: 0 0 var(--spacing-sm); font-family: var(--font-body); font-size: var(--text-body-md); line-height: 1.5; color: var(--secondary); flex: 1; }
.dish-price-row { display: flex; align-items: center; gap: var(--spacing-sm); margin-top: var(--spacing-xs); }
.dish-price { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.dish-price-original { font-size: 20px; font-weight: 600; color: var(--secondary); text-decoration: line-through; }
.dish-promo-price { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.dish-promo-tag { display: inline-block; padding: 1px 8px; border-radius: 4px; background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: 11px; font-weight: 700; }
.dish-specs { margin-top: var(--spacing-md); padding-top: var(--spacing-md); padding-bottom: var(--spacing-sm); border-top: 1px solid var(--card-border-subtle); display: flex; flex-direction: column; gap: var(--spacing-md); }
.spec-group { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.qty-input { width: 96px; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--outline-variant); background: transparent; font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; color: var(--on-surface); outline: none; }
.qty-input:focus { border-color: var(--primary-container); }
.qty-input::placeholder { color: var(--outline); }
.add-card-btn { position: absolute; bottom: var(--spacing-md); right: var(--spacing-md); width: 36px; height: 36px; border: none; border-radius: 50%; background: var(--primary-container); color: var(--on-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3); transition: transform var(--transition-fast); }
.add-card-btn .material-icons { font-size: 20px !important; }

.add-card-btn:active { transform: scale(0.9); }

.add-card-btn.in-cart { background: #4caf50; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3); }
.cart-bar { position: fixed; bottom: 80px; left: 0; right: 0; z-index: 80; max-width: 600px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md); background: var(--frosted-bg); backdrop-filter: blur(12px); border-radius: var(--radius-xl); border: 1px solid var(--card-border-strong); box-shadow: var(--shadow-lg); cursor: pointer; }
.cart-bar:active { transform: scale(0.99); }
.cart-left { display: flex; align-items: center; gap: var(--spacing-md); }
.cart-icon-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--primary-container); box-shadow: var(--shadow-primary); }
.cart-icon-wrap .material-icons { font-size: 30px !important; color: var(--on-primary); }
.cart-badge { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: var(--radius-full); background: var(--error); color: var(--on-error); font-family: var(--font-display); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
.cart-info { display: flex; flex-direction: column; }
.cart-label { font-family: var(--font-display); font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--secondary); }
.cart-total { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.cart-btn { display: inline-flex; align-items: center; justify-content: center; padding: 14px 22px; border: none; border-radius: var(--radius-full); background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700; line-height: 1; white-space: nowrap; cursor: pointer; box-shadow: var(--shadow-primary); }
.cart-sheet { padding: 0 var(--container-margin) var(--container-margin); min-height: 200px; max-width: 600px; margin: 0 auto; }
.cart-sheet-header { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md) 0; border-bottom: 1px solid var(--surface-variant); position: sticky; top: 0; background: var(--surface-container-lowest); z-index: 1; }
.cart-sheet-title { font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; }
.clear-btn { display: flex; align-items: center; gap: var(--spacing-xs); border: none; background: transparent; color: var(--secondary); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; cursor: pointer; padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-md); }
.clear-btn:active { background: var(--surface-container-high); }
.cart-items { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.cart-item { display: flex; justify-content: space-between; align-items: flex-start; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--surface-variant); gap: var(--spacing-sm); }
.cart-item-left { flex: 1; min-width: 0; }
.cart-item-name-row { display: flex; align-items: center; gap: var(--spacing-xs); flex-wrap: wrap; }
.cart-item-name { font-family: var(--font-display); font-size: var(--text-body-lg); font-weight: 600; }
.cart-original-price { text-decoration: line-through; color: var(--secondary); font-size: 11px; font-weight: 400; }
.cart-final-price { font-size: var(--text-body-md); font-weight: 700; color: var(--primary-container); }
.cart-item-spec { margin: var(--spacing-xs) 0 0; font-size: var(--text-label-sm); color: var(--secondary); display: flex; align-items: center; gap: 4px; cursor: pointer; }
.spec-edit-icon { font-size: 14px !important; opacity: 0.5; }
.cart-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: var(--spacing-xs); flex-shrink: 0; }
.cart-promo-tag { display: inline-block; padding: 1px 8px; border-radius: 4px; background: var(--primary-container); color: var(--on-primary); font-size: 11px; font-weight: 700; }
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
.spec-editor-content { padding: var(--spacing-lg); display: flex; flex-direction: column; align-items: center; }

/* 营销活动区 */
.cart-promo-section { margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--surface-container-low); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: var(--spacing-sm); }
.promo-row { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--text-label-sm); }
.promo-icon { font-size: 16px !important; color: var(--primary-container); flex-shrink: 0; }
.promo-info { flex: 1; display: flex; flex-direction: column; }
.promo-name { font-weight: 600; color: var(--on-surface); }
.promo-desc { font-size: 11px; color: var(--secondary); }
.promo-saving { font-weight: 700; color: var(--error); flex-shrink: 0; }
.promo-hint { display: flex; align-items: center; gap: var(--spacing-sm); font-size: 11px; color: var(--secondary); }
.promo-hint .material-icons { font-size: 14px !important; color: var(--primary-container); flex-shrink: 0; }
.promo-hint .hl-amount { color: var(--primary-container); font-weight: 800; }
.promo-hint .hl-promo { color: var(--primary-container); font-weight: 700; }
.promo-hint .continue-order-btn { flex-shrink: 0; padding: 2px 12px; border: 1px dashed var(--primary-container); border-radius: var(--radius-full); background: transparent; color: var(--primary-container); font-family: var(--font-display); font-size: 11px; font-weight: 600; cursor: pointer; }
.promo-hint .continue-order-btn:active { background: var(--surface-container-high); }
.promo-summary { display: flex; justify-content: space-between; align-items: center; padding-top: var(--spacing-sm); border-top: 1px dashed var(--outline-variant); font-size: var(--text-label-sm); font-weight: 600; }
.promo-summary-amount { color: var(--error); font-weight: 700; }
.strikethrough-price { text-decoration: line-through; color: var(--secondary); font-weight: 400; font-size: var(--text-label-sm); }
.c-sign { font-size: 0.85em; padding: 0 1px; }

.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; display: flex; justify-content: space-around; align-items: center; padding: var(--spacing-xs) var(--gutter); background: var(--frosted-bg-heavy); backdrop-filter: blur(12px); border-top-left-radius: var(--radius-xl); border-top-right-radius: var(--radius-xl); box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04); }
.nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-full); color: var(--secondary); text-decoration: none; transition: all var(--transition-fast); }
.nav-item-active { background: rgba(255, 107, 0, 0.1); color: var(--primary-container); }
.nav-label { font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; }

@media (max-width: 499px) {
  .page {
    padding-top: 52px;
    padding-bottom: 156px;
  }

  .hide-mobile { display: none; }

  .category-nav {
    top: 52px;
    overflow-x: auto;
    padding: 10px var(--container-margin) 12px;
  }

  .hero-context {
    margin-bottom: var(--spacing-md);
  }

  .hero-overlay h2,
  .dish-name,
  .cart-sheet-title {
    font-size: var(--text-headline-lg);
  }

  .category-pill {
    flex-shrink: 0;
    padding: 10px 18px;
    font-size: var(--text-label-lg);
  }

  .category-pill .material-icons {
    font-size: 18px !important;
  }

  .dish-card {
    padding: var(--spacing-sm);
  }

  .dish-image {
    height: 176px;
  }

  .dish-price,
  .dish-promo-price,
  .cart-total {
    font-size: var(--text-headline-lg);
  }

  .dish-price-original {
    font-size: 16px;
  }

  .add-card-btn {
    width: 32px;
    height: 32px;
    bottom: var(--spacing-sm);
    right: var(--spacing-sm);
  }

  .add-card-btn .material-icons {
    font-size: 18px !important;
  }

  .cart-bar {
    bottom: 70px;
    left: 8px;
    right: 8px;
    padding: 10px 12px;
    border-radius: var(--radius-lg);
  }

  .cart-left {
    gap: 10px;
  }

  .cart-icon-wrap {
    width: 46px;
    height: 46px;
    border-radius: var(--radius-md);
  }

  .cart-icon-wrap .material-icons {
    font-size: 24px !important;
  }

  .cart-btn,
  .checkout-btn {
    min-height: 44px;
    padding: 10px 16px;
    font-size: var(--text-body-lg);
    border-radius: var(--radius-lg);
  }

  .qty-btn {
    width: 26px;
    height: 26px;
  }

  .qty-btn .material-icons {
    font-size: 14px !important;
  }

  .cart-sheet {
    padding: 0 12px 12px;
  }

  .cart-sheet-footer {
    gap: 12px;
  }

  .bottom-nav {
    padding: 4px 8px;
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
  }

  .nav-item {
    padding: 6px 10px;
  }
}

</style>
