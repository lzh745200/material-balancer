import type { Person, Unit } from '@shared/types'
import { round2 } from '@/utils/format'

/** 按人员聚合的打印 / 导出行数据（同一物资多件合并为数量） */
export interface PrintItem {
  name: string
  price: number
  quantity: number
  subtotal: number
}

export interface PersonRow {
  index: number
  name: string
  items: PrintItem[]
  total: number
}

/**
 * 由分配结果构建每人一组的行数据：
 * - 只统计 assignment 中有效指向的件
 * - 同一人的同一物资多件合并（数量 = 件数，小计 = 单价 × 数量）
 */
export function buildPersonRows(
  people: Person[],
  units: Unit[],
  assignment: Record<string, string>
): PersonRow[] {
  return people.map((p, i) => {
    const grouped = new Map<string, PrintItem>()
    for (const u of units) {
      if (assignment[u.unitId] !== p.id) continue
      const existing = grouped.get(u.materialId)
      if (existing) {
        existing.quantity += 1
        existing.subtotal = round2(existing.price * existing.quantity)
      } else {
        grouped.set(u.materialId, { name: u.name, price: u.price, quantity: 1, subtotal: u.price })
      }
    }
    const items = [...grouped.values()]
    const total = round2(items.reduce((acc, it) => acc + it.subtotal, 0))
    return { index: i + 1, name: p.name, items, total }
  })
}
