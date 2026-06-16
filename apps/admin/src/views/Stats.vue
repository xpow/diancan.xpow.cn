<template>
  <div class="stats">
    <div class="page-header">
      <h2 class="page-title">菜品销量统计</h2>
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
      <p v-else class="empty">暂无已完成的订单数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface DishSales {
  dishId: string
  name: string
  totalQuantity: number
  totalRevenue: number
}

const items = ref<DishSales[]>([])

async function fetchStats() {
  try {
    const res = await fetch('/api/admin/stats/dish-sales')
    const data = await res.json()
    items.value = data ?? []
  } catch {}
}

onMounted(fetchStats)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
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
