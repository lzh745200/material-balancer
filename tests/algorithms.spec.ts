import { describe, expect, it } from 'vitest'
import {
  computeStats,
  distribute,
  expandUnits,
  greedyAssign,
  mulberry32,
  optimizeAssignment,
  randomAssign
} from '@/algorithms'
import type { Material, Person, Unit } from '@shared/types'
import { MAX_UNITS } from '@shared/types'

function mkMaterials(prices: number[], namePrefix = '物资'): Material[] {
  return prices.map((p, i) => ({ id: `m${i + 1}`, name: `${namePrefix}${i + 1}`, price: p, quantity: 1 }))
}
function mkPeople(n: number): Person[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `人员${i + 1}` }))
}
function totalsOf(assignment: Record<string, string>, units: Unit[], people: Person[]): number[] {
  return people.map(
    (p) =>
      units
        .filter((u) => assignment[u.unitId] === p.id)
        .reduce((acc, u) => acc + u.price, 0)
  )
}

describe('expandUnits 物资拆分', () => {
  it('数量 > 1 的物资按件拆分，unitId 符合规则', () => {
    const materials: Material[] = [
      { id: 'a', name: '笔记本', price: 5, quantity: 3 },
      { id: 'b', name: '钢笔', price: 20, quantity: 1 }
    ]
    const units = expandUnits(materials)
    expect(units).toHaveLength(4)
    expect(units.map((u) => u.unitId)).toEqual(['a#1', 'a#2', 'a#3', 'b#1'])
    expect(units[0]).toMatchObject({ name: '笔记本', price: 5, materialId: 'a' })
  })

  it(`总件数超过 ${MAX_UNITS} 时抛出异常`, () => {
    const materials: Material[] = [{ id: 'a', name: '沙子', price: 0.1, quantity: MAX_UNITS + 1 }]
    expect(() => expandUnits(materials)).toThrow(/超过上限/)
  })

  it('数量 0 / 负数 / 小数 / NaN 一律归一化为至少 1 件', () => {
    const materials: Material[] = [
      { id: 'a', name: '零', price: 1, quantity: 0 },
      { id: 'b', name: '负', price: 1, quantity: -3 },
      { id: 'c', name: '小数', price: 1, quantity: 2.5 },
      { id: 'd', name: '非数', price: 1, quantity: Number.NaN }
    ]
    const units = expandUnits(materials)
    // 0/负/NaN → 1 件；2.5 → 向下取整 2 件
    expect(units.map((u) => u.unitId)).toEqual(['a#1', 'b#1', 'c#1', 'c#2', 'd#1'])
  })
})

describe('greedyAssign 贪心 LPT', () => {
  it('经典用例 [6,5,4,3,2,1] 三人均分，每人总价值 7', () => {
    const units = expandUnits(mkMaterials([6, 5, 4, 3, 2, 1]))
    const people = mkPeople(3)
    const assignment = greedyAssign(units, people.map((p) => p.id))
    expect(totalsOf(assignment, units, people)).toEqual([7, 7, 7])
  })

  it('无人员或无物资时返回空分配', () => {
    expect(greedyAssign([], [])).toEqual({})
    const units = expandUnits(mkMaterials([1, 2]))
    expect(greedyAssign(units, [])).toEqual({})
  })

  it('同价物资按名称、unitId 稳定排序（并列决胜）', () => {
    const units: Unit[] = [
      { unitId: 'b#1', materialId: 'b', name: '钢笔', price: 5 },
      { unitId: 'a#2', materialId: 'a', name: '笔记本', price: 5 },
      { unitId: 'a#1', materialId: 'a', name: '笔记本', price: 5 }
    ]
    const ids = ['p1', 'p2', 'p3']
    const assignment = greedyAssign(units, ids)
    // 同价 5：笔记本(a#1) → p1、笔记本(a#2) → p2、钢笔(b#1) → p3
    expect(assignment).toEqual({ 'a#1': 'p1', 'a#2': 'p2', 'b#1': 'p3' })
    // 两次运行顺序一致
    expect(greedyAssign([...units].reverse(), ids)).toEqual(assignment)
  })
})

describe('optimizeAssignment 局部优化', () => {
  it('能通过交换消除贪心遗留的差距：[3,3,2,2,2] 两人', () => {
    const units = expandUnits(mkMaterials([3, 3, 2, 2, 2]))
    const people = mkPeople(2)
    const ids = people.map((p) => p.id)
    const greedy = greedyAssign(units, ids)
    expect(totalsOf(greedy, units, people)).toEqual([7, 5])

    const opt = optimizeAssignment(greedy, units, ids)
    expect(opt.improved).toBe(true)
    expect(totalsOf(opt.assignment, units, people)).toEqual([6, 6])
  })

  it('已经最优时不再改动', () => {
    const units = expandUnits(mkMaterials([6, 5, 4, 3, 2, 1]))
    const ids = mkPeople(3).map((p) => p.id)
    const greedy = greedyAssign(units, ids)
    const opt = optimizeAssignment(greedy, units, ids)
    expect(opt.improved).toBe(false)
    expect(opt.assignment).toEqual(greedy)
  })

  it('指向已删除人员的脏输入被忽略，不影响优化', () => {
    const units = expandUnits(mkMaterials([3, 3, 2, 2, 2]))
    const ids = mkPeople(2).map((p) => p.id)
    const dirty: Record<string, string> = { 'm1#1': 'ghost', 'm2#1': ids[0] }
    const opt = optimizeAssignment(dirty, units, ids)
    // ghost 指向的件被忽略，其余仍可优化且不抛异常
    expect(opt.assignment['m1#1']).toBe('ghost')
    for (const [unitId, personId] of Object.entries(opt.assignment)) {
      if (personId !== 'ghost') expect(ids).toContain(personId)
    }
  })

  it('500 件规模下两次运行结果完全一致（确定性预算）', () => {
    const rng = mulberry32(7)
    const materials = mkMaterials(Array.from({ length: 500 }, () => Math.floor(rng() * 1000) + 1))
    const units = expandUnits(materials)
    const ids = mkPeople(50).map((p) => p.id)
    const greedy = greedyAssign(units, ids)
    const a = optimizeAssignment(greedy, units, ids).assignment
    const b = optimizeAssignment(greedy, units, ids).assignment
    expect(a).toEqual(b)
  })
})

describe('randomAssign 随机模式', () => {
  it('固定种子时结果可复现，且差距不劣于纯贪心', () => {
    const materials = mkMaterials(Array.from({ length: 40 }, (_, i) => (i * 7) % 23 + 1))
    const units = expandUnits(materials)
    const ids = mkPeople(5).map((p) => p.id)

    const a = randomAssign(units, ids, { seed: 42, restarts: 5 })
    const b = randomAssign(units, ids, { seed: 42, restarts: 5 })
    expect(a).toEqual(b)

    const greedyDiff = Math.max(...totalsOf(greedyAssign(units, ids), units, mkPeople(5))) -
      Math.min(...totalsOf(greedyAssign(units, ids), units, mkPeople(5)))
    const randomDiff = Math.max(...totalsOf(a, units, mkPeople(5))) -
      Math.min(...totalsOf(a, units, mkPeople(5)))
    expect(randomDiff).toBeLessThanOrEqual(greedyDiff)
  })
})

describe('computeStats 统计', () => {
  it('平均 / 最高 / 最低 / 差值 / 标准差', () => {
    const units = expandUnits(mkMaterials([3, 1]))
    const people = mkPeople(2)
    const assignment = { 'm1#1': 'p1', 'm2#1': 'p2' }
    const stats = computeStats(assignment, units, people.map((p) => p.id))
    expect(stats.totals.map((t) => t.total)).toEqual([3, 1])
    expect(stats.totals.map((t) => t.count)).toEqual([1, 1])
    expect(stats.avg).toBe(2)
    expect(stats.max).toBe(3)
    expect(stats.min).toBe(1)
    expect(stats.diff).toBe(2)
    expect(stats.std).toBe(1)
  })

  it('忽略指向已删除人员的分配记录', () => {
    const units = expandUnits(mkMaterials([5]))
    const stats = computeStats({ 'm1#1': 'ghost' }, units, ['p1'])
    expect(stats.totals).toEqual([{ personId: 'p1', total: 0, count: 0 }])
    expect(stats.diff).toBe(0)
  })

  it('统计未分配件数与覆盖率', () => {
    const units = expandUnits(mkMaterials([5, 4, 3]))
    const ids = mkPeople(2).map((p) => p.id)
    // m3 未分配
    const stats = computeStats({ 'm1#1': 'p1', 'm2#1': 'p2' }, units, ids)
    expect(stats.unassignedCount).toBe(1)
    expect(stats.coverage).toBeCloseTo(2 / 3)
    // 全部分配
    const full = computeStats({ 'm1#1': 'p1', 'm2#1': 'p2', 'm3#1': 'p1' }, units, ids)
    expect(full.unassignedCount).toBe(0)
    expect(full.coverage).toBe(1)
    // 指向已删除人员的件也算未分配
    const ghost = computeStats({ 'm1#1': 'p1', 'm2#1': 'ghost', 'm3#1': 'ghost' }, units, ids)
    expect(ghost.unassignedCount).toBe(2)
    expect(ghost.coverage).toBeCloseTo(1 / 3)
  })
})

describe('distribute 端到端', () => {
  it('无人员或无物资时返回空结果', () => {
    const r = distribute(mkMaterials([1, 2, 3]), [], 'optimized')
    expect(r.assignment).toEqual({})
    expect(r.stats.avg).toBe(0)
  })

  it('同一输入两次运行结果完全一致（确定性）', () => {
    const materials = mkMaterials(Array.from({ length: 80 }, (_, i) => ((i * 37) % 91) + 1))
    const people = mkPeople(9)
    const a = distribute(materials, people, 'optimized').assignment
    const b = distribute(materials, people, 'optimized').assignment
    expect(a).toEqual(b)
  })

  it('验收标准 3：100 种物资 / 20 人，价值分布均匀时最大差值 ≤ 平均值的 5%', () => {
    const rng = mulberry32(20260829)
    const materials = mkMaterials(Array.from({ length: 100 }, () => Math.floor(rng() * 100) + 1))
    const people = mkPeople(20)
    const { units, stats } = distribute(materials, people, 'optimized')
    expect(units).toHaveLength(100)
    expect(stats.diff).toBeLessThanOrEqual(stats.avg * 0.05)
  })

  it('性能与均衡：500 件物资 / 50 人，3 秒内完成且差值 ≤ 平均值 5%', () => {
    const rng = mulberry32(7)
    const materials = mkMaterials(Array.from({ length: 500 }, () => Math.floor(rng() * 1000) + 1))
    const people = mkPeople(50)
    const start = Date.now()
    const { stats } = distribute(materials, people, 'optimized')
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(3000)
    expect(stats.diff).toBeLessThanOrEqual(stats.avg * 0.05)
  })
})
