/** 金额与数值格式化 */

export function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/** 千分位 + 最多两位小数 */
export function formatNumber(v: number): string {
  return round2(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/** 带货币符号的金额显示 */
export function formatMoney(v: number, currency: string): string {
  return `${currency}${formatNumber(v)}`
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return String(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function todayString(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}
