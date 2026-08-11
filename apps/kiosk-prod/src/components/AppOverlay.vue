<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="app-overlay"
      :class="{ 'app-overlay-dim': dim }"
      :style="zIndex ? { zIndex } : undefined"
      @click.self="$emit('click-mask')"
    >
      <slot />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  dim?: boolean
  zIndex?: number
}>()

defineEmits<{ 'click-mask': [] }>()
</script>

<style scoped>
.app-overlay {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
</style>
