<template>
  <main class="page">
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

    <div class="page-content">
      <section v-if="!orders.length && !loading" class="empty-state">
        <span class="material-icons">receipt_long</span>
        <p>暂无订单</p>
        <router-link to="/menu" class="back-link">
          <span class="material-icons">add_circle</span>
          <span>去点餐</span>
        </router-link>
      </section>

      <template v-else>
        <div class="orders-header">
          <h3>当前订单</h3>
          <span class="orders-count">{{ orders.length }} 笔</span>
        </div>

        <div class="orders-list">
          <article v-for="o in orders" :key="o.orderNo" class="order-card">
            <div class="order-top">
              <div class="pickup-code-section">
                <span class="pickup-label">取餐号</span>
                <span class="pickup-code">{{ o.pickupCode }}</span>
              </div>
              <div class="status-section">
                <span :class="['status-badge', statusClass(o.status)]">{{ statusText(o.status) }}</span>
              </div>
            </div>
            <div class="order-meta">
              <span class="order-no">{{ o.orderNo }}</span>
              <span class="order-time">{{ formatTime(o.createdAt) }}</span>
            </div>
            <div class="order-summary">
              <span class="order-items-count">{{ o.items.length }} 项商品</span>
              <span class="order-amount">¥{{ o.totals.payableAmount.toFixed(2) }}</span>
            </div>
          </article>
        </div>
      </template>

      <div class="utility-actions">
        <router-link to="/" class="utility-btn">
          <span class="material-icons">home</span>
          <span>回到首页</span>
        </router-link>
        <router-link to="/menu" class="utility-btn">
          <span class="material-icons">add_circle</span>
          <span>继续点餐</span>
        </router-link>
      </div>
    </div>

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
import { useRouter } from 'vue-router'
import { getTheme, setTheme } from '@/utils/theme'

interface OrderTotals {
  originalAmount: number
  discountAmount: number
  payableAmount: number
}

interface OrderItem {
  dishId: string
  name: string
  quantity: number
  finalSubtotal: number
}

interface OrderSummary {
  orderNo: string
  pickupCode: string
  status: string
  items: OrderItem[]
  totals: OrderTotals
  createdAt: string
}

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
const orders = ref<OrderSummary[]>([])
const merchantName = ref('Sizzling Skewers')

function statusClass(status: string): string {
  switch (status) {
    case 'paid': return 'status-paid'
    case 'preparing': return 'status-preparing'
    case 'ready': return 'status-ready'
    case 'completed': return 'status-completed'
    default: return ''
  }
}

function statusText(status: string): string {
  switch (status) {
    case 'paid': return '已支付'
    case 'preparing': return '制作中'
    case 'ready': return '可取餐'
    case 'completed': return '已完成'
    default: return status
  }
}

function formatTime(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goHome() {
  router.push('/')
}

async function loadOrders() {
  loading.value = true
  try {
    const res = await fetch('/api/orders')
    if (!res.ok) throw new Error('订单获取失败')
    const data = await res.json() as { items: OrderSummary[] }
    orders.value = data.items ?? []
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOrders()
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
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  font-family: var(--font-body);
  font-size: var(--text-body-md);
}

.back-link {
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
  text-decoration: none;
}

/* Orders Header */
.orders-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.orders-header h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  color: var(--on-surface);
}

.orders-count {
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--secondary);
}

/* Orders List */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.order-card {
  padding: var(--spacing-md);
  border-radius: var(--radius-xl);
  background: var(--surface-container-lowest);
  border: 1px solid var(--card-border);
}

.order-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.pickup-code-section {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
}

.pickup-label {
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--secondary);
}

.pickup-code {
  font-family: var(--font-display);
  font-size: var(--text-headline-lg);
  font-weight: 800;
  color: var(--on-surface-variant);
  letter-spacing: -0.02em;
}

.status-badge {
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  font-weight: 600;
}

.status-paid {
  background: rgba(0, 110, 28, 0.1);
  color: var(--tertiary);
}

.status-preparing {
  background: rgba(255, 107, 0, 0.1);
  color: var(--primary-container);
}

.status-ready {
  background: rgba(0, 110, 28, 0.15);
  color: var(--tertiary);
}

.status-completed {
  background: var(--surface-container);
  color: var(--secondary);
}

.order-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  font-family: var(--font-body);
  font-size: var(--text-label-sm);
  color: var(--secondary);
}

.order-no {
  font-family: monospace;
}

.order-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--card-border);
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--secondary);
}

.order-amount {
  font-weight: 700;
  color: var(--primary-container);
  font-size: var(--text-price-display);
}

/* Utility Actions */
.utility-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
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
  text-decoration: none;
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