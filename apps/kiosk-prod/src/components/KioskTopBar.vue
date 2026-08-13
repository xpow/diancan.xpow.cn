<template>
  <header class="top-bar">
    <div class="brand">
      <img :src="logoImage" alt="Logo" class="brand-logo" />
      <h1>{{ title }}</h1>
    </div>
    <div class="top-bar-right">
      <span :class="['status-badge', !isOpen && 'status-badge-rest']">
        <span :class="['status-dot', !isOpen && 'status-dot-rest']"></span>
        <span>{{ effectiveStatusText }}</span>
      </span>
      <span class="device-tag">{{ deviceCode }}</span>
      <button class="theme-btn" @click="toggleTheme">
        <span class="material-icons">{{ themeIcon }}</span>
      </button>
      <router-link v-if="showTicket" to="/pickup" class="ticket-btn hide-mobile">
        <span class="material-icons">receipt_long</span>
        <span v-if="hasActiveOrder" class="badge-dot">1</span>
      </router-link>
      <router-link v-if="showHomeLink" to="/home" class="close-btn">
        <span class="material-icons">close</span>
      </router-link>
    </div>
  </header>
</template>

<script setup lang="ts">
import logoImage from '@/assets/images/pages/logo.jpg'
import { ref, computed } from 'vue'
import { getTheme, toggleTheme as cycleTheme } from '@/utils/theme'

const props = defineProps<{
  title: string
  deviceCode?: string
  statusText?: string
  businessHours?: string
  restReason?: string
  branchStatus?: string
  showTicket?: boolean
  hasActiveOrder?: boolean
  showHomeLink?: boolean
}>()

function isWithinBusinessHours(hours: string): boolean {
  const m = hours.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/)
  if (!m) return true
  const startMin = parseInt(m[1]) * 60 + parseInt(m[2])
  let endMin = parseInt(m[3]) * 60 + parseInt(m[4])
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (endMin <= startMin) endMin += 1440
  const compareMin = nowMin < startMin ? nowMin + 1440 : nowMin
  return compareMin >= startMin && compareMin < endMin
}

const effectiveStatusText = computed(() => {
  if (props.branchStatus === 'offline') {
    return props.restReason ? `休息中（${props.restReason}）` : '休息中'
  }
  if (props.businessHours && !isWithinBusinessHours(props.businessHours)) {
    return props.restReason ? `休息中（${props.restReason}）` : '休息中'
  }
  return '营业中'
})

const isOpen = computed(() => !effectiveStatusText.value.includes('休息'))

const themeIcon = ref(getThemeIcon())
function getThemeIcon(): string {
  const t = getTheme()
  return t === 'auto' ? 'brightness_auto' : t === 'dark' ? 'dark_mode' : 'light_mode'
}
function toggleTheme() {
  cycleTheme()
  themeIcon.value = getThemeIcon()
}
</script>

<style scoped>
@import url('../styles/Material+Symbols+Outlined.css');

.material-icons { font-family: 'Material Symbols Outlined'; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; font-size: 24px; line-height: 1; }
.top-bar { height: 52px; position: fixed; top: 0; left: 0; right: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) var(--container-margin); padding-top: calc(var(--spacing-sm) + env(safe-area-inset-top, 0)); background: color-mix(in srgb, var(--surface) 85%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.brand { display: flex; align-items: center; gap: var(--spacing-sm); min-width: 0; }
.brand-logo { height: 32px; width: auto; border-radius: var(--radius-sm); }
.brand h1 { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; color: var(--primary-container); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.device-tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; background: rgba(255,107,0,0.1); color: var(--primary-container); font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; }
.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; background: rgba(0,110,28,0.1); color: var(--tertiary); font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; }
.status-badge-rest { background: rgba(200,40,40,0.1); color: #c62828; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #00c853; box-shadow: 0 0 6px #00c853; animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
.status-dot-rest { background: #c62828; box-shadow: 0 0 6px #c62828; }
@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); box-shadow: 0 0 6px #00c853; } 50% { opacity: 0.85; transform: scale(0.95); box-shadow: 0 0 2px #00c853; } }
.ticket-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 50%; cursor: pointer; color: var(--secondary); text-decoration: none; position: relative; }
.top-bar-right { display: flex; align-items: center; gap: var(--spacing-sm); flex-shrink: 0; }
.theme-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; border-radius: var(--radius-full); background: transparent; color: var(--on-surface-variant); cursor: pointer; }
.theme-btn .material-icons { font-size: 22px !important; }
.close-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; border-radius: 50%; background: transparent; color: var(--secondary); cursor: pointer; text-decoration: none; }
.close-btn .material-icons { font-size: 24px; }
.badge-dot { position: absolute; top: 2px; right: 2px; background: var(--error); color: #fff; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 1.5px solid var(--surface); }
@media (max-width: 499px) {
  .top-bar { padding: var(--spacing-xs) var(--container-margin); }
  .brand-logo { height: 28px; }
  .ticket-btn, .theme-btn, .close-btn { width: 36px; height: 36px; }
  .hide-mobile { display: none; }
  .theme-btn .material-icons, .ticket-btn .material-icons { font-size: 20px !important; }
}
@media (max-width: 399px) {
  .brand { min-width: 0; }
  .brand h1 { font-size: 15px; max-width: 110px; }
  .brand-logo { height: 24px; }
}
</style>
