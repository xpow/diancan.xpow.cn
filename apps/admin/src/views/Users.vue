<template>
  <div class="users-page">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
    </div>

    <DataTable :value="users" striped-rows>
      <Column field="name" header="用户名" />
      <Column field="phone" header="手机号" />
      <Column field="avatar" header="头像">
        <template #body="{ data }">
          <img v-if="data.avatar" :src="data.avatar" class="avatar" />
          <span v-else class="no-avatar">-</span>
        </template>
      </Column>
      <Column field="status" header="状态" />
      <Column field="createdAt" header="注册时间">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleString('zh-CN') }}
        </template>
      </Column>
      <Column header="操作" style="width:120px">
        <template #body="{ data }">
          <Button icon="pi pi-trash" severity="danger" text @click="deleteUser(data.id)" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'

interface User {
  id: string
  name: string
  phone: string
  avatar: string
  status: string
  createdAt: string
}

const users = ref<User[]>([])

async function fetchUsers() {
  const res = await fetch('/api/users')
  users.value = await res.json()
}

async function deleteUser(id: string) {
  await fetch(`/api/users/${id}`, { method: 'DELETE' })
  fetchUsers()
}

onMounted(fetchUsers)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.no-avatar { color: var(--text-disabled); }
</style>
