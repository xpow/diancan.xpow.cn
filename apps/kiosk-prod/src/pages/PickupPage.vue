<template>
  <main class="page">
    <KioskTopBar :title="displayTitle" :device-code="deviceCode" :status-text="statusText" show-home-link />

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
          <div class="ticket-header" :class="{ 'ticket-header-unpaid': !order.paidAt }">
            <p class="ticket-label">
              取餐订单
              <span v-if="order.orderType === 'takeaway'" class="takeaway-badge">自提</span>
              <span v-if="!order.paidAt" class="unpaid-badge">未付款</span>
              <span class="status-badge" :class="'status-' + order.status">{{ statusLabel(order.status) }}</span>
            </p>
            <div class="ticket-number">{{ order.pickupCode }}</div>
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
                  <p class="ticket-item-name">{{ item.name }}<template v-if="item.portionSize && (item.finalUnitPrice ?? item.unitPrice) > 0"> <span class="ticket-item-unit">（¥{{ (item.finalUnitPrice ?? item.unitPrice).toFixed(2) }}/{{ item.portionSize }}串）</span></template><template v-else-if="(item.finalUnitPrice ?? item.unitPrice) === 0"> <span class="ticket-item-unit tag-gift">赠品</span></template></p>
                  <p v-if="item.specs" class="ticket-item-spec">{{ item.specs }}</p>
                </div>
              </div>
              <div class="ticket-item-right">
                <span class="ticket-item-price"><small class="c-sign">¥</small>{{ (item.finalSubtotal ?? item.finalUnitPrice * item.quantity).toFixed(2) }}</span>
                <span class="ticket-item-qty">x{{ item.quantity }}</span>
              </div>
            </div>

            <div class="ticket-total">
              <span class="ticket-total-label">合计 {{ (order.items || []).length }} 项商品</span>
              <div class="ticket-total-right">
                <span class="ticket-total-sub">{{ !order.paidAt ? '待付金额' : '实付金额' }}</span>
                <span class="ticket-total-price"><small class="c-sign">¥</small>{{ (order.totals?.payableAmount || 0).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="ticket-footer">
            <template v-if="!order.paidAt">
              <div class="pay-reminder">
                <span class="material-icons pay-reminder-icon">payment</span>
                <span class="pay-reminder-text">待支付</span>
              </div>
              <div class="pay-qr-row">
                <div class="pay-qr-box" @click="selectedPayOrder = order; showPayPopup = true">
                  <img :src="qrMap.wechat" alt="微信支付" class="pay-qr-img" />
                  <span class="pay-qr-label">微信</span>
                </div>
                <div class="pay-qr-box" @click="selectedPayOrder = order; showPayPopup = true">
                  <img :src="qrMap.alipay" alt="支付宝" class="pay-qr-img" />
                  <span class="pay-qr-label">支付宝</span>
                </div>
              </div>
              <button class="pay-now-btn" @click="selectedPayOrder = order; showPayPopup = true">
                <span class="material-icons">check_circle</span>
                 立即付款
              </button>
            </template>
            <template v-else>
              <p class="ticket-thanks">感谢您选择{{ displayTitle }}</p>
              <p class="ticket-hint">
                <span class="material-icons hint-icon">photo_camera</span>
                请拍照保存
              </p>
            </template>
          </div>
        </div>
      </template>

      <div v-if="!filteredOrders.length" class="empty-state">
        <span class="material-icons empty-icon">receipt_long</span>
        <p class="empty-text">暂无{{ tabLabel }}订单</p>
        <router-link to="/menu" class="empty-cta"><span class="material-icons">add</span> 去点餐</router-link>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toastVisible" class="toast">{{ toastMessage }}</div>
    </transition>

    <!-- Payment Popup -->
    <Teleport to="body">
      <div v-if="showPayPopup && selectedPayOrder" class="payment-overlay" @click.self="showPayPopup = false">
        <div class="payment-popup">
          <div class="popup-header">
            <span class="popup-icon">
              <span class="material-icons">qr_code_scanner</span>
            </span>
            <h3>扫码付款</h3>
            <p class="popup-amount"><small class="c-sign">¥</small>{{ selectedPayOrder.totals.payableAmount.toFixed(2) }}</p>
          </div>
          <div class="popup-qr-row">
            <div class="popup-qr-box">
              <img :src="qrMap.wechat" alt="微信支付" class="popup-qr-img" />
              <span class="popup-qr-label">微信支付</span>
            </div>
            <div class="popup-qr-box">
              <img :src="qrMap.alipay" alt="支付宝" class="popup-qr-img" />
              <span class="popup-qr-label">支付宝</span>
            </div>
          </div>
          <p class="popup-hint">打开微信或支付宝扫一扫付款</p>
          <p v-if="payError" class="popup-error">{{ payError }}</p>
          <button class="popup-paid-btn" :disabled="paySubmitting" @click="confirmPay">
            <template v-if="paySubmitting">
              <span class="spinner"></span>
              <span>处理中...</span>
            </template>
            <template v-else>
              <span class="material-icons">check_circle</span>
              <span>我已支付</span>
            </template>
          </button>
          <button class="popup-cancel-btn" @click="showPayPopup = false">关闭</button>
        </div>
      </div>
    </Teleport>

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
import { getDishImage } from '@/utils/dishImages'
import { apiGet, apiPost } from '@/utils/api'
import KioskTopBar from '@/components/KioskTopBar.vue'

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
  paidAt?: string
}

const orders = ref<OrderSummary[]>([])
const tab = ref('active')
const merchantName = ref('Sizzling Skewers')
const branchName = ref('')
const deviceCode = ref('')
const statusText = ref('')
const displayTitle = computed(() => {
  const m = merchantName.value
  const b = branchName.value
  return m && b ? `${m}（${b}）` : m || b || '典韦烤串'
})
const POLL_MS = 15000
const POLL_MAX_MS = 60000
const POLL_FAST_MS = 8000
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const toastMessage = ref('')
const toastVisible = ref(false)

const selectedPayOrder = ref<OrderSummary | null>(null)
const showPayPopup = ref(false)
const paySubmitting = ref(false)
const payError = ref('')
const qrModules = import.meta.glob('@/assets/images/payments/*.{jpg,png,webp}', { eager: true, query: '?url', import: 'default' })
const qrMap: Record<string, string> = {}
for (const [path, url] of Object.entries(qrModules)) {
  const match = path.match(/([^/\\]+)\.(jpg|png|webp)$/)
  if (match) qrMap[match[1]] = url as string
}

function dishImage(item: OrderItem): string {
  return getDishImage(item.dishId)
}

const tabs = [
  { key: 'active', label: '进行中', icon: 'hourglass_empty' },
  { key: 'ready', label: '待取餐', icon: 'notifications_active' },
]

const filteredOrders = computed(() => {
  if (tab.value === 'active') return orders.value.filter((o) => o.status === 'unpaid' || o.status === 'paid' || o.status === 'preparing' || (o.status === 'completed' && !o.paidAt))
  if (tab.value === 'ready') return orders.value.filter((o) => o.status === 'ready' || (o.status === 'completed' && !o.paidAt))
  return []
})

const tabLabel = computed(() => {
  const m: Record<string, string> = { active: '进行中', ready: '待取餐' }
  return m[tab.value] || ''
})

function badgeCount(key: string) {
  if (key === 'active') return orders.value.filter((o) => o.status === 'unpaid' || o.status === 'paid' || o.status === 'preparing' || (o.status === 'completed' && !o.paidAt)).length || ''
  if (key === 'ready') return orders.value.filter((o) => o.status === 'ready' || (o.status === 'completed' && !o.paidAt)).length || ''
  return ''
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    unpaid: '待支付',
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

async function confirmPay() {
  if (!selectedPayOrder.value || paySubmitting.value) return
  paySubmitting.value = true
  payError.value = ''
  try {
    await apiPost(`/api/orders/${selectedPayOrder.value.orderNo}/pay`, { paymentMethod: 'wechat' })
    showPayPopup.value = false
    selectedPayOrder.value = null
    showToast('付款成功')
    await fetchOrders()
  } catch (error) {
    payError.value = error instanceof Error ? error.message : '付款失败'
  } finally {
    paySubmitting.value = false
  }
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
    const savedSN = localStorage.getItem('kiosk-device-sn')
    const res = await fetch(`/api/system/bootstrap${savedSN ? `?sn=${savedSN}` : ''}`)
    if (!res.ok) return
    const data = await res.json() as { merchantName?: string; branchName?: string; deviceCode?: string; statusText?: string; deviceActive?: boolean; deviceId?: string; commands?: { id: string; command: string }[] }

    // 验证 token 对应的设备与 SN 匹配
    const authId = localStorage.getItem('kiosk-device-auth-id')
    if (authId && data.deviceId && data.deviceId !== authId) {
      localStorage.removeItem('kiosk-device-token')
      localStorage.removeItem('kiosk-device-auth-id')
      localStorage.removeItem('kiosk-device-sn')
      window.location.href = '/home'
      return
    }

    // 执行设备指令
    if (data.commands?.length) {
      for (const cmd of data.commands) {
        if (cmd.command === 'clear_storage') {
          localStorage.clear()
          document.cookie.split(';').forEach((c) => {
            document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`)
          })
        }
        fetch(`/api/commands/${cmd.id}/ack`, { method: 'POST' }).catch(() => {})
      }
      if (data.commands.some((c) => c.command === 'clear_storage')) {
        location.reload()
      }
    }

    if (data.deviceActive === false) {
      localStorage.clear()
      window.location.href = '/home'
      return
    }

    if (data.merchantName) merchantName.value = data.merchantName
    if (data.branchName) branchName.value = data.branchName
    if (data.deviceCode) deviceCode.value = data.deviceCode
    if (data.statusText) statusText.value = data.statusText
  } catch {}
}

async function fetchOrders() {
  try {
    const data = await apiGet<{ items: OrderSummary[] }>('/api/orders?scope=active')
    orders.value = data.items ?? []

    if (!firstLoad) {
      const newReady = orders.value.filter((o) => o.status === 'ready' && prevStatusMap.value[o.orderNo] !== 'ready')
      if (newReady.length) notifyReady(newReady)
    }
    firstLoad = false
    prevStatusMap.value = Object.fromEntries(orders.value.map((o) => [o.orderNo, o.status]))
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('已下线') || msg.includes('已失效') || msg.includes('未认证')) {
      window.location.href = '/home'
    }
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
let pollInterval = POLL_MS

function scheduleNextPoll() {
  timer = setTimeout(async () => {
    const prevOrders = orders.value.map((o) => o.status).join(',')
    await fetchOrders()
    const hasChanged = orders.value.map((o) => o.status).join(',') !== prevOrders
    const hasActive = orders.value.some((o) => o.status === 'unpaid' || o.status === 'paid' || o.status === 'preparing' || o.status === 'ready')

    if (hasChanged) {
      pollInterval = POLL_MS
    } else if (hasActive) {
      pollInterval = Math.min(pollInterval + 5000, POLL_MAX_MS)
    }

    if (hasActive) {
      scheduleNextPoll()
    }
  }, pollInterval)
}

function stopPolling() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

onMounted(() => {
  void fetchMerchantName()
  void fetchOrders().then(() => {
    const hasActive = orders.value.some((o) => o.status === 'unpaid' || o.status === 'paid' || o.status === 'preparing' || o.status === 'ready')
    if (hasActive) scheduleNextPoll()
  })
})

onUnmounted(() => {
  stopPolling()
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
.ticket-label { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; color: var(--secondary); margin: 0 0 var(--spacing-sm); text-transform: uppercase; letter-spacing: 0.08em; }
.takeaway-badge, .unpaid-badge, .status-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; text-transform: none; letter-spacing: normal; }
.takeaway-badge { background: var(--primary-container); color: var(--on-primary); }
.unpaid-badge { background: var(--error-container); color: var(--on-error-container); }
.status-badge { background: var(--surface-container-high); color: var(--on-surface); }
.status-unpaid { background: var(--error-container); color: var(--on-error-container); }
.status-paid, .status-preparing { background: var(--secondary-container); color: var(--on-secondary-container); }
.status-ready { background: var(--tertiary-container); color: var(--on-tertiary-container); }
.status-completed { background: var(--surface-variant); color: var(--on-surface-variant); }
.ticket-number { font-family: var(--font-display); font-size: 64px; font-weight: 800; color: var(--primary-container); letter-spacing: -0.04em; line-height: 1; }
.ticket-header-unpaid .ticket-number { color: #ef5350; }

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
.empty-cta { display: flex; align-items: center; justify-content: center; padding: var(--spacing-sm) 28px; border-radius: var(--radius-full); background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: var(--text-body-lg); font-weight: 700; text-decoration: none; box-shadow: 0 8px 20px rgba(255,107,0,0.15); }

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
.c-sign { font-size: 0.85em; padding: 0 1px; }

/* Payment Footer for unpaid orders */
.pay-reminder {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-bottom: var(--spacing-md);
}
.pay-reminder-icon { font-size: 20px !important; color: var(--error); }
.pay-reminder-text { font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700; color: var(--error); }
.pay-qr-row {
  display: flex; gap: var(--spacing-md); justify-content: center;
  margin-bottom: var(--spacing-md);
}
.pay-qr-box {
  width: 100px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.pay-qr-img { width: 100%; height: 100px; object-fit: contain; border-radius: var(--radius-md); background: #fff; }
.pay-qr-label { font-size: var(--text-label-sm); font-weight: 600; color: var(--secondary); }
.pay-now-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-xl);
  border: none; border-radius: var(--radius-full);
  background: var(--primary-container); color: var(--on-primary);
  font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700;
  cursor: pointer; transition: transform var(--transition-fast);
}
.pay-now-btn:active { transform: scale(0.98); }

/* Payment Popup (reuse checkout styles) */
.payment-overlay {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
}
.payment-popup {
  background: var(--surface); border-radius: var(--radius-xl);
  padding: var(--spacing-xl); width: 380px; max-width: 90vw;
  text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  border: 1px solid var(--card-border-strong);
}
.popup-header { margin-bottom: var(--spacing-lg); }
.popup-icon .material-icons { font-size: 40px; color: var(--primary-container); }
.popup-header h3 { margin: var(--spacing-sm) 0 0; font-family: var(--font-display); font-size: 20px; font-weight: 700; line-height: 1.3; }
.popup-amount { font-family: var(--font-display); font-size: 26px; font-weight: 800; color: var(--primary-container); margin: var(--spacing-sm) 0 0; line-height: 1.2; }
.popup-order-no { font-size: var(--text-label-sm); color: var(--secondary); margin: var(--spacing-xs) 0 0; }
.popup-qr-row { display: flex; gap: var(--spacing-lg); justify-content: center; margin-bottom: var(--spacing-lg); }
.popup-qr-box { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.popup-qr-img { width: 140px; height: 140px; object-fit: contain; background: #fff; border-radius: var(--radius-lg); }
.popup-qr-label { font-size: var(--text-label-sm); font-weight: 600; color: var(--secondary); }
.popup-hint { font-size: var(--text-body-sm); line-height: 1.5; color: var(--secondary); margin-bottom: var(--spacing-lg); }
.popup-error { color: var(--error); font-size: var(--text-body-sm); line-height: 1.5; margin-bottom: var(--spacing-md); padding: 8px; background: var(--error-container); border-radius: var(--radius-md); }
.popup-paid-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-sm);
  width: 100%; padding: 12px;
  border: none; border-radius: var(--radius-full);
  background: var(--primary-container); color: var(--on-primary);
  font-family: var(--font-display); font-size: 18px; font-weight: 700;
  cursor: pointer; transition: transform var(--transition-fast);
  white-space: nowrap;
}
.popup-paid-btn:active { transform: scale(0.98); }
.popup-paid-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.popup-cancel-btn {
  display: block; margin: var(--spacing-md) auto 0;
  background: none; border: none;
  font-family: var(--font-display); font-size: var(--text-body-sm); color: var(--secondary);
  cursor: pointer; text-decoration: underline;
}
.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@media (max-width: 499px) {
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

  .ticket-card {
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
    font-size: var(--text-body-md);
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
