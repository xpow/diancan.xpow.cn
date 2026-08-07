<template>
  <div class="orders-page">
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
      <div class="header-actions">
        <SelectButton v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" @change="onStatusChange" />
      </div>
    </div>

    <DataTable :value="orders" striped-rows class="p-mt-3">
      <Column field="pickupCode" header="取餐号" style="width:80px">
        <template #body="{ data }">
          <Tag :value="data.pickupCode" severity="warn" style="font-size:16px;font-weight:800;padding:4px 12px" />
        </template>
      </Column>
      <Column field="orderNo" header="订单号" />
      <Column field="createdAt" header="下单时间">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleString('zh-CN') }}
        </template>
      </Column>
      <Column field="orderType" header="类型" style="width:80px">
        <template #body="{ data }">
          <Tag :value="data.orderType === 'dine-in' ? '堂食' : '自取'" :severity="data.orderType === 'dine-in' ? 'info' : 'contrast'" />
        </template>
      </Column>
      <Column field="paymentMethod" header="支付方式" style="width:90px">
        <template #body="{ data }">
          <span v-if="data.paymentMethod">{{ payLabel(data.paymentMethod) }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </Column>
      <Column field="totals.payableAmount" header="实付" style="width:100px">
        <template #body="{ data }">
          <span style="font-weight:700">¥{{ data.totals.payableAmount?.toFixed(2) }}</span>
        </template>
      </Column>
      <Column field="fullReduction" header="满减" style="width:90px">
        <template #body="{ data }">
          <span v-if="data.fullReduction > 0" class="fr-amount">-¥{{ data.fullReduction.toFixed(2) }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </Column>
      <Column header="商品" style="min-width:200px">
        <template #body="{ data }">
          <div v-for="item in data.items" :key="item.id" class="order-item-line">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-qty">x{{ item.quantity }}</span>
            <span v-if="item.specs" class="item-spec">{{ item.specs }}</span>
            <span v-if="item.promotionLabel" class="item-promo">{{ item.promotionLabel }}</span>
          </div>
        </template>
      </Column>
      <Column field="status" header="状态" style="width:140px">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
          <Tag v-if="data.status !== 'unpaid' && !data.paidAt" value="未付款" severity="danger" style="margin-left:4px" />
          <div v-if="data.cancelReason" class="cancel-reason">{{ data.cancelReason }}</div>
          <div v-if="data.cancelledAt" class="cancel-reason">{{ new Date(data.cancelledAt).toLocaleString('zh-CN') }}</div>
        </template>
      </Column>
      <Column header="操作" style="width:180px">
        <template #body="{ data }">
          <Button v-if="data.status === 'unpaid' || data.status === 'pending' || data.status === 'paid'" label="开始制作" icon="pi pi-play" size="small" @click="updateStatus(data.id, 'preparing')" />
          <Button v-if="data.status === 'preparing'" label="完成" icon="pi pi-check" size="small" severity="success" @click="updateStatus(data.id, 'ready')" />
          <Button v-if="data.status === 'ready'" label="已取餐" icon="pi pi-check-circle" size="small" severity="info" @click="updateStatus(data.id, 'completed')" />
          <Button v-if="data.status === 'unpaid' || data.status === 'pending' || data.status === 'paid' || data.status === 'preparing'" label="取消" icon="pi pi-times" size="small" severity="danger" text @click="openCancelDialog(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Paginator :rows="pageSize" :totalRecords="total" :first="(page - 1) * pageSize" @page="onPage" />

    <Dialog v-model:visible="showCancel" header="取消订单" style="width:400px">
      <p class="cancel-hint">请选择取消原因：</p>
      <div class="cancel-options">
        <div
          v-for="reason in cancelReasons" :key="reason"
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

    <div v-if="!orders.length" class="empty">
      暂无订单
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import SelectButton from 'primevue/selectbutton'
import Dialog from 'primevue/dialog'
import Paginator from 'primevue/paginator'

interface OrderItem {
  id: string
  name: string
  quantity: number
  finalUnitPrice: number
  finalSubtotal: number
  specs: string | null
  promotionLabel: string | null
}

interface Order {
  id: string
  orderNo: string
  pickupCode: string
  status: string
  orderType: string
  paymentMethod?: string
  totals: { originalAmount: number; discountAmount: number; payableAmount: number }
  fullReduction?: number
  items: OrderItem[]
  createdAt: string
  cancelReason?: string
  cancelledAt?: string
}

const payLabels: Record<string, string> = { wechat: '微信', alipay: '支付宝', cash: '现金' }
function payLabel(m: string): string { return payLabels[m] || m }

const orders = ref<Order[]>([])
const statusFilter = ref<string>(new URLSearchParams(location.search).get('status') || 'all')
// 每页最多 30 条
const pageSize = 30
const page = ref(1)
const total = ref(0)
const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待处理', value: 'pending' },
  { label: '制作中', value: 'preparing' },
  { label: '可取餐', value: 'ready' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

function statusLabel(s: string): string {
  const map: Record<string, string> = { unpaid: '未付款', pending: '待处理', paid: '待处理', preparing: '制作中', ready: '可取餐', completed: '已完成', cancelled: '已取消' }
  return map[s] || s
}

function statusSeverity(s: string): string {
  const map: Record<string, string> = { unpaid: 'danger', pending: 'warn', paid: 'warn', preparing: 'info', ready: 'success', completed: 'contrast', cancelled: 'danger' }
  return map[s] || 'info'
}

function onStatusChange() {
  page.value = 1
  fetchOrders()
}

function onPage(ev: { page?: number }) {
  page.value = (ev.page ?? 0) + 1
  fetchOrders()
}

async function fetchOrders() {
  const params = new URLSearchParams()
  if (statusFilter.value === 'pending') {
    // 待处理 = 未制作（pending + paid），后端已支持逗号分隔状态
    params.set('status', 'pending,paid')
  } else if (statusFilter.value && statusFilter.value !== 'all') {
    params.set('status', statusFilter.value)
  }
  params.set('page', String(page.value))
  params.set('limit', String(pageSize))
  const res = await fetch(`/api/admin/orders?${params}`)
  const data = await res.json()
  orders.value = data.items ?? []
  total.value = data.total ?? 0
}

async function updateStatus(id: string, status: string, cancelReason?: string) {
  await fetch(`/api/admin/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, cancelReason }),
  })
  await fetchOrders()
}

onMounted(fetchOrders)

const showCancel = ref(false)
const cancelOrderId = ref('')
const selectedReason = ref('')
const cancelReasons = ['等待时间过长，客户不要了', '客户有事不要了', '测试订单', '菜品不足，无法出餐', '菜单下错了，重新下单']

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
</script>

<style scoped>
.orders-page { }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 700; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.order-item-line { display: flex; align-items: center; gap: 4px; padding: 2px 0; white-space: nowrap; }
.item-name { font-weight: 600; }
.item-meta { color: var(--text-color-secondary); font-size: 13px; }
.item-spec { color: var(--text-color-secondary); font-size: 12px; margin-left: 4px; }
.item-promo { background: #fff3e0; color: #e65100; font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.fr-amount { font-weight: 700; color: #e53935; }
.text-muted { color: var(--text-color-secondary); }
.empty { text-align: center; padding: 40px; color: var(--text-color-secondary); }
.cancel-reason { font-size: 11px; color: var(--text-color-secondary); margin-top: 2px; }
</style>

<style>
.cancel-hint { margin: 0 0 12px; font-size: 14px; color: var(--text-color-secondary); }
.cancel-options { display: flex; flex-direction: column; gap: 8px; }
.cancel-option { padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.15s; }
.cancel-option:hover { border-color: var(--p-primary-color, #FF6B00); }
.cancel-option.selected { border-color: var(--p-primary-color, #FF6B00); background: #fff3e8; font-weight: 600; }
</style>
