<template>
  <div :class="['spec-selector', size === 'sm' && 'spec-selector-sm']">
    <p class="selector-label">{{ group.name }}</p>
    <div class="selector-options">
      <button
        v-for="opt in group.options"
        :key="opt.label"
        :class="['selector-chip', isSelected(opt.label) && 'selector-chip-active']"
        @click="toggle(opt.label)"
      >
        <span v-if="group.name === '辣度'" class="chili-icons">{{ '🌶️'.repeat(getChiliCount(opt.label)) }}</span>
        {{ opt.label }}
        <span v-if="opt.priceDelta" class="price-delta">{{ opt.priceDelta > 0 ? '+¥' : '-¥' }}{{ Math.abs(opt.priceDelta) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SpecGroup } from '@diancan/shared'

const props = defineProps<{
  group: SpecGroup
  modelValue: string | string[]
  size?: 'sm' | 'md'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
}>()

function isSelected(label: string): boolean {
  if (Array.isArray(props.modelValue)) return props.modelValue.includes(label)
  return props.modelValue === label
}

function toggle(label: string) {
  if (props.group.type === 'multi') {
    let arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const idx = arr.indexOf(label)
    if (idx > -1) {
      arr.splice(idx, 1)
    } else {
      if (props.group.name === '口味') {
        if (label === '原味') { arr = ['原味'] }
        else { arr = arr.filter((v) => v !== '原味'); arr.push(label) }
      } else {
        arr.push(label)
      }
    }
    emit('update:modelValue', arr)
  } else {
    emit('update:modelValue', label)
  }
}

function getChiliCount(label: string): number {
  if (label.includes('不辣')) return 0
  if (label.includes('微辣')) return 1
  if (label.includes('中辣')) return 2
  if (label.includes('特辣')) return 3
  if (label.includes('麻辣')) return 3
  return 0
}
</script>

<style scoped>
.spec-selector { display: flex; flex-direction: column; gap: 6px; }
.spec-selector-sm { gap: 4px; }
.selector-label { margin: 0; font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; color: var(--secondary); }
.selector-options { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.selector-chip { display: flex; align-items: center; gap: 2px; padding: 6px 12px; border-radius: var(--radius-md); border: 1px solid var(--outline-variant); background: transparent; color: var(--on-surface); font-family: var(--font-display); font-size: var(--text-label-sm); font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
.spec-selector-sm .selector-chip { padding: 4px 10px; font-size: 12px; }
.selector-chip-active { border-color: var(--primary-container); background: rgba(255, 107, 0, 0.08); color: var(--primary-container); }
.chili-icons { font-size: 14px; display: inline-flex; align-items: center; }
.spec-selector-sm .chili-icons { font-size: 12px; }
.price-delta { font-size: 10px; opacity: 0.8; }
</style>
