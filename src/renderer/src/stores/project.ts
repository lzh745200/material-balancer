import { defineStore } from 'pinia'
import type {
  AllocationScheme,
  Material,
  Person,
  ProjectFile,
  Unit
} from '@shared/types'
import { MAX_UNITS } from '@shared/types'
import { validateProject, DEFAULT_TITLE } from '@shared/validate'
import {
  computeStats,
  distribute,
  expandUnits,
  greedyAssignCapped,
  optimizeAssignment,
  type AutoStrategy,
  type GlobalStats
} from '@/algorithms'
import { uid } from '@/utils/id'
import { formatDate, round2 } from '@/utils/format'

// 供既有组件从 store 模块导入默认标题
export { DEFAULT_TITLE }

const HISTORY_LIMIT = 50
const SCHEME_LIMIT = 30

interface Snapshot {
  title: string
  remark: string
  currency: string
  materials: Material[]
  people: Person[]
  schemes: AllocationScheme[]
  activeSchemeId: string | null
}

function emptySnapshot(): Snapshot {
  return {
    title: DEFAULT_TITLE,
    remark: '',
    currency: '¥',
    materials: [],
    people: [],
    schemes: [],
    activeSchemeId: null
  }
}

/** 数量归一化：取整且至少 1（与 expandUnits / shared/validate 一致） */
function normalizeQuantity(quantity: unknown): number {
  const n = Math.floor(Number(quantity))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function unitsOfMaterial(m: Material): number {
  return normalizeQuantity(m.quantity)
}

/**
 * 深拷贝纯 JSON 数据模型。
 * 注意不能用 structuredClone：入参是 Vue 响应式 Proxy，会抛 DataCloneError。
 */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * 项目主 store：物资 + 人员 + 分配方案 + 文件状态 + 撤销重做。
 * 一切可撤销的修改都先调用 pushHistory() 记录快照。
 *
 * 校验约定：add/update 系 action 对非法输入抛 Error（调用方负责提示），
 * pushHistory 一定在校验通过之后调用，失败时不产生任何状态变化。
 */
export const useProjectStore = defineStore('project', {
  state: () => ({
    filePath: null as string | null,
    dirty: false,
    ...emptySnapshot(),
    past: [] as Snapshot[],
    future: [] as Snapshot[],
    draftSavedAt: '' as string,
    /* ----- 分配偏好（会话级，不随项目文件保存） ----- */
    /** 允许剩余：每人不超过平均价值，装不下的件留作未分配 */
    allowSurplus: false,
    /** 优化策略最大轮数 */
    optimizeMaxPasses: 100,
    /** 随机模式重启次数 */
    randomRestarts: 24,
    /** 随机种子（null = 每次随机） */
    randomSeed: null as number | null,
    /** 导出 PDF 时附加页码页脚 */
    printPageNumbers: true
  }),

  getters: {
    /** 拆分后的全部独立件（数量 > 1 的物资按件展开） */
    units(state): Unit[] {
      try {
        return expandUnits(state.materials)
      } catch {
        // 超过拆分上限时按顺序截断到上限，unitTruncated 供 UI 警告
        const units: Unit[] = []
        let total = 0
        for (const m of state.materials) {
          for (let k = 1; k <= unitsOfMaterial(m); k++) {
            if (total >= MAX_UNITS) return units
            total++
            units.push({ unitId: `${m.id}#${k}`, materialId: m.id, name: m.name, price: m.price })
          }
        }
        return units
      }
    },

    /** 物资总件数是否超过拆分上限（units 将被截断展示，正常编辑守卫下不应出现） */
    unitTruncated(state): boolean {
      return state.materials.reduce((acc, m) => acc + unitsOfMaterial(m), 0) > MAX_UNITS
    },

    unitMap(): Map<string, Unit> {
      return new Map(this.units.map((u) => [u.unitId, u]))
    },

    activeScheme(state): AllocationScheme | null {
      return state.schemes.find((s) => s.id === state.activeSchemeId) ?? null
    },

    activeAssignment(): Record<string, string> {
      return this.activeScheme?.assignment ?? {}
    },

    /** 查询某人当前分到的物资件（仅统计有效指向） */
    unitsOf(): (personId: string) => Unit[] {
      const units = this.units
      const assignment = this.activeAssignment
      return (personId: string) => units.filter((u) => assignment[u.unitId] === personId)
    },

    stats(state): GlobalStats | null {
      if (!state.schemes.length || !state.people.length) return null
      // 只统计参与分配的人员：被排除者按 0 计会虚高最大差值
      const ids = state.people.filter((p) => p.active !== false).map((p) => p.id)
      if (!ids.length) return null
      return computeStats(this.activeAssignment, this.units, ids)
    },

    /** 当前方案未覆盖到的件数（未分配 或 指向已删除人员） */
    unassignedCount(state): number {
      const scheme = this.activeScheme
      if (!scheme) return 0
      const personIds = new Set(state.people.map((p) => p.id))
      return this.units.filter((u) => {
        const owner = scheme.assignment[u.unitId]
        return !owner || !personIds.has(owner)
      }).length
    },

    /**
     * 方案是否已失效：
     * 1) 引用了不存在的件或人员（删物资 / 删人 / 数量减少）；
     * 2) 没有覆盖全部现有件（数量调大后新件未进入方案）。
     * 任一情况都会导致统计与打印与实际库存不一致。
     */
    isStale(state): boolean {
      const scheme = this.activeScheme
      if (!scheme) return false
      const map = this.unitMap
      const personIds = new Set(state.people.map((p) => p.id))
      for (const u of this.units) {
        const owner = scheme.assignment[u.unitId]
        if (!owner || !personIds.has(owner)) return true
      }
      return Object.entries(scheme.assignment).some(
        ([unitId, personId]) => !map.has(unitId) || !personIds.has(personId)
      )
    },

    /** 差值超过平均值 10% 时给出调整建议 */
    overDiffWarning(): boolean {
      const stats = this.stats
      if (!stats || stats.totals.length < 2) return false
      const assigned = this.units.some((u) => this.activeAssignment[u.unitId])
      return assigned && stats.avg > 0 && stats.diff > stats.avg * 0.1
    },

    totalValue(state): number {
      return round2(state.materials.reduce((acc, m) => acc + m.price * unitsOfMaterial(m), 0))
    },

    unitCount(state): number {
      return state.materials.reduce((acc, m) => acc + unitsOfMaterial(m), 0)
    },

    canUndo(state): boolean {
      return state.past.length > 0
    },

    canRedo(state): boolean {
      return state.future.length > 0
    },

    defaultFileName(state): string {
      const safe = state.title.replace(/[\\/:*?"<>|]/g, '') || DEFAULT_TITLE
      return `${safe}-${formatDate()}`
    }
  },

  actions: {
    /* ---------- 撤销 / 重做 ---------- */

    snapshot(): Snapshot {
      return deepClone({
        title: this.title,
        remark: this.remark,
        currency: this.currency,
        materials: this.materials,
        people: this.people,
        schemes: this.schemes,
        activeSchemeId: this.activeSchemeId
      })
    },

    pushHistory(): void {
      this.past.push(this.snapshot())
      if (this.past.length > HISTORY_LIMIT) this.past.shift()
      this.future = []
    },

    restore(snap: Snapshot): void {
      const s = deepClone(snap)
      this.title = s.title
      this.remark = s.remark
      this.currency = s.currency
      this.materials = s.materials
      this.people = s.people
      this.schemes = s.schemes
      this.activeSchemeId = s.activeSchemeId
      // 撤销可能回退到方案上限驱逐前的快照，activeSchemeId 或已悬空
      if (this.activeSchemeId && !this.schemes.some((x) => x.id === this.activeSchemeId)) {
        this.activeSchemeId = this.schemes.length ? this.schemes[this.schemes.length - 1].id : null
      }
    },

    undo(): void {
      const snap = this.past.pop()
      if (!snap) return
      this.future.push(this.snapshot())
      this.restore(snap)
      this.dirty = true
    },

    redo(): void {
      const snap = this.future.pop()
      if (!snap) return
      this.past.push(this.snapshot())
      this.restore(snap)
      this.dirty = true
    },

    /* ---------- 项目文件 ---------- */

    exportProject(): ProjectFile {
      return {
        version: 1,
        title: this.title,
        remark: this.remark,
        currency: this.currency,
        materials: deepClone(this.materials),
        people: deepClone(this.people),
        schemes: deepClone(this.schemes),
        activeSchemeId: this.activeSchemeId
      }
    },

    newProject(): void {
      Object.assign(this, emptySnapshot(), { past: [], future: [], draftSavedAt: '' })
      this.filePath = null
      this.dirty = false
    },

    /**
     * 加载项目数据。接受 unknown：打开文件 / 恢复草稿的数据一律先经
     * validateProject 归一化，畸形数据不会进入状态（引用 undefined 崩溃）。
     */
    loadProject(data: unknown, filePath: string | null): void {
      const project = validateProject(data)
      if (!project) throw new Error('项目数据无效')
      this.title = project.title
      this.remark = project.remark
      this.currency = project.currency
      this.materials = project.materials
      this.people = project.people
      this.schemes = project.schemes
      this.activeSchemeId = project.activeSchemeId
      this.filePath = filePath
      this.past = []
      this.future = []
      this.dirty = false
      this.draftSavedAt = ''
    },

    markSaved(filePath: string): void {
      this.filePath = filePath
      this.dirty = false
    },

    /* ---------- 物资 ---------- */

    addMaterial(name: string, price: number, quantity: number): void {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('物资名称不能为空')
      const p = round2(Number(price))
      if (!Number.isFinite(p) || p <= 0) throw new Error('单价必须为大于 0 的数字')
      const q = normalizeQuantity(quantity)
      if (this.wouldExceedUnitLimit(q)) {
        throw new Error(`物资总件数将超过上限（${MAX_UNITS}），请减少数量`)
      }
      this.pushHistory()
      this.materials.push({ id: uid('m'), name: trimmed, price: p, quantity: q })
    },

    updateMaterial(id: string, patch: Partial<Omit<Material, 'id'>>): void {
      const m = this.materials.find((x) => x.id === id)
      if (!m) return
      if (patch.price !== undefined) {
        const p = round2(Number(patch.price))
        if (!Number.isFinite(p) || p <= 0) throw new Error('单价必须为大于 0 的数字')
      }
      let nextQty = m.quantity
      if (patch.quantity !== undefined) {
        const q = Math.floor(Number(patch.quantity))
        if (!Number.isFinite(q) || q < 1) throw new Error('数量必须为不小于 1 的整数')
        const others = this.materials.reduce(
          (acc, x) => (x.id === id ? acc : acc + unitsOfMaterial(x)),
          0
        )
        if (others + q > MAX_UNITS) {
          throw new Error(`物资总件数将超过上限（${MAX_UNITS}），请减小数量`)
        }
        nextQty = q
      }
      this.pushHistory()
      if (patch.name !== undefined && patch.name.trim()) m.name = patch.name.trim()
      if (patch.price !== undefined) m.price = round2(Number(patch.price))
      m.quantity = nextQty
    },

    removeMaterial(id: string): void {
      const idx = this.materials.findIndex((x) => x.id === id)
      if (idx === -1) return
      this.pushHistory()
      this.materials.splice(idx, 1)
    },

    moveMaterial(id: string, dir: -1 | 1): void {
      const idx = this.materials.findIndex((x) => x.id === id)
      const target = idx + dir
      if (idx === -1 || target < 0 || target >= this.materials.length) return
      this.pushHistory()
      ;[this.materials[idx], this.materials[target]] = [this.materials[target], this.materials[idx]]
    },

    addImportedMaterials(list: Material[]): void {
      if (!list.length) return
      const add = list.reduce((acc, m) => acc + unitsOfMaterial(m), 0)
      if (this.wouldExceedUnitLimit(add)) {
        throw new Error(`导入后物资总件数将超过上限（${MAX_UNITS}），请精简后再导入`)
      }
      this.pushHistory()
      this.materials.push(...list)
    },

    /* ---------- 人员 ---------- */

    addPerson(name: string): void {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('姓名不能为空')
      if (this.people.some((p) => p.name === trimmed)) {
        throw new Error(`已有同名人员「${trimmed}」`)
      }
      if (this.people.length >= 200) throw new Error('人员数量已达上限（200 人）')
      this.pushHistory()
      this.people.push({ id: uid('p'), name: trimmed })
    },

    renamePerson(id: string, name: string): void {
      const p = this.people.find((x) => x.id === id)
      const trimmed = name.trim()
      if (!p || !trimmed) throw new Error('姓名不能为空')
      if (this.people.some((x) => x.id !== id && x.name === trimmed)) {
        throw new Error(`已有同名人员「${trimmed}」`)
      }
      this.pushHistory()
      p.name = trimmed
    },

    removePerson(id: string): void {
      const idx = this.people.findIndex((x) => x.id === id)
      if (idx === -1) return
      this.pushHistory()
      this.people.splice(idx, 1)
    },

    movePerson(id: string, dir: -1 | 1): void {
      const idx = this.people.findIndex((x) => x.id === id)
      const target = idx + dir
      if (idx === -1 || target < 0 || target >= this.people.length) return
      this.pushHistory()
      ;[this.people[idx], this.people[target]] = [this.people[target], this.people[idx]]
    },

    /** 切换人员是否参与分配（排除后生成方案时不再分给他） */
    togglePersonActive(id: string): void {
      const p = this.people.find((x) => x.id === id)
      if (!p) return
      this.pushHistory()
      p.active = p.active === false
    },

    addImportedPeople(names: string[]): void {
      if (!names.length) return
      this.pushHistory()
      const existing = new Set(this.people.map((p) => p.name))
      for (const name of names) {
        if (existing.has(name)) continue
        existing.add(name)
        this.people.push({ id: uid('p'), name })
      }
    },

    /* ---------- 分配方案 ---------- */

    /** 生成新方案（自动策略）。物资超限 / 无参与人员时抛出异常，由调用方提示。 */
    generateAllocation(strategy: AutoStrategy): void {
      if (!this.materials.length) throw new Error('没有可分配的物资，请先添加或导入物资')
      // 只让 active !== false 的人参与均衡
      const participants = this.people.filter((p) => p.active !== false)
      if (!participants.length) {
        throw new Error('没有参与分配的人员，请在人员卡片上打开「参与分配」开关')
      }
      // 先计算再入历史：抛异常时不产生任何状态变化
      let assignment: Record<string, string>
      if (this.allowSurplus) {
        // 允许剩余：每人不超过人均价值，装不下的件留作未分配
        const units = expandUnits(this.materials)
        const totalValue = units.reduce((acc, u) => acc + u.price, 0)
        assignment = greedyAssignCapped(units, participants.map((p) => p.id), totalValue / participants.length)
      } else {
        assignment = distribute(this.materials, participants, strategy, {
          optimize: { maxPasses: this.optimizeMaxPasses },
          random: { restarts: this.randomRestarts, seed: this.randomSeed ?? undefined }
        }).assignment
      }
      this.pushHistory()
      // 编号取现有最大编号 + 1，删除中间方案后不会重名
      const maxNum = this.schemes.reduce((acc, s) => {
        const match = /^方案(\d+)$/.exec(s.name)
        return match ? Math.max(acc, Number(match[1])) : acc
      }, 0)
      const scheme: AllocationScheme = {
        id: uid('s'),
        name: `方案${maxNum + 1}`,
        createdAt: new Date().toISOString(),
        // 剩余模式的实际算法是带人均上限的贪心装填，如实记为 greedy
        strategy: this.allowSurplus ? 'greedy' : strategy,
        assignment
      }
      this.schemes.push(scheme)
      if (this.schemes.length > SCHEME_LIMIT) this.schemes.shift()
      this.activeSchemeId = scheme.id
    },

    /**
     * 手动调整：把一件物资移动到另一人；toPersonId 传 null 表示移出分配（未分配池）。
     * unitId 必须是当前存在的拆分件，防止幽灵引用在方案里继续存活。
     */
    moveUnit(unitId: string, toPersonId: string | null): void {
      const scheme = this.activeScheme
      if (!scheme || !unitId) return
      if (!(unitId in scheme.assignment)) return
      if (toPersonId === null) {
        this.pushHistory()
        delete scheme.assignment[unitId]
        if (scheme.strategy !== 'manual') scheme.strategy = 'manual'
        return
      }
      if (!toPersonId) return
      if (!this.unitMap.has(unitId)) return
      if (!this.people.some((p) => p.id === toPersonId)) return
      const from = scheme.assignment[unitId]
      if (!from || from === toPersonId) return
      this.pushHistory()
      scheme.assignment[unitId] = toPersonId
      if (scheme.strategy !== 'manual') scheme.strategy = 'manual'
    },

    clearActiveScheme(): void {
      const scheme = this.activeScheme
      if (!scheme) return
      this.pushHistory()
      scheme.assignment = {}
      scheme.strategy = 'manual'
    },

    /** 锁定 / 解锁一件物资：锁定件在「重新优化」时保持归属不变 */
    toggleUnitLock(unitId: string): void {
      const scheme = this.activeScheme
      if (!scheme || !this.unitMap.has(unitId)) return
      this.pushHistory()
      const locked = new Set(scheme.lockedUnits ?? [])
      if (locked.has(unitId)) locked.delete(unitId)
      else locked.add(unitId)
      scheme.lockedUnits = locked.size ? [...locked] : undefined
    },

    /**
     * 在当前方案上重新优化：保留锁定件的归属，
     * 其余件通过局部搜索继续缩小差距（不新建方案）。
     */
    reoptimizeCurrent(): void {
      const scheme = this.activeScheme
      if (!scheme) return
      const ids = this.people.filter((p) => p.active !== false).map((p) => p.id)
      if (ids.length < 2) throw new Error('参与分配的人员不足 2 人，无法优化')
      const result = optimizeAssignment(scheme.assignment, this.units, ids, {
        maxPasses: this.optimizeMaxPasses,
        locked: new Set(scheme.lockedUnits ?? [])
      })
      this.pushHistory()
      scheme.assignment = result.assignment
    },

    /** 解锁当前方案的全部锁定件 */
    unlockAllUnits(): void {
      const scheme = this.activeScheme
      if (!scheme?.lockedUnits?.length) return
      this.pushHistory()
      scheme.lockedUnits = undefined
    },

    switchScheme(id: string): void {
      if (!this.schemes.some((s) => s.id === id)) return
      this.pushHistory()
      this.activeSchemeId = id
    },

    deleteScheme(id: string): void {
      const idx = this.schemes.findIndex((s) => s.id === id)
      if (idx === -1) return
      this.pushHistory()
      this.schemes.splice(idx, 1)
      if (this.activeSchemeId === id) {
        this.activeSchemeId = this.schemes.length ? this.schemes[this.schemes.length - 1].id : null
      }
    },

    renameScheme(id: string, name: string): void {
      const s = this.schemes.find((x) => x.id === id)
      if (!s || !name.trim()) return
      this.pushHistory()
      s.name = name.trim()
    },

    /* ---------- 设置 ---------- */

    /** 更新分配 / 打印偏好（会话级，不进入撤销历史、不随项目保存） */
    setAlgoPrefs(patch: {
      allowSurplus?: boolean
      optimizeMaxPasses?: number
      randomRestarts?: number
      randomSeed?: number | null
      printPageNumbers?: boolean
    }): void {
      if (patch.allowSurplus !== undefined) this.allowSurplus = patch.allowSurplus
      if (patch.optimizeMaxPasses !== undefined) {
        this.optimizeMaxPasses = Math.min(500, Math.max(1, Math.floor(patch.optimizeMaxPasses)))
      }
      if (patch.randomRestarts !== undefined) {
        this.randomRestarts = Math.min(100, Math.max(0, Math.floor(patch.randomRestarts)))
      }
      if (patch.randomSeed !== undefined) this.randomSeed = patch.randomSeed
      if (patch.printPageNumbers !== undefined) this.printPageNumbers = patch.printPageNumbers
    },

    updateSettings(patch: { title?: string; remark?: string; currency?: string }): void {
      this.pushHistory()
      if (patch.title !== undefined) this.title = patch.title.trim() || DEFAULT_TITLE
      if (patch.remark !== undefined) this.remark = patch.remark
      if (patch.currency !== undefined && patch.currency) this.currency = patch.currency
    },

    /* ---------- 导入前置校验 ---------- */

    /** 当前物资拆分后总件数是否超过上限（用于导入前提示） */
    wouldExceedUnitLimit(addCount = 0): boolean {
      const total = this.unitCount + addCount
      return total > MAX_UNITS
    }
  }
})
