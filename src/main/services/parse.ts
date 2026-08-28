import * as iconv from 'iconv-lite'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { randomUUID } from 'crypto'
import type { Material } from '@shared/types'

/**
 * 导入文件解析（纯函数，主进程与测试共用）。
 * 兼容：带表头 / 无表头、Excel 导出的 GBK 编码 CSV、名称含逗号引号。
 */

export interface ParseMaterialsResult {
  materials: Material[]
  skipped: number
}

/** 解码文件字节：识别 UTF-8 BOM / UTF-16 BOM / UTF-8 / GB18030 */
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

const HEADER_NAME = /名称|品名|物资|name/i
const HEADER_PRICE = /单价|价格|金额|price|amount/i
const HEADER_QTY = /数量|件数|qty|quantity/i

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
  const price = cells.findIndex((c) => HEADER_PRICE.test(c))
  if (name === -1 || price === -1) return { name: 0, price: 1, qty: 2 }
  return { name, price, qty: cells.findIndex((c) => HEADER_QTY.test(c)) }
}

function toNumber(cell: unknown): number {
  const n = Number(String(cell ?? '').replace(/[¥$€£￥,\s]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/** 把二维行数组解析为物资列表（CSV 与 XLSX 共用） */
export function parseMaterialRows(rows: unknown[][]): ParseMaterialsResult {
  const materials: Material[] = []
  let skipped = 0
  if (rows.length === 0) return { materials, skipped }

  const cols = detectColumns(rows[0])
  const startRow =
    rows[0][cols.name] !== undefined &&
    String(rows[0][cols.name]).trim() !== '' &&
    Number.isNaN(toNumber(rows[0][cols.price]))
      ? 1
      : 0

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
      const q = Math.floor(Number(rawQty))
      quantity = Number.isFinite(q) && q >= 1 ? q : 1
    }
    materials.push({ id: `imp-${randomUUID()}`, name, price, quantity })
  }
  return { materials, skipped }
}

export function parseMaterialsCsv(text: string): ParseMaterialsResult {
  const parsed = Papa.parse<unknown[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy'
  })
  return parseMaterialRows(parsed.data)
}

export function parseMaterialsXlsx(buffer: Buffer): ParseMaterialsResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return { materials: [], skipped: 0 }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  return parseMaterialRows(rows)
}

/**
 * 人员名单解析：每行一个姓名；兼容 CSV（取第一列）。
 * 自动去除空行、首尾空白与重复姓名。
 */
export function parsePeople(text: string): string[] {
  const parsed = Papa.parse<unknown[]>(text.replace(/^\uFEFF/, ''), {
    skipEmptyLines: 'greedy'
  })
  const names: string[] = []
  const seen = new Set<string>()
  for (const row of parsed.data) {
    const name = String(row?.[0] ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}
