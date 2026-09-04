<template>
  <div class="cost-profit">
    <div class="page-header">
      <h2 class="page-title">成本利润核算</h2>
    </div>

    <div class="filter-bar">
      <div class="view-toggle">
        <button :class="['toggle-btn', viewMode === 'daily' && 'active']" @click="viewMode = 'daily'; loadData()">按天</button>
        <button :class="['toggle-btn', viewMode === 'weekly' && 'active']" @click="viewMode = 'weekly'; loadData()">按周</button>
      </div>
      <DatePicker v-model="selectedDate" dateFormat="yy-mm-dd" :manualInput="false" showIcon class="date-picker" @update:modelValue="loadData" />
      <button class="refresh-btn" @click="loadData">查询</button>
    </div>

    <div class="summary-row">
      <div class="summary-card rev">
        <span class="summary-label">总营收</span>
        <span class="summary-value">¥{{ report?.summary.totalRevenue.toFixed(2) ?? '0.00' }}</span>
      </div>
      <div class="summary-card cost">
        <span class="summary-label">总成本</span>
        <span class="summary-value">¥{{ report?.summary.totalCost.toFixed(2) ?? '0.00' }}</span>
      </div>
      <div class="summary-card profit">
        <span class="summary-label">毛利</span>
        <span class="summary-value">¥{{ report?.summary.grossProfit.toFixed(2) ?? '0.00' }}</span>
      </div>
      <div class="summary-card margin">
        <span class="summary-label">毛利率</span>
        <span class="summary-value" :class="{ negative: (report?.summary.grossMargin ?? 0) < 0 }">{{ report?.summary.grossMargin ?? 0 }}%</span>
      </div>
      <div class="summary-card waste">
        <span class="summary-label">损耗</span>
        <span class="summary-value">{{ report?.summary.totalWaste ?? 0 }}串 <small>{{ report?.summary.wasteRate ?? 0 }}%</small></span>
      </div>
      <div class="summary-card fr">
        <span class="summary-label">满减</span>
        <span class="summary-value">¥{{ report?.summary.totalFullReduction?.toFixed(2) ?? '0.00' }}</span>
      </div>
    </div>

    <div v-if="viewMode === 'daily'" class="card">
      <div class="card-header">
          <h3>成本录入 <small class="hint">填写当天各菜品的重量、串数、单价，自动算出实际成本</small></h3>
        <button class="save-btn" :disabled="saving" @click="saveEntries">{{ saving ? '保存中...' : '保存' }}</button>
      </div>
      <div class="table-wrap">
        <table class="cost-table">
          <thead>
            <tr>
              <th class="col-name">菜品</th>
              <th class="col-weight">备料重量(g)</th>
              <th class="col-skewer">串数</th>
              <th class="col-cost">单价(¥/kg)</th>
              <th class="col-cost">实际成本(¥)</th>
              <th class="col-cost">每串成本(¥)</th>
              <th class="col-notes">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in costEntries" :key="item.dishId">
              <td class="col-name">{{ item.name }}</td>
              <td class="col-weight"><input v-model.number="item.weight" type="number" min="0" step="1" class="cell-input" /></td>
              <td class="col-skewer"><input v-model.number="item.skewerCount" type="number" min="0" step="1" class="cell-input" /></td>
              <td class="col-cost"><input v-model.number="item.unitCost" type="number" min="0" step="0.01" class="cell-input" /></td>
              <td class="col-cost"><span>{{ calcActualCost(item) }}</span></td>
              <td class="col-cost"><span>{{ calcCostPerSkewer(item) }}</span></td>
              <td class="col-notes"><input v-model="item.notes" class="cell-input cell-input-text" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>毛利明细 <small class="hint">{{ viewMode === 'daily' ? '当日' : '当周' }}各菜品营收与毛利</small></h3>
      </div>
      <div class="table-wrap">
        <table class="profit-table" v-if="report?.dishes.length">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-name">菜品</th>
              <th class="col-price">实际均价</th>
              <th class="col-qty">销量</th>
              <th class="col-waste">过期</th>
              <th class="col-waste">自吃</th>
              <th class="col-waste">赠品</th>
              <th class="col-revenue">营收</th>
              <th class="col-cost">成本</th>
              <th class="col-cost">均价(¥/kg)</th>
              <th class="col-cost">每串成本(¥)</th>
              <th class="col-margin">损耗率</th>
              <th class="col-profit">毛利</th>
              <th class="col-margin">毛利率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in report.dishes" :key="d.dishId">
              <td class="col-rank">{{ i + 1 }}</td>
              <td class="col-name">{{ d.name }}</td>
              <td class="col-price">¥{{ d.actualAvgPrice > 0 ? d.actualAvgPrice.toFixed(2) : d.price.toFixed(2) }}</td>
              <td class="col-qty">{{ d.totalQuantity }}</td>
              <td class="col-waste">
                <template v-if="viewMode === 'daily' && entryFor(d)">
                  <input v-model.number="entryFor(d)!.wasteExpired" type="number" min="0" step="1" class="cell-input cell-input-waste" />
                </template>
                <template v-else>{{ d.wasteExpired }}</template>
              </td>
              <td class="col-waste">
                <template v-if="viewMode === 'daily' && entryFor(d)">
                  <input v-model.number="entryFor(d)!.wasteStaff" type="number" min="0" step="1" class="cell-input cell-input-waste" />
                </template>
                <template v-else>{{ d.wasteStaff }}</template>
              </td>
              <td class="col-waste">
                <template v-if="viewMode === 'daily' && entryFor(d)">
                  <input v-model.number="entryFor(d)!.wasteGiveaway" type="number" min="0" step="1" class="cell-input cell-input-waste" />
                </template>
                <template v-else>{{ d.wasteGiveaway }}</template>
              </td>
              <td class="col-revenue">¥{{ d.totalRevenue.toFixed(2) }}</td>
              <td class="col-cost">¥{{ d.totalCost.toFixed(2) }}</td>
              <td class="col-cost">{{ d.avgUnitCost.toFixed(2) }}</td>
              <td class="col-cost">¥{{ d.costPerSkewer.toFixed(2) }}</td>
              <td class="col-margin" :class="{ negative: (wasteTotal(d) ?? d.totalWaste) > 0 }">{{ viewMode === 'daily' ? wasteRate(d) : d.wasteRate }}%</td>
              <td class="col-profit" :class="{ negative: d.grossProfit < 0 }">¥{{ d.grossProfit.toFixed(2) }}</td>
              <td class="col-margin" :class="{ negative: d.grossMargin < 0 }">{{ d.grossMargin }}%</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">{{ loaded ? '该时段暂无数据' : '加载中...' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

interface CostEntry {
  dishId: string
  name: string
  price: number
  actualAvgPrice: number
  totalQuantity: number
  totalRevenue: number
  weight: number | null
  skewerCount: number | null
  unitCost: number | null
  totalCost: number | null
  costPerSkewer: number
  wasteExpired: number
  wasteStaff: number
  wasteGiveaway: number
  notes: string
}

interface DishProfit {
  dishId: string
  name: string
  price: number
  actualAvgPrice: number
  totalQuantity: number
  totalConsumption: number
  totalRevenue: number
  totalCost: number
  avgUnitCost: number
  costPerSkewer: number
  wasteExpired: number
  wasteStaff: number
  wasteGiveaway: number
  totalWaste: number
  wasteRate: number
  grossProfit: number
  grossMargin: number
}

interface ProfitReport {
  dishes: DishProfit[]
  summary: { totalRevenue: number; totalCost: number; grossProfit: number; grossMargin: number; totalWaste: number; wasteRate: number; totalFullReduction?: number }
  dateRange: { from: string; to: string }
}

const viewMode = ref<'daily' | 'weekly'>('daily')
const selectedDate = ref<Date>(new Date())
const costEntries = ref<CostEntry[]>([])
const report = ref<ProfitReport | null>(null)
const saving = ref(false)
const loaded = ref(false)
const merchantId = ref('')
const route = useRoute()

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekRange(date: Date): { from: string; to: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: fmtDate(monday), to: fmtDate(sunday) }
}

async function loadData() {
  loaded.value = false
  if (!merchantId.value) return
  const dateStr = fmtDate(selectedDate.value)

  try {
    if (viewMode.value === 'daily') {
      const [entriesRes, reportRes] = await Promise.all([
        fetch(`/api/admin/cost-entries?date=${dateStr}&merchantId=${merchantId.value}`),
        fetch(`/api/admin/cost-profit-report?from=${dateStr}&to=${dateStr}&merchantId=${merchantId.value}`),
      ])
      if (entriesRes.ok) costEntries.value = await entriesRes.json()
      if (reportRes.ok) report.value = await reportRes.json()
    } else {
      const { from, to } = getWeekRange(selectedDate.value)
      const reportRes = await fetch(`/api/admin/cost-profit-report?from=${from}&to=${to}&merchantId=${merchantId.value}`)
      if (reportRes.ok) report.value = await reportRes.json()
    }
  } catch {}
  loaded.value = true
}

function calcActualCost(item: CostEntry): string {
  if (item.weight && item.unitCost) {
    return `¥${((item.weight * item.unitCost) / 1000).toFixed(2)}`
  }
  return '-'
}

function calcCostPerSkewer(item: CostEntry): string {
  if (item.weight && item.unitCost && item.skewerCount) {
    return `¥${(((item.weight * item.unitCost) / 1000) / item.skewerCount).toFixed(2)}`
  }
  return '-'
}

function entryFor(d: DishProfit): CostEntry | undefined {
  return costEntries.value.find(e => e.dishId === d.dishId)
}

function wasteTotal(d: DishProfit): number {
  const e = entryFor(d)
  return e ? (e.wasteExpired ?? 0) + (e.wasteStaff ?? 0) + (e.wasteGiveaway ?? 0) : d.totalWaste
}

function wasteRate(d: DishProfit): string {
  const e = entryFor(d)
  if (e && e.skewerCount && e.skewerCount > 0) {
    const total = (e.wasteExpired ?? 0) + (e.wasteStaff ?? 0) + (e.wasteGiveaway ?? 0)
    return ((total / e.skewerCount) * 100).toFixed(1)
  }
  return d.wasteRate.toFixed(1)
}

async function saveEntries() {
  saving.value = true
  const dateStr = fmtDate(selectedDate.value)
  try {
    await fetch('/api/admin/cost-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, entries: costEntries.value.map(({ actualAvgPrice, totalQuantity, totalRevenue, costPerSkewer, ...e }) => e) }),
    })
    await loadData()
  } catch {}
  saving.value = false
}

onMounted(async () => {
  try {
    const res = await fetch('/api/admin/merchant')
    const m = await res.json()
    if (m?.id) merchantId.value = m.id
  } catch {}
  const mode = route.query.mode as string | undefined
  if (mode === 'weekly') viewMode.value = 'weekly'
  loadData()
})
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }

.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.view-toggle { display: flex; background: var(--surface-container); border-radius: 8px; padding: 2px; }
.toggle-btn { padding: 6px 16px; border: none; border-radius: 6px; background: transparent; font-size: 13px; cursor: pointer;   color: var(--text-secondary); transition: all 0.15s; }
.toggle-btn.active {   background: var(--surface); color: var(--p-primary-color, #FF6B00); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.date-picker { }
.refresh-btn { padding: 6px 16px; border: 1px solid var(--p-primary-color, #FF6B00); border-radius: 8px; background: var(--p-primary-color, #FF6B00); color: var(--on-primary); font-size: 13px; cursor: pointer; }

.summary-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.summary-card {   background: var(--surface); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.summary-label { display: block; font-size: 12px;   color: var(--text-disabled); margin-bottom: 4px; }
.summary-value { font-size: 24px; font-weight: 700; }
.summary-card.rev .summary-value { color: var(--p-primary-color, #FF6B00); }
.summary-card.cost .summary-value { color: #e74c3c; }
.summary-card.profit .summary-value { color: #27ae60; }
.summary-card.margin .summary-value { font-size: 28px; color: var(--p-primary-color, #FF6B00); }
.summary-card.waste .summary-value { font-size: 20px; }
.summary-card.waste .summary-value small { font-size: 14px; color: #e74c3c; margin-left: 4px; }
.summary-card.fr .summary-value { font-size: 24px; color: #e67e22; }
.summary-value.negative { color: #e74c3c !important; }

.card {   background: var(--surface); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid var(--divider); }
.card-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
.hint { font-weight: 400;   color: var(--text-disabled); font-size: 12px; }
.table-wrap { overflow-x: auto; }
.save-btn { padding: 6px 20px; border: none; border-radius: 8px; background: var(--p-primary-color, #FF6B00); color: var(--on-primary); font-size: 13px; font-weight: 600; cursor: pointer; }
.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.cost-table, .profit-table { width: 100%; border-collapse: collapse; }
.cost-table th, .profit-table th { text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--surface-container-low); border-bottom: 1px solid var(--divider); white-space: nowrap; }
.cost-table td, .profit-table td { padding: 8px 12px; font-size: 14px; border-bottom: 1px solid var(--surface-container-low); }
.cost-table tbody tr:hover td, .profit-table tbody tr:hover td { background: var(--surface-container-low); }
.cell-input { width: 80px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; text-align: right; }
.cell-input:focus { outline: none; border-color: var(--p-primary-color, #FF6B00); }
.cell-input-text { width: 100px; text-align: left; }
.col-name { min-width: 100px; font-weight: 600; }
.col-rank { width: 36px;   color: var(--text-disabled); }
.col-price, .col-qty { width: 70px; }
.col-weight, .col-skewer, .col-cost, .col-notes { width: 90px; }
.col-revenue, .col-profit { width: 100px; font-weight: 600; }
.col-waste { width: 50px; text-align: center; font-size: 12px;   color: var(--text-disabled); }
.cell-input-waste { width: 44px; text-align: center; }
.col-profit.negative, .col-margin.negative { color: #e74c3c; }
.col-margin { width: 70px; font-weight: 600; color: var(--p-primary-color, #FF6B00); }
.empty { text-align: center; padding: 40px;   color: var(--text-disabled); font-size: 14px; }
</style>