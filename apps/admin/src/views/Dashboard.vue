<template>
  <div class="dashboard">
    <div class="page-header">
      <div>
        <h2 class="page-title">总览</h2>
        <p class="page-subtitle">今日经营数据</p>
      </div>
      <Button label="数据库备份" icon="pi pi-download" severity="secondary" @click="downloadBackup" />
    </div>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-icon mi-sales">💰</div>
        <div class="metric-body">
          <span class="metric-label">总营收（今日）</span>
          <span class="metric-value">¥{{ stats.todayEstimatedRevenue.toFixed(2) }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon mi-orders">📋</div>
        <div class="metric-body">
          <span class="metric-label">今日订单</span>
          <span class="metric-value">{{ stats.todayOrders }}</span>
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-icon mi-avg">🧾</div>
        <div class="metric-body">
          <span class="metric-label">客单价</span>
          <span class="metric-value">¥{{ avgOrder }}</span>
        </div>
      </div>
      <router-link to="/orders?status=pending" class="metric-card metric-card--link">
        <div class="metric-icon mi-pending">⏳</div>
        <div class="metric-body">
          <span class="metric-label">待处理</span>
          <span class="metric-value">{{ stats.pendingOrders }}</span>
        </div>
      </router-link>
    </div>

    <div class="bento-grid">
      <div class="bento-main">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">最新订单</h3>
            <router-link to="/orders" class="card-link">查看全部</router-link>
          </div>
          <div class="table-wrap">
            <table class="order-table" v-if="recentOrders.length">
              <thead>
                <tr>
                  <th>取餐号</th>
                  <th>订单号</th>
                  <th>支付</th>
                  <th>状态</th>
                  <th style="text-align:right">金额</th>
                  <th>商品</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in recentOrders" :key="order.id">
                  <td><span class="pickup-badge">{{ order.pickupCode }}</span></td>
                  <td class="order-no">{{ order.orderNo }}</td>
                  <td>{{ payLabel(order.paymentMethod) }}</td>
                  <td>
                    <span :class="['status-chip', 'status-' + order.status]">{{ statusLabel(order.status) }}</span>
                  </td>
                  <td class="col-revenue">¥{{ order.totals.payableAmount?.toFixed(2) }}</td>
                  <td class="col-items">
                    <div v-for="item in order.items" :key="item.id" class="item-line">
                      <span class="item-name">{{ item.name }}</span>
                      <span class="item-qty">x{{ item.quantity }}</span>
                      <span v-if="item.promotionLabel" class="item-promo">{{ item.promotionLabel }}</span>
                    </div>
                  </td>
                  <td class="col-time">{{ formatTime(order.createdAt) }}</td>
                  <td>
                    <div class="action-group">
                      <button
                        v-if="order.status === 'unpaid' || order.status === 'pending' || order.status === 'paid'"
                        class="btn-action btn-primary"
                        @click="updateStatus(order.id, 'preparing')"
                      >开始制作</button>
                      <button
                        v-if="order.status === 'unpaid' || order.status === 'pending' || order.status === 'paid' || order.status === 'preparing'"
                        class="btn-action btn-danger"
                        @click="openCancelDialog(order.id)"
                      >取消</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="empty">暂无订单</p>
          </div>
        </div>
      </div>

      <div class="bento-side">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">分类销售</h3>
            <span class="card-subtitle">今日占比</span>
          </div>
          <div class="cat-chart" v-if="categoryData.length">
            <div v-for="(cat, i) in categoryData" :key="cat.name" class="cat-row">
              <div class="cat-info">
                <span class="cat-color" :style="{ background: COLORS[i % COLORS.length] }"></span>
                <span class="cat-name">{{ cat.name }}</span>
                <span class="cat-pct">{{ cat.percent }}%</span>
              </div>
              <div class="cat-bar-bg">
                <div class="cat-bar" :style="{ width: cat.percent + '%', background: COLORS[i % COLORS.length] }"></div>
              </div>
            </div>
          </div>
          <p v-else class="empty-sm">暂无数据</p>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">快速入口</h3>
          </div>
          <div class="quick-links">
            <router-link to="/orders?status=pending" class="quick-link">
              <span class="ql-icon">⏳</span>
              <span class="ql-text">待处理 <b>{{ stats.pendingOrders }}</b></span>
            </router-link>
            <router-link to="/orders?status=ready" class="quick-link">
              <span class="ql-icon">📦</span>
              <span class="ql-text">待取餐 <b>{{ stats.readyOrders }}</b></span>
            </router-link>
            <router-link to="/stats?range=all" class="quick-link">
              <span class="ql-icon">📈</span>
              <span class="ql-text">销量统计</span>
            </router-link>
            <router-link to="/menu" class="quick-link">
              <span class="ql-icon">🍽️</span>
              <span class="ql-text">菜单管理</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showCancel" header="取消订单" style="width:400px">
      <p class="cancel-hint">请选择取消原因：</p>
      <div class="cancel-options">
        <div
          v-for="reason in cancelReasons"
          :key="reason"
          :class="['cancel-option', selectedReason === reason && 'selected']"
          @click="selectedReason = reason"
        >{{ reason }}</div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showCancel = false" />
        <Button label="确认取消" severity="danger" :disabled="!selectedReason" @click="confirmCancel" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'

const COLORS = ['#ff6b00', '#4aad4e', '#3b82f6', '#a04100', '#8b5cf6', '#f59e0b']

const stats = ref({ todayOrders: 0, todayCompletedRevenue: 0, todayEstimatedRevenue: 0, totalOrders: 0, completedRevenue: 0, estimatedRevenue: 0, pendingOrders: 0, readyOrders: 0, unpaidOrders: 0 })
const recentOrders = ref<any[]>([])
const categoryData = ref<{ name: string; revenue: number; count: number; percent: number }[]>([])
const showCancel = ref(false)
const cancelOrderId = ref('')
const selectedReason = ref('')
const cancelReasons = ['等待时间过长，客户不要了', '客户有事不要了', '测试订单', '菜品不足，无法出餐', '菜单下错了，重新下单']

const avgOrder = computed(() => {
  if (!stats.value.todayOrders) return '0.00'
  return (stats.value.todayEstimatedRevenue / stats.value.todayOrders).toFixed(2)
})

const payLabels: Record<string, string> = { wechat: '微信', alipay: '支付宝', cash: '现金' }
function payLabel(m: string): string { return payLabels[m] || m }
function statusLabel(s: string) {
  const map: Record<string, string> = { unpaid: '未付款', pending: '待处理', paid: '已付款', preparing: '制作中', ready: '可取餐', completed: '已完成', cancelled: '已取消' }
  return map[s] || s
}
function formatTime(t: string) {
  const d = new Date(t)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

async function fetchData() {
  const [pendingRes, paidRes, unpaidRes] = await Promise.all([
    fetch('/api/admin/orders?status=pending&limit=20'),
    fetch('/api/admin/orders?status=paid&limit=20'),
    fetch('/api/admin/orders?status=unpaid&limit=20'),
  ])
  const pendingOrders = (await pendingRes.json()).items ?? []
  const paidOrders = (await paidRes.json()).items ?? []
  const unpaidOrders = (await unpaidRes.json()).items ?? []

  recentOrders.value = [...pendingOrders, ...paidOrders, ...unpaidOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15)

  const overviewRes = await fetch('/api/admin/stats/overview')
  if (overviewRes.ok) {
    const s = await overviewRes.json()
    stats.value = {
      todayOrders: s.todayOrders ?? 0,
      todayCompletedRevenue: s.todayCompletedRevenue ?? 0,
      todayEstimatedRevenue: s.todayEstimatedRevenue ?? 0,
      totalOrders: s.totalOrders ?? 0,
      completedRevenue: s.completedRevenue ?? 0,
      estimatedRevenue: s.estimatedRevenue ?? 0,
      pendingOrders: s.pendingOrders ?? 0,
      readyOrders: s.readyOrders ?? 0,
      unpaidOrders: s.unpaidOrders ?? 0,
    }
  }

  // 分类数据
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
  try {
    const catRes = await fetch(`/api/admin/stats/overview-analysis?startDate=${todayStart}&endDate=${todayEnd}`)
    if (catRes.ok) {
      const catData = await catRes.json()
      categoryData.value = catData.categoryShare ?? []
    }
  } catch {}
}

async function updateStatus(id: string, status: string, cancelReason?: string) {
  await fetch(`/api/admin/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, cancelReason }),
  })
  await fetchData()
}

function openCancelDialog(id: string) {
  cancelOrderId.value = id
  selectedReason.value = ''
  showCancel.value = true
}

async function confirmCancel() {
  if (!selectedReason.value) return
  await updateStatus(cancelOrderId.value, 'cancelled', selectedReason.value)
  showCancel.value = false
}

async function downloadBackup() {
  const res = await fetch('/api/admin/backup.sql')
  if (!res.ok) return
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'diancan-backup.sql'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(fetchData)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
}
.page-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: #999;
}

/* ===== Metric Cards ===== */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.metric-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #e5e2e1;
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: box-shadow 0.15s, transform 0.15s;
}
.metric-card--link:hover {
  box-shadow: 0 3px 12px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}
.metric-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.mi-sales  { background: rgba(74,173,78,0.1); }
.mi-orders { background: rgba(59,130,246,0.1); }
.mi-avg    { background: rgba(139,92,246,0.1); }
.mi-pending{ background: rgba(255,107,0,0.1); }
.metric-body { flex: 1; min-width: 0; }
.metric-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
  font-family: 'Inter', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.metric-value {
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Bento Grid ===== */
.bento-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}
.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #e5e2e1;
  overflow: hidden;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f6f3f2;
  border-bottom: 1px solid #e5e2e1;
}
.card-title {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}
.card-subtitle {
  font-size: 12px;
  color: #999;
}
.card-link {
  font-size: 13px;
  color: #ff6b00;
  text-decoration: none;
  font-weight: 600;
}
.card-link:hover { text-decoration: underline; }

/* ===== Order Table ===== */
.table-wrap { overflow-x: auto; }
.order-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.order-table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: #f6f3f2;
  border-bottom: 1px solid #e5e2e1;
  white-space: nowrap;
}
.order-table td {
  padding: 10px 16px;
  border-bottom: 1px solid #f0eded;
  vertical-align: middle;
}
.order-table tbody tr:hover { background: #fdf8f5; }
.pickup-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  background: #fff3e8;
  color: #a04100;
  font-weight: 700;
  font-size: 13px;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.order-no {
  font-size: 12px;
  color: #999;
  font-family: 'Inter', sans-serif;
}
.status-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
}
.status-unpaid    { background: rgba(186,26,26,0.1); color: #ba1a1a; }
.status-pending   { background: rgba(255,107,0,0.1); color: #a04100; }
.status-paid      { background: rgba(59,130,246,0.1); color: #3b82f6; }
.status-preparing { background: rgba(255,107,0,0.15); color: #a04100; }
.status-ready     { background: rgba(74,173,78,0.1); color: #4aad4e; }
.status-completed { background: #e5e2e1; color: #666; }
.status-cancelled { background: rgba(186,26,26,0.08); color: #999; }
.col-revenue {
  text-align: right;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #1a1a1a;
}
.col-items { max-width: 200px; }
.col-time { white-space: nowrap; color: #999; font-size: 12px; }
.item-line {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-name { font-weight: 500; }
.item-qty { color: #999; }
.item-promo {
  background: #fff3e8;
  color: #a04100;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}
.action-group { display: flex; gap: 6px; }
.btn-action {
  padding: 4px 12px;
  border-radius: 20px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
}
.btn-primary { background: #ff6b00; color: #fff; }
.btn-primary:hover { background: #e55f00; }
.btn-danger { background: transparent; color: #ba1a1a; border: 1px solid #ba1a1a; }
.btn-danger:hover { background: rgba(186,26,26,0.08); }

/* ===== Category Chart ===== */
.bento-side { display: flex; flex-direction: column; gap: 16px; }
.bento-side .card { flex: 1; }
.cat-chart { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.cat-row { display: flex; flex-direction: column; gap: 4px; }
.cat-info { display: flex; align-items: center; gap: 8px; }
.cat-color { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.cat-name { font-size: 13px; font-weight: 500; color: #1a1a1a; flex: 1; }
.cat-pct { font-size: 12px; color: #999; font-family: 'Inter', sans-serif; }
.cat-bar-bg { height: 6px; background: #f0ebe5; border-radius: 3px; overflow: hidden; }
.cat-bar { height: 100%; border-radius: 3px; transition: width 0.3s ease; }

/* ===== Quick Links ===== */
.quick-links { padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
.quick-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: #1a1a1a;
  transition: background 0.15s;
  font-size: 14px;
}
.quick-link:hover { background: #f6f3f2; }
.ql-icon { font-size: 18px; }
.ql-text { flex: 1; }
.ql-text b { color: #ff6b00; margin-left: 4px; }

/* ===== Misc ===== */
.empty { text-align: center; padding: 40px; color: #999; font-size: 14px; }
.empty-sm { text-align: center; padding: 24px; color: #bbb; font-size: 13px; }

@media (max-width: 768px) {
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .bento-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 12px; align-items: flex-start; }
}
</style>

<style>
.cancel-hint { margin: 0 0 12px; font-size: 14px; color: #666; }
.cancel-options { display: flex; flex-direction: column; gap: 8px; }
.cancel-option { padding: 10px 14px; border: 1px solid #e5e2e1; border-radius: 12px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
.cancel-option:hover { border-color: #ff6b00; }
.cancel-option.selected { border-color: #ff6b00; background: #fff3e8; font-weight: 600; }
</style>
