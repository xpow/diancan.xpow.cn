<template>
  <div class="kitchen-terminals-page">
    <div class="page-header">
      <h2 class="page-title">出餐机管理</h2>
      <div class="header-actions">
        <Button label="新增出餐机" icon="pi pi-plus" @click="openDialog()" />
      </div>
    </div>

    <DataTable :value="terminals" striped-rows>
      <Column field="code" header="机码">
        <template #body="{ data }">
          <span class="mono-text">{{ data.code }}</span>
        </template>
      </Column>
      <Column field="name" header="名称" />
      <Column header="终端标识">
        <template #body="{ data }">
          <span class="mono-addr">{{ data.addressCode ? data.addressCode.slice(0, 12) + '…' : '-' }}</span>
        </template>
      </Column>
      <Column header="显示分类">
        <template #body="{ data }">
          <div v-if="data.categoryIds && data.categoryIds.length" class="cat-wrap">
            <span v-for="c in data.categoryIds" :key="c" class="cat-tag">{{ categoryName(c) }}</span>
          </div>
          <span v-else class="empty-text">全部</span>
        </template>
      </Column>
      <Column field="status" header="状态">
        <template #body="{ data }">
          <Tag :value="data.status === 'active' ? '启用' : '停用'" :severity="data.status === 'active' ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column header="操作">
        <template #body="{ data }">
          <Button icon="pi pi-refresh" label="重置地址码" severity="info" text size="small" @click="regenerate(data)" />
          <Button icon="pi pi-pencil" label="编辑" severity="info" text size="small" @click="openDialog(data)" />
          <Button icon="pi pi-trash" label="删除" severity="danger" size="small" @click="remove(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showDialog" :header="editing ? '编辑出餐机' : '新增出餐机'" style="width:420px">
      <div class="form-group">
        <label>机码</label>
        <InputText v-model="form.code" class="w-full" placeholder="不填自动生成" />
      </div>
      <div class="form-group">
        <label>名称</label>
        <InputText v-model="form.name" class="w-full" placeholder="不填自动生成" />
      </div>
      <div class="form-group">
        <label>显示分类</label>
        <MultiSelect v-model="form.categoryIds" :options="categories" optionLabel="name" optionValue="id" placeholder="选择出餐机显示的菜品分类（不选=全部）" class="w-full" display="chip" />
      </div>
      <div v-if="editing" class="form-group">
        <label>状态</label>
        <Select v-model="form.status" :options="[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showDialog = false" />
        <Button label="保存" @click="save" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showNewCode" header="新的地址码" style="width:420px">
      <p class="new-code-hint">请复制以下地址码到出餐端绑定，关闭后将无法再次查看（仅出餐端可重新生成）。</p>
      <div class="new-code-box">{{ newCode }}</div>
      <template #footer>
        <Button label="复制并关闭" icon="pi pi-copy" @click="copyAndClose" />
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
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

const terminals = ref<any[]>([])
const categories = ref<any[]>([])

const showDialog = ref(false)
const editing = ref(false)
const editId = ref('')
const form = ref({ code: '', name: '', categoryIds: [] as string[], status: 'active' })

const showNewCode = ref(false)
const newCode = ref('')

async function fetchTerminals() {
  const res = await fetch('/api/admin/kitchen-terminals')
  terminals.value = await res.json()
}

async function fetchCategories() {
  const res = await fetch('/api/admin/categories')
  categories.value = await res.json()
}

function categoryName(id: string) {
  return categories.value.find((c) => c.id === id)?.name || id
}

function openDialog(term?: any) {
  editing.value = !!term
  editId.value = term?.id ?? ''
  form.value = term
    ? { code: term.code || '', name: term.name, categoryIds: term.categoryIds || [], status: term.status || 'active' }
    : { code: '', name: '', categoryIds: [], status: 'active' }
  showDialog.value = true
}

async function save() {
  const url = editing.value ? `/api/admin/kitchen-terminals/${editId.value}` : '/api/admin/kitchen-terminals'
  const res = await fetch(url, {
    method: editing.value ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    return alert('保存失败：' + (err.message || err.error || res.statusText))
  }
  showDialog.value = false
  fetchTerminals()
  if (!editing.value) {
    const data = await res.json()
    if (data.addressCode) {
      newCode.value = data.addressCode
      showNewCode.value = true
    }
  }
}

async function regenerate(term: any) {
  if (!confirm(`确认重新生成「${term.name}」的地址码？\n\n旧的地址码将立即失效，出餐端需重新绑定。`)) return
  const res = await fetch(`/api/admin/kitchen-terminals/${term.id}/regenerate-address`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    return alert('操作失败：' + (err.message || err.error || res.statusText))
  }
  const data = await res.json()
  newCode.value = data.addressCode
  showNewCode.value = true
  fetchTerminals()
}

async function remove(term: any) {
  if (!confirm(`确认删除出餐机「${term.name}」？`)) return
  const res = await fetch(`/api/admin/kitchen-terminals/${term.id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    return alert('删除失败：' + (err.message || err.error || res.statusText))
  }
  fetchTerminals()
}

async function copyAndClose() {
  try {
    await navigator.clipboard.writeText(newCode.value)
  } catch {}
  alert('已复制地址码：' + newCode.value)
  showNewCode.value = false
}

onMounted(() => {
  fetchTerminals()
  fetchCategories()
})
</script>

<style scoped>
.kitchen-terminals-page { max-width: none; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.header-actions { display: flex; gap: 8px; }
.mono-text { font-family: monospace; font-size: 13px; letter-spacing: 1px; }
.mono-addr { font-family: monospace; font-size: 12px; color: #888; word-break: break-all; }
.cat-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
.cat-tag { padding: 2px 8px; border-radius: 9999px; background: #fff3e6; color: #bf5b00; font-size: 12px; }
.empty-text { color: #999; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 6px; }
.w-full { width: 100%; }
.new-code-hint { font-size: 13px; color: #666; margin: 0 0 12px; }
.new-code-box { padding: 12px; border-radius: 8px; background: #f5f5f5; border: 1px dashed #ddd; font-family: monospace; font-weight: 700; font-size: 14px; word-break: break-all; color: #bf5b00; }
</style>
