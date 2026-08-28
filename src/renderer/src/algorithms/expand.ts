import type { Material, Unit } from '@shared/types'
import { MAX_UNITS, unitIdOf } from '@shared/types'

/**
 * 将物资按数量拆分为独立件（unit）。
 * quantity > 1 的物资拆为 quantity 个 unit，unitId 形如 `materialId#k`。
 * 总件数超过 MAX_UNITS 时抛出异常（性能护栏）。
 */
export function expandUnits(materials: Material[]): Unit[] {
  let total = 0
  for (const m of materials) total += Math.max(1, Math.floor(m.quantity || 1))
  if (total > MAX_UNITS) {
    throw new Error(`物资总件数（${total}）超过上限 ${MAX_UNITS}，请减少物资数量或合并条目`)
  }
  const units: Unit[] = []
  for (const m of materials) {
    const qty = Math.max(1, Math.floor(m.quantity || 1))
    for (let k = 1; k <= qty; k++) {
      units.push({ unitId: unitIdOf(m.id, k), materialId: m.id, name: m.name, price: m.price })
    }
  }
  return units
}
