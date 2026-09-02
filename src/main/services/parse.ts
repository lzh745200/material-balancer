import * as iconv from 'iconv-lite'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { randomUUID } from 'crypto'
import type { Material } from '@shared/types'

/**
 * 导入文件解析（纯函数，主进程与测试共用）。
 * 兼容：带表头 / 无表头、Excel 导出的 GBK 编码 CSV、名称含逗号引号、全角数字。
 */

export interface ParseMaterialsResult {
  materials: Material[]
  skipped: number
  /** 解析器报告的问题（如 CSV 引号格式错误），供界面提示 */
  warnings: string[]
}

/** 解码文件字节：识别 UTF-8 BOM / UTF-16 LE BOM / UTF-8 / GB18030 */
export function decodeBuffer(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf-8')
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return iconv.decode(buffer.subarray(2), 'utf-16-le')
  }
  const asUtf8 = buffer.toString('utf-8')
  // 出现替换符说明大概率是 GBK 等本地编码（Excel 中文版默认导出 GBK）
  if (!asUtf8.includes('\uFFFD')) return asUtf8
  return iconv.decode(buffer, 'gb18030')
}

const HEADER_NAME = /名称|品名|物资|物品|name/i
/** 单价列优先匹配明确的「单价/价格」，避免「金额」（总额含义）抢先 */
const HEADER_PRICE_STRICT = /单价|价格|price/i
const HEADER_PRICE_LOOSE = /金额|amount/i
const HEADER_QTY = /数量|件数|qty|quantity/i
const PEOPLE_HEADER = /^(姓名|名字|人员|员工|名单|name|member|full ?name)s?$/i

interface ColumnMap {
  name: number
  price: number
  qty: number
}

/** 探测表头列位置；不是表头时返回默认列位置（0/1/2） */
function detectColumns(firstRow: unknown[]): ColumnMap {
  const cells = firstRow.map((c) => String(c ?? '').trim())
  const hasText = cells.some((c) => c.length > 0)
  if (!hasText) return { name: 0, price: 1, qty: 2 }
  const name = cells.findIndex((c) => HEADER_NAME.test(c))
  let price = cells.findIndex((c) => HEADER_PRICE_STRICT.test(c))
  if (price === -1) price = cells.findIndex((c) => HEADER_PRICE_LOOSE.test(c))
  if (name === -1 || price === -1) return { name: 0, price: 1, qty: 2 }
  return { name, price, qty: cells.findIndex((c) => HEADER_QTY.test(c)) }
}

/** 数字归一化：全角数字/逗号/句点转半角，再去掉货币符号、千分位与空白 */
function toNumber(cell: unknown): number {
  const s = String(cell ?? '')
    .replace(/[\uFF10-\uFF19\uFF0C\uFF0E\uFF05]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/[¥$€£￥,%\s]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/** 取开头的整数（全角数字先转半角）：数量列带单位（"10箱"/"5个"）时提取件数 */
function leadingInteger(cell: unknown): number {
  const s = String(cell ?? '')
    .replace(/[\uFF10-\uFF19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .trim()
  const m = /^\d+/.exec(s)
  return m ? Number(m[0]) : NaN
}

/** 把二维行数组解析为物资列表（CSV 与 XLSX 共用） */
export function parseMaterialRows(rows: unknown[][]): ParseMaterialsResult {
  const materials: Material[] = []
  const warnings: string[] = []
  let skipped = 0

  // 跳过首部整行空白（Excel 粘贴 / 导出常见），否则列探测会被空行带偏
  const first = rows.findIndex(
    (row) => Array.isArray(row) && row.some((c) => String(c ?? '').trim() !== '')
  )
  if (first === -1) return { materials, skipped, warnings }

  const cols = detectColumns(rows[first])
  const nameCell = String(rows[first][cols.name] ?? '').trim()
  // 表头行的价格列必为文字（单价/价格），数据行的价格列是数字；
  // 仅凭名称含「物品/物资/name」等词不足以判定表头（如首条物资名「办公用品」）
  const priceIsNumeric = !Number.isNaN(toNumber(rows[first][cols.price]))
  const keywordHeader =
    !priceIsNumeric &&
    (HEADER_NAME.test(nameCell) || HEADER_PRICE_STRICT.test(nameCell) || HEADER_QTY.test(nameCell))
  // 名称非空且价格列不可解析 → 疑似表头
  const ambiguousHeader = nameCell !== '' && !priceIsNumeric
  const startRow = keywordHeader || ambiguousHeader ? first + 1 : first
  // 首行被当表头但没命中任何关键词时无法区分「表头」与「首条数据」，
  // 计入 skipped，保证行数守恒、不静默丢行
  if (startRow !== first && !keywordHeader) skipped++

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i]
    const name = String(row[cols.name] ?? '').trim()
    if (!name) {
      skipped++
      continue
    }
    const price = toNumber(row[cols.price])
    if (!Number.isFinite(price) || price <= 0) {
      skipped++
      continue
    }
    const rawQty = row[cols.qty] === undefined || cols.qty === -1 ? '' : String(row[cols.qty]).trim()
    let quantity = 1
    if (rawQty !== '') {
      let q = Math.floor(toNumber(rawQty))
      // 带单位的数量（"10箱"）toNumber 得 NaN，回退取开头整数，避免静默按 1 件处理
      if (!Number.isFinite(q) || q < 1) q = leadingInteger(rawQty)
      quantity = Number.isFinite(q) && q >= 1 ? q : 1
    }
    materials.push({ id: `imp-${randomUUID()}`, name, price, quantity })
  }
  return { materials, skipped, warnings }
}

export function parseMaterialsCsv(text: string): ParseMaterialsResult {
  const parsed = Papa.parse<unknown[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy'
  })
  const result = parseMaterialRows(parsed.data)
  // PapaParse 的容错错误（引号不闭合等）不再静默吞掉
  const messages = [...new Set(parsed.errors.map((e) => String(e.message ?? '')).filter(Boolean))]
  if (messages.length) result.warnings = messages
  return result
}

/** xlsx 是 zip 容器：按魔数识别（防止改扩展名后走错解析器） */
export function isZipBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [3, 5, 7].includes(buffer[2])
  )
}

/** 旧版 .xls 是 OLE2 复合文档（魔数 D0 CF 11 E0），SheetJS 的 XLSX.read 同样能解析（BIFF） */
export function isOle2Buffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  )
}

/** 是否应按 Excel 解析（.xlsx 走 ZIP，.xls 走 OLE2）；否则按文本/CSV 解码 */
export function isExcelBuffer(buffer: Buffer): boolean {
  return isZipBuffer(buffer) || isOle2Buffer(buffer)
}

export function parseMaterialsXlsx(buffer: Buffer): ParseMaterialsResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  // 第一个 sheet 可能是说明页：取第一个能解析出数据的表
  let fallback: ParseMaterialsResult | null = null
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    const result = parseMaterialRows(rows)
    if (result.materials.length > 0) return result
    if (!fallback) fallback = result
  }
  return fallback ?? { materials: [], skipped: 0, warnings: [] }
}

/**
 * 人员名单解析：每行一个姓名；兼容 CSV（取第一列）。
 * 自动去除空行、首尾空白与重复姓名；首列表头（姓名/Name 等）自动跳过。
 */
export function parsePeople(text: string): string[] {
  const parsed = Papa.parse<unknown[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy'
  })
  return namesFromFirstColumn(parsed.data.map((row) => String(row?.[0] ?? '')))
}

/** 人员名单 XLSX：取第一个含数据的 sheet 的第一列 */
export function parsePeopleXlsx(buffer: Buffer): string[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
    const names = namesFromFirstColumn(rows.map((row) => String(row?.[0] ?? '')))
    if (names.length) return names
  }
  return []
}

function namesFromFirstColumn(cells: string[]): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  let headerChecked = false
  for (const raw of cells) {
    const name = raw.trim()
    if (!name) continue
    // 对首个非空单元格判定表头（XLSX 可能有前导空行，不能只看下标 0）
    if (!headerChecked) {
      headerChecked = true
      if (PEOPLE_HEADER.test(name)) continue
    }
    if (seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}
