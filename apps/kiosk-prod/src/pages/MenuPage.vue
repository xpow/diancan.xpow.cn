<template>
  <main class="page">
    <KioskTopBar
      :title="displayTitle"
      :device-code="deviceCode"
      :status-text="statusText"
      :branch-status="branchStatus"
      :business-hours="businessHours"
      :rest-reason="restReason"
      :show-ticket="true"
      :has-active-order="hasActiveOrder"
    />

    <div class="page-content">
      <section class="hero-context">
        <img :src="heroImage" alt="菜单横幅" class="hero-img" />
        <div class="hero-overlay"></div>
        <div class="hero-glass">
          <h2>精选食材，炭火现烤</h2>
          <p>{{ displayTitle }}</p>
        </div>
      </section>

      <div ref="navSentinel" class="nav-sentinel"></div>
      <nav :class="['category-nav', navFloating && 'floating']">
        <button
          v-for="category in categories" :key="category.id"
          :class="['category-pill', selectedCategoryId === category.id && 'category-pill-active']"
          @click="selectedCategoryId = category.id"
        >
          <span class="material-icons">{{ categoryIcons[category.name] || 'restaurant' }}</span>
          {{ category.name }}
        </button>
      </nav>

      <section v-if="errorMessage" class="status-card error-card">
        <span class="material-icons">error_outline</span>
        <p>{{ errorMessage }}</p>
      </section>
      <section v-else-if="loading" class="status-card loading-card">
        <div class="spinner"></div>
        <p>菜单加载中...</p>
      </section>

      <section v-else class="dish-list">
        <template v-if="filteredDishes.length">
          <DishCard
            v-for="dish in filteredDishes" :key="dish.id"
            :dish="dish"
            :highlight="highlightDishId === dish.id"
            :in-cart="cartDishIds.has(dish.id)"
            :qty-group-index="qtyGroupIndex"
            :on-custom-qty="onCustomQty"
            @add="addToCart"
          />
        </template>
        <p v-else class="empty-category">该分类暂无商品</p>
      </section>
    </div>

    <CartBar v-if="cartCount > 0" :count="cartCount" :total="cartTotal" @open="showCart = true" @checkout="goCheckout" />

    <CartSheet
      :show="showCart"
      :items="cartItems"
      :quote="cartQuote"
      :total="cartTotal"
      :is-discounted="isItemDiscounted"
      :orig-price="getItemOriginalPrice"
      :final-price="getItemFinalPrice"
      :promo-label="cartItemPromotionLabel"
      :highlight="highlightAmount"
      @update:show="showCart = $event"
      @clear="clearCart"
      @edit-spice="startEditSpice"
      @qty-change="updateCartQuantity"
      @checkout="goCheckout"
      @close="showCart = false"
    />

    <van-action-sheet v-model:show="showSpecEditor" title="修改规格" close-on-popup-close>
      <div class="spec-editor-content">
    <template v-for="(group, gi) in editingSpecGroups" :key="gi">
      <SpecSelector
        v-if="group.name !== '串数' && group.name !== '份数'"
        :group="group"
        :model-value="editingSelections[gi] ?? ''"
        @update:model-value="editingSelections[gi] = $event"
      />
    </template>
        <button class="btn-primary confirm-spec-btn" @click="confirmSpiceChange(hydrateCart, debouncedFetchQuote)">确认</button>
      </div>
    </van-action-sheet>

    <BottomNav current="menu" />
  </main>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useMenu } from '@/composables/useMenu'
import { useCartQuote } from '@/composables/useCartQuote'
import { useSpecEditor } from '@/composables/useSpecEditor'
import KioskTopBar from '@/components/KioskTopBar.vue'
import BottomNav from '@/components/BottomNav.vue'
import DishCard from '@/components/DishCard.vue'
import CartBar from '@/components/CartBar.vue'
import CartSheet from '@/components/CartSheet.vue'
import SpecSelector from '@/components/SpecSelector.vue'

const {
  loading, errorMessage, merchantName, branchName,
  deviceId, deviceCode, statusText, branchStatus, displayTitle, heroImage,
  categoryIcons, categories, selectedCategoryId, filteredDishes,
  highlightDishId, navFloating, navSentinel,
  qtyGroupIndex, onCustomQty, dishes, businessHours, restReason,
} = useMenu()

const {
  showCart, cartItems, cartQuote, cartCount, cartTotal, cartDishIds,
  hydrateCart, isItemDiscounted, getItemOriginalPrice,
  getItemFinalPrice, cartItemPromotionLabel, highlightAmount,
  addToCart, updateCartQuantity, clearCart, goCheckout, debouncedFetchQuote,
} = useCartQuote(dishes)

const {
  showSpecEditor, editingSpecGroups, editingSelections,
  startEditSpice, confirmSpiceChange,
} = useSpecEditor(dishes)

const hasActiveOrder = ref(false)

function checkActiveOrder() {
  try {
    const raw = localStorage.getItem('active-order')
    hasActiveOrder.value = raw ? JSON.parse(raw) : false
  } catch { hasActiveOrder.value = false }
}

watch(showCart, (val) => {
  if (val) debouncedFetchQuote()
})

onMounted(() => {
  hydrateCart()
  checkActiveOrder()
})
</script>

<style scoped>
.page { min-height: 100vh; background: var(--surface); padding-top: 56px; padding-bottom: 180px; }
.page-content { padding: 0 var(--container-margin) var(--spacing-lg); max-width: 600px; margin: 0 auto; }
.hero-context { position: relative; width: auto; height: 228px; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); overflow: hidden; margin-bottom: var(--spacing-lg); }
.hero-img { width: 100%; height: 100%; display: block; object-fit: cover; filter: brightness(0.72); }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.48) 100%); }
.hero-glass { position: absolute; bottom: var(--spacing-md); left: var(--container-margin); right: var(--container-margin); background: rgba(255,255,255,0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: var(--radius-xl); padding: var(--spacing-md); border: 1px solid rgba(255,255,255,0.3); }
.hero-glass h2 { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 800; line-height: 1.2; color: var(--on-surface); }
.hero-glass p { margin: var(--spacing-xs) 0 0; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; color: var(--on-surface-variant); }
.category-nav { display: flex; justify-content: center; gap: 10px; width: auto; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); padding: var(--spacing-md) var(--container-margin) 14px; position: sticky; top: 52px; z-index: 40; overflow-x: auto; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: box-shadow var(--transition-fast); }
.category-nav.floating { box-shadow: 0 6px 18px rgba(87, 32, 0, 0.05); }
.nav-sentinel { width: 1px; height: 1px; pointer-events: none; }
.category-pill { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: 1px solid var(--outline-variant); border-radius: var(--radius-full); background: var(--surface); color: var(--on-surface-variant); font-family: var(--font-display); font-size: var(--text-body-md); font-weight: 600; cursor: pointer; transition: all var(--transition-fast); white-space: nowrap; }
.category-pill .material-icons { font-size: 18px !important; }
.category-pill-active { background: var(--primary-container); border-color: var(--primary-container); color: var(--on-primary); box-shadow: 0 4px 12px rgba(255, 107, 0, 0.18); }
.status-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--spacing-md); padding: var(--spacing-xl); margin-top: var(--spacing-lg); border-radius: var(--radius-xl); background: var(--surface-container-low); }
.status-card .material-icons { font-size: 48px !important; }
.error-card { color: var(--error); }
.loading-card { color: var(--secondary); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--surface-container); border-top-color: var(--primary-container); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.dish-list { display: flex; flex-direction: column; gap: var(--spacing-md); }
.empty-category { text-align: center; padding: var(--spacing-xl); color: var(--secondary); font-family: var(--font-display); font-size: var(--text-body-md); }
@media (min-width: 500px) {
  .dish-list { display: grid; grid-template-columns: 1fr 1fr; }
  .page-content { max-width: none; }
  .hero-overlay { padding-bottom: var(--spacing-lg); }
  .category-nav { gap: 12px; padding-bottom: 18px; }
  .category-pill { padding: 12px 24px; font-size: var(--text-label-lg); }
  .category-pill .material-icons { font-size: 20px !important; }
}
@media (min-width: 1200px) {
  .dish-list { grid-template-columns: repeat(4, 1fr); }
}
.spec-editor-content { padding: var(--spacing-lg); display: flex; flex-direction: column; gap: var(--spacing-md); }
.spec-editor-content .btn-primary { align-self: center; }
@media (max-width: 499px) {
  .page { padding-top: 52px; padding-bottom: 156px; }
  .hide-mobile { display: none; }
  .category-nav { top: 52px; overflow-x: auto; padding: 10px var(--container-margin) 12px; }
  .hero-context { margin-bottom: var(--spacing-md); }
  .hero-glass h2 { font-size: var(--text-headline-lg); }
  .dish-name, .cart-sheet-title { font-size: var(--text-headline-lg); }
  .category-pill { flex-shrink: 0; padding: 8px 16px; font-size: var(--text-label-sm); }
  .category-pill .material-icons { font-size: 16px !important; }
  .dish-card { padding: var(--spacing-md); }
  :deep(.dish-image) { height: 176px; }

}
</style>
