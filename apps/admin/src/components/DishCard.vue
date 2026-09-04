<template>
  <div class="dish-card">
    <div class="dish-card-header">
      <div class="dish-thumb" v-if="!imgError">
        <img :src="getDishThumbUrl(dish)" :alt="dish.name" @error="handleThumbFallback(dish, $event)" />
      </div>
      <div class="dish-main">
        <div class="dish-title-row">
          <span class="dish-name">{{ dish.name }}</span>
          <span :class="['status-badge', dish.status === 'active' ? 'status-active' : 'status-inactive']" @click.stop="$emit('toggleStatus', dish)">
            {{ dish.status === 'active' ? '上架中' : '已下架' }}
          </span>
        </div>
        <span class="dish-id">{{ dish.id }}</span>
        <p class="dish-desc" v-if="dish.desc">{{ dish.desc }}</p>
        <div class="dish-tags">
          <span class="category-tag">{{ dish.categoryName }}</span>
          <span v-if="dish.portionSize" class="portion-tag">{{ dish.portionSize }}串/份</span>
        </div>
      </div>
    </div>

    <div class="dish-card-body">
      <div class="dish-price">
        <span class="price">¥{{ dish.price.toFixed(2) }}</span>
        <span v-if="dish.portionSize" class="price-unit">/{{ dish.portionSize }}串</span>
      </div>
      <div class="dish-stock">
        <template v-if="dish.stockEnabled">
          <input type="number" v-model.number="localStock" min="0" class="stock-input" @click.stop @change="$emit('updateStock', dish, localStock)" />
          <button class="btn-text-danger" @click.stop="$emit('disableStock', dish)">取消</button>
        </template>
        <template v-else>
          <span class="stock-unlimited">库存不限</span>
          <button class="btn-text-success" @click.stop="$emit('enableStock', dish)">启用</button>
        </template>
      </div>
    </div>

    <div class="dish-card-footer">
      <div class="sort-control">
        <span class="sort-label">排序</span>
        <input type="number" v-model.number="localSort" min="0" max="999" class="sort-input" @click.stop @change="$emit('updateSort', dish, localSort)" />
      </div>
      <div class="dish-actions">
        <button class="btn-action btn-edit" title="编辑" @click.stop="$emit('edit', dish)">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="btn-action btn-delete" title="删除" @click.stop="$emit('delete', dish.id)">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Dish {
  id: string
  name: string
  desc?: string
  price: number
  image?: string
  categoryName: string
  categoryId: string
  status: string
  sort: number
  stockEnabled: boolean
  stock: number
  portionSize?: number
  sellByPortion?: boolean
}

const props = defineProps<{ dish: Dish }>()

const emit = defineEmits<{
  edit: [dish: Dish]
  delete: [id: string]
  toggleStatus: [dish: Dish]
  updateSort: [dish: Dish, sort: number]
  updateStock: [dish: Dish, stock: number]
  enableStock: [dish: Dish]
  disableStock: [dish: Dish]
}>()

const localSort = ref(props.dish.sort)
const localStock = ref(props.dish.stock)
const imgError = ref(false)

const IMAGE_BASE = 'https://diancan.xpow.cn'

watch(() => props.dish.sort, (v) => { localSort.value = v })
watch(() => props.dish.stock, (v) => { localStock.value = v })

function getDishThumbUrl(dish: Dish): string {
  if (dish.image) return dish.image
  return `${IMAGE_BASE}/src/assets/images/products/${dish.id}_s.jpg`
}

function handleImgError() {
  imgError.value = true
}

function handleThumbFallback(dish: Dish, e: Event) {
  const img = e.target as HTMLImageElement
  if (img.src.includes('_s.jpg')) {
    img.src = `${IMAGE_BASE}/src/assets/images/products/${dish.id}.jpg`
    img.onerror = () => { imgError.value = true }
  } else {
    imgError.value = true
  }
}
</script>

<style scoped>
.dish-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.15s;
  display: flex;
  flex-direction: column;
}
.dish-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Header */
.dish-card-header {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--divider);
}

.dish-thumb {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--surface-container-low);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dish-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dish-thumb .material-symbols-outlined {
  font-size: 28px;
  color: #ccc;
}

.dish-main {
  flex: 1;
  min-width: 0;
}

.dish-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dish-name {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dish-id {
  display: block;
  font-size: 11px;
  color: var(--text-disabled);
  margin-top: 2px;
}

.dish-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dish-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.category-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--surface-container);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--on-surface);
}

.portion-tag {
  display: inline-block;
  padding: 2px 8px;
  background: var(--primary-soft);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #a04100;
}

/* Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.status-badge:hover { transform: scale(0.97); }
.status-active {
  background: var(--tertiary-soft);
  color: #006e1c;
}
.status-active::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4aad4e;
}
.status-inactive {
  background: var(--error-soft);
  color: #ba1a1a;
}
.status-inactive::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ba1a1a;
}

/* Body */
.dish-card-body {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.dish-price {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.price {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #ff6b00;
}
.price-unit {
  font-size: 12px;
  color: var(--text-disabled);
}

.dish-stock {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stock-input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
  text-align: center;
}
.stock-input:focus {
  outline: none;
  border-color: #ff6b00;
}

.stock-unlimited {
  font-size: 12px;
  color: var(--text-disabled);
}

.btn-text-success, .btn-text-danger {
  background: none;
  border: 1px solid;
  font-size: 11px;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}
.btn-text-success { color: #4aad4e; border-color: #4aad4e; }
.btn-text-success:hover { background: var(--tertiary-soft); }
.btn-text-danger { color: #ba1a1a; border-color: #ba1a1a; }
.btn-text-danger:hover { background: var(--error-soft); }

/* Footer */
.dish-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--divider);
  background: var(--surface-container-low);
}

.sort-control {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sort-label {
  font-size: 11px;
  color: var(--text-disabled);
}
.sort-input {
  width: 48px;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
}
.sort-input:focus {
  outline: none;
  border-color: #ff6b00;
}

.dish-actions {
  display: flex;
  gap: 4px;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-action .material-symbols-outlined { font-size: 18px; }
.btn-edit {
  background: var(--primary-soft);
  color: #ff6b00;
}
.btn-edit:hover { background: rgba(255, 107, 0, 0.2); }
.btn-delete {
  background: var(--error-soft);
  color: #ba1a1a;
}
.btn-delete:hover { background: rgba(186, 26, 26, 0.15); }
</style>
