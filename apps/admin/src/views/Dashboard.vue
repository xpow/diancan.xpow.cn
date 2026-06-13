<template>
  <div class="dashboard">
    <div class="page-header">
      <h2 class="page-title">总览</h2>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.todayOrders }}</div>
        <div class="stat-label">今日有效订单</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">¥{{ stats.todayCompletedRevenue.toFixed(2) }}</div>
        <div class="stat-label">今日完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">¥{{ stats.todayEstimatedRevenue.toFixed(2) }}</div>
        <div class="stat-label">今日预估</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalOrders }}</div>
        <div class="stat-label">总有效订单</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">¥{{ stats.completedRevenue.toFixed(2) }}</div>
        <div class="stat-label">已完成收入</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">¥{{ stats.estimatedRevenue.toFixed(2) }}</div>
        <div class="stat-label">预估收入</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.pendingOrders }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.readyOrders }}</div>
        <div class="stat-label">待取餐</div>
      </div>
    </div>

    <div class="page-header" style="margin-top:32px">
      <h2 class="page-title">最新订单</h2>
    </div>
    <DataTable :value="recentOrders" striped-rows>
      <Column field="pickupCode" header="取餐号">
        <template #body="{ data }">
          <Tag :value="data.pickupCode" severity="warn" />
        </template>
      </Column>
      <Column field="status" header="状态">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column field="totals.payableAmount" header="金额" style="text-align:right">
        <template #body="{ data }">
          ¥{{ data.totals.payableAmount?.toFixed(2) }}
        </template>
      </Column>
      <Column field="createdAt" header="时间">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleString('zh-CN') }}
        </template>
      </Column>
    </DataTable>
    <div v-if="!recentOrders.length" class="empty">暂无订单</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

const VALID_STATUSES = ['pending', 'paid', 'preparing', 'ready', 'completed']

const ESTIMATE_STATUSES = ['pending', 'paid', 'preparing', 'ready']

const stats = ref({ todayOrders: 0, todayCompletedRevenue: 0, todayEstimatedRevenue: 0, totalOrders: 0, completedRevenue: 0, estimatedRevenue: 0, pendingOrders: 0, readyOrders: 0 })
const recentOrders = ref<any[]>([])

function statusLabel(s: string) {
  const map: Record<string, string> = { pending: '待处理', paid: '待处理', preparing: '制作中', ready: '可取餐', completed: '已完成', cancelled: '已取消' }
  return map[s] || s
}
function statusSeverity(s: string) {
  const map: Record<string, string> = { pending: 'warn', paid: 'warn', preparing: 'info', ready: 'success', completed: 'contrast', cancelled: 'danger' }
  return map[s] || 'info'
}

async function fetchData() {
  const [ordersRes] = await Promise.all([
    fetch('/api/admin/orders?limit=5'),
  ])
  const orders = (await ordersRes.json()).items ?? []

  recentOrders.value = orders

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const allRes = await fetch('/api/admin/orders?limit=200')
  const allOrders = (allRes.ok ? (await allRes.json()).items ?? [] : [])
  const valid = allOrders.filter((o: any) => VALID_STATUSES.includes(o.status))
  const completed = valid.filter((o: any) => o.status === 'completed')
  const estimated = valid.filter((o: any) => ESTIMATE_STATUSES.includes(o.status))
  const todayValid = valid.filter((o: any) => new Date(o.createdAt) >= today)
  const todayCompleted = todayValid.filter((o: any) => o.status === 'completed')
  const todayEstimated = todayValid.filter((o: any) => ESTIMATE_STATUSES.includes(o.status))

  stats.value = {
    totalOrders: valid.length,
    completedRevenue: completed.reduce((s: number, o: any) => s + (o.totals?.payableAmount ?? 0), 0),
    estimatedRevenue: estimated.reduce((s: number, o: any) => s + (o.totals?.payableAmount ?? 0), 0),
    todayOrders: todayValid.length,
    todayCompletedRevenue: todayCompleted.reduce((s: number, o: any) => s + (o.totals?.payableAmount ?? 0), 0),
    todayEstimatedRevenue: todayEstimated.reduce((s: number, o: any) => s + (o.totals?.payableAmount ?? 0), 0),
    pendingOrders: allOrders.filter((o: any) => o.status === 'pending' || o.status === 'paid').length,
    readyOrders: allOrders.filter((o: any) => o.status === 'ready').length,
  }
}

onMounted(fetchData)
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.stat-value { font-size: 28px; font-weight: 800; color: var(--p-primary-color, #FF6B00); }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.empty { text-align: center; padding: 40px; color: var(--text-color-secondary); }
</style>
