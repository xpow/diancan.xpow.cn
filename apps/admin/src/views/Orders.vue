<template>
  <div class="orders-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">订单管理</h2>
        <p class="page-subtitle">查看和管理所有订单</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span class="material-symbols-outlined">search</span>
          <input type="text" v-model="searchKeyword" placeholder="搜索订单号..." @keyup.enter="searchOrders" />
        </div>
      </div>
    </div>

    <!-- Status Filters -->
    <div class="filter-tabs">
      <button :class="['filter-tab', statusFilter === 'all' && 'active']" @click="setStatusFilter('all')">
        <span class="material-symbols-outlined">list</span>
        全部
        <span v-if="statusCounts.all" class="count">{{ statusCounts.all }}</span>
      </button>
      <button :class="['filter-tab', statusFilter === 'unpaid' && 'active']" @click="setStatusFilter('unpaid')">
        <span class="material-symbols-outlined">payment</span>
        待付款
        <span v-if="statusCounts.unpaid" class="count danger">{{ statusCounts.unpaid }}</span>
      </button>
      <button :class="['filter-tab', statusFilter === 'pending' && 'active']" @click="setStatusFilter('pending')">
        <span class="material-symbols-outlined">hourglass_empty</span>
        待处理
        <span v-if="statusCounts.pending" class="count warning">{{ statusCounts.pending }}</span>
      </button>
      <button :class="['filter-tab', statusFilter === 'preparing' && 'active']" @click="setStatusFilter('preparing')">
        <span class="material-symbols-outlined">local_fire_department</span>
        制作中
        <span v-if="statusCounts.preparing" class="count info">{{ statusCounts.preparing }}</span>
      </button>
      <button :class="['filter-tab', statusFilter === 'ready' && 'active']" @click="setStatusFilter('ready')">
        <span class="material-symbols-outlined">check_circle</span>
        可取餐
        <span v-if="statusCounts.ready" class="count success">{{ statusCounts.ready }}</span>
      </button>
      <button :class="['filter-tab', statusFilter === 'completed' && 'active']" @click="setStatusFilter('completed')">
        <span class="material-symbols-outlined">done_all</span>
        已完成
      </button>
      <button :class="['filter-tab', statusFilter === 'cancelled' && 'active']" @click="setStatusFilter('cancelled')">
        <span class="material-symbols-outlined">cancel</span>
        已取消
      </button>
    </div>

    <!-- Orders Grid -->
    <div class="orders-grid" v-if="orders.length">
      <OrderCard
        v-for="order in orders"
        :key="order.id"
        :order="order"
        @action="updateStatus"
        @cancel="openCancelDialog"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <span class="material-symbols-outlined">receipt_long</span>
      <p>暂无订单</p>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="total > pageSize">
      <button class="page-btn" :disabled="page === 1" @click="goToPage(page - 1)">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>
      <span class="page-info">第 {{ page }} 页 / 共 {{ Math.ceil(total / pageSize) }} 页</span>
      <button class="page-btn" :disabled="page >= Math.ceil(total / pageSize)" @click="goToPage(page + 1)">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>

    <!-- Cancel Dialog -->
    <div v-if="showCancel" class="modal-overlay" @click.self="showCancel = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>取消订单</h3>
          <button class="btn-icon" @click="showCancel = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <p class="cancel-hint">请选择取消原因：</p>
          <div class="cancel-options">
            <div
              v-for="reason in cancelReasons"
              :key="reason"
              :class="['cancel-option', selectedReason === reason && 'selected']"
              @click="selectedReason = reason"
            >
              <span class="material-symbols-outlined" v-if="selectedReason === reason">check_circle</span>
              <span class="material-symbols-outlined" v-else>circle</span>
              {{ reason }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCancel = false">取消</button>
          <button class="btn-danger" :disabled="!selectedReason" @click="confirmCancel">确认取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import OrderCard from '../components/OrderCard.vue'

interface OrderItem {
  id: string
  name: string
  quantity: number
  finalUnitPrice: number
  finalSubtotal: number
  specs: string | null
  promotionLabel: string | null
  status: string
}

interface Order {
  id: string
  orderNo: string
  pickupCode: string
  status: string
  orderType: string
  groupId?: string
  group?: {
    id: string
    orderNo: string
    pickupCode: string
    status: string
    orderType: string
    paymentMethod?: string
    totals: { originalAmount: number; discountAmount: number; payableAmount: number }
    itemCount: number
    items: {
      id: string
      name: string
      quantity: number
      finalUnitPrice: number
      finalSubtotal: number
      specs?: string
      unit?: string
    }[]
    createdAt: string
    paidAt?: string
    dishOutAt?: string
  }[]
  paymentMethod?: string
  totals: { originalAmount: number; discountAmount: number; payableAmount: number }
  fullReduction?: number
  items: OrderItem[]
  createdAt: string
  cancelReason?: string
  cancelledAt?: string
}

const orders = ref<Order[]>([])
const statusFilter = ref<string>(new URLSearchParams(location.search).get('status') || 'all')
const searchKeyword = ref('')
const pageSize = 30
const page = ref(1)
const total = ref(0)

const statusCounts = reactive({
  all: 0,
  unpaid: 0,
  pending: 0,
  preparing: 0,
  ready: 0,
  completed: 0,
  cancelled: 0
})

function canCancel(status: string): boolean {
  return ['unpaid', 'pending', 'paid', 'preparing', 'ready'].includes(status)
}

function setStatusFilter(status: string) {
  statusFilter.value = status
  page.value = 1
  fetchOrders()
}

function goToPage(p: number) {
  page.value = p
  fetchOrders()
}

function searchOrders() {
  page.value = 1
  fetchOrders()
}

async function fetchOrders() {
  const params = new URLSearchParams()
  if (statusFilter.value === 'pending') {
    params.set('status', 'pending,paid')
  } else if (statusFilter.value === 'unpaid') {
    params.set('status', 'unpaid')
  } else if (statusFilter.value && statusFilter.value !== 'all') {
    params.set('status', statusFilter.value)
  }
  params.set('page', String(page.value))
  params.set('limit', String(pageSize))
  const res = await fetch(`/api/admin/orders?${params}`)
  const data = await res.json()
  orders.value = data.items ?? []
  total.value = data.total ?? 0
  
  // Update counts
  if (data.counts) {
    Object.assign(statusCounts, data.counts)
  }
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
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.orders-page {
  padding: 0;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #1c1b1b;
}

.page-subtitle {
  margin: 4px 0 0;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #5a4136;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e5e2e1;
  border-radius: 24px;
  min-width: 240px;
}

.search-box input {
  border: none;
  outline: none;
  font-size: 14px;
  width: 100%;
  background: transparent;
}

.search-box .material-symbols-outlined {
  color: #5a4136;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e5e2e1;
  border-radius: 20px;
  background: #fff;
  color: #5a4136;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-tab:hover {
  border-color: #ff6b00;
  color: #ff6b00;
}

.filter-tab.active {
  background: #ff6b00;
  color: #fff;
  border-color: #ff6b00;
}

.filter-tab .count {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}

.filter-tab .count.warning { background: rgba(245, 158, 11, 0.2); }
.filter-tab .count.info { background: rgba(59, 130, 246, 0.2); }
.filter-tab .count.success { background: rgba(74, 173, 78, 0.2); }
.filter-tab .count.danger { background: rgba(186, 26, 26, 0.15); }

.filter-tab .material-symbols-outlined { font-size: 16px; }

.filter-tab.active .count {
  background: rgba(255, 255, 255, 0.3);
}

/* Orders Grid */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

/* Material Icons */
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  font-variation-settings: 'wght' 500;
}

/* Buttons */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: #5a4136;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: rgba(255, 107, 0, 0.1);
  color: #ff6b00;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  color: #1c1b1b;
  border: 1px solid #e5e2e1;
  padding: 10px 20px;
  border-radius: 24px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  border-color: #ff6b00;
  color: #ff6b00;
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ba1a1a;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 24px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-danger:hover {
  background: #9b1515;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal-sm {
  max-width: 420px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e2e1;
}

.modal-header h3 {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1c1b1b;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e2e1;
}

/* Cancel Dialog */
.cancel-hint {
  margin: 0 0 16px;
  font-size: 14px;
  color: #5a4136;
}

.cancel-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cancel-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid #e5e2e1;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.cancel-option:hover {
  border-color: #ff6b00;
  background: #fdf8f5;
}

.cancel-option.selected {
  border-color: #ff6b00;
  background: #fff3e8;
  font-weight: 600;
}

.cancel-option .material-symbols-outlined {
  font-size: 20px;
  color: #ccc;
}

.cancel-option.selected .material-symbols-outlined {
  color: #ff6b00;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 16px;
}

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #e5e2e1;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  border-color: #ff6b00;
  color: #ff6b00;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: #5a4136;
}

/* Empty State */
.empty-state {
  padding: 80px 20px;
  text-align: center;
  color: #999;
}

.empty-state .material-symbols-outlined {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.4;
}

.empty-state p {
  margin: 0;
  font-size: 15px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .search-box {
    min-width: 100%;
  }

  .orders-grid {
    grid-template-columns: 1fr;
  }

  .order-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .order-actions {
    justify-content: flex-end;
  }
}
</style>
