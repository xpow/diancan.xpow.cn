<template>
  <div class="drp" :class="{ 'drp--compact': compact }">
    <div class="drp-bar">
      <div class="drp-quick">
        <button
          v-for="p in resolvedPresets"
          :key="p.key"
          type="button"
          :class="['drp-quick-btn', quickRange === p.key && 'active']"
          @click="setQuick(p.key)"
        >{{ p.label }}</button>
        <template v-if="showNav">
          <span class="drp-nav-sep"></span>
          <button type="button" class="drp-nav-btn" @click="shiftRange(navUnit, -1)">
            <span class="drp-nav-arrow">‹</span> {{ navLabels[0] }}
          </button>
          <button type="button" class="drp-nav-btn" @click="shiftRange(navUnit, 1)">
            {{ navLabels[1] }} <span class="drp-nav-arrow">›</span>
          </button>
        </template>
      </div>
      <DatePicker
        :modelValue="modelValue"
        selectionMode="range"
        :manualInput="false"
        showIcon
        class="drp-picker"
        @update:modelValue="onDateChange"
      />
    </div>
    <div v-if="showDisplay && displayText" class="drp-display">📅 {{ displayText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  STATS_DATE_PRESETS,
  formatInclusiveRangeLabel,
  type DateRangePreset,
  type DateRangeValue,
} from '../utils/dateRange'

const props = withDefaults(
  defineProps<{
    modelValue?: DateRangeValue
    quickRange?: string
    presets?: DateRangePreset[]
    showNav?: boolean
    showDisplay?: boolean
    compact?: boolean
    initialQuick?: string
  }>(),
  {
    modelValue: undefined,
    quickRange: '',
    presets: undefined,
    showNav: true,
    showDisplay: true,
    compact: false,
    initialQuick: 'today',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: DateRangeValue): void
  (e: 'update:quickRange', value: string): void
  (e: 'change', value: { range: DateRangeValue; quickRange: string }): void
}>()

const resolvedPresets = computed(() => props.presets ?? STATS_DATE_PRESETS)

const navUnit = computed(() => {
  const r = props.modelValue
  if (r && r[0] && r[1]) {
    const days = Math.round((new Date(r[1]).getTime() - new Date(r[0]).getTime()) / 86400000)
    if (days <= 1) return 'day' as const
    if (days <= 8) return 'week' as const
    if (days <= 35) return 'month' as const
    return 'year' as const
  }
  if (props.quickRange === 'week') return 'week' as const
  if (props.quickRange === 'month' || props.quickRange === 'all') return 'month' as const
  return 'day' as const
})

const navLabels = computed(() => {
  const unitMap: Record<string, [string, string]> = {
    day: ['上一日', '下一日'],
    week: ['上一周', '下一周'],
    month: ['上一月', '下一月'],
    year: ['上一年', '下一年'],
  }
  return unitMap[navUnit.value]
})

const displayText = computed(() => formatInclusiveRangeLabel(props.modelValue))

function commit(range: DateRangeValue, quick: string, fire = true) {
  emit('update:modelValue', range)
  emit('update:quickRange', quick)
  if (fire) emit('change', { range, quickRange: quick })
}

function setQuick(key: string) {
  const now = new Date()
  let start: Date | null = null
  let end: Date | null = null

  if (key === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    end = new Date(start.getTime() + 86400000)
  } else if (key === 'yesterday') {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    start = new Date(end.getTime() - 86400000)
  } else if (key === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
    end = new Date(start.getTime() + 7 * 86400000)
  } else if (key === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  } else if (key === '7d') {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    start = new Date(end.getTime() - 7 * 86400000)
  } else if (key === '30d') {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    start = new Date(end.getTime() - 30 * 86400000)
  }

  if (start && end) {
    commit([start, end], key)
  } else {
    // 近 90 个日历日：半开 [today-89d 00:00, tomorrow 00:00)
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const startD = new Date(tomorrow.getTime() - 90 * 86400000)
    commit([startD, tomorrow], key)
  }
}

function onDateChange(value: (Date | null)[] | undefined) {
  if (!value || value.length === 0) {
    commit(undefined, '', true)
    return
  }
  const start = value[0] ?? null
  let end = value[1] ?? null
  // 日历点选为含末日；转为与快捷项一致的半开区间 [start, nextDay)
  if (start && end) {
    const e = new Date(end)
    end = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1)
  }
  const range: DateRangeValue = [start, end]
  emit('update:modelValue', range)
  emit('update:quickRange', '')
  if (start && !value[1]) return
  emit('change', { range, quickRange: '' })
}

function shiftRange(unit: 'day' | 'week' | 'month' | 'year', dir: -1 | 1) {
  const cur = props.modelValue
  let start: Date
  let end: Date
  if (cur && cur[0] && cur[1]) {
    start = new Date(cur[0])
    end = new Date(cur[1])
  } else {
    start = new Date()
    end = new Date()
  }
  if (unit === 'day') {
    const d = dir * 86400000
    start = new Date(start.getTime() + d)
    end = new Date(end.getTime() + d)
  } else if (unit === 'week') {
    const d = dir * 7 * 86400000
    start = new Date(start.getTime() + d)
    end = new Date(end.getTime() + d)
  } else if (unit === 'month') {
    start = new Date(start.getFullYear(), start.getMonth() + dir, start.getDate())
    end = new Date(end.getFullYear(), end.getMonth() + dir, end.getDate())
  } else {
    start = new Date(start.getFullYear() + dir, start.getMonth(), start.getDate())
    end = new Date(end.getFullYear() + dir, end.getMonth(), end.getDate())
  }
  commit([start, end], '')
}

onMounted(() => {
  if (!props.modelValue || !props.modelValue[0]) {
    setQuick(props.initialQuick || 'today')
  }
})

defineExpose({ setQuick })
</script>

<style scoped>
.drp { width: 100%; }
.drp-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.drp-quick { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.drp-quick-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  font-size: 13px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.drp-quick-btn.active {
  background: #ff6b00;
  color: var(--on-primary);
  border-color: #ff6b00;
}
.drp-quick-btn:hover:not(.active) {
  border-color: #ff6b00;
  color: #ff6b00;
}
.drp-nav-sep {
  width: 1px;
  align-self: stretch;
  background: var(--border);
  margin: 0 2px;
}
.drp-nav-btn {
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  white-space: nowrap;
  gap: 2px;
}
.drp-nav-btn:hover {
  border-color: #ff6b00;
  color: #ff6b00;
  background: var(--primary-soft);
}
.drp-nav-arrow {
  font-size: 16px;
  line-height: 1;
  font-weight: 700;
}
.drp-display {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 14px;
  background: var(--primary-soft);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #a04100;
  font-family: var(--font-display, 'Plus Jakarta Sans', sans-serif);
}
.drp-picker { margin-left: auto; }
.drp--compact .drp-display { margin-top: 8px; }
.drp--compact .drp-quick-btn { padding: 5px 12px; font-size: 12px; }
</style>
