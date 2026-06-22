<template>
  <header class="top-bar">
    <div class="top-bar-left">
      <router-link v-if="showHomeLink" to="/" class="home-link">
        <span class="material-icons">arrow_back</span>
        <span>返回首页</span>
      </router-link>
      <div class="brand-area">
        <img :src="logoImage" alt="Logo" class="brand-logo" />
        <h1 class="brand-title">{{ title }}</h1>
      </div>
      <p v-if="subtitle" class="top-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="statusText" class="status-badge">
      <span class="status-dot"></span>
      <span>{{ statusText }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import logoImage from '@/assets/images/pages/logo.jpg'

withDefaults(defineProps<{
  title: string
  subtitle?: string
  statusText?: string
  showHomeLink?: boolean
}>(), {
  subtitle: '',
  statusText: '',
  showHomeLink: false,
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.material-icons {
  font-family: 'Material Symbols Outlined';
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-size: 24px;
  line-height: 1;
}

.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--container-margin);
  background: var(--frosted-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.home-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-full);
  background: var(--surface-container-low);
  color: var(--primary);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
  text-decoration: none;
  transition: background var(--transition-fast);
}

.home-link:hover {
  background: var(--surface-container);
}

.home-link .material-icons {
  font-size: 20px;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.brand-logo { height: 32px; width: auto; border-radius: var(--radius-sm); }

.brand-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-headline-lg-mobile);
  font-weight: 700;
  color: var(--primary-container);
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.top-subtitle {
  margin: 0;
  width: 100%;
  color: var(--secondary);
  font-family: var(--font-body);
  font-size: var(--text-body-md);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-full);
  background: rgba(0, 110, 28, 0.1);
  color: var(--tertiary);
  font-family: var(--font-display);
  font-size: var(--text-label-lg);
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tertiary-container);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

@media (max-width: 720px) {
  .top-bar {
    flex-wrap: wrap;
    padding-top: var(--spacing-xs);
  }

  .brand-title {
    font-size: var(--text-headline-md);
  }
}
</style>
