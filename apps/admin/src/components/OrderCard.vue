<template>
  <div class="order-card">
    <!-- Card Header -->
    <div class="order-header">
      <div class="order-info">
        <div class="pickup-group">
          <div class="pickup-row">
            <span class="pickup-code">{{ order.pickupCode }}</span>
            <span class="order-time">{{ formatTime(order.createdAt) }}</span>
          </div>
          <span class="order-no">{{ order.orderNo }}</span>
        </div>
      </div>
      <span :class="['order-status', 'status-' + order.status]">
        <span class="material-symbols-outlined status-icon">{{ statusIcon(order.status) }}</span>
        {{ statusLabel(order.status) }}
      </span>
    </div>

    <!-- Order Items -->
    <div v-if="!isGroup" class="order-items">
      <div v-for="item in order.items" :key="item.id" class="order-item">
        <div class="item-info">
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.specs" class="item-specs">{{ item.specs }}</span>
        </div>
        <span class="item-qty">x{{ item.quantity }}</span>
        <span v-if="item.promotionLabel" class="item-promo">{{ item.promotionLabel }}</span>
      </div>
    </div>

    <!-- Merged Group Orders -->
    <div v-if="isGroup" class="order-group">
      <div class="group-summary" @click="groupExpanded = !groupExpanded">
        <div class="group-summary-left">
          <span class="material-symbols-outlined">group</span>
          <span class="group-summary-label">合并订单（{{ groupOrders.length + 1 }} 单）</span>
          <span class="group-summary-total">合计 ¥{{ groupAllTotal.toFixed(2) }}</span>
        </div>
        <span :class="['material-symbols-outlined', 'group-chevron', groupExpanded && 'expanded']">expand_more</span>
      </div>
      <div v-if="groupExpanded" class="group-detail">
        <div v-for="g in allGroupOrders" :key="g.id" class="group-order">
          <div class="group-order-top">
            <span class="group-pickup">{{ g.pickupCode }}</span>
            <span :class="['group-status', 'status-' + g.status]">{{ statusLabel(g.status) }}</span>
          </div>
          <div class="group-order-no">{{ g.orderNo }} · {{ g.orderType === 'dine-in' ? '堂食' : '自取' }} · {{ g.itemCount }} 项</div>
          <div class="group-order-flags">
            <span class="group-flag" :class="{ 'flag-active': g.paidAt }">
              <span class="material-symbols-outlined">{{ g.paidAt ? 'check_circle' : 'schedule' }}</span>
              {{ g.paidAt ? '已支付' : '待支付' }}
            </span>
            <span class="group-flag" :class="{ 'flag-active': g.dishOutAt || g.status === 'ready' || g.status === 'completed' }">
              <span class="material-symbols-outlined">{{ (g.dishOutAt || g.status === 'ready' || g.status === 'completed') ? 'restaurant' : 'timer' }}</span>
              {{ (g.dishOutAt || g.status === 'ready' || g.status === 'completed') ? '已出菜' : '未出菜' }}
            </span>
          </div>
          <!-- Order items inside each group fold box -->
          <div class="group-order-items" v-if="g.items && g.items.length">
            <div v-for="item in g.items" :key="item.id" class="group-order-item">
              <div class="group-item-info">
                <span class="group-item-name">{{ item.name }}</span>
                <span v-if="item.specs" class="group-item-specs">{{ item.specs }}</span>
              </div>
              <span class="group-item-qty">x{{ item.quantity }}</span>
              <span class="group-item-subtotal">¥{{ (item.finalSubtotal ?? 0).toFixed(2) }}</span>
            </div>
          </div>
          <div class="group-amount">¥{{ (g.totals?.payableAmount ?? 0).toFixed(2) }}</div>
        </div>
      </div>
    </div>

    <!-- Order Meta -->
    <div class="order-meta">
      <div class="meta-row">
        <span class="meta-label">类型</span>
        <span class="meta-value">{{ order.orderType === 'dine-in' ? '堂食' : '自取' }}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">支付</span>
        <span class="meta-value">{{ order.status === 'unpaid' ? '待付款' : payLabel(order.paymentMethod) }}</span>
      </div>
      <div class="meta-row" v-if="order.cancelReason">
        <span class="meta-label">取消原因</span>
        <span class="meta-value cancel-reason">{{ order.cancelReason }}</span>
      </div>
    </div>

    <!-- Order Footer -->
    <div class="order-footer">
      <div class="order-amount">
        <span class="amount-label">{{ isGroup ? '合并实付' : (order.status === 'unpaid' ? '待支付' : '实付') }}</span>
        <span :class="['amount-value', order.status === 'unpaid' && 'amount-unpaid']">¥{{ (isGroup ? groupTotal : order.totals.payableAmount)?.toFixed(2) }}</span>
      </div>
      <div class="order-actions">
        <button v-if="showAction('preparing')" class="btn-action btn-primary-sm" @click="$emit('action', order.id, 'preparing')">
          <span class="material-symbols-outlined">play_arrow</span>
          开始制作
        </button>
        <button v-if="showAction('ready')" class="btn-action btn-success-sm" @click="$emit('action', order.id, 'ready')">
          <span class="material-symbols-outlined">check</span>
          制作完成
        </button>
        <button v-if="showAction('completed')" class="btn-action btn-warning-sm" @click="$emit('action', order.id, 'completed')">
          <span class="material-symbols-outlined">check_circle</span>
          取餐
        </button>
        <button v-if="showAction('cancel')" class="btn-action btn-danger-sm" @click="$emit('cancel', order.id)">
          <span class="material-symbols-outlined">cancel</span>
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  order: any
  compact?: boolean
}>()

defineEmits<{
  action: [id: string, status: string]
  cancel: [id: string]
}>()

const groupExpanded = ref(false)
const isGroup = computed<boolean>(() => !!props.order.groupId && (props.order.group?.length ?? 0) > 0)
const groupOrders = computed<any[]>(() => props.order.group ?? [])
const groupTotal = computed<number>(() =>
  groupOrders.value.reduce((s, g) => s + (g.totals?.payableAmount ?? 0), 0)
  + (props.order.totals?.payableAmount ?? 0)
)
const allGroupOrders = computed<any[]>(() => {
  const self = groupOrders.value.some((g) => g.id === props.order.id)
  const selfItem: any = {
    id: props.order.id,
    orderNo: props.order.orderNo,
    pickupCode: props.order.pickupCode,
    status: props.order.status,
    orderType: props.order.orderType,
    paymentMethod: props.order.paymentMethod,
    totals: props.order.totals,
    itemCount: (props.order.items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
    items: props.order.items ?? [],
    createdAt: props.order.createdAt,
    paidAt: !!props.order.paidAt,
    dishOutAt: props.order.dishOutAt,
  }
  const siblings = groupOrders.value.filter((g) => g.id !== props.order.id)
  const combined = groupOrders.value.some((g) => g.id === props.order.id) ? groupOrders.value : [selfItem, ...siblings]
  return combined
})

function showAction(action: string): boolean {
  const s = props.order.status
  if (action === 'preparing') return s === 'unpaid' || s === 'pending' || s === 'paid'
  if (action === 'ready') return s === 'preparing'
  if (action === 'completed') return s === 'ready'
  if (action === 'cancel') return s === 'unpaid' || s === 'pending' || s === 'paid' || s === 'preparing'
  return false
}

function statusLabel(s: string): string {
  const map: Record<string, string> = { unpaid: '待付款', pending: '待处理', paid: '待处理', preparing: '制作中', ready: '可取餐', completed: '已完成', cancelled: '已取消' }
  return map[s] || s
}

function statusIcon(s: string): string {
  const map: Record<string, string> = { unpaid: 'payment', pending: 'hourglass_empty', paid: 'hourglass_empty', preparing: 'local_fire_department', ready: 'check_circle', completed: 'done_all', cancelled: 'cancel' }
  return map[s] || 'info'
}

const payLabels: Record<string, string> = { wechat: '微信', alipay: '支付宝', cash: '现金' }
function payLabel(m: string): string { return payLabels[m] || m || '-' }

function formatTime(t: string) {
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

.order-card {
  background: #fff;
  border: 1px solid #e5e2e1;
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.15s;
  display: flex;
  flex-direction: column;
}
.order-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }

/* Header */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #f0eded;
}
.order-info { display: flex; flex: 1; min-width: 0; }
.pickup-group { display: flex; flex-direction: column; gap: 2px; }
.pickup-row { display: flex; align-items: baseline; gap: 10px; }
.pickup-code {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: #ff6b00;
  line-height: 1;
}
.order-time { font-size: 13px; color: #999; white-space: nowrap; }
.order-no { font-size: 11px; color: #bbb; }

/* Status */
.order-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.status-icon { font-size: 14px; }
.status-unpaid { background: rgba(186, 26, 26, 0.15); color: #ba1a1a; }
.status-pending, .status-paid { background: rgba(245, 158, 11, 0.15); color: #b45309; }
.status-preparing { background: rgba(255, 107, 0, 0.15); color: #a04100; }
.status-ready { background: rgba(74, 173, 78, 0.15); color: #006e1c; }
.status-completed { background: rgba(94, 94, 92, 0.15); color: #5e5e5c; }
.status-cancelled { background: rgba(186, 26, 26, 0.15); color: #ba1a1a; }

/* Items */
.order-items { padding: 12px 16px; border-bottom: 1px solid #f0eded; flex: 1; }
.order-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
.item-info { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.item-name { color: #1c1b1b; font-weight: 600; }
.item-specs { font-size: 12px; color: #5a4136; background: #f5f0eb; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.item-qty { font-weight: 700; color: #ff6b00; flex-shrink: 0; }
.item-promo { background: rgba(255, 107, 0, 0.1); color: #ff6b00; font-size: 11px; padding: 1px 6px; border-radius: 4px; }

/* Merged group section */
.order-group { border-bottom: 1px solid #f0eded; background: #fff8f2; }
.group-summary { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; cursor: pointer; }
.group-summary:hover { background: #fff0e3; }
.group-summary-left { display: flex; align-items: center; gap: 6px; }
.group-summary-left .material-symbols-outlined { font-size: 16px; color: #ff6b00; }
.group-summary-label { font-size: 12px; font-weight: 700; color: #a04100; }
.group-summary-total { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700; color: #ff6b00; }
.group-chevron { font-size: 18px; color: #ff6b00; transition: transform 0.15s; }
.group-chevron.expanded { transform: rotate(180deg); }
.group-detail { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 8px; }
.group-order { border: 1px dashed #ffd9bd; border-radius: 8px; padding: 8px 10px; }
.group-order-top { display: flex; justify-content: space-between; align-items: center; }
.group-pickup { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #ff6b00; }
.group-status { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.group-order-no { font-size: 11px; color: #999; margin: 2px 0 6px; }
.group-order-flags { display: flex; gap: 12px; margin-bottom: 6px; }
.group-flag { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: #bbb; }
.group-flag .material-symbols-outlined { font-size: 13px; }
.group-flag.flag-active { color: #4aad4e; }
.group-order-items { margin: 6px 0; padding-top: 6px; border-top: 1px solid #f6e5d8; }
.group-order-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; }
.group-item-info { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; }
.group-item-name { color: #1c1b1b; font-weight: 600; }
.group-item-specs { font-size: 11px; color: #5a4136; background: #f5f0eb; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
.group-item-qty { font-weight: 700; color: #ff6b00; flex-shrink: 0; }
.group-item-subtotal { color: #5a4136; flex-shrink: 0; }
.group-amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700; color: #1c1b1b; text-align: right; }

/* Meta - pushed to bottom */
.order-meta { padding: 12px 16px; background: #fdfbf9; font-size: 12px; margin-top: auto; }
.meta-row { display: flex; justify-content: space-between; padding: 4px 0; }
.meta-label { color: #999; }
.meta-value { color: #5a4136; font-weight: 500; }
.cancel-reason { color: #ba1a1a; }

/* Footer */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #f0eded;
  margin-top: auto;
}
.order-amount { display: flex; flex-direction: column; }
.amount-label { font-size: 11px; color: #999; }
.amount-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: #1c1b1b; }
.amount-unpaid { color: #ba1a1a; }

/* Actions */
.order-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 20px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.15s;
}
.btn-action .material-symbols-outlined { font-size: 16px; }
.btn-primary-sm { background: #ff6b00; color: #fff; }
.btn-primary-sm:hover { background: #e55f00; }
.btn-success-sm { background: #4aad4e; color: #fff; }
.btn-success-sm:hover { background: #3d9a40; }
.btn-warning-sm { background: #f59e0b; color: #fff; }
.btn-warning-sm:hover { background: #d97706; }
.btn-danger-sm { background: transparent; color: #ba1a1a; border: 1px solid #ba1a1a; }
.btn-danger-sm:hover { background: rgba(186, 26, 26, 0.08); }
</style>
