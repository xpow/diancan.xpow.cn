<template>
  <article :id="`dish-${dish.id}`" :class="['dish-card', highlight && 'dish-highlight']">
    <div class="dish-row">
      <div class="dish-body">
        <div class="dish-header">
          <h3 class="dish-name">{{ dish.name }}</h3>
          <span v-for="tag in dish.tags ?? []" :key="tag" class="dish-tag">{{ tag }}</span>
        </div>
        <p class="dish-desc">{{ dish.desc }}</p>
        <div class="dish-price-row">
          <template v-if="dish.promoPrice">
            <span class="dish-price dish-price-original">¥{{ dish.price.toFixed(2) }}<template v-if="dish.portionSize">/{{ dish.portionSize }}串</template></span>
            <span class="dish-promo-price">¥{{ dish.promoPrice.toFixed(2) }}<template v-if="dish.portionSize">/{{ dish.portionSize }}串</template></span>
            <span class="dish-promo-tag">{{ dish.promotionName }}</span>
          </template>
          <span v-else class="dish-price">¥{{ dish.price.toFixed(2) }}<template v-if="dish.portionSize">/{{ dish.portionSize }}串</template></span>
        </div>
      </div>
      <div class="dish-image-wrap">
        <img :src="dish.image" :alt="dish.name" class="dish-image" />
      </div>
    </div>

    <div v-if="dish.specGroups" class="dish-specs">
      <div v-for="(group, gi) in dish.specGroups" :key="gi" class="spec-group">
        <SpecSelector
          :group="group"
          :model-value="dish.selectedLabels?.[gi] ?? ''"
          @update:model-value="dish.selectedLabels![gi] = $event"
        />
        <input v-if="gi === qtyGroupIndex(dish.specGroups!)" class="qty-input" type="number" placeholder="其他数量"
          @input="onCustomQty(dish, gi, ($event.target as HTMLInputElement).value)" />
      </div>
    </div>

    <button class="add-card-btn" :class="{ 'in-cart': inCart }" @click="$emit('add', dish)">
      <span class="material-icons">{{ inCart ? 'check_circle' : 'add' }}</span>
    </button>
  </article>
</template>

<script setup lang="ts">
import SpecSelector from './SpecSelector.vue'
import type { MenuDish } from '@/composables/useMenu'

defineProps<{
  dish: MenuDish
  highlight: boolean
  inCart: boolean
  qtyGroupIndex: (groups: any[]) => number
  onCustomQty: (dish: MenuDish, gi: number, value: string) => void
}>()

defineEmits<{ add: [dish: MenuDish] }>()
</script>

<style scoped>
.dish-card { position: relative; padding: var(--spacing-md); background: var(--surface-container-lowest); border-radius: var(--radius-xl); border: 1px solid var(--outline-variant); transition: border-color 0.3s, box-shadow 0.3s; }
.dish-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
@keyframes dish-blink {
  0%, 100% { border-color: var(--primary-container); }
  50% { border-color: transparent; }
}
.dish-highlight { animation: dish-blink 0.3s ease 6; }

.dish-row { display: flex; gap: var(--spacing-md); }
.dish-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.dish-header { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; margin-bottom: 2px; }
.dish-name { margin: 0; font-family: var(--font-display); font-size: var(--text-headline-md); font-weight: 700; line-height: 1.3; color: var(--on-surface); }
.dish-tag { padding: 2px 8px; border-radius: var(--radius-full); background: rgba(255, 107, 0, 0.1); color: var(--primary-container); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; }

.dish-desc { margin: 2px 0 var(--spacing-sm); font-family: var(--font-body); font-size: var(--text-body-md); line-height: 1.5; color: var(--secondary); flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.dish-price-row { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
.dish-price { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.dish-price-original { font-size: 16px; font-weight: 600; color: var(--secondary); text-decoration: line-through; }
.dish-promo-price { font-family: var(--font-display); font-size: var(--text-price-display); font-weight: 800; color: var(--primary-container); }
.dish-promo-tag { display: inline-block; padding: 1px 8px; border-radius: 4px; background: var(--primary-container); color: var(--on-primary); font-family: var(--font-display); font-size: 11px; font-weight: 700; }

.dish-image-wrap { width: 100px; height: 100px; flex-shrink: 0; border-radius: var(--radius-lg); overflow: hidden; background: var(--surface-container); }
.dish-image { width: 100%; height: 100%; object-fit: cover; }

.dish-specs { margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--card-border-subtle); display: flex; flex-direction: column; gap: var(--spacing-md); }
.spec-group { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.qty-input { width: 96px; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--outline-variant); background: transparent; font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; color: var(--on-surface); outline: none; }
.qty-input:focus { border-color: var(--primary-container); }
.qty-input::placeholder { color: var(--outline); }

.add-card-btn { position: absolute; bottom: var(--spacing-md); right: var(--spacing-md); width: 36px; height: 36px; border: none; border-radius: 50%; background: var(--primary-container); color: var(--on-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(255, 107, 0, 0.3); transition: transform var(--transition-fast); }
.add-card-btn .material-icons { font-size: 20px !important; }
.add-card-btn:active { transform: scale(0.9); }
.add-card-btn.in-cart { background: #4caf50; box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3); }

[data-theme="dark"] .dish-card { border-color: var(--outline-variant); }
</style>
