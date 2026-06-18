<template>
  <main class="page">
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="brand">
        <img :src="logoImage" alt="Logo" class="brand-logo" />
        <h1>{{ displayTitle }}</h1>
      </div>
      <div class="top-bar-right">
        <button class="theme-btn" @click="themeIcon = doToggleTheme()">
          <span class="material-icons">{{ themeIcon }}</span>
        </button>
        <button class="close-btn" @click="goHome">
          <span class="material-icons">close</span>
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="page-content">
      <!-- Hero Context -->
      <section class="hero-context">
        <img
          src="/src/assets/images/pages/banner.png"
          alt="订单确认"
          class="hero-img"
        />
        <div class="hero-overlay">
          <h2>订单确认</h2>
          <p>感谢选择 {{ displayTitle }}</p>
        </div>
      </section>

      <!-- Empty State -->
      <section v-if="!cartItems.length" class="empty-state">
        <span class="material-icons">shopping_cart_off</span>
        <p>购物车为空，请先返回菜单页添加菜品。</p>
        <p v-if="errorMessage" class="page-error">{{ errorMessage }}</p>
        <router-link to="/menu" class="back-link">
          <span class="material-icons">arrow_back</span>
          <span>返回菜单</span>
        </router-link>
      </section>

      <template v-else>
        <!-- Order Type Toggle -->
        <section class="order-type-section">
          <div class="order-type-toggle">
            <button
              :class="['toggle-btn', orderType === 'dine-in' && 'toggle-btn-active']"
              @click="orderType = 'dine-in'"
            >
              堂食
            </button>
            <button
              :class="['toggle-btn', orderType === 'takeaway' && 'toggle-btn-active']"
              @click="orderType = 'takeaway'"
            >
              自提
            </button>
            <div class="toggle-indicator" :style="{ left: orderType === 'dine-in' ? '4px' : 'calc(50%)' }"></div>
          </div>
        </section>

        <!-- Success State -->
        <section v-if="createdOrder" class="success-card">
          <div class="success-header">
            <span class="material-icons success-icon">check_circle</span>
            <h2>下单成功</h2>
          </div>
          <div class="success-grid">
            <div class="success-item">
              <p class="success-label">订单号</p>
              <p class="success-value">{{ createdOrder.orderNo }}</p>
            </div>
            <div class="success-item">
              <p class="success-label">取餐码</p>
              <p class="success-value success-code">{{ createdOrder.pickupCode }}</p>
            </div>
          </div>
          <p class="success-hint">正在跳转取餐页...</p>
        </section>

        <!-- Order Items -->
        <section class="order-card">
          <div class="card-header">
            <h3>已选项目</h3>
            <span class="item-count">{{ cartItems.length }} 个项目</span>
          </div>

          <div class="order-items">
            <div
              v-for="item in quote?.itemDetails ?? []"
              :key="item.dishId"
              class="order-item"
            >
              <img :src="getItemImage(item.dishId)" :alt="item.name" class="item-image" />
              <div class="item-info">
                <p class="item-name">{{ item.name }}</p>
                <p v-if="item.specs" class="item-variant">{{ item.specs }}</p>
              </div>
              <div class="item-price-col">
                <p class="item-price"><small class="c-sign">¥</small>{{ item.finalUnitPrice.toFixed(2) }}</p>
                <p class="item-qty">x{{ item.quantity }}</p>
                <p v-if="item.promotionLabel" class="item-promo-tag">{{ item.promotionLabel }}</p>
              </div>
            </div>
          </div>

          <div class="order-summary">
            <div class="summary-row">
              <span>商品总计</span>
              <span><small class="c-sign">¥</small>{{ quote?.totals.originalAmount.toFixed(2) || '0.00' }}</span>
            </div>
            <div v-if="quote?.totals.discountAmount" class="summary-row summary-discount">
              <span>优惠折扣</span>
              <span>-<small class="c-sign">¥</small>{{ quote.totals.discountAmount.toFixed(2) }}</span>
            </div>
          </div>

          <div v-if="quote?.appliedPromotions?.length" class="promo-card">
            <div v-for="p in quote.appliedPromotions" :key="p.id" class="promo-row">
              <span class="material-icons promo-icon">sell</span>
              <div class="promo-info">
                <span class="promo-name">{{ p.name }}</span>
                <span class="promo-desc">{{ p.description }}</span>
              </div>
              <span class="promo-saving">-<small class="c-sign">¥</small>{{ p.discount.toFixed(2) }}</span>
            </div>
          </div>

          <div v-if="quote?.hints?.length" class="hints-card">
            <div v-for="(hint, i) in quote.hints" :key="i" class="hint-row">
              <span class="material-icons hint-icon">info</span>
              <span class="hint-text">{{ hint }}</span>
            </div>
          </div>

          <div class="total-divider"></div>
          <div class="total-row">
            <span class="total-label">合计</span>
            <span class="total-amount"><small class="c-sign">¥</small>{{ quote?.totals.payableAmount.toFixed(2) || '0.00' }}</span>
          </div>
        </section>

        <!-- Payment Method -->
        <div class="payment-row">
          <section v-if="!createdOrder" class="payment-card continue-ordering">
            <router-link to="/menu" class="payment-item back-menu-link">
              <span class="material-icons payment-arrow">chevron_left</span>
              <span class="material-icons payment-icon">add_circle</span>
              <span class="payment-name">继续点餐</span>
            </router-link>
          </section>

          <section class="payment-card" :class="{ 'payment-active': paymentMethod === 'wechat' }" @click="paymentMethod = 'wechat'">
            <div class="payment-item">
              <span class="payment-icon-wechat">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM12 2C6.48 2 2 5.48 2 9.5c0 2.18 1.08 4.17 2.9 5.7L4 19l3.9-2.03c1.3.38 2.69.53 4.1.53 5.52 0 10-3.48 10-7.5S17.52 2 12 2z"/></svg>
              </span>
              <span class="payment-name">微信支付</span>
            </div>
          </section>

          <section class="payment-card" :class="{ 'payment-active': paymentMethod === 'alipay' }" @click="paymentMethod = 'alipay'">
            <div class="payment-item">
              <span class="material-icons payment-icon">account_balance_wallet</span>
              <span class="payment-name">支付宝</span>
            </div>
          </section>
        </div>

        <!-- Payment Popup -->
        <Teleport to="body">
          <div v-if="showPaymentPopup" class="payment-overlay" @click.self="showPaymentPopup = false">
            <div class="payment-popup">
              <div class="popup-header">
                <span class="popup-icon">
                  <span class="material-icons">qr_code_scanner</span>
                </span>
                <h3>请扫码支付</h3>
                <p class="popup-amount"><small class="c-sign">¥</small>{{ quote?.totals.payableAmount.toFixed(2) || '0.00' }}</p>
              </div>
              <div class="popup-qr">
                <img :src="paymentQrImage" :alt="paymentMethod === 'wechat' ? '微信支付' : '支付宝支付'" class="qr-img" />
              </div>
              <p class="popup-hint">打开{{ paymentMethod === 'wechat' ? '微信' : '支付宝' }}扫一扫付款</p>
              <p v-if="orderError" class="popup-error">{{ orderError }}</p>
              <button class="popup-paid-btn" :disabled="submitting" @click="submitOrder">
                <template v-if="submitting">
                  <span class="spinner"></span>
                  <span>处理中...</span>
                </template>
                <template v-else>
                  <span class="material-icons">check_circle</span>
                  <span>我已支付</span>
                </template>
              </button>
              <button class="popup-cancel-btn" @click="showPaymentPopup = false">取消支付</button>
            </div>
          </div>
        </Teleport>
      </template>
    </div>

    <!-- Bottom Action Bar -->
    <footer v-if="cartItems.length && !createdOrder" class="action-bar">
      <div class="action-left">
        <span class="action-label">待支付金额</span>
        <div class="action-amount">
          <span class="currency"><small class="c-sign">¥</small></span>
          <span class="amount">{{ quote?.totals.payableAmount.toFixed(2) || '0.00' }}</span>
        </div>
      </div>
      <button
        class="action-btn"
        :disabled="submitting || !quote"
        @click="showPaymentPopup = true"
      >
        确认支付
      </button>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearCart, readCart } from '@/utils/cart'
import { getDishImage } from '@/utils/dishImages'
import { getTheme, setTheme } from '@/utils/theme'
import logoImage from '@/assets/images/pages/logo.png'

interface QuoteLineItem {
  dishId: string
  name: string
  quantity: number
  unitPrice: number
  finalUnitPrice: number
  finalSubtotal: number
  specs?: string
  promotionLabel?: string
}

interface AppliedPromotion {
  id: string
  name: string
  discount: number
  description: string
}

interface QuoteResponse {
  quoteId: string
  itemDetails: QuoteLineItem[]
  appliedPromotions: AppliedPromotion[]
  totals: {
    originalAmount: number
    discountAmount: number
    payableAmount: number
  }
  hints: string[]
}

interface CreatedOrder {
  orderNo: string
  pickupCode: string
  status: string
}

const router = useRouter()
const cartItems = ref(readCart())

const themeIcon = ref(getIcon())
function getIcon(): string {
  const t = getTheme()
  return t === 'auto' ? 'brightness_auto' : t === 'dark' ? 'dark_mode' : 'light_mode'
}
function doToggleTheme(): string {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
  return getIcon()
}
const loading = ref(false)
const submitting = ref(false)
const orderError = ref('')
const errorMessage = ref('')
const quote = ref<QuoteResponse | null>(null)
const createdOrder = ref<CreatedOrder | null>(null)
const merchantName = ref('Sizzling Skewers')
const branchName = ref('')
const displayTitle = computed(() => {
  const m = merchantName.value
  const b = branchName.value
  return m && b ? `${m}（${b}）` : m || b || '典韦烤串'
})
const orderType = ref<'dine-in' | 'takeaway'>('dine-in')
const paymentMethod = ref<'wechat' | 'alipay'>('wechat')
const showPaymentPopup = ref(false)

const qrModules = import.meta.glob('@/assets/images/payments/*.{jpg,png,webp}', { eager: true, query: '?url', import: 'default' })
const qrMap: Record<string, string> = {}
for (const [path, url] of Object.entries(qrModules)) {
  const match = path.match(/([^/\\]+)\.(jpg|png|webp)$/)
  if (match) qrMap[match[1]] = url as string
}
const paymentQrImage = computed(() => qrMap[paymentMethod.value] || '')

function getItemImage(dishId: string): string {
  const cartItem = cartItems.value.find((i) => i.baseDishId === dishId)
  return cartItem?.image || getDishImage(dishId)
}

function goHome() {
  router.push('/')
}

async function reloadQuote() {
  cartItems.value = readCart()
  if (!cartItems.value.length) {
    quote.value = null
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const bootstrapResponse = await fetch('/api/system/bootstrap')
    if (!bootstrapResponse.ok) {
      throw new Error('点菜机启动配置获取失败')
    }

    const bootstrap = await bootstrapResponse.json() as {
      merchantId: string
      branchId: string
      deviceId: string
      merchantName?: string
      branchName?: string
    }

    if (bootstrap.merchantName) {
      merchantName.value = bootstrap.merchantName
    }
    if (bootstrap.branchName) {
      branchName.value = bootstrap.branchName
    }

    // 使用 SN 认证获取当前有效设备 ID
    const savedSN = localStorage.getItem('kiosk-device-sn')
    if (savedSN) {
      const authRes = await fetch('/api/system/device-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sn: savedSN }),
      })
      if (authRes.ok) {
        const auth = await authRes.json()
        bootstrap.deviceId = auth.deviceId
      }
    }

    const quoteResponse = await fetch('/api/cart/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: bootstrap.merchantId,
        branchId: bootstrap.branchId,
        deviceId: bootstrap.deviceId,
        items: cartItems.value.map((item) => ({
          dishId: item.baseDishId,
          quantity: item.quantity,
          specs: item.specs ?? '',
        })),
      }),
    })

    if (!quoteResponse.ok) {
      throw new Error('试算失败，请确认 api-core 已启动')
    }

    quote.value = await quoteResponse.json() as QuoteResponse
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '试算失败'
  } finally {
    loading.value = false
  }
}

async function submitOrder() {
  if (!quote.value || !cartItems.value.length || submitting.value) return

  submitting.value = true
  orderError.value = ''

  try {
    // Verify device SN
    const savedSN = localStorage.getItem('kiosk-device-sn')
    if (!savedSN) throw new Error('设备未认证，请返回首页重新认证')
    const authRes = await fetch('/api/system/device-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sn: savedSN }),
    })
    if (!authRes.ok) {
      localStorage.removeItem('kiosk-device-sn')
      throw new Error('设备码已失效，请返回首页重新认证')
    }
    const authData = await authRes.json()

    const bootstrapResponse = await fetch('/api/system/bootstrap')
    if (!bootstrapResponse.ok) {
      throw new Error('点菜机启动配置获取失败')
    }

    const bootstrap = await bootstrapResponse.json() as {
      merchantId: string
      branchId: string
      deviceId: string
    }

    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: bootstrap.merchantId,
        branchId: bootstrap.branchId,
        deviceId: authData.deviceId,
        orderType: orderType.value,
        quoteId: quote.value.quoteId,
        items: cartItems.value.map((item) => ({
          dishId: item.baseDishId,
          quantity: item.quantity,
          specs: item.specs ?? '',
        })),
      }),
    })

    if (!orderResponse.ok) {
      throw new Error('下单失败，请稍后重试')
    }

    createdOrder.value = await orderResponse.json() as CreatedOrder
    showPaymentPopup.value = false
    clearCart()
    cartItems.value = []
    try {
      await router.push('/orders')
    } catch {
      window.location.hash = '#/orders'
    }
  } catch (error) {
    orderError.value = error instanceof Error ? error.message : '下单失败'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void reloadQuote()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-icons {
  font-family: 'Material Symbols Outlined';
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-size: 24px;
  line-height: 1;
}

.page {
  min-height: 100vh;
  background: var(--surface);
  padding-bottom: 160px;
}

/* Top Bar */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--container-margin);
  background: var(--frosted-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.brand-logo { height: 32px; width: auto; border-radius: var(--radius-sm); }

.brand h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-lg-mobile);
  font-weight: 700;
  line-height: 1.3;
  color: var(--primary-container);
  text-transform: uppercase;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--secondary);
  cursor: pointer;
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--on-surface-variant);
  cursor: pointer;
}

.theme-btn .material-icons {
  font-size: 22px !important;
}

.theme-btn:hover {
  background: var(--surface-container-high);
}

/* Page Content */
.page-content {
  padding: 0 var(--container-margin) var(--spacing-lg);
  max-width: 600px;
  margin: 0 auto;
}

/* Hero Context */
.hero-context {
  position: relative;
  width: auto;
  height: 218px;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
}

.hero-img {
  width: 100%;
  height: auto;
  object-fit: cover;
  display: block;
  filter: brightness(0.75);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--spacing-md) max(var(--container-margin), calc(50vw - 300px + var(--container-margin)));
}

.hero-overlay h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  line-height: 1.3;
  color: #fff;
}

.hero-overlay p {
  margin: var(--spacing-xs) 0 0;
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: rgba(255, 255, 255, 0.9);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  text-align: center;
}

.empty-state .material-icons {
  font-size: 64px !important;
  color: var(--secondary);
  opacity: 0.4;
  margin-bottom: var(--spacing-md);
}

.empty-state p {
  margin: 0 0 var(--spacing-lg);
  color: var(--secondary);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-full);
  background: var(--surface-container-low);
  color: var(--primary-container);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  text-decoration: none;
}

/* Order Type Toggle */
.order-type-section {
  margin-bottom: var(--spacing-lg);
}

.order-type-toggle {
  position: relative;
  display: flex;
  background: var(--surface-container-low);
  padding: 4px;
  border-radius: var(--radius-full);
}

.toggle-btn {
  flex: 1;
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  color: var(--secondary);
  cursor: pointer;
  z-index: 1;
  transition: color var(--transition-normal);
}

.toggle-btn-active {
  color: var(--on-primary);
}

.toggle-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: calc(50% - 4px);
  background: var(--primary-container);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  transition: left var(--transition-normal);
}

/* Success Card */
.success-card {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  border-radius: var(--radius-xl);
  background: rgba(0, 110, 28, 0.05);
  border: 1px solid rgba(0, 110, 28, 0.2);
}

.success-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.success-icon {
  font-size: 32px !important;
  color: var(--tertiary);
}

.success-header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-lg);
  font-weight: 700;
  line-height: 1.3;
  color: var(--tertiary);
}

.success-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.success-item {
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  background: var(--surface-container-lowest);
}

.success-label {
  margin: 0 0 var(--spacing-sm);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  line-height: 1.4;
  color: var(--secondary);
}

.success-value {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-lg);
  font-weight: 700;
  line-height: 1.3;
  color: var(--on-surface);
}

.success-code {
  color: var(--tertiary);
  font-size: var(--text-display-lg);
}

.success-hint {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  color: var(--secondary);
}

/* Order Card */
.order-card {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  border-radius: var(--radius-xl);
  background: var(--surface-container-lowest);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.card-header h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  line-height: 1.3;
  color: var(--on-surface);
}

.item-count {
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  font-weight: 600;
  color: var(--secondary);
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.order-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.item-image {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  object-fit: cover;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
}

.item-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  line-height: 1.4;
  color: var(--on-surface);
}

.item-variant {
  margin: var(--spacing-xs) 0 0;
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--primary-container);
}

.item-price-col {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.item-price {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--primary-container);
}

.item-promo-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  background: var(--primary-container);
  color: var(--on-primary);
  font-size: 11px;
  font-weight: 700;
}

.item-qty {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-body-md);
  font-weight: 600;
  color: var(--secondary);
}

.order-summary {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--card-border);
}

.promo-card { padding: var(--spacing-md); margin-bottom: var(--spacing-lg); border-radius: var(--radius-xl); background: var(--surface-container); }
.promo-card .promo-row { display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); font-size: var(--text-label-sm); }
.promo-card .promo-icon { font-size: 16px !important; color: var(--primary-container); flex-shrink: 0; }
.promo-card .promo-info { flex: 1; display: flex; flex-direction: column; }
.promo-card .promo-name { font-weight: 600; color: var(--on-surface); }
.promo-card .promo-desc { font-size: 11px; color: var(--secondary); }
.promo-card .promo-saving { font-weight: 700; color: var(--error); flex-shrink: 0; }
.hints-card { padding: var(--spacing-md); margin-bottom: var(--spacing-lg); border-radius: var(--radius-xl); background: rgba(255, 152, 0, 0.08); border: 1px solid rgba(255, 152, 0, 0.2); }
.hint-row { display: flex; align-items: flex-start; gap: var(--spacing-sm); margin-bottom: var(--spacing-xs); font-size: var(--text-body-sm); line-height: 1.5; }
.hint-row:last-child { margin-bottom: 0; }
.hint-icon { font-size: 16px !important; color: #f57c00; flex-shrink: 0; margin-top: 1px; }
.hint-text { color: var(--on-surface-variant); }

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  line-height: 1.5;
  color: var(--secondary);
}

.summary-discount span:last-child {
  color: var(--error);
  font-weight: 600;
}

.total-divider {
  border: none;
  border-top: 1px dashed var(--card-border);
  margin: var(--spacing-md) 0;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  line-height: 1.3;
  color: var(--on-surface);
}

.total-amount {
  font-family: var(--font-display);
  font-size: var(--text-display-lg);
  font-weight: 800;
  color: var(--primary-container);
  line-height: 1;
}

/* Payment Card */
.payment-card {
  margin-bottom: var(--spacing-lg);
  border-radius: var(--radius-xl);
  background: var(--surface-container);
}

.payment-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.payment-icon {
  color: var(--primary-container);
}

.payment-name {
  flex: 1;
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  color: var(--on-surface);
}

.payment-arrow {
  color: var(--secondary);
}

/* Bottom Action Bar */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) var(--container-margin);
  background: var(--frosted-bg-heavy);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
}

.action-left {
  display: flex;
  flex-direction: column;
}

.action-label {
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--secondary);
}

.action-amount {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
}

.currency {
  font-family: var(--font-display);
  font-size: var(--text-body-md);
  font-weight: 700;
  color: var(--primary-container);
}

.amount {
  font-family: var(--font-display);
  font-size: var(--text-display-lg);
  font-weight: 800;
  color: var(--primary-container);
  line-height: 1;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  flex: 1;
  max-width: 200px;
  padding: var(--spacing-md) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary-container);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(255, 107, 0, 0.15);
  transition: transform var(--transition-fast);
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Payment Row */
.payment-row {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.payment-row .payment-card {
  flex: 1;
  margin-bottom: 0;
}

/* Continue Ordering - dark frosted glass */
.continue-ordering {
  background: rgba(30, 30, 30, 0.65) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.continue-ordering .payment-icon,
.continue-ordering .payment-name {
  color: #fff !important;
}

.continue-ordering .payment-arrow {
  color: rgba(255, 255, 255, 0.6) !important;
}

.back-menu-link {
  text-decoration: none;
  color: inherit;
}

@media (max-width: 720px) {
  .success-grid {
    grid-template-columns: 1fr;
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .action-left {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .action-btn {
    max-width: 100%;
  }
}
/* Payment method toggle */
.payment-card { cursor: pointer; transition: all var(--transition-fast); }
.payment-card.payment-active { outline: 2px solid var(--primary-container); outline-offset: -2px; }
.payment-icon-wechat { width: 24px; height: 24px; color: var(--primary-container); display: flex; align-items: center; }

/* Payment Popup */
.payment-overlay {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
}
.payment-popup {
  background: var(--surface); border-radius: var(--radius-xl);
  padding: var(--spacing-xl); width: 360px; max-width: 90vw;
  text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.popup-header { margin-bottom: var(--spacing-lg); }
.popup-icon .material-icons { font-size: 48px; color: var(--primary-container); }
.popup-header h3 { margin: var(--spacing-sm) 0 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; line-height: 1.3; }
.popup-amount { font-family: var(--font-display); font-size: var(--text-display-lg); font-weight: 800; color: var(--primary-container); margin: var(--spacing-sm) 0 0; line-height: 1.2; }
.popup-qr {
  width: 260px; height: 260px; margin: 0 auto var(--spacing-lg);
  background: var(--surface-container-low); border-radius: var(--radius-lg);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.qr-img { width: 100%; height: 100%; object-fit: contain; }
.popup-hint { font-size: var(--text-body-sm); line-height: 1.5; color: var(--secondary); margin-bottom: var(--spacing-lg); }
.popup-error { color: var(--error); font-size: var(--text-body-sm); line-height: 1.5; margin-bottom: var(--spacing-md); padding: 8px; background: var(--error-container); border-radius: var(--radius-md); }
.popup-paid-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-sm);
  width: 100%; padding: var(--spacing-md);
  border: none; border-radius: var(--radius-full);
  background: var(--primary-container); color: var(--on-primary);
  font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700;
  cursor: pointer; transition: transform var(--transition-fast);
}
.popup-paid-btn:active { transform: scale(0.98); }
.popup-paid-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.popup-cancel-btn {
  display: block; margin: var(--spacing-md) auto 0;
  background: none; border: none;
  font-family: var(--font-display); font-size: var(--text-body-sm); color: var(--secondary);
  cursor: pointer; text-decoration: underline;
}

.c-sign { font-size: 0.75em; }

@media (max-width: 499px) {
  .top-bar {
    padding: var(--spacing-xs) var(--container-margin);
  }

  .brand-logo {
    height: 28px;
  }

  .theme-btn,
  .close-btn {
    width: 36px;
    height: 36px;
  }

  .theme-btn .material-icons,
  .close-btn .material-icons {
    font-size: 20px !important;
  }

  .hero-context {
    height: 168px;
    margin-bottom: var(--spacing-md);
  }

  .hero-overlay h2,
  .card-header h3,
  .total-label,
  .popup-header h3 {
    font-size: var(--text-headline-lg);
  }

  .back-link {
    padding: 8px 14px;
    font-size: var(--text-body-md);
  }

  .toggle-btn {
    padding: 12px 10px;
    font-size: var(--text-body-md);
  }

  .success-card,
  .order-card,
  .payment-card,
  .payment-popup {
    border-radius: var(--radius-lg);
  }

  .success-value,
  .amount,
  .popup-amount,
  .total-amount {
    font-size: var(--text-headline-lg);
  }

  .success-code {
    font-size: 24px;
  }

  .order-item {
    gap: 10px;
  }

  .item-image {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-md);
  }

  .item-price {
    font-size: var(--text-headline-lg);
  }

  .payment-row {
    flex-wrap: wrap;
    flex-direction: row;
  }

  .payment-row .payment-card {
    flex: 1 1 calc(50% - (var(--spacing-sm) / 2));
  }

  .continue-ordering {
    flex: 0 0 100% !important;
    width: 100%;
  }

  .payment-item {
    padding: 12px;
  }

  .payment-name {
    font-size: var(--text-body-lg);
  }

  .action-bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
  }

  .action-left {
    flex: 1;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
  }

  .action-btn {
    flex: 0 0 auto;
    padding: 12px 16px;
    font-size: 18px;
    max-width: none;
  }

  .payment-popup {
    width: min(340px, calc(100vw - 24px));
    padding: var(--spacing-lg);
  }

  .popup-qr {
    width: min(220px, 62vw);
    height: min(220px, 62vw);
    margin-bottom: var(--spacing-md);
  }

  .popup-paid-btn {
    padding: 12px;
    font-size: var(--text-headline-lg);
  }

  .popup-cancel-btn {
    font-size: var(--text-body-md);
  }
}
</style>
