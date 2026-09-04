<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">商家后台</h1>
      <p class="login-subtitle">请验证管理员身份</p>
      <form @submit.prevent="login">
        <div class="field">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            class="login-input"
            placeholder="输入管理密码"
          />
        </div>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button type="submit" class="login-btn" :disabled="loading || !password">
          {{ loading ? '验证中...' : '进入后台' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  if (!password.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value }),
    })
    if (!res.ok) {
      const data = await res.json()
      error.value = data.message || '密码错误'
      return
    }
    router.push('/dashboard')
  } catch {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f0f2f5; }
.login-card { width: 360px; padding: 40px; background: var(--surface); border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
.login-title { margin: 0 0 4px; font-size: 24px; font-weight: 700; text-align: center; }
.login-subtitle { margin: 0 0 24px; font-size: 14px; color: var(--text-secondary); text-align: center; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.login-input { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 15px; outline: none; box-sizing: border-box; }
.login-input:focus { border-color: #ff6b00; }
.login-error { color: #e53935; font-size: 13px; margin: -8px 0 16px; }
.login-btn { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #ff6b00; color: var(--on-primary); font-size: 16px; font-weight: 600; cursor: pointer; }
.login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.login-btn:not(:disabled):hover { background: #e05a00; }
</style>
