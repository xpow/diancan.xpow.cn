import { reactive } from 'vue'

interface UserInfo {
  id: string
  name: string
  initial: string
  phone: string
  avatar: string
}

const user = reactive<UserInfo>({
  id: 'user-01',
  name: '张三',
  initial: 'Z',
  phone: '13800001111',
  avatar: '',
})

export function useUser() {
  return user
}
