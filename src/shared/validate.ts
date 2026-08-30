import type { AllocationScheme, Person, ProjectFile, Strategy } from './types'

/**
 * 项目文件运行时校验与归一化（纯函数，主进程与渲染层共用）。
 * 打开外部文件 / 旧版本 / 手工编辑的草稿时防御性处理：
 * - 字段缺失给默认值
 * - 非法物资 / 人员 / 方案剔除（而不是让渲染层崩在 undefined 上）
 * - assignment 逐条校验，null 与指向不存在人员的值一律剔除
 */

export const DEFAULT_TITLE = '物资分配领取表'

/** 拆分件数口径（与 expandUnits 一致）：数量取整且至少 1 件 */
export function quantityUnits(quantity: unknown): number {
  const n = Math.floor(Number(quantity))
  return Number.isFinite(n) && n >= 1 ? n : 1
}

const VALID_STRATEGIES: readonly Strategy[] = ['greedy', 'optimized', 'random', 'manual']

export function validateProject(raw: unknown): ProjectFile | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.materials) || !Array.isArray(o.people)) return null

  const materials = (o.materials as unknown[]).flatMap((m): MaterialLike[] => {
    if (typeof m !== 'object' || m === null) return []
    const x = m as Record<string, unknown>
    if (typeof x.id !== 'string' || !x.id) return []
    if (typeof x.name !== 'string' || !x.name.trim()) return []
    const price = Number(x.price)
    if (!Number.isFinite(price) || price <= 0) return []
    return [{ id: x.id, name: x.name, price, quantity: quantityUnits(x.quantity) }]
  })
  const people = (o.people as unknown[]).flatMap((p): Person[] => {
    if (typeof p !== 'object' || p === null) return []
    const x = p as Record<string, unknown>
    if (typeof x.id !== 'string' || !x.id || typeof x.name !== 'string' || !x.name.trim()) return []
    return [{ id: x.id, name: x.name, active: x.active !== false }]
  })

  const validPersonIds = new Set(people.map((p) => p.id))
  // 合法拆分件 id 集合：materiaId#k（k ≤ 数量），幽灵引用在载入时即剔除
  const validUnitIds = new Set<string>()
  for (const m of materials) {
    for (let k = 1; k <= m.quantity; k++) validUnitIds.add(`${m.id}#${k}`)
  }
  const schemes = Array.isArray(o.schemes)
    ? (o.schemes as unknown[]).flatMap((s): AllocationScheme[] => {
        if (typeof s !== 'object' || s === null) return []
        const x = s as Record<string, unknown>
        // 注意 typeof null === 'object'，必须显式排除 null
        if (typeof x.id !== 'string' || !x.id) return []
        if (x.assignment === null || typeof x.assignment !== 'object') return []
        const assignment: Record<string, string> = {}
        for (const [unitId, personId] of Object.entries(x.assignment as Record<string, unknown>)) {
          if (typeof unitId !== 'string' || !validUnitIds.has(unitId)) continue
          if (typeof personId !== 'string' || !validPersonIds.has(personId)) continue
          assignment[unitId] = personId
        }
        const lockedUnits = Array.isArray(x.lockedUnits)
          ? [
              ...new Set(
                (x.lockedUnits as unknown[]).filter(
                  (u): u is string => typeof u === 'string' && validUnitIds.has(u)
                )
              )
            ]
          : []
        return [
          {
            id: x.id,
            name: typeof x.name === 'string' && x.name.trim() ? x.name : '未命名方案',
            createdAt: typeof x.createdAt === 'string' ? x.createdAt : new Date(0).toISOString(),
            strategy: VALID_STRATEGIES.includes(x.strategy as Strategy)
              ? (x.strategy as Strategy)
              : 'manual',
            assignment,
            ...(lockedUnits.length ? { lockedUnits } : {})
          }
        ]
      })
    : []

  const activeSchemeId =
    typeof o.activeSchemeId === 'string' && schemes.some((s) => s.id === o.activeSchemeId)
      ? o.activeSchemeId
      : null

  return {
    version: 1,
    title: typeof o.title === 'string' && o.title.trim() ? o.title : DEFAULT_TITLE,
    remark: typeof o.remark === 'string' ? o.remark : '',
    currency: typeof o.currency === 'string' && o.currency ? o.currency : '¥',
    materials,
    people,
    schemes,
    activeSchemeId
  }
}

interface MaterialLike {
  id: string
  name: string
  price: number
  quantity: number
}
