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
})
