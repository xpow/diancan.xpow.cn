<template>
  <div class="devices-page">
    <div class="page-header">
      <h2 class="page-title">点餐机管理</h2>
      <div class="header-actions">
        <Button
          :label="filterUser ? '全部' : '仅用户设备'"
          :icon="filterUser ? 'pi pi-list' : 'pi pi-user'"
          severity="secondary"
          @click="filterUser = !filterUser"
        />
        <Button label="新增设备" icon="pi pi-plus" @click="openDeviceDialog()" />
      </div>
    </div>

    <DataTable :value="filteredDevices" striped-rows>
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
      <Column header="分享" style="width:100px">
        <template #body="{ data }">
          <Button
            :label="data.shared ? '已分享' : '启用分享'"
            :severity="data.shared ? 'success' : 'contrast'"
            :icon="data.shared ? 'pi pi-check-circle' : 'pi pi-share-alt'"
            text
            size="small"
            @click="toggleShare(data)"
          />
        </template>
      </Column>
      <Column header="操作" style="width:360px">
        <template #body="{ data }">
          <Button v-if="data.sn" icon="pi pi-copy" label="复制" severity="info" text size="small" @click="copySN(data.sn)" />
          <Button v-if="data.sn" icon="pi pi-qrcode" label="扫码链接" severity="info" text size="small" @click="copyQRUrl(data.id)" />
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
        <label>角色</label>
        <Select v-model="deviceForm.role" :options="[{ label: '用户', value: 'user' }, { label: '管理员', value: 'admin' }]" optionLabel="label" optionValue="value" class="w-full" />
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
        <Column field="userAgent" header="User-Agent" style="max-width:300px">
          <template #body="{ data }">
            <span class="ua-text">{{ data.userAgent || '-' }}</span>
          </template>
        </Column>
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
const authTargetName = ref('')

async function showAuthLogs(device: any) {
  authTargetName.value = device.name
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
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.header-actions { display: flex; gap: 8px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; }
.w-full { width: 100%; }
.sn-text { font-family: monospace; font-size: 13px; letter-spacing: 1px; }
.sn-empty { color: #999; }
.device-status-cell { display: flex; align-items: center; gap: 4px; }
</style>
