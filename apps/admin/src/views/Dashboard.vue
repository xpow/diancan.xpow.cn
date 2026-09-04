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

    <div class="quick-bar">
      <router-link to="/orders?status=pending" class="quick-btn-link">
        <span class="material-symbols-outlined">pending</span>
        待处理 <b>{{ stats.pendingOrders }}</b>
      </router-link>
      <router-link to="/orders?status=ready" class="quick-btn-link">
        <span class="material-symbols-outlined">takeout_dining</span>
        待取餐 <b>{{ stats.readyOrders }}</b>
      </router-link>
      <router-link to="/stats" class="quick-btn-link">
        <span class="material-symbols-outlined">analytics</span>
        销量统计
      </router-link>
      <router-link to="/menu" class="quick-btn-link">
        <span class="material-symbols-outlined">restaurant_menu</span>
        菜单管理
      </router-link>
      <router-link to="/orders" class="quick-btn-link">
        <span class="material-symbols-outlined">receipt_long</span>
        全部订单
      </router-link>
    </div>

    <div class="orders-grid" v-if="recentOrders.length">
      <OrderCard
        v-for="order in recentOrders"
        :key="order.id"
        :order="order"
        compact
        @action="updateStatus"
        @cancel="openCancelDialog"
      />
    </div>
    <p v-else class="empty">暂无订单</p>

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
import OrderCard from '../components/OrderCard.vue'

const stats = ref({ todayOrders: 0, todayCompletedRevenue: 0, todayEstimatedRevenue: 0, totalOrders: 0, completedRevenue: 0, estimatedRevenue: 0, pendingOrders: 0, readyOrders: 0, unpaidOrders: 0 })
const recentOrders = ref<any[]>([])
const showCancel = ref(false)
const cancelOrderId = ref('')
const selectedReason = ref('')
const cancelReasons = ['等待时间过长，客户不要了', '客户有事不要了', '测试订单', '菜品不足，无法出餐', '菜单下错了，重新下单']

const avgOrder = computed(() => {
  if (!stats.value.todayOrders) return '0.00'
  return (stats.value.todayEstimatedRevenue / stats.value.todayOrders).toFixed(2)
})

async function fetchData() {
  // 总览页订单只显示进行中的（active：unpaid/paid/preparing/ready），与前端取餐页一致
  const ordersRes = await fetch('/api/admin/orders?scope=active&limit=15')
  const orders = (await ordersRes.json()).items ?? []
  // 同合并订单仅保留一个代表，避免重复显示（与取餐页一致）
  const seenGroup = new Set<string>()
  recentOrders.value = orders
    .filter((o: any) => {
      if (!o.groupId) return true
      if (seenGroup.has(o.groupId)) return false
      seenGroup.add(o.groupId)
      return true
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
  align-items: flex-start;
  margin-bottom: 24px;
}
.page-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--on-surface);
}
.page-subtitle {
  margin: 4px 0 0;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--on-surface-variant);
}

/* ===== Metric Cards ===== */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.metric-card {
  background: var(--surface);
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: box-shadow 0.15s, transform 0.15s;
  height: 100%;
  box-sizing: border-box;
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
.mi-pending{ background: var(--primary-soft); }
.metric-body { flex: 1; min-width: 0; }
.metric-label {
  display: block;
  font-size: 12px;
  color: var(--text-disabled);
  margin-bottom: 2px;
  font-family: var(--font-body);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.metric-value {
  display: block;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  color: var(--on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Quick Bar ===== */
.quick-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.quick-btn-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--on-surface);
  text-decoration: none;
  transition: all 0.15s;
  font-family: var(--font-display);
}
.quick-btn-link:hover { border-color: #ff6b00; color: #ff6b00; }
.quick-btn-link b { color: #ff6b00; margin-left: 2px; }
.quick-btn-link .material-symbols-outlined { font-size: 18px; color: var(--text-secondary); }
.quick-btn-link:hover .material-symbols-outlined { color: #ff6b00; }

/* ===== Orders Grid ===== */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

/* ===== Misc ===== */
.empty { text-align: center; padding: 40px; color: var(--text-disabled); font-size: 14px; }

@media (max-width: 768px) {
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .orders-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 12px; align-items: flex-start; }
}
</style>

<style>
.cancel-hint { margin: 0 0 12px; font-size: 14px; color: var(--text-secondary); }
.cancel-options { display: flex; flex-direction: column; gap: 8px; }
.cancel-option { padding: 10px 14px; border: 1px solid var(--border); border-radius: 12px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
.cancel-option:hover { border-color: #ff6b00; }
.cancel-option.selected { border-color: #ff6b00; background: #fff3e8; font-weight: 600; }
</style>
