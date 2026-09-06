<template>
  <div class="merchant-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">商家设置</h2>
        <p class="page-subtitle">管理商家信息、分店与点餐设备</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" @click="saveMerchant">
          <span class="material-symbols-outlined">save</span>
          保存
        </button>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="settings-card">
      <div class="card-head">
        <h3 class="card-title">基本信息</h3>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>商家名称</label>
          <input v-model="form.name" placeholder="商家名称" />
        </div>
        <div class="form-group">
          <label>标语</label>
          <input v-model="form.slogan" placeholder="标语" />
        </div>
        <div class="form-group">
          <label>Logo URL</label>
          <input v-model="form.logoUrl" placeholder="https://..." />
        </div>
      </div>
    </div>

    <!-- 分店管理 -->
    <div class="section-head">
      <h3 class="card-title">分店管理</h3>
      <button class="btn-secondary" @click="openBranchDialog()">
        <span class="material-symbols-outlined">add</span>
        新增分店
      </button>
    </div>
    <div class="cards-grid" v-if="branches.length">
      <div v-for="branch in branches" :key="branch.id" class="data-card branch-card">
        <div class="card-top">
          <div class="branch-avatar" :class="branch.status === 'active' ? 'active' : 'offline'">
            <span class="material-symbols-outlined">storefront</span>
          </div>
          <div class="branch-title">
            <div class="branch-name-row">
              <span class="card-name">{{ branch.name }}</span>
              <span class="branch-code">#{{ branch.code }}</span>
              <span class="status-tag" :class="branch.status === 'active' ? 'on' : 'off'">
                {{ branch.status === 'active' ? '营业中' : '休息中' }}
              </span>
            </div>
            <p v-if="branch.status !== 'active' && branch.restReason" class="rest-reason-text">
              {{ branch.restReason }}
              <button class="btn-icon-sm" @click="editBranchRestReason(branch)">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </p>
          </div>
        </div>

        <div class="branch-info">
          <div class="info-item" v-if="branch.address">
            <span class="material-symbols-outlined">location_on</span>
            <span>{{ branch.address }}</span>
          </div>
          <div class="info-item" v-if="branch.todayLocation">
            <span class="material-symbols-outlined">pin_drop</span>
            <span>{{ branch.todayLocation }}</span>
          </div>
          <div class="info-item" v-if="branch.locationHint">
            <span class="material-symbols-outlined">near_me</span>
            <span>{{ branch.locationHint }}</span>
          </div>
        </div>

        <div class="branch-stats">
          <div class="stat-box">
            <span class="stat-num">{{ branch.deviceCount ?? 0 }}</span>
            <span class="stat-label">设备数</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ branch.orderCount ?? 0 }}</span>
            <span class="stat-label">订单数</span>
          </div>
          <div class="stat-box wide">
            <span class="stat-text">{{ branch.businessHours || '—' }}</span>
            <span class="stat-label">营业时间</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="chip-btn" :class="branch.status === 'active' ? 'toggle-off' : 'toggle-on'" @click="setBranchStatus(branch, branch.status === 'active' ? 'offline' : 'active')">
            <span class="material-symbols-outlined">{{ branch.status === 'active' ? 'toggle_off' : 'toggle_on' }}</span>
            {{ branch.status === 'active' ? '休息' : '营业' }}
          </button>
          <button class="chip-btn" @click="openBranchDialog(branch)">
            <span class="material-symbols-outlined">edit</span>编辑
          </button>
          <button class="chip-btn danger" @click="deleteBranch(branch.id)">
            <span class="material-symbols-outlined">delete</span>删除
          </button>
        </div>
      </div>
    </div>
    <div v-else class="empty-inline">暂无分店</div>

    <!-- 点餐机管理 -->
    <div class="section-head">
      <h3 class="card-title">点餐机管理</h3>
      <button class="btn-secondary" @click="openDeviceDialog()">
        <span class="material-symbols-outlined">add</span>
        新增设备
      </button>
    </div>
    <div class="cards-grid" v-if="adminDevices.length">
      <DeviceCard
        v-for="device in adminDevices"
        :key="device.id"
        :device="device"
        :show-qr="false"
        :show-share="false"
        :show-auth-inline="true"
        @auth="showAuthLogs"
        @reset="handleReset"
        @edit="openDeviceDialog"
        @command="openCommandDialog"
        @offline="offlineDevice"
        @online="handleOnline"
        @remove="handleRemove"
      />
    </div>
    <div v-else class="empty-inline">暂无设备</div>

    <!-- 休息原因 Modal -->
    <div v-if="showRestReason" class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>休息原因 - {{ restTarget?.name || '' }}</h3>
          <button class="btn-icon" @click="showRestReason = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="reason-list">
            <div
              v-for="reason in restReasons" :key="reason"
              :class="['reason-option', restFormReason === reason && 'reason-option-active']"
              @click="restFormReason = reason"
            >
              <span class="material-symbols-outlined" :class="restFormReason === reason ? 'checked' : 'unchecked'">
                {{ restFormReason === reason ? 'radio_button_checked' : 'radio_button_unchecked' }}
              </span>
              {{ reason }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showRestReason = false">取消</button>
          <button class="btn-primary" @click="confirmRestReason">确定</button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑分店 Modal -->
    <div v-if="showBranch" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingBranch ? '编辑分店' : '新增分店' }}</h3>
          <button class="btn-icon" @click="showBranch = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>编号（字母）</label>
              <input v-model="branchForm.code" maxlength="2" placeholder="A" />
            </div>
            <div class="form-group flex-1">
              <label>名称</label>
              <input v-model="branchForm.name" />
            </div>
          </div>
          <div class="form-group">
            <label>地址</label>
            <input v-model="branchForm.address" />
          </div>
          <div class="form-group">
            <label>今日出摊位置</label>
            <input v-model="branchForm.todayLocation" placeholder="如：东门入口第3个摊位" />
          </div>
          <div class="form-group">
            <label>位置提示</label>
            <input v-model="branchForm.locationHint" placeholder="如：对着蜜雪冰城" />
          </div>
          <div class="form-group">
            <label>营业时间</label>
            <input v-model="branchForm.businessHours" placeholder="例：17:00-02:00" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showBranch = false">取消</button>
          <button class="btn-primary" @click="saveBranch">保存</button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑设备 Modal -->
    <div v-if="showDevice" class="modal-overlay">
      <div class="modal modal-sm">
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

    <!-- 指令 Modal -->
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

    <!-- 关联设备列表 Modal -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DeviceCard from '../components/DeviceCard.vue'

const form = ref({ name: '', slogan: '', statusText: '', logoUrl: '' })
const showRestReason = ref(false)
const restReasons = ['已打烊', '天气原因', '市政管理', '短期休假中', '停业']
const restTarget = ref<any>(null)
const restFormReason = ref('')

const branches = ref<any[]>([])
const showBranch = ref(false)
const editingBranch = ref(false)
const branchEditId = ref('')
const branchForm = ref({ code: '', name: '', address: '', todayLocation: '', locationHint: '', businessHours: '' })

const devices = ref<any[]>([])
const showDevice = ref(false)
const editingDevice = ref(false)
const editingDeviceId = ref('')
const deviceForm = ref({ code: '', name: '', contact: '', mode: 'kiosk', branchId: '' })

const showCommand = ref(false)
const commandTarget = ref<any>(null)
const commandForm = ref({ command: 'clear_storage' })
const commandOptions = [
  { label: '清除缓存和 Cookies', value: 'clear_storage' },
]

const adminDevices = computed(() => devices.value.filter((d) => d.role === 'admin'))

async function fetchMerchant() {
  const res = await fetch('/api/admin/merchant')
  const data = await res.json()
  form.value = {
    name: data.name || '',
    slogan: data.slogan || '',
    statusText: data.statusText || '',
    logoUrl: data.logoUrl || '',
  }
  branches.value = data.branches || []
}

function setBranchStatus(branch: any, status: string) {
  if (status === 'active') {
    updateBranch(branch.id, { status: 'active', restReason: '' })
  } else {
    restTarget.value = branch
    restFormReason.value = branch.restReason || restReasons[0]
    showRestReason.value = true
  }
}

function editBranchRestReason(branch: any) {
  restTarget.value = branch
  restFormReason.value = branch.restReason || restReasons[0]
  showRestReason.value = true
}

async function confirmRestReason() {
  if (!restTarget.value) return
  await updateBranch(restTarget.value.id, { status: 'offline', restReason: restFormReason.value })
  showRestReason.value = false
  restTarget.value = null
}

async function updateBranch(id: string, data: any) {
  await fetch(`/api/admin/branches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  fetchMerchant()
}

async function saveMerchant() {
  await fetch('/api/admin/merchant', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  })
}

/* Branch */
function openBranchDialog(branch?: any) {
  editingBranch.value = !!branch
  branchEditId.value = branch?.id ?? ''
  branchForm.value = branch
    ? { code: branch.code || '', name: branch.name, address: branch.address || '', todayLocation: branch.todayLocation || '', locationHint: branch.locationHint || '', businessHours: branch.businessHours || '' }
    : { code: '', name: '', address: '', todayLocation: '', locationHint: '', businessHours: '' }
  showBranch.value = true
}

async function saveBranch() {
  const url = editingBranch.value
    ? `/api/admin/branches/${branchEditId.value}`
    : '/api/admin/branches'
  await fetch(url, {
    method: editingBranch.value ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(branchForm.value),
  })
  showBranch.value = false
  fetchMerchant()
}

async function deleteBranch(id: string) {
  if (!confirm('确认删除？')) return
  await fetch(`/api/admin/branches/${id}`, { method: 'DELETE' })
  fetchMerchant()
}

async function fetchDevices() {
  const res = await fetch('/api/admin/devices')
  devices.value = await res.json()
}

function openDeviceDialog(device?: any) {
  editingDevice.value = !!device
  editingDeviceId.value = device?.id ?? ''
  deviceForm.value = device
    ? { code: device.code || '', name: device.name, contact: device.contact || '', mode: device.mode, branchId: device.branchId }
    : { code: '', name: '', contact: '', mode: 'kiosk', branchId: branches.value[0]?.id || '' }
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

async function deleteDevice(id: string) {
  if (!confirm('确认删除？')) return
  await fetch(`/api/admin/devices/${id}`, { method: 'DELETE' })
  fetchDevices()
}

async function handleReset(device: any) {
  regenerateSN(device.id)
}

async function handleOnline(device: any) {
  setDeviceStatus(device.id, 'active')
}

async function handleRemove(device: any) {
  deleteDevice(device.id)
}

async function regenerateSN(id: string) {
  if (!confirm('确认重新生成设备码？旧的设备码将失效。')) return
  const res = await fetch(`/api/admin/devices/${id}/regenerate-sn`, { method: 'POST' })
  const data = await res.json()
  alert('新设备码：' + data.sn)
  fetchDevices()
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
  fetchMerchant()
  fetchDevices()
})
</script>

<style scoped>
.merchant-page { max-width: none; }

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
.btn-icon-sm {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border: none; background: transparent; border-radius: 50%;
  cursor: pointer; color: inherit; transition: all 0.15s;
}
.btn-icon-sm:hover { background: var(--primary-soft); }
.btn-icon-sm .material-symbols-outlined { font-size: 16px; }

/* Settings Card */
.settings-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  padding: 20px; margin-bottom: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.card-head { margin-bottom: 16px; }
.card-title { margin: 0; font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--on-surface); }

.section-head { display: flex; justify-content: space-between; align-items: center; margin: 28px 0 14px; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.form-row { display: flex; gap: 12px; }
.flex-1 { flex: 1; }

/* Grid */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.data-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  padding: 16px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.15s;
}
.data-card:hover { border-color: #ffd9bd; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

.card-top { display: flex; align-items: flex-start; gap: 12px; }
.branch-avatar {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.branch-avatar .material-symbols-outlined { font-size: 22px; }
.branch-avatar.active { background: var(--tertiary-soft); color: #4ade80; }
.branch-avatar.offline { background: var(--surface-container-low); color: var(--text-disabled); }
.branch-title { flex: 1; min-width: 0; }
.branch-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.card-name { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--on-surface); }
.branch-code { font-family: monospace; font-size: 12px; color: var(--text-disabled); }
.status-tag { padding: 1px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; }
.status-tag.on { background: rgba(74, 173, 78, 0.15); color: #4ade80; }
.status-tag.off { background: rgb(255 76 55 / 16%); color: #f74e22; }

.rest-reason-text { margin: 6px 0 0; font-size: 13px; color: #f74e22; display: flex; align-items: center; gap: 4px; }

.branch-info { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: var(--surface-container-low); border-radius: 10px; }
.info-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--on-surface-variant); }
.info-item .material-symbols-outlined { font-size: 16px; color: var(--text-disabled); }

.branch-stats { display: flex; gap: 10px; }
.stat-box {
  display: flex; flex-direction: column; gap: 2px; flex: 1;
  padding: 10px; border-radius: 10px; background: var(--surface-container-low); text-align: center;
}
.stat-box.wide { flex: 2; }
.stat-num { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--on-surface); }
.stat-text { font-size: 13px; font-weight: 600; color: var(--on-surface); }
.stat-label { font-size: 11px; color: var(--text-disabled); }

.card-actions { display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--divider); padding-top: 12px; }
.chip-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border: 1px solid var(--border); border-radius: 20px;
  background: var(--surface); color: var(--on-surface-variant);
  font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.chip-btn .material-symbols-outlined { font-size: 15px; }
.chip-btn:hover { border-color: #ff6b00; color: #ff6b00; background: var(--primary-soft); }
.chip-btn.danger:hover { border-color: var(--error); color: #f74e22; background: rgb(255 76 55 / 16%); }
.chip-btn.toggle-off:hover { border-color: #f74e22; color: #f74e22; background: rgb(255 76 55 / 16%); }
.chip-btn.toggle-on { border-color: #4ade80; color: #4ade80; background: rgba(74, 173, 78, 0.15); }

.empty-inline { padding: 16px; text-align: center; color: var(--text-disabled); background: var(--surface); border: 1px dashed var(--border); border-radius: 12px; }

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

/* Reason */
.reason-list { display: flex; flex-direction: column; gap: 8px; }
.reason-option {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border);
  cursor: pointer; font-size: 14px; color: var(--on-surface); transition: all 0.15s;
}
.reason-option .material-symbols-outlined { font-size: 20px; }
.reason-option .unchecked { color: var(--text-disabled); }
.reason-option:hover { border-color: #ff6b00; background: var(--surface-container-low); }
.reason-option-active { border-color: #ff6b00; background: var(--primary-soft); color: #ff6b00; font-weight: 600; }
.reason-option-active .checked { color: #ff6b00; }

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
  .cards-grid { grid-template-columns: 1fr; }
  .form-row { flex-direction: column; }
}
</style>
