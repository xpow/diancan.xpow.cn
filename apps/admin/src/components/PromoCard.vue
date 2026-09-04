<template>
  <div class="promo-card">
    <div class="promo-card-header">
      <div class="promo-info">
        <span class="promo-name">{{ promotion.name }}</span>
        <div class="promo-chips">
          <span :class="['type-chip', 'type-' + promotion.type]">{{ typeLabel(promotion.type) }}</span>
          <span :class="['status-chip', 'status-' + promotion.status]">{{ statusLabel(promotion.status) }}</span>
        </div>
      </div>
      <div class="promo-toggle">
        <button
          v-if="promotion.status === 'active'"
          class="toggle-btn toggle-btn--pause"
          title="暂停"
          @click="$emit('pause', promotion)"
        >
          <span class="material-symbols-outlined">pause</span>
        </button>
        <button
          v-else-if="promotion.status === 'paused' || promotion.status === 'draft' || promotion.status === 'inactive'"
          class="toggle-btn toggle-btn--play"
          title="启用"
          @click="$emit('activate', promotion.id)"
        >
          <span class="material-symbols-outlined">play_arrow</span>
        </button>
      </div>
    </div>

    <div class="promo-card-body">
      <div class="promo-rule">
        <span class="rule-label">规则</span>
        <span class="rule-text">{{ ruleText(promotion) }}</span>
      </div>
      <div class="promo-devices" v-if="getDeviceNames().length">
        <span class="device-label">适用点餐机</span>
        <div class="device-tags">
          <span v-for="name in getDeviceNames()" :key="name" class="device-tag">{{ name }}</span>
        </div>
      </div>
    </div>

    <div class="promo-card-footer">
      <div class="promo-meta">
        <span class="meta-item" v-if="promotion.startTime">
          <span class="material-symbols-outlined">schedule</span>
          {{ formatTime(promotion.startTime) }} - {{ formatTime(promotion.endTime) }}
        </span>
      </div>
      <div class="promo-actions">
        <button class="btn-action btn-edit" :disabled="promotion.status === 'active'" @click="$emit('edit', promotion)">
          <span class="material-symbols-outlined">edit</span>
          编辑
        </button>
        <button class="btn-action btn-delete" @click="$emit('delete', promotion)">
          <span class="material-symbols-outlined">delete</span>
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Promotion {
  id: string
  name: string
  type: string
  status: string
  startTime?: string
  endTime?: string
  rules?: any
}

interface Device {
  label: string
  value: string
}

const props = defineProps<{
  promotion: Promotion
  devices?: Device[]
}>()

defineEmits<{
  edit: [p: Promotion]
  delete: [p: Promotion]
  pause: [p: Promotion]
  activate: [id: string]
}>()

function getDeviceNames(): string[] {
  const ids = props.promotion.rules?.deviceIds
  if (!ids || !ids.length || !props.devices) return []
  return ids
    .map((id: string) => {
      const device = props.devices?.find(d => d.value === id)
      if (!device) return null
      const match = device.label.match(/\(([^)]+)\)/)
      return match ? match[1] : device.label
    })
    .filter(Boolean) as string[]
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    full_reduction: '满减',
    buy_get: '买赠',
    welfare_item: '福利品',
    time_discount: '时段折扣',
    new_user: '新用户',
    holiday_gift: '节日赠品',
    total_discount: '整单折扣'
  }
  return map[type] || type
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: '进行中',
    paused: '已暂停',
    draft: '草稿',
    ended: '已结束',
    inactive: '未启用'
  }
  return map[status] || status
}

function ruleText(p: Promotion): string {
  if (p.type === 'full_reduction') {
    if (p.rules?.tiers && Array.isArray(p.rules.tiers)) {
      return p.rules.tiers.map((t: any) => `满${t.threshold}减${t.discount}`).join('；')
    }
    if (p.rules?.threshold !== undefined) {
      return `满${p.rules.threshold}减${p.rules.discount}`
    }
  }
  if (p.type === 'buy_get') {
    if (p.rules?.items && Array.isArray(p.rules.items)) {
      return p.rules.items.map((i: any) => `买${i.buyQuantity}赠${i.giveName || i.giveQuantity}`).join('；')
    }
    if (p.rules?.threshold !== undefined) {
      const maxText = p.rules.maxGifts ? `，最多赠${p.rules.maxGifts}份` : ''
      const modeText = p.rules.mode === 'repeat' ? '（每满重复）' : ''
      return `买${p.rules.threshold}件赠${p.rules.giftQty}份${modeText}${maxText}`
    }
  }
  if (p.type === 'welfare_item') {
    const item = (p as any).items?.[0]
    if (item) {
      const limitMap: Record<string, string> = { per_order: '每单限购', global_promo: '全场限量', daily: '单日限购', unlimited: '不限' }
      const limit = limitMap[item.limitType] || item.limitType
      const limitText = item.limitType === 'unlimited' ? '' : ` ${item.maxQty}`
      return `福利价¥${item.promoPrice}（${limit}${limitText}）`
    }
  }
  if (p.type === 'time_discount' || p.type === 'total_discount') {
    if (p.rules?.discountRate !== undefined) {
      return `${p.rules.discountRate * 10}折`
    }
    if (p.rules?.discount !== undefined) {
      return `${p.rules.discount}折`
    }
  }
  return JSON.stringify(p.rules || {})
}

function formatTime(t?: string): string {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.promo-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.15s;
  display: flex;
  flex-direction: column;
}
.promo-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Header */
.promo-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid var(--divider);
}

.promo-info {
  flex: 1;
  min-width: 0;
}

.promo-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--on-surface);
  display: block;
  margin-bottom: 8px;
}

.promo-chips {
  display: flex;
  gap: 6px;
}

/* Type Chips */
.type-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.type-full_reduction  { background: var(--primary-soft); color: #a04100; }
.type-buy_get         { background: rgba(139,92,246,0.1); color: #7c3aed; }
.type-welfare_item    { background: rgba(74,173,78,0.1); color: #4aad4e; }
.type-time_discount   { background: rgba(59,130,246,0.1); color: #3b82f6; }
.type-new_user        { background: rgba(236,72,153,0.1); color: #db2777; }
.type-holiday_gift    { background: rgba(245,158,11,0.1); color: #d97706; }
.type-total_discount  { background: rgba(20,184,166,0.1); color: #0d9488; }

/* Status Chips */
.status-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.status-active   { background: rgba(74,173,78,0.1); color: #4aad4e; }
.status-paused   { background: var(--primary-soft); color: #a04100; }
.status-draft    { background: var(--border); color: var(--text-secondary); }
.status-ended    { background: var(--border); color: var(--text-disabled); }
.status-inactive { background: var(--error-soft); color: var(--text-disabled); }

/* Toggle */
.toggle-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.toggle-btn .material-symbols-outlined { font-size: 20px; }
.toggle-btn--pause {
  background: var(--primary-soft);
  color: #ff6b00;
}
.toggle-btn--pause:hover { background: rgba(255, 107, 0, 0.2); }
.toggle-btn--play {
  background: var(--tertiary-soft);
  color: #4aad4e;
}
.toggle-btn--play:hover { background: rgba(74, 173, 78, 0.2); }

/* Body */
.promo-card-body {
  padding: 12px 16px;
  flex: 1;
}

.promo-rule {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-label {
  font-size: 11px;
  color: var(--text-disabled);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rule-text {
  font-size: 13px;
  color: var(--on-surface-variant);
  line-height: 1.5;
}

.promo-devices {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-label {
  font-size: 11px;
  color: var(--text-disabled);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.device-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.device-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--surface-container);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--on-surface-variant);
}

/* Footer */
.promo-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--divider);
  background: var(--surface-container-low);
}

.promo-meta {
  display: flex;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-disabled);
}
.meta-item .material-symbols-outlined { font-size: 14px; }

.promo-actions {
  display: flex;
  gap: 6px;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-action .material-symbols-outlined { font-size: 16px; }
.btn-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-edit {
  background: var(--primary-soft);
  color: #ff6b00;
}
.btn-edit:hover:not(:disabled) { background: rgba(255, 107, 0, 0.2); }
.btn-delete {
  background: var(--error-soft);
  color: var(--error);
}
.btn-delete:hover { background: rgba(186, 26, 26, 0.15); }
</style>
