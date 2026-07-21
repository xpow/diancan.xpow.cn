<template>
  <div class="cart-bar" @click="$emit('open')">
    <div class="cart-left">
      <div class="cart-icon-wrap">
        <span class="material-icons">shopping_basket</span>
        <span class="cart-badge">{{ count }}</span>
      </div>
      <div class="cart-info">
        <span class="cart-total">¥{{ total.toFixed(2) }}</span>
      </div>
    </div>
    <button class="cart-btn" @click.stop="$emit('checkout')">
      <span>确认下单</span>
      <span class="material-icons">chevron_right</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ count: number; total: number }>()
defineEmits<{ open: []; checkout: [] }>()
</script>

<style scoped>
.cart-bar {
  position: fixed; bottom: calc(65px + env(safe-area-inset-bottom, 0)); left: 50%; transform: translateX(-50%);
  z-index: 80; display: flex; align-items: center; justify-content: space-between;
  width: calc(100% - var(--container-margin) * 1); max-width: 600px;
  padding: 10px 10px 10px 16px;
  background: rgba(255, 255, 255, 0); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border-radius: var(--radius-full);
  border: 1px solid rgba(221, 174, 87, 0.183);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  cursor: pointer; transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
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
.cart-total { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); line-height: 1.2; }

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

[data-theme="dark"] .cart-bar { background: rgba(49, 48, 48, 0);  }
[data-theme="dark"] .cart-icon-wrap .material-icons { color: var(--primary-container); }
[data-theme="dark"] .cart-total { color: var(--primary-container); }
[data-theme="dark"] .cart-badge { border-color: var(--inverse-surface); }
</style>
