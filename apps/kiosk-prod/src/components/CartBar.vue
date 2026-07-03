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
    <button class="cart-btn" @click.stop="$emit('checkout')">去结算</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ count: number; total: number }>()
defineEmits<{ open: []; checkout: [] }>()
</script>

<style scoped>
.cart-bar { position: fixed; bottom: 80px; left: 0; right: 0; z-index: 80; max-width: 600px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-md); background: var(--frosted-bg); backdrop-filter: blur(12px); border-radius: var(--radius-xl); border: 1px solid var(--card-border-strong); box-shadow: var(--shadow-lg); cursor: pointer; }
.cart-bar:active { transform: scale(0.99); }
.cart-left { display: flex; align-items: center; gap: var(--spacing-md); }
.cart-icon-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: var(--radius-lg); background: var(--primary-container); box-shadow: var(--shadow-primary); }
.cart-icon-wrap .material-icons { font-size: 30px !important; color: var(--on-primary); }
.cart-badge { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: var(--radius-full); background: var(--error); color: var(--on-error); font-family: var(--font-display); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
.cart-info { display: flex; flex-direction: column; }
.cart-label { font-family: var(--font-display); font-size: var(--text-body-md); font-weight: 600; text-transform: uppercase; color: var(--secondary); }
.cart-total { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.cart-btn { display: inline-flex; align-items: center; justify-content: center; padding: 14px 22px; border: none; border-radius: var(--radius-full); background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 700; line-height: 1; white-space: nowrap; cursor: pointer; box-shadow: var(--shadow-primary); }
</style>
