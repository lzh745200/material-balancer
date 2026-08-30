import type { Unit } from '@shared/types'

/**
 * LPT 贪心（Longest Processing Time First）：
 * 物资按单价降序排列，依次分配给当前总价值最低的人。
 *
 * 完全确定性：同价物资按名称（中文拼音序）、再按 unitId 排序；
 * 两人当前总价值并列时，总是取人员列表中靠前者。
 * n、p 规模有限（<=5000 / 50），直接线性扫描找最低者即可，无需堆。
 */
export function greedyAssign(units: Unit[], personIds: string[]): Record<string, string> {
  const assignment: Record<string, string> = {}
  if (personIds.length === 0 || units.length === 0) return assignment

  const totals = new Map<string, number>(personIds.map((id) => [id, 0]))
  const sorted = [...units].sort(compareUnitsDesc)

  for (const u of sorted) {
    let best = personIds[0]
    for (const id of personIds) {
      if (totals.get(id)! < totals.get(best)!) best = id
    }
    assignment[u.unitId] = best
    totals.set(best, totals.get(best)! + u.price)
  }
  return assignment
}

/** 与 greedyAssign 相同的确定性排序：单价降序 → 名称 → unitId */
function compareUnitsDesc(a: Unit, b: Unit): number {
  return (
    b.price - a.price ||
    a.name.localeCompare(b.name, 'zh-Hans-CN') ||
    a.unitId.localeCompare(b.unitId)
  )
}

/**
 * 带人均上限的贪心（「允许剩余」模式）：
 * 每人分到的总价值不超过 cap，装不下的件留作未分配。
 * 仍完全确定性：排序与 greedyAssign 一致，并列时取人员列表靠前者。
 */
export function greedyAssignCapped(
  units: Unit[],
  personIds: string[],
  cap: number
): Record<string, string> {
  const assignment: Record<string, string> = {}
  if (personIds.length === 0 || units.length === 0) return assignment

  const totals = new Map<string, number>(personIds.map((id) => [id, 0]))
  const sorted = [...units].sort(compareUnitsDesc)

  for (const u of sorted) {
    let best: string | null = null
    for (const id of personIds) {
      if (totals.get(id)! + u.price > cap + 1e-9) continue
      if (best === null || totals.get(id)! < totals.get(best)!) best = id
    }
    if (best === null) continue
    assignment[u.unitId] = best
    totals.set(best, totals.get(best)! + u.price)
  }
  return assignment
}
