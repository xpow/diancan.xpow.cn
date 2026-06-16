<template>
  <div class="stats">
    <div class="page-header">
      <h2 class="page-title">菜品销量统计</h2>
    </div>

    <div class="filter-bar">
      <div class="quick-btns">
        <button :class="['quick-btn', quickRange === 'today' && 'active']" @click="setQuick('today')">今日</button>
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
            <th class="col-rank">#</th>
            <th class="col-name">菜品</th>
            <th class="col-qty">销量</th>
            <th class="col-revenue">收入</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in items" :key="item.dishId">
            <td class="col-rank">{{ i + 1 }}</td>
            <td class="col-name">{{ item.name }}</td>
            <td class="col-qty">{{ item.totalQuantity }}</td>
            <td class="col-revenue">¥{{ item.totalRevenue.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">{{ loaded ? '该时段暂无订单数据' : '加载中...' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface DishSales {
  dishId: string
  name: string
  totalQuantity: number
  totalRevenue: number
}

const items = ref<DishSales[]>([])
const loaded = ref(false)
const quickRange = ref('all')
const dateRange = ref()

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

function onDateChange(value: (Date | null)[]) {
  quickRange.value = ''
  fetchStats()
}

async function fetchStats() {
  loaded.value = false
  try {
    const [s, e] = dateRange.value ?? []
    const params = new URLSearchParams()
    if (s) params.set('startDate', fmt(s))
    if (e) params.set('endDate', fmt(e))
    const qs = params.toString()
    const res = await fetch(`/api/admin/stats/dish-sales${qs ? '?' + qs : ''}`)
    const data = await res.json()
    items.value = data ?? []
  } catch {}
  loaded.value = true
}

setQuick('all')
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
.stats-table tr:hover td { background: #fafafa; }
.col-rank { width: 48px; color: #999; }
.col-qty { width: 80px; font-weight: 700; color: var(--p-primary-color, #FF6B00); }
.col-revenue { width: 120px; font-weight: 600; }
.empty { text-align: center; padding: 40px; color: #999; }
</style>
