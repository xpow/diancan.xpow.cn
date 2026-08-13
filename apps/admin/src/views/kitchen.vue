<template>
  <div class="kitchen">
    <header class="top-bar">
      <div class="top-left">
        <span class="material-symbols-outlined top-icon">outdoor_grill</span>
        <h1 class="top-title">出餐管理</h1>
      </div>
      <div class="top-right">
        <span v-if="terminal.code" class="terminal-badge">{{ terminal.code }}</span>
        <span class="order-count-badge">{{ totalItems }}</span>
        <button class="settings-btn" @click="toggleVoice">
          <span class="material-symbols-outlined">{{ voiceEnabled ? 'volume_up' : 'volume_off' }}</span>
        </button>
        <button class="settings-btn" @click="openTerminalSettings">
          <span class="material-symbols-outlined">monitor_heart</span>
        </button>
      </div>
    </header>

    <div v-if="showTerminalSettings" class="terminal-settings-overlay" @click.self="showTerminalSettings = false">
      <div class="terminal-settings">
        <div class="terminal-settings-header">
          <h2>终端出餐设置</h2>
          <button class="terminal-close" @click="showTerminalSettings = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="terminal-form-row">
          <label>出餐机编码</label>
          <input v-model="terminalCode" class="terminal-input" placeholder="如 01号" maxlength="6" />
        </div>
        <div class="terminal-form-row">
          <label>显示分类</label>
          <div class="terminal-cats">
            <button
              v-for="c in terminalCategories"
              :key="c.id"
              :class="['terminal-cat', terminalCats.includes(c.id) && 'terminal-cat-active']"
              @click="toggleTerminalCat(c.id)"
            >
              {{ c.name }}
            </button>
            <button
              :class="['terminal-cat', terminalCats.length === 0 && 'terminal-cat-active']"
              @click="terminalCats = []"
            >
              全部
            </button>
          </div>
          <p class="terminal-hint">留空「全部」表示显示所有分类</p>
        </div>
        <button class="terminal-save" @click="saveTerminalSettings">保存</button>
      </div>
    </div>

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
        <button
          v-if="group.canComplete && tab === 'ready'"
          class="action-btn action-done order-done"
          @click="completeOrder(group)"
        >
          <span class="material-symbols-outlined">checklist</span>
          全部取餐
        </button>
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

const POLL_MS = 5000
const STORAGE_KEY = 'kitchen_announced'
const STORAGE_KEY_READY = 'kitchen_announced_ready'
const STORAGE_KEY_TERMINAL = 'kitchen_terminal_settings'

interface TerminalCategory { id: string; name: string }
interface TerminalSettings { code: string; categoryIds: string[] }

function loadTerminal(): TerminalSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TERMINAL)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed === 'object') {
      return { code: String(parsed.code ?? ''), categoryIds: Array.isArray(parsed.categoryIds) ? parsed.categoryIds : [] }
    }
  } catch {}
  return { code: '', categoryIds: [] }
}

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
let wakeLock: any = null
let announcedReadyOrders = loadAnnouncedReady()
let announcedNewOrders = loadAnnounced()

const terminal = ref<TerminalSettings>(loadTerminal())
const showTerminalSettings = ref(false)
const terminalCode = ref(terminal.value.code)
const terminalCats = ref<string[]>([...terminal.value.categoryIds])
const terminalCategories = ref<TerminalCategory[]>([])

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
  if (!terminal.value.categoryIds.length) return allItems.value
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
      if (terminal.value.categoryIds.length && !terminal.value.categoryIds.includes(item.categoryId ?? '')) return false
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
  return Object.values(groups).map((g) => ({
    ...g,
    canComplete: tab.value === 'ready' && orders.value.find((o) => o.id === g.orderId)?.items.every((i) => i.status === 'ready'),
  }))
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

async function completeOrder(group: { pickupCode: string; orderId: string }) {
  try {
    await fetch(`/api/admin/orders/${group.orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    const order = orders.value.find((o) => o.id === group.orderId)
    if (order) order.status = 'completed'
  } catch {}
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/admin/orders?scope=active&limit=50')
    const body = await res.json()
    const active: Order[] = (body.items ?? [])
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

function openTerminalSettings() {
  terminalCode.value = terminal.value.code
  terminalCats.value = [...terminal.value.categoryIds]
  showTerminalSettings.value = true
}

function toggleTerminalCat(id: string) {
  const i = terminalCats.value.indexOf(id)
  if (i > -1) terminalCats.value.splice(i, 1)
  else terminalCats.value.push(id)
}

function saveTerminalSettings() {
  terminal.value = { code: terminalCode.value.trim(), categoryIds: [...terminalCats.value] }
  try { localStorage.setItem(STORAGE_KEY_TERMINAL, JSON.stringify(terminal.value)) } catch {}
  showTerminalSettings.value = false
}

async function fetchCategories() {
  try {
    const res = await fetch('/api/admin/categories')
    if (!res.ok) return
    terminalCategories.value = await res.json()
  } catch {}
}

onMounted(() => {
  requestWakeLock()
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
  fetchOrders()
  fetchCategories()
  timer = setInterval(fetchOrders, POLL_MS)
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
.order-count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 9999px; background: var(--primary-container); color: #fff; font-size: 12px; font-weight: 700; }
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
.group-tag { font-size: 12px; background: var(--primary); padding: 2px 8px; border-radius: 6px; color: #fff; font-weight: 600; }
.group-pay { font-size: 12px; background: var(--surface-card); padding: 2px 8px; border-radius: 6px; color: var(--secondary); }
.group-pay.pay-wechat { background: #07c160; color: #fff; }
.group-pay.pay-alipay { background: #1677ff; color: #fff; }
.group-fr { font-size: 12px; background: #fff1f0; color: #e53935; padding: 2px 8px; border-radius: 6px; font-weight: 700; }
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

.action-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 16px; border-radius: 9999px; border: none;
  font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;
  flex-shrink: 0;
}
.action-cook { background: var(--primary-container); color: var(--on-primary); }
.action-ready { background: var(--tertiary-container); color: #fff; }
.action-remind { background: var(--surface-container-high); color: var(--primary-container); }
.action-done { background: var(--tertiary); color: #fff; }
.order-done { margin: 0 12px 12px; justify-content: center; }

.empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 0; color: var(--secondary); font-size: 14px; }
.empty-icon { font-size: 64px; color: var(--outline-variant); }

.terminal-badge { display: inline-flex; align-items: center; justify-content: center; padding: 3px 10px; border-radius: 9999px; background: var(--primary-container); color: #fff; font-size: 12px; font-weight: 800; }

.terminal-settings-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; justify-content: center; }
.terminal-settings { width: 100%; max-width: 600px; background: var(--surface-container-lowest); border-radius: 16px 16px 0 0; padding: 20px 20px 24px; box-shadow: 0 -8px 30px rgba(0,0,0,0.15); }
.terminal-settings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.terminal-settings-header h2 { margin: 0; font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); }
.terminal-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--surface-container-high); color: var(--secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.terminal-form-row { margin-bottom: 16px; }
.terminal-form-row label { display: block; font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.terminal-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--outline-variant); background: var(--surface-card); color: var(--text); font-size: 15px; font-weight: 700; box-sizing: border-box; }
.terminal-cats { display: flex; flex-wrap: wrap; gap: 8px; }
.terminal-cat { padding: 8px 16px; border-radius: 9999px; border: 1px solid var(--outline-variant); background: var(--surface-container-high); color: var(--secondary); font-size: 13px; font-weight: 600; cursor: pointer; }
.terminal-cat-active { background: var(--primary-container); border-color: var(--primary-container); color: var(--on-primary); }
.terminal-hint { font-size: 11px; color: var(--secondary); margin-top: 8px; }
.terminal-save { width: 100%; padding: 12px; border: none; border-radius: 12px; background: var(--primary-container); color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; }
</style>
