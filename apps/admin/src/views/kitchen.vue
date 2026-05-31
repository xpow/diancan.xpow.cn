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
      <button :class="['tab', tab === 'all' && 'tab-active']" @click="tab = 'all'">全部</button>
      <button :class="['tab', tab === 'pending' && 'tab-active']" @click="tab = 'pending'">等待</button>
      <button :class="['tab', tab === 'preparing' && 'tab-active']" @click="tab = 'preparing'">制作中</button>
      <button :class="['tab', tab === 'ready' && 'tab-active']" @click="tab = 'ready'">待取餐</button>
    </div>

    <main>
      <div v-for="order in filteredOrders" :key="order.id" class="order-card" :class="`card-${order.status}`">
        <div class="card-header">
          <div class="card-number">{{ order.orderNumber }}</div>
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
            v-if="order.status === 'pending'"
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
            v-if="order.status === 'pending'"
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
        <p>暂无{{ tab === 'all' ? '' : statusText(tab) }}订单</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const BRANCH_ID = 'demo-branch'
const POLL_MS = 5000
const STORAGE_KEY = 'kitchen_announced'

const orders = ref<any[]>([])
const tab = ref<'all' | 'pending' | 'preparing' | 'ready'>('all')
const voiceEnabled = ref(true)
const prevStatusMap = ref<Record<string, string>>({})

function loadAnnounced(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch { return new Set() }
}
function saveAnnounced(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}
const announcedIds = loadAnnounced()

const statuses = ['pending', 'preparing', 'ready']

const filteredOrders = computed(() =>
  tab.value === 'all'
    ? orders.value
    : orders.value.filter((o) => o.status === tab.value)
)

function statusText(s: string) {
  const map: Record<string, string> = {
    pending: '等待中',
    preparing: '制作中',
    ready: '待取餐',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[s] || s
}

function speak(msg: string) {
  if (!voiceEnabled.value) return
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(msg)
  u.lang = 'zh-CN'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

function speakTwice(msg: string) {
  speak(msg)
  setTimeout(() => speak(msg), 1200)
}

async function announcePickup(order: any) {
  if (order.status === 'preparing') {
    await updateStatus(order, 'ready')
  } else {
    speakTwice(`请${order.orderNumber}取餐`)
    notify('取餐提醒', `${order.orderNumber} 号，请尽快取餐`)
  }
}

async function updateStatus(order: any, newStatus: string) {
  try {
    await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    order.status = newStatus
    prevStatusMap.value[order.id] = newStatus
    announcedIds.add(order.id)
    saveAnnounced(announcedIds)
    const num = order.orderNumber
    if (newStatus === 'preparing') {
      speak(`订单${num}正在制作`)
      notify('开始制作', `取餐号 ${num} 正在制作`)
    }
    else if (newStatus === 'ready') speakTwice(`请${num}取餐`)
  } catch {
    // 静默失败，下次轮询恢复
  }
}

async function fetchOrders() {
  try {
    const all = await Promise.all(
      statuses.map((s) =>
        fetch(`/api/orders?branchId=${BRANCH_ID}&status=${s}&limit=20`).then((r) =>
          r.json()
        )
      )
    )
    const merged = all.flat().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    orders.value = merged

    for (const o of merged) {
      const prev = prevStatusMap.value[o.id]
      if (!prev && o.status === 'pending' && !announcedIds.has(o.id)) {
        // 新订单（未播报过的）
        announcedIds.add(o.id)
        saveAnnounced(announcedIds)
        speakTwice(`新订单${o.orderNumber}，请开始制作`)
        notify('新订单', `取餐号 ${o.orderNumber}，请开始制作`)
      } else if (prev && prev !== o.status) {
        // 外部状态变更（桌面端操作）
        if (o.status === 'preparing') speak(`订单${o.orderNumber}正在制作`)
        else if (o.status === 'ready') {
          speakTwice(`请${o.orderNumber}取餐`)
          notify('取餐提醒', `${o.orderNumber} 号已就绪`)
        }
      }
      prevStatusMap.value[o.id] = o.status
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
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
  fetchOrders()
  timer = setInterval(fetchOrders, POLL_MS)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.kitchen { background: var(--bg); min-height: 100dvh; padding-bottom: 32px; }

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

main { padding: 12px 16px; display: flex; flex-direction: column; gap: 16px; }

.order-card {
  background: var(--surface-container-lowest);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  border-left: 4px solid var(--outline);
}
.card-pending { border-left-color: var(--outline); }
.card-preparing { border-left-color: var(--primary-container); }
.card-ready { border-left-color: var(--tertiary); }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.card-number { font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--text); letter-spacing: -0.02em; line-height: 1; }
.card-status { padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
.status-pending { background: var(--surface-container-high); color: var(--secondary); }
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
