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
      <div class="form-row">
        <div class="form-group flex-1">
          <label>营业时间</label>
          <InputText v-model="form.businessHours" class="w-full" placeholder="例：17:00-02:00" />
        </div>
        <div class="form-group flex-1">
          <label>营业状态文字</label>
          <InputText v-model="form.statusText" class="w-full" placeholder="例：营业中" />
        </div>
      </div>
      <div class="form-group">
        <label>Logo URL</label>
        <InputText v-model="form.logoUrl" class="w-full" placeholder="https://..." />
      </div>
    </div>

    <div class="section-header" style="margin-top:24px">
      <h3 class="card-title">分店管理</h3>
      <Button label="新增分店" icon="pi pi-plus" @click="openBranchDialog()" />
    </div>
    <DataTable :value="branches" striped-rows>
      <Column field="code" header="编号" style="width:80px" />
      <Column field="name" header="名称" />
      <Column field="address" header="地址" />
      <Column field="todayLocation" header="今日出摊位置" />
      <Column field="deviceCount" header="设备数" />
      <Column field="orderCount" header="订单数" />
      <Column field="status" header="状态">
        <template #body="{ data }">
          <Tag :value="data.status === 'active' ? '营业中' : '已关闭'" :severity="data.status === 'active' ? 'success' : 'danger'" />
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
      <template #footer>
        <Button label="取消" severity="secondary" @click="showBranch = false" />
        <Button label="保存" @click="saveBranch" />
      </template>
    </Dialog>

    <div class="section-header" style="margin-top:24px">
      <h3 class="card-title">设备管理</h3>
      <Button label="新增设备" icon="pi pi-plus" @click="openDeviceDialog()" />
    </div>
    <DataTable :value="devices" striped-rows>
      <Column field="code" header="编号" style="width:60px" />
      <Column field="name" header="名称" />
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

    <!-- Device Dialog -->
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

    <!-- Command Dialog -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

const form = ref({ name: '', slogan: '', businessHours: '', statusText: '', logoUrl: '' })

const branches = ref<any[]>([])
const showBranch = ref(false)
const editingBranch = ref(false)
const branchForm = ref({ code: '', name: '', address: '', todayLocation: '', locationHint: '' })

const devices = ref<any[]>([])
const showDevice = ref(false)
const editingDevice = ref(false)
const deviceForm = ref({ code: '', name: '', contact: '', mode: 'kiosk', branchId: '' })

const showCommand = ref(false)
const commandTarget = ref<any>(null)
const commandForm = ref({ command: 'clear_storage' })
const commandOptions = [
  { label: '清除缓存和 Cookies', value: 'clear_storage' },
]

async function fetchMerchant() {
  const res = await fetch('/api/admin/merchant')
  const data = await res.json()
  form.value = {
    name: data.name || '',
    slogan: data.slogan || '',
    businessHours: data.businessHours || '',
    statusText: data.statusText || '',
    logoUrl: data.logoUrl || '',
  }
  branches.value = data.branches || []
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
  branchForm.value = branch
    ? { code: branch.code || '', name: branch.name, address: branch.address || '', todayLocation: branch.todayLocation || '', locationHint: branch.locationHint || '' }
    : { code: '', name: '', address: '', todayLocation: '', locationHint: '' }
  showBranch.value = true
}

async function saveBranch() {
  const url = editingBranch.value
    ? `/api/admin/branches/${(branches.value.find((b) => b.name === branchForm.value.name)?.id)}`
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

/* Device */
async function fetchDevices() {
  const res = await fetch('/api/admin/devices')
  devices.value = await res.json()
}

function openDeviceDialog(device?: any) {
  editingDevice.value = !!device
  deviceForm.value = device
    ? { code: device.code || '', name: device.name, contact: device.contact || '', mode: device.mode, branchId: device.branchId }
    : { code: '', name: '', contact: '', mode: 'kiosk', branchId: branches.value[0]?.id || '' }
  showDevice.value = true
}

async function saveDevice() {
  const url = editingDevice.value
    ? `/api/admin/devices/${(devices.value.find((d) => d.name === deviceForm.value.name)?.id)}`
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

async function sendCommand() {
  if (!commandTarget.value) return
  const res = await fetch(`/api/admin/devices/${commandTarget.value.id}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(commandForm.value),
  })
  if (!res.ok) return alert('发送失败')
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
.sn-text { font-family: monospace; font-size: 13px; letter-spacing: 1px; }
.sn-empty { color: #999; }
.wrap-cell { white-space: normal; }
.device-status-cell { display: flex; align-items: center; gap: 4px; }
</style>
