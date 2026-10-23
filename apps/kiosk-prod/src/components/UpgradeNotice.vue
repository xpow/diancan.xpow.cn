<template>
  <AppOverlay :show="true" :z-index="100000">
    <div
      class="upgrade-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="legacy-upgrade-title"
    >
      <span class="material-icons upgrade-icon" aria-hidden="true">campaign</span>
      <h2 id="legacy-upgrade-title" class="upgrade-title">{{ LEGACY_UPGRADE_MESSAGE }}</h2>
      <p class="upgrade-hint">{{ secondsLeft }} 秒后自动前往新版</p>
      <button ref="confirmBtn" type="button" class="upgrade-confirm" @click="confirm">
        确认（{{ secondsLeft }}）
      </button>
    </div>
  </AppOverlay>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppOverlay from '@/components/AppOverlay.vue'
import {
  LEGACY_UPGRADE_COUNTDOWN_SECONDS,
  LEGACY_UPGRADE_MESSAGE,
  redirectToLegacyUpgrade,
} from '@/constants/upgrade'

const secondsLeft = ref(LEGACY_UPGRADE_COUNTDOWN_SECONDS)
const confirmBtn = ref<HTMLButtonElement | null>(null)
let timer = 0
let leaving = false

function confirm() {
  if (leaving) return
  leaving = true
  window.clearInterval(timer)
  redirectToLegacyUpgrade()
}

function tick() {
  if (secondsLeft.value <= 1) {
    confirm()
    return
  }
  secondsLeft.value -= 1
}

onMounted(() => {
  document.documentElement.style.overflow = 'hidden'
  confirmBtn.value?.focus()
  timer = window.setInterval(tick, 1000)
})

onUnmounted(() => {
  window.clearInterval(timer)
  document.documentElement.style.overflow = ''
})
</script>

<style scoped>
.upgrade-dialog {
  width: min(440px, calc(100vw - 32px));
  padding: 32px 24px 24px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--card-border-light);
  border-radius: var(--radius-xl);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
}

.upgrade-icon {
  font-size: 48px;
  color: var(--primary-container);
}

.upgrade-title {
  margin: 12px 0 8px;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.45;
  color: var(--on-surface);
}

.upgrade-hint {
  margin: 0 0 20px;
  color: var(--text-muted);
  font-size: var(--text-body-md);
}

.upgrade-confirm {
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--primary-container);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}

.upgrade-confirm:active {
  transform: scale(0.98);
}

@media (max-width: 499px) {
  .upgrade-dialog {
    padding: 24px 16px 16px;
    border-radius: var(--radius-lg);
  }

  .upgrade-title {
    font-size: 20px;
  }
}
</style>
