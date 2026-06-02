import { reactive } from 'vue'

interface UserInfo {
  name: string
  initial: string
}

const user = reactive<UserInfo>({
  name: '都市烟火暖人心',
  initial: 'D',
})

export function useUser() {
  return user
}
