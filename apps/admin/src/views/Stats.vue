<template>
  <div class="stats">
    <div class="page-header">
      <h2 class="page-title">销量统计</h2>
      <div class="header-tabs">
        <button :class="['tab-btn', activeTab === 'overview' && 'active']" @click="switchTab('overview')">经营概览</button>
        <button :class="['tab-btn', activeTab === 'normal' && 'active']" @click="switchTab('normal')">菜品统计</button>
        <button :class="['tab-btn', activeTab === 'alliance' && 'active']" @click="switchTab('alliance')">联盟商品</button>
        <button :class="['tab-btn', activeTab === 'orders' && 'active']" @click="switchTab('orders')">订单统计</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="quick-btns">
        <button :class="['quick-btn', quickRange === 'today' && 'active']" @click="setQuick('today')">今日</button>
        <button :class="['quick-btn', quickRange === 'yesterday' && 'active']" @click="setQuick('yesterday')">昨日</button>
        <button :class="['quick-btn', quickRange === 'week' && 'active']" @click="setQuick('week')">本周</button>
        <button :class="['quick-btn', quickRange === 'month' && 'active']" @click="setQuick('month')">本月</button>
        <button :class="['quick-btn', quickRange === 'all' && 'active']" @click="setQuick('all')">全部</button>
        <span class="nav-sep"></span>
        <button class="nav-btn" @click="shiftRange(navUnit, -1)"><span class="nav-arrow">‹</span> {{ navLabels[0] }}</button>
        <button class="nav-btn" @click="shiftRange(navUnit, 1)">{{ navLabels[1] }} <span class="nav-arrow">›</span></button>
      </div>
      <DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" showIcon class="date-picker"
        @update:modelValue="onDateChange" />
    </div>
    <div class="date-display" v-if="dateDisplayText()">
      📅 {{ dateDisplayText() }}
    </div>

    <!-- ==================== 经营概览 ==================== -->
    <template v-if="activeTab === 'overview'">
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-body">
            <span class="metric-label">总营收</span>
            <span class="metric-value">¥{{ fmtNum(overview?.summary.revenue) }}</span>
            <span class="metric-sub">
              菜品 <b>¥{{ fmtNum(overview?.summary.normalRevenue) }}</b>
              <span class="sub-sep">·</span>
              联盟 <b>¥{{ fmtNum(overview?.summary.allianceRevenue) }}</b>
            </span>
          </div>
          <span v-if="overview?.summary.revenueDelta != null" :class="['delta', overview.summary.revenueDelta >= 0 ? 'up' : 'down']">
            {{ overview.summary.revenueDelta >= 0 ? '↑' : '↓' }} {{ Math.abs(overview.summary.revenueDelta) }}%
          </span>
          <span v-else class="delta neutral">—</span>
        </div>
        <div class="metric-card">
          <div class="metric-body">
            <span class="metric-label">订单数</span>
            <span class="metric-value">{{ overview?.summary.orderCount ?? '—' }}</span>
          </div>
          <span v-if="overview?.summary.orderCountDelta != null" :class="['delta', overview.summary.orderCountDelta >= 0 ? 'up' : 'down']">
            {{ overview.summary.orderCountDelta >= 0 ? '↑' : '↓' }} {{ Math.abs(overview.summary.orderCountDelta) }}%
          </span>
          <span v-else class="delta neutral">—</span>
        </div>
        <div class="metric-card">
          <div class="metric-body">
            <span class="metric-label">客单价</span>
            <span class="metric-value">¥{{ fmtNum(overview?.summary.avgOrder) }}</span>
          </div>
          <span v-if="overview?.summary.avgOrderDelta != null" :class="['delta', overview.summary.avgOrderDelta >= 0 ? 'up' : 'down']">
            {{ overview.summary.avgOrderDelta >= 0 ? '↑' : '↓' }} {{ Math.abs(overview.summary.avgOrderDelta) }}%
          </span>
          <span v-else class="delta neutral">—</span>
        </div>
        <div class="metric-card">
          <div class="metric-body">
            <span class="metric-label">满减总额</span>
            <span class="metric-value">-¥{{ fmtNum(overview?.summary.fullReductionNormal) }}</span>
          </div>
        </div>
      </div>

      <div class="card" v-if="overview?.trend?.length">
        <h3 class="card-title">营收趋势</h3>
        <div class="chart-scroll">
          <div class="trend-chart">
            <div v-for="t in overview.trend" :key="t.day" class="trend-col">
              <span class="trend-val">¥{{ t.revenue }}</span>
              <div class="trend-bar-wrap">
                <div class="trend-bar" :style="{ height: barHeight(t.revenue) + '%' }"></div>
              </div>
              <span class="trend-label">{{ t.day }}</span>
              <span class="trend-weekday">{{ weekday(t.day) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="row-2col">
        <div class="card">
          <h3 class="card-title">分类占比</h3>
          <div class="cat-list" v-if="overview?.categoryShare?.length">
            <div v-for="(c, i) in overview.categoryShare" :key="c.name" class="cat-row">
              <span class="cat-color" :style="{ background: COLORS[i % COLORS.length] }"></span>
              <span class="cat-name">{{ c.name }}</span>
              <div class="cat-bar-bg"><div class="cat-bar" :style="{ width: c.percent + '%', background: COLORS[i % COLORS.length] }"></div></div>
              <span class="cat-val">{{ c.percent }}%</span>
            </div>
          </div>
          <p v-else class="empty-sm">暂无数据</p>
        </div>
        <div class="card">
          <h3 class="card-title">Top 10 菜品</h3>
          <div class="top-list" v-if="overview?.topDishes?.length">
            <div v-for="(d, i) in overview.topDishes" :key="d.dishId" class="top-row">
              <span :class="['top-rank', i < 3 && 'top3']">{{ i + 1 }}</span>
              <div class="top-info">
                <span class="top-name">{{ d.name }}<span v-if="d.alliance" class="alliance-badge">联盟</span></span>
                <span class="top-meta">{{ d.quantity }}份 · ¥{{ d.revenue.toFixed(2) }}</span>
              </div>
            </div>
          </div>
          <p v-else class="empty-sm">暂无数据</p>
        </div>
      </div>
    </template>

    <!-- ==================== 菜品统计 / 联盟商品 ==================== -->
    <template v-if="activeTab === 'normal' || activeTab === 'alliance'">
      <div class="card">
        <table class="stats-table" v-if="items.length">
          <thead>
            <tr>
              <th class="col-check"><input type="checkbox" :checked="selected.size === items.length && items.length > 0" @change="toggleAll" /></th>
              <th class="col-rank">#</th>
              <th class="col-name">菜品</th>
              <th class="col-qty">销量</th>
              <th class="col-revenue">收入</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in items" :key="item.dishId" :class="{ selected: selected.has(item.dishId) }" @click="toggleOne(item.dishId)">
              <td class="col-check" @click.stop><input type="checkbox" :checked="selected.has(item.dishId)" @change="toggleOne(item.dishId)" /></td>
              <td class="col-rank">{{ i + 1 }}</td>
              <td class="col-name">{{ item.name }}</td>
              <td class="col-qty">{{ item.totalQuantity }}</td>
              <td class="col-revenue">¥{{ item.totalRevenue.toFixed(2) }}</td>
            </tr>
            <tr class="fr-row" v-if="summary.totalFullReduction > 0">
              <td class="col-check"></td>
              <td class="col-rank"></td>
              <td class="col-name">满减</td>
              <td class="col-qty">—</td>
              <td class="col-revenue">-¥{{ summary.totalFullReduction.toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot v-if="selected.size > 0">
            <tr>
              <td class="col-check"></td>
              <td class="col-rank"></td>
              <td class="col-name">小计（{{ selected.size }}项）</td>
              <td class="col-qty">{{ subtotal.qty }}</td>
              <td class="col-revenue">¥{{ subtotal.net.toFixed(2) }}</td>
            </tr>
          </tfoot>
        </table>
        <p v-else class="empty">{{ loaded ? '该时段暂无订单数据' : '加载中...' }}</p>
      </div>
    </template>

    <!-- ==================== 订单统计 ==================== -->
    <template v-if="activeTab === 'orders'">
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-body">
            <span class="metric-label">总营收</span>
            <span class="metric-value">¥{{ fmtNum(overview?.summary.revenue) }}</span>
          </div>
          <span v-if="overview?.summary.revenueDelta != null" :class="['delta', overview.summary.revenueDelta >= 0 ? 'up' : 'down']">
            {{ overview.summary.revenueDelta >= 0 ? '↑' : '↓' }} {{ Math.abs(overview.summary.revenueDelta) }}%
          </span>
          <span v-else class="delta neutral">—</span>
        </div>
        <div class="metric-card">
          <div class="metric-body">
            <span class="metric-label">订单数</span>
            <span class="metric-value">{{ overview?.summary.orderCount ?? '—' }}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-body">
            <span class="metric-label">堂食占比</span>
            <span class="metric-value">{{ dineInPct }}%</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-body">
            <span class="metric-label">外带占比</span>
            <span class="metric-value">{{ takeawayPct }}%</span>
          </div>
        </div>
      </div>

      <div class="row-2col">
        <div class="card">
          <h3 class="card-title">订单类型</h3>
          <div class="share-list" v-if="overview?.orderTypeShare?.length">
            <div v-for="(t, i) in overview.orderTypeShare" :key="t.name" class="share-row">
              <span class="share-color" :style="{ background: COLORS[i % COLORS.length] }"></span>
              <span class="share-name">{{ orderTypeLabel(t.name) }}</span>
              <div class="share-bar-bg"><div class="share-bar" :style="{ width: sharePct(t.count, overview.summary.orderCount) + '%', background: COLORS[i % COLORS.length] }"></div></div>
              <span class="share-val">{{ t.count }}单</span>
            </div>
          </div>
          <p v-else class="empty-sm">暂无数据</p>
        </div>
        <div class="card">
          <h3 class="card-title">支付方式</h3>
          <div class="share-list" v-if="overview?.paymentShare?.length">
            <div v-for="(p, i) in overview.paymentShare" :key="p.name" class="share-row">
              <span class="share-color" :style="{ background: COLORS[i % COLORS.length] }"></span>
              <span class="share-name">{{ paymentLabel(p.name) }}</span>
              <div class="share-bar-bg"><div class="share-bar" :style="{ width: sharePct(p.count, overview.summary.orderCount) + '%', background: COLORS[i % COLORS.length] }"></div></div>
              <span class="share-val">¥{{ p.amount.toFixed(0) }}</span>
            </div>
          </div>
          <p v-else class="empty-sm">暂无数据</p>
        </div>
      </div>

      <div class="card" v-if="overview?.hourlyFlow?.length">
        <h3 class="card-title">时段客流</h3>
        <div class="chart-scroll">
          <div class="hourly-chart">
            <div v-for="h in overview.hourlyFlow" :key="h.hour" class="hourly-col">
              <span class="hourly-val">{{ h.orderCount }}</span>
              <div class="hourly-bar-wrap">
                <div class="hourly-bar" :style="{ height: hourlyBarHeight(h.orderCount) + '%' }"></div>
              </div>
              <span class="hourly-label">{{ h.hour }}时</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

interface DishSales {
  dishId: string
  name: string
  totalQuantity: number
  totalRevenue: number
}

interface OverviewSummary {
  orderCount: number
  orderCountDelta: number | null
  revenue: number
  revenueDelta: number | null
  avgOrder: number
  avgOrderDelta: number | null
  itemQty: number
  allianceRevenue: number
  normalRevenue: number
  fullReductionNormal: number
}

interface TrendItem { day: string; revenue: number; orderCount: number }
interface CategoryItem { name: string; revenue: number; count: number; percent: number }
interface PaymentItem { name: string; count: number; amount: number }
interface OrderTypeItem { name: string; count: number; amount: number }
interface HourlyItem { hour: number; orderCount: number; revenue: number }
interface TopDish { dishId: string; name: string; quantity: number; revenue: number; alliance: boolean }

interface OverviewData {
  summary: OverviewSummary
  trend: TrendItem[]
  categoryShare: CategoryItem[]
  paymentShare: PaymentItem[]
  orderTypeShare: OrderTypeItem[]
  hourlyFlow: HourlyItem[]
  topDishes: TopDish[]
}

const COLORS = ['#ff6b00', '#4aad4e', '#3b82f6', '#a04100', '#8b5cf6', '#f59e0b', '#ba1a1a']

const activeTab = ref<'overview' | 'normal' | 'alliance' | 'orders'>('normal')
const overview = ref<OverviewData | null>(null)
const items = ref<DishSales[]>([])
const summary = ref<{ totalFullReduction: number }>({ totalFullReduction: 0 })
const loaded = ref(false)
const quickRange = ref('today')
const dateRange = ref<[Date | null, Date | null] | undefined>()
const selected = ref<Set<string>>(new Set())

const subtotal = computed(() => {
  let qty = 0
  let rev = 0
  for (const item of items.value) {
    if (selected.value.has(item.dishId)) {
      qty += item.totalQuantity
      rev += item.totalRevenue
    }
  }
  return { qty, rev, net: rev - summary.value.totalFullReduction }
})

const maxTrendRevenue = computed(() => {
  const trend = overview.value?.trend ?? []
  return Math.max(...trend.map(t => t.revenue), 1)
})

const maxHourlyCount = computed(() => {
  const flow = overview.value?.hourlyFlow ?? []
  return Math.max(...flow.map(h => h.orderCount), 1)
})

const navUnit = computed(() => {
  const r = dateRange.value
  if (r && r[0] && r[1]) {
    const days = Math.round((new Date(r[1]).getTime() - new Date(r[0]).getTime()) / 86400000)
    if (days <= 1) return 'day'
    if (days <= 8) return 'week'
    if (days <= 35) return 'month'
    return 'year'
  }
  if (quickRange.value === 'week') return 'week'
  if (quickRange.value === 'month' || quickRange.value === 'all') return 'month'
  return 'day'
})

const navLabels = computed(() => {
  const u = navUnit.value
  const unitMap: Record<string, [string, string]> = { day: ['上一日', '下一日'], week: ['上一周', '下一周'], month: ['上一月', '下一月'], year: ['上一年', '下一年'] }
  return unitMap[u]
})

const dineInPct = computed(() => {
  if (!overview.value) return 0
  const { orderTypeShare, summary } = overview.value
  const dineIn = orderTypeShare.find(t => t.name === 'dine-in')
  return dineIn ? ((dineIn.count / summary.orderCount) * 100).toFixed(0) : '0'
})

const takeawayPct = computed(() => {
  if (!overview.value) return 0
  const { orderTypeShare, summary } = overview.value
  const takeaway = orderTypeShare.find(t => t.name === 'takeaway')
  return takeaway ? ((takeaway.count / summary.orderCount) * 100).toFixed(0) : '0'
})

function fmtNum(v: number | null | undefined) {
  return v != null ? v.toFixed(2) : '—'
}

function formatDate(d: Date | null) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

function weekday(dayStr: string) {
  const now = new Date()
  const [m, d] = dayStr.split('-').map(Number)
  const dt = new Date(now.getFullYear(), m - 1, d)
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()]
}

function dateDisplayText() {
  const r = dateRange.value
  if (!r || !r[0] || !r[1]) return ''
  const s = new Date(r[0])
  const e = new Date(r[1])
  const sameDay = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate()
  if (sameDay) return formatDate(s)
  return `${formatDate(s)} — ${formatDate(e)}`
}

function barHeight(revenue: number) {
  return (revenue / maxTrendRevenue.value) * 95
}

function hourlyBarHeight(count: number) {
  return (count / maxHourlyCount.value) * 95
}

function sharePct(count: number, total: number) {
  return total > 0 ? (count / total) * 100 : 0
}

function paymentLabel(name: string) {
  const map: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', cash: '现金', '': '未支付' }
  return map[name] ?? name
}

function orderTypeLabel(name: string) {
  const map: Record<string, string> = { 'dine-in': '堂食', takeaway: '外带' }
  return map[name] ?? name
}

function toggleAll() {
  if (selected.value.size === items.value.length) {
    selected.value = new Set()
  } else {
    selected.value = new Set(items.value.map(i => i.dishId))
  }
}

function toggleOne(dishId: string) {
  const s = new Set(selected.value)
  if (s.has(dishId)) { s.delete(dishId) } else { s.add(dishId) }
  selected.value = s
}

function fmt(d: Date) {
  return d.toISOString()
}

function buildParams() {
  const [s, e] = dateRange.value ?? []
  const params = new URLSearchParams()
  if (s) {
    params.set('startDate', fmt(s))
    const end = quickRange.value === '' ? (e ?? s) : e!
    params.set('endDate', fmt(end))
  }
  return params.toString()
}

function switchTab(tab: typeof activeTab.value) {
  activeTab.value = tab
  fetchStats()
}

function setQuick(key: string) {
  quickRange.value = key
  const now = new Date()
  let start: Date | null = null
  let end: Date | null = null

  if (key === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    end = new Date(start.getTime() + 86400000)
  } else if (key === 'yesterday') {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    start = new Date(end.getTime() - 86400000)
  } else if (key === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
    end = new Date(start.getTime() + 7 * 86400000)
  } else if (key === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }

  if (start && end) {
    dateRange.value = [start, end]
  } else {
    const endD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const startD = new Date(endD.getTime() - 90 * 86400000)
    dateRange.value = [startD, endD]
  }
  fetchStats()
}

function onDateChange(value: (Date | null)[] | undefined) {
  quickRange.value = ''
  if (!value || value.length === 0) {
    dateRange.value = undefined
    fetchStats()
    return
  }

  const [start, end] = value
  dateRange.value = [start ?? null, end ?? null]

  if (start && !end) return
  fetchStats()
}

function shiftRange(unit: 'day' | 'week' | 'month' | 'year', dir: -1 | 1) {
  const cur = dateRange.value
  let start: Date
  let end: Date

  if (cur && cur[0] && cur[1]) {
    start = new Date(cur[0])
    end = new Date(cur[1])
  } else {
    start = new Date()
    end = new Date()
  }

  if (unit === 'day') {
    const d = dir * 86400000
    start = new Date(start.getTime() + d)
    end = new Date(end.getTime() + d)
  } else if (unit === 'week') {
    const d = dir * 7 * 86400000
    start = new Date(start.getTime() + d)
    end = new Date(end.getTime() + d)
  } else if (unit === 'month') {
    start = new Date(start.getFullYear(), start.getMonth() + dir, start.getDate())
    end = new Date(end.getFullYear(), end.getMonth() + dir, end.getDate())
  } else if (unit === 'year') {
    start = new Date(start.getFullYear() + dir, start.getMonth(), start.getDate())
    end = new Date(end.getFullYear() + dir, end.getMonth(), end.getDate())
  }

  quickRange.value = ''
  dateRange.value = [start, end]
  fetchStats()
}

let lastOverviewQs = ''
async function fetchStats() {
  loaded.value = false
  const qs = buildParams()
  const url = qs ? '?' + qs : ''

  try {
    if (activeTab.value === 'overview' || activeTab.value === 'orders') {
      if (qs !== lastOverviewQs || !overview.value) {
        const res = await fetch(`/api/admin/stats/overview-analysis${url}`)
        overview.value = await res.json()
        lastOverviewQs = qs
      }
    } else {
      overview.value = null
      lastOverviewQs = ''
      const endpoint = activeTab.value === 'alliance'
        ? '/api/admin/stats/alliance-dish-sales'
        : '/api/admin/stats/dish-sales'
      const res = await fetch(`${endpoint}${url}`)
      const data = await res.json()
      items.value = data.items ?? []
      summary.value = data.summary ?? { totalFullReduction: 0 }
      selected.value = new Set(items.value.map(i => i.dishId))
    }
  } catch { /* ignore */ }

  loaded.value = true
}

const route = useRoute()
const range = route.query.range as string | undefined
setQuick(range === 'all' ? 'all' : 'today')
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');

.stats {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

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
.header-tabs {
  display: flex;
  gap: 4px;
}
.tab-btn {
  padding: 6px 16px;
  border: 1px solid #e0d8d0;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: #666;
  transition: all 0.15s;
  font-family: 'Inter', sans-serif;
}
.tab-btn.active {
  background: #ff6b00;
  color: #fff;
  border-color: #ff6b00;
}
.tab-btn:hover:not(.active) {
  border-color: #ff6b00;
  color: #ff6b00;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.quick-btns { display: flex; gap: 6px; }
.quick-btn {
  padding: 6px 14px;
  border: 1px solid #e0d8d0;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #666;
  transition: all 0.15s;
}
.quick-btn.active {
  background: #ff6b00;
  color: #fff;
  border-color: #ff6b00;
}
.quick-btn:hover:not(.active) {
  border-color: #ff6b00;
  color: #ff6b00;
}
.nav-sep {
  width: 1px;
  background: #e0d8d0;
  margin: 0 2px;
}
.nav-btn {
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid #e0d8d0;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  white-space: nowrap;
  gap: 2px;
}
.nav-btn:hover {
  border-color: #ff6b00;
  color: #ff6b00;
  background: #fff8f3;
}
.nav-arrow {
  font-size: 16px;
  line-height: 1;
  font-weight: 700;
}
.date-display {
  display: inline-block;
  margin-bottom: 12px;
  padding: 6px 14px;
  background: #fff8f3;
  border: 1px solid #ffe0c2;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #a04100;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.date-picker { margin-left: auto; }

.card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 16px;
  overflow: hidden;
}
.card-title {
  margin: 0 0 16px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}
.empty {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}
.empty-sm {
  text-align: center;
  padding: 24px;
  color: #bbb;
  font-size: 13px;
}

/* ===== Metric Cards ===== */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.metric-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  height: 100%;
  box-sizing: border-box;
}
.metric-body { flex: 1; min-width: 0; }
.metric-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
  font-family: 'Inter', sans-serif;
}
.metric-value {
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-sub {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.metric-sub b {
  color: #1a1a1a;
  font-weight: 600;
}
.sub-sep {
  margin: 0 2px;
  color: #ccc;
}
.delta {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}
.delta.up { background: rgba(74,173,78,0.1); color: #4aad4e; }
.delta.down { background: rgba(186,26,26,0.1); color: #ba1a1a; }
.delta.neutral { background: #f5f5f5; color: #bbb; }

/* ===== Trend Chart ===== */
.chart-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #d4a574 #f5f0eb;
  max-width: calc(100vw - 350px);
}

.chart-scroll::-webkit-scrollbar {
  height: 6px;
}

.chart-scroll::-webkit-scrollbar-track {
  background: #f5f0eb;
  border-radius: 3px;
}

.chart-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, #d4a574, #ff6b00);
  border-radius: 3px;
}

.chart-scroll::-webkit-scrollbar-thumb:hover {
  background: #ff6b00;
}

.trend-chart {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  height: 180px;
  padding-bottom: 20px;
  width: max-content;
  min-width: 100%;
}
.trend-col {
  flex: 0 0 36px;
  min-width: 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.trend-val {
  font-size: 10px;
  color: #999;
  margin-bottom: 4px;
  white-space: nowrap;
  font-family: 'Inter', sans-serif;
}
.trend-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.trend-bar {
  width: 100%;
  background: linear-gradient(180deg, #ff6b00 0%, #ff8a33 100%);
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
}
.trend-label {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
  font-family: 'Inter', sans-serif;
}
.trend-weekday {
  font-size: 9px;
  color: #bbb;
  font-family: 'Inter', sans-serif;
}

/* ===== Category Share ===== */
.cat-list { display: flex; flex-direction: column; gap: 10px; }
.cat-row { display: flex; align-items: center; gap: 8px; }
.cat-color { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.cat-name { width: 72px; font-size: 13px; color: #1a1a1a; font-weight: 500; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat-bar-bg {
  flex: 1;
  height: 8px;
  background: #f0ebe5;
  border-radius: 4px;
  overflow: hidden;
}
.cat-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.cat-val {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: #999;
  font-family: 'Inter', sans-serif;
  flex-shrink: 0;
}

/* ===== Top Dishes ===== */
.top-list { display: flex; flex-direction: column; gap: 8px; }
.top-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.top-rank {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #999;
  background: #f5f5f5;
  flex-shrink: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.top-rank.top3 {
  background: #ff6b00;
  color: #fff;
}
.top-info { flex: 1; min-width: 0; }
.top-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.alliance-badge {
  font-size: 10px;
  background: rgba(59,130,246,0.1);
  color: #3b82f6;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 6px;
  font-weight: 600;
  vertical-align: middle;
}
.top-meta {
  display: block;
  font-size: 12px;
  color: #999;
  font-family: 'Inter', sans-serif;
}

/* ===== 2-Column Layout ===== */
.row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ===== Order Stats Share ===== */
.share-list { display: flex; flex-direction: column; gap: 10px; }
.share-row { display: flex; align-items: center; gap: 8px; }
.share-color { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.share-name { width: 64px; font-size: 13px; color: #1a1a1a; font-weight: 500; flex-shrink: 0; }
.share-bar-bg {
  flex: 1;
  height: 8px;
  background: #f0ebe5;
  border-radius: 4px;
  overflow: hidden;
}
.share-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.share-val {
  width: 50px;
  text-align: right;
  font-size: 12px;
  color: #999;
  font-family: 'Inter', sans-serif;
  flex-shrink: 0;
}

/* ===== Hourly Flow ===== */
.hourly-chart {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: 160px;
  width: max-content;
  min-width: 100%;
}
.hourly-col {
  flex: 0 0 28px;
  min-width: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.hourly-val {
  font-size: 10px;
  color: #999;
  margin-bottom: 2px;
  font-family: 'Inter', sans-serif;
}
.hourly-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.hourly-bar {
  width: 100%;
  background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%);
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
}
.hourly-label {
  font-size: 9px;
  color: #bbb;
  margin-top: 2px;
  font-family: 'Inter', sans-serif;
}

/* ===== Table (dish/alliance tabs) ===== */
.stats-table { width: 100%; border-collapse: collapse; }
.stats-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #999;
  background: #f9f7f5;
  border-bottom: 1px solid #f0ebe5;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: 'Inter', sans-serif;
}
.stats-table td {
  padding: 12px 16px;
  font-size: 14px;
  border-bottom: 1px solid #f5f2ef;
}
.stats-table tr:last-child td { border-bottom: none; }
.stats-table tbody tr { cursor: pointer; transition: background 0.1s; }
.stats-table tbody tr:hover td { background: #fdf8f5; }
.stats-table tbody tr.selected td { background: #fff7f0; }
.stats-table tfoot td {
  font-weight: 700;
  background: #fff3e8;
  border-top: 2px solid #ff6b00;
  color: #a04100;
}
.col-check { width: 36px; text-align: center; }
.col-check input { cursor: pointer; }
.col-rank { width: 48px; color: #999; }
.col-qty { width: 80px; font-weight: 700; color: #ff6b00; }
.col-revenue { width: 120px; font-weight: 600; }
.fr-row td { color: #ba1a1a; background: #fff7f7; }
.fr-row .col-name { font-weight: 600; }
.fr-row .col-qty { color: #999; font-weight: 400; }

@media (max-width: 768px) {
  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .row-2col { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .header-tabs { flex-wrap: wrap; }
  .filter-bar { flex-direction: column; align-items: flex-start; }
  .quick-btns { flex-wrap: wrap; }
  .date-display { width: 100%; }
  .chart-scroll { max-width: calc(100vw - 32px); }
}

@media (max-width: 480px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
  .metric-card {
    padding: 12px 16px;
  }
}
</style>
