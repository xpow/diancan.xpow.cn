<template>
  <div class="device-card">
    <div class="device-head">
      <div class="device-avatar" :class="online ? 'online' : 'offline'">
        <span class="avatar-code">{{ device.code || '—' }}</span>
      </div>
      <div class="device-info">
        <div class="device-name-row">
          <span class="device-name">{{ device.name }}</span>
          <span class="role-tag" :class="device.role === 'admin' ? 'admin' : 'user'">
            {{ device.role === 'admin' ? '管理员' : '用户' }}
          </span>
        </div>
        <div class="device-meta">
          <span class="meta-item"><span class="material-symbols-outlined">category</span>{{ device.mode === 'kiosk' ? '自助点餐' : 'H5点单' }}</span>
          <span class="meta-item"><span class="material-symbols-outlined">storefront</span>{{ device.branchName || '未分配' }}</span>
        </div>
      </div>
    </div>

    <div class="device-body">
      <div class="sn-row">
        <span class="sn-label">设备码</span>
        <div class="sn-copy-row">
          <span v-if="device.sn" class="sn-text">{{ device.sn }}</span>
          <span v-else class="sn-empty">-</span>
          <button v-if="device.sn" class="sn-copy" title="复制设备码" @click="copySN(device.sn)">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
        </div>
      </div>
      <div class="status-wrap">
        <span class="status-dot" :class="online ? 'on' : 'off'"></span>
        <span class="status-text">{{ online ? '在线' : '离线' }}</span>
      </div>
    </div>

    <div v-if="device.contact" class="device-contact">
      <span class="material-symbols-outlined">call</span>
      <span>{{ device.contact }}</span>
    </div>

    <div v-if="showAuthInline" class="device-contact">
      <span class="material-symbols-outlined">devices_other</span>
      <button v-if="device.authCount > 0" class="auth-link" @click="$emit('auth', device)">关联 {{ device.authCount }}</button>
      <span v-else>关联 {{ device.authCount ?? 0 }}</span>
    </div>

    <div class="device-actions">
      <button v-if="!showAuthInline && device.authCount > 0" class="chip-btn" @click="$emit('auth', device)">
        <span class="material-symbols-outlined">devices_other</span>关联{{ device.authCount }}
      </button>
      <button v-if="showQr && device.sn" class="chip-btn" @click="$emit('qr', device)">
        <span class="material-symbols-outlined">qr_code</span>扫码
      </button>
      <button v-if="showShare" class="chip-btn" :class="{ 'share-on': device.shared }" @click="$emit('share', device)">
        <span class="material-symbols-outlined">share</span>{{ device.shared ? '已分享' : '分享' }}
      </button>
      <button v-if="device.sn" class="chip-btn" @click="$emit('reset', device)">
        <span class="material-symbols-outlined">refresh</span>重置
      </button>
      <button class="chip-btn" @click="$emit('edit', device)">
        <span class="material-symbols-outlined">edit</span>编辑
      </button>
      <button class="chip-btn" @click="$emit('command', device)">
        <span class="material-symbols-outlined">build</span>指令
      </button>
    </div>

    <div class="danger-row">
      <button v-if="online" class="chip-btn warn" @click="$emit('offline', device)">
        <span class="material-symbols-outlined">power_settings_new</span>下线
      </button>
      <button v-else class="chip-btn good" @click="$emit('online', device)">
        <span class="material-symbols-outlined">power_off</span>上线
      </button>
      <button class="chip-btn danger" @click="$emit('remove', device)">
        <span class="material-symbols-outlined">delete</span>删除
      </button>
    </div>

    <transition name="copy-tip">
      <div v-show="copyTip" class="copy-tip">{{ copyTipText }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  device: any
  showQr?: boolean
  showShare?: boolean
  showAuthInline?: boolean
}>()

defineEmits<{
  (e: 'auth', device: any): void
  (e: 'qr', device: any): void
  (e: 'share', device: any): void
  (e: 'reset', device: any): void
  (e: 'edit', device: any): void
  (e: 'command', device: any): void
  (e: 'offline', device: any): void
  (e: 'online', device: any): void
  (e: 'remove', device: any): void
}>()

const online = computed(() => props.device.status === 'active')

const copyTip = ref(false)
const copyTipText = ref('已复制设备码')
let copyTipTimer: ReturnType<typeof setTimeout> | null = null

function copySN(sn: string) {
  try {
    navigator.clipboard.writeText(sn)
    copyTipText.value = '已复制设备码'
  } catch {
    copyTipText.value = '设备码：' + sn
  }
  copyTip.value = true
  if (copyTipTimer) clearTimeout(copyTipTimer)
  copyTipTimer = setTimeout(() => (copyTip.value = false), 1800)
}
</script>

<style scoped>
.device-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  padding: 16px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.15s;
}
.device-card:hover { border-color: #ffd9bd; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

.device-head { display: flex; align-items: center; gap: 12px; }
.device-avatar {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.device-avatar .material-symbols-outlined { font-size: 22px; }
.avatar-code { font-family: 'Plus Jakarta Sans', var(--font-display), sans-serif; font-size: 16px; font-weight: 800; letter-spacing: 1px; }
.device-avatar.online { background: var(--tertiary-soft); color: #4ade80; }
.device-avatar.offline { background: var(--surface-container-low); color: var(--text-disabled); }
.device-info { flex: 1; min-width: 0; }

.device-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.device-name { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--on-surface); }
.role-tag { padding: 1px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; }
.role-tag.admin { background: rgba(217, 119, 6, 0.15); color: #d97706; }
.role-tag.user { background: rgba(59, 130, 246, 0.15); color: var(--info); }

.device-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
.meta-item { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; color: var(--on-surface-variant); }
.meta-item .material-symbols-outlined { font-size: 13px; }

.device-body { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--surface-container-low); border-radius: 10px; }
.sn-row { display: flex; flex-direction: column; gap: 2px; }
.sn-label { font-size: 11px; color: var(--text-disabled); }
.sn-copy-row { display: flex; align-items: center; gap: 4px; }
.sn-copy {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border: 1px solid var(--border); border-radius: 6px;
  background: transparent; color: var(--text-disabled); cursor: pointer;
  padding: 0; transition: all 0.15s;
}
.sn-copy .material-symbols-outlined { font-size: 14px; }
.sn-copy:hover { border-color: #ff6b00; color: #ff6b00; background: var(--primary-soft); }
.sn-text { font-family: monospace; font-size: 13px; letter-spacing: 1px; color: var(--on-surface); }
.sn-empty { color: var(--text-disabled); }

.status-wrap { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.on { background: #4ade80; }
.status-dot.off { background: var(--text-disabled); }
.status-text { font-size: 13px; font-weight: 600; color: var(--on-surface); }

.device-contact { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--on-surface-variant); }
.device-contact .material-symbols-outlined { font-size: 16px; color: var(--text-disabled); }
.auth-link { border: none; background: none; padding: 0; color: var(--info); cursor: pointer; font-size: 13px; }
.auth-link:hover { text-decoration: underline; }

.device-actions { display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--divider); padding-top: 12px; }
.danger-row { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
.chip-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border: 1px solid var(--border); border-radius: 20px;
  background: var(--surface); color: var(--on-surface-variant);
  font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.chip-btn .material-symbols-outlined { font-size: 15px; }
.chip-btn:hover { border-color: #ff6b00; color: #ff6b00; background: var(--primary-soft); }
.chip-btn.danger:hover { border-color: var(--error); color: #f74e22; background: rgb(255 76 55 / 16%); }
.chip-btn.share-on { border-color: #4ade80; color: #4ade80; background: rgba(74, 173, 78, 0.15); }
.chip-btn.warn { border-color: #d97706; color: #d97706; background: rgba(217, 119, 6, 0.15); }
.chip-btn.warn:hover { border-color: #d97706; color: #d97706; background: rgba(217, 119, 6, 0.25); }
.chip-btn.good { border-color: #4ade80; color: #4ade80; background: rgba(74, 173, 78, 0.15); }
.chip-btn.good:hover { border-color: #4ade80; color: #4ade80; background: rgba(74, 173, 78, 0.25); }

.copy-tip {
  position: fixed; left: 50%; top: 72px; transform: translateX(-50%);
  padding: 8px 18px; border-radius: 20px; background: var(--on-surface); color: var(--surface);
  font-size: 13px; font-weight: 600; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 999;
}
.copy-tip-enter-active, .copy-tip-leave-active { transition: opacity 0.2s, transform 0.2s; }
.copy-tip-enter-from, .copy-tip-leave-to { opacity: 0; transform: translate(-50%, -6px); }
</style>