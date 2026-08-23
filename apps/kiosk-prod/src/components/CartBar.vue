<template>
  <div class="cart-bar" @click="$emit('open')">
    <div class="cart-left">
      <div class="cart-icon-wrap">
        <span class="material-icons">shopping_basket</span>
        <span class="cart-badge">{{ count }}</span>
      </div>
      <div class="cart-info">
        <div class="cart-total">
          <span class="roll-char roll-prefix">¥</span>
          <template v-for="(ch, i) in priceChars" :key="i">
            <span v-if="ch === '.'" class="roll-char roll-dot">.</span>
            <span v-else class="roll-digit-wrap">
              <span class="roll-digit-track" :style="{ transform: `translateY(-${ch}00%)` }">
                <span v-for="n in 10" :key="n" class="roll-digit-val">{{ n - 1 }}</span>
              </span>
            </span>
          </template>
        </div>
      </div>
    </div>
    <button class="cart-btn" @click.stop="$emit('checkout')">
      <span>确认下单</span>
      <span class="material-icons">chevron_right</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ count: number; total: number }>()
defineEmits<{ open: []; checkout: [] }>()

const priceChars = computed(() => {
  return props.total.toFixed(2).split('')
})
</script>

<style scoped>
.cart-bar {
  position: fixed; bottom: calc(65px + env(safe-area-inset-bottom, 0)); left: 50%; transform: translateX(-50%);
  z-index: 80; display: flex; align-items: center; justify-content: space-between;
  width: calc(100% - var(--container-margin) * 1); max-width: 720px;
  padding: 14px 16px 14px 24px;
  background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border-radius: var(--radius-full);
  border: 1px solid rgba(238, 165, 30, 0.457);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  cursor: pointer; transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.cart-icon-wrap .material-icons { font-size: 34px !important; }
.cart-badge { min-width: 24px; height: 24px; font-size: 12px; top: -8px; right: -12px; }
.cart-total { display: flex; align-items: baseline; font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--primary-container); line-height: 1.2; }
.roll-prefix { margin-right: 1px; }
.roll-dot { margin: 0 1px; }
.roll-digit-wrap { display: inline-block; height: 1.2em; overflow: hidden; width: 0.58em; }
.roll-digit-track { display: flex; flex-direction: column; transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.roll-digit-val { display: block; height: 1.2em; line-height: 1.2em; text-align: center; }
.cart-btn { padding: 12px 28px; font-size: 16px; gap: 4px; }
.cart-btn .material-icons { font-size: 20px !important; }
.cart-bar:active { transform: translateX(-50%) scale(0.98); }

.cart-left { display: flex; align-items: center; gap: 14px; min-width: 0; }

.cart-icon-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
.cart-icon-wrap .material-icons { font-size: 28px !important; color: var(--primary-container); }
.cart-badge {
  position: absolute; top: -6px; right: -10px; min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: var(--radius-full); background: var(--primary-container);
  color: var(--on-primary); font-family: var(--font-display); font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--surface);
}

.cart-info { display: flex; flex-direction: column; gap: 1px; }

.cart-btn {
  display: flex; align-items: center; gap: 2px; flex-shrink: 0;
  padding: 8px 18px; border: none; border-radius: var(--radius-full);
  background: var(--primary-container); color: var(--on-primary);
  font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700;
  cursor: pointer; transition: background 0.15s, transform 0.15s;
  box-shadow: 0 4px 12px rgba(255, 107, 0, 0.35);
}
.cart-btn:active { transform: scale(0.95); }
.cart-btn .material-icons { font-size: 18px !important; }

[data-theme="dark"] .cart-bar { background: rgba(0, 0, 0, 0.12);  }
[data-theme="dark"] .cart-icon-wrap .material-icons { color: var(--primary-container); }
[data-theme="dark"] .cart-total { color: var(--primary-container); }
[data-theme="dark"] .cart-badge { border-color: var(--inverse-surface); }
</style>
