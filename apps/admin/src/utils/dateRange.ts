export type DateRangeValue = [Date | null, Date | null] | undefined

export interface DateRangePreset {
  key: string
  label: string
}

/** 销量统计默认快捷项 */
export const STATS_DATE_PRESETS: DateRangePreset[] = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '全部' },
]

export function ymdLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isLocalMidnight(d: Date) {
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0
}

/**
 * 组件内部统一半开区间 [start, endExclusive)。
 * 展示/退款 API 用闭区间 YYYY-MM-DD：
 * - 今日 [10/12 00:00, 10/13 00:00) → from=to=10/12
 * - 多日 [10/10 00:00, 10/13 00:00) → 10/10–10/12
 * quickKey 保留兼容，不再依赖它判断开闭。
 */
export function rangeToInclusiveYmd(
  range: DateRangeValue,
  _quickKey = '',
): { from: string; to: string } {
  if (!range || !range[0]) return { from: '', to: '' }
  const start = new Date(range[0])
  const from = ymdLocal(start)
  if (!range[1]) return { from, to: from }
  const end = new Date(range[1])
  // 半开区间：end 为次日 00:00 时，最后含日 = end - 1ms
  // 「全部」等若 end 为当日 23:59:59.999，直接取 end 的日历日
  const lastInclusive =
    isLocalMidnight(end) && end.getTime() > start.getTime()
      ? new Date(end.getTime() - 1)
      : end
  const to = ymdLocal(lastInclusive)
  return { from, to }
}

/** M/D 短展示（本地日历） */
export function formatInclusiveRangeLabel(range: DateRangeValue): string {
  const { from, to } = rangeToInclusiveYmd(range)
  if (!from) return ''
  const fmt = (ymd: string) => {
    const [, m, d] = ymd.split('-').map(Number)
    return `${m}/${d}`
  }
  if (from === to) return fmt(from)
  return `${fmt(from)} — ${fmt(to)}`
}
