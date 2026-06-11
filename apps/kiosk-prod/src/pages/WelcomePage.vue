<template>
  <main class="page">
    <template v-if="deviceAuthed">
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="brand">
        <img :src="logoImage" alt="Logo" class="brand-logo" />
        <h1>{{ displayTitle }}</h1>
      </div>
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>{{ bootstrap?.statusText || '营业中' }}</span>
      </div>
      <button class="theme-btn" @click="themeIcon = doToggleTheme()" :title="themeTooltip">
        <span class="material-icons">{{ themeIcon }}</span>
      </button>
    </header>

    <!-- Hero Carousel -->
    <section class="hero-section">
      <van-swipe class="hero-swipe" :autoplay="4000" indicator-color="#fff" :height="280">
        <van-swipe-item v-for="(img, i) in heroImages" :key="i">
          <div class="hero-slide" :style="{ backgroundImage: `url(${img})` }"></div>
        </van-swipe-item>
      </van-swipe>
      <div class="hero-overlay">
        <h2 class="hero-title">{{ displayTitle }}</h2>
        <p class="hero-summary">{{ bootstrap?.slogan || '地道炭火 · 鲜嫩多汁 · 现烤现卖' }}</p>
        <router-link to="/menu" class="hero-cta">
          <span>开始点餐</span>
          <span class="material-icons">arrow_forward</span>
        </router-link>
      </div>
    </section>

    <div class="page-content">
      <!-- Promotions Section -->
      <section v-if="bootstrap?.promotions?.length" class="section">
        <div class="section-header">
          <h3>优惠活动</h3>
        </div>
        <div class="promo-list">
          <article
            v-for="promotion in bootstrap.promotions"
            :key="promotion.id"
            :class="['promo-card', promotion.tone === 'primary' ? 'promo-primary' : 'promo-default']"
          >
            <div class="promo-icon-wrap">
              <span class="material-icons promo-icon">redeem</span>
            </div>
            <div class="promo-content">
              <p class="promo-tag" v-if="promotion.tag">{{ promotion.tag }}</p>
              <h4 class="promo-title">{{ promotion.title }}</h4>
              <p class="promo-subtitle">{{ promotion.subtitle }}</p>
            </div>
          </article>
        </div>
      </section>

      <!-- Featured Items Section -->
      <section v-if="bootstrap?.featuredItems?.length" class="section">
        <div class="section-header">
          <h3>今日招牌</h3>
          <span class="section-more">查看全部</span>
        </div>
        <div class="featured-scroll">
          <article
            v-for="item in bootstrap.featuredItems"
            :key="item.id"
            class="featured-card"
          >
            <div class="featured-image" :class="item.badgeTone === 'hot' ? 'badge-hot' : 'badge-new'">
              <span class="featured-badge">{{ item.badge }}</span>
            </div>
            <div class="featured-body">
              <div class="featured-row">
                <h4 class="featured-name">{{ item.title }}</h4>
                <span class="featured-price">{{ item.priceText }}</span>
              </div>
              <p class="featured-desc">{{ item.description }}</p>
            </div>
          </article>
        </div>
      </section>

      <!-- Info Grid -->
      <section class="section info-grid">
        <article class="info-card">
          <span class="material-icons info-icon">schedule</span>
          <p class="info-label">营业时间</p>
          <p class="info-value">{{ bootstrap?.businessHours || '17:00 - 02:00' }}</p>
        </article>
        <article class="info-card">
          <span class="material-icons info-icon">location_on</span>
          <p class="info-label">当前位置</p>
          <p class="info-value">{{ bootstrap?.todayLocation || '解放路美食街' }}</p>
          <p v-if="bootstrap?.locationHint" class="info-hint">{{ bootstrap.locationHint }}</p>
        </article>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <p>© 2024 {{ displayTitle }}</p>
        <p class="footer-tagline">用心做好每一串，传递市井烟火气</p>
      </footer>
    </div>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <router-link to="/" class="nav-item nav-item-active">
        <span class="material-icons">home</span>
        <span class="nav-label">首页</span>
      </router-link>
      <router-link to="/menu" class="nav-item">
        <span class="material-icons">outdoor_grill</span>
        <span class="nav-label">菜单</span>
      </router-link>
      <router-link to="/orders" class="nav-item">
        <span class="material-icons">confirmation_number</span>
        <span class="nav-label">订单</span>
      </router-link>
    </nav>
    </template>

    <!-- Device SN Auth Gate -->
    <div v-if="!deviceAuthed" class="device-overlay">
      <div class="device-dialog">
        <div class="device-dialog-header">
          <span class="material-icons">devices</span>
          <h3>设备认证</h3>
        </div>
        <p class="device-dialog-hint" v-if="!snLoading">请输入点餐机背面的8位设备码</p>
        <p class="device-dialog-hint" v-else>验证中...</p>
        <div class="sn-input-row">
          <input
            ref="snInputRef"
            v-model="snInput"
            type="text"
            maxlength="8"
            class="sn-input"
            placeholder="00000000"
            :disabled="snLoading"
            @input="onSNInput"
            @keyup.enter="submitSN"
          />
        </div>
        <p v-if="snError" class="sn-error">{{ snError }}</p>
        <button
          class="device-confirm-btn"
          :disabled="snInput.length !== 8 || snLoading"
          @click="submitSN"
        >{{ snLoading ? '验证中...' : '确认' }}</button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getTheme, setTheme } from '@/utils/theme'
import logoImage from '@/assets/images/pages/logo.png'

interface BootstrapPromotion {
  id: string
  title: string
  subtitle: string
  tag?: string
  tone: 'primary' | 'neutral'
}

interface FeaturedItem {
  id: string
  title: string
  description: string
  priceText: string
  badge: string
  badgeTone: 'hot' | 'new'
}

interface DeviceInfo {
  id: string
  code: string
  name: string
  mode: string
}

interface BootstrapResponse {
  merchantName: string
  branchName: string
  slogan: string
  businessHours: string
  todayLocation: string
  locationHint: string
  statusText: string
  promotions: BootstrapPromotion[]
  featuredItems: FeaturedItem[]
  devices?: DeviceInfo[]
}

const bootstrap = ref<BootstrapResponse | null>(null)
const deviceAuthed = ref(false)
const displayTitle = computed(() => {
  const m = bootstrap.value?.merchantName
  const b = bootstrap.value?.branchName
  return m && b ? `${m}（${b}）` : m || b || 'Sizzling Skewers'
})
const heroImages = [
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
  'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800&q=80',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
]

/* Device SN auth */
const snInput = ref('')
const snError = ref('')
const snLoading = ref(false)
const snInputRef = ref<HTMLInputElement | null>(null)

function onSNInput() {
  snInput.value = snInput.value.replace(/\D/g, '').slice(0, 8)
  snError.value = ''
}

async function submitSN() {
  if (snInput.value.length !== 8) return
  snLoading.value = true
  snError.value = ''
  try {
    const res = await fetch('/api/system/device-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sn: snInput.value }),
    })
    if (!res.ok) {
      const err = await res.json()
      snError.value = err.message || '设备码无效'
      return
    }
    const data = await res.json()
    localStorage.setItem('kiosk-device-sn', snInput.value)
    deviceAuthed.value = true
  } catch {
    snError.value = '网络错误，请重试'
  } finally {
    snLoading.value = false
  }
}

function getThemeIcon(): string {
  const t = getTheme()
  if (t === 'auto') return 'brightness_auto'
  return t === 'dark' ? 'dark_mode' : 'light_mode'
}
const themeIcon = ref(getThemeIcon())
function doToggleTheme(): string {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
  return getThemeIcon()
}
function themeTooltip(): string {
  const t = getTheme()
  return t === 'dark' ? '切换到亮色' : '切换到深色'
}

async function loadBootstrap() {
  const response = await fetch('/api/system/bootstrap')
  if (!response.ok) return
  const data = await response.json() as BootstrapResponse
  bootstrap.value = data

  // Device auth via SN
  const savedDeviceSN = localStorage.getItem('kiosk-device-sn')
  if (savedDeviceSN) {
    deviceAuthed.value = true
    return
  }
  // Show SN login
  snInput.value = ''
  snError.value = ''
  deviceAuthed.value = false
}

onMounted(() => {
  void loadBootstrap()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-icons {
  font-family: 'Material Symbols Outlined';
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-size: 24px;
  line-height: 1;
}

.page {
  min-height: 100vh;
  padding-bottom: 100px;
  background: var(--surface);
}

/* Top Bar */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--container-margin);
  background: var(--frosted-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.brand-logo { height: 32px; width: auto; border-radius: var(--radius-sm); }

.brand h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-lg-mobile);
  font-weight: 700;
  color: var(--primary-container);
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-full);
  background: rgba(0, 110, 28, 0.1);
  color: var(--tertiary);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tertiary-container);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--on-surface-variant);
  cursor: pointer;
  margin-left: var(--spacing-sm);
}

.theme-btn .material-icons {
  font-size: 22px !important;
}

.theme-btn:hover {
  background: var(--surface-container-high);
}

/* Hero Section */
.hero-section {
  margin-top: 80px;
  padding: var(--spacing-md);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  position: relative;
}

.hero-swipe { width: 100%; border-radius: var(--radius-xl); overflow: hidden; }
.hero-slide { width: 100%; height: 100%; background-size: cover; background-position: center; }

.hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--spacing-lg);
  /* border-radius: var(--radius-xl);
  background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%); */
  pointer-events: none;
}
.hero-overlay > * { pointer-events: auto; }

.hero-title {
  margin: 0 0 var(--spacing-sm);
  font-family: var(--font-display);
  font-size: var(--text-display-lg);
  font-weight: 800;
  color: #fff;
  line-height: 40px;
}

.hero-summary {
  margin: 0 0 var(--spacing-lg);
  font-family: var(--font-body);
  font-size: var(--text-body-lg);
  color: rgba(255, 255, 255, 0.86);
  line-height: 24px;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-full);
  background: var(--primary-container);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 8px 20px rgba(255, 107, 0, 0.3);
  transition: transform var(--transition-fast);
}

.hero-cta:active {
  transform: scale(0.98);
}

.hero-cta .material-icons {
  font-size: 20px !important;
}

/* Page Content */
.page-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 var(--container-margin);
}

/* Sections */
.section {
  padding: var(--spacing-lg) 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.section-header h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-lg);
  font-weight: 700;
  color: var(--on-surface);
}

.section-more {
  color: var(--primary-container);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
}

/* Promo List */
.promo-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.promo-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  border-radius: var(--radius-xl);
}

.promo-primary {
  background: rgba(255, 107, 0, 0.1);
  border: 1px solid rgba(255, 107, 0, 0.2);
}

.promo-default {
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
}

.promo-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: rgba(255, 107, 0, 0.15);
  flex-shrink: 0;
}

.promo-icon {
  color: var(--primary-container);
  font-size: 28px !important;
}

.promo-content {
  flex: 1;
}

.promo-tag {
  margin: 0 0 var(--spacing-xs);
  color: var(--tertiary);
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.promo-title {
  margin: 0 0 var(--spacing-xs);
  font-family: var(--font-display);
  font-size: var(--text-headline-lg);
  font-weight: 700;
  color: var(--primary);
}

.promo-subtitle {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-body-lg);
  color: var(--on-surface-variant);
  font-weight: 600;
}

/* Featured Items */
.featured-scroll {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.featured-card {
  width: 100%;
  background: var(--surface-container-lowest);
  border-radius: var(--radius-xl);
  border: 1px solid var(--outline-variant);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.featured-image {
  position: relative;
  height: 160px;
  background: linear-gradient(135deg, #2a1200 0%, #8f3700 100%);
}

.badge-hot {
  background: linear-gradient(135deg, #2a1200 0%, #8f3700 100%);
}

.badge-new {
  background: linear-gradient(135deg, #56340f 0%, #d36b23 100%);
}

.featured-badge {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  font-weight: 600;
}

.featured-body {
  padding: var(--spacing-md);
}

.featured-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.featured-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  color: var(--on-surface);
}

.featured-price {
  color: var(--primary-container);
  font-family: var(--font-display);
  font-size: var(--text-price-display);
  font-weight: 800;
  white-space: nowrap;
}

.featured-desc {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  color: var(--secondary);
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.info-card {
  padding: var(--spacing-lg);
  border-radius: var(--radius-xl);
  background: var(--surface-container-low);
}

.info-icon {
  color: var(--primary-container);
  font-size: 32px !important;
  margin-bottom: var(--spacing-sm);
}

.info-label {
  margin: 0 0 var(--spacing-sm);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  color: var(--secondary);
}

.info-value {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  color: var(--on-surface);
}

.info-hint {
  margin: var(--spacing-sm) 0 0;
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  color: var(--on-surface-variant);
}

/* Footer */
.footer {
  padding: var(--spacing-xl) 0;
  text-align: center;
}

.footer p {
  margin: 0 0 var(--spacing-xs);
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  color: var(--secondary);
}

.footer-tagline {
  opacity: 0.6;
}

/* Bottom Navigation */
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
  background: var(--frosted-bg-heavy);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
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
}

.nav-item-active {
  background: rgba(255, 107, 0, 0.1);
  color: var(--primary-container);
}

.nav-label {
  font-family: var(--font-display);
  font-size: var(--text-label-sm);
  font-weight: 600;
}

/* Device selection dialog */
.device-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}
.device-dialog {
  width: 90%;
  max-width: 400px;
  background: var(--surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
}
.device-dialog-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}
.device-dialog-header h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
}
.device-dialog-header .material-icons {
  font-size: 28px;
  color: var(--primary-container);
}
.device-dialog-hint {
  margin: 0 0 var(--spacing-lg);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}
.sn-input-row {
  margin-bottom: var(--spacing-md);
}
.sn-input {
  width: 100%;
  padding: var(--spacing-md);
  border: 2px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  font-size: 28px;
  font-family: monospace;
  letter-spacing: 6px;
  text-align: center;
  outline: none;
  transition: border-color var(--transition-fast);
  color: var(--text);
}
.sn-input:focus { border-color: var(--primary-container); }
.sn-error { color: var(--danger, #e53935); font-size: var(--text-body-sm); margin: 0 0 var(--spacing-md); text-align: center; }
.device-confirm-btn {
  width: 100%;
  padding: var(--spacing-md);
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary-container);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}
.device-confirm-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

@media (max-width: 720px) {
  .hero-gradient {
    height: 320px;
  }

  .hero-title {
    font-size: var(--text-headline-lg);
    line-height: 32px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
