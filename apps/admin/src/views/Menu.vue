<template>
  <div class="menu-page">
    <div class="page-header">
      <h2 class="page-title">菜单管理</h2>
      <div class="header-tabs">
        <Button :severity="tab === 'dishes' ? 'primary' : 'secondary'" text @click="tab = 'dishes'">菜品</Button>
        <Button :severity="tab === 'categories' ? 'primary' : 'secondary'" text @click="tab = 'categories'">分类</Button>
      </div>
    </div>

    <!-- Dishes -->
    <div v-if="tab === 'dishes'">
      <div class="section-header">
        <span class="section-count">共 {{ filteredDishes.length }} 个菜品</span>
        <div class="section-actions">
          <Select v-model="selectedCategoryId" :options="categoryOptions" optionLabel="label" optionValue="value" class="category-filter" placeholder="全部分类" />
          <Button label="生成菜单图片" icon="pi pi-image" severity="warning" @click="generateMenuImage" :loading="generating" />
          <Button label="新增菜品" icon="pi pi-plus" @click="openDishDialog()" />
        </div>
      </div>
      <DataTable :value="filteredDishes" striped-rows>
        <Column header="排序" style="width:100px">
          <template #body="{ data }">
            <InputText v-model.number="data.sort" type="number" min="0" max="999" style="width:80px" @change="updateSort(data)" />
          </template>
        </Column>
        <Column field="id" header="ID" style="width:180px" />
        <Column field="name" header="名称" />
        <Column field="categoryName" header="分类" />
        <Column field="price" header="价格">
          <template #body="{ data }">
            <template v-if="data.portionSize">¥{{ data.price.toFixed(2) }}/{{ data.portionSize }}串</template>
            <template v-else>¥{{ data.price.toFixed(2) }}</template>
          </template>
        </Column>
        <Column field="specGroups" header="规格" style="width:120px">
          <template #body="{ data }">
            <span v-if="data.specGroups?.length" style="font-size:13px;color:#666">{{ data.specGroups.length }} 组</span>
            <span v-else style="font-size:13px;color:#999">无</span>
          </template>
        </Column>
        <Column field="stock" header="库存（快捷录入）" style="width:260px">
          <template #body="{ data }">
            <div class="stock-quick-edit">
              <template v-if="data.stockEnabled">
                <InputNumber
                  v-model="data.stock"
                  :min="0"
                  class="stock-input"
                  @value-change="quickSaveStock(data, $event)"
                />
                <Button label="取消" severity="danger" text size="small" @click="disableStock(data)" />
              </template>
              <template v-else>
                <span style="color:#999;margin-right:6px">不限</span>
                <Button label="启用" severity="success" size="small" @click="enableStock(data)" />
              </template>
            </div>
          </template>
        </Column>
        <Column field="alliance" header="联盟" style="width:80px">
          <template #body="{ data }">
            <ToggleSwitch :modelValue="data.alliance" @update:modelValue="toggleAlliance(data)" />
          </template>
        </Column>
        <Column field="status" header="状态" style="width:100px">
          <template #body="{ data }">
            <Button :label="data.status === 'active' ? '下架' : '上架'" :severity="data.status === 'active' ? 'success' : 'danger'" size="small" @click="toggleStatus(data)" />
          </template>
        </Column>
        <Column header="操作" style="width:160px">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" label="编辑" severity="info" text size="small" @click="openDishDialog(data)" />
            <Button icon="pi pi-trash" label="删除" severity="danger" size="small" @click="deleteDish(data.id)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Categories -->
    <div v-if="tab === 'categories'">
      <div class="section-header">
        <span class="section-count">共 {{ categories.length }} 个分类</span>
        <Button label="新增分类" icon="pi pi-plus" @click="openCategoryDialog()" />
      </div>
      <DataTable :value="categories" striped-rows>
        <Column field="name" header="名称" />
        <Column field="sort" header="排序" />
        <Column header="操作" style="width:160px">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" label="编辑" severity="info" text size="small" @click="openCategoryDialog(data)" />
            <Button icon="pi pi-trash" label="删除" severity="danger" size="small" @click="deleteCategory(data.id)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Dish Dialog -->
    <Dialog v-model:visible="showDish" :header="editingDish ? '编辑菜品' : '新增菜品'" style="width:520px">
      <div class="form-group">
        <label>名称</label>
        <InputText v-model="dishForm.name" class="w-full" placeholder="菜品名称" />
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label>价格 (¥)</label>
          <InputNumber v-model="dishForm.price" :min="0" :step="0.5" mode="decimal" :minFractionDigits="2" :maxFractionDigits="2" class="w-full" />
        </div>
        <div class="form-group flex-1">
          <label>分类</label>
          <Select v-model="dishForm.categoryId" :options="categories" optionLabel="name" optionValue="id" class="w-full" />
        </div>
      </div>
      <div class="form-row" style="align-items: flex-end">
        <div class="option-group" style="flex:1">
          <span class="option-label">按份卖</span>
          <ToggleSwitch v-model="dishForm.sellByPortion" />
          <span class="option-hint">每份</span>
          <InputNumber v-model="dishForm.portionSize" :min="2" class="stock-input" :disabled="!dishForm.sellByPortion" placeholder="串" />
        </div>
        <div class="option-group">
          <span class="option-label">启用库存</span>
          <ToggleSwitch v-model="dishForm.stockEnabled" />
          <span class="option-hint">数量</span>
          <InputNumber v-model="dishForm.stock" :min="0" class="stock-input" :disabled="!dishForm.stockEnabled" placeholder="个" />
        </div>
      </div>
      <div class="form-row" style="align-items: flex-end">
        <div class="option-group">
          <span class="option-label">联盟商品</span>
          <ToggleSwitch v-model="dishForm.alliance" />
          <span class="option-hint">不计入销量统计</span>
        </div>
      </div>
      <div class="form-group">
        <label>描述</label>
        <InputText v-model="dishForm.desc" class="w-full" placeholder="选填" />
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label>图片 URL</label>
          <InputText v-model="dishForm.image" class="w-full" placeholder="https://..." />
        </div>
        <div class="form-group flex-1">
          <label>套用预设</label>
          <Select v-model="selectedPreset" :options="specsOptions" optionLabel="label" optionValue="value" class="w-full" @change="applyPreset" />
        </div>
      </div>
      <div class="form-group">
        <label>规格组 <small style="color:#999;font-weight:400">（选预设后可按需修改）</small></label>
        <div class="spec-editor">
          <div v-for="(group, gi) in dishForm.specGroups" :key="gi" class="spec-group-card">
            <div class="spec-group-header">
              <div style="flex:1;min-width:0;overflow:hidden;display:flex;align-items:center;gap:6px">
                <InputText v-model="group.name" placeholder="组名" style="width:160px;flex-shrink:0;box-sizing:border-box" />
                <Button icon="pi pi-trash" severity="danger" text size="small" @click="removeSpecGroup(gi)" style="flex-shrink:0" />
              </div>
              <Select v-model="group.type" :options="[{label:'单选',value:'single'},{label:'多选',value:'multi'}]" optionLabel="label" optionValue="value" style="width:100px;flex-shrink:0;min-width:0" />
            </div>
            <div v-for="(opt, oi) in group.options" :key="oi" class="spec-option-row">
              <InputText v-model="opt.label" placeholder="选项名" class="spec-option-name" />
              <InputNumber v-model="opt.priceDelta" :min="0" placeholder="加价" class="spec-price-input">
                <template #prefix>+¥</template>
              </InputNumber>
              <Button icon="pi pi-times" severity="danger" text size="small" @click="removeSpecOption(gi, oi)" style="flex-shrink:0" />
            </div>
            <Button label="添加选项" icon="pi pi-plus" severity="info" text size="small" @click="addSpecOption(gi)" />
          </div>
          <Button label="添加规格组" icon="pi pi-plus" severity="info" outlined size="small" @click="addSpecGroup" class="add-group-btn" />
        </div>
      </div>
      <div class="form-group">
        <label>标签（逗号分隔）</label>
        <InputText v-model="dishForm.tagsText" class="w-full" placeholder="招牌, 新品, 热销" />
      </div>
      <div class="form-group" v-if="editingDish">
        <label>状态</label>
        <Select v-model="dishForm.status" :options="[{ label: '上架', value: 'active' }, { label: '下架', value: 'inactive' }]" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showDish = false" />
        <Button label="保存" @click="saveDish" />
      </template>
    </Dialog>

    <!-- Category Dialog -->
    <Dialog v-model:visible="showCategory" :header="editingCategory ? '编辑分类' : '新增分类'" style="width:400px">
      <div class="form-group">
        <label>名称</label>
        <InputText v-model="catForm.name" class="w-full" placeholder="分类名称" />
      </div>
      <div class="form-group">
        <label>排序</label>
        <InputNumber v-model="catForm.sort" :min="0" class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" severity="secondary" @click="showCategory = false" />
        <Button label="保存" @click="saveCategory" />
      </template>
    </Dialog>

    <!-- Menu Preview Dialog -->
    <Dialog v-model:visible="showMenuPreview" header="菜单预览" :style="{ width: '500px' }" :modal="true">
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
        <img v-if="menuPreviewUrl" :src="menuPreviewUrl" style="width:100%;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1)" alt="菜单预览" />
        <div style="font-size:13px;color:#999">生成时间：{{ menuPreviewTime }}</div>
      </div>
      <template #footer>
        <Button label="关闭" severity="secondary" @click="showMenuPreview = false" />
        <Button label="下载图片" icon="pi pi-download" @click="downloadMenuImage" />
      </template>
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
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

const tab = ref('dishes')
const dishes = ref<any[]>([])
const categories = ref<any[]>([])
const selectedCategoryId = ref('')

const categoryOptions = computed(() => [
  { label: '全部分类', value: '' },
  ...categories.value.map(c => ({ label: c.name, value: c.id })),
])

const filteredDishes = computed(() => {
  let list = selectedCategoryId.value
    ? dishes.value.filter(d => d.categoryId === selectedCategoryId.value)
    : dishes.value
  return [...list].sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1))
})

/* Dish */
const showDish = ref(false)
const editingDish = ref(false)
const selectedPreset = ref('none')

const specsOptions = [
  { label: '无规格', value: 'none' },
  { label: '烧烤（辣度+口味+串数）', value: 'bbq' },
  { label: '素菜（辣度+串数）', value: 'veg' },
  { label: '茶饮（甜度+温度+加料）', value: 'tea' },
  { label: '火锅（锅底+蘸料）', value: 'hotpot' },
  { label: '甜品（大小份+加料）', value: 'dessert' },
  { label: '冷饮（温度）', value: 'drink' },
]

const SPECS_PRESETS: Record<string, any[]> = {
  none: [],
  bbq: [
    { name: '辣度', type: 'single', options: [{ label: '不辣' }, { label: '微辣' }, { label: '中辣' }, { label: '特辣' }] },
    { name: '口味', type: 'multi', options: [{ label: '原味' }, { label: '蒜香' }, { label: '黑胡椒' }] },
    { name: '串数', type: 'single', options: [{ label: 'x1' }, { label: 'x2' }, { label: 'x3' }, { label: 'x4' }, { label: 'x5' }, { label: 'x6' }, { label: 'x8' }, { label: 'x10' }] },
  ],
  veg: [
    { name: '辣度', type: 'single', options: [{ label: '不辣' }, { label: '微辣' }, { label: '中辣' }, { label: '特辣' }] },
    { name: '串数', type: 'single', options: [{ label: 'x1' }, { label: 'x2' }, { label: 'x3' }, { label: 'x4' }, { label: 'x5' }, { label: 'x6' }, { label: 'x8' }, { label: 'x10' }] },
  ],
  tea: [
    { name: '甜度', type: 'single', options: [{ label: '全糖' }, { label: '七分糖' }, { label: '三分糖' }, { label: '无糖' }] },
    { name: '温度', type: 'single', options: [{ label: '冰镇' }, { label: '常温' }] },
    { name: '加料', type: 'multi', options: [{ label: '不加料' }, { label: '珍珠', priceDelta: 2 }, { label: '椰果', priceDelta: 2 }, { label: '布丁', priceDelta: 3 }, { label: '奶盖', priceDelta: 4 }] },
  ],
  hotpot: [
    { name: '锅底', type: 'single', options: [{ label: '麻辣锅底' }, { label: '番茄锅底' }, { label: '菌菇锅底' }, { label: '清汤锅底' }] },
    { name: '蘸料', type: 'single', options: [{ label: '油碟' }, { label: '麻酱' }, { label: '干碟' }] },
  ],
  dessert: [
    { name: '大小份', type: 'single', options: [{ label: '小份', priceDelta: 0 }, { label: '大份', priceDelta: 5 }] },
    { name: '加料', type: 'multi', options: [{ label: '不加料' }, { label: '芒果', priceDelta: 5 }, { label: '草莓', priceDelta: 5 }, { label: '红豆', priceDelta: 3 }, { label: '芋圆', priceDelta: 4 }] },
  ],
  drink: [
    { name: '温度', type: 'single', options: [{ label: '冰镇' }, { label: '常温' }] },
  ],
}

function applyPreset() {
  const preset = SPECS_PRESETS[selectedPreset.value]
  dishForm.value.specGroups = preset ? JSON.parse(JSON.stringify(preset)) : []
}

const dishForm = ref({ name: '', price: 0, categoryId: '', desc: '', image: '', tagsText: '', status: 'active', sellByPortion: false, portionSize: 0, stockEnabled: false, stock: 0, alliance: false, specGroups: [] as any[] })

function addSpecGroup() {
  dishForm.value.specGroups.push({ name: '', type: 'single', options: [{ label: '', priceDelta: 0 }] })
}
function addSpecOption(gi: number) {
  dishForm.value.specGroups[gi].options.push({ label: '', priceDelta: 0 })
}
function removeSpecGroup(gi: number) {
  dishForm.value.specGroups.splice(gi, 1)
}
function removeSpecOption(gi: number, oi: number) {
  dishForm.value.specGroups[gi].options.splice(oi, 1)
}

const originalName = ref('')

function matchPreset(groups: any[]): string {
  for (const [key, preset] of Object.entries(SPECS_PRESETS)) {
    if (key === 'none') continue
    if (groups.length !== preset.length) continue
    const match = preset.every((pg: any, i: number) => {
      const g = groups[i]
      if (!g) return false
      if (g.name !== pg.name || g.type !== pg.type) return false
      if (g.options.length !== pg.options.length) return false
      return pg.options.every((po: any) => g.options.some((go: any) => go.label === po.label))
    })
    if (match) return key
  }
  return 'none'
}

function openDishDialog(dish?: any) {
  if (dish) {
    editingDish.value = true
    originalName.value = dish.name
    const specGroups = dish.specGroups?.length ? JSON.parse(JSON.stringify(dish.specGroups)) : []
    selectedPreset.value = matchPreset(specGroups)
    dishForm.value = {
      name: dish.name,
      price: dish.price,
      categoryId: dish.categoryId,
      desc: dish.desc || '',
      image: dish.image || '',
      tagsText: (dish.tags || []).join(', '),
      status: dish.status || 'active',
      sellByPortion: (dish.portionSize ?? 0) > 0,
      portionSize: dish.portionSize ?? 0,
      stockEnabled: !!dish.stockEnabled,
      stock: dish.stock ?? 0,
      alliance: !!dish.alliance,
      specGroups,
    }
  } else {
    editingDish.value = false
    originalName.value = ''
    selectedPreset.value = 'none'
    dishForm.value = { name: '', price: 0, categoryId: categories.value[0]?.id || '', desc: '', image: '', tagsText: '', status: 'active', sellByPortion: false, portionSize: 0, stockEnabled: false, stock: 0, alliance: false, specGroups: [] }
  }
  showDish.value = true
}

async function saveDish() {
  const body = {
    name: dishForm.value.name,
    price: dishForm.value.price,
    categoryId: dishForm.value.categoryId,
    desc: dishForm.value.desc,
    image: dishForm.value.image || undefined,
    specGroups: dishForm.value.specGroups.filter((g) => g.name?.trim()),
    tags: dishForm.value.tagsText ? dishForm.value.tagsText.split(/[，,]\s*/).filter(Boolean) : [],
    status: dishForm.value.status,
    portionSize: dishForm.value.sellByPortion ? dishForm.value.portionSize : 0,
    stockEnabled: dishForm.value.stockEnabled,
    stock: dishForm.value.stockEnabled ? dishForm.value.stock : 0,
    alliance: dishForm.value.alliance,
  }

  const dishId = editingDish.value ? (dishes.value.find((d) => d.name === originalName.value)?.id) : null
  const url = dishId ? `/api/admin/dishes/${dishId}` : '/api/admin/dishes'
  await fetch(url, {
    method: dishId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  showDish.value = false
  fetchDishes()
}

async function deleteDish(id: string) {
  if (!confirm('确认删除该菜品？')) return
  await fetch(`/api/admin/dishes/${id}`, { method: 'DELETE' })
  fetchDishes()
}

const generating = ref(false)
const showMenuPreview = ref(false)
const menuPreviewUrl = ref('')
const menuPreviewBlob = ref<Blob | null>(null)
const menuPreviewTime = ref('')
async function generateMenuImage() {
  generating.value = true
  try {
    const res = await fetch('/api/admin/generate-menu-image')
    if (!res.ok) { const err = await res.json(); alert(err.message || '生成失败'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    menuPreviewBlob.value = blob
    menuPreviewUrl.value = url
    menuPreviewTime.value = new Date().toLocaleString()
    showMenuPreview.value = true
  } catch (e: any) {
    alert(e.message || '生成失败')
  } finally {
    generating.value = false
  }
}
function downloadMenuImage() {
  if (!menuPreviewBlob.value) return
  const url = URL.createObjectURL(menuPreviewBlob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = `menu-${new Date().toISOString().slice(0, 10)}.png`
  a.click()
  URL.revokeObjectURL(url)
}

/* Category */
const showCategory = ref(false)
const editingCategory = ref(false)
const catForm = ref({ name: '', sort: 0 })

function openCategoryDialog(cat?: any) {
  if (cat) {
    editingCategory.value = true
    catForm.value = { name: cat.name, sort: cat.sort }
  } else {
    editingCategory.value = false
    catForm.value = { name: '', sort: 0 }
  }
  showCategory.value = true
}

async function saveCategory() {
  const body = { name: catForm.value.name, sort: catForm.value.sort }
  const catId = editingCategory.value ? (categories.value.find((c) => c.name === catForm.value.name)?.id) : null
  const url = catId ? `/api/admin/categories/${catId}` : '/api/admin/categories'
  await fetch(url, {
    method: catId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  showCategory.value = false
  fetchCategories()
}

async function deleteCategory(id: string) {
  if (!confirm('确认删除该分类？')) return
  const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const msg = await res.json()
    alert(msg.message || '删除失败')
    return
  }
  fetchCategories()
}

async function toggleAlliance(dish: any) {
  if (!dish.alliance) {
    if (!confirm(`确认将「${dish.name}」设为联盟商品？\n联盟商品将不计入菜品销量统计。`)) return
  }
  const res = await fetch(`/api/admin/dishes/${dish.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alliance: !dish.alliance }),
  })
  if (res.ok) fetchDishes()
}

async function toggleStatus(dish: any) {
  const newStatus = dish.status === 'active' ? 'inactive' : 'active'

  // 下架时检查关联的福利活动
  if (newStatus === 'inactive') {
    const promoRes = await fetch('/api/admin/promotions')
    const promos = promoRes.ok ? await promoRes.json() : []
    const related = promos.filter((p: any) =>
      p.type === 'welfare_item' && p.status === 'active' && p.items.some((i: any) => i.dishId === dish.id),
    )
    if (related.length > 0) {
      const names = related.map((p: any) => p.name).join('、')
      if (!confirm(`该商品存在福利活动「${names}」，下架后该活动将自动停用，是否继续？`)) return
      // 停用关联的福利活动
      await Promise.all(related.map((p: any) =>
        fetch(`/api/admin/promotions/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'inactive' }),
        }),
      ))
    }
  }

  const res = await fetch(`/api/admin/dishes/${dish.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  })
  if (res.ok) fetchDishes()
}

async function fetchDishes() {
  const res = await fetch('/api/admin/dishes')
  dishes.value = await res.json()
}

// 快捷录入库存：值提交（回车/失焦）即保存，仅更新库存字段
async function quickSaveStock(dish: any, newValue: number | null) {
  const newStock = Math.max(0, Number(newValue) || 0)
  if (dish.__lastSavedStock === newStock) return
  dish.__lastSavedStock = newStock
  dish.stock = newStock
  const res = await fetch(`/api/admin/dishes/${dish.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stockEnabled: true, stock: newStock }),
  })
  if (!res.ok) {
    console.error('stock save failed', await res.text())
    alert('库存保存失败')
  }
}

async function enableStock(dish: any) {
  dish.stockEnabled = true
  dish.stock = dish.stock ?? 0
  const res = await fetch(`/api/admin/dishes/${dish.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stockEnabled: true, stock: dish.stock }),
  })
  if (!res.ok) {
    console.error('enable stock failed', await res.text())
    alert('启用库存失败')
  }
}

async function disableStock(dish: any) {
  dish.stockEnabled = false
  const res = await fetch(`/api/admin/dishes/${dish.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stockEnabled: false }),
  })
  if (!res.ok) {
    console.error('disable stock failed', await res.text())
    alert('取消库存管理失败')
  }
}

async function updateSort(dish: any) {
  const res = await fetch(`/api/admin/dishes/${dish.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sort: dish.sort }),
  })
  if (!res.ok) console.error('sort update failed', await res.text())
  else fetchDishes()
}

async function fetchCategories() {
  const res = await fetch('/api/admin/categories')
  categories.value = await res.json()
}

onMounted(() => {
  fetchDishes()
  fetchCategories()
})
</script>

<style scoped>
.menu-page { }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.header-tabs { display: flex; gap: 4px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-actions { display: flex; align-items: center; gap: 8px; }
.category-filter { min-width: 150px; }
.section-count { font-size: 13px; color: #666; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; }
.form-group :deep(.p-inputnumber-input),
.form-group :deep(.p-select-label),
.form-group :deep(.p-inputtext) { height: 36px; }
.form-row { display: flex; gap: 12px; }
.flex-1 { flex: 1; }
.w-full { width: 100%; }
.spec-editor { display: flex; flex-direction: column; gap: 8px; max-width: 100%; overflow: hidden; }
.spec-group-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; background: #fafafa; overflow: hidden; max-width: 100%; box-sizing: border-box; }
.spec-group-header { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; max-width: 100%; }
.spec-group-header .p-inputtext { max-width: 100%; }
.spec-option-row { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; max-width: 100%; }
.spec-option-row .spec-option-name { flex: 1; min-width: 0; }
.spec-option-row .spec-price-input { flex: 1; min-width: 0; }
.spec-option-row .spec-price-input:deep(.p-inputtext) { width: 100%; text-align: center; }
.add-group-btn { align-self: flex-start; margin-top: 4px; }
.stock-quick-edit { display: flex; align-items: center; gap: 6px; }
.stock-input { width: 80px; }
.stock-input:deep(.p-inputtext) { width: 80px; text-align: center; font-weight: 600; }
.option-group { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.option-label { font-size: 13px; font-weight: 600; color: var(--text-color); white-space: nowrap; }
.option-hint { font-size: 12px; color: var(--text-color-secondary); white-space: nowrap; }
.spec-price-input { width: 80px; }
.spec-price-input:deep(.p-inputtext) { width: 80px; text-align: center; }
</style>
