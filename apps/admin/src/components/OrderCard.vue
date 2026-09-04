<template>
  <div class="order-card">
    <!-- Card Header -->
    <div v-if="!isGroup" class="order-header">
      <div class="order-info">
        <div class="pickup-group">
          <div class="pickup-row">
            <span class="pickup-code">{{ order.pickupCode }}</span>
            <span class="order-time">{{ formatTime(order.createdAt) }}</span>
          </div>
          <span class="order-no">{{ order.orderNo }}</span>
        </div>
      </div>
      <div class="order-badges">
        <span v-if="orderUnpaid" class="order-status status-unpaid">
          <span class="material-symbols-outlined status-icon">credit_card</span>
          待付款
        </span>
        <span v-if="orderHasReady" class="order-status status-ready">
          <span class="material-symbols-outlined status-icon">restaurant</span>
          可取餐
        </span>
        <span v-if="order.status === 'completed'" class="order-status status-completed">
          <span class="material-symbols-outlined status-icon">done_all</span>
          已完成
        </span>
        <span v-if="order.status === 'cancelled'" class="order-status status-cancelled">
          <span class="material-symbols-outlined status-icon">cancel</span>
          已取消
        </span>
        <span v-if="showFallbackStatus" :class="['order-status', 'status-' + order.status]">
          <span class="material-symbols-outlined status-icon">{{ statusIcon(order.status) }}</span>
          {{ statusLabel(order.status) }}
        </span>
      </div>
    </div>

    <!-- Merged Card Header -->
    <div v-else class="order-header merged-header">
      <div class="order-info">
        <div class="pickup-group">
          <div class="merged-title-row">
            <span class="material-symbols-outlined merged-icon">group</span>
            <span class="merged-title">{{ allGroupOrders.length }} 个订单合并</span>
            <span class="merged-sub">共 {{ allGroupTotalItemCount }} 项</span>
          </div>
        </div>
      </div>
      <div class="merged-badges">
        <span v-if="groupHasReady" class="order-status status-ready">
          <span class="material-symbols-outlined status-icon">restaurant</span>
          可取餐
        </span>
        <span v-if="unpaidGroupCount > 0" class="order-status status-unpaid">
          <span class="material-symbols-outlined status-icon">credit_card</span>
          待付款
          <span class="order-count-num">{{ unpaidGroupCount }}</span>
        </span>
      </div>
    </div>

    <!-- Order Items -->
    <div v-if="!isGroup" class="order-items">
      <div v-for="item in order.items" :key="item.id" class="order-item">
        <div class="item-info">
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.specs" class="item-specs">{{ item.specs }}</span>
        </div>
        <span class="item-qty">x{{ item.quantity }}</span>
        <span class="item-subtotal">¥{{ (item.finalSubtotal ?? 0).toFixed(2) }}</span>
        <span v-if="item.promotionLabel" class="item-promo">{{ item.promotionLabel }}</span>
      </div>
    </div>

    <!-- Merged Group Orders: one fold box per member order -->
    <div v-if="isGroup" class="order-group">
      <div v-for="g in allGroupOrders" :key="g.id" class="group-order">
        <div class="group-order-head" @click="toggleGroup(g.id)">
          <div class="group-order-head-left">
            <span :class="['material-symbols-outlined', 'group-chevron', expandedSet[g.id] && 'expanded']">chevron_right</span>
            <div>
              <div class="group-order-top">
                <span class="group-pickup">{{ g.pickupCode }}</span>
                <span :class="['group-status', 'status-' + g.status]">{{ statusLabel(g.status) }}</span>
                <span class="group-order-time">{{ formatTime(g.createdAt) }}</span>
              </div>
              <div class="group-order-no">{{ g.orderNo }} · {{ g.orderType === 'dine-in' ? '堂食' : '自取' }}</div>
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
            </div>
          </div>
          <div class="group-amount-box">
            <div class="group-amount">¥{{ (g.totals?.payableAmount ?? 0).toFixed(2) }}</div>
            <span v-if="(g.fullReduction ?? 0) > 0" class="group-fr">满减 -¥{{ g.fullReduction.toFixed(2) }}</span>
          </div>
        </div>
        <div v-if="expandedSet[g.id]" class="group-order-body">
          <div class="group-order-items" v-if="g.items && g.items.length">
            <div v-for="item in g.items" :key="item.id" class="group-order-item">
              <div class="group-item-info">
                <span class="group-item-name">{{ item.name }}</span>
                <span v-if="item.promotionLabel" class="group-item-promo">{{ item.promotionLabel }}</span>
                <span v-if="item.specs" class="group-item-specs">{{ item.specs }}</span>
              </div>
              <span class="group-item-qty">x{{ item.quantity }}</span>
              <span class="group-item-subtotal">¥{{ (item.finalSubtotal ?? 0).toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Order Meta -->
    <div class="order-meta" v-if="!isGroup || order.cancelReason">
      <div class="meta-row" v-if="!isGroup">
        <span class="meta-label">类型</span>
        <span class="meta-value">{{ order.orderType === 'dine-in' ? '堂食' : '自取' }}</span>
      </div>
      <div class="meta-row" v-if="!isGroup">
        <span class="meta-label">支付</span>
        <span class="meta-value">{{ orderUnpaid ? '待付款' : payLabel(order.paymentMethod) }}</span>
      </div>
      <div class="meta-row" v-if="order.cancelReason">
        <span class="meta-label">取消原因</span>
        <span class="meta-value cancel-reason">{{ order.cancelReason }}</span>
      </div>
    </div>

    <!-- Order Footer -->
    <div class="order-footer">
      <div class="order-amount" v-if="!isGroup">
        <span class="amount-label">{{ orderUnpaid ? '待付金额' : '实付' }}</span>
        <span :class="['amount-value', orderUnpaid && 'amount-unpaid']">¥{{ order.totals.payableAmount?.toFixed(2) }}</span>
      </div>
      <div class="order-amount-group" v-else>
        <div class="amount-row" v-if="unpaidGroupTotal < groupTotal">
          <span class="amount-label">总金额</span>
          <span class="amount-value">¥{{ groupTotal.toFixed(2) }}</span>
        </div>
        <div class="amount-row" v-if="unpaidGroupTotal > 0">
          <span class="amount-label">待付金额</span>
          <span :class="['amount-value', 'amount-unpaid']">¥{{ unpaidGroupTotal.toFixed(2) }}</span>
        </div>
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
        <button v-if="canTake" class="btn-action btn-warning-sm" @click="$emit('action', order.id, 'completed')">
          <span class="material-symbols-outlined">check_circle</span>
          取餐
        </button>
        <button v-if="canCancel" class="btn-action btn-danger-sm" @click="$emit('cancel', order.id)">
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
const expandedSet = ref<Record<string, boolean>>({})
const isGroup = computed<boolean>(() => !!props.order.groupId)
const groupOrders = computed<any[]>(() => props.order.group ?? [])
const allGroupOrders = computed<any[]>(() => {
  const siblings = groupOrders.value.filter((g) => g.id !== props.order.id)
  if (groupOrders.value.some((g) => g.id === props.order.id)) return groupOrders.value
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
  return [selfItem, ...siblings]
})
const groupTotal = computed<number>(() =>
  allGroupOrders.value.reduce((s, g) => s + (g.totals?.payableAmount ?? 0), 0)
)
const isUnpaidOrder = (g: any) => !g.paidAt || g.status === 'unpaid'
const unpaidGroupOrders = computed<any[]>(() =>
  allGroupOrders.value.filter(isUnpaidOrder)
)
const unpaidGroupTotal = computed<number>(() =>
  unpaidGroupOrders.value.reduce((s, g) => s + (g.totals?.payableAmount ?? 0), 0)
)
const unpaidGroupCount = computed<number>(() => unpaidGroupOrders.value.length)
const allGroupTotalItemCount = computed<number>(() =>
  allGroupOrders.value.reduce((s, g) => s + ((g.items ?? []).reduce((x: number, i: any) => x + i.quantity, 0)), 0)
)

// 单订单标识：待付款与可取餐需同时显示（复用原状态徽标样式，不重复）
const orderUnpaid = computed<boolean>(() => !props.order.paidAt || props.order.status === 'unpaid')
const orderHasReady = computed<boolean>(() =>
  props.order.status !== 'completed' &&
  props.order.status !== 'cancelled' &&
  (props.order.items ?? []).some((i: any) => i.status === 'ready')
)
const groupHasReady = computed<boolean>(() =>
  allGroupOrders.value.some((g: any) =>
    g.status !== 'completed' &&
    g.status !== 'cancelled' &&
    (g.items ?? []).some((i: any) => i.status === 'ready')
  )
)

// 未取餐判断
const isPickedUp = computed<boolean>(() => {
  if (isGroup.value) {
    return allGroupOrders.value.length > 0 && allGroupOrders.value.every((g: any) => g.status === 'completed')
  }
  return props.order.status === 'completed' || props.order.status === 'cancelled'
})
// 是否存在未付款（单订单 或 合并组）
const hasUnpaidFlag = computed<boolean>(() => (isGroup.value ? unpaidGroupCount.value > 0 : orderUnpaid.value))
// 取餐：无未付款且未完成时显示（有未付款则不显示取餐）
const canTake = computed<boolean>(() => !hasUnpaidFlag.value && !isPickedUp.value && showAction('completed'))
// 取消：只要未取餐就显示
const canCancel = computed<boolean>(() => !isPickedUp.value)
// 通用状态徽标：待付款/可取餐/已完成/已取消 之外的剩余状态才显示
const showFallbackStatus = computed<boolean>(() =>
  !orderUnpaid.value &&
  !orderHasReady.value &&
  props.order.status !== 'completed' &&
  props.order.status !== 'cancelled'
)

function toggleGroup(id: string) {
  expandedSet.value = { ...expandedSet.value, [id]: !expandedSet.value[id] }
}

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
  background: var(--surface);
  border: 1px solid var(--border);
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
  border-bottom: 1px solid var(--divider);
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
.order-time { font-size: 13px; color: var(--text-disabled); white-space: nowrap; }
.order-no { font-size: 11px; color: var(--text-disabled); }

/* Merged Header */
.merged-header { align-items: center; background: var(--surface); }
.merged-title-row { display: flex; align-items: center; gap: 6px; }
.merged-icon { font-size: 18px; color: var(--on-surface); }
.merged-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; color: var(--on-surface); }
.merged-sub { font-size: 12px; color: var(--text-disabled); }
.order-badges { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
.merged-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

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
  line-height: 18px;
}
.status-icon { font-size: 14px; }
.status-unpaid { background: rgb(255 76 55 / 16%);   color: #f74e22; }
.status-pending, .status-paid { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.status-preparing { background: rgba(255, 107, 0, 0.15); color: #ff6b00; }
.status-ready { background: rgba(74, 173, 78, 0.15); color: #4ade80; }
.order-count-num { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9999px; background: rgb(255 76 55 / 16%);   color: #f74e22; font-size: 11px; font-weight: 700; }
.status-completed { background: rgba(94, 94, 92, 0.15); color: var(--text-secondary); }
.status-cancelled { background: rgb(255 76 55 / 16%);   color: #f74e22; }

/* Items */
.order-items { padding: 12px 16px; border-bottom: 1px solid var(--divider); flex: 1; }
.order-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
.item-info { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.item-name { color: var(--on-surface); font-weight: 600; }
.item-specs { font-size: 12px; color: var(--on-surface-variant); background: var(--surface-container-low); padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.item-qty { font-weight: 700; color: #ff6b00; flex-shrink: 0; }
.item-subtotal { color: var(--on-surface-variant); flex-shrink: 0; font-size: 12px; }
.item-promo { background: var(--primary-soft); color: #ff6b00; font-size: 11px; padding: 1px 6px; border-radius: 4px; }

/* Merged group section: one fold box per member order */
.order-group { border-bottom: 1px solid var(--divider); background: var(--primary-soft); display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; }
.group-order { border: 1px solid #ffd9bd; border-radius: 10px; background: var(--surface); overflow: hidden; }
.group-order-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; cursor: pointer; }
.group-order-head:hover { background: var(--primary-soft); }
.group-order-head-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.group-chevron { font-size: 18px; color: #ff6b00; transition: transform 0.15s; flex-shrink: 0; }
.group-chevron.expanded { transform: rotate(90deg); }
.group-order-top { display: flex; align-items: center; gap: 8px; }
.group-pickup { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 800; color: #ff6b00; }
.group-status { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
.group-order-time { font-size: 11px; color: var(--text-disabled); white-space: nowrap; }
.group-order-no { font-size: 11px; color: var(--text-disabled); margin-top: 2px; }
.group-amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; color: var(--on-surface); flex-shrink: 0; }
.group-order-body { padding: 0 12px 10px; border-top: 1px solid #f6e5d8; }
.group-order-flags { display: flex; gap: 12px; margin-top: 4px; }
.group-flag { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--text-disabled); }
.group-flag .material-symbols-outlined { font-size: 13px; }
.group-flag.flag-active { color: #4aad4e; }
.group-order-items { padding-top: 6px; margin-bottom: 2px; }
.group-order-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 12px; }
.group-item-info { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; }
.group-item-name { color: var(--on-surface); font-weight: 600; }
.group-item-specs { font-size: 11px; color: var(--on-surface-variant); background: var(--surface-container-low); padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
.group-item-promo { background: var(--primary-soft); color: #ff6b00; font-size: 11px; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
.group-item-qty { font-weight: 700; color: #ff6b00; flex-shrink: 0; }
.group-item-subtotal { color: var(--on-surface-variant); flex-shrink: 0; }
.group-amount { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700; color: var(--on-surface); text-align: right; }
.group-amount-box { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
.group-fr { font-size: 11px; font-weight: 600; color: #ff6b00; background: var(--primary-soft); padding: 2px 8px; border-radius: 12px; white-space: nowrap; }

/* Meta - pushed to bottom */
.order-meta { padding: 12px 16px; background: var(--surface-container-low); font-size: 12px; margin-top: auto; }
.meta-row { display: flex; justify-content: space-between; padding: 4px 0; }
.meta-label { color: var(--text-disabled); }
.meta-value { color: var(--on-surface-variant); font-weight: 500; }
.cancel-reason {   color: #f74e22; }
.promo-value { color: #ff6b00; font-weight: 600; }

/* Footer */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--divider);
  margin-top: auto;
}
.order-amount { display: flex; flex-direction: column; }
.amount-label { font-size: 11px; color: var(--text-disabled); }
.amount-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: var(--on-surface); }
.amount-unpaid {   color: #f74e22; }
.order-amount-group { display: flex; flex-direction: column; gap: 2px; }
.amount-row { display: flex; align-items: baseline; gap: 8px; }
.amount-row .amount-value { font-size: 16px; }

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
.btn-primary-sm { background: #ff6b00; color: var(--on-primary); }
.btn-primary-sm:hover { background: #e55f00; }
.btn-success-sm { background: #4aad4e; color: var(--on-primary); }
.btn-success-sm:hover { background: #3d9a40; }
.btn-warning-sm { background: #f59e0b; color: var(--on-primary); }
.btn-warning-sm:hover { background: #d97706; }
.btn-danger-sm { background: transparent;   color: #f74e22; border: 1px solid #f74e22; }
.btn-danger-sm:hover { background: rgb(255 76 55 / 16%); }
</style>
