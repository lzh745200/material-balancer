import type { Material, Person, Strategy, Unit } from '@shared/types'
import { expandUnits } from './expand'
import { greedyAssign } from './greedy'
import { optimizeAssignment } from './optimize'
import { randomAssign } from './random'
import { computeStats, type GlobalStats } from './stats'

export { expandUnits } from './expand'
export { greedyAssign } from './greedy'
export { optimizeAssignment, type OptimizeOptions, type OptimizeResult } from './optimize'
export { randomAssign, mulberry32 } from './random'
export { computeStats, type GlobalStats, type PersonStat } from './stats'

/** 自动分配的生成策略（不含 manual，manual 只来自用户手动调整） */
export type AutoStrategy = Exclude<Strategy, 'manual'>

export interface DistributeResult {
  /** unitId -> personId */
  assignment: Record<string, string>
  /** 拆分后的独立件（含未分配的） */
  units: Unit[]
  stats: GlobalStats
}

/**
 * 自动分配入口。
 * - greedy：贪心均衡（LPT）
 * - optimized：贪心 + 局部搜索优化（推荐，差距最小）
 * - random：随机模式（抽奖式，多次随机重启取最优）
 *
 * 物资总件数超过上限时抛出异常；无人员或无物资时返回空分配。
 */
export function distribute(
  materials: Material[],
  people: Person[],
  strategy: AutoStrategy
): DistributeResult {
  const units = expandUnits(materials)
  const personIds = people.map((p) => p.id)

  let assignment: Record<string, string> = {}
  if (personIds.length > 0 && units.length > 0) {
    switch (strategy) {
      case 'greedy':
        assignment = greedyAssign(units, personIds)
        break
      case 'optimized':
        assignment = optimizeAssignment(greedyAssign(units, personIds), units, personIds).assignment
        break
      case 'random':
        assignment = randomAssign(units, personIds)
        break
    }
  }
  return { assignment, units, stats: computeStats(assignment, units, personIds) }
}
