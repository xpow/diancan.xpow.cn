<template>
  <KioskTopBar v-if="deviceAuthed" :title="displayTitle" :status-text="bootstrap?.statusText || '营业中'" :branch-status="bootstrap?.branchStatus" :business-hours="bootstrap?.businessHours" :rest-reason="bootstrap?.restReason" :device-code="bootstrap?.deviceCode ?? ''" />
  <main class="page">
    <template v-if="deviceAuthed">
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
        <div class="hero-actions">
          <router-link to="/menu" class="hero-cta">
            <span>开始点餐</span>
            <span class="material-icons">arrow_forward</span>
          </router-link>
          <router-link to="/orders" class="hero-cta secondary">
            <span>查看订单</span>
            <span class="material-icons">receipt_long</span>
          </router-link>
        </div>
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
            :class="['promo-card', promotion.tone === 'primary' ? 'promo-primary' : 'promo-default', 'promo-clickable']"
            @click="router.push(promotion.itemIds.length ? `/menu?dishId=${promotion.itemIds[0]}` : '/menu')"
          >
            <img v-if="promoImage(promotion)" :src="promoImage(promotion)!" class="promo-thumb" />
            <div class="promo-body">
              <div class="promo-body-top">
                <p class="promo-tag" v-if="promotion.tag">{{ promotion.tag }}</p>
                <div class="promo-icon-wrap">
                  <span class="material-icons promo-icon">{{ promoIcon(promotion.type) }}</span>
                </div>
              </div>
              <h4 class="promo-title">{{ promotion.title }}</h4>              
            </div>
          </article>
        </div>
      </section>

      <!-- Menu Categories Section -->
      <section v-for="(cat, ci) in sortedCategories" :key="cat.id" class="section" :id="ci === 0 ? 'menu-section' : undefined">
        <div class="section-header-new">
          <span class="section-bar"></span>
          <h3>{{ cat.name }}</h3>
        </div>
        <!-- Signature dish: first item as horizontal card -->
        <div v-if="cat.dishes[0]" class="featured-card-new" @click="router.push(`/menu?dishId=${cat.dishes[0].id}`)">
          <div v-if="cat.dishes[0].stockEnabled && (cat.dishes[0].stock ?? 0) <= 0" class="featured-sold-out">
            <span class="material-icons">block</span><span>今日已售罄</span>
          </div>
          <span v-else-if="cat.dishes[0].stockEnabled && (cat.dishes[0].stock ?? 0) > 0" class="featured-stock-badge">预估剩余 {{ cat.dishes[0].stock }} 串</span>
          <div class="featured-info">
            <div class="featured-top">
              <div class="featured-title-row">
                <h4 class="featured-name">{{ cat.dishes[0].name }}</h4>
                <span v-if="cat.dishes[0].tags.length" class="featured-tag tag-hot">{{ cat.dishes[0].tags[0] }}</span>
              </div>
              <p class="featured-desc">{{ cat.dishes[0].desc }}</p>
            </div>
            <div class="featured-bottom">
              <span class="featured-price">¥{{ cat.dishes[0].price.toFixed(2) }}<span v-if="cat.dishes[0].portionSize" class="featured-portion"> / {{ cat.dishes[0].portionSize }}串</span></span>
            </div>
          </div>
          <div class="featured-thumb">
            <img :src="getDishImage(cat.dishes[0].id)" alt="" />
          </div>
        </div>
        <!-- Other dishes: 2-column grid -->
        <div v-if="cat.dishes.length > 1" class="menu-grid">
          <div v-for="dish in cat.dishes.slice(1)" :key="dish.id" class="menu-grid-card" @click="router.push(`/menu?dishId=${dish.id}`)">
            <div v-if="dish.stockEnabled && (dish.stock ?? 0) <= 0" class="grid-sold-out">
              <span class="material-icons">block</span><span>今日已售罄</span>
            </div>
            <span v-else-if="dish.stockEnabled && (dish.stock ?? 0) > 0" class="grid-stock-badge">剩余 {{ dish.stock }} 串</span>
            <div class="menu-grid-info">
              <h4 class="menu-grid-name">{{ dish.name }}</h4>
              <p class="menu-grid-desc">{{ dish.desc }}</p>
            </div>
            <div class="menu-grid-bottom">
              <span class="menu-grid-price">¥{{ dish.price.toFixed(2) }}<span v-if="dish.portionSize" class="menu-grid-portion"> / {{ dish.portionSize }}串</span></span>
            </div>
          </div>
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
        <p>© 2026 {{ displayTitle }}</p>
        <p class="footer-tagline">用心做好每一串，传递市井烟火气</p>
        <p class="switch-device" @click="switchDevice">切换设备</p>
      </footer>
    </div>

    <!-- Bottom Navigation -->
    <BottomNav current="home" />
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
import { computed, onMounted, ref, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getDishImage } from '@/utils/dishImages'
import { apiPost, setDeviceToken, getDeviceUUID } from '@/utils/api'
import KioskTopBar from '@/components/KioskTopBar.vue'
import BottomNav from '@/components/BottomNav.vue'
import lb1 from '@/assets/images/pages/lb-1.jpg'
import lb2 from '@/assets/images/pages/lb-2.jpg'
import lb3 from '@/assets/images/pages/lb-3.jpg'
import lb4 from '@/assets/images/pages/lb-4.jpg'

const router = useRouter()
const route = useRoute()

function promoIcon(type: string): string {
  const map: Record<string, string> = {
    buy_get: 'card_giftcard',
    full_reduction: 'local_offer',
    welfare_item: 'redeem',
    time_discount: 'timer',
    new_user: 'person_add',
    holiday_gift: 'card_giftcard',
    total_discount: 'money_off',
  }
  return map[type] || 'redeem'
}

function promoImage(p: BootstrapPromotion): string | null {
  return p.image || (p.dishId ? getDishImage(p.dishId) : null)
}

interface BootstrapPromotion {
  id: string
  title: string
  subtitle: string
  type: string
  tag?: string
  tone: 'primary' | 'neutral'
  image?: string | null
  dishId?: string | null
  itemIds: string[]
}

interface FeaturedItem {
  id: string
  title: string
  description: string
  priceText: string
  badge: string
  badgeTone: 'hot' | 'new'
}

interface MenuCategoryDish {
  id: string
  name: string
  desc: string
  price: number
  portionSize: number | null
  image: string | null
  tags: string[]
}

interface MenuCategory {
  id: string
  name: string
  dishes: MenuCategoryDish[]
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
  deviceCode?: string
  slogan: string
  businessHours: string
  todayLocation: string
  locationHint: string
  statusText: string
  restReason?: string
  promotions: BootstrapPromotion[]
  featuredItems: FeaturedItem[]
  menuCategories: MenuCategory[]
  devices?: DeviceInfo[]
  commands?: { id: string; command: string; params: string }[]
}

const bootstrap = ref<BootstrapResponse | null>(null)
const deviceAuthed = ref(false)
const displayTitle = computed(() => {
  const m = bootstrap.value?.merchantName
  const b = bootstrap.value?.branchName
  return m && b ? `${m}（${b}）` : m || b || 'Sizzling Skewers'
})

const sortedCategories = computed(() => {
  return bootstrap.value?.menuCategories?.map(cat => ({
    ...cat,
    dishes: [...cat.dishes].sort((a, b) => {
      const aOut = a.stockEnabled && (a.stock ?? 0) <= 0 ? 1 : 0
      const bOut = b.stockEnabled && (b.stock ?? 0) <= 0 ? 1 : 0
      return aOut - bOut
    })
  }))
})
const heroImages = [
  lb1, lb2, lb3, lb4,
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

function switchDevice() {
  localStorage.clear()
  location.reload()
}

async function submitSN() {
  if (snInput.value.length !== 8) return
  snLoading.value = true
  snError.value = ''
  try {
    const data = await apiPost<{ token: string; deviceId: string; role?: string }>('/api/system/device-auth', { sn: snInput.value, uuid: getDeviceUUID(), userAgent: navigator.userAgent })
    setDeviceToken(data.token)
    localStorage.setItem('kiosk-device-sn', snInput.value)
    localStorage.setItem('kiosk-device-auth-id', data.deviceId)
    if (data.role) localStorage.setItem('kiosk-device-role', data.role)
    // 重新加载 bootstrap 获取正确设备信息
    const bootstrapRes = await fetch(`/api/system/bootstrap?sn=${snInput.value}`)
    if (bootstrapRes.ok) {
      bootstrap.value = await bootstrapRes.json()
    }
    deviceAuthed.value = true
  } catch (err: any) {
    snError.value = err.message || '设备码无效'
  } finally {
    snLoading.value = false
  }
}

// 二维码扫码自动认证
async function autoAuth(code: string): Promise<boolean> {
  try {
    const decodeRes = await fetch(`/api/system/decode-device?code=${encodeURIComponent(code)}`)
    if (!decodeRes.ok) return false
    const { sn } = await decodeRes.json()
    const authData = await apiPost<{ token: string; deviceId: string; role?: string }>('/api/system/device-auth', {
      sn, uuid: getDeviceUUID(), userAgent: navigator.userAgent,
    })
    setDeviceToken(authData.token)
    localStorage.setItem('kiosk-device-sn', sn)
    localStorage.setItem('kiosk-device-auth-id', authData.deviceId)
    if (authData.role) localStorage.setItem('kiosk-device-role', authData.role)
    const bootstrapRes = await fetch(`/api/system/bootstrap?sn=${sn}`)
    if (bootstrapRes.ok) {
      bootstrap.value = await bootstrapRes.json()
    }
    deviceAuthed.value = true
    return true
  } catch {
    return false
  }
}

async function loadBootstrap() {
  // 先检查本地缓存的设备码，跳过认证弹窗
  let savedDeviceSN = localStorage.getItem('kiosk-device-sn')
  if (savedDeviceSN) {
    deviceAuthed.value = true
  }

  const response = await fetch(`/api/system/bootstrap${savedDeviceSN ? `?sn=${savedDeviceSN}` : ''}`)
  if (!response.ok) return
  const data = await response.json() as BootstrapResponse
  bootstrap.value = data

  // 验证 token 对应的设备与 SN 匹配
  const authId = localStorage.getItem('kiosk-device-auth-id')
  if (data.deviceId && authId && data.deviceId !== authId) {
    localStorage.removeItem('kiosk-device-token')
    localStorage.removeItem('kiosk-device-auth-id')
    deviceAuthed.value = false
    savedDeviceSN = null
  }

  // 执行设备指令
  if (data.commands?.length) {
    for (const cmd of data.commands) {
      if (cmd.command === 'clear_storage') {
        localStorage.clear()
        document.cookie.split(';').forEach((c) => {
          document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`)
        })
      }
      // 标记已执行
      fetch(`/api/commands/${cmd.id}/ack`, { method: 'POST' }).catch(() => {})
    }
    // 清除后刷新页面
    if (data.commands.some((c) => c.command === 'clear_storage')) {
      location.reload()
    }
  }

  // 无缓存设备码 → 显示认证弹窗
  if (!savedDeviceSN) {
    snInput.value = ''
    snError.value = ''
    deviceAuthed.value = false
  }
}

onMounted(async () => {
  // 已绑定设备码则忽略 URL 上的扫码参数（防止覆盖已有绑定）
  if (!localStorage.getItem('kiosk-device-sn')) {
    const codeParam = route.query.code as string | undefined
    if (codeParam) {
      const ok = await autoAuth(codeParam)
      if (ok) {
        router.replace('/home').catch(() => {})
        return
      }
    }
  }

  await loadBootstrap()
  document.title = `首页-${bootstrap.value?.merchantName || '点餐'}`
})
</script>

<style scoped>
@import url('../styles/Material+Symbols+Outlined.css');

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
/* Hero Section */
.hero-section {
  margin-top: 56px;
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
  line-height: 1.3;
}

.hero-summary {
  margin: 0 0 var(--spacing-lg);
  font-family: var(--font-body);
  font-size: var(--text-body-lg);
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.86);
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

.hero-cta.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  box-shadow: none;
}

.hero-cta:active {
  transform: scale(0.98);
}

.hero-cta .material-icons {
  font-size: 20px !important;
}

.hero-actions {
  display: flex;
  gap: 12px;
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
  line-height: 1.3;
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
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.promo-clickable { cursor: pointer; }
.promo-clickable:active { transform: scale(0.97); transition: transform 0.1s; }

.promo-thumb {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-lg);
  object-fit: cover;
  flex-shrink: 0;
}

.promo-body {
  flex: 1;
  min-width: 0;
}

.promo-body-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
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
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: rgba(255, 107, 0, 0.15);
  flex-shrink: 0;
}

.promo-icon { font-size: 18px !important; color: var(--primary-container); }

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
  line-height: 1.4;
}

.promo-subtitle {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-body-lg);
  color: var(--on-surface-variant);
  font-weight: 600;
}

/* Featured Items - New Design */
.section-header-new { display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); }
.section-bar { width: 4px; height: 24px; border-radius: 2px; background: var(--primary-container); flex-shrink: 0; }
.section-header-new h3 { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-lg); font-weight: 700; color: var(--on-surface); }

.featured-list { display: flex; flex-direction: column; gap: var(--spacing-md); }

.featured-card-new {
  display: flex;
  background: var(--surface-container-highest);
  border-radius: var(--radius-xl);
  border: 1px solid var(--outline-variant);
  overflow: hidden;
  transition: box-shadow 0.3s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.featured-card-new:active { transform: scale(0.98); transition: transform 0.1s; }

.featured-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: var(--spacing-md); min-width: 0; }
.featured-top { display: flex; flex-direction: column; gap: 2px; }
.featured-title-row { display: flex; align-items: center; gap: var(--spacing-xs); }
.featured-name { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; color: var(--on-surface); line-height: 1.3; }
.featured-tag {
  display: inline-flex; align-self: flex-start;
  padding: 0px 4px; border-radius: var(--radius-sm);
  font-family: var(--font-display); font-size: 10px; font-weight: 500;
  color: #fff; margin-bottom: var(--spacing-xs);
}
.tag-hot { background: #ff3d00; }
.tag-new { background: var(--primary-container); }

.featured-thumb { position: relative; width: 112px; height: 112px; flex-shrink: 0; overflow: hidden; border-radius: var(--radius-lg); }
.featured-thumb img { width: 100%; height: 100%; object-fit: cover; }
.featured-sold-out { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.5); color: #fff; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700; z-index: 2; border-radius: var(--radius-lg); }
.featured-sold-out .material-icons { font-size: 30px !important; }
.featured-stock-badge { position: absolute; top: 4px; right: 4px; padding: 2px 10px; border-radius: var(--radius-full); background: rgb(255 124 0 / 89%); color: #fff; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700; line-height: 1.5; pointer-events: none; box-shadow: 0 2px 8px rgba(255,61,0,0.4); z-index: 2; }
.featured-price { color: var(--primary-container); font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; }
.featured-portion { font-size: var(--text-label-sm); font-weight: 700; color: var(--secondary); }

/* old overrides removed */

/* Menu Grid */
.menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-top: var(--spacing-md); }
.menu-grid-card {
  background: var(--surface-container-highest);
  border-radius: var(--radius-xl);
  border: 1px solid var(--outline-variant);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100px;
  cursor: pointer;
  transition: box-shadow 0.3s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.menu-grid-card:active { transform: scale(0.97); transition: transform 0.1s; }
.menu-grid-card::after { content: 'restaurant'; font-family: 'Material Symbols Outlined'; position: absolute; bottom: -8px; right: -8px; font-size: 56px; color: var(--outline-variant); opacity: 0.4; transform: rotate(12deg); pointer-events: none; }
.grid-sold-out { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.5); color: #fff; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700; z-index: 2; border-radius: var(--radius-xl); }
.grid-sold-out .material-icons { font-size: 28px !important; }
.grid-stock-badge { position: absolute; top: 4px; right: 4px; padding: 1px 8px; border-radius: var(--radius-full); background: rgb(255 124 0 / 89%); color: #fff; font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 700; line-height: 1.5; pointer-events: none; z-index: 2; }
.menu-grid-name { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; color: var(--on-surface); }
.menu-grid-desc { margin: 4px 0 0; font-family: var(--font-body); font-size: var(--text-body-md); color: var(--on-surface-variant); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-grid-bottom { margin-top: var(--spacing-sm); }
.menu-grid-price { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); display: block; }
.menu-grid-portion { display: block; font-size: var(--text-label-sm); font-weight: 700; color: var(--secondary); }

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.info-card {
  padding: var(--spacing-lg);
  border-radius: var(--radius-xl);
  background: var(--surface-container);
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
  line-height: 1.4;
  color: var(--secondary);
}

.info-value {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-md);
  font-weight: 700;
  line-height: 1.3;
  color: var(--on-surface);
}

.info-hint {
  margin: var(--spacing-sm) 0 0;
  font-family: var(--font-body);
  font-size: var(--text-body-md);
  line-height: 1.5;
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

.switch-device {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.4;
  cursor: pointer;
  text-decoration: underline;
}
.switch-device:hover { opacity: 0.7; }

@media (min-width: 500px) {
  .hero-section { max-width: none; margin: 56px 0 0; padding: 0; height: 360px; overflow: hidden; }
  .hero-swipe { border-radius: 0; height: 360px !important; }
  :deep(.hero-swipe .van-swipe__track),
  :deep(.van-swipe-item) { height: 360px !important; }
  .hero-actions { gap: 16px; width: 100%; }
  .hero-cta {
    min-width: 0;
    flex: 1;
    padding: 16px 24px;
    font-size: var(--text-headline-lg);
    line-height: 1;
  }
  .hero-cta .material-icons { font-size: 20px !important; }
  .page-content { max-width: none; }
  .promo-list { display: grid; grid-template-columns: 1fr 1fr; }
  .featured-scroll { display: grid; grid-template-columns: 1fr 1fr; }
  .featured-thumb { width: 128px; height: 128px; }
  .menu-grid { grid-template-columns: repeat(3, 1fr); }
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
  color: var(--text-muted);
  font-size: var(--text-body-sm);
}
.sn-input-row {
  margin-bottom: var(--spacing-md);
}
.sn-input {
  width: 100%;
  padding: var(--spacing-md);
  border: 2px solid var(--outline-variant);
  border-radius: var(--radius-lg);
  background: var(--surface-container-lowest);
  font-size: 28px;
  font-family: monospace;
  letter-spacing: 6px;
  text-align: center;
  outline: none;
  transition: border-color var(--transition-fast);
  color: var(--on-surface);
}
.sn-input:focus { border-color: var(--primary-container); }
.sn-error { color: var(--error); font-size: var(--text-body-sm); margin: 0 0 var(--spacing-md); text-align: center; }
.device-confirm-btn {
  width: 100%;
  padding: var(--spacing-md);
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary-container);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: var(--text-body-lg);
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
    line-height: 1.3;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 499px) {
  .hero-section {
    max-width: none;
    margin-top: 52px;
    margin-left: 0;
    margin-right: 0;
    padding: 0;
  }

  .hero-swipe {
    border-radius: 0;
  }

  .hero-overlay {
    padding: var(--spacing-md);
  }

  .hero-actions {
    flex-direction: row;
    gap: var(--spacing-sm);
  }

  .hero-cta {
    min-width: 0;
    flex: 1;
    padding: 12px 10px;
    font-size: var(--text-label-lg);
  }

  .hero-cta .material-icons {
    font-size: 16px !important;
  }

  .promo-card,
  .featured-card-new,
  .info-card,
  .device-dialog {
    border-radius: var(--radius-lg);
  }

  .promo-thumb {
    width: 64px;
    height: 64px;
  }

  .featured-image {
    height: 144px;
  }

  .device-dialog {
    width: calc(100% - 24px);
    padding: var(--spacing-md);
  }

  .sn-input {
    padding: 12px;
    font-size: 24px;
    letter-spacing: 4px;
  }

  .device-confirm-btn {
    padding: 12px;
    font-size: var(--text-body-lg);
  }
}
</style>

<style>
[data-theme="dark"] .promo-default {
  background: var(--surface-container-high);
  border-color: var(--outline-variant);
}
[data-theme="dark"] .promo-primary {
  background: rgba(255, 107, 0, 0.2);
  border-color: rgba(255, 107, 0, 0.35);
}
[data-theme="dark"] .promo-tag {
  color: #30b04a;
}
[data-theme="dark"] .promo-title {
  color: #ffcdab;
}
[data-theme="dark"] .promo-subtitle {
  color: #e8ddd0;
}
[data-theme="dark"] .featured-card-new,
[data-theme="dark"] .menu-grid-card { box-shadow: none; }
</style>
