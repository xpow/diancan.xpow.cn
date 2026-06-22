<template>
  <div class="promo-page">
    <div class="page-header">
      <h2 class="page-title">营销活动</h2>
      <Button label="新增活动" icon="pi pi-plus" @click="openNew" />
    </div>

    <DataTable :value="promotions" striped-rows class="p-mt-3">
      <Column field="name" header="活动名称" />
      <Column field="type" header="类型">
        <template #body="{ data }">
          <Tag :value="typeLabel(data.type)" />
        </template>
      </Column>
      <Column field="status" header="状态">
        <template #body="{ data }">
          <div class="status-cell">
            <Tag :value="statusLabel(data.status)" :severity="statusSeverity(data.status)" />
            <Button
              v-if="data.status === 'active'"
              icon="pi pi-pause-circle"
              severity="warn"
              text
              size="small"
              @click="pausePromotion(data)"
            />
            <Button
              v-else-if="data.status === 'paused' || data.status === 'draft' || data.status === 'inactive'"
              icon="pi pi-play-circle"
              severity="success"
              text
              size="small"
              @click="setStatus(data.id, 'active')"
            />
          </div>
        </template>
      </Column>
      <Column field="rules" header="规则" style="max-width:300px">
        <template #body="{ data }">
          <span class="rule-text">{{ ruleText(data) }}</span>
        </template>
      </Column>
      <Column header="操作" style="width:160px">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" label="编辑" severity="info" text size="small" :disabled="data.status === 'active'" @click="openEdit(data)" />
          <Button icon="pi pi-trash" label="删除" severity="danger" size="small" @click="remove(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showDialog" :header="editing ? '编辑活动' : '新增活动'" style="width:680px">
      <div class="form-group">
        <label>活动名称</label>
        <InputText v-model="form.name" class="w-full" placeholder="例：满50减5" />
      </div>
      <div class="form-group">
        <label>活动类型</label>
        <SelectButton v-model="form.type" :options="typeOptions" optionLabel="label" optionValue="value" class="w-full" :disabled="editing" />
      </div>

      <!-- 满减配置 -->
      <template v-if="form.type === 'full_reduction'">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>满额门槛 (¥)</label>
            <InputNumber v-model="form.rules.threshold" :min="0" class="w-full" placeholder="50" />
          </div>
          <div class="form-group flex-1">
            <label>减免金额 (¥)</label>
            <InputNumber v-model="form.rules.discount" :min="0" class="w-full" placeholder="5" />
          </div>
        </div>
      </template>

      <!-- 福利品配置 -->
      <template v-if="form.type === 'welfare_item'">
        <div v-for="(item, idx) in form.items" :key="idx" class="promo-item-card">
          <div class="promo-item-header">
            <span class="promo-item-label">福利品 {{ idx + 1 }}</span>
            <Button v-if="form.items.length > 1" icon="pi pi-trash" severity="danger" text size="small" @click="removeItem(idx)" />
          </div>
          <div class="form-group">
            <label>选择菜品</label>
            <Select v-model="item.dishId" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="搜索并选择菜品" filter />
          </div>
          <div class="form-group">
            <label>福利价 (¥)</label>
            <InputNumber v-model="item.promoPrice" :min="0" :step="0.01" :minFractionDigits="1" placeholder="0.1" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>限购类型</label>
              <Select v-model="item.limitType" :options="limitOptions" optionLabel="label" optionValue="value" />
            </div>
            <div class="form-group">
              <label>限购数量</label>
              <InputNumber v-model="item.maxQty" :min="1" placeholder="1" :disabled="item.limitType === 'unlimited'" />
            </div>
          </div>
        </div>
        <Button label="+ 添加福利品" severity="secondary" text @click="addItem" class="p-mt-2" v-if="form.type !== 'welfare_item' && form.type !== 'total_discount'" />
      </template>

      <!-- 新人福利配置 -->
      <template v-if="form.type === 'new_user'">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>直减金额 (¥)</label>
            <InputNumber v-model="form.rules.discount" :min="0" class="w-full" placeholder="5" />
          </div>
          <div class="form-group flex-1">
            <label>最低消费 (¥)</label>
            <InputNumber v-model="form.rules.minAmount" :min="0" class="w-full" placeholder="0" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>赠送菜品</label>
            <Select v-model="form.rules.giftDishId" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择赠送的菜品" filter showClear class="w-full" />
          </div>
          <div class="form-group flex-1">
            <label>赠送数量</label>
            <InputNumber v-model="form.rules.giftQty" :min="1" class="w-full" placeholder="1" />
          </div>
        </div>
      </template>

      <!-- 节假日赠送单品 -->
      <template v-if="form.type === 'holiday_gift'">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>赠送菜品</label>
            <Select v-model="form.rules.giftDishId" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择赠送的菜品" filter showClear class="w-full" />
          </div>
          <div class="form-group flex-1">
            <label>赠送数量</label>
            <InputNumber v-model="form.rules.giftQty" :min="1" class="w-full" placeholder="1" />
          </div>
        </div>
        <div class="form-group">
          <label>节假日名称</label>
          <InputText v-model="form.rules.holiday" class="w-full" placeholder="例：端午节、中秋节" />
        </div>
      </template>

      <!-- 限时折扣配置 -->
      <template v-if="form.type === 'time_discount'">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>选择菜品</label>
            <Select v-model="form.items[0].dishId" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="搜索并选择菜品" filter showClear class="w-full" />
          </div>
          <div class="form-group flex-1">
            <label>折扣</label>
            <Select v-model="form.rules.discountRate" :options="discountOptions" optionLabel="label" optionValue="value" placeholder="选择折扣" class="w-full" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="width: 200px">
            <label>有效天数 <span class="text-muted">(留空不限)</span></label>
            <InputNumber v-model="form.rules.durationDays" :min="1" :max="365" class="w-full" placeholder="不限" />
          </div>
        </div>
      </template>

      <!-- 总价折扣配置 -->
      <template v-if="form.type === 'total_discount'">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>折扣类型</label>
            <Select v-model="form.rules.discountType" :options="discountTypeOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div class="form-group flex-1">
            <label>折扣值</label>
            <InputNumber v-model="form.rules.discountValue" :min="0" :step="0.01" class="w-full" :placeholder="form.rules.discountType === 'percentage' ? '例：10（10%）' : '例：5'" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>最高减免 (¥) <span class="text-muted">(可选)</span></label>
            <InputNumber v-model="form.rules.maxDiscount" :min="0" class="w-full" placeholder="不限" />
          </div>
          <div class="form-group flex-1">
            <label>最低消费 (¥) <span class="text-muted">(可选)</span></label>
            <InputNumber v-model="form.rules.minAmount" :min="0" class="w-full" placeholder="不限" />
          </div>
        </div>
        <div class="form-group">
          <label>排除商品</label>
          <MultiSelect v-model="form.rules.excludedDishIds" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择不参与折扣的商品" filter class="w-full" />
        </div>
      </template>

      <div class="form-group">
        <label>状态</label>
        <Select v-model="form.status" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full" />
      </div>

      <div class="form-group">
        <div class="stackable-row">
          <label>可与其他活动叠加</label>
          <ToggleSwitch v-model="form.stackable" />
        </div>
      </div>

      <template #footer>
        <Button label="取消" severity="secondary" @click="showDialog = false" />
        <Button label="保存" @click="save" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import Tag from 'primevue/tag'

interface PromoItem {
  dishId: string
  promoPrice: number | null
  limitType: string
  maxQty: number
}

interface Promotion {
  id: string
  name: string
  type: string
  status: string
  rules: Record<string, any>
  items: PromoItem[]
}

interface Dish {
  id: string
  name: string
  price: number
  status: string
}

const promotions = ref<Promotion[]>([])
const dishes = ref<Dish[]>([])
const activeDishes = computed(() => dishes.value.filter((d) => d.status === 'active'))
const showDialog = ref(false)
const editing = ref(false)
const editingId = ref('')

const typeOptions = [
  { label: '满减', value: 'full_reduction' },
  { label: '福利品', value: 'welfare_item' },
  { label: '限时折扣', value: 'time_discount' },
  { label: '新人福利', value: 'new_user' },
  { label: '节假日赠送单品', value: 'holiday_gift' },
  { label: '总价折扣', value: 'total_discount' },
]
const discountTypeOptions = [
  { label: '百分比折扣', value: 'percentage' },
  { label: '固定减免', value: 'fixed' },
]
const limitOptions = [
  { label: '每单限购', value: 'per_order' },
  { label: '全场限量', value: 'global_promo' },
  { label: '单日限购', value: 'daily' },
  { label: '不限', value: 'unlimited' },
]
const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已启用', value: 'active' },
  { label: '已暂停', value: 'paused' },
  { label: '已结束', value: 'ended' },
  { label: '已下线', value: 'inactive' },
]

const discountOptions = [
  { label: '1折', value: 0.1 },
  { label: '2折', value: 0.2 },
  { label: '3折', value: 0.3 },
  { label: '4折', value: 0.4 },
  { label: '5折', value: 0.5 },
  { label: '6折', value: 0.6 },
  { label: '7折', value: 0.7 },
  { label: '8折', value: 0.8 },
  { label: '85折', value: 0.85 },
  { label: '9折', value: 0.9 },
]

const form = ref<{
  name: string
  type: string
  rules: Record<string, any>
  items: PromoItem[]
  stackable: boolean
  status: string
}>({
  name: '',
  type: 'full_reduction',
  rules: {},
  items: [],
  stackable: true,
  status: 'draft',
})

function resetForm() {
  form.value = {
    name: '',
    type: 'full_reduction',
    rules: {},
    items: [],
    stackable: true,
    status: 'draft',
  }
}

function openNew() {
  editing.value = false
  resetForm()
  showDialog.value = true
}

function openEdit(p: Promotion) {
  editing.value = true
  editingId.value = p.id
  form.value = {
    name: p.name,
    type: p.type,
    rules: { ...p.rules },
    items: (p.items || []).map((i: any) => ({
      dishId: i.dishId,
      promoPrice: i.promoPrice || 0,
      limitType: i.limitType || 'per_order',
      maxQty: i.maxQty || 1,
    })),
    stackable: (p as any).stackable ?? false,
    status: p.status,
  }
  showDialog.value = true
}

function addItem() {
  form.value.items.push({ dishId: '', promoPrice: 0, limitType: 'per_order', maxQty: 1 })
}

function removeItem(idx: number) {
  form.value.items.splice(idx, 1)
}

// 自动生成标题
function autoGenerateName(): string | undefined {  if (form.value.type === 'full_reduction') {
    const t = form.value.rules.threshold
    const d = form.value.rules.discount
    if (t && d) return `满¥${t}减¥${d}`
  }
  if (form.value.type === 'welfare_item') {
    const item = form.value.items[0]
    if (item?.dishId) {
      const dish = dishes.value.find((d) => d.id === item.dishId)
      if (dish) {
        const limitMap: Record<string, string> = { per_order: '每单限购', global_promo: '全场限量', daily: '单日限购', unlimited: '不限' }
        return `${dish.name}福利价¥${item.promoPrice}（${limitMap[item.limitType] || item.limitType}${item.limitType === 'unlimited' ? '' : ' ' + item.maxQty}）`
      }
    }
  }
  if (form.value.type === 'new_user') {
    let name = '新人-'
    const hasDiscount = form.value.rules.discount
    const hasGift = form.value.rules.giftDishId
    if (hasDiscount) {
      name += `首单直减¥${form.value.rules.discount}`
      if (form.value.rules.minAmount) name += `(满¥${form.value.rules.minAmount})`
    }
    if (hasDiscount && hasGift) name += '或'
    if (hasGift) {
      const dish = dishes.value.find((d) => d.id === form.value.rules.giftDishId)
      name += `赠${dish?.name || '?'}x${form.value.rules.giftQty || 1}`
    }
    if (hasDiscount || hasGift) return name
  }
  if (form.value.type === 'holiday_gift') {
    const dish = dishes.value.find((d) => d.id === form.value.rules.giftDishId)
    if (dish && form.value.rules.holiday) return `${form.value.rules.holiday}赠${dish.name}x${form.value.rules.giftQty || 1}`
  }
  if (form.value.type === 'time_discount') {
    const item = form.value.items[0]
    if (item?.dishId && form.value.rules.discountRate) {
      const dish = dishes.value.find((d) => d.id === item.dishId)
      const label = discountOptions.find((o) => o.value === form.value.rules.discountRate)?.label || `${form.value.rules.discountRate * 100}折`
      let text = ''
      if (dish) text = `${dish.name}限时${label}`
      if (form.value.rules.durationDays) text += `(${form.value.rules.durationDays}天)`
      return text || undefined
    }
  }
  if (form.value.type === 'total_discount') {
    const { discountType, discountValue, minAmount, maxDiscount } = form.value.rules
    if (discountType && discountValue != null) {
      const val = discountType === 'percentage' ? `${discountValue}%` : `¥${discountValue}`
      let name = `总价${val}减免`
      if (minAmount) name += `(满¥${minAmount})`
      if (maxDiscount) name += `(最高减¥${maxDiscount})`
      return name
    }
  }
  return form.value.name
}

watch(
  () => form.value.type,
  () => {
    if (!editing.value) {
      form.value.name = ''
      form.value.items = []
      if (form.value.type === 'welfare_item' || form.value.type === 'time_discount') {
        form.value.items.push({ dishId: '', promoPrice: null, limitType: 'per_order', maxQty: 1 })
      }
      if (form.value.type === 'total_discount') {
        form.value.rules = { discountType: 'percentage', discountValue: null, maxDiscount: null, minAmount: null, excludedDishIds: [] }
      }
    }
  },
)

watch(
  () => [form.value.type, form.value.rules, form.value.items.map((i: any) => ({ dishId: i.dishId, promoPrice: i.promoPrice, limitType: i.limitType, maxQty: i.maxQty }))],
  () => {
    const generated = autoGenerateName()
    if (generated) form.value.name = generated
  },
  { deep: true },
)

async function save() {
  const body: any = {
    ...form.value,
  }
  if (body.type === 'time_discount') {
    // 限时折扣的价格由折扣率计算，不存固定的 promoPrice
    body.items = body.items?.map((i: any) => ({ ...i, promoPrice: null }))
    if (body.rules.durationDays) {
      body.startDate = new Date().toISOString()
      body.endDate = new Date(Date.now() + body.rules.durationDays * 24 * 60 * 60 * 1000).toISOString()
    } else {
      body.startDate = null
      body.endDate = null
    }
  }
  const url = editing.value ? `/api/admin/promotions/${editingId.value}` : '/api/admin/promotions'
  const method = editing.value ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      let msg = text
      try { const j = JSON.parse(text); if (j.message) msg = j.message } catch {}
      alert(msg)
      return
    }
    showDialog.value = false
    fetchPromotions()
  } catch (e: any) {
    alert(`请求失败: ${e.message}`)
  }
}

async function pausePromotion(p: Promotion) {
  if (!confirm(`确认暂停活动「${p.name}」？\n\n正在结算中的订单不受影响。`)) return
  await setStatus(p.id, 'paused')
}

async function setStatus(id: string, status: string) {
  try {
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const text = await res.text()
      let msg = text
      try { const j = JSON.parse(text); if (j.message) msg = j.message } catch {}
      alert(msg)
      return
    }
    fetchPromotions()
  } catch (e: any) {
    alert(`请求失败: ${e.message}`)
  }
}

async function remove(p: Promotion) {
  if (!confirm(`确认结束活动「${p.name}」？\n\n正在结算中的订单不受影响。`)) return
  await fetch(`/api/admin/promotions/${p.id}`, { method: 'DELETE' })
  fetchPromotions()
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { full_reduction: '满减', welfare_item: '福利品', buy_get: '买赠', time_discount: '限时折扣', new_user: '新人福利', holiday_gift: '节假日赠送单品', total_discount: '总价折扣' }
  return map[type] || type
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { draft: '草稿', active: '已启用', paused: '已暂停', ended: '已结束', inactive: '已下线' }
  return map[status] || status
}

function statusSeverity(status: string): string {
  const map: Record<string, string> = { active: 'success', paused: 'warn', ended: 'secondary', draft: 'info', inactive: 'contrast' }
  return map[status] || 'secondary'
}

function ruleText(p: Promotion): string {
  if (p.type === 'full_reduction') return `满 ¥${p.rules.threshold} 减 ¥${p.rules.discount}`
  if (p.type === 'welfare_item') {
    const item = p.items?.[0]
    if (!item) return '-'
    const limitMap: Record<string, string> = { per_order: '每单限购', global_promo: '全场限量', daily: '单日限购', unlimited: '不限' }
    const limit = limitMap[item.limitType] || item.limitType
    const dish = dishes.value.find((d) => d.id === item.dishId)
    return `${dish?.name || item.dishId} ¥${item.promoPrice} (${limit}${item.limitType === 'unlimited' ? '' : ' ' + item.maxQty})`
  }
  if (p.type === 'new_user') {
    const parts: string[] = []
    if (p.rules.discount) {
      let t = `首单直减¥${p.rules.discount}`
      if (p.rules.minAmount) t += `(满¥${p.rules.minAmount})`
      parts.push(t)
    }
    if (p.rules.giftDishId) {
      const dish = dishes.value.find((d) => d.id === p.rules.giftDishId)
      parts.push(`赠${dish?.name || '?'} x${p.rules.giftQty || 1}`)
    }
    return parts.join(' 或 ') || '-'
  }
  if (p.type === 'holiday_gift') {
    const dish = dishes.value.find((d) => d.id === p.rules.giftDishId)
    return `[${p.rules.holiday || '?'}] 赠${dish?.name || '?'} x${p.rules.giftQty || 1}`
  }
  if (p.type === 'time_discount') {
    const item = p.items?.[0]
    if (!item) return '-'
    const dish = dishes.value.find((d) => d.id === item.dishId)
    const label = discountOptions.find((o) => o.value === p.rules.discountRate)?.label || `${(p.rules.discountRate || 1) * 100}折`
    let text = `${dish?.name || item.dishId} ${label}`
    if (p.rules.durationDays) text += ` (${p.rules.durationDays}天)`
    return text
  }
  if (p.type === 'total_discount') {
    const { discountType, discountValue, minAmount, maxDiscount } = p.rules
    const val = discountType === 'percentage' ? `${discountValue}%` : `¥${discountValue}`
    let text = `总价${val}减免`
    if (minAmount) text += ` (满¥${minAmount})`
    if (maxDiscount) text += ` (最高减¥${maxDiscount})`
    return text
  }
  return JSON.stringify(p.rules)
}

async function fetchPromotions() {
  const res = await fetch('/api/admin/promotions')
  promotions.value = await res.json()
}

async function fetchDishes() {
  try {
    const res = await fetch('/api/admin/dishes')
    dishes.value = await res.json()
  } catch {
    // 可能没有 /api/dishes 接口
  }
}

onMounted(() => {
  fetchPromotions()
  fetchDishes()
})
</script>

<style scoped>
.promo-page { max-width: none; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; }
.form-row { display: flex; gap: 12px; min-width: 0; }
.form-row > .form-group { min-width: 0; }
.flex-1 { flex: 1; }
.w-full { width: 100%; }
.rule-text { font-size: 13px; white-space: normal; }
.promo-item-card { background: #f9f9f9; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.promo-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.promo-item-label { font-size: 13px; font-weight: 600; color: #666; }
.stackable-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
.stackable-row label { margin: 0; font-size: 14px; font-weight: 600; color: #333; }
.status-cell { display: flex; align-items: center; gap: 4px; }
:deep(.p-button.p-button-text:disabled) { color: #999 !important; }
</style>
