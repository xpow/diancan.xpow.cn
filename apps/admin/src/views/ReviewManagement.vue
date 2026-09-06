<template>
  <div class="review-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">评价管理</h2>
        <p class="page-subtitle">管理评价收集、赠品池和兑换码核销</p>
      </div>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading" class="loading-msg">加载中...</p>

    <!-- 基本设置 -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">基本设置</h3>
      </div>
      <div class="card-body">
        <div class="settings-row">
          <div class="settings-info">
            <span class="settings-label">开启评价收集</span>
            <span class="settings-desc">开启后顾客可在取餐后进行评价</span>
          </div>
          <button :class="['toggle', settings.enabled && 'toggle-on']" @click="toggleEnabled">
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- 赠品池 -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">赠品菜品池</h3>
        <span class="card-subtitle">选择顾客评价后可选的赠品菜品</span>
      </div>
      <div class="card-body">
        <div class="gift-controls">
          <div class="gift-select-wrap">
            <MultiSelect v-model="selectedDishIds" :options="availableDishes" optionLabel="name" optionValue="id" placeholder="选择菜品" filter display="chip" class="gift-select" />
          </div>
          <input v-model.number="giftQuantity" type="number" min="1" max="99" class="form-input qty-input" placeholder="数量" />
          <button class="btn-action" @click="addGiftDishes" :disabled="selectedDishIds.length === 0">批量添加</button>
        </div>
        <div class="table-wrap" v-if="settings.giftDishes.length">
          <table class="data-table">
            <thead>
              <tr>
                <th>菜品名</th>
                <th>价格</th>
                <th>数量</th>
                <th style="text-align:right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in settings.giftDishes" :key="d.dishId">
                <td class="col-name">{{ d.name }}</td>
                <td class="col-price">¥{{ d.price.toFixed(2) }}</td>
                <td>
                  <input v-model.number="d.quantity" type="number" min="1" max="99" class="form-input qty-inline" @blur="updateQuantity(d)" />
                </td>
                <td class="col-actions">
                  <button class="btn-icon btn-danger-icon" @click="removeGiftDish(d.dishId)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-sm">暂无赠品，请在上方添加</p>
      </div>
    </div>

    <!-- 兑换码核销 -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">兑换码核销</h3>
      </div>
      <div class="card-body">
        <div class="redeem-row">
          <input v-model="redeemCode" class="form-input code-input" placeholder="输入6位兑换码" maxlength="6" />
          <button class="btn-action" @click="redeem" :disabled="!redeemCode">核销</button>
        </div>
        <p v-if="redeemMsg" :class="['redeem-msg', redeemOk && 'redeem-ok']">{{ redeemMsg }}</p>
      </div>
    </div>

    <!-- 评价记录 -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">评价记录</h3>
        <span class="card-subtitle">共 {{ total }} 条</span>
      </div>
      <div class="table-wrap" v-if="reviews.length">
        <table class="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>总体评价</th>
              <th>评价明细</th>
              <th>赠品</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reviews" :key="r.id">
              <td class="col-time">{{ formatTime(r.createdAt) }}</td>
              <td>
                <span class="eval-summary">
                  <span class="eval-good">{{ r.overallStats.good }}好</span>
                  <span class="eval-okay">{{ r.overallStats.okay }}中</span>
                  <span class="eval-bad">{{ r.overallStats.bad }}差</span>
                </span>
              </td>
              <td class="col-detail">
                <div v-for="item in r.items" :key="item.dishName" class="review-detail-item">
                  <span class="detail-dish">{{ item.dishName }}</span>
                  <span :class="['detail-badge', 'badge-' + item.overall]">
                    {{ item.overall === 'good' ? '好吃' : item.overall === 'okay' ? '还行' : '不好' }}
                  </span>
                  <span v-if="item.overall !== 'good'">
                    <span v-if="item.spiciness" class="detail-tag">辣{{ ['','不够','刚好','太辣'][item.spiciness] }}</span>
                    <span v-if="item.texture" class="detail-tag">口感{{ ['','太老','刚好','不好吃'][item.texture] }}</span>
                    <span v-if="item.portion" class="detail-tag">份量{{ ['','太少','刚好','太多'][item.portion] }}</span>
                  </span>
                  <span v-if="item.price" class="detail-tag">价格{{ ['','太贵','适中','便宜'][item.price] }}</span>
                  <span v-if="item.comment" class="detail-comment">"{{ item.comment }}"</span>
                </div>
              </td>
              <td class="col-gift">
                <template v-if="r.code">
                  <span :class="['gift-chip', r.code.status === 'redeemed' && 'gift-redeemed']">
                    {{ r.code.dishName }}{{ r.code.status === 'redeemed' ? ' (已核销)' : '' }}
                  </span>
                </template>
                <span v-else class="gift-none">未领取</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-sm">暂无评价记录</p>
      <div class="pager" v-if="total > 20">
        <button class="btn-page" :disabled="page <= 1" @click="page--; loadReviews()">上一页</button>
        <span class="page-info">第 {{ page }} / {{ Math.ceil(total / 20) }} 页</span>
        <button class="btn-page" :disabled="page >= Math.ceil(total / 20)" @click="page++; loadReviews()">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MultiSelect from 'primevue/multiselect'

interface GiftDish { dishId: string; name: string; price: number; quantity: number }
interface Settings { enabled: boolean; giftDishes: GiftDish[] }

const settings = ref<Settings>({ enabled: false, giftDishes: [] })
const availableDishes = ref<{ id: string; name: string; price: number }[]>([])
const selectedDishIds = ref<string[]>([])
const giftQuantity = ref(1)
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

async function addGiftDishes() {
  if (selectedDishIds.value.length === 0) return
  const res = await fetch('/api/admin/merchant')
  const m = await res.json()
  await fetch('/api/admin/reviews/gift-dishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: m.id, items: selectedDishIds.value.map((id) => ({ dishId: id, quantity: giftQuantity.value })) }),
  })
  selectedDishIds.value = []
  giftQuantity.value = 1
  await loadSettings()
}

async function updateQuantity(dish: GiftDish) {
  const res = await fetch('/api/admin/merchant')
  const m = await res.json()
  await fetch('/api/admin/reviews/gift-dishes/' + dish.dishId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: m.id, quantity: dish.quantity }),
  })
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
.review-page {
  font-family: 'Inter', sans-serif;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--on-surface);
}
.page-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-disabled);
}

.error-msg { color: #f74e22; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
.loading-msg { color: var(--text-secondary); font-size: 14px; margin-bottom: 16px; }

/* ===== Card ===== */
.card {
  background: var(--surface);
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border: 1px solid var(--border);
  overflow: hidden;
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--surface-container-low);
  border-bottom: 1px solid var(--border);
}
.card-title {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--on-surface);
}
.card-subtitle {
  font-size: 12px;
  color: var(--text-disabled);
}
.card-body {
  padding: 20px;
}

/* ===== Settings ===== */
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.settings-info { display: flex; flex-direction: column; gap: 2px; }
.settings-label { font-size: 14px; font-weight: 600; color: var(--on-surface); }
.settings-desc { font-size: 12px; color: var(--text-disabled); }
.toggle {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  border: none;
  background: #d1ccc7;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  padding: 0;
  flex-shrink: 0;
}
.toggle-on { background: #4aad4e; }
.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--surface);
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.toggle-on .toggle-knob { transform: translateX(20px); }

/* ===== Gift Controls ===== */
.gift-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.gift-select-wrap { flex: 1; min-width: 200px; }
.gift-select { width: 100%; }
.qty-input { width: 80px; }
.qty-inline { width: 70px; }

.form-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  background: field;
  color: fieldtext;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: #ff6b00; }

.btn-action {
  background: #ff6b00;
  color: var(--on-primary);
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-action:hover { background: #e55f00; }
.btn-action:disabled { opacity: 0.4; cursor: not-allowed; }

/* ===== Table ===== */
.table-wrap { overflow-x: auto; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-disabled);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-family: 'Plus Jakarta Sans', sans-serif;
  background: var(--surface-container-low);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.data-table td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.data-table tbody tr:hover { background: var(--surface-container-low); }
.col-name { font-weight: 600; color: var(--on-surface); }
.col-price { font-weight: 600; color: var(--on-surface); font-family: 'Plus Jakarta Sans', sans-serif; }
.col-time { white-space: nowrap; color: var(--text-secondary); font-size: 12px; }
.col-actions { text-align: right; white-space: nowrap; }
.col-detail { max-width: 400px; }
.col-gift { white-space: nowrap; }

.btn-icon {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 20px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.15s;
}
.btn-danger-icon { color: #f74e22; }
.btn-danger-icon:hover { background: rgb(255 76 55 / 16%); }

/* ===== Eval Summary ===== */
.eval-summary { display: flex; gap: 8px; font-size: 12px; font-weight: 600; }
.eval-good { color: #4aad4e; }
.eval-okay { color: #d97706; }
.eval-bad { color: #f74e22; }

/* ===== Review Detail ===== */
.review-detail-item { margin-bottom: 4px; line-height: 1.6; font-size: 13px; }
.detail-dish { font-weight: 600; margin-right: 6px; }
.detail-badge {
  display: inline-block;
  padding: 0 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 4px;
}
.badge-good { background: var(--tertiary-soft); color: #4aad4e; }
.badge-okay { background: var(--primary-soft); color: #a04100; }
.badge-bad  { background: rgb(255 76 55 / 16%); color: #f74e22; }
.detail-tag {
  display: inline-block;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--surface-container-low);
  font-size: 11px;
  color: var(--text-secondary);
  margin-right: 4px;
}
.detail-comment {
  display: block;
  font-size: 12px;
  color: var(--text-disabled);
  font-style: italic;
  margin-top: 2px;
}

/* ===== Gift Chips ===== */
.gift-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: var(--tertiary-soft);
  color: #4aad4e;
}
.gift-redeemed { background: var(--surface-container-high); color: var(--text-disabled); }
.gift-none { color: var(--text-disabled); font-size: 12px; }

/* ===== Pager ===== */
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--divider);
}
.btn-page {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.15s;
}
.btn-page:hover:not(:disabled) { border-color: #ff6b00; color: #ff6b00; }
.btn-page:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-secondary); }

.empty-sm { text-align: center; padding: 24px; color: var(--text-disabled); font-size: 13px; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; gap: 12px; align-items: flex-start; }
}
</style>
