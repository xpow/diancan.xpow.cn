<template>
  <div class="nm-page">
    <div class="page-header">
      <h2 class="page-title">夜市管理</h2>
      <div class="header-actions">
        <InputText v-model="amapKey" placeholder="高德 API Key" class="key-input" />
        <Button label="新增夜市" icon="pi pi-plus" @click="openNew" />
      </div>
    </div>

    <DataTable :value="markets" striped-rows class="p-mt-3">
      <Column field="name" header="名称" />
      <Column field="city" header="城市" />
      <Column field="address" header="地址" />
      <Column field="lat" header="纬度" />
      <Column field="lng" header="经度" />
      <Column field="radius" header="半径(m)" />
      <Column field="status" header="状态" />
      <Column header="操作" style="width:120px">
        <template #body="{ data }">
          <Button icon="pi pi-trash" severity="danger" text @click="deleteMarket(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showDialog" header="新增夜市" style="width:500px">
      <div class="form-group">
        <label>高德搜索</label>
        <div class="search-row">
          <InputText v-model="searchKeyword" placeholder="输入关键词，如：夜市" class="flex-1" />
          <Button label="搜索" icon="pi pi-search" severity="info" @click="searchPoi" />
        </div>
        <div v-if="poiResults.length" class="poi-list">
          <div v-for="p in poiResults" :key="p.location" class="poi-item" @click="selectPoi(p)">
            <strong>{{ p.name }}</strong>
            <span class="poi-addr">{{ p.address }}</span>
            <span class="poi-loc">{{ p.location }}</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>名称</label>
        <InputText v-model="form.name" class="w-full" />
      </div>
      <div class="form-group">
        <label>地址</label>
        <InputText v-model="form.address" class="w-full" />
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label>经度</label>
          <InputText v-model="form.lng" />
        </div>
        <div class="form-group flex-1">
          <label>纬度</label>
          <InputText v-model="form.lat" />
        </div>
        <div class="form-group flex-1">
          <label>半径(m)</label>
          <InputText v-model="form.radius" />
        </div>
      </div>
      <div class="form-group">
        <label>城市</label>
        <InputText v-model="form.city" class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showDialog = false" />
        <Button label="保存" @click="save" />
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

interface NightMarket {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  radius: number
  city?: string
  status: string
}

interface PoiResult {
  name: string
  address: string
  location: string
  city: string
  pname: string
}

const markets = ref<NightMarket[]>([])
const showDialog = ref(false)
const searchKeyword = ref('')
const poiResults = ref<PoiResult[]>([])
const amapKey = ref(localStorage.getItem('amap_key') || '')

const form = ref({ name: '', address: '', lat: '', lng: '', radius: '200', city: '' })

async function fetchMarkets() {
  const res = await fetch('/api/night-markets')
  markets.value = await res.json()
}

async function searchPoi() {
  if (!amapKey.value) return
  localStorage.setItem('amap_key', amapKey.value)
  const res = await fetch(`/api/night-markets/search/poi?keyword=${encodeURIComponent(searchKeyword.value)}&key=${amapKey.value}`)
  const data = await res.json()
  poiResults.value = data
}

function selectPoi(p: PoiResult) {
  const [lng, lat] = p.location.split(',')
  form.value = { name: p.name, address: p.address, lat, lng, radius: '200', city: p.city || p.pname }
  poiResults.value = []
  searchKeyword.value = ''
}

function openNew() {
  form.value = { name: '', address: '', lat: '', lng: '', radius: '200', city: '' }
  poiResults.value = []
  searchKeyword.value = ''
  showDialog.value = true
}

async function save() {
  await fetch('/api/night-markets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: form.value.name,
      address: form.value.address,
      lat: parseFloat(form.value.lat),
      lng: parseFloat(form.value.lng),
      radius: parseInt(form.value.radius) || 200,
      city: form.value.city,
    }),
  })
  showDialog.value = false
  fetchMarkets()
}

async function deleteMarket(id: string) {
  await fetch(`/api/night-markets/${id}`, { method: 'DELETE' })
  fetchMarkets()
}

onMounted(fetchMarkets)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.header-actions { display: flex; gap: 8px; align-items: center; }
.key-input { width: 200px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
.form-row { display: flex; gap: 12px; }
.flex-1 { flex: 1; }
.w-full { width: 100%; }
.search-row { display: flex; gap: 8px; }
.poi-list { margin-top: 8px; max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; }
.poi-item { padding: 10px; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; flex-direction: column; gap: 2px; }
.poi-item:hover { background: #f0f0f0; }
.poi-addr { font-size: 12px; color: var(--text-secondary); }
.poi-loc { font-size: 11px; color: var(--text-disabled); }
</style>
