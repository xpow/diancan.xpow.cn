<template>
  <div class="cart-bar" @click="$emit('open')">
    <div class="cart-left">
      <div class="cart-icon-wrap">
        <span class="material-icons">shopping_basket</span>
        <span class="cart-badge">{{ count }}</span>
      </div>
      <div class="cart-info">
        <div class="cart-total">
          <span class="roll-char">¥</span>
          <span v-for="d in intDigits" :key="d" class="roll-digit-wrap">
            <span class="roll-digit-track" :style="{ transform: `translateY(-${d}0%)` }">
              <span v-for="n in 10" :key="n" class="roll-digit-val">{{ n - 1 }}</span>
            </span>
          </span>
          <span class="roll-char">.</span>
          <span v-for="d in decDigits" :key="d" class="roll-digit-wrap">
            <span class="roll-digit-track" :style="{ transform: `translateY(-${d}0%)` }">
              <span v-for="n in 10" :key="n" class="roll-digit-val">{{ n - 1 }}</span>
            </span>
          </span>
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
import { computed, ref, onMounted, watch } from 'vue'
const props = defineProps<{ count: number; total: number }>()
defineEmits<{ open: []; checkout: [] }>()

const displayTotal = ref(0)

const intDigits = computed(() => {
  const v = Math.floor(displayTotal.value)
  return [Math.floor(v / 100) % 10, Math.floor(v / 10) % 10, v % 10]
})
const decDigits = computed(() => {
  const v = Math.round(displayTotal.value * 100)
  return [Math.floor(v / 10) % 10, v % 10]
})

let initialDone = false
onMounted(() => {
  setTimeout(() => { displayTotal.value = props.total; initialDone = true }, 700)
})
watch(() => props.total, (v) => { if (initialDone) displayTotal.value = v })
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
.cart-total { display: flex; align-items: baseline; font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--primary-container); line-height: 1; }
.roll-prefix, .roll-dot { flex-shrink: 0; }
.roll-digit-wrap { display: inline-block; height: 1em; overflow: hidden; position: relative; flex-shrink: 0; }
.roll-digit-track { display: flex; flex-direction: column; transition: transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) 0.7s; }
.roll-digit-val { display: block; width: 1ch; height: 1em; line-height: 1; text-align: center; }
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
