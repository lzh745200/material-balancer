import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import * as iconv from 'iconv-lite'
import {
  decodeBuffer,
  parseMaterialsCsv,
  parseMaterialsXlsx,
  parsePeople
} from '../src/main/services/parse'
import { buildPersonRows } from '../src/renderer/src/print/rows'
import { buildPrintHtml } from '../src/renderer/src/print/buildPrintHtml'
import { buildDetailCsv } from '../src/renderer/src/utils/csvExport'

describe('decodeBuffer 编码识别', () => {
  it('识别 UTF-8 BOM', () => {
    expect(decodeBuffer(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('笔记本', 'utf-8')]))).toBe('笔记本')
  })
  it('GBK 内容自动转码（Excel 中文版默认导出编码）', () => {
    const gbk = iconv.encode('物资名称,单价\n钢笔,3.5', 'gb18030')
    expect(decodeBuffer(gbk)).toBe('物资名称,单价\n钢笔,3.5')
  })
})

describe('parseMaterialsCsv', () => {
  it('带表头的 CSV：名称,单价,数量', () => {
    const { materials, skipped } = parseMaterialsCsv('名称,单价,数量\n笔记本,5.5,2\n钢笔,3')
    expect(skipped).toBe(0)
    expect(materials).toHaveLength(2)
    expect(materials[0]).toMatchObject({ name: '笔记本', price: 5.5, quantity: 2 })
    expect(materials[1]).toMatchObject({ name: '钢笔', price: 3, quantity: 1 })
  })

  it('无表头 CSV、名称含逗号引号、金额带货币符号', () => {
    const { materials } = parseMaterialsCsv('"笔记本，A4",¥5,1\n钢笔,3,')
    expect(materials[0]).toMatchObject({ name: '笔记本，A4', price: 5, quantity: 1 })
    expect(materials[1]).toMatchObject({ name: '钢笔', price: 3, quantity: 1 })
  })

  it('跳过无效行（空名称 / 价格非正数）并计数', () => {
    const { materials, skipped } = parseMaterialsCsv('名称,单价,数量\n,5,1\n好本子,0,1\n好笔子,abc,1\n valid,2,2')
    expect(materials).toHaveLength(1)
    expect(materials[0]).toMatchObject({ name: 'valid', price: 2, quantity: 2 })
    expect(skipped).toBe(3)
  })

  it('数量非法时回退为 1', () => {
    const { materials } = parseMaterialsCsv('名称,单价,数量\n本子,2,0\n笔,3,x')
    expect(materials.map((m) => m.quantity)).toEqual([1, 1])
  })
})

describe('parseMaterialsXlsx', () => {
  it('解析 Excel 第一张表', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['物资名称', '单价', '数量'],
      ['笔记本', 5, 2],
      ['钢笔', 3.5, 1]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const { materials } = parseMaterialsXlsx(buffer)
    expect(materials).toHaveLength(2)
    expect(materials[0]).toMatchObject({ name: '笔记本', price: 5, quantity: 2 })
  })
})

describe('parsePeople', () => {
  it('每行一个姓名，去空行与重复', () => {
    expect(parsePeople('张三\n李四\n\n  王五  \n张三\n')).toEqual(['张三', '李四', '王五'])
  })
  it('兼容 CSV 取第一列', () => {
    expect(parsePeople('张三,男\n李四,女')).toEqual(['张三', '李四'])
  })
})

describe('buildPersonRows / buildPrintHtml / buildDetailCsv', () => {
  const rows = buildPersonRows(
    [
      { id: 'p1', name: '张三' },
      { id: 'p2', name: '李<四>' }
    ],
    [
      { unitId: 'm1#1', materialId: 'm1', name: '笔记本', price: 5 },
      { unitId: 'm1#2', materialId: 'm1', name: '笔记本', price: 5 },
      { unitId: 'm2#1', materialId: 'm2', name: '钢笔', price: 3 },
      { unitId: 'm3#1', materialId: 'm3', name: '橡皮', price: 1 }
    ],
    { 'm1#1': 'p1', 'm1#2': 'p1', 'm2#1': 'p2', 'm3#1': 'p2' }
  )

  it('同一人的同种物资合并数量，总价值正确', () => {
    expect(rows[0].items).toEqual([{ name: '笔记本', price: 5, quantity: 2, subtotal: 10 }])
    expect(rows[0].total).toBe(10)
    expect(rows[1].items).toEqual([
      { name: '钢笔', price: 3, quantity: 1, subtotal: 3 },
      { name: '橡皮', price: 1, quantity: 1, subtotal: 1 }
    ])
    expect(rows[1].total).toBe(4)
  })

  it('打印 HTML：包含标题、表格结构并转义 HTML 字符', () => {
    const html = buildPrintHtml({ title: '物资分配领取表', remark: '', currency: '¥', rows, generatedAt: '2026-08-29 12:00' })
    expect(html).toContain('物资分配领取表')
    expect(html).toContain('rowspan="2"')
    expect(html).toContain('签字栏')
    expect(html).toContain('<!--FONT_INJECT-->')
    expect(html).not.toContain('李<四>')
    expect(html).toContain('李&lt;四&gt;')
  })

  it('CSV 明细：含表头与合计，逗号正确加引号', () => {
    const csv = buildDetailCsv(rows, '¥')
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toContain('序号,人员姓名,物资名称')
    expect(csv).toContain('张三')
    expect(csv.includes('"张三"')).toBe(false) // 无特殊字符不加引号
    expect(lines[lines.length - 1]).toContain('合计,14')
  })
})
