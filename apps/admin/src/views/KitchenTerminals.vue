<template>
  <div class="kitchen-terminals-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h2 class="page-title">出餐机管理</h2>
        <p class="page-subtitle">管理出餐设备及其展示分类</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" @click="openDialog()">
          <span class="material-symbols-outlined">add</span>
          新增出餐机
        </button>
      </div>
    </div>

    <!-- Terminals Grid -->
    <div class="terminals-grid" v-if="terminals.length">
      <div v-for="term in terminals" :key="term.id" class="terminal-card">
        <div class="terminal-head">
          <div class="terminal-avatar" :class="term.status === 'active' ? 'active' : 'inactive'">
            <span class="material-symbols-outlined">restaurant</span>
          </div>
          <div class="terminal-info">
            <div class="terminal-name-row">
              <span class="terminal-name">{{ term.name }}</span>
              <span class="role-tag" :class="term.role === 'admin' ? 'admin' : 'user'">
                {{ term.role === 'admin' ? '管理员' : '普通' }}
              </span>
              <span class="status-tag" :class="term.status === 'active' ? 'on' : 'off'">
                {{ term.status === 'active' ? '启用' : '停用' }}
              </span>
            </div>
            <div class="terminal-meta">
              <span class="meta-item"><span class="material-symbols-outlined">pin</span>{{ term.code }}</span>
            </div>
          </div>
        </div>

        <div class="terminal-cats">
          <div class="cats-label">
            <span class="material-symbols-outlined">category</span>
            显示分类
          </div>
          <div v-if="term.categoryIds && term.categoryIds.length" class="cat-wrap">
            <span v-for="c in term.categoryIds" :key="c" class="cat-tag">{{ categoryName(c) }}</span>
          </div>
          <span v-else class="empty-text">全部</span>
        </div>

        <div class="terminal-url">
          <span class="url-label">唯一访问地址</span>
          <span class="mono-url">{{ terminalUrl(term) }}</span>
        </div>

        <div class="terminal-actions">
          <button class="chip-btn" @click="copyUrl(term)">
            <span class="material-symbols-outlined">content_copy</span>复制地址
          </button>
          <button class="chip-btn status-toggle" :class="term.status === 'active' ? 'off' : 'on'" @click="toggleStatus(term)">
            <span class="material-symbols-outlined">{{ term.status === 'active' ? 'toggle_off' : 'toggle_on' }}</span>
            {{ term.status === 'active' ? '停用' : '启用' }}
          </button>
          <button class="chip-btn" @click="openDialog(term)">
            <span class="material-symbols-outlined">edit</span>编辑
          </button>
          <button class="chip-btn danger" @click="remove(term)">
            <span class="material-symbols-outlined">delete</span>删除
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <span class="material-symbols-outlined">kitchen</span>
      <p>暂无出餐机</p>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showDialog" class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3>{{ editing ? '编辑出餐机' : '新增出餐机' }}</h3>
          <button class="btn-icon" @click="showDialog = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>机码</label>
            <input v-model="form.code" placeholder="如 01，唯一访问地址由机码生成" />
          </div>
          <div class="form-group">
            <label>名称</label>
            <input v-model="form.name" placeholder="如 出餐机01" />
          </div>
          <div class="form-group">
            <label>角色</label>
            <div class="select-wrap">
              <select v-model="form.role">
                <option value="user">普通（按显示分类过滤）</option>
                <option value="admin">管理员（默认看全部出餐）</option>
              </select>
            </div>
          </div>
          <div v-if="form.role !== 'admin'" class="form-group">
            <label>显示分类</label>
            <div class="multi-cats">
              <label v-for="c in categories" :key="c.id" class="cat-option" :class="{ checked: form.categoryIds.includes(c.id) }">
                <input type="checkbox" :value="c.id" v-model="form.categoryIds" />
                <span class="material-symbols-outlined">{{ form.categoryIds.includes(c.id) ? 'check_box' : 'check_box_outline_blank' }}</span>
                {{ c.name }}
              </label>
            </div>
          </div>
          <div v-if="editing" class="form-group">
            <label>状态</label>
            <div class="select-wrap">
              <select v-model="form.status">
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </div>
          </div>
          <p v-if="editing" class="url-hint">唯一访问地址：{{ terminalUrl({ token: form.token }) }}<br />更改机码将改变此地址。</p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showDialog = false">取消</button>
          <button class="btn-primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const terminals = ref<any[]>([])
const categories = ref<any[]>([])

const showDialog = ref(false)
const editing = ref(false)
const editId = ref('')
const form = ref({ code: '', name: '', role: 'user', categoryIds: [] as string[], status: 'active', token: '' })

function terminalUrl(t: any) {
  return t?.token ? `${location.origin}/k/${t.token}` : '-'
}

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
    ? { code: term.code || '', name: term.name, role: term.role || 'user', categoryIds: term.categoryIds || [], status: term.status || 'active', token: term.token || '' }
    : { code: '', name: '', role: 'user', categoryIds: [], status: 'active', token: '' }
  showDialog.value = true
}

async function save() {
  if (form.value.role === 'admin') form.value.categoryIds = []
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
  const data = await res.json()
  showDialog.value = false
  fetchTerminals()
  if (!editing.value) {
    alert(`出餐机已创建！唯一访问地址：\n${terminalUrl(data)}\n\n请复制保存。`)
  }
}

async function remove(term: any) {
  if (!confirm(`确认删除出餐机「${term.name || term.code}」？`)) return
  const res = await fetch(`/api/admin/kitchen-terminals/${term.id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    return alert('删除失败：' + (err.message || err.error || res.statusText))
  }
  fetchTerminals()
}

async function toggleStatus(term: any) {
  const next = term.status === 'active' ? 'inactive' : 'active'
  const res = await fetch(`/api/admin/kitchen-terminals/${term.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: next }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    return alert('操作失败：' + (err.message || err.error || res.statusText))
  }
  fetchTerminals()
}

async function copyUrl(term: any) {
  const url = terminalUrl(term)
  if (!url || url === '-') return alert('暂无唯一访问地址')
  try {
    await navigator.clipboard.writeText(url)
    alert('已复制唯一访问地址：' + url)
  } catch {
    alert('唯一访问地址：' + url)
  }
}

onMounted(() => {
  fetchTerminals()
  fetchCategories()
})
</script>

<style scoped>
.kitchen-terminals-page { max-width: none; }

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

/* Grid */
.terminals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.terminal-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  padding: 16px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.15s;
}
.terminal-card:hover { border-color: #ffd9bd; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

.terminal-head { display: flex; align-items: center; gap: 12px; }
.terminal-avatar {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.terminal-avatar .material-symbols-outlined { font-size: 22px; }
.terminal-avatar.active { background: rgba(217, 119, 6, 0.15); color: #d97706; }
.terminal-avatar.inactive { background: var(--surface-container-low); color: var(--text-disabled); }
.terminal-info { flex: 1; min-width: 0; }
.terminal-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.terminal-name { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--on-surface); }
.role-tag { padding: 1px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; }
.role-tag.admin { background: rgba(217, 119, 6, 0.15); color: #d97706; }
.role-tag.user { background: rgba(59, 130, 246, 0.15); color: var(--info); }
.status-tag { padding: 1px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; }
.status-tag.on { background: rgba(74, 173, 78, 0.15); color: #4ade80; }
.status-tag.off { background: var(--surface-container-low); color: var(--text-disabled); }
.terminal-meta { display: flex; gap: 10px; margin-top: 4px; }
.meta-item { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; color: var(--on-surface-variant); }
.meta-item .material-symbols-outlined { font-size: 13px; }

.terminal-cats { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: var(--surface-container-low); border-radius: 10px; }
.cats-label { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-disabled); }
.cats-label .material-symbols-outlined { font-size: 14px; }
.cat-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
.cat-tag {
  padding: 2px 8px; border-radius: 9999px;
  background: var(--primary-soft); color: #ff6b00; font-size: 12px;
}
.empty-text { color: var(--text-disabled); }

.terminal-url { display: flex; flex-direction: column; gap: 2px; }
.url-label { font-size: 11px; color: var(--text-disabled); }
.mono-url { font-family: monospace; font-size: 11px; color: var(--on-surface-variant); word-break: break-all; }

.terminal-actions { display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--divider); padding-top: 12px; }
.chip-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border: 1px solid var(--border); border-radius: 20px;
  background: var(--surface); color: var(--on-surface-variant);
  font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.chip-btn .material-symbols-outlined { font-size: 15px; }
.chip-btn:hover { border-color: #ff6b00; color: #ff6b00; background: var(--primary-soft); }
.chip-btn.danger:hover { border-color: var(--error); color: #f74e22; background: rgb(255 76 55 / 16%); }
.chip-btn.status-toggle.on { border-color: #4ade80; color: #4ade80; background: rgba(74, 173, 78, 0.15); }
.chip-btn.status-toggle.off:hover { border-color: #d97706; color: #d97706; background: rgba(217, 119, 6, 0.15); }

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
.modal-sm { max-width: 440px; }
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
.multi-cats { display: flex; flex-wrap: wrap; gap: 8px; }
.cat-option {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  padding: 6px 12px; border: 1px solid var(--border); border-radius: 20px;
  font-size: 13px; color: var(--on-surface-variant); transition: all 0.15s;
}
.cat-option input { display: none; }
.cat-option .material-symbols-outlined { font-size: 16px; }
.cat-option.checked { border-color: #ff6b00; color: #ff6b00; background: var(--primary-soft); }
.url-hint { font-size: 12px; color: var(--on-surface-variant); margin: 8px 0 0; line-height: 1.6; }

/* Responsive */
@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .terminals-grid { grid-template-columns: 1fr; }
}
</style>
