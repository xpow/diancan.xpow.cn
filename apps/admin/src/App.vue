<template>
  <div v-if="route.meta?.hideLayout" class="full-page">
    <router-view />
  </div>
  <div v-else class="layout">
    <aside class="sidebar">
      <h2 class="sidebar-title">{{ merchantName }}</h2>
      <nav>
        <router-link to="/dashboard" class="nav-link"><span class="nav-icon">📊</span> 总览</router-link>
        <router-link to="/orders" class="nav-link"><span class="nav-icon">📋</span> 订单管理</router-link>
        <router-link to="/menu" class="nav-link"><span class="nav-icon">🍽️</span> 菜单管理</router-link>
        <router-link to="/promotions" class="nav-link"><span class="nav-icon">🏷️</span> 营销活动</router-link>
        <router-link to="/merchant" class="nav-link"><span class="nav-icon">⚙️</span> 商家设置</router-link>
        <router-link to="/users" class="nav-link"><span class="nav-icon">👥</span> 用户管理</router-link>
        <router-link to="/kitchen" class="nav-link"><span class="nav-icon">📱</span> 出餐管理</router-link>
      </nav>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const merchantName = ref('商家后台')

onMounted(async () => {
  try {
    const res = await fetch('/api/admin/merchant')
    const data = await res.json()
    if (data?.name) {
      merchantName.value = data.name
      document.title = data.name
    }
  } catch {}
})
</script>

<style>
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 220px; background: #1a1a1a; color: #fff; padding: 20px; }
.sidebar-title { font-size: 18px; font-weight: 700; margin: 0 0 24px; }
.nav-link { display: block; padding: 10px 12px; color: rgba(255,255,255,0.7); text-decoration: none; border-radius: 8px; font-size: 14px; }
.nav-link:hover, .nav-link.router-link-active { background: rgba(255,255,255,0.1); color: #fff; }
.content { flex: 1; padding: 24px; background: #f8f9fa; }

.p-datatable .p-datatable-tbody > tr > td,
.p-datatable .p-datatable-thead > tr > th {
  white-space: nowrap;
}
</style>
