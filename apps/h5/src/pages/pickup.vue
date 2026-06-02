<template>
  <div class="pickup-page">
    <header class="top-bar">
      <div class="top-left">
        <span class="material-symbols-outlined top-icon">restaurant_menu</span>
        <h1 class="top-title">Sizzling Skewers</h1>
      </div>
      <button class="close-btn" @click="router.push('/home')">
        <span class="material-symbols-outlined">close</span>
      </button>
    </header>

    <main>
      <div class="status-tabs">
        <button
          v-for="t in tabs" :key="t.key"
          :class="['tab', tab === t.key && 'tab-active']"
          @click="tab = t.key"
        >
          {{ t.label }}
          <span v-if="badgeCount(t.key)" class="tab-badge">{{ badgeCount(t.key) }}</span>
        </button>
      </div>

      <template v-for="(order, oi) in filteredOrders" :key="order.id">
        <div class="order-section-label" v-if="oi > 0">
          <span class="section-divider"></span>
        </div>

        <div class="status-section">
          <div class="status-pill" :class="`status-${order.status}`">
            <span class="material-symbols-outlined status-icon" style="font-variation-settings: 'FILL' 1;">{{ statusIcon(order.status) }}</span>
            <span class="status-text">{{ statusLabel(order.status) }}</span>
          </div>
          <p class="status-hint">{{ statusHint(order.status) }}</p>
        </div>

        <button class="nfc-trigger" v-if="oi === 0 && nfcSupported && !nfcScanning" @click="startNfcScan">
          <div class="nfc-section">
            <div class="nfc-icon-wrap">
              <div class="nfc-ping"></div>
              <div class="nfc-circle">
                <span class="material-symbols-outlined nfc-icon">contactless</span>
              </div>
            </div>
            <div class="nfc-text">
              <div class="nfc-status">
                <div class="nfc-dot nfc-dot-active"></div>
                <span class="nfc-label">点击开始感应</span>
              </div>
              <p class="nfc-title">NFC 感应取餐</p>
              <p class="nfc-desc">靠近取餐柜 NFC 感应区，碰一碰即可取餐</p>
            </div>
          </div>
        </button>
        <div class="ticket-card" v-if="oi === 0 && nfcScanning">
          <div class="nfc-section nfc-scanning">
            <div class="nfc-icon-wrap">
              <div class="nfc-ping"></div>
              <div class="nfc-circle">
                <span class="material-symbols-outlined nfc-icon">contactless</span>
              </div>
            </div>
            <div class="nfc-text">
              <div class="nfc-status">
                <div class="nfc-dot nfc-dot-active"></div>
                <span class="nfc-label">感应中...</span>
              </div>
              <p class="nfc-title">请将手机靠近 NFC 标签</p>
              <p class="nfc-desc">保持靠近直至感应成功</p>
            </div>
          </div>
        </div>

        <div class="ticket-card">
          <div class="ticket-header">
            <p class="ticket-label">取餐号</p>
            <div class="ticket-number">{{ order.orderNumber }}</div>
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
                  <img
                    :src="dishImage(item)"
                    :alt="item.name"
                    class="ticket-item-img-el"
                  />
                </div>
                <div>
                  <p class="ticket-item-name">{{ item.name }}</p>
                  <p v-if="item.specs" class="ticket-item-spec">{{ item.specs }}</p>
                </div>
              </div>
              <span class="ticket-item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</span>
            </div>

            <div class="ticket-total">
              <span class="ticket-total-label">合计 {{ (order.items || []).length }} 项商品</span>
              <div class="ticket-total-right">
                <span class="ticket-total-sub">实付金额</span>
                <span class="ticket-total-price">¥{{ (order.totalPrice || 0).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="ticket-footer" :class="order.status === 'completed' ? 'footer-completed' : ''">
            <p class="ticket-thanks">{{ order.status === 'completed' ? '欢迎下次光临！' : '感谢您选择滋滋烤串！' }}</p>
            <p class="ticket-hint">{{ order.status === 'completed' ? '订单已完成' : '凭此界面到柜台取餐' }}</p>
          </div>
        </div>
      </template>

      <div class="actions-grid" v-if="orders.length">
        <button class="action-btn" @click="copyOrderNumbers">
          <span class="material-symbols-outlined action-icon">content_copy</span>
          复制单号
        </button>
        <button class="action-btn" @click="router.push('/menu')">
          <span class="material-symbols-outlined action-icon">add</span>
          继续点餐
        </button>
      </div>

      <div v-if="!filteredOrders.length" class="empty-state">
        <span class="material-symbols-outlined empty-icon">receipt_long</span>
        <p class="empty-text">暂无{{ statusLabel(tab) }}订单</p>
        <router-link to="/menu" class="empty-cta">去点餐</router-link>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const orders = ref<any[]>([])
const nfcSupported = ref(false)
const nfcScanning = ref(false)
const tab = ref('pending')

const POLL_MS = 5000
const BRANCH_ID = 'demo-branch'

const DISH_IMAGES: Record<string, string> = {
  d1000: '/src/assets/images/yrc-s1.jpg?raw=true',
  d1010: '/src/assets/images/yrc-x.webp?raw=true',
  d1011: '/src/assets/images/hlyrc.jpg?raw=true',
  d1012: '/src/assets/images/nlt.jpg?raw=true',
  d2000: '/src/assets/images/kqz.jpg?raw=true',
  d2001: '/src/assets/images/kjc.jpg?raw=true',
  d2002: '/src/assets/images/kym.jpg?raw=true',
  d3001: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7GSAZUaQBJ0CsDqMqTPIGSBmf89Mj-a5WTtmBobbk1wRfm9_SN4O8rP6vz2YG7UqlhNWWIwteIpVAID0_q4hyQVQgGTkKHgsT9n9ISGnE1SX03MWGBcVP4iV0ZxJxEd-rO_8rcJLvGMuD22RFajU3zfMGqpwUEVWvHtkVjevWOBMfVSOspDzALp1HiyFLxslXgN8SIkowTjUI5xQ0MGqhT_cq2HRqFDSGxHYtZOeV5z5UJtit1vt6q8ol22hgePir6pWDLZDqD9U',
  d3002: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=300&fit=crop',
  d3003: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=300&fit=crop',
}

function dishImage(item: any): string {
  const baseId = item.dishId?.split(/[^\w]/)[0] || ''
  return DISH_IMAGES[baseId] || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop'
}

const tabs = [
  { key: 'pending', label: '等待中' },
  { key: 'preparing', label: '制作中' },
  { key: 'ready', label: '待取餐' },
  { key: 'completed', label: '已完成' },
]

const filteredOrders = computed(() =>
  orders.value.filter((o) => o.status === tab.value)
)

function badgeCount(key: string) {
  if (key === 'pending') return orders.value.filter((o) => o.status === 'pending').length || ''
  if (key === 'ready') return orders.value.filter((o) => o.status === 'ready').length || ''
  return ''
}

function statusIcon(s: string) {
  const map: Record<string, string> = {
    pending: 'hourglass_empty',
    preparing: 'fire_truck',
    ready: 'notifications_active',
    completed: 'check_circle',
  }
  return map[s] || 'fire_truck'
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: '等待中',
    preparing: '制作中',
    ready: '待取餐',
    completed: '已取餐',
  }
  return map[s] || s
}
function statusHint(s: string) {
  const map: Record<string, string> = {
    pending: '已接单，马上开始制作',
    preparing: '请耐心等待，美味即将出炉',
    ready: '餐已就绪，请到柜台取餐',
    completed: '感谢惠顾，欢迎下次光临！',
  }
  return map[s] || ''
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleString('zh-CN')
}

function copyOrderNumbers() {
  const nums = orders.value.map(o => o.orderNumber).join('、')
  navigator.clipboard?.writeText(nums).catch(() => {})
}

async function startNfcScan() {
  if (!('NDEFReader' in window)) return
  nfcScanning.value = true
  try {
    const ndef = new (window as any).NDEFReader()
    await ndef.scan()
    ndef.addEventListener('reading', ({ message }: any) => {
      for (const record of message.records) {
        if (record.recordType === 'text') {
          const decoder = new TextDecoder(record.encoding || 'utf-8')
          const text = decoder.decode(record.data)
          if (orders.value.some(o => o.orderNumber === text)) {
            alert('✅ NFC 取餐验证成功！请到柜台取餐')
            nfcScanning.value = false
          }
        }
      }
    })
    ndef.addEventListener('readingerror', () => {
      nfcScanning.value = false
    })
  } catch {
    nfcScanning.value = false
    alert('NFC 感应失败，请重试或到柜台取餐')
  }
}

const statuses = ['pending', 'preparing', 'ready', 'completed']

async function fetchOrders() {
  try {
    const all = await Promise.all(
      statuses.map((s) =>
        fetch(`/api/orders?branchId=${BRANCH_ID}&status=${s}&limit=10`).then((r) =>
          r.json()
        )
      )
    )
    const merged = all.flat().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    orders.value = merged
  } catch {}
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  nfcSupported.value = 'NDEFReader' in window

  // 1. 从 router state 拿订单列表（从 home 页"我的取餐"跳过来）
  if (history.state?.orders) {
    orders.value = history.state.orders
    timer = setInterval(fetchOrders, POLL_MS)
    return
  }

  // 2. 从 router state 拿刚下的单（从 checkout 跳过来）
  if (history.state?.order) {
    orders.value = [history.state.order]
    timer = setInterval(fetchOrders, POLL_MS)
    return
  }

  // 3. 从 API 拉订单（页面刷新后）
  await fetchOrders()
  timer = setInterval(fetchOrders, POLL_MS)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.top-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; background: rgba(252, 249, 248, 0.8); backdrop-filter: blur(12px);
}
.top-left { display: flex; align-items: center; gap: 8px; }
.top-icon { color: var(--primary-container); font-size: 24px; }
.top-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--primary-container); text-transform: uppercase; letter-spacing: -0.02em; margin: 0; }
.close-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); }
.close-btn:active { background: var(--surface-container-high); }

main { padding: 64px 16px 40px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }

.order-section-label { width: 100%; max-width: 448px; padding: 8px 0; display: flex; align-items: center; justify-content: center; }
.section-divider { width: 40px; height: 4px; border-radius: 2px; background: var(--outline-variant); }

.status-tabs { display: flex; gap: 8px; padding: 0 0 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.tab { flex-shrink: 0; display: flex; align-items: center; gap: 4px; padding: 8px 16px; border-radius: 9999px; border: none; font-family: var(--font-display); font-size: 14px; font-weight: 600; background: var(--surface-container-high); color: var(--secondary); cursor: pointer; transition: all 0.2s; }
.tab-active { background: var(--primary-container); color: var(--on-primary); }
.tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9999px; background: var(--error); color: #fff; font-size: 11px; font-weight: 700; line-height: 1; }

.status-pending { background: var(--surface-variant); color: var(--on-surface-variant); }
.status-ready { background: var(--tertiary-container); color: #fff; box-shadow: 0 4px 12px rgba(0,110,28,0.25); }
.status-completed { background: var(--surface-container-high); color: var(--secondary); box-shadow: none; }

.status-section { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 24px; }
.status-pill { display: flex; align-items: center; gap: 8px; background: var(--primary-container); color: var(--on-primary-container); padding: 8px 24px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(255,107,0,0.2); animation: softPulse 2s infinite; }
.status-completed { animation: none; }
@keyframes softPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.85; transform: scale(0.98); } }
.status-icon { font-size: 18px; }
.status-text { font-family: var(--font-display); font-size: 14px; font-weight: 600; }
.status-hint { font-size: 14px; line-height: 20px; color: var(--secondary); margin: 0; }

.ticket-card { width: 100%; max-width: 448px; background: var(--surface-container-lowest); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.06); position: relative; }
.nfc-trigger { display: block; width: 100%; max-width: 448px; padding: 0; border: none; background: transparent; cursor: pointer; text-align: center; border-radius: 12px; overflow: hidden; }
.nfc-trigger:active { opacity: 0.8; }
.nfc-section { background: rgba(160,65,0,0.04); padding: 20px 24px; border-bottom: 1px solid var(--surface-variant); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.nfc-icon-wrap { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
.nfc-ping { position: absolute; inset: 0; border-radius: 50%; background: rgba(160,65,0,0.15); animation: nfcPing 2s infinite; }
@keyframes nfcPing { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
.nfc-circle { position: relative; z-index: 10; width: 64px; height: 64px; background: var(--primary-container); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255,107,0,0.3); }
.nfc-icon { font-size: 32px; color: white; }
.nfc-text { text-align: center; display: flex; flex-direction: column; gap: 4px; }
.nfc-status { display: flex; align-items: center; justify-content: center; gap: 6px; }
.nfc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--outline); }
.nfc-dot-active { background: var(--primary-container); animation: nfcBlink 1.5s infinite; }
@keyframes nfcBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.nfc-label { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--primary-container); }
.nfc-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
.nfc-desc { font-size: 14px; line-height: 20px; color: var(--secondary); margin: 0; }

.ticket-top-border { height: 8px; background: var(--primary-container); }
.ticket-header { position: relative; text-align: center; padding: 24px; border-bottom: 1px dashed var(--outline-variant); }
.ticket-label { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--secondary); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.08em; }
.ticket-number { font-family: var(--font-display); font-size: 64px; font-weight: 800; color: var(--primary-container); letter-spacing: -0.04em; line-height: 1; }
.ticket-hole-left, .ticket-hole-right { position: absolute; bottom: -12px; width: 24px; height: 24px; border-radius: 50%; background: var(--bg); }
.ticket-hole-left { left: -12px; }
.ticket-hole-right { right: -12px; }

.ticket-body { padding: 24px; }
.ticket-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ticket-detail-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 0; }
.ticket-time { font-size: 12px; font-weight: 600; color: var(--secondary); background: var(--surface-container); padding: 4px 8px; border-radius: 4px; letter-spacing: 0.02em; }

.ticket-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; }
.ticket-item-left { display: flex; gap: 16px; }
.ticket-item-img { width: 48px; height: 48px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--surface-container); }
.ticket-item-img-el { width: 100%; height: 100%; object-fit: cover; }
.ticket-item-name { font-family: var(--font-display); font-size: 16px; font-weight: 600; line-height: 24px; margin: 0; }
.ticket-item-spec { font-size: 12px; font-weight: 600; color: var(--secondary); margin: 2px 0 0; letter-spacing: 0.02em; }
.ticket-item-price { font-family: var(--font-display); font-size: 20px; font-weight: 800; }

.ticket-total { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--surface-variant); }
.ticket-total-label { font-size: 14px; line-height: 20px; color: var(--secondary); }
.ticket-total-right { text-align: right; }
.ticket-total-sub { display: block; font-size: 14px; font-weight: 600; color: var(--secondary); }
.ticket-total-price { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--text); line-height: 1; }

.ticket-footer { background: var(--surface-container-low); padding: 16px; text-align: center; }
.footer-completed { background: rgba(0,110,28,0.06); }
.ticket-thanks { font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--primary-container); margin: 0 0 4px; }
.ticket-hint { font-size: 12px; font-weight: 600; color: var(--secondary); margin: 0; letter-spacing: 0.02em; }

.actions-grid { width: 100%; max-width: 448px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
.action-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; border-radius: 12px; border: none; background: var(--surface-container-high); font-family: var(--font-display); font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.15s; }
.action-btn:active { transform: scale(0.95); }
.action-icon { font-size: 20px; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 0; }
.empty-icon { font-size: 64px; color: var(--outline-variant); }
.empty-text { font-size: 16px; font-weight: 600; color: var(--secondary); margin: 0; }
.empty-cta { display: flex; align-items: center; justify-content: center; padding: 12px 32px; border-radius: 9999px; background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: 16px; font-weight: 700; text-decoration: none; box-shadow: 0 8px 20px rgba(255,107,0,0.15); }
</style>
