<template>
  <div v-if="route.meta?.hideLayout" class="full-page">
    <router-view />
  </div>
  <div v-else class="layout">
    <!-- SideNavBar -->
    <aside class="sidebar">
      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-avatar">
          <img :src="logoUrl" alt="Logo" />
        </div>
        <div class="brand-info">
          <h2 class="brand-name">{{ merchantName }}</h2>
          <p class="brand-subtitle">管理后台</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-link">
          <span class="material-symbols-outlined">dashboard</span>
          <span class="nav-text">总览</span>
        </router-link>
        <router-link to="/orders" class="nav-link">
          <span class="material-symbols-outlined">receipt_long</span>
          <span class="nav-text">订单管理</span>
        </router-link>
        <router-link to="/menu" class="nav-link">
          <span class="material-symbols-outlined">restaurant_menu</span>
          <span class="nav-text">菜单管理</span>
        </router-link>
        <router-link to="/promotions" class="nav-link">
          <span class="material-symbols-outlined">local_offer</span>
          <span class="nav-text">营销活动</span>
        </router-link>
        <router-link to="/stats" class="nav-link">
          <span class="material-symbols-outlined">analytics</span>
          <span class="nav-text">销量统计</span>
        </router-link>
        <router-link to="/cost-profit" class="nav-link">
          <span class="material-symbols-outlined">account_balance_wallet</span>
          <span class="nav-text">成本利润</span>
        </router-link>
        <router-link to="/reviews" class="nav-link">
          <span class="material-symbols-outlined">star</span>
          <span class="nav-text">评价管理</span>
        </router-link>

        <div class="nav-divider"></div>

        <router-link to="/devices" class="nav-link">
          <span class="material-symbols-outlined">devices</span>
          <span class="nav-text">点餐机管理</span>
        </router-link>
        <router-link to="/kitchen-terminals" class="nav-link">
          <span class="material-symbols-outlined">point_of_sale</span>
          <span class="nav-text">出餐机管理</span>
        </router-link>
        <router-link to="/merchant" class="nav-link">
          <span class="material-symbols-outlined">settings</span>
          <span class="nav-text">商家设置</span>
        </router-link>
        <router-link to="/users" class="nav-link">
          <span class="material-symbols-outlined">manage_accounts</span>
          <span class="nav-text">用户管理</span>
        </router-link>
        </nav>

      <!-- Theme Toggle -->
      <div class="theme-controls">
        <button class="theme-toggle" @click="cycleTheme" :title="themeLabel">
          <span class="material-symbols-outlined">{{ themeIcon }}</span>
          <span class="theme-label">{{ themeLabel }}</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const merchantName = ref('商家后台')
const logoUrl = 'https://diancan.xpow.cn/src/assets/images/pages/logo.jpg'

type ThemeChoice = 'light' | 'dark' | 'system'
const themeChoice = ref<ThemeChoice>((localStorage.getItem('admin-theme') as ThemeChoice) || 'system')

const themeIcon = computed(() => {
  const map: Record<ThemeChoice, string> = { light: 'light_mode', dark: 'dark_mode', system: 'contrast' }
  return map[themeChoice.value]
})
const themeLabel = computed(() => {
  const map: Record<ThemeChoice, string> = { light: '浅色', dark: '深色', system: '跟随系统' }
  return map[themeChoice.value]
})

function applyTheme(choice: ThemeChoice) {
  const isDark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  document.documentElement.classList.toggle('p-dark', isDark)
}

function cycleTheme() {
  const order: ThemeChoice[] = ['light', 'dark', 'system']
  const idx = order.indexOf(themeChoice.value)
  themeChoice.value = order[(idx + 1) % order.length]
  localStorage.setItem('admin-theme', themeChoice.value)
  applyTheme(themeChoice.value)
}

let mqListener: ((e: MediaQueryListEvent) => void) | null = null

onMounted(() => {
  applyTheme(themeChoice.value)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mqListener = (e: MediaQueryListEvent) => {
    if (themeChoice.value === 'system') applyTheme('system')
  }
  mq.addEventListener('change', mqListener)
})

onUnmounted(() => {
  if (mqListener) window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', mqListener)
})

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
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

/* Sidebar */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  overflow-y: auto;
  z-index: 100;
}

/* Brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 24px;
}

.brand-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b00, #ff8a33);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--on-primary);
  flex-shrink: 0;
  overflow: hidden;
}

.brand-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-info {
  min-width: 0;
  flex: 1;
}

.brand-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-subtitle {
  margin: 2px 0 0;
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--on-surface-variant);
}

/* Navigation */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: var(--on-surface-variant);
  text-decoration: none;
  border-radius: 12px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  transition: all 0.15s;
}

.nav-link .material-symbols-outlined {
  font-size: 20px;
  font-variation-settings: 'wght' 500;
}

.nav-link:hover {
  background: var(--surface-container-low);
  color: var(--on-surface);
}

.nav-link.router-link-active {
  background: var(--primary-soft);
  color: var(--primary-container);
}

.nav-link.router-link-active .material-symbols-outlined {
  font-variation-settings: 'wght' 700;
}

.nav-text {
  flex: 1;
}

.nav-divider {
  height: 1px;
  background: var(--divider);
  margin: 12px 8px;
}

/* Theme Toggle */
.theme-controls {
  padding: 12px 8px 4px;
  border-top: 1px solid var(--divider);
  margin-top: 12px;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--on-surface-variant);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.theme-toggle:hover {
  background: var(--surface-container-low);
  color: var(--on-surface);
}

.theme-toggle .material-symbols-outlined {
  font-size: 20px;
}

/* Content */
.content {
  flex: 1;
  padding: 24px;
  margin-left: 240px;
  min-height: 100vh;
}

/* Material Icons */
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
}

/* PrimeVue overrides */
.p-datatable .p-datatable-tbody > tr > td,
.p-datatable .p-datatable-thead > tr > th {
  white-space: nowrap;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 64px;
    padding: 12px 8px;
  }

  .sidebar-brand {
    justify-content: center;
    padding: 8px;
  }

  .brand-info {
    display: none;
  }

  .nav-link {
    justify-content: center;
    padding: 12px;
  }

  .nav-text {
    display: none;
  }

  .theme-label {
    display: none;
  }

  .theme-toggle {
    justify-content: center;
    padding: 10px;
  }

  .theme-controls {
    padding: 8px 0;
    border-top: 1px solid var(--divider);
    margin-top: 8px;
  }

  .nav-divider {
    margin: 8px 4px;
  }

  .content {
    margin-left: 64px;
    padding: 16px;
  }
}
</style>
