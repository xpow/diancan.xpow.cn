<template>
  <div class="merchant-page">
    <div class="page-header">
      <h2 class="page-title">商家设置</h2>
      <Button label="保存" icon="pi pi-save" @click="saveMerchant" />
    </div>

    <div class="card">
      <h3 class="card-title">基本信息</h3>
      <div class="form-group">
        <label>商家名称</label>
        <InputText v-model="form.name" class="w-full" />
      </div>
      <div class="form-group">
        <label>标语</label>
        <InputText v-model="form.slogan" class="w-full" />
      </div>
      <div class="form-group">
        <label>Logo URL</label>
        <InputText v-model="form.logoUrl" class="w-full" placeholder="https://..." />
      </div>
    </div>

    <!-- 休息原因弹窗 -->
    <Dialog v-model:visible="showRestReason" :header="`休息原因 - ${restTarget?.name || ''}`" style="width:380px">
      <div class="reason-list">
        <div
          v-for="reason in restReasons" :key="reason"
          :class="['reason-option', restFormReason === reason && 'reason-option-active']"
          @click="restFormReason = reason"
        >
          <span class="reason-radio" :class="{ 'reason-radio-checked': restFormReason === reason }"></span>
          {{ reason }}
        </div>
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showRestReason = false" />
        <Button label="确定" @click="confirmRestReason" />
      </template>
    </Dialog>

    <div class="section-header" style="margin-top:24px">
      <h3 class="card-title">分店管理</h3>
      <Button label="新增分店" icon="pi pi-plus" @click="openBranchDialog()" />
    </div>
    <DataTable :value="branches" striped-rows>
      <Column field="code" header="编号" style="width:80px" />
      <Column field="name" header="名称" />
      <Column field="todayLocation" header="出摊位置" />
      <Column field="businessHours" header="营业时间" />
      <Column field="deviceCount" header="设备数" />
      <Column field="orderCount" header="订单数" />
      <Column field="status" header="状态">
        <template #body="{ data }">
          <div class="status-toggle">
            <Button
              label="营业中"
              :severity="data.status === 'active' ? 'success' : 'secondary'"
              :outlined="data.status !== 'active'"
              size="small"
              @click="setBranchStatus(data, 'active')"
            />
            <Button
              label="休息中"
              :severity="data.status !== 'active' ? 'danger' : 'secondary'"
              :outlined="data.status === 'active'"
              size="small"
              @click="setBranchStatus(data, 'offline')"
            />
          </div>
          <p v-if="data.status !== 'active' && data.restReason" class="rest-reason-text" style="margin-top:4px">
            {{ data.restReason }} <Button icon="pi pi-pencil" text size="small" @click="editBranchRestReason(data)" />
          </p>
        </template>
      </Column>
      <Column header="操作" style="width:160px">
        <template #body="{ data }">
          <Button icon="pi pi-pencil" label="编辑" severity="info" text size="small" @click="openBranchDialog(data)" />
          <Button icon="pi pi-trash" label="删除" severity="danger" size="small" @click="deleteBranch(data.id)" />
        </template>
      </Column>
    </DataTable>

    <!-- Branch Dialog -->
    <Dialog v-model:visible="showBranch" :header="editingBranch ? '编辑分店' : '新增分店'" style="width:520px">
      <div class="form-row">
        <div class="form-group flex-1">
          <label>编号（字母）</label>
          <InputText v-model="branchForm.code" class="w-full" maxlength="2" placeholder="A" />
        </div>
        <div class="form-group flex-1">
          <label>名称</label>
          <InputText v-model="branchForm.name" class="w-full" />
        </div>
      </div>
      <div class="form-group">
        <label>地址</label>
        <InputText v-model="branchForm.address" class="w-full" />
      </div>
      <div class="form-group">
        <label>今日出摊位置</label>
        <InputText v-model="branchForm.todayLocation" class="w-full" placeholder="如：东门入口第3个摊位" />
      </div>
      <div class="form-group">
        <label>位置提示</label>
        <InputText v-model="branchForm.locationHint" class="w-full" placeholder="如：对着蜜雪冰城" />
      </div>
      <div class="form-group">
        <label>营业时间</label>
        <InputText v-model="branchForm.businessHours" class="w-full" placeholder="例：17:00-02:00" />
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showBranch = false" />
        <Button label="保存" @click="saveBranch" />
      </template>
    </Dialog>

    <div class="section-header" style="margin-top:24px">
      <h3 class="card-title">设备管理</h3>
    </div>
    <DataTable :value="adminDevices" striped-rows>
      <Column field="code" header="编号" style="width:60px" />
      <Column field="name" header="名称" />
      <Column field="role" header="角色">
        <template #body="{ data }">
          <Tag :value="data.role === 'admin' ? '管理员' : '用户'" :severity="data.role === 'admin' ? 'warn' : 'info'" />
        </template>
      </Column>
      <Column field="contact" header="联系方式" />
      <Column field="mode" header="模式">
        <template #body="{ data }">
          <Tag :value="data.mode === 'kiosk' ? '自助点餐' : 'H5点单'" :severity="data.mode === 'kiosk' ? 'info' : 'contrast'" />
        </template>
      </Column>
      <Column header="设备码" style="width:160px">
        <template #body="{ data }">
          <span v-if="data.sn" class="sn-text">{{ data.sn }}</span>
          <span v-else class="sn-empty">-</span>
        </template>
      </Column>
      <Column field="branchName" header="所属分店" />
      <Column field="authCount" header="关联设备">
        <template #body="{ data }">
          <Button v-if="data.authCount > 0" :label="String(data.authCount)" severity="info" text size="small" @click="showAuthLogs(data)" />
          <span v-else class="sn-empty">0</span>
        </template>
      </Column>
      <Column field="status" header="状态">
        <template #body="{ data }">
          <div class="device-status-cell">
            <Tag :value="data.status === 'active' ? '在线' : '离线'" :severity="data.status === 'active' ? 'success' : 'danger'" />
            <Button
              v-if="data.status === 'active'"
              icon="pi pi-power-off"
              label="下线"
              severity="warn"
              text
              size="small"
              @click="offlineDevice(data)"
            />
            <Button
              v-else
              icon="pi pi-sync"
              label="上线"
              severity="success"
              text
              size="small"
              @click="setDeviceStatus(data.id, 'active')"
            />
          </div>
        </template>
      </Column>
      <Column header="操作" style="width:360px">
        <template #body="{ data }">
          <Button v-if="data.sn" icon="pi pi-copy" label="复制" severity="info" text size="small" @click="copySN(data.sn)" />
          <Button icon="pi pi-refresh" label="重置" severity="info" text size="small" @click="regenerateSN(data.id)" />
          <Button icon="pi pi-pencil" label="编辑" severity="info" text size="small" @click="openDeviceDialog(data)" />
          <Button icon="pi pi-trash" label="删除" severity="danger" size="small" @click="deleteDevice(data.id)" />
          <Button icon="pi pi-wrench" label="指令" severity="help" text size="small" @click="openCommandDialog(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showDevice" :header="editingDevice ? '编辑设备' : '新增设备'" style="width:400px">
      <div class="form-group">
        <label>编号（2位）</label>
        <InputText v-model="deviceForm.code" class="w-full" maxlength="2" placeholder="不填自动递增" />
      </div>
      <div class="form-group">
        <label>设备名称</label>
        <InputText v-model="deviceForm.name" class="w-full" placeholder="不填自动生成" />
      </div>
      <div class="form-group">
        <label>联系方式</label>
        <InputText v-model="deviceForm.contact" class="w-full" placeholder="手机号/微信号" />
      </div>
      <div class="form-group">
        <label>模式</label>
        <Select v-model="deviceForm.mode" :options="[{ label: '自助点餐机', value: 'kiosk' }, { label: 'H5 扫码点单', value: 'h5' }]" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <div class="form-group">
        <label>所属分店</label>
        <Select v-model="deviceForm.branchId" :options="branches" optionLabel="name" optionValue="id" class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showDevice = false" />
        <Button label="保存" @click="saveDevice" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showCommand" :header="`设备指令 - ${commandTarget?.name || ''}`" style="width:400px">
      <div class="form-group">
        <label>指令类型</label>
        <Select v-model="commandForm.command" :options="commandOptions" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showCommand = false" />
        <Button label="发送" @click="sendCommand" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showAuthLog" header="关联设备列表" style="width:600px">
      <DataTable v-if="authLogs.length" :value="authLogs">
        <Column field="deviceType" header="设备类型" />
        <Column field="lastAuthAt" header="最近认证时间">
          <template #body="{ data }">
            {{ new Date(data.lastAuthAt).toLocaleString() }}
          </template>
        </Column>
        <Column field="ip" header="IP" />
      </DataTable>
      <p v-else class="empty-hint">暂无记录</p>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

const form = ref({ name: '', slogan: '', statusText: '', logoUrl: '' })
const showRestReason = ref(false)
const restReasons = ['天气原因', '市政管理', '停业休息']
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

async function copySN(sn: string) {
  try {
    await navigator.clipboard.writeText(sn)
    alert('已复制设备码：' + sn)
  } catch {
    alert('设备码：' + sn)
  }
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
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.card-title { margin: 0 0 16px; font-size: 16px; font-weight: 700; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; }
.form-row { display: flex; gap: 12px; }
.flex-1 { flex: 1; }
.w-full { width: 100%; }
.status-toggle { display: flex; gap: 8px; }
.rest-reason-text { margin: 4px 0 0; font-size: 13px; color: #e74c3c; display: flex; align-items: center; gap: 4px; }
.reason-list { display: flex; flex-direction: column; gap: 8px; }
.reason-option { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; border: 1px solid #e0e0e0; cursor: pointer; font-size: 14px; transition: all 0.2s; }
.reason-option:hover { border-color: #ff6b00; background: #fff8f0; }
.reason-option-active { border-color: #ff6b00; background: #fff8f0; color: #ff6b00; font-weight: 600; }
.reason-radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #ccc; display: inline-block; transition: all 0.2s; }
.reason-radio-checked { border-color: #ff6b00; background: #ff6b00; box-shadow: inset 0 0 0 3px #fff; }
.sn-text { font-family: monospace; font-size: 13px; letter-spacing: 1px; }
.sn-empty { color: #999; }
.device-status-cell { display: flex; align-items: center; gap: 4px; }
</style>
