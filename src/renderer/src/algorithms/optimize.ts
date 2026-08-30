import type { Unit } from '@shared/types'

export interface OptimizeOptions {
  /** 最大迭代轮数，默认 100 */
  maxPasses?: number
  /**
   * 候选操作评估次数上限（跨轮累计），默认 2_000_000。
   * 这是主要的确定性预算：同一输入总是评估同样多的候选，
   * 保证结果与机器速度无关。
   */
  maxOps?: number
  /**
   * 应急止损（毫秒），默认 8000。仅在极端规模下可能命中，
   * 命中时结果不再保证确定（会输出 console.warn）。
   */
  timeBudgetMs?: number
  /** 锁定的件：不作为移动 / 交换候选（手动锁定重优化用） */
  locked?: ReadonlySet<string>
}

export interface OptimizeResult {
  assignment: Record<string, string>
  /** 实际执行的轮数 */
  passes: number
  /** 是否发生了改进 */
  improved: boolean
}

/** 单次优化操作描述 */
interface Op {
  gain: number
  /** 'move'：unit 移到 toPerson；'swap'：交换 unitA 与 unitB（两人各一件） */
  kind: 'move' | 'swap'
  unitId?: string
  toPerson?: string
  unitA?: string
  unitB?: string
}

const EPS = 1e-9

/**
 * 局部搜索优化：在现有分配基础上，通过「单件移动」与「两件交换」
 * 逐步缩小（最高总价值 - 最低总价值）。
 *
 * 每一轮枚举所有候选操作，取改进量最大者执行（best-improvement），
 * 无改进或达到轮数 / 操作数预算即停止。确定性：按固定顺序枚举、
 * 并列取先者，预算按评估次数计数，与机器速度无关。
 */
export function optimizeAssignment(
  assignment: Record<string, string>,
  units: Unit[],
  personIds: string[],
  options: OptimizeOptions = {}
): OptimizeResult {
  const maxPasses = options.maxPasses ?? 100
  const maxOps = options.maxOps ?? 2_000_000
  const work: Record<string, string> = { ...assignment }
  const result: OptimizeResult = { assignment: work, passes: 0, improved: false }

  if (personIds.length < 2 || units.length === 0) return result

  const unitsById = new Map(units.map((u) => [u.unitId, u]))
  const totalOf = new Map<string, number>(personIds.map((id) => [id, 0]))
  const ownedBy = new Map<string, string[]>() // personId -> unitId[]（按传入顺序）
  for (const id of personIds) ownedBy.set(id, [])
  for (const u of units) {
    const owner = work[u.unitId]
    if (!owner || !totalOf.has(owner)) continue // 忽略指向已删除人员的脏数据
    ownedBy.get(owner)!.push(u.unitId)
    totalOf.set(owner, totalOf.get(owner)! + u.price)
  }

  /** 计算当前差值（最高 - 最低） */
  const diffOf = (): number => {
    let max = -Infinity
    let min = Infinity
    for (const id of personIds) {
      const t = totalOf.get(id)!
      if (t > max) max = t
      if (t < min) min = t
    }
    return max - min
  }

  /**
   * 假设把两人（可相同）的总价值分别改为 aNew / bNew 后的差值。
   * 只有两个值变化，直接扫描一遍人员总价即可，无需复制 Map。
   */
  const diffWith = (pa: string, aNew: number, pb: string, bNew: number): number => {
    let max = -Infinity
    let min = Infinity
    for (const id of personIds) {
      const t = id === pa ? aNew : id === pb ? bNew : totalOf.get(id)!
      if (t > max) max = t
      if (t < min) min = t
    }
    return max - min
  }

  let ops = 0
  const outOfBudget = (): boolean => ops >= maxOps
  const locked = options.locked

  /** 枚举全部候选操作，返回改进量最大的一个（无改进返回 null） */
  const findBestOp = (): Op | null => {
    if (outOfBudget()) return null
    const curDiff = diffOf()
    let best: Op | null = null
    let bestGain = EPS

    // 单件移动：unit 从其主人移到其他人
    for (const u of units) {
      if (outOfBudget()) break
      if (locked?.has(u.unitId)) continue
      const owner = work[u.unitId]
      if (!owner || !totalOf.has(owner)) continue
      const ownerTotal = totalOf.get(owner)!
      for (const target of personIds) {
        if (outOfBudget()) break
        if (target === owner) continue
        ops++
        const gain =
          curDiff -
          diffWith(owner, ownerTotal - u.price, target, totalOf.get(target)! + u.price)
        if (gain > bestGain) {
          bestGain = gain
          best = { gain, kind: 'move', unitId: u.unitId, toPerson: target }
        }
      }
    }

    // 两件交换：personA 的一件 与 personB 的一件互换
    swap: for (let i = 0; i < personIds.length; i++) {
      if (outOfBudget()) break
      const paId = personIds[i]
      const listA = ownedBy.get(paId)!
      for (let j = i + 1; j < personIds.length; j++) {
        if (outOfBudget()) break swap
        const pbId = personIds[j]
        const listB = ownedBy.get(pbId)!
        for (const ua of listA) {
          if (outOfBudget()) break swap
          if (locked?.has(ua)) continue
          const priceA = unitsById.get(ua)!.price
          for (const ub of listB) {
            if (outOfBudget()) break swap
            if (locked?.has(ub)) continue
            ops++
            const priceB = unitsById.get(ub)!.price
            const gain =
              curDiff -
              diffWith(
                paId,
                totalOf.get(paId)! - priceA + priceB,
                pbId,
                totalOf.get(pbId)! - priceB + priceA
              )
            if (gain > bestGain) {
              bestGain = gain
              best = { gain, kind: 'swap', unitA: ua, unitB: ub }
            }
          }
        }
      }
    }
    return best
  }

  const hardDeadline = Date.now() + (options.timeBudgetMs ?? 8000)
  while (result.passes < maxPasses) {
    if (Date.now() >= hardDeadline) {
      console.warn('[optimize] 命中应急时间止损，本次结果可能不确定')
      break
    }
    const op = findBestOp()
    if (!op) break
    if (op.kind === 'move') {
      const owner = work[op.unitId!]!
      const price = unitsById.get(op.unitId!)!.price
      const from = ownedBy.get(owner)!
      const idx = from.indexOf(op.unitId!)
      const to = ownedBy.get(op.toPerson!)!
      if (idx === -1 || !to) throw new Error('内部状态不一致：分配记录与人员映射不同步')
      from.splice(idx, 1)
      to.push(op.unitId!)
      totalOf.set(owner, totalOf.get(owner)! - price)
      totalOf.set(op.toPerson!, totalOf.get(op.toPerson!)! + price)
      work[op.unitId!] = op.toPerson!
    } else {
      const paId = work[op.unitA!]!
      const pbId = work[op.unitB!]!
      const priceA = unitsById.get(op.unitA!)!.price
      const priceB = unitsById.get(op.unitB!)!.price
      work[op.unitA!] = pbId
      work[op.unitB!] = paId
      const listA = ownedBy.get(paId)!
      const listB = ownedBy.get(pbId)!
      const idxA = listA.indexOf(op.unitA!)
      const idxB = listB.indexOf(op.unitB!)
      if (idxA === -1 || idxB === -1) throw new Error('内部状态不一致：分配记录与人员映射不同步')
      listA[idxA] = op.unitB!
      listB[idxB] = op.unitA!
      totalOf.set(paId, totalOf.get(paId)! - priceA + priceB)
      totalOf.set(pbId, totalOf.get(pbId)! - priceB + priceA)
    }
    result.passes++
    result.improved = true
  }
  return result
}
