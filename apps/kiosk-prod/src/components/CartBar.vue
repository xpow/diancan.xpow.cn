<template>
  <div class="cart-bar" @click="$emit('open')">
    <div class="cart-left">
      <div class="cart-icon-wrap">
        <span class="material-icons">shopping_basket</span>
        <span class="cart-badge">{{ count }}</span>
      </div>
      <div class="cart-info">
        <span class="cart-label">合计金额</span>
        <span class="cart-total"><small class="c-sign">¥</small>{{ total.toFixed(2) }}</span>
      </div>
    </div>
    <button class="btn-primary cart-btn" @click.stop="$emit('checkout')">去结算</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ count: number; total: number }>()
defineEmits<{ open: []; checkout: [] }>()
</script>

<style scoped>
.cart-bar { position: fixed; bottom: calc(72px + env(safe-area-inset-bottom, 0)); left: 50%; transform: translateX(-50%); z-index: 80; display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md); width: calc(100% - var(--container-margin) * 2); max-width: 600px; background: var(--cart-bar-bg); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: var(--radius-xl); border: 1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent); box-shadow: var(--shadow-glass); cursor: pointer; }
.cart-bar:active { transform: translateX(-50%) scale(0.99); }
.cart-left { display: flex; align-items: center; gap: var(--spacing-md); }
.cart-icon-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--primary-container); box-shadow: var(--shadow-primary); }
.cart-icon-wrap .material-icons { font-size: 30px !important; color: var(--on-primary); }
.cart-badge { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: var(--radius-full); background: var(--error); color: var(--on-error); font-family: var(--font-display); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
.cart-info { display: flex; flex-direction: column; }
.cart-label { font-family: var(--font-display); font-size: var(--text-body-md); font-weight: 600; text-transform: uppercase; color: var(--secondary); }
[data-theme="dark"] .cart-label { color: #fff; }
.cart-total { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.cart-btn { box-shadow: var(--shadow-primary); }
</style>
