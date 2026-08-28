import type { Unit } from '@shared/types'

export interface PersonStat {
  personId: string
  /** 总价值 */
  total: number
  /** 物资件数 */
  count: number
}

export interface GlobalStats {
  totals: PersonStat[]
  /** 平均价值 */
  avg: number
  /** 最高价值 */
  max: number
  /** 最低价值 */
  min: number
  /** 最大差值（最高 - 最低） */
  diff: number
  /** 总体标准差 */
  std: number
}

/**
 * 计算分配统计。assignment 中指向已删除人员的条目会被忽略；
 * 未出现在 assignment 中的 unit 视为未分配，不参与任何人的统计。
 */
export function computeStats(
  assignment: Record<string, string>,
  units: Unit[],
  personIds: string[]
): GlobalStats {
  const totals = new Map<string, PersonStat>(personIds.map((id) => [id, { personId: id, total: 0, count: 0 }]))
  for (const u of units) {
    const p = assignment[u.unitId]
    if (!p) continue
    const stat = totals.get(p)
    if (!stat) continue
    stat.total += u.price
    stat.count += 1
  }

  const list = personIds.map((id) => totals.get(id)!)
  const n = personIds.length
  if (n === 0) {
    return { totals: [], avg: 0, max: 0, min: 0, diff: 0, std: 0 }
  }
  const sum = list.reduce((acc, s) => acc + s.total, 0)
  const avg = sum / n
  const max = Math.max(...list.map((s) => s.total))
  const min = Math.min(...list.map((s) => s.total))
  const variance = list.reduce((acc, s) => acc + (s.total - avg) ** 2, 0) / n
  return {
    totals: list,
    avg,
    max,
    min,
    diff: n >= 2 ? max - min : 0,
    std: Math.sqrt(variance)
  }
}
