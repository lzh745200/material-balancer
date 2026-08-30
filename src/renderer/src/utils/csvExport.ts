import type { PersonRow } from '@/print/rows'

/**
 * CSV 单元格转义。
 * 除分隔符/换行加引号外，对可能被 Excel 当公式执行的值（以 = + - @ 或制表符开头）
 * 前置单引号，防止导入数据经导出后触发公式注入。
 */
function cell(v: string | number): string {
  const s = String(v)
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

const fmt = (v: number) => String(Math.round(v * 100) / 100)

/** 构建分配明细 CSV（不含 BOM，主进程写盘时统一加 BOM） */
export function buildDetailCsv(rows: PersonRow[], currency: string): string {
  const lines: string[] = []
  lines.push(
    ['序号', '人员姓名', '物资名称', `单价（${currency}）`, '数量', `小计（${currency}）`, `总价值（${currency}）`]
      .map(cell)
      .join(',')
  )
  for (const row of rows) {
    if (row.items.length === 0) {
      lines.push(`${row.index},${cell(row.name)},（无分配物资）,0,0,0,0`)
      continue
    }
    row.items.forEach((it, idx) => {
      lines.push(
        [
          row.index,
          cell(row.name),
          cell(it.name),
          fmt(it.price),
          it.quantity,
          fmt(it.subtotal),
          idx === 0 ? fmt(row.total) : ''
        ].join(',')
      )
    })
  }
  const grand = rows.reduce((acc, r) => acc + r.total, 0)
  lines.push(`,,,,合计,${fmt(grand)},${fmt(grand)}`)
  return lines.join('\r\n') + '\r\n'
}
