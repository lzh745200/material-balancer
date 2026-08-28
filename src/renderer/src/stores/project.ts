import { defineStore } from 'pinia'
import type {
  AllocationScheme,
  Material,
  Person,
  ProjectFile,
  Unit
} from '@shared/types'
import { MAX_UNITS } from '@shared/types'
import { distribute, computeStats, expandUnits, type AutoStrategy, type GlobalStats } from '@/algorithms'
import { uid } from '@/utils/id'
import { round2 } from '@/utils/format'

const HISTORY_LIMIT = 50
const SCHEME_LIMIT = 30
export const DEFAULT_TITLE = '物资分配领取表'

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
 */
export const useProjectStore = defineStore('project', {
  state: () => ({
    filePath: null as string | null,
    dirty: false,
    ...emptySnapshot(),
    past: [] as Snapshot[],
    future: [] as Snapshot[],
    draftSavedAt: '' as string
  }),

  getters: {
    /** 拆分后的全部独立件（数量 > 1 的物资按件展开） */
    units(state): Unit[] {
      try {
        return expandUnits(state.materials)
      } catch {
        // 超过拆分上限时仍给 UI 提供部分可用数据
        const units: Unit[] = []
        for (const m of state.materials) {
          for (let k = 1; k <= Math.min(Math.max(1, Math.floor(m.quantity || 1)), 50); k++) {
            units.push({ unitId: `${m.id}#${k}`, materialId: m.id, name: m.name, price: m.price })
          }
        }
        return units
      }
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
      return computeStats(this.activeAssignment, this.units, state.people.map((p) => p.id))
    },

    /** 物资 / 人员变动后，激活方案是否已失效（引用了不存在的件或人员） */
    isStale(state): boolean {
      const scheme = this.activeScheme
      if (!scheme) return false
      const map = this.unitMap
      const personIds = new Set(state.people.map((p) => p.id))
      return Object.entries(scheme.assignment).some(
        ([unitId, personId]) => !map.has(unitId) || !personIds.has(personId)
      )
    },

    /** 差值超过平均值 10% 时给出调整建议 */
    overDiffWarning(): boolean {
      const stats = this.stats
      if (!stats || this.people.length < 2) return false
      const assigned = this.units.some((u) => this.activeAssignment[u.unitId])
      return assigned && stats.avg > 0 && stats.diff > stats.avg * 0.1
    },

    totalValue(state): number {
      return round2(state.materials.reduce((acc, m) => acc + m.price * Math.max(1, m.quantity), 0))
    },

    unitCount(state): number {
      return state.materials.reduce((acc, m) => acc + Math.max(1, Math.floor(m.quantity || 1)), 0)
    },

    canUndo(state): boolean {
      return state.past.length > 0
    },

    canRedo(state): boolean {
      return state.future.length > 0
    },

    defaultFileName(state): string {
      const safe = state.title.replace(/[\\/:*?"<>|]/g, '') || '物资分配领取表'
      return `${safe}-${new Date().toISOString().slice(0, 10)}`
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
      Object.assign(this, emptySnapshot(), { past: [], future: [] })
      this.filePath = null
      this.dirty = false
    },

    loadProject(data: ProjectFile, filePath: string | null): void {
      this.title = data.title
      this.remark = data.remark
      this.currency = data.currency
      this.materials = data.materials
      this.people = data.people
      this.schemes = data.schemes
      this.activeSchemeId = data.activeSchemeId
      this.filePath = filePath
      this.past = []
      this.future = []
      this.dirty = false
    },

    markSaved(filePath: string): void {
      this.filePath = filePath
      this.dirty = false
    },

    /* ---------- 物资 ---------- */

    addMaterial(name: string, price: number, quantity: number): void {
      this.pushHistory()
      this.materials.push({ id: uid('m'), name: name.trim(), price: round2(price), quantity })
    },

    updateMaterial(id: string, patch: Partial<Omit<Material, 'id'>>): void {
      const m = this.materials.find((x) => x.id === id)
      if (!m) return
      this.pushHistory()
      Object.assign(m, patch)
      if (m.quantity < 1) m.quantity = 1
      m.price = round2(m.price)
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
      this.pushHistory()
      this.materials.push(...list)
    },

    /* ---------- 人员 ---------- */

    addPerson(name: string): void {
      const trimmed = name.trim()
      if (!trimmed) return
      this.pushHistory()
      this.people.push({ id: uid('p'), name: trimmed })
    },

    renamePerson(id: string, name: string): void {
      const p = this.people.find((x) => x.id === id)
      if (!p || !name.trim()) return
      this.pushHistory()
      p.name = name.trim()
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

    /** 生成新方案（自动策略）。物资超限抛出异常，由调用方提示。 */
    generateAllocation(strategy: AutoStrategy): void {
      // 先计算再入历史：抛异常时不产生任何状态变化
      const result = distribute(this.materials, this.people, strategy)
      this.pushHistory()
      const now = new Date()
      const scheme: AllocationScheme = {
        id: uid('s'),
        name: `方案${this.schemes.length + 1}`,
        createdAt: now.toISOString(),
        strategy,
        assignment: result.assignment
      }
      this.schemes.push(scheme)
      if (this.schemes.length > SCHEME_LIMIT) this.schemes.shift()
      this.activeSchemeId = scheme.id
    },

    /** 手动调整：把一件物资移动到另一人（仅作用于当前激活方案） */
    moveUnit(unitId: string, toPersonId: string): void {
      const scheme = this.activeScheme
      if (!scheme || !unitId || !toPersonId) return
      const from = scheme.assignment[unitId]
      if (!from || from === toPersonId) return
      if (!this.people.some((p) => p.id === toPersonId)) return
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

    updateSettings(patch: { title?: string; remark?: string; currency?: string }): void {
      this.pushHistory()
      if (patch.title !== undefined) this.title = patch.title.trim() || DEFAULT_TITLE
      if (patch.remark !== undefined) this.remark = patch.remark
      if (patch.currency !== undefined && patch.currency) this.currency = patch.currency
    },

    /* ---------- 导入前置校验 ---------- */

    /** 当前物资拆分后总件数是否超过上限（用于导入前提示） */
    wouldExceedUnitLimit(addCount = 0): boolean {
      const total =
        this.materials.reduce((acc, m) => acc + Math.max(1, Math.floor(m.quantity || 1)), 0) +
        addCount
      return total > MAX_UNITS
    }
  }
})
