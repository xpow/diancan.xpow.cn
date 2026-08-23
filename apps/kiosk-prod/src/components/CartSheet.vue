<template>
  <van-action-sheet :show="show" position="bottom" @update:show="$emit('update:show', $event)">
    <div class="cart-sheet">
      <div class="cart-sheet-header">
        <span class="cart-sheet-title">购物车</span>
        <button v-if="items.length" class="clear-btn" @click="$emit('clear')">
          <span class="material-icons">delete</span><span>清空</span>
        </button>
      </div>
      <div class="cart-items">
        <div v-for="item in items" :key="item.dishId" class="cart-item">
          <div class="cart-item-left">
            <div class="cart-item-name-row">
              <span class="cart-item-name">{{ item.name }}</span>
              <template v-if="isDiscounted(item)">
                <span class="cart-original-price"><small class="c-sign">¥</small>{{ origPrice(item).toFixed(2) }}<template v-if="item.portionSize">/{{ item.portionSize }}串</template></span>
                <span class="cart-final-price"><small class="c-sign">¥</small>{{ finalPrice(item).toFixed(2) }}<template v-if="item.portionSize">/{{ item.portionSize }}串</template></span>
              </template>
              <span v-else class="cart-final-price"><small class="c-sign">¥</small>{{ item.price.toFixed(2) }}<template v-if="item.portionSize">/{{ item.portionSize }}串</template></span>
            </div>
            <p class="cart-item-spec" @click="$emit('edit-spice', item)">
              {{ item.specs }}
              <span class="spec-edit-icon material-icons">edit</span>
            </p>
          </div>
          <div class="cart-item-right">
            <div class="cart-item-qty">
              <button class="qty-btn" @click="$emit('qty-change', item.dishId, -1)"><span class="material-icons">remove</span></button>
              <span class="qty-num">{{ item.quantity }}</span>
              <button class="qty-btn qty-btn-plus" @click="$emit('qty-change', item.dishId, 1)"><span class="material-icons">add</span></button>
            </div>
            <span v-if="promoLabel(item)" class="cart-promo-tag">{{ promoLabel(item) }}</span>
          </div>
        </div>
      </div>

      <div v-if="quote && (quote.appliedPromotions.length > 0 || quote.hints.length > 0 || quote.totals.discountAmount > 0)" class="cart-promo-section">
        <div v-for="promo in quote.appliedPromotions" :key="promo.id" class="promo-row">
          <span class="promo-icon material-icons">sell</span>
          <div class="promo-info">
            <span class="promo-name">{{ promo.name }}</span>
          </div>
          <span class="promo-saving">-<small class="c-sign">¥</small>{{ promo.discount.toFixed(2) }}</span>
        </div>
        <div v-for="hint in quote.hints" :key="hint" class="promo-hint">
          <span class="material-icons">lightbulb</span>
          <span v-html="highlight(hint)"></span>
          <button v-if="hint.includes('可享')" class="continue-order-btn" @click="$emit('close')">继续点餐</button>
        </div>
        <div v-if="quote.totals.discountAmount > 0" class="promo-summary">
          <span>已优惠</span>
          <span class="promo-summary-amount">-<small class="c-sign">¥</small>{{ quote.totals.discountAmount.toFixed(2) }}</span>
        </div>
      </div>

      <div v-if="items.length === 0" class="cart-empty">购物车是空的</div>
      <div class="cart-sheet-footer">
        <span class="cart-total-label">
          合计：
          <template v-if="quote && quote.totals.discountAmount > 0">
            <span class="strikethrough-price"><small class="c-sign">¥</small>{{ quote.totals.originalAmount.toFixed(2) }}</span>
          </template>
          <span class="cart-total-price">&nbsp;<small class="c-sign">¥</small>{{ total.toFixed(2) }}</span>
        </span>
        <button class="btn-primary checkout-btn" @click="$emit('checkout')">确认下单</button>
      </div>
    </div>
  </van-action-sheet>
</template>

<script setup lang="ts">
import type { StoredCartItem } from '@/utils/cart'
import type { QuoteResponse } from '@/composables/useCartQuote'

defineProps<{
  show: boolean
  items: StoredCartItem[]
  quote: QuoteResponse | null
  total: number
  isDiscounted: (item: StoredCartItem) => boolean
  origPrice: (item: StoredCartItem) => number
  finalPrice: (item: StoredCartItem) => number
  promoLabel: (item: StoredCartItem) => string
  highlight: (text: string) => string
}>()

defineEmits<{
  'update:show': [v: boolean]
  clear: []
  'edit-spice': [item: StoredCartItem]
  'qty-change': [dishId: string, delta: number]
  checkout: []
  close: []
}>()
</script>

<style scoped>
.cart-sheet { padding: 0 var(--container-margin) var(--container-margin); min-height: 200px; max-width: 600px; margin: 0 auto; border: 1px solid var(--outline-variant); border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
.cart-sheet-header { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md) 0; border-bottom: 1px solid var(--outline-variant); position: sticky; top: 0; background: var(--surface); z-index: 1; }
.cart-sheet-title { font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; }
.clear-btn { display: flex; align-items: center; gap: var(--spacing-xs); border: none; background: transparent; color: var(--secondary); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; cursor: pointer; padding: var(--spacing-xs) var(--spacing-sm); border-radius: var(--radius-md); }
.clear-btn:active { background: var(--surface-container-high); }
.cart-items { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.cart-item { display: flex; justify-content: space-between; align-items: flex-start; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--outline-variant); gap: var(--spacing-sm); }
.cart-item-left { flex: 1; min-width: 0; }
.cart-item-name-row { display: flex; align-items: center; gap: var(--spacing-xs); flex-wrap: wrap; }
.cart-item-name { font-family: var(--font-display); font-size: var(--text-body-lg); font-weight: 600; }
.cart-original-price { text-decoration: line-through; color: var(--secondary); font-size: 11px; font-weight: 400; }
.cart-final-price { font-size: var(--text-body-md); font-weight: 700; color: var(--primary-container); }
.cart-item-spec { margin: var(--spacing-xs) 0 0; font-size: var(--text-label-sm); color: var(--primary-container); display: flex; align-items: center; gap: 4px; cursor: pointer; }
.spec-edit-icon { font-size: 14px !important; opacity: 0.5; }
.cart-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: var(--spacing-xs); flex-shrink: 0; }
.cart-promo-tag { display: inline-block; padding: 1px 8px; border-radius: 4px; background: var(--primary-container); color: var(--on-primary); font-size: 11px; font-weight: 700; }
.cart-item-qty { display: flex; align-items: center; gap: var(--spacing-sm); }
.qty-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--outline-variant); background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--on-surface-variant); }
.qty-btn .material-icons { font-size: 16px !important; }
.qty-btn-plus { background: var(--primary-container); border-color: var(--primary-container); color: var(--on-primary); }
.qty-num { font-size: var(--text-body-lg); font-weight: 600; min-width: 20px; text-align: center; }
.cart-empty { text-align: center; padding: var(--spacing-xl); color: var(--secondary); }
.cart-sheet-footer { display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md) 0; }
.cart-total-label { font-size: var(--text-body-lg); font-weight: 600; }
.cart-total-price { color: var(--primary-container); font-weight: 800; font-family: var(--font-display); }
.strikethrough-price { text-decoration: line-through; color: var(--secondary); font-weight: 400; font-size: var(--text-label-sm); }
.c-sign { font-size: 0.85em; padding: 0 1px; }
.cart-promo-section { margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--cart-promo-bg); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: var(--spacing-sm); }
.promo-row { display: flex; align-items: center; gap: var(--spacing-sm); font-size: var(--text-label-sm); }
.promo-icon { font-size: 16px !important; color: var(--primary-container); flex-shrink: 0; }
.promo-info { flex: 1; display: flex; flex-direction: column; }
.promo-name { font-weight: 600; color: var(--on-surface); }
.promo-saving { font-weight: 700; color: var(--error); flex-shrink: 0; }
.promo-hint { display: flex; align-items: center; gap: var(--spacing-sm); font-size: 11px; color: var(--secondary); }
.promo-hint .material-icons { font-size: 14px !important; color: var(--primary-container); flex-shrink: 0; }
.promo-hint .material-icons { font-size: 14px !important; color: var(--primary-container); flex-shrink: 0; }
.promo-hint .hl-amount { color: var(--primary-container); font-weight: 800; }
.promo-hint .hl-promo { color: var(--primary-container); font-weight: 700; }
.promo-hint .continue-order-btn { flex-shrink: 0; padding: 2px 12px; border: 1px dashed var(--primary-container); border-radius: var(--radius-full); background: transparent; color: var(--primary-container); font-family: var(--font-display); font-size: 11px; font-weight: 600; cursor: pointer; }
.promo-hint .continue-order-btn:active { background: var(--surface-container-high); }
.promo-summary { display: flex; justify-content: space-between; align-items: center; padding-top: var(--spacing-sm); border-top: 1px dashed var(--outline-variant); font-size: var(--text-label-sm); font-weight: 600; }
.promo-summary-amount { color: var(--error); font-weight: 700; }
</style>

<style>
[data-theme="dark"] .cart-promo-section { color: #fff; }
[data-theme="dark"] .promo-hint { color: #ccc; }
[data-theme="dark"] .clear-btn { color: #fff; }
</style>
