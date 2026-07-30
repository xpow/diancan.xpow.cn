const TOKEN_KEY = 'kiosk-device-token'
const UUID_KEY = 'kiosk-device-uuid'
const REFRESH_BUFFER_MINUTES = 10
let tokenPromise: Promise<void> | null = null

function getOrCreateUUID(): string {
  let uuid = localStorage.getItem(UUID_KEY)
  if (!uuid) {
    uuid = crypto.randomUUID()
    localStorage.setItem(UUID_KEY, uuid)
  }
  return uuid
}

export function getDeviceUUID(): string {
  return getOrCreateUUID()
}

export function getDeviceToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setDeviceToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearDeviceToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function decodeToken(token: string): { exp: number } | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

function isTokenExpiringSoon(): boolean {
  const token = getDeviceToken()
  if (!token) return true
  const payload = decodeToken(token)
  if (!payload) return true
  return payload.exp * 1000 - Date.now() < REFRESH_BUFFER_MINUTES * 60 * 1000
}

/** 确保有效 token 存在，没有或用 SN 自动换取，或在过期前主动续期 */
export async function ensureToken(): Promise<void> {
  const sn = localStorage.getItem('kiosk-device-sn')
  if (!sn) throw new Error('设备未认证')
  // token 还有效且未接近过期 → 跳过
  if (getDeviceToken() && !isTokenExpiringSoon()) return
  // 防止并发重复请求
  if (!tokenPromise) {
    tokenPromise = (async () => {
      const res = await fetch('/api/system/device-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sn, uuid: getOrCreateUUID(), userAgent: navigator.userAgent }),
      })
      if (!res.ok) {
        clearDeviceToken()
        localStorage.removeItem('kiosk-device-sn')
        throw new Error('设备码已失效')
      }
      const data = await res.json()
      setDeviceToken(data.token)
    })()
  }
  await tokenPromise
  tokenPromise = null
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // 自动补/续 token
  await ensureToken().catch(() => {})
  const token = getDeviceToken()
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  // content-type 默认 JSON（除非明确覆盖，如 multipart）
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  let res = await fetch(url, { ...options, headers })
  // 401 → 清除过期 token，如有 SN 则重试一次
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}))
    if (data.message?.includes('设备已下线')) {
      clearDeviceToken()
      localStorage.removeItem('kiosk-device-sn')
      return res
    }
    clearDeviceToken()
    // 还有 SN 则重试（重新换取 token）
    if (localStorage.getItem('kiosk-device-sn')) {
      tokenPromise = null
      await ensureToken().catch(() => {})
      const newToken = getDeviceToken()
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`)
        res = await fetch(url, { ...options, headers })
      }
    }
  }
  return res
}

/** 封装 GET 请求 */
export function apiGet<T = any>(url: string): Promise<T> {
  return apiFetch(url).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: '请求失败' }))
      throw new Error(err.message || '请求失败')
    }
    return res.json() as Promise<T>
  })
}

/** 封装 POST 请求 */
export function apiPost<T = any>(url: string, body?: any): Promise<T> {
  return apiFetch(url, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: '请求失败' }))
      throw new Error(err.message || '请求失败')
    }
    return res.json() as Promise<T>
  })
}
