import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import * as iconv from 'iconv-lite'
import {
  decodeBuffer,
  isExcelBuffer,
  isOle2Buffer,
  isZipBuffer,
  parseMaterialRows,
  parseMaterialsCsv,
  parseMaterialsXlsx,
  parsePeople,
  parsePeopleXlsx
} from '../src/main/services/parse'
import { validateProject } from '../src/shared/validate'
import { MAX_UNITS } from '../src/shared/types'
import { buildTemplateWorkbook } from '../src/main/services/template'
import { buildPersonRows } from '../src/renderer/src/print/rows'
import { buildPrintHtml } from '../src/renderer/src/print/buildPrintHtml'
import { buildDetailCsv } from '../src/renderer/src/utils/csvExport'
import { buildXlsxWorkbook } from '../src/renderer/src/utils/xlsxExport'

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

  it('全角数字与全角逗号也能解析（中文输入法常见）', () => {
    const { materials, skipped } = parseMaterialsCsv('名称,单价,数量\n笔记本，Ａ４,１２.５,２')
    expect(skipped).toBe(0)
    expect(materials[0]).toMatchObject({ name: '笔记本，Ａ４', price: 12.5, quantity: 2 })
  })

  it('单价列优先于金额列（金额是总额含义）', () => {
    const { materials } = parseMaterialsCsv('名称,金额,单价\n本子,100,5')
    expect(materials[0].price).toBe(5)
  })

  it('无关键词表头时首行计入 skipped，不静默丢弃', () => {
    // 首行名称非空但价格不可解析，且无任何表头关键词 → 疑似表头，计入 skipped
    const { materials, skipped } = parseMaterialsCsv('好本子,,1\n好笔子,3,1')
    expect(materials).toHaveLength(1)
    expect(materials[0]).toMatchObject({ name: '好笔子', price: 3 })
    expect(skipped).toBe(1)
  })

  it('无表头文件首行物资名含"物品/物资"等词但价格为数字时不被误当表头（回归：办公用品被丢行）', () => {
    const { materials, skipped } = parseMaterialsCsv('办公用品,5,10\n签字笔,3,20')
    expect(skipped).toBe(0)
    expect(materials).toHaveLength(2)
    expect(materials[0]).toMatchObject({ name: '办公用品', price: 5, quantity: 10 })
  })

  it('数量列带单位时提取前导整数（回归："10箱"被静默当作 1 件）', () => {
    const { materials } = parseMaterialsCsv('名称,单价,数量\n矿泉水,2,10箱\n签字笔,3,5个\n本子,4,abc')
    expect(materials.map((m) => m.quantity)).toEqual([10, 5, 1])
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

  it('首部整行空白不破坏列探测', () => {
    const rows = [['', '', ''], ['名称', '单价', '数量'], ['笔记本', 5, 2]]
    const { materials, skipped } = parseMaterialRows(rows)
    expect(skipped).toBe(0)
    expect(materials[0]).toMatchObject({ name: '笔记本', price: 5 })
  })

  it('第一个 sheet 无数据时自动尝试后续 sheet', () => {
    const cover = XLSX.utils.aoa_to_sheet([['说明'], ['这是一个封面页']])
    const data = XLSX.utils.aoa_to_sheet([
      ['物资名称', '单价'],
      ['笔记本', 5]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, cover, '封面')
    XLSX.utils.book_append_sheet(wb, data, '数据')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const { materials } = parseMaterialsXlsx(buffer)
    expect(materials).toHaveLength(1)
    expect(materials[0]).toMatchObject({ name: '笔记本', price: 5 })
  })

  it('isZipBuffer 识别 xlsx 魔数（PK）', () => {
    expect(isZipBuffer(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe(true)
    expect(isZipBuffer(Buffer.from('名称,单价', 'utf-8'))).toBe(false)
  })

  it('isExcelBuffer 同时识别 .xlsx(ZIP) 与 .xls(OLE2)（回归：.xls 被当 CSV 解析成乱码）', () => {
    const ole2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1])
    expect(isOle2Buffer(ole2)).toBe(true)
    expect(isExcelBuffer(ole2)).toBe(true)
    expect(isExcelBuffer(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true)
    expect(isExcelBuffer(Buffer.from('名称,单价', 'utf-8'))).toBe(false)
  })

  it('人员名单 xlsx：取第一列并跳过表头', () => {
    const ws = XLSX.utils.aoa_to_sheet([['姓名'], ['张三'], ['李四']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '人员名单')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    expect(parsePeopleXlsx(buffer)).toEqual(['张三', '李四'])
  })

  it('人员名单 xlsx：前导空行后的"姓名"表头仍被跳过（回归：表头变成幽灵人员）', () => {
    const ws = XLSX.utils.aoa_to_sheet([[''], ['姓名'], ['张三'], ['李四']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '人员名单')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    expect(parsePeopleXlsx(buffer)).toEqual(['张三', '李四'])
  })

  it('导入模板包含物资表与人员名单两个 sheet', () => {
    const wb = XLSX.read(buildTemplateWorkbook(), { type: 'buffer' })
    expect(wb.SheetNames).toEqual(['物资表', '人员名单'])
  })
})

describe('parsePeople', () => {
  it('每行一个姓名，去空行与重复', () => {
    expect(parsePeople('张三\n李四\n\n  王五  \n张三\n')).toEqual(['张三', '李四', '王五'])
  })
  it('兼容 CSV 取第一列', () => {
    expect(parsePeople('张三,男\n李四,女')).toEqual(['张三', '李四'])
  })
  it('首列表头（姓名/Name）被跳过而不是导入为人员', () => {
    expect(parsePeople('姓名\n张三\n李四')).toEqual(['张三', '李四'])
    expect(parsePeople('Name\nAlice\nBob')).toEqual(['Alice', 'Bob'])
  })
})

describe('validateProject 项目校验', () => {
  it('接受合法项目并保留有效字段', () => {
    const project = validateProject({
      version: 1,
      title: '测试',
      remark: '',
      currency: '¥',
      materials: [{ id: 'm1', name: '本子', price: 5, quantity: 2 }],
      people: [{ id: 'p1', name: '张三' }],
      schemes: [],
      activeSchemeId: null
    })
    expect(project).not.toBeNull()
    expect(project!.materials).toHaveLength(1)
  })

  it('assignment 为 null 的方案被剔除而不是崩溃（回归：typeof null === "object"）', () => {
    const project = validateProject({
      materials: [{ id: 'm1', name: '本子', price: 5, quantity: 1 }],
      people: [{ id: 'p1', name: '张三' }],
      schemes: [
        { id: 's1', name: '坏方案', createdAt: '', strategy: 'greedy', assignment: null },
        { id: 's2', name: '好方案', createdAt: '', strategy: 'greedy', assignment: { 'm1#1': 'p1' } }
      ],
      activeSchemeId: 's1'
    })
    expect(project).not.toBeNull()
    expect(project!.schemes.map((s) => s.id)).toEqual(['s2'])
    // 悬空的 activeSchemeId 回退为 null
    expect(project!.activeSchemeId).toBeNull()
  })

  it('非法物资（负价 / 缺名）与幽灵 assignment 指向被剔除', () => {
    const project = validateProject({
      materials: [
        { id: 'm1', name: '正常', price: 5, quantity: 2.9 },
        { id: 'm2', name: '', price: 3, quantity: 1 },
        { id: 'm3', name: '负价', price: -1, quantity: 1 }
      ],
      people: [{ id: 'p1', name: '张三' }],
      schemes: [
        { id: 's1', name: '方案', createdAt: '', strategy: 'greedy', assignment: { 'm1#1': 'p1', 'm1#2': 'ghost', 'm9#1': 'p1' } }
      ],
      activeSchemeId: null
    })
    expect(project!.materials.map((m) => m.id)).toEqual(['m1'])
    expect(project!.materials[0].quantity).toBe(2) // 2.9 向下取整
    expect(project!.schemes[0].assignment).toEqual({ 'm1#1': 'p1' })
  })

  it('根本不是对象时返回 null', () => {
    expect(validateProject(null)).toBeNull()
    expect(validateProject('str')).toBeNull()
    expect(validateProject({})).toBeNull()
    expect(validateProject({ materials: [], people: 'x' })).toBeNull()
  })

  it('超大 quantity 被钳制到 MAX_UNITS，校验不耗尽内存（回归：畸形文件 OOM 崩溃）', () => {
    const start = Date.now()
    const project = validateProject({
      materials: [{ id: 'm1', name: '巨量', price: 1, quantity: 1e9 }],
      people: [{ id: 'p1', name: '张三' }],
      schemes: [{ id: 's1', name: '方案', createdAt: '', strategy: 'greedy', assignment: { 'm1#1': 'p1' } }],
      activeSchemeId: 's1'
    })
    expect(Date.now() - start).toBeLessThan(2000)
    expect(project!.materials[0].quantity).toBe(MAX_UNITS)
    // 钳制后 m1#1 仍是合法件，assignment 保留
    expect(project!.schemes[0].assignment).toEqual({ 'm1#1': 'p1' })
  })

  it('重复的物资 / 人员 id 被去重（保留首个有效者）', () => {
    const project = validateProject({
      materials: [
        { id: 'm1', name: '本子', price: 5, quantity: 1 },
        { id: 'm1', name: '重复本子', price: 9, quantity: 1 }
      ],
      people: [
        { id: 'p1', name: '张三' },
        { id: 'p1', name: '冒名张三' }
      ],
      schemes: [],
      activeSchemeId: null
    })
    expect(project!.materials).toHaveLength(1)
    expect(project!.materials[0].name).toBe('本子')
    expect(project!.people).toHaveLength(1)
    expect(project!.people[0].name).toBe('张三')
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

  it('打印 HTML：合计行货币符号也被转义（回归：自定义币种含 HTML 注入打印/PDF）', () => {
    const html = buildPrintHtml({ title: 'T', remark: '', currency: '<b>', rows, generatedAt: 'x' })
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;b&gt;')
  })

  it('CSV 明细：含表头与合计，逗号正确加引号', () => {
    const csv = buildDetailCsv(rows, '¥')
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toContain('序号,人员姓名,物资名称')
    expect(csv).toContain('张三')
    expect(csv.includes('"张三"')).toBe(false) // 无特殊字符不加引号
    expect(lines[lines.length - 1]).toContain('合计,14')
  })

  it('CSV 公式注入被转义（= 开头的名称按文本处理）', () => {
    const risky = buildPersonRows(
      [{ id: 'p1', name: '张三' }],
      [{ unitId: 'm1#1', materialId: 'm1', name: '=HYPERLINK("http://x","点我")', price: 1 }],
      { 'm1#1': 'p1' }
    )
    const csv = buildDetailCsv(risky, '¥')
    expect(csv).toContain(`'=HYPERLINK`)
  })

  it('币种符号含逗号 / 引号时表头加引号包裹', () => {
    const csv = buildDetailCsv(rows, 'usd,"x"')
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toContain('"单价（usd,""x""）"')
  })

  it('无分配物资人员打印为占位行；签名脚注不被分页拆断', () => {
    const empty = buildPersonRows(
      [
        { id: 'p1', name: '张三' },
        { id: 'p2', name: '李四' }
      ],
      [{ unitId: 'm1#1', materialId: 'm1', name: '笔记本', price: 5 }],
      { 'm1#1': 'p1' }
    )
    expect(empty[1].items).toHaveLength(0)
    const html = buildPrintHtml({ title: 'T', remark: '', currency: '¥', rows: empty, generatedAt: 'x' })
    expect(html).toContain('（无分配物资）')
    expect(html).toContain('.foot')
    expect(html).toContain('page-break-inside: avoid')
  })

  it('小块人员整块禁止跨页；大块人员每行重复姓名（续页行淡色）', () => {
    const small = buildPrintHtml({
      title: 'T', remark: '', currency: '¥',
      rows: buildPersonRows([{ id: 'p1', name: '张三' }],
        [{ unitId: 'm1#1', materialId: 'm1', name: '本子', price: 5 }],
        { 'm1#1': 'p1' }),
      generatedAt: 'x'
    })
    expect(small).toContain('<tbody class="block">')

    // 15 件超过 PAGE_SAFE_ROWS(14)：不用 rowspan 合并姓名，每行都有姓名单元格
    const units = Array.from({ length: 15 }, (_, i) => ({
      unitId: `m${i + 1}#1`, materialId: `m${i + 1}`, name: `物${i + 1}`, price: 1
    }))
    const assignment = Object.fromEntries(units.map((u) => [u.unitId, 'p1']))
    const large = buildPrintHtml({
      title: 'T', remark: '', currency: '¥',
      rows: buildPersonRows([{ id: 'p1', name: '张三' }], units, assignment),
      generatedAt: 'x'
    })
    expect(large).toContain('name-cell cont')
    expect((large.match(/name-cell/g) ?? []).length).toBeGreaterThanOrEqual(15)
  })

  it('XLSX 导出包含分配明细与按人汇总两个 sheet 且数值正确', () => {
    const rows = buildPersonRows(
      [
        { id: 'p1', name: '张三' },
        { id: 'p2', name: '李四' }
      ],
      [
        { unitId: 'm1#1', materialId: 'm1', name: '笔记本', price: 5 },
        { unitId: 'm1#2', materialId: 'm1', name: '笔记本', price: 5 },
        { unitId: 'm2#1', materialId: 'm2', name: '钢笔', price: 3 }
      ],
      { 'm1#1': 'p1', 'm1#2': 'p1', 'm2#1': 'p2' }
    )
    const wb = XLSX.read(buildXlsxWorkbook(rows, 'T', '¥'), { type: 'buffer' })
    expect(wb.SheetNames).toEqual(['分配明细', '按人汇总'])
    const detail = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['分配明细'], { header: 1 })
    expect(detail[0]).toContain('物资名称')
    expect(detail.some((r) => String(r[2] ?? '') === '笔记本')).toBe(true)
    const summary = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets['按人汇总'], { header: 1 })
    // 表头 + 2 人 + 合计行
    expect(summary).toHaveLength(4)
    expect(summary[1]).toEqual([1, '张三', 2, 10])
    expect(summary[3]).toEqual(['', '合计', 3, 13])
  })
})
