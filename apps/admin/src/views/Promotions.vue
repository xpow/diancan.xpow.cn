<template>
  <div>
    <h2>营销活动</h2>
    <DataTable :value="promotions" striped-rows>
      <Column field="name" header="活动名称" />
      <Column field="type" header="类型">
        <template #body="{ data }">
          {{ typeLabel(data.type) }}
        </template>
      </Column>
      <Column field="status" header="状态">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="data.status === 'active' ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column field="rules" header="规则">
        <template #body="{ data }">
          {{ ruleText(data) }}
        </template>
      </Column>
      <Column header="操作">
        <template #body="{ data }">
          <Button icon="pi pi-sync" severity="secondary" text @click="toggleStatus(data)" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Promotion {
  id: string
  name: string
  type: string
  status: string
  rules: Record<string, any>
  items?: any[]
}

const promotions = ref<Promotion[]>([])

function typeLabel(type: string): string {
  const map: Record<string, string> = { full_reduction: '满减', welfare_item: '福利品', buy_get: '买赠', time_discount: '限时折扣' }
  return map[type] || type
}

function ruleText(p: Promotion): string {
  if (p.type === 'full_reduction') return `满 ¥${p.rules.threshold} 减 ¥${p.rules.discount}`
  if (p.type === 'welfare_item') {
    const item = p.items?.[0]
    if (!item) return '-'
    const limit = item.limitType === 'global_promo' ? '全场限量' : '每单限购'
    return `${item.dishId} ¥${item.promoPrice} (${limit} ${item.maxQty})`
  }
  return JSON.stringify(p.rules)
}

function toggleStatus(p: Promotion) {
  const newStatus = p.status === 'active' ? 'disabled' : 'active'
  fetch(`/api/promotions/${p.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  })
    .then((r) => { if (r.ok) p.status = newStatus })
    .catch(() => {})
}

onMounted(() => {
  fetch('/api/promotions?merchantId=demo-merchant')
    .then((r) => r.json())
    .then((data) => { promotions.value = data })
    .catch(() => {})
})
</script>
