<template>
  <main class="page">
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

    <div class="page-content">
      <div class="status-tabs">
        <button
          v-for="t in tabs" :key="t.key"
          :class="['tab', tab === t.key && 'tab-active']"
          @click="tab = t.key"
        >
          <span class="material-icons tab-icon">{{ t.icon }}</span>
          {{ t.label }}
          <span v-if="badgeCount(t.key)" class="tab-badge">{{ badgeCount(t.key) }}</span>
        </button>
      </div>

      <template v-for="(order, oi) in filteredOrders" :key="order.orderNo">
        <div v-if="oi > 0" class="order-divider">
          <span class="divider-line"></span>
        </div>

        <div class="ticket-card"
          @touchstart="onLongPressStart(order.pickupCode)"
          @touchend="onLongPressEnd"
          @touchmove="onLongPressMove"
          @mousedown="onLongPressStart(order.pickupCode)"
          @mouseup="onLongPressEnd"
          @mouseleave="onLongPressEnd"
          :title="'长按复制取餐码'"
        >
          <div class="ticket-header">
            <p class="ticket-label">
              取餐订单
              <span v-if="order.orderType === 'takeaway'" class="takeaway-badge">自提</span>
            </p>
            <div class="ticket-number">{{ order.pickupCode }}</div>
            <div class="ticket-status" :class="'ticket-status-' + order.status">
              {{ statusLabel(order.status) }}
            </div>
            <div class="ticket-hole-left"></div>
            <div class="ticket-hole-right"></div>
          </div>

          <div class="ticket-body">
            <div class="ticket-meta">
              <h3 class="ticket-detail-title">订单详情</h3>
              <span class="ticket-time">{{ formatTime(order.createdAt) }}</span>
            </div>

            <div v-for="item in (order.items || [])" :key="item.dishId" class="ticket-item">
              <div class="ticket-item-left">
                <div class="ticket-item-img">
                  <img :src="dishImage(item)" :alt="item.name" class="ticket-item-img-el" />
                </div>
                <div>
                  <p class="ticket-item-name">{{ item.name }}</p>
                  <p v-if="item.specs" class="ticket-item-spec">{{ item.specs }}</p>
                </div>
              </div>
              <div class="ticket-item-right">
                <span class="ticket-item-price"><small class="c-sign">¥</small>{{ (item.finalUnitPrice * item.quantity).toFixed(2) }}</span>
                <span class="ticket-item-qty">x{{ item.quantity }}</span>
              </div>
            </div>

            <div class="ticket-total">
              <span class="ticket-total-label">合计 {{ (order.items || []).length }} 项商品</span>
              <div class="ticket-total-right">
                <span class="ticket-total-sub">实付金额</span>
                <span class="ticket-total-price"><small class="c-sign">¥</small>{{ (order.totals?.payableAmount || 0).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="ticket-footer">
            <p class="ticket-thanks">感谢您选择{{ displayTitle }}</p>
            <p class="ticket-hint">
              <span class="material-icons hint-icon">photo_camera</span>
              请拍照保存
            </p>
          </div>
        </div>
      </template>

      <div v-if="!filteredOrders.length" class="empty-state">
        <span class="material-icons empty-icon">receipt_long</span>
        <p class="empty-text">暂无{{ tabLabel }}订单</p>
        <router-link to="/menu" class="empty-cta">去点餐</router-link>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
    </transition>

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getDishImage } from '@/utils/dishImages'
import { getTheme, setTheme } from '@/utils/theme'
import logoImage from '@/assets/images/pages/logo.png'

const router = useRouter()

interface OrderItem {
  dishId: string
  name: string
  quantity: number
  finalUnitPrice: number
  finalSubtotal: number
  specs?: string
  promotionLabel?: string
}

interface OrderTotals {
  originalAmount: number
  discountAmount: number
  payableAmount: number
}

interface OrderSummary {
  orderNo: string
  pickupCode: string
  status: string
  orderType?: string
  items: OrderItem[]
  totals: OrderTotals
  createdAt: string
}

const orders = ref<OrderSummary[]>([])
const tab = ref('active')
const merchantName = ref('Sizzling Skewers')
const branchName = ref('')
const displayTitle = computed(() => {
  const m = merchantName.value
  const b = branchName.value
  return m && b ? `${m}（${b}）` : m || b || '典韦烤串'
})
const POLL_MS = 5000
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const toastMessage = ref('')
const toastVisible = ref(false)

function getIcon(): string {
  const t = getTheme()
  return t === 'auto' ? 'brightness_auto' : t === 'dark' ? 'dark_mode' : 'light_mode'
}
const themeIcon = ref(getIcon())
function doToggleTheme(): string {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
  return getIcon()
}

function dishImage(item: OrderItem): string {
  return getDishImage(item.dishId)
}

const tabs = [
  { key: 'active', label: '进行中', icon: 'hourglass_empty' },
  { key: 'ready', label: '待取餐', icon: 'notifications_active' },
]

const filteredOrders = computed(() => {
  if (tab.value === 'active') return orders.value.filter((o) => o.status === 'paid' || o.status === 'preparing')
  if (tab.value === 'ready') return orders.value.filter((o) => o.status === 'ready')
  return []
})

const tabLabel = computed(() => {
  const m: Record<string, string> = { active: '进行中', ready: '待取餐' }
  return m[tab.value] || ''
})

function badgeCount(key: string) {
  if (key === 'active') return orders.value.filter((o) => o.status === 'paid' || o.status === 'preparing').length || ''
  if (key === 'ready') return orders.value.filter((o) => o.status === 'ready').length || ''
  return ''
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    paid: '制作中',
    preparing: '制作中',
    ready: '待取餐',
    completed: '已完成',
  }
  return m[s] || s
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goHome() {
  router.push('/')
}

function showToast(msg: string) {
  toastMessage.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 2000)
}

function onLongPressStart(code: string) {
  longPressTimer.value = setTimeout(async () => {
    try {
      await navigator.clipboard.writeText(code)
      showToast(`取餐码 ${code} 已复制`)
    } catch {
      showToast('复制失败，请手动记下取餐码')
    }
  }, 600)
}

function onLongPressEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

function onLongPressMove() {
  onLongPressEnd()
}

function notifyReady(readyOrders: OrderSummary[]) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    readyOrders.forEach((o) => {
      new Notification('滋滋烤串 - 可取餐', {
        body: `订单 ${o.pickupCode} 已可领取`,
        icon: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&q=80',
      })
      if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(`订单 ${o.pickupCode} 已可领取`)
        msg.lang = 'zh-CN'
        speechSynthesis.speak(msg)
      }
    })
  } else if (Notification.permission !== 'denied') {
    void Notification.requestPermission()
  }
}

const prevStatusMap = ref<Record<string, string>>({})
let firstLoad = true

async function fetchMerchantName() {
  try {
    const res = await fetch('/api/system/bootstrap')
    if (!res.ok) return
    const data = await res.json() as { merchantName?: string; branchName?: string }
    if (data.merchantName) merchantName.value = data.merchantName
    if (data.branchName) branchName.value = data.branchName
  } catch {}
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders')
    if (!res.ok) return
    const data = await res.json() as { items: OrderSummary[] }
    orders.value = data.items ?? []

    if (!firstLoad) {
      const newReady = orders.value.filter((o) => o.status === 'ready' && prevStatusMap.value[o.orderNo] !== 'ready')
      if (newReady.length) notifyReady(newReady)
    }
    firstLoad = false
    prevStatusMap.value = Object.fromEntries(orders.value.map((o) => [o.orderNo, o.status]))
  } catch {}
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  void fetchMerchantName()
  void fetchOrders()
  timer = setInterval(fetchOrders, POLL_MS)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
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

.brand { display: flex; align-items: center; gap: var(--spacing-sm); }
.brand-logo { height: 32px; width: auto; border-radius: var(--radius-sm); }
.brand h1 { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-lg-mobile); font-weight: 700; color: var(--primary-container); text-transform: uppercase; }
.close-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; border-radius: var(--radius-full); background: transparent; color: var(--secondary); cursor: pointer; }
.top-bar-right { display: flex; align-items: center; gap: var(--spacing-xs); }
.theme-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; border-radius: var(--radius-full); background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.theme-btn .material-icons { font-size: 22px !important; }
.theme-btn:hover { background: var(--surface-container-high); }

/* Page Content */
.page-content { padding: 70px var(--container-margin) var(--spacing-lg); max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }

/* Status Tabs */
.status-tabs { display: flex; gap: var(--spacing-sm); padding: var(--spacing-md) 0; overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
.tab { flex-shrink: 0; display: flex; align-items: center; gap: 4px; padding: 10px var(--spacing-md); border-radius: var(--radius-full); border: none; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; background: var(--surface-container-high); color: var(--secondary); cursor: pointer; transition: all var(--transition-fast); }
.tab-active { background: var(--primary-container); color: var(--on-primary); }
.tab-icon { font-size: 18px !important; }
.tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 4px; border-radius: var(--radius-full); background: var(--error); color: #fff; font-size: 11px; font-weight: 700; line-height: 1; }

.order-divider { width: 100%; padding: var(--spacing-sm) 0; display: flex; align-items: center; justify-content: center; }
.divider-line { width: 40px; height: 4px; border-radius: 2px; background: var(--outline-variant); }

/* Ticket Card */
.ticket-card { width: 100%; background: var(--surface-container-lowest); border-radius: var(--radius-xl); position: relative; margin-bottom: var(--spacing-md); border: 1px solid var(--ticket-card-border); transition: border-color var(--transition-normal); }
/* .ticket-card::before, .ticket-card::after { content: ''; position: absolute; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border-radius: 50%; background: var(--surface); z-index: 1; pointer-events: none; }
.ticket-card::before { left: -13px; box-shadow: inset 0 0 0 1px var(--ticket-card-border); }
.ticket-card::after { right: -13px; box-shadow: inset 0 0 0 1px var(--ticket-card-border); } */

.ticket-header { position: relative; text-align: center; padding: var(--spacing-lg); border-bottom: 1px dashed var(--outline-variant); }
.ticket-label { display: flex; align-items: center; justify-content: center; gap: 8px; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; color: var(--secondary); margin: 0 0 var(--spacing-sm); text-transform: uppercase; letter-spacing: 0.08em; }
.takeaway-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius-full); background: var(--primary-container); color: var(--on-primary); font-size: 11px; font-weight: 700; text-transform: none; letter-spacing: normal; }
.ticket-number { font-family: var(--font-display); font-size: 64px; font-weight: 800; color: var(--primary-container); letter-spacing: -0.04em; line-height: 1; }
.ticket-status { margin-top: var(--spacing-sm); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; }
.ticket-status-paid { color: var(--tertiary); }
.ticket-status-preparing { color: var(--primary-container); }
.ticket-status-ready { color: var(--tertiary); }

.ticket-hole-left, .ticket-hole-right { position: absolute; bottom: -12px; width: 24px; height: 24px; border-radius: 50%; background: var(--surface); }
.ticket-hole-left { left: -12px; }
.ticket-hole-right { right: -12px; }

.ticket-body { padding: var(--spacing-lg); }
.ticket-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md); }
.ticket-detail-title { font-family: var(--font-display); font-weight: 700; margin: 0; color: var(--on-surface); }
.ticket-time { font-size: var(--text-label-sm); font-weight: 600; color: var(--secondary); background: var(--surface-container); padding: 4px 8px; border-radius: var(--radius-default); letter-spacing: 0.02em; }

.ticket-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; }
.ticket-item-left { display: flex; gap: var(--spacing-sm); }
.ticket-item-img { width: 48px; height: 48px; border-radius: var(--radius-lg); overflow: hidden; flex-shrink: 0; background: var(--surface-container); }
.ticket-item-img-el { width: 100%; height: 100%; object-fit: cover; }
.ticket-item-name { font-family: var(--font-display); font-size: var(--text-body-lg); font-weight: 600; line-height: 24px; margin: 0; color: var(--on-surface); }
.ticket-item-spec { font-size: var(--text-label-sm); font-weight: 600; color: var(--secondary); margin: 2px 0 0; }
.ticket-item-right { text-align: right; }
.ticket-item-qty { display: block; font-size: var(--text-body-md); font-weight: 600; color: var(--secondary); margin-bottom: 2px; }
.ticket-item-price { font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--primary-container); }

.ticket-total { display: flex; justify-content: space-between; align-items: flex-end; margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--surface-variant); }
.ticket-total-label { font-size: var(--text-body-md); line-height: 20px; color: var(--secondary); }
.ticket-total-right { text-align: right; }
.ticket-total-sub { display: block; font-size: var(--text-body-md); font-weight: 600; color: var(--secondary); }
.ticket-total-price { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--on-surface); line-height: 1; }

.ticket-footer { background: var(--surface-container-low); padding: var(--spacing-md); text-align: center; border-radius: 0 0 var(--radius-xl) var(--radius-xl); }
.ticket-thanks { font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; color: var(--primary-container); margin: 0 0 var(--spacing-xs); }
.ticket-hint { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: var(--text-label-sm); font-weight: 600; color: var(--secondary); margin: 0; letter-spacing: 0.02em; }
.hint-icon { font-size: 14px !important; }

/* Empty State */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--spacing-md); padding: 80px 0; }
.empty-icon { font-size: 64px !important; color: var(--outline-variant); }
.empty-text { font-size: var(--text-body-lg); font-weight: 600; color: var(--secondary); margin: 0; }
.empty-cta { display: flex; align-items: center; justify-content: center; padding: var(--spacing-md) 32px; border-radius: var(--radius-full); background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; text-decoration: none; box-shadow: 0 8px 20px rgba(255,107,0,0.15); }

/* Bottom Navigation */
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; display: flex; justify-content: space-around; align-items: center; padding: var(--spacing-xs) var(--gutter); background: var(--frosted-bg-heavy); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-top-left-radius: var(--radius-xl); border-top-right-radius: var(--radius-xl); box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04); }
.nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-full); color: var(--secondary); text-decoration: none; transition: all var(--transition-fast); }
.nav-item-active { background: rgba(255, 107, 0, 0.1); color: var(--primary-container); }
.nav-label { font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; }

/* Toast */
.toast { position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%); z-index: 100; padding: 10px 24px; border-radius: var(--radius-full); background: var(--on-surface); color: var(--surface); font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; white-space: nowrap; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.toast-enter-active { transition: all 0.25s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(12px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }
.c-sign { font-size: 0.75em; }

@media (max-width: 499px) {
  .top-bar {
    padding: var(--spacing-xs) var(--container-margin);
  }

  .brand-logo {
    height: 28px;
  }

  .close-btn,
  .theme-btn {
    width: 36px;
    height: 36px;
  }

  .theme-btn .material-icons,
  .close-btn .material-icons {
    font-size: 20px !important;
  }

  .page-content {
    padding-top: 62px;
  }

  .status-tabs {
    gap: 6px;
    padding: 10px 0;
  }

  .tab {
    padding: 8px 14px;
    font-size: var(--text-body-md);
  }

  .ticket-card,
  .ticket-footer {
    border-radius: var(--radius-lg);
  }

  .ticket-header,
  .ticket-body {
    padding: var(--spacing-md);
  }

  .ticket-number {
    font-size: 52px;
  }

  .ticket-item-img {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
  }

  .empty-cta {
    padding: 12px 22px;
    font-size: var(--text-headline-lg);
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
