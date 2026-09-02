<template>
  <div class="promo-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">营销活动</h2>
        <p class="page-subtitle">管理满减、买赠、福利品等营销规则</p>
      </div>
      <button class="btn-add" @click="openNew">
        <span class="material-symbols-outlined">add</span>
        新增活动
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <span class="filter-label">类型</span>
        <div class="filter-pills">
          <button :class="['filter-pill', typeFilter === '' && 'active']" @click="typeFilter = ''">
            全部 <span class="pill-count">{{ promotions.length }}</span>
          </button>
          <button v-for="t in typeOptions" :key="t.value" :class="['filter-pill', typeFilter === t.value && 'active']" @click="typeFilter = t.value">
            {{ t.label }} <span class="pill-count">{{ countByType(t.value) }}</span>
          </button>
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">状态</span>
        <div class="filter-pills">
          <button :class="['filter-pill', statusFilter === '' && 'active']" @click="statusFilter = ''">
            全部 <span class="pill-count">{{ promotions.length }}</span>
          </button>
          <button :class="['filter-pill', statusFilter === 'active' && 'active']" @click="statusFilter = 'active'">
            进行中 <span class="pill-count">{{ countByStatus('active') }}</span>
          </button>
          <button :class="['filter-pill', statusFilter === 'paused' && 'active']" @click="statusFilter = 'paused'">
            已暂停 <span class="pill-count">{{ countByStatus('paused') }}</span>
          </button>
          <button :class="['filter-pill', statusFilter === 'draft' && 'active']" @click="statusFilter = 'draft'">
            草稿 <span class="pill-count">{{ countByStatus('draft') }}</span>
          </button>
          <button :class="['filter-pill', statusFilter === 'inactive' && 'active']" @click="statusFilter = 'inactive'">
            已下线 <span class="pill-count">{{ countByStatus('inactive') }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="promos-grid" v-if="filteredPromotions.length">
      <PromoCard
        v-for="p in filteredPromotions"
        :key="p.id"
        :promotion="p"
        :devices="devices"
        @edit="openEdit"
        @delete="remove"
        @pause="pausePromotion"
        @activate="(id) => setStatus(id, 'active')"
      />
    </div>
    <p v-else class="empty">暂无营销活动</p>

    <Dialog v-model:visible="showDialog" :header="editing ? '编辑活动' : '新增活动'" style="width:680px" class="promo-dialog">
      <div class="form-body">
        <div class="form-section">
          <div class="form-section-title">基本信息</div>
          <div class="form-group">
            <label>活动名称</label>
            <input v-model="form.name" class="form-input" placeholder="例：满50减5" />
          </div>
          <div class="form-group">
            <label>活动类型</label>
            <div class="type-selector">
              <button
                v-for="t in typeOptions"
                :key="t.value"
                :class="['type-btn', form.type === t.value && 'active']"
                @click="form.type = t.value"
              >{{ t.label }}</button>
            </div>
          </div>
        </div>

        <!-- 满减配置 -->
        <div v-if="form.type === 'full_reduction'" class="form-section">
          <div class="form-section-title">满减规则</div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>满额门槛 (¥)</label>
              <input v-model.number="form.rules.threshold" type="number" min="0" class="form-input" placeholder="50" />
            </div>
            <div class="form-group flex-1">
              <label>减免金额 (¥)</label>
              <input v-model.number="form.rules.discount" type="number" min="0" class="form-input" placeholder="5" />
            </div>
          </div>
          <div class="form-group">
            <label>不参与满减的商品</label>
            <MultiSelect v-model="form.rules.excludedDishIds" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择不参与满减的商品" filter class="w-full" />
          </div>
        </div>

        <!-- 买赠配置 -->
        <div v-if="form.type === 'buy_get'" class="form-section">
          <div class="form-section-title">买赠规则</div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>满 X 件</label>
              <input v-model.number="form.rules.threshold" type="number" min="1" class="form-input" placeholder="10" />
            </div>
            <div class="form-group flex-1">
              <label>送 Y 件</label>
              <input v-model.number="form.rules.giftQty" type="number" min="1" class="form-input" placeholder="2" />
            </div>
          </div>
          <div class="form-group">
            <label>触发商品 <span class="text-muted">(不选则所有商品都参与)</span></label>
            <MultiSelect v-model="form.rules.triggerDishIds" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择触发活动的商品" filter class="w-full" />
          </div>
          <div class="form-group">
            <label>赠送商品</label>
            <Select v-model="form.rules.giftDishId" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择赠送的菜品" filter showClear class="w-full" />
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>赠送模式</label>
              <Select v-model="form.rules.mode" :options="[{ label: '每满X件送Y件（可叠加）', value: 'repeat' }, { label: '满X件送Y件（仅一次）', value: 'once' }]" optionLabel="label" optionValue="value" class="w-full" />
            </div>
            <div class="form-group flex-1">
              <label>最多赠送次数 <span class="text-muted">(0=不限)</span></label>
              <input v-model.number="form.rules.maxGifts" type="number" min="0" class="form-input" placeholder="0" />
            </div>
          </div>
        </div>

        <!-- 福利品配置 -->
        <div v-if="form.type === 'welfare_item'" class="form-section">
          <div class="form-section-title">福利品配置</div>
          <div v-for="(item, idx) in form.items" :key="idx" class="promo-item-card">
            <div class="promo-item-header">
              <span class="promo-item-label">福利品 {{ idx + 1 }}</span>
              <button v-if="form.items.length > 1" class="btn-sm btn-delete" @click="removeItem(idx)">删除</button>
            </div>
            <div class="form-group">
              <label>选择菜品</label>
              <Select v-model="item.dishId" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="搜索并选择菜品" filter />
            </div>
            <div class="form-group">
              <label>福利价 (¥)</label>
              <input v-model.number="item.promoPrice" type="number" min="0" step="0.01" class="form-input" placeholder="0.1" />
            </div>
            <div class="form-row">
              <div class="form-group flex-1">
                <label>限购类型</label>
                <Select v-model="item.limitType" :options="limitOptions" optionLabel="label" optionValue="value" class="w-full" />
              </div>
              <div class="form-group flex-1">
                <label>限购数量</label>
                <input v-model.number="item.maxQty" type="number" min="1" class="form-input" placeholder="1" :disabled="item.limitType === 'unlimited'" />
              </div>
            </div>
          </div>
          <button class="btn-add-item" @click="addItem">+ 添加福利品</button>
        </div>

        <!-- 新人福利配置 -->
        <div v-if="form.type === 'new_user'" class="form-section">
          <div class="form-section-title">新人福利规则</div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>直减金额 (¥)</label>
              <input v-model.number="form.rules.discount" type="number" min="0" class="form-input" placeholder="5" />
            </div>
            <div class="form-group flex-1">
              <label>最低消费 (¥)</label>
              <input v-model.number="form.rules.minAmount" type="number" min="0" class="form-input" placeholder="0" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>赠送菜品</label>
              <Select v-model="form.rules.giftDishId" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择赠送的菜品" filter showClear class="w-full" />
            </div>
            <div class="form-group flex-1">
              <label>赠送数量</label>
              <input v-model.number="form.rules.giftQty" type="number" min="1" class="form-input" placeholder="1" />
            </div>
          </div>
        </div>

        <!-- 节假日赠送单品 -->
        <div v-if="form.type === 'holiday_gift'" class="form-section">
          <div class="form-section-title">节假日赠送规则</div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>赠送菜品</label>
              <Select v-model="form.rules.giftDishId" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择赠送的菜品" filter showClear class="w-full" />
            </div>
            <div class="form-group flex-1">
              <label>赠送数量</label>
              <input v-model.number="form.rules.giftQty" type="number" min="1" class="form-input" placeholder="1" />
            </div>
          </div>
          <div class="form-group">
            <label>节假日名称</label>
            <input v-model="form.rules.holiday" class="form-input" placeholder="例：端午节、中秋节" />
          </div>
        </div>

        <!-- 限时折扣配置 -->
        <div v-if="form.type === 'time_discount'" class="form-section">
          <div class="form-section-title">限时折扣规则</div>
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
            <div class="form-group" style="width:200px">
              <label>有效天数 <span class="text-muted">(留空不限)</span></label>
              <input v-model.number="form.rules.durationDays" type="number" min="1" max="365" class="form-input" placeholder="不限" />
            </div>
          </div>
        </div>

        <!-- 总价折扣配置 -->
        <div v-if="form.type === 'total_discount'" class="form-section">
          <div class="form-section-title">总价折扣规则</div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>折扣类型</label>
              <Select v-model="form.rules.discountType" :options="discountTypeOptions" optionLabel="label" optionValue="value" class="w-full" />
            </div>
            <div class="form-group flex-1">
              <label>折扣值</label>
              <input v-model.number="form.rules.discountValue" type="number" min="0" step="0.01" class="form-input" :placeholder="form.rules.discountType === 'percentage' ? '例：10（10%）' : '例：5'" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>最高减免 (¥) <span class="text-muted">(可选)</span></label>
              <input v-model.number="form.rules.maxDiscount" type="number" min="0" class="form-input" placeholder="不限" />
            </div>
            <div class="form-group flex-1">
              <label>最低消费 (¥) <span class="text-muted">(可选)</span></label>
              <input v-model.number="form.rules.minAmount" type="number" min="0" class="form-input" placeholder="不限" />
            </div>
          </div>
          <div class="form-group">
            <label>排除商品</label>
            <MultiSelect v-model="form.rules.excludedDishIds" :options="activeDishes" optionLabel="name" optionValue="id" placeholder="选择不参与折扣的商品" filter class="w-full" />
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">其他设置</div>
          <div class="form-group">
            <label>适用设备（选填，不选则全设备可用）</label>
            <MultiSelect v-model="form.rules.deviceIds" :options="devices" optionLabel="label" optionValue="value" placeholder="选择适用设备" filter class="w-full" />
          </div>
          <div class="form-group">
            <label>状态</label>
            <Select v-model="form.status" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div class="stackable-row">
            <label>可与其他活动叠加</label>
            <ToggleSwitch v-model="form.stackable" />
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-dialog btn-cancel" @click="showDialog = false">取消</button>
        <button class="btn-dialog btn-save" @click="save">保存</button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import ToggleSwitch from 'primevue/toggleswitch'
import PromoCard from '../components/PromoCard.vue'

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
const devices = ref<{ label: string; value: string }[]>([])
const activeDishes = computed(() => dishes.value.filter((d) => d.status === 'active'))
const showDialog = ref(false)
const editing = ref(false)
const editingId = ref('')
const typeFilter = ref('')
const statusFilter = ref('')

const filteredPromotions = computed(() => {
  return promotions.value.filter(p => {
    if (typeFilter.value && p.type !== typeFilter.value) return false
    if (statusFilter.value && p.status !== statusFilter.value) return false
    return true
  })
})

function countByType(type: string): number {
  return promotions.value.filter(p => p.type === type).length
}

function countByStatus(status: string): number {
  return promotions.value.filter(p => p.status === status).length
}

const typeOptions = [
    { label: '满减', value: 'full_reduction' },
    { label: '买赠', value: 'buy_get' },
    { label: '福利品', value: 'welfare_item' },
    { label: '限时折扣', value: 'time_discount' },
    { label: '新人福利', value: 'new_user' },
    { label: '节假日赠送', value: 'holiday_gift' },
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

function autoGenerateName(): string | undefined {
  if (form.value.type === 'full_reduction') {
    const t = form.value.rules.threshold
    const d = form.value.rules.discount
    if (t && d) return `满¥${t}减¥${d}`
  }
  if (form.value.type === 'buy_get') {
    const { threshold, giftQty, giftDishId, mode } = form.value.rules
    if (threshold && giftDishId && giftQty) {
      const dish = dishes.value.find((d) => d.id === giftDishId)
      const modeText = mode === 'repeat' ? '每' : ''
      return `${modeText}满${threshold}件送${dish?.name || '?'} x${giftQty}`
    }
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
      if (form.value.type === 'full_reduction') {
        form.value.rules = { threshold: null, discount: null, excludedDishIds: [] }
      }
      if (form.value.type === 'buy_get') {
        form.value.rules = { threshold: null, giftQty: null, triggerDishIds: [], giftDishId: null, mode: 'repeat', maxGifts: 0 }
      }
    }
  },
)

watch(
  () => [form.value.type, JSON.stringify(form.value.rules), form.value.items.length > 0 ? form.value.items.map((i: any) => ({ dishId: i.dishId, promoPrice: i.promoPrice, limitType: i.limitType, maxQty: i.maxQty })) : ''],
  () => {
    const generated = autoGenerateName()
    if (generated) form.value.name = generated
  },
)

async function save() {
  const body: any = {
    ...form.value,
  }
  if (body.type === 'time_discount') {
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
  const map: Record<string, string> = { full_reduction: '满减', welfare_item: '福利品', buy_get: '买赠', time_discount: '限时折扣', new_user: '新人福利', holiday_gift: '节假日赠送', total_discount: '总价折扣' }
  return map[type] || type
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { draft: '草稿', active: '已启用', paused: '已暂停', ended: '已结束', inactive: '已下线' }
  return map[status] || status
}

function ruleText(p: Promotion): string {
  if (p.type === 'full_reduction') return `满 ¥${p.rules.threshold} 减 ¥${p.rules.discount}`
  if (p.type === 'buy_get') {
    const dish = dishes.value.find((d) => d.id === p.rules.giftDishId)
    const modeText = p.rules.mode === 'repeat' ? '每' : ''
    return `${modeText}满${p.rules.threshold}件送${dish?.name || '?'} x${p.rules.giftQty || 1}`
  }
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
  promotions.value = (await res.json()).sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1))
}

async function fetchDishes() {
  try {
    const res = await fetch('/api/admin/dishes')
    dishes.value = await res.json()
  } catch {}
}

async function fetchDevices() {
  try {
    const res = await fetch('/api/admin/devices')
    const list: any[] = await res.json()
    devices.value = list.map((d) => ({ label: `${d.name} (${d.code || '无编号'})`, value: d.id }))
  } catch {}
}

onMounted(() => {
  fetchPromotions()
  fetchDishes()
  fetchDevices()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

.promo-page { font-family: 'Inter', sans-serif; }

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
.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ff6b00;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(255, 107, 0, 0.2);
}
.btn-add:hover { background: #e65c00; transform: scale(0.98); }

/* ===== Card + Table ===== */
.card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid #e5e2e1;
  overflow: hidden;
}
.table-wrap { overflow-x: auto; }
/* Filters */
.filters-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  min-width: 36px;
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 1px solid #e5e2e1;
  border-radius: 20px;
  background: #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #5a4136;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pill:hover {
  border-color: #ff6b00;
  color: #ff6b00;
}

.filter-pill.active {
  background: #ff6b00;
  border-color: #ff6b00;
  color: #fff;
}

.pill-count {
  font-size: 11px;
  opacity: 0.7;
}

/* Promos Grid */
.promos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.promo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.promo-table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: #f6f3f2;
  border-bottom: 1px solid #e5e2e1;
  white-space: nowrap;
}
.promo-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0eded;
  vertical-align: middle;
}
.promo-table tbody tr:hover { background: #fdf8f5; }
.col-name {
  font-weight: 600;
  color: #1a1a1a;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.col-rule {
  font-size: 13px;
  color: #666;
  max-width: 280px;
}
.col-actions { white-space: nowrap; }

/* ===== Type Chips ===== */
.type-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
}
.type-full_reduction  { background: #fff3e8; color: #a04100; }
.type-buy_get         { background: rgba(139,92,246,0.1); color: #7c3aed; }
.type-welfare_item    { background: rgba(74,173,78,0.1); color: #4aad4e; }
.type-time_discount   { background: rgba(59,130,246,0.1); color: #3b82f6; }
.type-new_user        { background: rgba(236,72,153,0.1); color: #db2777; }
.type-holiday_gift    { background: rgba(245,158,11,0.1); color: #d97706; }
.type-total_discount  { background: rgba(20,184,166,0.1); color: #0d9488; }

/* ===== Status Chips ===== */
.status-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.status-active   { background: rgba(74,173,78,0.1); color: #4aad4e; }
.status-paused   { background: rgba(255,107,0,0.1); color: #a04100; }
.status-draft    { background: #e5e2e1; color: #666; }
.status-ended    { background: #e5e2e1; color: #999; }
.status-inactive { background: rgba(186,26,26,0.08); color: #999; }

/* ===== Toggle Buttons ===== */
.btn-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 6px;
  transition: background 0.15s;
}
.btn-toggle--pause:hover { background: #fff3e8; }
.btn-toggle--play:hover  { background: rgba(74,173,78,0.1); }

/* ===== Small Buttons ===== */
.btn-sm {
  padding: 4px 14px;
  border-radius: 20px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.15s;
}
.btn-edit { background: #f6f3f2; color: #1a1a1a; }
.btn-edit:hover { background: #e5e2e1; }
.btn-edit:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-delete { background: transparent; color: #ba1a1a; border: 1px solid #ba1a1a; }
.btn-delete:hover { background: rgba(186,26,26,0.08); }

.empty { text-align: center; padding: 40px; color: #999; font-size: 14px; }

/* ===== Dialog Form ===== */
.promo-dialog :deep(.p-dialog-header) {
  background: #f6f3f2;
  border-bottom: 1px solid #e5e2e1;
  border-radius: 16px 16px 0 0;
  padding: 16px 20px;
}
.promo-dialog :deep(.p-dialog-content) {
  padding: 0;
  border-radius: 0 0 16px 16px;
  max-height: 70vh;
  overflow-y: auto;
}
.promo-dialog :deep(.p-dialog-footer) {
  border-top: 1px solid #e5e2e1;
  padding: 12px 20px;
}

.form-body { padding: 20px; }
.form-section {
  background: #f6f3f2;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.form-section-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.form-group { margin-bottom: 12px; }
.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 4px;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e2e1;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none;
  border-color: #ff6b00;
}
.form-input:disabled {
  background: #f0ebe5;
  color: #999;
}
.form-row { display: flex; gap: 12px; }
.form-row > .form-group { min-width: 0; }
.flex-1 { flex: 1; }
.text-muted { color: #999; font-weight: 400; }

/* ===== Type Selector ===== */
.type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.type-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #e5e2e1;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.type-btn:hover { border-color: #ff6b00; }
.type-btn.active {
  background: #ff6b00;
  color: #fff;
  border-color: #ff6b00;
}

/* ===== Promo Item Card ===== */
.promo-item-card {
  background: #fff;
  border: 1px solid #e5e2e1;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}
.promo-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.promo-item-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}
.btn-add-item {
  background: transparent;
  border: 1px dashed #e5e2e1;
  border-radius: 12px;
  padding: 10px;
  width: 100%;
  font-size: 13px;
  color: #ff6b00;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s;
}
.btn-add-item:hover { border-color: #ff6b00; }

/* ===== Stackable Row ===== */
.stackable-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}
.stackable-row label {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

/* ===== Dialog Footer Buttons ===== */
.btn-dialog {
  padding: 8px 20px;
  border-radius: 20px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.15s;
}
.btn-cancel { background: #e5e2e1; color: #666; }
.btn-cancel:hover { background: #d1ccc7; }
.btn-save { background: #ff6b00; color: #fff; }
.btn-save:hover { background: #e55f00; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .form-row { flex-direction: column; }
}
</style>
