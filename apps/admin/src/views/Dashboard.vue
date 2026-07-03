<template>
  <div class="dashboard">
    <div class="page-header">
      <h2 class="page-title">总览</h2>
      <Button label="数据库备份" icon="pi pi-download" severity="secondary" @click="downloadBackup" />
    </div>

    <div class="stats-grid">
      <router-link to="/orders" class="stat-card">
        <div class="stat-value">{{ stats.todayOrders }}</div>
        <div class="stat-label">今日有效订单</div>
      </router-link>
      <div class="stat-card">
        <div class="stat-value">¥{{ stats.todayCompletedRevenue.toFixed(2) }}</div>
        <div class="stat-label">今日完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">¥{{ stats.todayEstimatedRevenue.toFixed(2) }}</div>
        <div class="stat-label">今日预估</div>
      </div>
      <router-link to="/orders" class="stat-card">
        <div class="stat-value">{{ stats.totalOrders }}</div>
        <div class="stat-label">总有效订单</div>
      </router-link>
      <router-link to="/stats" class="stat-card">
        <div class="stat-value">¥{{ stats.completedRevenue.toFixed(2) }}</div>
        <div class="stat-label">已完成收入</div>
      </router-link>
      <div class="stat-card">
        <div class="stat-value">¥{{ stats.estimatedRevenue.toFixed(2) }}</div>
        <div class="stat-label">预估收入</div>
      </div>
      <router-link to="/orders?status=pending" class="stat-card">
        <div class="stat-value">{{ stats.pendingOrders }}</div>
        <div class="stat-label">待处理</div>
      </router-link>
      <router-link to="/orders?status=ready" class="stat-card">
        <div class="stat-value">{{ stats.readyOrders }}</div>
        <div class="stat-label">待取餐</div>
      </router-link>
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
      <Column field="orderNo" header="订单号" />
      <Column field="paymentMethod" header="支付方式" style="width:70px">
        <template #body="{ data }">
          <span v-if="data.paymentMethod">{{ payLabel(data.paymentMethod) }}</span>
        </template>
      </Column>
      <Column field="status" header="状态">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
          <Tag v-if="data.status !== 'unpaid' && !data.paidAt" value="未付款" severity="danger" style="margin-left:4px" />
        </template>
      </Column>
      <Column field="totals.payableAmount" header="金额" style="text-align:right">
        <template #body="{ data }">
          ¥{{ data.totals.payableAmount?.toFixed(2) }}
        </template>
      </Column>
      <Column header="商品" style="min-width:220px">
        <template #body="{ data }">
          <div v-for="item in data.items" :key="item.id" class="order-item-line">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-qty">x{{ item.quantity }}</span>
            <span v-if="item.specs" class="item-spec">{{ item.specs }}</span>
            <span v-if="item.promotionLabel" class="item-promo">{{ item.promotionLabel }}</span>
          </div>
        </template>
      </Column>
      <Column field="createdAt" header="时间">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleString('zh-CN') }}
        </template>
      </Column>
      <Column header="操作" style="width:180px">
        <template #body="{ data }">
          <div class="action-group">
<Button
  v-if="data.status === 'unpaid' || data.status === 'pending' || data.status === 'paid'"
  label="开始制作"
  icon="pi pi-play"
  size="small"
  @click="updateStatus(data.id, 'preparing')"
/>
            <Button
              v-if="data.status === 'unpaid' || data.status === 'pending' || data.status === 'paid' || data.status === 'preparing'"
              label="取消"
              icon="pi pi-times"
              size="small"
              severity="danger"
              text
              @click="openCancelDialog(data.id)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
    <Dialog v-model:visible="showCancel" header="取消订单" style="width:400px">
      <p class="cancel-hint">请选择取消原因：</p>
      <div class="cancel-options">
        <div
          v-for="reason in cancelReasons"
          :key="reason"
          :class="['cancel-option', selectedReason === reason && 'selected']"
          @click="selectedReason = reason"
        >
          {{ reason }}
        </div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showCancel = false" />
        <Button label="确认取消" severity="danger" :disabled="!selectedReason" @click="confirmCancel" />
      </template>
    </Dialog>
    <div v-if="!recentOrders.length" class="empty">暂无订单</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'

const VALID_STATUSES = ['pending', 'paid', 'preparing', 'ready', 'completed']

const ESTIMATE_STATUSES = ['pending', 'paid', 'preparing', 'ready']

const stats = ref({ todayOrders: 0, todayCompletedRevenue: 0, todayEstimatedRevenue: 0, totalOrders: 0, completedRevenue: 0, estimatedRevenue: 0, pendingOrders: 0, readyOrders: 0 })
const recentOrders = ref<any[]>([])
const showCancel = ref(false)
const cancelOrderId = ref('')
const selectedReason = ref('')
const cancelReasons = ['等待时间过长，客户不要了', '客户有事不要了', '测试订单', '菜品不足，无法出餐', '菜单下错了，重新下单']

const payLabels: Record<string, string> = { wechat: '微信', alipay: '支付宝', cash: '现金' }
function payLabel(m: string): string { return payLabels[m] || m }
function statusLabel(s: string) {
  const map: Record<string, string> = { unpaid: '未付款', pending: '待处理', paid: '待处理', preparing: '制作中', ready: '可取餐', completed: '已完成', cancelled: '已取消' }
  return map[s] || s
}
function statusSeverity(s: string) {
  const map: Record<string, string> = { unpaid: 'danger', pending: 'warn', paid: 'warn', preparing: 'info', ready: 'success', completed: 'contrast', cancelled: 'danger' }
  return map[s] || 'info'
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
    .slice(0, 20)

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
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { display: block; background: #fff; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-decoration: none; transition: box-shadow 0.2s, transform 0.2s; }
.stat-card:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.12); transform: translateY(-2px); cursor: pointer; }
.stat-value { font-size: 28px; font-weight: 800; color: var(--p-primary-color, #FF6B00); }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.order-item-line { display: flex; align-items: center; gap: 4px; padding: 2px 0; white-space: nowrap; }
.item-name { font-weight: 600; }
.item-qty { color: #666; }
.item-spec { color: var(--text-color-secondary); font-size: 12px; margin-left: 4px; }
.item-promo { background: #fff3e0; color: #e65100; font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.action-group { display: flex; gap: 8px; flex-wrap: wrap; }
.empty { text-align: center; padding: 40px; color: var(--text-color-secondary); }
</style>

<style>
.cancel-hint { margin: 0 0 12px; font-size: 14px; color: var(--text-color-secondary); }
.cancel-options { display: flex; flex-direction: column; gap: 8px; }
.cancel-option { padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
.cancel-option:hover { border-color: var(--p-primary-color, #FF6B00); }
.cancel-option.selected { border-color: var(--p-primary-color, #FF6B00); background: #fff3e8; font-weight: 600; }
</style>
