import type { PersonRow } from './rows'

export interface PrintInput {
  /** 表格标题，如「物资分配领取表」 */
  title: string
  remark: string
  currency: string
  rows: PersonRow[]
  generatedAt: string
}

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ESC[c])
}

function fmt(v: number): string {
  return (Math.round(v * 100) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

const PRINT_CSS = `
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Noto Sans SC','Microsoft YaHei','Noto Sans CJK SC','WenQuanYi Micro Hei',sans-serif; color: #111; font-size: 12px; }
h1 { text-align: center; font-size: 20px; margin: 0 0 6px; letter-spacing: 2px; }
.meta { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 6px; }
.meta .remark { flex: 1; text-align: right; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #555; padding: 4px 6px; font-size: 12px; word-break: break-all; vertical-align: middle; }
th { background: #f2f2f2; font-weight: 700; text-align: center; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
/* 小块（行数少的人员）整块不跨页；大块允许分页但每行重复姓名 */
tbody.block { break-inside: avoid; page-break-inside: avoid; }
td.name-cell.cont { color: #999; }
td.c { text-align: center; } td.r { text-align: right; } td.strong { font-weight: 700; }
td.sign { min-width: 64px; }
tr.total td { background: #fafafa; font-weight: 700; }
.foot { margin-top: 16px; display: flex; justify-content: space-between; font-size: 12px; page-break-inside: avoid; break-inside: avoid; }
.foot span { display: inline-block; min-width: 160px; }
.empty-note { color: #888; }
`

/**
 * 人员块的行数阈值：不超过该值时整块禁止跨页（避免姓名/签字被分页截断）；
 * 超过时允许自然分页，但每行重复姓名（续页行淡色显示），保证跨页可识别。
 */
const PAGE_SAFE_ROWS = 14

/**
 * 构建 A4 打印 / PDF 的 HTML。
 * 列：序号｜姓名｜物资名称｜单价｜数量｜小计｜总价值｜签字栏；
 * 每人一组（tbody）：小块整组不跨页，大块续页行重复姓名；
 * <thead> 分页自动重复，行不跨页拆断。
 * <!--FONT_INJECT--> 标记由主进程替换为内置字体的 @font-face（如随包携带）；
 * <!--PDF_PAGE_OVERRIDE--> 在导出 PDF 且开启页码时由主进程注入 @page 覆盖。
 */
export function buildPrintHtml(input: PrintInput): string {
  const { title, remark, currency, rows, generatedAt } = input

  const blocks: string[] = []
  let grandTotal = 0
  let unitCount = 0

  for (const row of rows) {
    grandTotal += row.total
    if (row.items.length === 0) {
      blocks.push(
        `<tbody><tr><td class="c">${row.index}</td><td>${esc(row.name)}</td>` +
          `<td class="empty-note" colspan="4">（无分配物资）</td><td class="r strong">${fmt(0)}</td><td></td></tr></tbody>`
      )
      continue
    }
    const large = row.items.length > PAGE_SAFE_ROWS
    const trs = row.items.map((it, idx) => {
      const head = idx === 0
      unitCount += it.quantity
      return (
        `<tr>` +
        (head ? `<td class="c" rowspan="${row.items.length}">${row.index}</td>` : '') +
        (large
          ? `<td class="name-cell${head ? '' : ' cont'}">${esc(row.name)}</td>`
          : head
            ? `<td rowspan="${row.items.length}">${esc(row.name)}</td>`
            : '') +
        `<td>${esc(it.name)}</td>` +
        `<td class="r">${fmt(it.price)}</td>` +
        `<td class="c">${it.quantity}</td>` +
        `<td class="r">${fmt(it.subtotal)}</td>` +
        (head
          ? `<td class="r strong" rowspan="${row.items.length}">${fmt(row.total)}</td><td class="sign" rowspan="${row.items.length}"></td>`
          : '') +
        `</tr>`
      )
    })
    blocks.push(`<tbody${large ? '' : ' class="block"'}>${trs.join('')}</tbody>`)
  }

  const totalRow =
    `<tbody class="total-body"><tr class="total"><td class="c" colspan="4">合计（${rows.length} 人）</td>` +
    `<td class="c">${unitCount}</td><td class="r">${currency}${fmt(grandTotal)}</td><td></td><td></td></tr></tbody>`

  const tableHead =
    `<thead><tr><th>序号</th><th>姓名</th><th>物资名称</th><th>单价（${esc(currency)}）</th>` +
    `<th>数量</th><th>小计（${esc(currency)}）</th><th>总价值（${esc(currency)}）</th><th>签字栏</th></tr></thead>`

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>${PRINT_CSS}</style>
<!--FONT_INJECT-->
<!--PDF_PAGE_OVERRIDE-->
</head>
<body>
<h1>${esc(title)}</h1>
<div class="meta">
  <span>生成日期：${esc(generatedAt)}</span>
  <span class="remark">${remark ? '备注：' + esc(remark) : ''}</span>
</div>
<table>
${tableHead}
${blocks.join('\n')}
${totalRow}
</table>
<div class="foot">
  <span>发放人签字：____________</span>
  <span>监发人签字：____________</span>
  <span>日期：______年____月____日</span>
</div>
</body>
</html>`
}
