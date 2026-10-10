/** 退菜/取消原因：固定字母码，展示用「退A」；弹窗用完整文案 */
export const VOID_REASONS = [
  { code: 'A', label: '等待时间过长，客户不要了' },
  { code: 'B', label: '客户有事不要了' },
  { code: 'C', label: '测试订单' },
  { code: 'D', label: '菜品不足，无法出餐' },
  { code: 'E', label: '菜单下错了，重新下单' },
] as const

export type VoidReasonCode = (typeof VOID_REASONS)[number]['code']

const byCode = new Map<string, string>(VOID_REASONS.map((r) => [r.code, r.label]))
const byLabel = new Map<string, string>(VOID_REASONS.map((r) => [r.label, r.code]))

/** 归一为字母码；未知返回空串 */
export function voidReasonCode(stored?: string | null): string {
  if (!stored) return ''
  const t = String(stored).trim()
  if (/^[A-Z]$/i.test(t)) return t.toUpperCase()
  // 兼容旧数据「A|原文」或「A. 原文」
  const m = t.match(/^([A-Z])\s*[|.．、]/i)
  if (m) return m[1]!.toUpperCase()
  return byLabel.get(t) || ''
}

export function voidReasonLabel(stored?: string | null): string {
  if (!stored) return ''
  const code = voidReasonCode(stored)
  if (code && byCode.has(code)) return byCode.get(code)!
  return String(stored)
}

/** 顾客/列表短标：退A；未知旧数据回落「已退菜」 */
export function formatVoidTag(stored?: string | null): string {
  const code = voidReasonCode(stored)
  return code ? `退${code}` : '已退菜'
}

/** 订单级取消原因展示：有码则「退A 文案」，否则原文 */
export function formatOrderCancelReason(stored?: string | null): string {
  if (!stored) return ''
  const code = voidReasonCode(stored)
  if (code) return `退${code} ${voidReasonLabel(stored)}`
  return String(stored)
}

/** 弹窗选项展示：A. 等待时间过长… */
export function voidReasonOptionText(code: string, label: string): string {
  return `${code}. ${label}`
}