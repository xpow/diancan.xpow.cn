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
        <span class="section-count">共 {{ dishes.length }} 个菜品</span>
        <Button label="新增菜品" icon="pi pi-plus" @click="openDishDialog()" />
      </div>
      <DataTable :value="dishes" striped-rows>
        <Column header="排序" style="width:100px">
          <template #body="{ data }">
            <InputText v-model.number="data.sort" type="number" min="0" max="999" style="width:80px" @change="updateSort(data)" />
          </template>
        </Column>
        <Column field="id" header="ID" style="width:180px" />
        <Column field="name" header="名称" />
        <Column field="categoryName" header="分类" />
        <Column field="price" header="价格">
          <template #body="{ data }">¥{{ data.price.toFixed(2) }}</template>
        </Column>
        <Column field="specsPreset" header="规格">
          <template #body="{ data }">
            <Tag :value="specsLabel(data.specsPreset)" style="font-size:12px" />
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
          <InputNumber v-model="dishForm.price" :min="0" :step="0.5" class="w-full" />
        </div>
        <div class="form-group flex-1">
          <label>分类</label>
          <Select v-model="dishForm.categoryId" :options="categories" optionLabel="name" optionValue="id" class="w-full" />
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
          <label>规格模板</label>
          <Select v-model="dishForm.specsPreset" :options="specsOptions" optionLabel="label" optionValue="value" class="w-full" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Tag from 'primevue/tag'

const tab = ref('dishes')
const dishes = ref<any[]>([])
const categories = ref<any[]>([])

/* Dish */
const showDish = ref(false)
const editingDish = ref(false)
const dishForm = ref({ name: '', price: 0, categoryId: '', desc: '', image: '', specsPreset: 'none', tagsText: '', status: 'active' })

const specsOptions = [
  { label: '无规格', value: 'none' },
  { label: '烧烤（辣度+份量）', value: 'bbq' },
  { label: '茶饮（甜度+温度+加料）', value: 'tea' },
  { label: '火锅（锅底+蘸料）', value: 'hotpot' },
  { label: '甜品（大小份+加料）', value: 'dessert' },
]

function specsLabel(v: string) {
  return specsOptions.find((o) => o.value === v)?.label || v
}

const originalName = ref('')

function openDishDialog(dish?: any) {
  if (dish) {
    editingDish.value = true
    originalName.value = dish.name
    dishForm.value = {
      name: dish.name,
      price: dish.price,
      categoryId: dish.categoryId,
      desc: dish.desc || '',
      image: dish.image || '',
      specsPreset: dish.specsPreset || 'none',
      tagsText: (dish.tags || []).join(', '),
      status: dish.status || 'active',
    }
  } else {
    editingDish.value = false
    originalName.value = ''
    dishForm.value = { name: '', price: 0, categoryId: categories.value[0]?.id || '', desc: '', image: '', specsPreset: 'none', tagsText: '', status: 'active' }
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
    specsPreset: dishForm.value.specsPreset,
    tags: dishForm.value.tagsText ? dishForm.value.tagsText.split(/[，,]\s*/).filter(Boolean) : [],
    status: dishForm.value.status,
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

async function toggleStatus(dish: any) {
  const newStatus = dish.status === 'active' ? 'inactive' : 'active'
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
.section-count { font-size: 13px; color: #666; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; font-weight: 600; color: #666; margin-bottom: 4px; }
.form-row { display: flex; gap: 12px; }
.flex-1 { flex: 1; }
.w-full { width: 100%; }
</style>
