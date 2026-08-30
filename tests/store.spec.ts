import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectStore } from '@/stores/project'

/**
 * Pinia store 行为测试（此前 structuredClone 无法拷贝响应式 Proxy 的
 * 回归缺陷就是靠这类测试锁住的）。
 */
beforeEach(() => {
  setActivePinia(createPinia())
})

describe('物资 / 人员管理', () => {
  it('添加物资并更新合计', () => {
    const store = useProjectStore()
    store.addMaterial('笔记本电脑', 5000, 1)
    store.addMaterial('钢笔', 3.5, 2)
    expect(store.materials).toHaveLength(2)
    expect(store.unitCount).toBe(3)
    expect(store.totalValue).toBe(5007)
  })

  it('撤销 / 重做', () => {
    const store = useProjectStore()
    store.addMaterial('A', 1, 1)
    expect(store.canUndo).toBe(true)
    store.undo()
    expect(store.materials).toHaveLength(0)
    expect(store.canRedo).toBe(true)
    store.redo()
    expect(store.materials).toHaveLength(1)
  })

  it('编辑、删除、排序物资', () => {
    const store = useProjectStore()
    store.addMaterial('A', 1, 1)
    store.addMaterial('B', 2, 1)
    const idB = store.materials[1].id
    store.moveMaterial(idB, -1)
    expect(store.materials[0].name).toBe('B')
    store.updateMaterial(idB, { price: 9 })
    expect(store.materials[0].price).toBe(9)
    store.removeMaterial(idB)
    expect(store.materials).toHaveLength(1)
  })

  it('人员添加 / 改名 / 删除 / 去重导入', () => {
    const store = useProjectStore()
    store.addPerson('张三')
    store.addImportedPeople(['张三', '李四'])
    expect(store.people.map((p) => p.name)).toEqual(['张三', '李四'])
    store.renamePerson(store.people[0].id, '张三丰')
    expect(store.people[0].name).toBe('张三丰')
    store.removePerson(store.people[0].id)
    expect(store.people).toHaveLength(1)
  })

  it('人员重名会被拒绝（手动添加与重命名一致）', () => {
    const store = useProjectStore()
    store.addPerson('张三')
    expect(() => store.addPerson('张三')).toThrow(/同名/)
    expect(() => store.renamePerson(store.people[0].id, '张三')).not.toThrow()
    expect(() => store.addPerson('')).toThrow()
  })

  it('物资数量 / 单价非法输入被拒绝', () => {
    const store = useProjectStore()
    expect(() => store.addMaterial('', 1, 1)).toThrow(/名称/)
    expect(() => store.addMaterial('A', 0, 1)).toThrow(/单价/)
    expect(() => store.addMaterial('A', -5, 1)).toThrow(/单价/)
    expect(() => store.addMaterial('A', 1, 0)).not.toThrow() // 归一化为 1 件
    expect(store.materials[0].quantity).toBe(1)

    const id = store.materials[0].id
    expect(() => store.updateMaterial(id, { price: 0 })).toThrow(/单价/)
    expect(() => store.updateMaterial(id, { quantity: 0 })).toThrow(/数量/)
    // 单价会被规整为两位小数
    store.updateMaterial(id, { price: 3.456 })
    expect(store.materials[0].price).toBe(3.46)
  })

  it('编辑物资超过总件数上限时拒绝且不留脏状态', () => {
    const store = useProjectStore()
    store.addMaterial('A', 1, 4999)
    store.addMaterial('B', 1, 1)
    const before = store.snapshot()
    const undoCount = store.past.length
    const idA = store.materials[0].id
    expect(() => store.updateMaterial(idA, { quantity: 5000 })).toThrow(/上限/)
    // 失败后历史与状态均未变化
    expect(store.materials[0].quantity).toBe(4999)
    expect(store.past.length).toBe(undoCount)
    expect(store.snapshot()).toEqual(before)
  })

  it('小数数量统一向下取整，总价与件数口径一致', () => {
    const store = useProjectStore()
    store.addMaterial('A', 2.5, 2.9) // → 2 件
    expect(store.unitCount).toBe(2)
    expect(store.totalValue).toBe(5) // 2.5 × 2
  })
})

describe('分配方案', () => {
  it('生成方案、统计与手动调整', () => {
    const store = useProjectStore()
    store.addMaterial('A', 3, 1)
    store.addMaterial('B', 3, 1)
    store.addMaterial('C', 2, 1)
    store.addPerson('张三')
    store.addPerson('李四')

    store.generateAllocation('optimized')
    const scheme = store.activeScheme
    expect(scheme).not.toBeNull()
    expect(store.stats).not.toBeNull()
    // 总价 8、人均 4：最优只能到 5/3（差值 2），该场景物理上无法更均衡
    expect(store.stats!.diff).toBe(2)
    // 差值 2 > 平均值 4 的 10%，应触发调整建议
    expect(store.overDiffWarning).toBe(true)

    // 手动拖拽等价动作：把第一件移给另一个人
    const unitId = store.units[0].unitId
    const to = store.people[1].id
    store.moveUnit(unitId, to)
    expect(store.activeScheme!.strategy).toBe('manual')
    expect(store.activeScheme!.assignment[unitId]).toBe(to)
  })

  it('删除人员后激活方案判定为失效', () => {
    const store = useProjectStore()
    store.addMaterial('A', 5, 2)
    store.addPerson('张三')
    store.addPerson('李四')
    store.generateAllocation('greedy')
    expect(store.isStale).toBe(false)
    store.removePerson(store.people[1].id)
    expect(store.isStale).toBe(true)
  })

  it('数量调大后新件未分配，方案判定失效（回归：新增件静默漏分配）', () => {
    const store = useProjectStore()
    store.addMaterial('A', 5, 2)
    store.addPerson('张三')
    store.addPerson('李四')
    store.generateAllocation('greedy')
    expect(store.isStale).toBe(false)
    store.updateMaterial(store.materials[0].id, { quantity: 3 })
    // 新增的 m?#3 不在任何方案里
    expect(store.isStale).toBe(true)
    expect(store.unassignedCount).toBe(1)
    expect(store.stats!.unassignedCount).toBe(1)
  })

  it('数量调小后旧件引用失效，方案判定失效', () => {
    const store = useProjectStore()
    store.addMaterial('A', 5, 3)
    store.addPerson('张三')
    store.addPerson('李四')
    store.generateAllocation('greedy')
    store.updateMaterial(store.materials[0].id, { quantity: 2 })
    expect(store.isStale).toBe(true)
  })

  it('移动不存在的件（幽灵 unitId）会被忽略', () => {
    const store = useProjectStore()
    store.addMaterial('A', 5, 1)
    store.addPerson('张三')
    store.addPerson('李四')
    store.generateAllocation('greedy')
    const before = { ...store.activeScheme!.assignment }
    store.moveUnit('ghost#1', store.people[1].id)
    expect(store.activeScheme!.assignment).toEqual(before)
  })

  it('方案编号在删除中间方案后不重复', () => {
    const store = useProjectStore()
    store.addMaterial('A', 4, 1)
    store.addPerson('张三')
    store.addPerson('李四')
    store.generateAllocation('greedy')
    store.generateAllocation('greedy')
    store.generateAllocation('greedy')
    expect(store.schemes.map((s) => s.name)).toEqual(['方案1', '方案2', '方案3'])
    store.deleteScheme(store.schemes[1].id) // 删除方案2
    store.generateAllocation('greedy')
    expect(store.schemes.map((s) => s.name)).toEqual(['方案1', '方案3', '方案4'])
  })

  it('撤销跨方案上限驱逐后 activeScheme 不会悬空', () => {
    const store = useProjectStore()
    store.addMaterial('A', 4, 1)
    store.addPerson('张三')
    store.addPerson('李四')
    for (let i = 0; i < 31; i++) store.generateAllocation('greedy')
    expect(store.schemes).toHaveLength(30)
    // 回退 30 步，回到只剩最早方案的时刻之前
    for (let i = 0; i < 31; i++) store.undo()
    // activeSchemeId 若指向被驱逐的方案，应回退到最后一个现存方案而不是悬空
    if (store.activeSchemeId) {
      expect(store.schemes.some((s) => s.id === store.activeSchemeId)).toBe(true)
    }
  })

  it('方案历史：切换 / 重命名 / 删除', () => {
    const store = useProjectStore()
    store.addMaterial('A', 4, 1)
    store.addPerson('张三')
    store.addPerson('李四')
    store.generateAllocation('greedy')
    store.generateAllocation('optimized')
    expect(store.schemes).toHaveLength(2)
    const first = store.schemes[0]
    store.switchScheme(first.id)
    expect(store.activeSchemeId).toBe(first.id)
    store.renameScheme(first.id, '首选方案')
    expect(store.schemes[0].name).toBe('首选方案')
    store.deleteScheme(first.id)
    expect(store.schemes).toHaveLength(1)
    expect(store.activeSchemeId).toBe(store.schemes[0].id)
  })

  it('设置更新与项目导出/加载', () => {
    const store = useProjectStore()
    store.addMaterial('A', 2, 1)
    store.addPerson('张三')
    store.updateSettings({ title: '年会物资领取表', currency: '$', remark: '年会议' })
    const data = store.exportProject()
    expect(data.title).toBe('年会物资领取表')
    expect(data.currency).toBe('$')
    expect(data.version).toBe(1)

    const other = useProjectStore()
    other.newProject()
    other.loadProject(data, 'C:/tmp/demo.mproj')
    expect(other.materials).toHaveLength(1)
    expect(other.people).toHaveLength(1)
    expect(other.filePath).toBe('C:/tmp/demo.mproj')
    expect(other.dirty).toBe(false)
  })

  it('导出数据是深拷贝，修改导出结果不影响 store', () => {
    const store = useProjectStore()
    store.addMaterial('A', 2, 1)
    const data = store.exportProject()
    data.materials[0].name = '被篡改'
    data.materials.push({ id: 'mX', name: 'X', price: 1, quantity: 1 })
    expect(store.materials).toHaveLength(1)
    expect(store.materials[0].name).toBe('A')
  })

  it('加载畸形项目数据被归一化而不是崩溃（回归：assignment 为 null / title 缺失）', () => {
    const store = useProjectStore()
    store.loadProject(
      {
        version: 1,
        title: undefined,
        remark: null,
        currency: '',
        materials: [
          { id: 'm1', name: '正常', price: 5, quantity: 2 },
          { id: 'm2', name: '负价', price: -3, quantity: 1 },
          { id: 'm3', name: '零数量', price: 2, quantity: 0 },
          { id: '', name: '无id', price: 2, quantity: 1 }
        ],
        people: [
          { id: 'p1', name: '张三' },
          { id: 'p2', name: '' }
        ],
        schemes: [
          {
            id: 's1',
            name: '方案1',
            createdAt: '2026-01-01T00:00:00.000Z',
            strategy: 'greedy',
            assignment: null
          },
          {
            id: 's2',
            name: '方案2',
            createdAt: '2026-01-01T00:00:00.000Z',
            strategy: '未知策略',
            assignment: { 'm1#1': 'p1', 'm1#2': 'ghost', bogus: 'p1' }
          }
        ],
        activeSchemeId: 's3'
      },
      null
    )
    expect(store.title).toBe('物资分配领取表')
    expect(store.currency).toBe('¥')
    // 负价 / 空 id 物资被剔除，零数量归一化为 1 件
    expect(store.materials.map((m) => m.id)).toEqual(['m1', 'm3'])
    expect(store.materials[1].quantity).toBe(1)
    expect(store.people.map((p) => p.id)).toEqual(['p1'])
    // assignment 为 null 的方案被剔除；幽灵指向被清理
    expect(store.schemes).toHaveLength(1)
    expect(store.schemes[0].id).toBe('s2')
    expect(store.schemes[0].strategy).toBe('manual')
    expect(store.schemes[0].assignment).toEqual({ 'm1#1': 'p1' })
    // 悬空的 activeSchemeId 被清掉
    expect(store.activeSchemeId).toBeNull()
  })

  it('加载合法数据后 newProject 会重置草稿时间戳', () => {
    const store = useProjectStore()
    store.draftSavedAt = '10:00:00'
    store.newProject()
    expect(store.draftSavedAt).toBe('')
  })

  it('moveUnit 传 null 把件移出分配（未分配池）', () => {
    const store = useProjectStore()
    store.addMaterial('A', 5, 1)
    store.addPerson('张三')
    store.addPerson('李四')
    store.generateAllocation('greedy')
    const unitId = store.units[0].unitId
    expect(store.unassignedCount).toBe(0)
    store.moveUnit(unitId, null)
    expect(store.unassignedCount).toBe(1)
    expect(store.activeScheme!.strategy).toBe('manual')
    // 撤销恢复
    store.undo()
    expect(store.unassignedCount).toBe(0)
  })

  it('wouldExceedUnitLimit 按归一化件数判断', () => {
    const store = useProjectStore()
    store.addMaterial('A', 1, 4999)
    expect(store.wouldExceedUnitLimit(0)).toBe(false)
    expect(store.wouldExceedUnitLimit(1)).toBe(false)
    expect(store.wouldExceedUnitLimit(2)).toBe(true)
  })

  it('排除人员后生成方案不分给他，且不出现在统计中', () => {
    const store = useProjectStore()
    store.addMaterial('A', 3, 2)
    store.addPerson('张三')
    store.addPerson('李四')
    store.addPerson('王五')
    store.togglePersonActive(store.people[2].id)
    expect(store.people[2].active).toBe(false)
    store.generateAllocation('greedy')
    for (const owner of Object.values(store.activeAssignment)) {
      expect(owner).not.toBe(store.people[2].id)
    }
    expect(store.stats!.totals.map((t) => t.personId)).toEqual([store.people[0].id, store.people[1].id])
    // 重新打开参与开关，撤销链路可用
    store.togglePersonActive(store.people[2].id)
    expect(store.people[2].active).toBe(true)
  })

  it('全部人员被排除时生成报错', () => {
    const store = useProjectStore()
    store.addMaterial('A', 3, 1)
    store.addPerson('张三')
    store.togglePersonActive(store.people[0].id)
    expect(() => store.generateAllocation('greedy')).toThrow(/参与分配/)
  })

  it('锁定件在重新优化时保持归属', () => {
    const store = useProjectStore()
    store.addMaterial('A', 3, 1)
    store.addMaterial('B', 3, 1)
    store.addMaterial('C', 2, 3)
    store.addPerson('张三')
    store.addPerson('李四')
    store.generateAllocation('greedy')
    const unitId = store.units[0].unitId
    const owner = store.activeAssignment[unitId]
    store.toggleUnitLock(unitId)
    expect(store.activeScheme!.lockedUnits).toEqual([unitId])
    store.reoptimizeCurrent()
    expect(store.activeAssignment[unitId]).toBe(owner)
    // 解锁全部
    store.unlockAllUnits()
    expect(store.activeScheme!.lockedUnits).toBeUndefined()
  })

  it('允许剩余模式：超人均的件留在未分配池', () => {
    const store = useProjectStore()
    store.addMaterial('贵重物', 90, 1)
    store.addMaterial('小件', 1, 10)
    store.addPerson('张三')
    store.addPerson('李四')
    store.setAlgoPrefs({ allowSurplus: true })
    store.generateAllocation('greedy')
    // 总值 100，人均 50：90 元的贵重物谁拿都超限，留在池里
    expect(store.unassignedCount).toBe(1)
    // 每人不超过 50
    for (const t of store.stats!.totals) expect(t.total).toBeLessThanOrEqual(50 + 1e-9)
    // 方案如实记为 greedy
    expect(store.activeScheme!.strategy).toBe('greedy')
  })

  it('setAlgoPrefs 会钳制非法参数', () => {
    const store = useProjectStore()
    store.setAlgoPrefs({ optimizeMaxPasses: -5, randomRestarts: 999, randomSeed: 42 })
    expect(store.optimizeMaxPasses).toBe(1)
    expect(store.randomRestarts).toBe(100)
    expect(store.randomSeed).toBe(42)
    store.setAlgoPrefs({ randomSeed: null })
    expect(store.randomSeed).toBeNull()
  })
})
