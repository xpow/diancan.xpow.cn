<template>
  <div class="checkout-page">
    <header class="top-bar">
      <div class="top-left">
        <span class="material-symbols-outlined top-icon">restaurant_menu</span>
        <h1 class="top-title">Sizzling Skewers</h1>
      </div>
      <button class="close-btn" @click="router.push('/menu')">
        <span class="material-symbols-outlined">close</span>
      </button>
    </header>

    <main>
      <section class="hero-banner">
        <div class="hero-img">
          <img
            src="/src/assets/images/hero-checkout.png"
            alt="烧烤"
            class="hero-img-el"
          />
          <div class="hero-overlay">
            <h2 class="hero-title">订单确认</h2>
            <p class="hero-sub">感谢选择 Sizzling Skewers</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="toggle-wrap">
          <div class="toggle-bar">
            <button
              :class="['toggle-btn', orderType === 'dine_in' && 'toggle-active']"
              @click="orderType = 'dine_in'"
            >堂食</button>
            <button
              :class="['toggle-btn', orderType === 'takeaway' && 'toggle-active']"
              @click="orderType = 'takeaway'"
            >自提</button>
            <div class="toggle-indicator" :class="orderType === 'takeaway' ? 'indicator-right' : 'indicator-left'"></div>
          </div>
        </div>
      </section>

      <section class="section glass-card">
        <div class="order-summary-header">
          <h3 class="summary-title">已选项目</h3>
          <span class="summary-count">{{ items.length }} 个项目</span>
        </div>

        <div v-for="item in items" :key="item.dishId" class="order-item">
          <div class="item-img">
            <img :src="dishImage(item.dishId)" :alt="item.name" class="item-img-el" />
          </div>
          <div class="item-body">
            <p class="item-name">{{ item.name }}</p>
            <p v-if="item.specs" class="item-spec">{{ item.specs }}</p>
          </div>
          <div class="item-price-col">
            <p class="item-price">¥{{ (item.price * item.quantity).toFixed(2) }}</p>
            <p class="item-qty">x{{ item.quantity }}</p>
          </div>
        </div>

        <div class="order-totals">
          <div class="total-row">
            <span class="total-label">商品总计</span>
            <span class="total-value">¥{{ totalPrice.toFixed(2) }}</span>
          </div>
          <div class="total-row" v-if="eligible">
            <span class="total-label">
              限时满减
              <span class="promo-tag">满{{ promotion.threshold }}减{{ promotion.discount }}</span>
            </span>
            <span class="total-discount">-¥{{ discount.toFixed(2) }}</span>
          </div>
          <div v-else-if="remainingForDiscount > 0" class="total-row promo-hint">
            <span class="promo-hint-text">还差 ¥{{ remainingForDiscount }} 即可享受满{{ promotion.threshold }}减{{ promotion.discount }}</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="payment-card">
          <div class="payment-left">
            <span class="material-symbols-outlined payment-icon">account_balance_wallet</span>
            <span class="payment-label">微信支付</span>
          </div>
          <span class="material-symbols-outlined payment-arrow">chevron_right</span>
        </div>
      </section>
    </main>

    <footer class="bottom-bar">
      <div class="bottom-left">
        <p class="pay-label">待支付金额</p>
        <div class="pay-amount">
          <span class="pay-symbol">¥</span>
          <span class="pay-value">{{ finalTotal }}</span>
        </div>
      </div>
      <button class="pay-btn" @click="confirmOrder">确认并支付</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '@/stores/cart'
import { showToast } from 'vant'
import 'vant/es/toast/style'

const router = useRouter()
const { items, totalPrice, clear: clearCart } = useCart()
const orderType = ref<'dine_in' | 'takeaway'>('dine_in')

const DISH_IMAGES: Record<string, string> = {
  d1000: '/src/assets/images/yrc-s1.jpg?raw=true',
  d1010: '/src/assets/images/yrc-x.webp?raw=true',
  d1011: '/src/assets/images/hlyrc.jpg?raw=true',
  d1012: '/src/assets/images/nlt.jpg?raw=true',
  d2000: '/src/assets/images/kqz.jpg?raw=true',
  d2001: '/src/assets/images/kjc.jpg?raw=true',
  d2002: '/src/assets/images/kym.jpg?raw=true',
  d3001: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=300&fit=crop',
  d3002: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=300&fit=crop',
}

function dishImage(dishId: string): string {
  const baseId = dishId?.split(/[^\w]/)[0] || ''
  return DISH_IMAGES[baseId] || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop'
}

// Mock 满减规则
const promotion = { threshold: 100, discount: 12 }
const eligible = computed(() => Number(totalPrice.value) >= promotion.threshold)
const discount = computed(() => eligible.value ? promotion.discount : 0)
const remainingForDiscount = computed(() => Math.max(0, promotion.threshold - Number(totalPrice.value)))
const finalTotal = computed(() => Math.max(0, Number(totalPrice.value) - discount.value).toFixed(2))

function confirmOrder() {
  const itemsData = items.map((i: any) => ({
    dishId: i.dishId,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    specs: i.specs,
  }))

  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantId: 'demo-merchant',
      branchId: 'demo-branch',
      orderType: orderType.value,
      items: itemsData,
    }),
  })
    .then((r) => r.json())
    .then((order) => {
      clearCart()
      router.push({ path: '/pickup', state: { order } })
    })
    .catch(() => {
      showToast('下单失败，请重试')
    })
}
</script>

<style scoped>
.top-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; background: rgba(252, 249, 248, 0.8); backdrop-filter: blur(12px);
}
.top-left { display: flex; align-items: center; gap: 8px; }
.top-icon { color: var(--primary-container); font-size: 24px; }
.top-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--primary-container); text-transform: uppercase; letter-spacing: -0.02em; margin: 0; }
.close-btn { width: 40px; height: 40px; border-radius: 50%; border: none; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); }
.close-btn:active { background: var(--surface-container-high); }

main { padding: 56px 16px 100px; max-width: 672px; margin: 0 auto; }

.hero-banner { position: relative; height: 128px; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
.hero-img { width: 100%; height: 100%; position: relative; background: linear-gradient(135deg, #1a1a1a, #4a2a0a); }
.hero-img-el { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
.hero-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; justify-content: flex-end; padding: 16px; color: #fff; }
.hero-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 0; }
.hero-sub { font-size: 12px; font-weight: 600; opacity: 0.9; margin: 2px 0 0; letter-spacing: 0.02em; }

.section { margin-bottom: 24px; }
.toggle-bar { position: relative; display: flex; background: var(--surface-container-low); border-radius: 9999px; padding: 4px; }
.toggle-btn { flex: 1; padding: 12px; border-radius: 9999px; border: none; background: transparent; font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--secondary); cursor: pointer; z-index: 2; transition: color 0.3s; }
.toggle-active { color: var(--on-primary); }
.toggle-indicator { position: absolute; top: 4px; bottom: 4px; width: calc(50% - 4px); background: var(--primary-container); border-radius: 9999px; transition: left 0.3s; z-index: 1; box-shadow: 0 2px 8px rgba(255,107,0,0.2); }
.indicator-left { left: 4px; }
.indicator-right { left: calc(50% + 0px); }

.glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(226, 191, 176, 0.3); border-radius: 12px; padding: 16px; }
.order-summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.summary-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin: 0; }
.summary-count { font-size: 12px; font-weight: 600; color: var(--secondary); letter-spacing: 0.02em; }

.order-item { display: flex; align-items: center; gap: 16px; padding: 8px 0; }
.item-img { width: 64px; height: 64px; border-radius: 8px; flex-shrink: 0; overflow: hidden; background: var(--surface-container-high); }
.item-img-el { width: 100%; height: 100%; object-fit: cover; }
.item-body { flex: 1; }
.item-name { font-family: var(--font-display); font-size: 14px; font-weight: 600; margin: 0; }
.item-spec { font-size: 12px; font-weight: 600; color: var(--secondary); margin: 2px 0 0; letter-spacing: 0.02em; }
.item-price-col { text-align: right; }
.item-price { font-family: var(--font-display); font-size: 20px; font-weight: 800; color: var(--primary-container); margin: 0; }
.item-qty { font-size: 12px; font-weight: 600; color: var(--secondary); margin: 2px 0 0; letter-spacing: 0.02em; }

.order-totals { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(226, 191, 176, 0.3); display: flex; flex-direction: column; gap: 8px; }
.total-row { display: flex; justify-content: space-between; font-size: 14px; line-height: 20px; }
.total-label { color: var(--secondary); }
.total-value { color: var(--text); }
.total-discount { color: var(--error); }
.promo-tag { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 4px; background: rgba(255,107,0,0.1); color: var(--primary-container); font-size: 11px; font-weight: 600; vertical-align: middle; }
.promo-hint { justify-content: center; }
.promo-hint-text { font-size: 12px; color: var(--primary-container); font-weight: 600; }

.payment-card { display: flex; align-items: center; justify-content: space-between; background: var(--surface-container); border-radius: 12px; padding: 16px; }
.payment-left { display: flex; align-items: center; gap: 8px; }
.payment-icon { color: var(--primary-container); }
.payment-label { font-family: var(--font-display); font-size: 14px; font-weight: 600; }
.payment-arrow { color: var(--secondary); }

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 16px; background: rgba(252, 249, 248, 0.9); backdrop-filter: blur(12px);
  border-radius: 12px 12px 0 0; box-shadow: 0 -4px 12px rgba(0,0,0,0.04);
}
.bottom-left { display: flex; flex-direction: column; }
.pay-label { font-size: 12px; font-weight: 600; color: var(--secondary); margin: 0; letter-spacing: 0.02em; }
.pay-amount { display: flex; align-items: baseline; gap: 2px; }
.pay-symbol { color: var(--primary-container); font-weight: 700; font-size: 14px; }
.pay-value { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--primary-container); line-height: 1; }
.pay-btn { flex: 1; padding: 16px; border-radius: 9999px; border: none; background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: 18px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 20px rgba(255,107,0,0.15); transition: transform 0.15s; }
.pay-btn:active { transform: scale(0.95); }
</style>
