<template>
  <nav class="bottom-nav">
    <router-link to="/" class="nav-item" :class="{ 'nav-item-active': current === 'home' }">
      <span class="material-icons">home</span>
      <span class="nav-label">首页</span>
    </router-link>
    <router-link to="/menu" class="nav-item" :class="{ 'nav-item-active': current === 'menu' }">
      <span class="material-icons">outdoor_grill</span>
      <span class="nav-label">菜单</span>
    </router-link>
    <router-link to="/orders" class="nav-item" :class="{ 'nav-item-active': current === 'orders' }">
      <span class="material-icons">confirmation_number</span>
      <span class="nav-label">订单</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
defineProps<{ current: 'home' | 'menu' | 'orders' }>()
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: var(--spacing-xs) var(--gutter);
  padding-bottom: var(--spacing-xs);
  background: var(--bottom-nav-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--bottom-nav-border);
  border-radius: var(--bottom-nav-radius);
  box-shadow: var(--bottom-nav-shadow);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-full);
  color: var(--secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item-active {
  background: rgba(255, 107, 0, 0.1);
  color: var(--primary-container);
}

.nav-item-active::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 107, 0, 0.15) 0%, transparent 70%);
  border-radius: inherit;
  pointer-events: none;
}

.nav-label {
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  font-weight: 600;
}
</style>
