<template>
  <div v-if="route.meta?.hideLayout" class="full-page">
    <router-view />
  </div>
  <div v-else class="layout">
    <aside class="sidebar">
      <h2 class="sidebar-title">商家后台</h2>
      <nav>
        <router-link to="/orders" class="nav-link">订单管理</router-link>
        <router-link to="/promotions" class="nav-link">营销活动</router-link>
        <router-link to="/night-markets" class="nav-link">夜市管理</router-link>
        <router-link to="/kitchen" class="nav-link">📱 出餐管理（手机版）</router-link>
      </nav>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<style>
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 220px; background: #1a1a1a; color: #fff; padding: 20px; }
.sidebar-title { font-size: 18px; font-weight: 700; margin: 0 0 24px; }
.nav-link { display: block; padding: 10px 12px; color: rgba(255,255,255,0.7); text-decoration: none; border-radius: 8px; font-size: 14px; }
.nav-link:hover, .nav-link.router-link-active { background: rgba(255,255,255,0.1); color: #fff; }
.content { flex: 1; padding: 24px; background: #f8f9fa; }
</style>
