const TOKEN_KEY = 'kiosk-device-token'
const UUID_KEY = 'kiosk-device-uuid'
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

/** 确保 token 存在，没有则用 SN 自动换取 */
export async function ensureToken(): Promise<void> {
  if (getDeviceToken()) return
  const sn = localStorage.getItem('kiosk-device-sn')
  if (!sn) throw new Error('设备未认证')
  // 防止并发重复请求
  if (!tokenPromise) {
    tokenPromise = (async () => {
      const res = await fetch('/api/system/device-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sn, uuid: getOrCreateUUID(), userAgent: navigator.userAgent }),
      })
      if (!res.ok) {
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
  // 自动补 token
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
  const res = await fetch(url, { ...options, headers })
  // 401 → token 失效，不清除 SN 以便 ensureToken 自动续期
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}))
    if (data.message === '认证令牌无效或已过期') {
      clearDeviceToken()
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
