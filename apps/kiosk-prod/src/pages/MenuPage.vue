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
      <section v-if="heroVisible" class="hero-context" @dblclick="heroVisible = false">
        <img :src="heroImage" alt="菜单横幅" class="hero-img" />
        <div class="hero-overlay">
          <h2>精选食材，炭火现烤</h2>
          <p>{{ displayTitle }}</p>
        </div>
        <button class="hero-close" @click.stop="heroVisible = false" aria-label="关闭横幅" title="双击也可关闭">
          <span class="material-icons">close</span>
        </button>
      </section>

      <div ref="navSentinel" class="nav-sentinel"></div>
      <div ref="navWrapRef" class="category-nav-wrap">
        <nav :class="['category-nav', navFloating && 'floating']">
          <button
            v-for="category in categories.slice(0, 3)" :key="category.id"
            :class="['category-pill', selectedCategoryId === category.id && 'category-pill-active']"
            @click.stop="selectedCategoryId = category.id"
          >
            <span class="material-icons">{{ categoryIcons[category.name] || 'restaurant' }}</span>
            {{ category.name }}
            <span v-if="categoryDishCount(category.id) > 0" class="category-count">{{ categoryDishCount(category.id) }}</span>
          </button>
          <button v-if="categories.length > 3" class="cat-expand-btn" :class="{ 'cat-expand-open': showCatDropdown }" @click="showCatDropdown = !showCatDropdown">
            <span class="material-icons">expand_more</span>
          </button>
        </nav>
        <div v-if="categories.length > 3" ref="expandWrapRef" class="cat-expand-wrap" :class="{ 'cat-expand-open': showCatDropdown }">
          <div class="cat-expand-inner">
            <button
              v-for="category in categories.slice(3)" :key="'extra-' + category.id"
              :class="['category-pill', selectedCategoryId === category.id && 'category-pill-active']"
              @click.stop="selectedCategoryId = category.id"
            >
              <span class="material-icons">{{ categoryIcons[category.name] || 'restaurant' }}</span>
              {{ category.name }}
              <span v-if="categoryDishCount(category.id) > 0" class="category-count">{{ categoryDishCount(category.id) }}</span>
            </button>
          </div>
        </div>
      </div>

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
            @add="(dish, btn) => { addToCart(dish); nextTick(() => flyToCart(btn)) }"
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
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { useMenu } from '@/composables/useMenu'
import { useCartQuote } from '@/composables/useCartQuote'
import { useSpecEditor } from '@/composables/useSpecEditor'
import KioskTopBar from '@/components/KioskTopBar.vue'
import BottomNav from '@/components/BottomNav.vue'
import DishCard from '@/components/DishCard.vue'
import CartBar from '@/components/CartBar.vue'
import CartSheet from '@/components/CartSheet.vue'
import SpecSelector from '@/components/SpecSelector.vue'
import { flyToCart } from '@/utils/flyToCart'

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
const heroVisible = ref(true)
const showCatDropdown = ref(false)

const categoryCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const dish of dishes.value) {
    counts.set(dish.categoryId, (counts.get(dish.categoryId) ?? 0) + 1)
  }
  return counts
})
function categoryDishCount(categoryId: string) {
  return categoryCounts.value.get(categoryId) ?? 0
}

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
  watch(merchantName, (v) => { if (v) document.title = `菜单-${v}` }, { immediate: true })
  watch(loading, (val) => {
    if (!val) nextTick()
  }, { immediate: true })
})


</script>

<style scoped>
.page { min-height: 100vh; background: var(--surface); padding-top: 56px; padding-bottom: 180px; }
.page-content { padding: 0 var(--container-margin) var(--spacing-lg); max-width: 600px; margin: 0 auto; }
.hero-context { position: relative; width: auto; height: 228px; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); overflow: hidden; margin-bottom: var(--spacing-lg); }
.hero-img { width: 100%; height: 100%; display: block; object-fit: cover; filter: brightness(0.72); }
.hero-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: var(--spacing-md) max(var(--container-margin), calc(50vw - 300px + var(--container-margin))); background: linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.48) 100%); }
.hero-overlay h2 { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 800; line-height: 1.2; color: #fff; }
.hero-overlay p { margin: var(--spacing-xs) 0 0; font-family: var(--font-display); font-size: var(--text-label-lg); font-weight: 600; color: rgba(255, 255, 255, 0.92); }
.hero-close { position: absolute; top: 12px; right: 12px; z-index: 2; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; border-radius: 50%; background: rgba(0, 0, 0, 0.35); color: #fff; cursor: pointer; transition: background var(--transition-fast); }
.hero-close .material-icons { font-size: 20px; }
.hero-close:active { background: rgba(0, 0, 0, 0.55); }
.category-nav-wrap { position: sticky; top: 52px; z-index: 40; margin-left: calc(50% - 50vw); margin-right: calc(50% - 50vw); padding: var(--spacing-md) var(--container-margin) 14px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: box-shadow var(--transition-fast); }
.category-nav-wrap.floating { box-shadow: 0 6px 18px rgba(87, 32, 0, 0.05); }
.category-nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; width: 100%; }
.cat-expand-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 1px solid var(--outline-variant); border-radius: var(--radius-full); background: var(--surface); color: var(--on-surface-variant); cursor: pointer; flex-shrink: 0; transition: all var(--transition-fast); }
.cat-expand-btn:active { background: var(--surface-variant); }
.cat-expand-btn .material-icons { transition: transform 0.25s ease; }
.cat-expand-open .cat-expand-btn .material-icons { transform: rotate(180deg); }
.cat-expand-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
.cat-expand-wrap.cat-expand-open { grid-template-rows: 1fr; }
.cat-expand-inner { overflow: hidden; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding-top: 8px; }
.nav-sentinel { width: 1px; height: 1px; pointer-events: none; }
.category-pill { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border: 1px solid var(--outline-variant); border-radius: var(--radius-full); background: var(--surface); color: var(--on-surface-variant); font-family: var(--font-display); font-size: var(--text-body-md); font-weight: 600; cursor: pointer; transition: all var(--transition-fast); white-space: nowrap; flex-shrink: 0; }
.category-pill .material-icons { font-size: 18px !important; }
.category-count { min-width: 20px; padding: 1px 7px; border-radius: var(--radius-full); background: var(--surface-variant); color: var(--on-surface-variant); font-size: var(--text-label-sm); font-weight: 700; text-align: center; }
.category-pill-active .category-count { background: var(--primary); color: var(--on-primary); }
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
  .hero-overlay h2, .dish-name, .cart-sheet-title { font-size: var(--text-headline-lg); }
  .category-pill { flex-shrink: 0; padding: 8px 11px; font-size: 13px; }
  .category-pill .material-icons { font-size: 15px !important; margin-right: 2px; }
  .category-pill .category-count { font-size: 10px; padding: 0 4px; min-width: 16px; height: 16px; line-height: 16px; }
  .cat-expand-btn { width: 36px; height: 36px; }
  .dish-card { padding: var(--spacing-md); }
  :deep(.dish-image) { height: 176px; }

}
</style>
