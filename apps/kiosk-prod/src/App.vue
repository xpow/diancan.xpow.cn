<template>
  <div inert>
    <router-view />
  </div>
  <UpgradeNotice />
</template>

<script setup lang="ts">
import UpgradeNotice from '@/components/UpgradeNotice.vue'
</script>
