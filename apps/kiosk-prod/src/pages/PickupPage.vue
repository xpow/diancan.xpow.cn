<template>
  <main class="page">
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="brand">
        <span class="material-icons">restaurant_menu</span>
        <h1>{{ merchantName || 'Sizzling Skewers' }}</h1>
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
      <!-- Status Indicator -->
      <div class="status-indicator">
        <div class="status-badge pulse-soft">
          <span class="material-icons">local_fire_department</span>
          <span>制作中</span>
        </div>
        <p class="status-hint">请耐心等待，美味即将出炉</p>
      </div>

      <!-- Ticket Card -->
      <div class="ticket-card">
        <!-- NFC Section -->
        <div class="nfc-section">
          <div class="nfc-icon-wrap">
            <div class="nfc-ping"></div>
            <div class="nfc-icon">
              <span class="material-icons">contactless</span>
            </div>
          </div>
          <div class="nfc-info">
            <div class="nfc-ready">
              <span class="nfc-dot"></span>
              <span>NFC Ready</span>
            </div>
            <h3 class="nfc-title">NFC 感应取餐</h3>
            <p class="nfc-desc">靠近取餐柜 NFC 感应区，碰一碰即可取餐</p>
          </div>
        </div>

        <!-- Pickup Code -->
        <div class="pickup-section">
          <span class="pickup-label">取餐号</span>
          <div class="pickup-code">{{ order?.pickupCode || 'A08' }}</div>
          <!-- Decorative holes -->
          <div class="hole hole-left"></div>
          <div class="hole hole-right"></div>
        </div>

        <!-- Order Details -->
        <div class="details-section">
          <div class="details-header">
            <h4>订单详情</h4>
            <span class="details-time">{{ formatTime(order?.createdAt) }}</span>
          </div>

          <ul class="order-items">
            <li v-for="item in order?.items ?? []" :key="item.dishId" class="order-item">
              <img :src="getItemImage(item.name)" :alt="item.name" class="item-image" />
              <div class="item-info">
                <p class="item-name">{{ item.name }}</p>
                <p v-if="item.specs" class="item-variant">{{ item.specs }}</p>
                <p v-if="item.promotionLabel" class="item-variant-promo">{{ item.promotionLabel }}</p>
              </div>
              <div class="item-qty-col">
                <span class="item-qty">x{{ item.quantity }}</span>
                <span class="item-price">¥{{ item.finalUnitPrice.toFixed(2) }}</span>
              </div>
            </li>
          </ul>

          <div class="order-total">
            <span>合计 {{ order?.items?.length || 0 }} 项商品</span>
            <div class="total-right">
              <span class="total-label">实付金额</span>
              <span class="total-amount">¥{{ order?.totals?.payableAmount.toFixed(2) || '0.00' }}</span>
            </div>
          </div>
        </div>

        <!-- Footer Message -->
        <div class="ticket-footer">
          <p class="footer-title">感谢您选择滋滋烤串！</p>
          <p class="footer-desc">请拍照保存</p>
        </div>
      </div>

      <!-- Utility Actions -->
      <div class="utility-actions">
        <button class="utility-btn">
          <span class="material-icons">content_copy</span>
          <span>复制单号</span>
        </button>
        <button class="utility-btn">
          <span class="material-icons">share</span>
          <span>分享票据</span>
        </button>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="material-icons">home</span>
        <span class="nav-label">首页</span>
      </router-link>
      <router-link to="/menu" class="nav-item">
        <span class="material-icons">outdoor_grill</span>
        <span class="nav-label">菜单</span>
      </router-link>
      <router-link to="/orders" class="nav-item nav-item-active">
        <span class="material-icons">confirmation_number</span>
        <span class="nav-label">订单</span>
      </router-link>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTheme, setTheme } from '@/utils/theme'

interface OrderItem {
  dishId: string
  name: string
  quantity: number
  unitPrice: number
  finalUnitPrice: number
  finalSubtotal: number
  specs?: string
  promotionLabel?: string
}

interface Order {
  orderNo: string
  pickupCode: string
  status: string
  items: OrderItem[]
  totals: {
    originalAmount: number
    discountAmount: number
    payableAmount: number
  }
  createdAt?: string
}

const route = useRoute()
const router = useRouter()

function getIcon(): string {
  const t = getTheme()
  return t === 'auto' ? 'brightness_auto' : t === 'dark' ? 'dark_mode' : 'light_mode'
}
const themeIcon = ref(getIcon())
function doToggleTheme(): string {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
  return getIcon()
}

const loading = ref(false)
const errorMessage = ref('')
const order = ref<Order | null>(null)
const merchantName = ref('Sizzling Skewers')

function getItemImage(name: string): string {
  const images: Record<string, string> = {
    '招牌牛肉串': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&q=80',
    '秘制羊肉串': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&q=80',
    '烤鸡翅': 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=200&q=80',
    '烤排骨': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200&q=80',
    '烤鱿鱼': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&q=80',
    '烤茄子': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&q=80',
    '烤韭菜': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&q=80',
    '烤金针菇': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&q=80',
    '烤玉米': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&q=80',
    '冰镇酸梅汤': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&q=80',
    '柠檬茶': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&q=80',
    '矿泉水': 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200&q=80',
  }
  return images[name] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'
}

function formatTime(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function goHome() {
  router.push('/')
}

async function loadOrder() {
  const orderNo = route.query.orderNo as string
  if (!orderNo) return

  loading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(`/api/orders/${orderNo}`)
    if (!res.ok) throw new Error('订单获取失败')
    order.value = await res.json() as Order
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '订单获取失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOrder()
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
  padding-bottom: 100px;
  background: var(--surface);
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

.brand .material-icons {
  color: var(--primary-container);
  font-size: 28px !important;
}

.brand h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-lg-mobile);
  font-weight: 700;
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
  padding: 80px var(--container-margin) var(--spacing-lg);
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Status Indicator */
.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-full);
  background: var(--primary-container);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(255, 107, 0, 0.2);
}

.status-badge .material-icons {
  font-size: 18px !important;
}

.pulse-soft {
  animation: pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(0.98); }
}

.status-hint {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  color: var(--secondary);
}

/* Ticket Card */
.ticket-card {
  width: 100%;
  border-radius: var(--radius-xl);
  background: var(--surface-container-lowest);
  box-shadow: var(--shadow-float);
  overflow: hidden;
}

/* NFC Section */
.nfc-section {
  padding: var(--spacing-lg);
  background: rgba(160, 65, 0, 0.05);
  border-bottom: 1px solid var(--surface-variant);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  text-align: center;
}

.nfc-icon-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nfc-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(160, 65, 0, 0.2);
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%, 100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.nfc-icon {
  position: relative;
  z-index: 1;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 4px 12px rgba(160, 65, 0, 0.2);
}

.nfc-icon .material-icons {
  font-size: 32px !important;
  color: var(--on-primary);
}

.nfc-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.nfc-ready {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.nfc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.nfc-ready span:last-child {
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  color: var(--primary);
}

.nfc-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  color: var(--on-surface);
}

.nfc-desc {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  color: var(--secondary);
}

/* Pickup Section */
.pickup-section {
  position: relative;
  padding: var(--spacing-lg);
  text-align: center;
  border-bottom: 1px dashed var(--outline-variant);
}

.pickup-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.pickup-code {
  font-family: var(--font-display);
  font-size: var(--text-display-lg);
  font-weight: 800;
  color: var(--on-surface-variant);
  letter-spacing: -0.02em;
}

.hole {
  position: absolute;
  bottom: -12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface);
}

.hole-left {
  left: -12px;
}

.hole-right {
  right: -12px;
}

/* Details Section */
.details-section {
  padding: var(--spacing-lg);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.details-header h4 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  color: var(--on-surface);
}

.details-time {
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  font-weight: 600;
  color: var(--secondary);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--surface-container);
  border-radius: var(--radius-default);
}

.order-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.order-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.item-image {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  object-fit: cover;
  background: var(--surface-container);
}

.item-info {
  flex: 1;
}

.item-name {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-body-lg);
  font-weight: 600;
  color: var(--on-surface);
}

.item-variant {
  margin: var(--spacing-xs) 0 0;
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--secondary);
}

.item-variant-promo {
  margin: var(--spacing-xs) 0 0;
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--tertiary);
}

.item-qty-col {
  text-align: right;
}

.item-qty {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--secondary);
  margin-bottom: var(--spacing-xs);
}

.item-price {
  font-family: var(--font-display);
  font-size: var(--text-price-display);
  font-weight: 800;
  color: var(--primary-container);
}

.order-total {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--surface-variant);
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  color: var(--secondary);
}

.total-right {
  text-align: right;
}

.total-label {
  display: block;
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  color: var(--secondary);
}

.total-amount {
  font-family: var(--font-display);
  font-size: var(--text-display-lg);
  font-weight: 800;
  color: var(--on-surface);
}

/* Ticket Footer */
.ticket-footer {
  padding: var(--spacing-md);
  background: var(--surface-container-low);
  text-align: center;
}

.footer-title {
  margin: 0 0 var(--spacing-xs);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  color: var(--primary-container);
}

.footer-desc {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--secondary);
}

/* Utility Actions */
.utility-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
  width: 100%;
}

.utility-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: none;
  border-radius: var(--radius-xl);
  background: var(--surface-container-high);
  color: var(--on-surface);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.utility-btn:active {
  transform: scale(0.95);
}

.utility-btn .material-icons {
  font-size: 20px !important;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: var(--spacing-xs) var(--gutter);
  background: var(--frosted-bg-heavy);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-full);
  color: var(--secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-item-active {
  background: rgba(255, 107, 0, 0.1);
  color: var(--primary-container);
}

.nav-label {
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  font-weight: 600;
}

@media (max-width: 720px) {
  .utility-actions {
    grid-template-columns: 1fr;
  }
}
</style>
