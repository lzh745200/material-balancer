import * as XLSX from 'xlsx'

/**
 * 导入模板工作簿：物资表 + 人员名单两个 sheet，附示例数据。
 * 用户下载后按列填写即可直接导入。
 */
export function buildTemplateWorkbook(): Buffer {
  const materials = XLSX.utils.aoa_to_sheet([
    ['物资名称', '单价', '数量'],
    ['笔记本', 5, 10],
    ['签字笔', 3, 20],
    ['文件袋', 2.5, 15]
  ])
  materials['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 8 }]

  const people = XLSX.utils.aoa_to_sheet([
    ['姓名'],
    ['张三'],
    ['李四'],
    ['王五']
  ])
  people['!cols'] = [{ wch: 16 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, materials, '物资表')
  XLSX.utils.book_append_sheet(wb, people, '人员名单')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
