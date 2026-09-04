<template>
  <div v-if="!authed" class="kitchen-login">
    <div class="kitchen-login-card">
      <h1 class="kitchen-login-title">出餐管理</h1>
      <p class="kitchen-login-subtitle">请输入出餐密码</p>
      <form @submit.prevent="doLogin">
        <div class="field">
          <label>出餐密码</label>
          <input
            v-model="password"
            type="password"
            class="kitchen-login-input"
            placeholder="输入出餐密码"
          />
        </div>
        <p v-if="error" class="kitchen-login-error">{{ error }}</p>
        <button type="submit" class="kitchen-login-btn" :disabled="loading || !password">
          {{ loading ? '验证中...' : '进入出餐' }}
        </button>
      </form>
    </div>
  </div>

  <div v-else class="kitchen">
    <header class="top-bar">
      <div class="top-left">
        <span class="material-symbols-outlined top-icon">outdoor_grill</span>
        <h1 class="top-title">出餐管理</h1>
      </div>
      <div class="top-right">
        <span v-if="terminal.code" class="terminal-badge">{{ terminal.role === 'admin' ? '管理员' : '' }}出餐机{{ terminal.code }}</span>
        <span class="order-count-badge">{{ totalItems }}</span>
        <button class="settings-btn" @click="toggleVoice">
          <span class="material-symbols-outlined">{{ voiceEnabled ? 'volume_up' : 'volume_off' }}</span>
        </button>
        <button class="settings-btn" @click="logout" title="退出">
          <span class="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>

    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="['tab', tab === t.key && 'tab-active']" @click="tab = t.key">
        {{ t.label }}
        <span class="tab-badge">{{ itemCounts[t.key] }}</span>
      </button>
    </div>

    <main>
      <div v-for="group in filtered" :key="group.orderId" class="order-group">
        <div class="group-header">
          <span class="group-left">
            <span class="group-code">{{ group.pickupCode }}</span>
            <span v-if="group.orderType === 'takeaway'" class="group-tag">自提</span>
            <span v-if="group.paymentMethod" :class="['group-pay', 'pay-' + group.paymentMethod]">{{ payLabel(group.paymentMethod) }}</span>
          </span>
          <span class="group-time">{{ group.time }}</span>
        </div>
        <div
          v-for="item in group.items"
          :key="item.id"
          class="item-card"
          :class="`card-${item.status}`"
        >
          <div class="item-info">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-tags">
              <span class="tag-qty">x{{ item.quantity }}</span>
              <span v-if="isGift(item)" class="tag-gift">赠品</span>
              <span v-if="item.specs" class="tag-specs">{{ item.specs }}</span>
            </div>
          </div>
          <button
            v-if="item.status === 'pending'"
            class="action-btn action-cook"
            @click="startCook(item)"
          >
            <span class="material-symbols-outlined">local_fire_department</span>
            开始制作
          </button>
          <button
            v-if="item.status === 'preparing'"
            class="action-btn action-ready"
            @click="finishCook(item)"
          >
            <span class="material-symbols-outlined">task_alt</span>
            制作完成
          </button>
          <button
            v-if="item.status === 'ready'"
            class="action-btn action-remind"
            @click="remindPickup(item)"
          >
            <span class="material-symbols-outlined">volume_up</span>
            再次提醒
          </button>
        </div>
      </div>

      <div v-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined empty-icon">checklist</span>
        <p>暂无出餐项</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const urlToken = computed(() => String(route.params.token ?? ''))

const POLL_MS = 5000
const STORAGE_KEY = 'kitchen_announced'
const STORAGE_KEY_READY = 'kitchen_announced_ready'

interface TerminalSettings { code: string; name: string; role: string; categoryIds: string[] }

// 当前出餐机由URL唯一地址识别；admin 或无出餐机时看全部
const terminal = ref<TerminalSettings>({ code: '', name: '', role: 'user', categoryIds: [] })
const isAdmin = computed(() => terminal.value.role === 'admin' || !terminal.value.code)

function loadAnnounced(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch { return new Set() }
}
function saveAnnounced(s: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]))
}
function loadAnnouncedReady(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY_READY) || '[]')) } catch { return new Set() }
}
function saveAnnouncedReady(s: Set<string>) {
  localStorage.setItem(STORAGE_KEY_READY, JSON.stringify([...s]))
}

interface OrderItem {
  id: string
  dishId: string
  categoryId?: string
  categoryName?: string
  name: string
  quantity: number
  specs?: string
  status: string
  finalUnitPrice?: number
  promotionLabel?: string
}

function isGift(item: OrderItem): boolean {
  return item.finalUnitPrice === 0 || (item.promotionLabel || '').includes('赠品')
}

interface Order {
  id: string
  orderNo: string
  pickupCode: string
  orderType?: string
  paymentMethod?: string
  status: string
  fullReduction?: number
  items: OrderItem[]
  createdAt: string
}

const orders = ref<Order[]>([])
const tab = ref<'pending' | 'preparing' | 'ready'>('pending')
const voiceEnabled = ref(true)
const authed = ref(false)
const password = ref('')
const error = ref('')
const loading = ref(false)
let wakeLock: any = null
let announcedReadyOrders = loadAnnouncedReady()
let announcedNewOrders = loadAnnounced()

const tabs = [
  { key: 'pending' as const, label: '等待' },
  { key: 'preparing' as const, label: '制作中' },
  { key: 'ready' as const, label: '待取餐' },
]

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen')
      wakeLock.addEventListener('release', () => { wakeLock = null })
    }
  } catch {}
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release() } catch {}
    wakeLock = null
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock()
})

const allItems = computed(() => orders.value.flatMap((o) => o.items))

const visibleItems = computed(() => {
  if (isAdmin.value) return allItems.value
  if (!terminal.value.categoryIds.length) return []
  return allItems.value.filter((item) => terminal.value.categoryIds.includes(item.categoryId ?? ''))
})

const totalItems = computed(() => visibleItems.value.length)

const itemCounts = computed(() => {
  const m: Record<string, number> = { pending: 0, preparing: 0, ready: 0 }
  for (const item of visibleItems.value) {
    if (item.status in m) m[item.status]++
  }
  return m
})

const payLabels: Record<string, string> = { wechat: '微信', alipay: '支付宝', cash: '现金' }
function payLabel(m: string): string { return payLabels[m] || m }

const filtered = computed(() => {
  const groups: Record<string, { orderNo: string; pickupCode: string; orderType?: string; paymentMethod?: string; fullReduction?: number; orderId: string; time: string; items: OrderItem[] }> = {}
  for (const order of orders.value) {
    const filteredItems = order.items.filter((item) => {
      if (item.status !== tab.value) return false
      if (!isAdmin.value) {
        if (!terminal.value.categoryIds.length) return false
        if (!terminal.value.categoryIds.includes(item.categoryId ?? '')) return false
      }
      return true
    })
    if (!filteredItems.length) continue
    groups[order.id] = {
      orderNo: order.orderNo,
      pickupCode: order.pickupCode,
      orderType: order.orderType,
      paymentMethod: order.paymentMethod,
      fullReduction: order.fullReduction,
      orderId: order.id,
      time: new Date(order.createdAt).toLocaleString('zh-CN'),
      items: filteredItems,
    }
  }
  return Object.values(groups)
})

let speechQueue: string[] = []
let speaking = false

function fixSpeech(text: string): string {
  return text.replace(/([A-Z])(\d)/g, '$1\u200B$2')
}

function processQueue() {
  if (speaking || !speechQueue.length) return
  speaking = true
  const raw = speechQueue.shift()!
  const msg = fixSpeech(raw)
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(msg)
  u.lang = 'zh-CN'
  u.rate = 0.9
  u.onend = () => { speaking = false; processQueue() }
  u.onerror = () => { speaking = false; processQueue() }
  window.speechSynthesis.speak(u)
}

function speak(msg: string) {
  if (!voiceEnabled.value || !window.speechSynthesis) return
  speechQueue = []
  speechQueue.push(msg)
  processQueue()
}

function remindPickup(item: OrderItem) {
  const order = orders.value.find((o) => o.items.some((i) => i.id === item.id))
  if (order) speakTwice(`请${order.pickupCode}取餐`)
}

function speakTwice(msg: string) {
  if (!voiceEnabled.value || !window.speechSynthesis) return
  speechQueue = []
  speechQueue.push(msg, msg)
  processQueue()
}

function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const n = new Notification(title, { body, icon: '/favicon.ico', tag: 'kitchen' })
  setTimeout(() => n.close(), 5000)
}

async function updateItemStatus(item: OrderItem, newStatus: string) {
  const order = orders.value.find((o) => o.items.some((i) => i.id === item.id))
  if (!order) return
  try {
    await fetch(`/api/admin/orders/${order.id}/items/${item.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    item.status = newStatus
  } catch {}
}

async function startCook(item: OrderItem) {
  await updateItemStatus(item, 'preparing')
  const order = orders.value.find((o) => o.items.some((i) => i.id === item.id))
  if (order) speak(`订单${order.pickupCode}正在制作`)
}

async function finishCook(item: OrderItem) {
  await updateItemStatus(item, 'ready')
  const order = orders.value.find((o) => o.items.some((i) => i.id === item.id))
  if (!order) return
  const allReady = order.items.every((i) => i.status === 'ready')
  if (allReady && !announcedReadyOrders.has(order.pickupCode)) {
    announcedReadyOrders.add(order.pickupCode)
    saveAnnouncedReady(announcedReadyOrders)
    speakTwice(`请${order.pickupCode}取餐`)
    notify('取餐提醒', `${order.pickupCode} 号已全部出餐`)
  }
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/admin/orders?scope=active&limit=50')
    const body = await res.json()
    const active: Order[] = ((body.items ?? []) as Order[]).filter((o) => o.status !== 'completed')
    active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    orders.value = active

    for (const order of active) {
      const allPending = order.items.every((item) => item.status === 'pending')
      if (allPending && !announcedNewOrders.has(order.pickupCode)) {
        announcedNewOrders.add(order.pickupCode)
        saveAnnounced(announcedNewOrders)
        speakTwice(`新订单${order.pickupCode}，请开始制作`)
        notify('新订单', `取餐号 ${order.pickupCode}`)
      }
    }
  } catch {}
}

let timer: ReturnType<typeof setInterval> | null = null

function toggleVoice() {
  voiceEnabled.value = !voiceEnabled.value
}

async function resolveTerminalByToken() {
  const t = urlToken.value.trim()
  if (!t) return
  try {
    const res = await fetch(`/api/admin/kitchen-terminal/by-token?token=${encodeURIComponent(t)}`)
    if (!res.ok) return
    const data = await res.json()
    terminal.value = { code: data.code, name: data.name, role: data.role || 'user', categoryIds: data.categoryIds || [] }
  } catch {}
}

async function checkAuth() {
  try {
    const res = await fetch('/api/admin/kitchen/check')
    const data = await res.json()
    authed.value = !!data.authed
  } catch {
    authed.value = false
  }
  return authed.value
}

async function doLogin() {
  if (!password.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/admin/kitchen/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value }),
    })
    if (!res.ok) {
      const data = await res.json()
      error.value = data.message || '出餐密码错误'
      return
    }
    password.value = ''
    await enterKitchen()
  } catch {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}

async function logout() {
  try { await fetch('/api/admin/kitchen/logout', { method: 'POST' }) } catch {}
  authed.value = false
}

async function enterKitchen() {
  authed.value = true
  await resolveTerminalByToken()
  await fetchOrders()
  if (timer) clearInterval(timer)
  timer = setInterval(fetchOrders, POLL_MS)
}

onMounted(async () => {
  const ok = await checkAuth()
  if (ok) {
    await enterKitchen()
    requestWakeLock()
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }
})

onUnmounted(() => {
  releaseWakeLock()
  if (timer) clearInterval(timer)
  window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.kitchen { background: var(--bg); min-height: 100dvh; padding-bottom: 32px; max-width: 600px; margin: 0 auto; }

.top-bar {
  position: sticky; top: 0; z-index: 50;
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px;
  background: rgba(252, 249, 248, 0.95); backdrop-filter: blur(12px);
}
.top-left { display: flex; align-items: center; gap: 8px; }
.top-icon { color: var(--primary-container); font-size: 24px; }
.top-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--primary-container); margin: 0; }
.top-right { display: flex; align-items: center; gap: 12px; }
.order-count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 9999px; background: var(--primary-container); color: var(--on-primary); font-size: 12px; font-weight: 700; }
.settings-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--secondary); }
.settings-btn:active { background: var(--surface-container-high); }
.back-link { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--secondary); text-decoration: none; }

.tabs {
  position: sticky; top: 52px; z-index: 49;
  display: flex; gap: 8px; padding: 8px 16px;
  background: rgba(252, 249, 248, 0.95); backdrop-filter: blur(12px);
  overflow-x: auto;
}
.tab {
  flex-shrink: 0; padding: 8px 20px; border-radius: 9999px; border: none;
  font-family: var(--font-display); font-size: 14px; font-weight: 600;
  background: var(--surface-container-high); color: var(--secondary); cursor: pointer;
}
.tab-active { background: var(--primary-container); color: var(--on-primary); }
.tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 9999px; background: var(--on-primary); color: var(--primary-container); font-size: 11px; font-weight: 700; margin-left: 6px; }
.tab-active .tab-badge { background: rgba(255,255,255,0.25); color: var(--on-primary); }

main { padding: 12px 16px; display: flex; flex-direction: column; gap: 16px; }

.order-group {
  background: var(--surface-container-lowest);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.group-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px 0;
}
.group-left { display: flex; align-items: center; gap: 8px; }
.group-code { font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--text); }
.group-tag { font-size: 12px; background: var(--primary); padding: 2px 8px; border-radius: 6px; color: var(--on-primary); font-weight: 600; }
.group-pay { font-size: 12px; background: var(--surface-card); padding: 2px 8px; border-radius: 6px; color: var(--secondary); }
.group-pay.pay-wechat { background: #07c160; color: var(--on-primary); }
.group-pay.pay-alipay { background: #1677ff; color: var(--on-primary); }
.group-fr { font-size: 12px; background: var(--error-soft); color: #e53935; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
.group-time { font-size: 11px; color: var(--secondary); }

.item-card {
  display: flex; align-items: center; gap: 12px;
  margin: 8px 12px; padding: 12px 16px;
  border-radius: 12px;
  border-left: 4px solid var(--outline);
}
.card-pending { border-left-color: var(--outline); }
.card-preparing { border-left-color: var(--primary-container); }
.card-ready { border-left-color: var(--tertiary); }

.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 15px; font-weight: 700; line-height: 1.3; }
.item-tags { display: flex; gap: 6px; margin-top: 6px; }
.tag-qty { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 9999px; background: var(--primary-container); color: var(--on-primary); font-size: 13px; font-weight: 800; }
.tag-specs { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 9999px; background: var(--surface-container-high); color: var(--secondary); font-size: 13px; font-weight: 600; }
.tag-gift { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 9999px; background: #e74c3c; color: var(--on-primary); font-size: 13px; font-weight: 800; }

.action-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 16px; border-radius: 9999px; border: none;
  font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;
  flex-shrink: 0;
}
.action-cook { background: var(--primary-container); color: var(--on-primary); }
.action-ready { background: var(--tertiary-container); color: var(--on-primary); }
.action-remind { background: var(--surface-container-high); color: var(--primary-container); }
.action-done { background: var(--tertiary); color: var(--on-primary); }
.order-done { margin: 0 12px 12px; justify-content: center; }

.empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 0; color: var(--secondary); font-size: 14px; }
.empty-icon { font-size: 64px; color: var(--outline-variant); }

.terminal-badge { display: inline-flex; align-items: center; justify-content: center; padding: 3px 10px; border-radius: 9999px; background: var(--primary-container); color: var(--on-primary); font-size: 12px; font-weight: 800; }

.kitchen-login { display: flex; align-items: center; justify-content: center; min-height: 100dvh; background: #f0f2f5; padding: 16px; box-sizing: border-box; }
.kitchen-login-card { width: 100%; max-width: 360px; padding: 40px; background: var(--surface); border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); box-sizing: border-box; }
.kitchen-login-title { margin: 0 0 4px; font-size: 24px; font-weight: 700; text-align: center; }
.kitchen-login-subtitle { margin: 0 0 24px; font-size: 14px; color: var(--text-secondary); text-align: center; }
.kitchen-login .field { margin-bottom: 16px; }
.kitchen-login .field label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.kitchen-login-input { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 15px; outline: none; box-sizing: border-box; }
.kitchen-login-input:focus { border-color: #ff6b00; }
.kitchen-login-error { color: #e53935; font-size: 13px; margin: -8px 0 16px; }
.kitchen-login-btn { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #ff6b00; color: var(--on-primary); font-size: 16px; font-weight: 600; cursor: pointer; }
.kitchen-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.kitchen-login-btn:not(:disabled):hover { background: #e05a00; }
</style>
