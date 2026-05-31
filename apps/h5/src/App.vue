<template>
  <router-view />
  <nav v-if="showNav" class="bottom-nav">
    <router-link to="/home" class="nav-item" active-class="nav-active">
      <span class="material-symbols-outlined nav-icon" :class="{ 'nav-icon-fill': $route.path === '/home' }">home</span>
      <span class="nav-label">Home</span>
    </router-link>
    <router-link to="/menu" class="nav-item" active-class="nav-active">
      <span class="material-symbols-outlined nav-icon" :class="{ 'nav-icon-fill': $route.path === '/menu' }">outdoor_grill</span>
      <span class="nav-label">Menu</span>
    </router-link>
    <router-link to="/pickup" class="nav-item" active-class="nav-active">
      <span class="material-symbols-outlined nav-icon" :class="{ 'nav-icon-fill': $route.path === '/pickup' }">confirmation_number</span>
      <span class="nav-label">My Ticket</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const showNav = computed(() => {
  return ['/home', '/menu', '/pickup'].includes(route.path)
})
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 50;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 4px 12px 8px;
  background: rgba(252, 249, 248, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.04);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 9999px;
  text-decoration: none;
  color: var(--secondary, #5e5e5c);
  transition: all 0.2s;
}

.nav-active {
  background: rgba(255, 107, 0, 0.12);
  color: var(--on-primary-container, #572000);
}

.nav-icon {
  font-size: 24px;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.nav-icon-fill {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.nav-label {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: 0.02em;
}
</style>
