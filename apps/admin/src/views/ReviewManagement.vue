<template>
  <div class="review-page">
    <div class="page-header">
      <h1 class="page-title">评价管理</h1>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading" class="loading-msg">加载中...</p>

    <!-- 设置 -->
    <section class="section">
      <h2>基本设置</h2>
      <div class="settings-row">
        <label>开启评价收集</label>
        <button :class="['toggle', settings.enabled && 'toggle-on']" @click="toggleEnabled">
          <span class="toggle-knob"></span>
        </button>
      </div>
    </section>

    <!-- 赠品池 -->
    <section class="section">
      <h2>赠品菜品池</h2>
      <p class="section-desc">选择顾客评价后可选的赠品菜品</p>
      <div class="gift-controls">
        <Select v-model="selectedDishId" :options="availableDishes" optionLabel="name" optionValue="id" placeholder="选择菜品添加" class="dish-select" />
        <Button label="添加" @click="addGiftDish" :disabled="!selectedDishId" />
      </div>
      <DataTable :value="settings.giftDishes" stripedRows class="gift-table">
        <Column field="name" header="菜品名" />
        <Column field="price" header="价格">
          <template #body="{ data }">¥{{ data.price.toFixed(2) }}</template>
        </Column>
        <Column header="操作">
          <template #body="{ data }">
            <Button icon="pi pi-trash" severity="danger" text @click="removeGiftDish(data.dishId)" />
          </template>
        </Column>
      </DataTable>
    </section>

    <!-- 核销 -->
    <section class="section">
      <h2>兑换码核销</h2>
      <div class="redeem-row">
        <InputText v-model="redeemCode" placeholder="输入6位兑换码" maxlength="6" class="code-input" />
        <Button label="核销" @click="redeem" :disabled="!redeemCode" />
      </div>
      <p v-if="redeemMsg" :class="['redeem-msg', redeemOk && 'redeem-ok']">{{ redeemMsg }}</p>
    </section>

    <!-- 评价列表 -->
    <section class="section">
      <h2>评价记录</h2>
      <DataTable :value="reviews" stripedRows paginator :rows="20" :totalRecords="total" :lazy="true" @page="onPage" class="review-table">
        <Column field="createdAt" header="时间">
          <template #body="{ data }">{{ formatTime(data.createdAt) }}</template>
        </Column>
        <Column header="总体评价">
          <template #body="{ data }">{{ data.overallStats.good }}好 / {{ data.overallStats.okay }}中 / {{ data.overallStats.bad }}差</template>
        </Column>
        <Column field="itemCount" header="评价菜品数" />
        <Column field="comment" header="留言">
          <template #body="{ data }">{{ data.comment || '-' }}</template>
        </Column>
        <Column header="赠品">
          <template #body="{ data }">{{ data.code ? data.code.dishName + (data.code.status === 'redeemed' ? '(已核销)' : '') : '未领取' }}</template>
        </Column>
      </DataTable>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface GiftDish { dishId: string; name: string; price: number }
interface Settings { enabled: boolean; giftDishes: GiftDish[] }

const settings = ref<Settings>({ enabled: false, giftDishes: [] })
const availableDishes = ref<{ id: string; name: string; price: number }[]>([])
const selectedDishId = ref('')
const redeemCode = ref('')
const redeemMsg = ref('')
const redeemOk = ref(false)
const reviews = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref('')

async function loadSettings() {
  loading.value = true; error.value = ''
  try {
    const res = await fetch('/api/admin/merchant')
    if (!res.ok) { error.value = '获取商家信息失败'; return }
    const m = await res.json()
    const r = await fetch(`/api/admin/reviews/settings?merchantId=${m.id}`)
    if (!r.ok) { error.value = '获取评价设置失败'; return }
    settings.value = await r.json()
    const d = await fetch('/api/admin/dishes')
    if (!d.ok) { error.value = '获取菜品列表失败'; return }
    const dishes = await d.json()
    availableDishes.value = Array.isArray(dishes) ? dishes : (dishes.items || [])
  } catch { error.value = '网络错误' } finally { loading.value = false }
}

async function toggleEnabled() {
  const res = await fetch('/api/admin/merchant')
  const m = await res.json()
  await fetch('/api/admin/reviews/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: m.id, enabled: !settings.value.enabled }),
  })
  settings.value.enabled = !settings.value.enabled
}

async function addGiftDish() {
  if (!selectedDishId.value) return
  const res = await fetch('/api/admin/merchant')
  const m = await res.json()
  await fetch('/api/admin/reviews/gift-dishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: m.id, dishId: selectedDishId.value }),
  })
  selectedDishId.value = ''
  await loadSettings()
}

async function removeGiftDish(dishId: string) {
  const res = await fetch('/api/admin/merchant')
  const m = await res.json()
  await fetch(`/api/admin/reviews/gift-dishes/${dishId}?merchantId=${m.id}`, { method: 'DELETE' })
  await loadSettings()
}

async function loadReviews() {
  try {
    const r = await fetch(`/api/admin/reviews?page=${page.value}&limit=20`)
    if (!r.ok) return
    const data = await r.json()
    reviews.value = data.items || []
    total.value = data.total || 0
  } catch {}
}

function onPage(e: any) {
  page.value = e.page + 1
  loadReviews()
}

async function redeem() {
  redeemMsg.value = ''
  if (!redeemCode.value) return
  try {
    const r = await fetch('/api/admin/reviews/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: redeemCode.value }),
    })
    if (r.ok) {
      const data = await r.json()
      redeemMsg.value = `核销成功！赠品：${data.dishName}`
      redeemOk.value = true
      redeemCode.value = ''
      loadReviews()
    } else {
      const err = await r.json()
      redeemMsg.value = err.message || '核销失败'
      redeemOk.value = false
    }
  } catch {
    redeemMsg.value = '网络错误'
    redeemOk.value = false
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

onMounted(() => { loadSettings(); loadReviews() })
</script>

<style scoped>
.review-page { max-width: 900px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; }
.section { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.section h2 { margin: 0 0 12px; font-size: 16px; font-weight: 700; }
.section-desc { margin: -8px 0 16px; font-size: 13px; color: #666; }
.settings-row { display: flex; align-items: center; gap: 16px; }
.toggle { width: 44px; height: 24px; border-radius: 12px; border: none; background: #ccc; cursor: pointer; position: relative; transition: background 0.2s; padding: 0; }
.toggle-on { background: #22c55e; }
.toggle-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
.toggle-on .toggle-knob { transform: translateX(20px); }
.gift-controls { display: flex; gap: 8px; margin-bottom: 12px; }
.dish-select { flex: 1; }
.gift-table { margin-top: 8px; }
.redeem-row { display: flex; gap: 8px; }
.code-input { width: 180px; text-transform: uppercase; }
.redeem-msg { margin: 8px 0 0; font-size: 14px; font-weight: 600; color: #dc2626; }
.redeem-ok { color: #16a34a; }
.p-datatable .p-datatable-tbody > tr > td,
.p-datatable .p-datatable-thead > tr > th { white-space: nowrap; }
.error-msg { color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.loading-msg { color: #666; font-size: 14px; margin-bottom: 16px; }
</style>