<template>
  <div class="devices-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">点餐机管理</h2>
        <p class="page-subtitle">管理和监控点餐设备</p>
      </div>
      <div class="header-actions">
        <button :class="['btn-secondary', !filterUser && 'active']" @click="filterUser = !filterUser">
          <span class="material-symbols-outlined">{{ filterUser ? 'contract_delete' : 'group' }}</span>
          {{ filterUser ? '全部设备' : '仅用户设备' }}
        </button>
        <button class="btn-primary" @click="openDeviceDialog()">
          <span class="material-symbols-outlined">add</span>
          新增设备
        </button>
      </div>
    </div>

    <!-- Devices Grid -->
    <div class="devices-grid" v-if="filteredDevices.length">
      <div v-for="device in filteredDevices" :key="device.id" class="device-card">
        <div class="device-head">
          <div class="device-avatar" :class="device.status === 'active' ? 'online' : 'offline'">
            <span class="material-symbols-outlined">{{ device.mode === 'kiosk' ? 'point_of_sale' : 'smartphone' }}</span>
          </div>
          <div class="device-info">
            <div class="device-name-row">
              <span class="device-name">{{ device.name }}</span>
              <span class="role-tag" :class="device.role === 'admin' ? 'admin' : 'user'">
                {{ device.role === 'admin' ? '管理员' : '用户' }}
              </span>
            </div>
            <div class="device-meta">
              <span class="meta-item"><span class="material-symbols-outlined">pin</span>{{ device.code || '—' }}</span>
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
          <div class="status-row">
            <span class="status-dot" :class="device.status === 'active' ? 'on' : 'off'"></span>
            <span class="status-text">{{ device.status === 'active' ? '在线' : '离线' }}</span>
          </div>
        </div>

        <div class="device-actions">
          <button v-if="device.authCount > 0" class="chip-btn" @click="showAuthLogs(device)">
            <span class="material-symbols-outlined">devices_other</span>关联{{ device.authCount }}
          </button>
          <button v-if="device.sn" class="chip-btn" @click="copyQRUrl(device.id)">
            <span class="material-symbols-outlined">qr_code</span>扫码
          </button>
          <button class="chip-btn" :class="{ 'share-on': device.shared }" @click="toggleShare(device)">
            <span class="material-symbols-outlined">{{ device.shared ? 'share' : 'share' }}</span>{{ device.shared ? '已分享' : '分享' }}
          </button>
          <button v-if="device.sn" class="chip-btn" @click="regenerateSN(device.id)">
            <span class="material-symbols-outlined">refresh</span>重置
          </button>
          <button class="chip-btn" @click="openDeviceDialog(device)">
            <span class="material-symbols-outlined">edit</span>编辑
          </button>
          <button class="chip-btn" @click="openCommandDialog(device)">
            <span class="material-symbols-outlined">build</span>指令
          </button>
        </div>

        <div class="danger-row">
          <button
            v-if="device.status === 'active'"
            class="chip-btn" :class="'warn'"
            @click="offlineDevice(device)"
          >
            <span class="material-symbols-outlined">power_settings_new</span>下线
          </button>
          <button
            v-else
            class="chip-btn good"
            @click="setDeviceStatus(device.id, 'active')"
          >
            <span class="material-symbols-outlined">power_off</span>上线
          </button>
          <button class="chip-btn danger" @click="deleteDevice(device.id)">
            <span class="material-symbols-outlined">delete</span>删除
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <span class="material-symbols-outlined">devices</span>
      <p>暂无设备</p>
    </div>

    <!-- Add/Edit Device Modal -->
    <div v-if="showDevice" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingDevice ? '编辑设备' : '新增设备' }}</h3>
          <button class="btn-icon" @click="showDevice = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>编号（2位）</label>
            <input v-model="deviceForm.code" maxlength="2" placeholder="不填自动递增" />
          </div>
          <div class="form-group">
            <label>设备名称</label>
            <input v-model="deviceForm.name" placeholder="不填自动生成" />
          </div>
          <div class="form-group">
            <label>联系方式</label>
            <input v-model="deviceForm.contact" placeholder="手机号/微信号" />
          </div>
          <div class="form-group">
            <label>模式</label>
            <div class="select-wrap">
              <select v-model="deviceForm.mode">
                <option value="kiosk">自助点餐机</option>
                <option value="h5">H5 扫码点单</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>角色</label>
            <div class="select-wrap">
              <select v-model="deviceForm.role">
                <option value="user">用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>所属分店</label>
            <div class="select-wrap">
              <select v-model="deviceForm.branchId">
                <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showDevice = false">取消</button>
          <button class="btn-primary" @click="saveDevice">保存</button>
        </div>
      </div>
    </div>

    <!-- Command Modal -->
    <div v-if="showCommand" class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>设备指令 - {{ commandTarget?.name || '' }}</h3>
          <button class="btn-icon" @click="showCommand = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>指令类型</label>
            <div class="select-wrap">
              <select v-model="commandForm.command">
                <option v-for="opt in commandOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCommand = false">取消</button>
          <button class="btn-primary" @click="sendCommand">发送</button>
        </div>
      </div>
    </div>

    <!-- Auth Log Modal -->
    <div v-if="showAuthLog" class="modal-overlay" @click.self="showAuthLog = false">
      <div class="modal">
        <div class="modal-header">
          <h3>关联设备列表</h3>
          <button class="btn-icon" @click="showAuthLog = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="authLogs.length" class="auth-table">
            <div class="auth-row" v-for="log in authLogs" :key="log.id ?? log.lastAuthAt">
              <div class="auth-cell">
                <span class="auth-type">{{ log.deviceType }}</span>
                <span class="auth-ip">{{ log.ip || '—' }}</span>
              </div>
              <span class="auth-time">{{ new Date(log.lastAuthAt).toLocaleString() }}</span>
            </div>
          </div>
          <p v-else class="empty-hint">暂无记录</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showAuthLog = false">关闭</button>
        </div>
      </div>
    </div>

    <transition name="copy-tip">
      <div v-show="copyTip" class="copy-tip">{{ copyTipText }}</div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const devices = ref<any[]>([])
const branches = ref<any[]>([])
const filterUser = ref(true)

const filteredDevices = computed(() =>
  filterUser.value ? devices.value.filter((d) => d.role === 'user') : devices.value,
)

const showDevice = ref(false)
const editingDevice = ref(false)
const editingDeviceId = ref('')
const deviceForm = ref({ code: '', name: '', contact: '', mode: 'kiosk', role: 'user', branchId: '' })

const showCommand = ref(false)
const commandTarget = ref<any>(null)
const commandForm = ref({ command: 'clear_storage' })
const commandOptions = [
  { label: '清除缓存和 Cookies', value: 'clear_storage' },
]

const copyTip = ref(false)
const copyTipText = ref('已复制设备码')
let copyTipTimer: ReturnType<typeof setTimeout> | null = null

async function fetchDevices() {
  const res = await fetch('/api/admin/devices')
  devices.value = await res.json()
}

async function fetchBranches() {
  const res = await fetch('/api/admin/merchant')
  const data = await res.json()
  branches.value = data.branches || []
}

function openDeviceDialog(device?: any) {
  editingDevice.value = !!device
  editingDeviceId.value = device?.id ?? ''
  deviceForm.value = device
    ? { code: device.code || '', name: device.name, contact: device.contact || '', mode: device.mode, role: device.role || 'user', branchId: device.branchId }
    : { code: '', name: '', contact: '', mode: 'kiosk', role: 'user', branchId: branches.value[0]?.id || '' }
  showDevice.value = true
}

async function saveDevice() {
  const url = editingDevice.value
    ? `/api/admin/devices/${editingDeviceId.value}`
    : '/api/admin/devices'
  await fetch(url, {
    method: editingDevice.value ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deviceForm.value),
  })
  showDevice.value = false
  fetchDevices()
}

async function toggleShare(device: any) {
  if (!device.shared && !confirm(`确认将「${device.name}」设为分享设备？\n\n分享页面（菜单分享页）的二维码将指向此设备，顾客扫码可直接点餐。`)) return
  await fetch(`/api/admin/devices/${device.id}/toggle-share`, { method: 'POST' })
  fetchDevices()
}

async function deleteDevice(id: string) {
  if (!confirm('确认删除？')) return
  await fetch(`/api/admin/devices/${id}`, { method: 'DELETE' })
  fetchDevices()
}

async function copySN(sn: string) {
  try {
    await navigator.clipboard.writeText(sn)
    copyTipText.value = '已复制设备码'
  } catch {
    copyTipText.value = '设备码：' + sn
  }
  copyTip.value = true
  if (copyTipTimer) clearTimeout(copyTipTimer)
  copyTipTimer = setTimeout(() => (copyTip.value = false), 1800)
}

async function regenerateSN(id: string) {
  if (!confirm('确认重新生成设备码？旧的设备码将失效。')) return
  const res = await fetch(`/api/admin/devices/${id}/regenerate-sn`, { method: 'POST' })
  const data = await res.json()
  alert('新设备码：' + data.sn)
  fetchDevices()
}

async function copyQRUrl(id: string) {
  const res = await fetch(`/api/admin/devices/${id}/qr-url`)
  if (!res.ok) return alert('获取失败')
  const data = await res.json()
  const fullUrl = `${location.origin}/#/home?code=${encodeURIComponent(data.token)}`
  try {
    await navigator.clipboard.writeText(fullUrl)
    alert('已复制扫码链接：' + fullUrl)
  } catch {
    alert('扫码链接：' + fullUrl)
  }
}

async function offlineDevice(device: any) {
  if (!confirm(`确认下线设备「${device.name}」？\n\n正在结算中的订单不受影响。`)) return
  await setDeviceStatus(device.id, 'offline')
}

async function setDeviceStatus(id: string, status: string) {
  await fetch(`/api/admin/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  fetchDevices()
}

function openCommandDialog(device: any) {
  commandTarget.value = device
  commandForm.value = { command: 'clear_storage' }
  showCommand.value = true
}

const showAuthLog = ref(false)
const authLogs = ref<any[]>([])

async function showAuthLogs(device: any) {
  const res = await fetch(`/api/admin/devices/${device.id}/auth-logs`)
  const data = await res.json()
  authLogs.value = data.list || []
  showAuthLog.value = true
}

async function sendCommand() {
  if (!commandTarget.value) return
  const res = await fetch(`/api/admin/devices/${commandTarget.value.id}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(commandForm.value),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    return alert('发送失败：' + (err.message || err.error || res.statusText))
  }
  showCommand.value = false
  alert('指令已发送，设备将在下次加载页面时执行')
}

onMounted(() => {
  fetchDevices()
  fetchBranches()
})
</script>

<style scoped>
.devices-page { max-width: none; }

/* Page Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }
.page-title { margin: 0; font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--on-surface); }
.page-subtitle { margin: 4px 0 0; font-family: var(--font-body); font-size: 14px; color: var(--on-surface-variant); }
.header-actions { display: flex; gap: 12px; }

/* Buttons */
.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--primary-container); color: var(--on-primary);
  border: none; padding: 10px 20px; border-radius: 24px;
  font-family: var(--font-display); font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.15s; box-shadow: 0 2px 8px rgba(255, 107, 0, 0.2);
}
.btn-primary:hover { background: #e65c00; transform: scale(0.98); }
.btn-secondary {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--surface); color: var(--on-surface);
  border: 1px solid var(--border); padding: 10px 20px; border-radius: 24px;
  font-family: var(--font-display); font-size: 14px; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.btn-secondary:hover { border-color: #ff6b00; color: #ff6b00; }
.btn-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border: none; background: transparent; border-radius: 50%;
  cursor: pointer; color: var(--on-surface-variant); transition: all 0.15s;
}
.btn-icon:hover { background: var(--primary-soft); color: #ff6b00; }

/* Devices Grid */
.devices-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
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
.device-avatar.online { background: var(--tertiary-soft); color: #4ade80; }
.device-avatar.offline { background: var(--surface-container-low); color: var(--text-disabled); }
.device-info { flex: 1; min-width: 0; }
.device-name-row { display: flex; align-items: center; gap: 8px; }
.device-name { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--on-surface); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-tag {
  padding: 1px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; flex-shrink: 0;
}
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

.copy-tip {
  position: fixed; left: 50%; top: 72px; transform: translateX(-50%);
  padding: 8px 18px; border-radius: 20px; background: var(--on-surface); color: var(--surface);
  font-size: 13px; font-weight: 600; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  z-index: 999;
}
.copy-tip-enter-active, .copy-tip-leave-active { transition: opacity 0.2s, transform 0.2s; }
.copy-tip-enter-from, .copy-tip-leave-to { opacity: 0; transform: translate(-50%, -6px); }

.status-row { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.on { background: #4ade80; }
.status-dot.off { background: var(--text-disabled); }
.status-text { font-size: 13px; font-weight: 600; color: var(--on-surface); }
.status-btn {
  display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;
  border: none; border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
}
.status-btn .material-symbols-outlined { font-size: 15px; }
.status-btn.offline { background: rgba(217, 119, 6, 0.15); color: #d97706; }
.status-btn.offline:hover { background: rgba(217, 119, 6, 0.25); }
.status-btn.online { background: rgba(74, 173, 78, 0.15); color: #4ade80; }
.status-btn.online:hover { background: rgba(74, 173, 78, 0.25); }

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

/* Empty State */
.empty-state { padding: 80px 20px; text-align: center; color: var(--text-disabled); }
.empty-state .material-symbols-outlined { font-size: 64px; margin-bottom: 16px; opacity: 0.4; }
.empty-state p { margin: 0; font-size: 15px; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal {
  background: var(--surface); border-radius: 16px; width: 100%; max-width: 480px;
  max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
.modal-sm { max-width: 420px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--border); }
.modal-header h3 { margin: 0; font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--on-surface); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid var(--border); }

/* Form */
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.form-group input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px;
  font-size: 14px; background: var(--bg-input); color: var(--text-input); box-sizing: border-box;
}
.form-group input:focus { outline: none; border-color: #ff6b00; }
.select-wrap { position: relative; }
.select-wrap select {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px;
  font-size: 14px; background: var(--bg-input); color: var(--text-input); appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
}

/* Auth Table */
.auth-table { display: flex; flex-direction: column; }
.auth-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--divider); }
.auth-row:last-child { border-bottom: none; }
.auth-cell { display: flex; flex-direction: column; gap: 2px; }
.auth-type { font-size: 13px; font-weight: 600; color: var(--on-surface); }
.auth-ip { font-size: 12px; color: var(--text-disabled); }
.auth-time { font-size: 12px; color: var(--on-surface-variant); }
.empty-hint { text-align: center; color: var(--text-disabled); padding: 20px 0; margin: 0; }

/* Responsive */
@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .devices-grid { grid-template-columns: 1fr; }
}
</style>
