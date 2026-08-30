import * as XLSX from 'xlsx'
import type { PersonRow } from '@/print/rows'

/**
 * 结果导出 XLSX（双 sheet）：
 * - 分配明细：与 CSV 明细同列（每人多行，总价值在首行）
 * - 按人汇总：序号 / 姓名 / 件数 / 总价值，便于快速核对
 */
export function buildXlsxWorkbook(rows: PersonRow[], title: string, currency: string): Uint8Array {
  const detail: (string | number)[][] = [
    ['序号', '人员姓名', '物资名称', `单价（${currency}）`, '数量', `小计（${currency}）`, `总价值（${currency}）`]
  ]
  for (const row of rows) {
    if (row.items.length === 0) {
      detail.push([row.index, row.name, '（无分配物资）', 0, 0, 0, 0])
      continue
    }
    row.items.forEach((it, idx) => {
      detail.push([
        row.index,
        row.name,
        it.name,
        it.price,
        it.quantity,
        it.subtotal,
        idx === 0 ? row.total : ''
      ])
    })
  }
  const grand = rows.reduce((acc, r) => acc + r.total, 0)
  detail.push(['', '', '', '', '合计', grand, grand])

  const summary: (string | number)[][] = [['序号', '人员姓名', '物资件数', `总价值（${currency}）`]]
  rows.forEach((row) => {
    summary.push([row.index, row.name, row.items.reduce((acc, it) => acc + it.quantity, 0), row.total])
  })
  summary.push(['', '合计', rows.reduce((acc, r) => acc + r.items.reduce((a, it) => a + it.quantity, 0), 0), grand])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detail), '分配明细')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), '按人汇总')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Uint8Array(out)
}
