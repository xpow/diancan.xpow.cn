<template>
  <div class="stats">
    <div class="page-header">
      <h2 class="page-title">菜品销量统计</h2>
    </div>

    <div class="filter-bar">
      <div class="quick-btns">
        <button :class="['quick-btn', quickRange === 'today' && 'active']" @click="setQuick('today')">今日</button>
        <button :class="['quick-btn', quickRange === 'yesterday' && 'active']" @click="setQuick('yesterday')">昨日</button>
        <button :class="['quick-btn', quickRange === 'week' && 'active']" @click="setQuick('week')">本周</button>
        <button :class="['quick-btn', quickRange === 'month' && 'active']" @click="setQuick('month')">本月</button>
        <button :class="['quick-btn', quickRange === 'all' && 'active']" @click="setQuick('all')">全部</button>
      </div>
      <DatePicker v-model="dateRange" selectionMode="range" :manualInput="false" showIcon class="date-picker"
        @update:modelValue="onDateChange" />
    </div>

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
        </tbody>
        <tfoot v-if="selected.size > 0">
          <tr>
            <td class="col-check"></td>
            <td class="col-rank"></td>
            <td class="col-name">小计（{{ selected.size }}项）</td>
            <td class="col-qty">{{ subtotal.qty }}</td>
            <td class="col-revenue">¥{{ subtotal.rev.toFixed(2) }}</td>
          </tr>
        </tfoot>
      </table>
      <p v-else class="empty">{{ loaded ? '该时段暂无订单数据' : '加载中...' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface DishSales {
  dishId: string
  name: string
  totalQuantity: number
  totalRevenue: number
}

const items = ref<DishSales[]>([])
const loaded = ref(false)
const quickRange = ref('yesterday')
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
  return { qty, rev }
})

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

  dateRange.value = start ? [start, end] : undefined
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

  // 范围模式下，只有开始/结束都选定后才按自定义区间查询
  if (start && !end) return
  fetchStats()
}

async function fetchStats() {
  loaded.value = false
  try {
    const [s, e] = dateRange.value ?? []
    const params = new URLSearchParams()
    if (s) {
      params.set('startDate', fmt(s))
      const end = quickRange.value === '' ? (e ?? s) : e!
      params.set('endDate', fmt(new Date(end.getTime() + 86400000)))
    }
    const qs = params.toString()
    const res = await fetch(`/api/admin/stats/dish-sales${qs ? '?' + qs : ''}`)
    const data = await res.json()
    items.value = data ?? []
    selected.value = new Set(items.value.map(i => i.dishId))
  } catch {}
  loaded.value = true
}

setQuick('yesterday')
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.quick-btns { display: flex; gap: 6px; }
.quick-btn { padding: 6px 14px; border: 1px solid #ddd; border-radius: 8px; background: #fff; font-size: 13px; cursor: pointer; color: #666; transition: all 0.15s; }
.quick-btn.active { background: var(--p-primary-color, #FF6B00); color: #fff; border-color: var(--p-primary-color, #FF6B00); }
.quick-btn:hover:not(.active) { border-color: var(--p-primary-color, #FF6B00); color: var(--p-primary-color, #FF6B00); }
.date-picker { margin-left: auto; }
.card { background: #fff; border-radius: 12px; padding: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
.stats-table { width: 100%; border-collapse: collapse; }
.stats-table th { text-align: left; padding: 12px 16px; font-size: 13px; font-weight: 600; color: #666; background: #f9f9f9; border-bottom: 1px solid #eee; }
.stats-table td { padding: 12px 16px; font-size: 15px; border-bottom: 1px solid #f5f5f5; }
.stats-table tr:last-child td { border-bottom: none; }
.stats-table tbody tr { cursor: pointer; }
.stats-table tbody tr:hover td { background: #fafafa; }
.stats-table tbody tr.selected td { background: #fff7f0; }
.stats-table tfoot td { font-weight: 700; background: #fff3e8; border-top: 2px solid var(--p-primary-color, #FF6B00); color: var(--p-primary-color, #FF6B00); }
.col-check { width: 36px; text-align: center; }
.col-check input { cursor: pointer; }
.col-rank { width: 48px; color: #999; }
.col-qty { width: 80px; font-weight: 700; color: var(--p-primary-color, #FF6B00); }
.col-revenue { width: 120px; font-weight: 600; }
.empty { text-align: center; padding: 40px; color: #999; }
</style>
