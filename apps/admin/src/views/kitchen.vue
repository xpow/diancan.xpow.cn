<template>
  <div class="kitchen">
    <header class="top-bar">
      <div class="top-left">
        <span class="material-symbols-outlined top-icon">outdoor_grill</span>
        <h1 class="top-title">出餐管理</h1>
      </div>
      <div class="top-right">
        <span class="order-count-badge">{{ orders.length }}</span>
        <button class="settings-btn" @click="toggleVoice">
          <span class="material-symbols-outlined">{{ voiceEnabled ? 'volume_up' : 'volume_off' }}</span>
        </button>
        <router-link to="/orders" class="back-link">
          <span class="material-symbols-outlined">settings</span>
        </router-link>
      </div>
    </header>

    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" :class="['tab', tab === t.key && 'tab-active']" @click="tab = t.key">
        {{ t.label }}
        <span v-if="tabCounts[t.key]" class="tab-badge">{{ tabCounts[t.key] }}</span>
      </button>
    </div>

    <main>
      <div v-for="order in filteredOrders" :key="order.id" class="order-card" :class="`card-${order.status}`">
        <div class="card-header">
          <div class="card-number">{{ order.pickupCode }}</div>
          <div class="card-status" :class="`status-${order.status}`">
            {{ statusText(order.status) }}
          </div>
        </div>

        <div class="card-time">{{ new Date(order.createdAt).toLocaleString('zh-CN') }}</div>

        <div class="card-items">
          <div v-for="item in (order.items || [])" :key="item.dishId" class="card-item">
            <span class="card-item-name">{{ item.name }}</span>
            <span class="card-item-meta" v-if="item.specs">· {{ item.specs }}</span>
            <span class="card-item-qty">x{{ item.quantity }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button
            v-if="order.status === 'paid'"
            class="action-btn action-cook"
            @click="updateStatus(order, 'preparing')"
          >
            <span class="material-symbols-outlined">local_fire_department</span>
            开始制作
          </button>
          <button
            v-if="order.status === 'preparing' || order.status === 'ready'"
            class="action-btn action-ready"
            @click="announcePickup(order)"
          >
            <span class="material-symbols-outlined">{{ order.status === 'ready' ? 'volume_up' : 'task_alt' }}</span>
            {{ order.status === 'ready' ? '再次提醒' : '出餐' }}
          </button>
          <button
            v-if="order.status === 'preparing' || order.status === 'ready'"
            class="action-btn action-done"
            @click="updateStatus(order, 'completed')"
          >
            <span class="material-symbols-outlined">check_circle</span>
            已取餐
          </button>
          <button
            v-if="order.status === 'paid'"
            class="action-btn action-cancel"
            @click="updateStatus(order, 'cancelled')"
          >
            <span class="material-symbols-outlined">cancel</span>
            取消
          </button>
        </div>
      </div>

      <div v-if="!filteredOrders.length" class="empty">
        <span class="material-symbols-outlined empty-icon">checklist</span>
        <p>暂无{{ statusText(tab) }}订单</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'

const BRANCH_ID = 'demo-branch'
const POLL_MS = 5000
const STORAGE_KEY = 'kitchen_announced'

const orders = ref<any[]>([])
const tab = ref<'paid' | 'preparing' | 'ready'>('paid')
const voiceEnabled = ref(true)
const prevStatusMap = ref<Record<string, string>>({})
let wakeLock: any = null

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

// 页面可见性变化时重新请求（用户切回来时）
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock()
})

function loadAnnounced(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch { return new Set() }
}
function saveAnnounced(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}
const announcedIds = loadAnnounced()

const statuses = ['paid', 'preparing', 'ready']

const tabs = [
  { key: 'paid' as const, label: '等待' },
  { key: 'preparing' as const, label: '制作中' },
  { key: 'ready' as const, label: '待取餐' },
]

const tabCounts = computed(() => {
  const m: Record<string, number> = {}
  for (const o of orders.value) {
    m[o.status] = (m[o.status] || 0) + 1
  }
  return m
})

const filteredOrders = computed(() =>
  orders.value.filter((o) => o.status === tab.value)
)

function statusText(s: string) {
  const map: Record<string, string> = {
    paid: '等待中',
    preparing: '制作中',
    ready: '待取餐',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[s] || s
}

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

function speakTwice(msg: string) {
  if (!voiceEnabled.value || !window.speechSynthesis) return
  speechQueue = []
  speechQueue.push(msg, msg)
  processQueue()
}

async function announcePickup(order: any) {
  if (order.status === 'preparing') {
    await updateStatus(order, 'ready')
  } else {
    speakTwice(`请${order.pickupCode}取餐`)
    notify('取餐提醒', `${order.pickupCode} 号，请尽快取餐`)
  }
}

async function updateStatus(order: any, newStatus: string) {
  try {
    await fetch(`/api/admin/orders/${order.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    order.status = newStatus
    prevStatusMap.value[order.orderNo] = newStatus
    announcedIds.add(order.orderNo)
    saveAnnounced(announcedIds)
    const code = order.pickupCode
    if (newStatus === 'preparing') {
      speak(`订单${code}正在制作`)
      notify('开始制作', `取餐号 ${code} 正在制作`)
    }
    else if (newStatus === 'ready') speakTwice(`请${code}取餐`)
  } catch {
    // 静默失败，下次轮询恢复
  }
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders')
    const body = await res.json()
    const all: any[] = (body.items ?? []).filter((o: any) =>
      statuses.includes(o.status)
    )
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    orders.value = all

    for (const o of all) {
      const prev = prevStatusMap.value[o.orderNo]
      if (!prev && o.status === 'paid' && !announcedIds.has(o.orderNo)) {
        announcedIds.add(o.orderNo)
        saveAnnounced(announcedIds)
        speakTwice(`新订单${o.pickupCode}，请开始制作`)
        notify('新订单', `取餐号 ${o.pickupCode}，请开始制作`)
      } else if (prev && prev !== o.status) {
        if (o.status === 'preparing') speak(`订单${o.pickupCode}正在制作`)
        else if (o.status === 'ready') {
          speakTwice(`请${o.pickupCode}取餐`)
          notify('取餐提醒', `${o.pickupCode} 号已就绪`)
        }
      }
      prevStatusMap.value[o.orderNo] = o.status
    }
  } catch {
    // ignore
  }
}

let timer: ReturnType<typeof setInterval> | null = null

function toggleVoice() {
  voiceEnabled.value = !voiceEnabled.value
}

function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const n = new Notification(title, { body, icon: '/favicon.ico', tag: 'kitchen' })
  setTimeout(() => n.close(), 5000)
}

onMounted(() => {
  requestWakeLock()
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
  fetchOrders()
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
.back-link:active { background: var(--surface-container-high); }

.tabs {
  position: sticky; top: 52px; z-index: 49;
  display: flex; gap: 8px; padding: 8px 16px;
  background: rgba(252, 249, 248, 0.95); backdrop-filter: blur(12px);
  overflow-x: auto; -webkit-overflow-scrolling: touch;
}
.tab {
  flex-shrink: 0; padding: 8px 20px; border-radius: 9999px; border: none;
  font-family: var(--font-display); font-size: 14px; font-weight: 600;
  background: var(--surface-container-high); color: var(--secondary); cursor: pointer;
  transition: all 0.2s;
}
.tab-active { background: var(--primary-container); color: var(--on-primary); }
.tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 9999px; background: var(--on-primary); color: var(--primary-container); font-size: 11px; font-weight: 700; margin-left: 6px; }
.tab-active .tab-badge { background: rgba(255,255,255,0.25); color: var(--on-primary); }

main { padding: 12px 16px; display: flex; flex-direction: column; gap: 16px; }

.order-card {
  background: var(--surface-container-lowest);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border-left: 4px solid var(--outline);
}
.card-paid { border-left-color: var(--outline); }
.card-preparing { border-left-color: var(--primary-container); }
.card-ready { border-left-color: var(--tertiary); }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.card-number { font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--text); letter-spacing: -0.02em; line-height: 1; }
.card-status { padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
.status-paid { background: var(--surface-container-high); color: var(--secondary); }
.status-preparing { background: rgba(255,107,0,0.12); color: var(--primary-container); }
.status-ready { background: rgba(0,110,28,0.1); color: var(--tertiary); }

.card-time { font-size: 12px; color: var(--secondary); margin-bottom: 12px; }

.card-items { margin-bottom: 16px; }
.card-item { display: flex; align-items: center; gap: 4px; padding: 4px 0; font-size: 14px; line-height: 20px; }
.card-item-name { font-weight: 600; }
.card-item-meta { color: var(--secondary); }
.card-item-qty { margin-left: auto; color: var(--secondary); font-weight: 600; }

.card-actions { display: flex; gap: 8px; }
.action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 12px; border-radius: 9999px; border: none;
  font-family: var(--font-display); font-size: 15px; font-weight: 700;
  cursor: pointer; transition: transform 0.12s;
}
.action-btn:active { transform: scale(0.96); }
.action-cook { background: var(--primary-container); color: var(--on-primary); box-shadow: 0 4px 12px rgba(255,107,0,0.25); }
.action-ready { background: var(--tertiary-container); color: #fff; box-shadow: 0 4px 12px rgba(0,110,28,0.25); }
.action-done { background: var(--tertiary); color: #fff; }
.action-cancel { flex: none; padding: 12px 16px; background: var(--error-container); color: var(--error); }

.empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 0; color: var(--secondary); font-size: 14px; }
.empty-icon { font-size: 64px; color: var(--outline-variant); }
</style>
