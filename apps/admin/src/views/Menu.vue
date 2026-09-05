<template>
  <div class="menu-page">
    <!-- Page Header & Actions -->
    <div class="page-header">
      <div>
        <h2 class="page-title">菜单管理</h2>
        <p class="page-subtitle">管理菜品、价格和库存</p>
      </div>
      <button class="btn-primary" @click="openDishDialog()">
        <span class="material-symbols-outlined">add</span>
        新增菜品
      </button>
    </div>

    <!-- Tabs & Filters -->
    <div class="tabs-container">
      <div class="tabs">
        <button :class="['tab-btn', tab === 'dishes' && 'active']" @click="tab = 'dishes'">
          <span class="material-symbols-outlined">restaurant_menu</span>
          菜品
          <span v-if="dishes.length" class="tab-count">{{ dishes.length }}</span>
        </button>
        <button :class="['tab-btn', tab === 'categories' && 'active']" @click="tab = 'categories'">
          <span class="material-symbols-outlined">category</span>
          分类
          <span v-if="categories.length" class="tab-count">{{ categories.length }}</span>
        </button>
        <button :class="['tab-btn', tab === 'soldout' && 'active']" @click="tab = 'soldout'">
          <span class="material-symbols-outlined">inventory_2</span>
          已售罄
          <span v-if="soldoutCount" class="tab-count">{{ soldoutCount }}</span>
        </button>
        <button :class="['tab-btn', tab === 'inactive' && 'active']" @click="tab = 'inactive'">
          <span class="material-symbols-outlined">unpublished</span>
          已下架
          <span v-if="inactiveCount" class="tab-count">{{ inactiveCount }}</span>
        </button>
      </div>
      <div class="filters" v-if="tab === 'dishes'">
        <div class="filter-tabs">
          <button :class="['filter-tab', selectedCategoryId === '' && 'active']" @click="selectedCategoryId = ''">全部</button>
          <button v-for="c in categories" :key="c.id" :class="['filter-tab', selectedCategoryId === c.id && 'active']" @click="selectedCategoryId = c.id">{{ c.name }}</button>
        </div>
        <button class="btn-secondary" @click="generateMenuImage" :disabled="generating">
          <span class="material-symbols-outlined">image</span>
          {{ generating ? '生成中...' : '生成菜单图片' }}
        </button>
      </div>
    </div>

    <!-- Dishes Grid -->
    <div v-if="tab !== 'categories'" class="dishes-section">
      <div class="dishes-grid" v-if="filteredDishes.length">
        <DishCard
          v-for="dish in filteredDishes"
          :key="dish.id"
          :dish="dish"
          @edit="openDishDialog"
          @delete="deleteDish"
          @toggleStatus="toggleStatus"
          @updateSort="updateSort"
          @updateStock="quickSaveStock"
          @enableStock="enableStock"
          @disableStock="disableStock"
        />
      </div>
      <div v-else class="empty-state">
        <span class="material-symbols-outlined">restaurant_menu</span>
        <p>{{ tab === 'soldout' ? '暂无已售罄菜品' : tab === 'inactive' ? '暂无已下架菜品' : '暂无菜品数据' }}</p>
      </div>
    </div>

    <!-- Categories Table -->
    <div v-if="tab === 'categories'" class="card">
      <div class="section-header">
        <span class="section-count">共 {{ categories.length }} 个分类</span>
        <button class="btn-primary" @click="openCategoryDialog()">
          <span class="material-symbols-outlined">add</span>
          新增分类
        </button>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>排序</th>
              <th>状态灯</th>
              <th class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.id" class="group">
              <td class="font-semibold">{{ cat.name }}</td>
              <td>{{ cat.sort }}</td>
              <td>
                <label class="toggle-switch">
                  <input type="checkbox" :checked="cat.showStatusLight" @change="toggleCategoryLight(cat)" />
                  <span class="toggle-slider"></span>
                </label>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn-icon" title="编辑" @click="openCategoryDialog(cat)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon btn-danger" title="删除" @click="deleteCategory(cat.id)">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Dish Dialog -->
    <div v-if="showDish" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingDish ? '编辑菜品' : '新增菜品' }}</h3>
          <button class="btn-icon" @click="showDish = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group" :class="{ 'has-error': dishErrors.name }">
            <label>名称</label>
            <input type="text" v-model="dishForm.name" placeholder="菜品名称" />
            <span class="field-error" v-if="dishErrors.name">{{ dishErrors.name }}</span>
          </div>
          <div class="form-row">
            <div class="form-group" :class="{ 'has-error': dishErrors.price }">
              <label>价格 (¥)</label>
              <input type="number" v-model.number="dishForm.price" min="0" step="0.5" />
              <span class="field-error" v-if="dishErrors.price">{{ dishErrors.price }}</span>
            </div>
            <div class="form-group" :class="{ 'has-error': dishErrors.categoryId }">
              <label>分类</label>
              <select v-model="dishForm.categoryId">
                <option value="" disabled>请选择分类</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <span class="field-error" v-if="dishErrors.categoryId">{{ dishErrors.categoryId }}</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>描述</label>
              <input type="text" v-model="dishForm.desc" placeholder="选填" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>图片 URL</label>
              <input type="text" v-model="dishForm.image" placeholder="https://..." />
            </div>
          </div>
          <div class="form-row options-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="dishForm.sellByPortion" />
              <span>按份卖</span>
            </label>
            <div v-if="dishForm.sellByPortion" class="inline-inputs">
              <input type="number" v-model.number="dishForm.portionSize" min="1" placeholder="数量" />
              <select v-model="dishForm.unit">
                <option value="串">串</option>
                <option value="斤">斤</option>
                <option value="只">只</option>
                <option value="份">份</option>
                <option value="个">个</option>
              </select>
            </div>
          </div>
          <div class="form-row options-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="dishForm.stockEnabled" />
              <span>启用库存</span>
            </label>
            <input v-if="dishForm.stockEnabled" type="number" v-model.number="dishForm.stock" min="0" placeholder="库存数量" class="stock-input-inline" />
          </div>
          <div class="form-row options-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="dishForm.alliance" />
              <span>联盟商品</span>
            </label>
            <span class="hint-text">不计入销量统计</span>
          </div>
          <div class="form-group" v-if="editingDish">
            <label>状态</label>
            <select v-model="dishForm.status">
              <option value="active">上架</option>
              <option value="inactive">下架</option>
            </select>
          </div>
          <div class="form-group">
            <label>规格组 <small>(可选)</small></label>
            <div class="preset-cat">通用</div>
            <div class="preset-blocks">
              <div class="preset-block" v-for="block in commonBlocks" :key="block.key">
                <Checkbox v-model="selectedPresets" :value="block.key" :inputId="'preset-' + block.key" @change="onPresetToggle(block.key)" />
                <label :for="'preset-' + block.key" class="preset-label">{{ block.label }}</label>
              </div>
            </div>
            <div class="preset-cat">咖啡</div>
            <div class="preset-blocks">
              <div class="preset-block" v-for="block in coffeeBlocks" :key="block.key">
                <Checkbox v-model="selectedPresets" :value="block.key" :inputId="'preset-' + block.key" @change="onPresetToggle(block.key)" />
                <label :for="'preset-' + block.key" class="preset-label">{{ block.label }}</label>
              </div>
            </div>
            <div class="helper-hint">勾选需要的规格块自由组合，可搭配下方「+ 添加自定义规格组」</div>
            <div class="spec-editor" v-if="dishForm.specGroups.length">
              <div v-for="(group, gi) in dishForm.specGroups" :key="gi" class="spec-group">
                <div class="spec-group-header">
                  <input type="text" v-model="group.name" placeholder="组名" />
                  <select v-model="group.type">
                    <option value="single">单选</option>
                    <option value="multi">多选</option>
                  </select>
                  <button class="btn-icon btn-danger" @click="removeSpecGroup(gi)">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <div v-for="(opt, oi) in group.options" :key="oi" class="spec-option">
                  <label class="default-radio" :title="'设为默认选中'">
                    <input type="radio" :name="'def-opt-' + gi" :checked="!!opt.default" @change="setDefaultOption(gi, oi)" />
                  </label>
                  <input type="text" v-model="opt.label" placeholder="选项名" />
                  <input type="number" v-model.number="opt.priceDelta" min="0" placeholder="加价" />
                  <button class="btn-icon-sm" @click="removeSpecOption(gi, oi)">×</button>
                </div>
                <button class="btn-text" @click="addSpecOption(gi)">+ 添加选项</button>
              </div>
            </div>
            <button class="btn-text" @click="addSpecGroup">+ 添加自定义规格组</button>
          </div>
          <div class="form-group">
            <label>标签 <small>(逗号分隔)</small></label>
            <input type="text" v-model="dishForm.tagsText" placeholder="招牌, 新品, 热销" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showDish = false">取消</button>
          <button class="btn-primary" @click="saveDish">保存</button>
        </div>
      </div>
    </div>

    <!-- Category Dialog -->
    <div v-if="showCategory" class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>{{ editingCategory ? '编辑分类' : '新增分类' }}</h3>
          <button class="btn-icon" @click="showCategory = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>名称</label>
            <input type="text" v-model="catForm.name" placeholder="分类名称" />
          </div>
          <div class="form-group">
            <label>排序</label>
            <input type="number" v-model.number="catForm.sort" min="0" />
          </div>
          <div class="form-row options-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="catForm.showStatusLight" />
              <span>启用状态灯</span>
            </label>
          </div>
          <p class="hint-block">启用后该分类菜品在取餐页显示制作/待取餐状态灯</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCategory = false">取消</button>
          <button class="btn-primary" @click="saveCategory">保存</button>
        </div>
      </div>
    </div>

    <!-- Menu Preview Dialog -->
    <div v-if="showMenuPreview" class="modal-overlay" @click.self="showMenuPreview = false">
      <div class="modal">
        <div class="modal-header">
          <h3>菜单预览</h3>
          <button class="btn-icon" @click="showMenuPreview = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body text-center">
          <img v-if="menuPreviewUrl" :src="menuPreviewUrl" class="menu-preview-img" alt="菜单预览" />
          <p class="preview-time">生成时间：{{ menuPreviewTime }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showMenuPreview = false">关闭</button>
          <button class="btn-primary" @click="downloadMenuImage">
            <span class="material-symbols-outlined">download</span>
            下载图片
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import DishCard from '../components/DishCard.vue'

const tab = ref('dishes')
const dishes = ref<any[]>([])
const categories = ref<any[]>([])
const selectedCategoryId = ref('')

const categorySortMap = computed(() => {
  const map: Record<string, number> = {}
  categories.value.forEach((c, i) => { map[c.id] = c.sort ?? i })
  return map
})

const soldoutCount = computed(() => dishes.value.filter(d => d.stockEnabled && d.stock <= 0).length)
const inactiveCount = computed(() => dishes.value.filter(d => d.status !== 'active').length)

const filteredDishes = computed(() => {
  let list = dishes.value
  if (tab.value === 'dishes') {
    list = selectedCategoryId.value
      ? list.filter(d => d.categoryId === selectedCategoryId.value)
      : list
  } else if (tab.value === 'soldout') {
    list = list.filter(d => d.stockEnabled && d.stock <= 0)
  } else if (tab.value === 'inactive') {
    list = list.filter(d => d.status !== 'active')
  }
  return [...list].sort((a, b) => {
    const ca = categorySortMap.value[a.categoryId] ?? Number.MAX_SAFE_INTEGER
    const cb = categorySortMap.value[b.categoryId] ?? Number.MAX_SAFE_INTEGER
    if (ca !== cb) return ca - cb
    return (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1)
  })
})

/* Dish */
const showDish = ref(false)
const editingDish = ref(false)
const selectedPresets = ref<string[]>([])

const SPEC_BLOCKS: { key: string; cat: 'common' | 'coffee'; label: string; group: any }[] = [
  { key: 'spice', cat: 'common', label: '辣度', group: { name: '辣度', type: 'single', options: [{ label: '不辣' }, { label: '微辣' }, { label: '中辣' }, { label: '特辣' }] } },
  { key: 'flavor', cat: 'common', label: '口味', group: { name: '口味', type: 'multi', options: [{ label: '原味' }, { label: '蒜香' }, { label: '黑胡椒' }] } },
  { key: 'count', cat: 'common', label: '串数', group: { name: '串数', type: 'single', options: [{ label: 'x1' }, { label: 'x2' }, { label: 'x3' }, { label: 'x4' }, { label: 'x5' }, { label: 'x6' }, { label: 'x8' }, { label: 'x10' }] } },
  { key: 'sweetness', cat: 'common', label: '甜度', group: { name: '甜度', type: 'single', options: [{ label: '全糖' }, { label: '七分糖' }, { label: '三分糖' }, { label: '无糖' }] } },
  { key: 'temp', cat: 'common', label: '温度', group: { name: '温度', type: 'single', options: [{ label: '冰镇' }, { label: '常温' }] } },
  { key: 'topping', cat: 'common', label: '加料', group: { name: '加料', type: 'multi', options: [{ label: '不加料' }, { label: '珍珠', priceDelta: 2 }, { label: '椰果', priceDelta: 2 }, { label: '布丁', priceDelta: 3 }, { label: '奶盖', priceDelta: 4 }] } },
  { key: 'cup', cat: 'common', label: '大小杯', group: { name: '大小杯', type: 'single', options: [{ label: '小杯', priceDelta: 0 }, { label: '中杯', priceDelta: 2 }, { label: '大杯', priceDelta: 4 }] } },
  { key: 'size', cat: 'common', label: '大小份', group: { name: '大小份', type: 'single', options: [{ label: '小份', priceDelta: 0 }, { label: '大份', priceDelta: 5 }] } },
  { key: 'cupSize', cat: 'common', label: '杯型', group: { name: '杯型', type: 'single', options: [{ label: '中杯' }, { label: '大杯' }, { label: '超大杯' }] } },
  { key: 'sugarSwap', cat: 'common', label: '可换糖', group: { name: '可换糖', type: 'single', options: [{ label: '经典糖' }, { label: '0热量代糖' }] } },
  { key: 'qty', cat: 'common', label: '份数', group: { name: '份数', type: 'single', options: [{ label: 'x1' }, { label: 'x2' }, { label: 'x3' }] } },
  { key: 'hotpotBase', cat: 'common', label: '锅底', group: { name: '锅底', type: 'single', options: [{ label: '麻辣锅底' }, { label: '番茄锅底' }, { label: '菌菇锅底' }, { label: '清汤锅底' }] } },
  { key: 'dip', cat: 'common', label: '蘸料', group: { name: '蘸料', type: 'single', options: [{ label: '油碟' }, { label: '麻酱' }, { label: '干碟' }] } },
  { key: 'coffeeBase', cat: 'coffee', label: '咖啡液', group: { name: '咖啡液', type: 'single', options: [{ label: '经典浓缩' }, { label: '金烘浓缩' }, { label: '低因咖啡' }] } },
  { key: 'coffeeExtract', cat: 'coffee', label: '萃取方式', group: { name: '萃取方式', type: 'single', options: [{ label: '原萃浓缩' }, { label: '精萃浓缩' }, { label: '满萃浓缩' }] } },
  { key: 'coffeeShots', cat: 'coffee', label: '浓缩份数', group: { name: '浓缩份数', type: 'single', options: [{ label: '1份' }, { label: '2份', default: true }, { label: '3份' }, { label: '4份' }] } },
  { key: 'coffeeMilk', cat: 'coffee', label: '加料', group: { name: '奶料', type: 'multi', options: [{ label: '牛奶' }, { label: '燕麦奶' }] } },
  { key: 'coffeeFoam', cat: 'coffee', label: '奶泡', group: { name: '奶泡', type: 'single', options: [{ label: '去奶泡' }] } },
  { key: 'coffeeSweet', cat: 'coffee', label: '甜度', group: { name: '咖啡甜度', type: 'single', options: [{ label: '标准甜' }, { label: '加甜' }] } },
]

const commonBlocks = computed(() => SPEC_BLOCKS.filter((b) => b.cat === 'common'))
const coffeeBlocks = computed(() => SPEC_BLOCKS.filter((b) => b.cat === 'coffee'))

function onPresetToggle(key: string) {
  const block = SPEC_BLOCKS.find((b) => b.key === key)
  if (!block) return
  const gi = dishForm.value.specGroups.findIndex((g: any) => g.name === block.group.name)
  if (selectedPresets.value.includes(key)) {
    if (gi < 0) dishForm.value.specGroups.push(JSON.parse(JSON.stringify(block.group)))
  } else if (gi >= 0) {
    dishForm.value.specGroups.splice(gi, 1)
  }
}

const dishForm = ref({ name: '', price: 0, categoryId: '', desc: '', image: '', tagsText: '', status: 'active', sellByPortion: false, portionSize: 0, unit: '串', stockEnabled: false, stock: 0, alliance: false, specGroups: [] as any[] })
const dishErrors = reactive({ name: '', price: '', categoryId: '' })

function addSpecGroup() {
  dishForm.value.specGroups.push({ name: '', type: 'single', options: [{ label: '', priceDelta: 0 }] })
}
function addSpecOption(gi: number) {
  dishForm.value.specGroups[gi].options.push({ label: '', priceDelta: 0 })
}
function removeSpecGroup(gi: number) {
  const g = dishForm.value.specGroups[gi]
  dishForm.value.specGroups.splice(gi, 1)
  const block = SPEC_BLOCKS.find((b) => b.group.name === g?.name)
  if (block) {
    const idx = selectedPresets.value.indexOf(block.key)
    if (idx >= 0) selectedPresets.value.splice(idx, 1)
  }
}
function removeSpecOption(gi: number, oi: number) {
  dishForm.value.specGroups[gi].options.splice(oi, 1)
}
function setDefaultOption(gi: number, oi: number) {
  const options = dishForm.value.specGroups[gi].options
  options.forEach((o: any, index: number) => {
    if (index === oi) o.default = true
    else delete o.default
  })
}

const originalName = ref('')

function presetOf(group: any): string {
  const block = SPEC_BLOCKS.find((b) => {
    if (b.group.name !== group?.name || b.group.type !== group?.type) return false
    if (b.group.options.length !== group.options?.length) return false
    return b.group.options.every((po: any) => group.options.some((go: any) => go.label === po.label))
  })
  return block ? block.key : ''
}

function applyPresetsToForm(groups: any[]) {
  const matched = groups.filter((g) => presetOf(g))
  const rest = groups.filter((g) => !presetOf(g))
  dishForm.value.specGroups = [...matched, ...rest]
  selectedPresets.value = matched.map((g) => presetOf(g))
}

function openDishDialog(dish?: any) {
  dishErrors.name = ''
  dishErrors.price = ''
  dishErrors.categoryId = ''
  if (dish) {
    editingDish.value = true
    originalName.value = dish.name
    const specGroups = dish.specGroups?.length ? JSON.parse(JSON.stringify(dish.specGroups)) : []
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
      unit: dish.unit || '串',
      stockEnabled: !!dish.stockEnabled,
      stock: dish.stock ?? 0,
      alliance: !!dish.alliance,
      specGroups,
    }
    applyPresetsToForm(specGroups)
  } else {
    editingDish.value = false
    originalName.value = ''
    selectedPresets.value = []
    dishForm.value = { name: '', price: 0, categoryId: categories.value[0]?.id || '', desc: '', image: '', tagsText: '', status: 'active', sellByPortion: false, portionSize: 0, unit: '串', stockEnabled: false, stock: 0, alliance: false, specGroups: [] }
  }
  showDish.value = true
}

async function saveDish() {
  dishErrors.name = ''
  dishErrors.price = ''
  dishErrors.categoryId = ''
  if (!dishForm.value.name?.trim()) dishErrors.name = '请输入菜品名称'
  if (dishForm.value.price === null || dishForm.value.price === undefined || isNaN(dishForm.value.price) || dishForm.value.price < 0) dishErrors.price = '请输入有效的菜品价格'
  if (!dishForm.value.categoryId) dishErrors.categoryId = '请选择菜品分类'
  if (dishErrors.name || dishErrors.price || dishErrors.categoryId) return
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
    unit: dishForm.value.sellByPortion ? dishForm.value.unit : '串',
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
const editingCategory = ref<any>(null)
const catForm = ref({ name: '', sort: 0, showStatusLight: false })

function openCategoryDialog(cat?: any) {
  if (cat) {
    editingCategory.value = cat
    catForm.value = { name: cat.name, sort: cat.sort, showStatusLight: !!cat.showStatusLight }
  } else {
    editingCategory.value = null
    catForm.value = { name: '', sort: 0, showStatusLight: false }
  }
  showCategory.value = true
}

async function saveCategory() {
  const body = { name: catForm.value.name, sort: catForm.value.sort, showStatusLight: catForm.value.showStatusLight }
  const catId = editingCategory.value?.id ?? null
  const url = catId ? `/api/admin/categories/${catId}` : '/api/admin/categories'
  await fetch(url, {
    method: catId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  showCategory.value = false
  fetchCategories()
}

async function toggleCategoryLight(cat: any) {
  await fetch(`/api/admin/categories/${cat.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ showStatusLight: !cat.showStatusLight }),
  })
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

async function fetchDishes() {
  const res = await fetch('/api/admin/dishes')
  dishes.value = await res.json()
}

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

async function updateSort(dish: any, newSort?: number) {
  const sortValue = newSort !== undefined ? newSort : dish.sort
  const res = await fetch(`/api/admin/dishes/${dish.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sort: sortValue }),
  })
  if (!res.ok) console.error('sort update failed', await res.text())
  else fetchDishes()
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
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

.menu-page {
  padding: 0;
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--on-surface);
}

.page-subtitle {
  margin: 4px 0 0;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--on-surface-variant);
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--primary-container);
  color: var(--on-primary);
  border: none;
  padding: 10px 20px;
  border-radius: 24px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 8px rgba(255, 107, 0, 0.2);
}

.btn-primary:hover {
  background: #e65c00;
  transform: scale(0.98);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  color: var(--on-surface);
  border: 1px solid var(--border);
  padding: 10px 20px;
  border-radius: 24px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary:hover {
  border-color: #ff6b00;
  color: #ff6b00;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  color: var(--on-surface-variant);
  transition: all 0.15s;
}

.btn-icon:hover {
  background: rgba(255, 107, 0, 0.1);
  color: #ff6b00;
}

.btn-icon.btn-danger:hover {
  background: rgba(186, 26, 26, 0.1);
  color: #f74e22;
}

.btn-icon-sm {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--surface-container-low);
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-disabled);
  transition: all 0.15s;
}

.btn-icon-sm:hover {
  background: #ffdad6;
  color: #f74e22;
}

.btn-text {
  background: none;
  border: none;
  color: #ff6b00;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-text:hover {
  text-decoration: underline;
}

.btn-text-success {
  background: none;
  border: none;
  color: #4aad4e;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-text-danger {
  background: none;
  border: none;
  color: #f74e22;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
}

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-size: 20px;
  font-variation-settings: 'wght' 500;
}

/* Tabs */
.tabs-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  color: var(--text-secondary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn.active {
  background: #ff6b00;
  color: var(--on-primary);
  border-color: #ff6b00;
}

.tab-btn:hover:not(.active) {
  border-color: #ff6b00;
  color: #ff6b00;
}

.tab-count {
  padding: 1px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.2);
  color: #d97706;
}

.tab-btn.active .tab-count {
  background: rgba(255, 255, 255, 0.3);
  color: var(--on-primary);
}

.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  color: var(--on-surface-variant);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.filter-tab:hover {
  border-color: #ff6b00;
  color: #ff6b00;
}

.filter-tab.active {
  background: #ff6b00;
  color: var(--on-primary);
  border-color: #ff6b00;
}

/* Card */
.card {
  background: var(--surface);
  border-radius: 16px;
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.section-count {
  font-size: 13px;
  color: var(--on-surface-variant);
}

/* Dishes Grid */
.dishes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

/* Table */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 12px 16px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--on-surface-variant);
  background: var(--surface-container-low);
  border-bottom: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}

.data-table tbody tr {
  transition: background 0.1s;
}

.data-table tbody tr:hover {
  background: var(--surface-container-low);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.text-right {
  text-align: right;
}

.w-16 {
  width: 64px;
}

/* Dish Info */
.dish-info {
  min-width: 180px;
}

.dish-name {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--on-surface);
}

.dish-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* Tags & Badges */
.category-tag {
  display: inline-block;
  padding: 4px 10px;
  background: var(--surface-container);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--on-surface);
}

.price {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ff6b00;
}

.portion {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: default;
}

.status-clickable {
  cursor: pointer;
  transition: all 0.15s;
}

.status-clickable:hover {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-active {
  background: rgba(74, 173, 78, 0.15);
  color: #4ade80;
}

.status-active::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4aad4e;
}

.status-inactive {
  background: rgba(186, 26, 26, 0.1);
  color: #f74e22;
}

.status-inactive::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ba1a1a;
}

/* Stock Cell */
.stock-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stock-input {
  width: 70px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

.stock-unlimited {
  color: var(--text-disabled);
  font-size: 13px;
}

/* Sort Input */
.sort-input {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

/* Action Buttons */
.action-btns {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border);
  transition: 0.2s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #4aad4e;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: var(--surface);
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal-sm {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--on-surface);
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

/* Form */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--on-surface-variant);
}

.form-group input:not([type="checkbox"]),
.form-group select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 14px;
  transition: border-color 0.15s;
}

.form-group input:not([type="checkbox"]):focus,
.form-group select:focus {
  outline: none;
  border-color: #ff6b00;
}

.form-group.has-error input:not([type="checkbox"]),
.form-group.has-error select {
  border-color: var(--error);
  background: var(--error-soft);
}

.field-error {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--error);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.options-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--on-surface);
  white-space: nowrap;
  flex-shrink: 0;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #ff6b00;
}

.inline-inputs {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.inline-inputs input,
.inline-inputs select {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  flex-shrink: 0;
}

.stock-input-inline {
  width: 100px !important;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
}

.hint-text {
  font-size: 12px;
  color: var(--text-disabled);
}

.hint-block {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--text-disabled);
  line-height: 1.5;
}

/* Spec Editor */
.preset-blocks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preset-block {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--on-surface);
  background: var(--surface);
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
}

.preset-block:has(input:checked) {
  border-color: #ff6b00;
  background: rgba(255, 107, 0, 0.08);
  color: #ff6b00;
}

.preset-block :deep(.p-checkbox-box) {
  width: 18px;
  height: 18px;
}

.preset-block label {
  margin: 0;
}

.preset-label {
  line-height: 18px;
  cursor: pointer;
}

.preset-cat {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-disabled);
  margin: 0 0 8px;
  padding-top: 4px;
}

.preset-cat:not(:first-child) {
  margin-top: 10px;
}

.helper-hint {
  font-size: 12px;
  color: var(--text-disabled);
  margin: -4px 0 12px;
}

.spec-option label {
  margin: 0;
}

.default-radio {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.default-radio input[type="radio"] {
  width: 15px;
  height: 15px;
  accent-color: #ff6b00;
  margin: 0;
  cursor: pointer;
}

.spec-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spec-group {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  background: var(--surface-container-low);
}

.spec-group-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.spec-group-header input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
}

.spec-group-header select {
  width: 80px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
}

.spec-option {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.spec-option input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
}

/* Empty State */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-disabled);
}

.empty-state .material-symbols-outlined {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Menu Preview */
.text-center {
  text-align: center;
}

.menu-preview-img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.preview-time {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-disabled);
}

.font-semibold {
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .tabs-container {
    flex-direction: column;
    align-items: stretch;
  }

  .filters {
    flex-wrap: wrap;
  }

  .form-row {
    flex-direction: column;
  }

  .options-row {
    align-items: flex-start;
  }

  .action-btns {
    opacity: 1;
  }
}
</style>
