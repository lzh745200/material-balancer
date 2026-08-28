import type { Unit } from '@shared/types'
import { greedyAssign } from './greedy'
import { optimizeAssignment } from './optimize'

/** mulberry32 伪随机数生成器（0 < seed <= 2^32），可注入固定种子以便测试 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface RandomOptions {
  /** 随机重启次数，默认 24 */
  restarts?: number
  /** 固定随机种子（测试用）；缺省时使用 Math.random，每次结果不同 */
  seed?: number
}

/**
 * 随机模式（抽奖式）：多次随机打乱物资顺序后贪心 + 局部优化，
 * 取差值最小的结果。在保证均衡的前提下引入随机性。
 */
export function randomAssign(
  units: Unit[],
  personIds: string[],
  options: RandomOptions = {}
): Record<string, string> {
  const restarts = options.restarts ?? 24
  if (personIds.length === 0 || units.length === 0) return {}
  const rng = options.seed === undefined ? Math.random : mulberry32(options.seed)

  const shuffled = (): Unit[] => {
    const arr = [...units]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  let best = greedyAssign(units, personIds)
  let bestDiff = diffOf(best)
  for (let r = 0; r < restarts; r++) {
    const cand = optimizeAssignment(greedyAssign(shuffled(), personIds), units, personIds, {
      maxPasses: 30,
      timeBudgetMs: 300
    }).assignment
    const d = diffOf(cand)
    if (d < bestDiff - 1e-12) {
      bestDiff = d
      best = cand
    }
  }
  return best

  function diffOf(a: Record<string, string>): number {
    if (personIds.length < 2) return 0
    const totals = new Map(personIds.map((id) => [id, 0]))
    for (const u of units) {
      const p = a[u.unitId]
      if (p && totals.has(p)) totals.set(p, totals.get(p)! + u.price)
    }
    let max = -Infinity
    let min = Infinity
    for (const id of personIds) {
      const t = totals.get(id)!
      if (t > max) max = t
      if (t < min) min = t
    }
    return max - min
  }
}
