<template>
  <div class="orders-page">
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
      <div class="header-actions">
        <SelectButton v-model="statusFilter" :options="statusOptions" optionLabel="label" optionValue="value" @change="fetchOrders" />
      </div>
    </div>

    <DataTable :value="orders" striped-rows class="p-mt-3">
      <Column field="orderNumber" header="取餐号" style="width:80px">
        <template #body="{ data }">
          <Tag :value="data.orderNumber" severity="warn" style="font-size:16px;font-weight:800;padding:4px 12px" />
        </template>
      </Column>
      <Column field="createdAt" header="下单时间">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleString('zh-CN') }}
        </template>
      </Column>
      <Column field="orderType" header="类型" style="width:80px">
        <template #body="{ data }">
          <Tag :value="data.orderType === 'dine_in' ? '堂食' : '自提'" :severity="data.orderType === 'dine_in' ? 'info' : 'contrast'" />
        </template>
      </Column>
      <Column field="totalPrice" header="金额" style="width:100px">
        <template #body="{ data }">
          <span style="font-weight:700">¥{{ data.totalPrice.toFixed(2) }}</span>
        </template>
      </Column>
      <Column header="商品" style="min-width:200px">
        <template #body="{ data }">
          <div v-for="item in data.items" :key="item.id" class="order-item-line">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-meta">x{{ item.quantity }}</span>
            <span v-if="item.specs" class="item-spec">{{ item.specs }}</span>
          </div>
        </template>
      </Column>
      <Column field="status" header="状态" style="width:100px">
        <template #body="{ data }">
          <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
        </template>
      </Column>
      <Column header="操作" style="width:160px">
        <template #body="{ data }">
          <Button v-if="data.status === 'pending'" label="开始制作" icon="pi pi-play" size="small" @click="updateStatus(data.id, 'preparing')" />
          <Button v-if="data.status === 'preparing'" label="完成" icon="pi pi-check" size="small" severity="success" @click="updateStatus(data.id, 'ready')" />
          <Button v-if="data.status === 'ready'" label="已取餐" icon="pi pi-check-circle" size="small" severity="info" @click="updateStatus(data.id, 'completed')" />
          <Button v-if="data.status === 'pending'" label="取消" icon="pi pi-times" size="small" severity="danger" text @click="updateStatus(data.id, 'cancelled')" />
        </template>
      </Column>
    </DataTable>

    <div v-if="!orders.length" class="empty">
      暂无订单
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  specs: string | null
}

interface Order {
  id: string
  orderNumber: string
  orderType: string
  totalPrice: number
  status: string
  createdAt: string
  items: OrderItem[]
}

const orders = ref<Order[]>([])
const statusFilter = ref<string>('')
const statusOptions = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '制作中', value: 'preparing' },
  { label: '可取餐', value: 'ready' },
  { label: '已完成', value: 'completed' },
]

function statusLabel(s: string): string {
  const map: Record<string, string> = { pending: '待处理', preparing: '制作中', ready: '可取餐', completed: '已完成', cancelled: '已取消' }
  return map[s] || s
}

function statusSeverity(s: string): string {
  const map: Record<string, string> = { pending: 'warn', preparing: 'info', ready: 'success', completed: 'contrast', cancelled: 'danger' }
  return map[s] || 'info'
}

async function fetchOrders() {
  const url = statusFilter.value ? `/api/orders?status=${statusFilter.value}` : '/api/orders'
  const res = await fetch(url)
  orders.value = await res.json()
}

async function updateStatus(id: string, status: string) {
  await fetch(`/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  await fetchOrders()
}

onMounted(fetchOrders)
</script>

<style scoped>
.orders-page { }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 700; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.order-item-line { display: flex; align-items: center; gap: 4px; padding: 2px 0; }
.item-name { font-weight: 600; }
.item-meta { color: var(--text-color-secondary); font-size: 13px; }
.item-spec { color: var(--text-color-secondary); font-size: 12px; margin-left: 4px; }
.empty { text-align: center; padding: 40px; color: var(--text-color-secondary); }
</style>
