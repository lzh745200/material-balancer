import { ElMessage, ElMessageBox } from 'element-plus'
import type { ImportMaterialsResult, ImportPeopleResult } from '@shared/types'
import { useProjectStore } from '@/stores/project'
import { useGenerate } from '@/composables/useGenerate'
import { buildPersonRows } from '@/print/rows'
import { buildPrintHtml } from '@/print/buildPrintHtml'
import { buildDetailCsv } from '@/utils/csvExport'
import { buildXlsxWorkbook } from '@/utils/xlsxExport'
import { formatDateTime } from '@/utils/format'

/**
 * 项目级用户动作（新建/打开/保存/导入/导出/打印等）。
 * 工具栏按钮、应用菜单快捷键与拖拽打开共用同一实现，保证行为一致。
 */
export function useProjectActions() {
  const store = useProjectStore()
  const { generate } = useGenerate()

  const projectJson = () => JSON.stringify(store.exportProject())

  function confirmDiscard(message: string): Promise<boolean> {
    if (!store.dirty) return Promise.resolve(true)
    return ElMessageBox.confirm(message, '提示', {
      confirmButtonText: '继续',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => true)
      .catch(() => false)
  }

  async function onNew(): Promise<void> {
    const ok = await confirmDiscard(
      '当前项目尚未保存，新建后将丢失未保存的修改（草稿仍会保留）。确定继续吗？'
    )
    if (!ok) return
    store.newProject()
  }

  async function afterOpen(res: { path?: string; error?: string }): Promise<void> {
    if (res.error) {
      ElMessage.error(res.error || '打开文件失败')
      return
    }
    ElMessage.success(`已打开：${res.path}`)
  }

  async function onOpen(): Promise<void> {
    const ok = await confirmDiscard('当前项目尚未保存，打开其他项目将丢失未保存的修改。确定继续吗？')
    if (!ok) return
    const res = await window.api.openProject()
    if (res.canceled) return
    if (res.error || !res.data) {
      ElMessage.error(res.error || '打开文件失败')
      return
    }
    try {
      store.loadProject(res.data, res.path ?? null)
    } catch (err) {
      ElMessage.error((err as Error).message || '打开文件失败')
      return
    }
    await afterOpen(res)
  }

  /** 按路径打开（最近文件 / 拖拽），失败时从最近列表移除 */
  async function onOpenByPath(path: string): Promise<void> {
    const ok = await confirmDiscard('当前项目尚未保存，打开其他项目将丢失未保存的修改。确定继续吗？')
    if (!ok) return
    const res = await window.api.openProjectByPath(path)
    if (res.error || !res.data) {
      ElMessage.error(res.error || `无法打开：${path}`)
      await window.api.removeRecent(path).catch(() => undefined)
      return
    }
    try {
      store.loadProject(res.data, res.path ?? null)
    } catch (err) {
      ElMessage.error((err as Error).message || '打开文件失败')
      return
    }
    await afterOpen(res)
  }

  async function onSave(): Promise<void> {
    if (!store.filePath) return onSaveAs()
    const res = await window.api.saveProjectToPath(store.filePath, projectJson())
    if (res.error) {
      ElMessage.error(`保存失败：${res.error}`)
      return
    }
    store.markSaved(res.path ?? store.filePath!)
    ElMessage.success('已保存')
  }

  async function onSaveAs(): Promise<void> {
    const res = await window.api.saveProjectAs(projectJson(), `${store.defaultFileName}.mproj`)
    if (res.canceled) return
    if (res.error) {
      ElMessage.error(`保存失败：${res.error}`)
      return
    }
    store.markSaved(res.path!)
    ElMessage.success(`已保存到：${res.path}`)
  }

  /** 导入结果入 store（对话框与拖拽共用） */
  function applyImportMaterials(res: ImportMaterialsResult): void {
    if (res.materials.length === 0) {
      ElMessage.warning(
        '未解析到有效数据。CSV 需要「名称,单价,数量」列（有表头或无表头均可），数量列可省略（默认 1）。'
      )
      return
    }
    const addUnits = res.materials.reduce(
      (acc, m) => acc + Math.max(1, Math.floor(m.quantity || 1)),
      0
    )
    if (store.wouldExceedUnitLimit(addUnits)) {
      ElMessage.error(`导入后物资总件数将超过上限（5000），请精简后再导入。`)
      return
    }
    try {
      store.addImportedMaterials(res.materials)
    } catch (err) {
      ElMessage.error((err as Error).message)
      return
    }
    ElMessage.success(
      `已导入 ${res.materials.length} 种物资${res.skipped > 0 ? `，跳过 ${res.skipped} 行无效数据` : ''}`
    )
    for (const w of (res.warnings ?? []).slice(0, 3)) ElMessage.warning(`解析提示：${w}`)
  }

  function applyImportPeople(res: ImportPeopleResult): void {
    if (res.names.length === 0) {
      ElMessage.warning('未解析到有效姓名。请确保文件每行一个姓名。')
      return
    }
    store.addImportedPeople(res.names)
    ElMessage.success(`已导入 ${res.names.length} 名人员（重复姓名已忽略）`)
  }

  async function onImportMaterials(): Promise<void> {
    const res = await window.api.importMaterials()
    if (res.canceled) return
    if (res.error) {
      ElMessage.error(`导入失败：${res.error}`)
      return
    }
    applyImportMaterials(res)
  }

  async function onImportMaterialsByPath(path: string): Promise<void> {
    const res = await window.api.importMaterialsFromPath(path)
    if (res.error) {
      ElMessage.error(`导入失败：${res.error}`)
      return
    }
    applyImportMaterials(res)
  }

  async function onImportPeople(): Promise<void> {
    const res = await window.api.importPeople()
    if (res.canceled) return
    if (res.error) {
      ElMessage.error(`导入失败：${res.error}`)
      return
    }
    applyImportPeople(res)
  }

  async function onImportPeopleByPath(path: string): Promise<void> {
    const res = await window.api.importPeopleFromPath(path)
    if (res.error) {
      ElMessage.error(`导入失败：${res.error}`)
      return
    }
    applyImportPeople(res)
  }

  function requireScheme(): boolean {
    if (!store.activeScheme) {
      ElMessage.warning('请先点击「生成分配方案」')
      return false
    }
    return true
  }

  async function confirmStale(): Promise<boolean> {
    if (!store.isStale) return true
    const detail =
      store.unassignedCount > 0
        ? `当前方案还有 ${store.unassignedCount} 件物资未分配（或指向已删除的人员/物资），导出内容会小于实际库存。`
        : '当前方案引用了已不存在的物资件，导出内容可能与当前物资清单不一致。'
    return ElMessageBox.confirm(`${detail}仍要继续导出吗？`, '提示', {
      confirmButtonText: '继续导出',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => true)
      .catch(() => false)
  }

  function buildHtml(): string {
    // 已排除（不参与分配）的人员不进入打印表
    const rows = buildPersonRows(
      store.people.filter((p) => p.active !== false),
      store.units,
      store.activeScheme!.assignment
    )
    return buildPrintHtml({
      title: store.title,
      remark: store.remark,
      currency: store.currency,
      rows,
      generatedAt: formatDateTime(new Date())
    })
  }

  async function onExportPdf(): Promise<void> {
    if (!requireScheme()) return
    if (!(await confirmStale())) return
    const res = await window.api.exportPdf(
      buildHtml(),
      `${store.defaultFileName}.pdf`,
      store.printPageNumbers
    )
    if (res.canceled) return
    if (res.error) {
      ElMessage.error(`导出 PDF 失败：${res.error}`)
      return
    }
    const path = res.path!
    ElMessageBox.alert(`PDF 已保存到：${path}`, '导出成功', {
      confirmButtonText: '打开所在文件夹',
      cancelButtonText: '关闭',
      distinguishCancelAndClose: true
    })
      .then(() => window.api.revealPath(path))
      .catch(() => undefined)
  }

  async function onExportXlsx(): Promise<void> {
    if (!requireScheme()) return
    if (!(await confirmStale())) return
    const rows = buildPersonRows(
      store.people.filter((p) => p.active !== false),
      store.units,
      store.activeScheme!.assignment
    )
    const data = buildXlsxWorkbook(rows, store.title, store.currency)
    const res = await window.api.exportXlsx(data, `${store.defaultFileName}.xlsx`)
    if (res.canceled) return
    if (res.error) {
      ElMessage.error(`导出 Excel 失败：${res.error}`)
      return
    }
    ElMessage.success(`Excel 已保存到：${res.path}`)
  }

  async function onDownloadTemplate(): Promise<void> {
    const res = await window.api.exportTemplate()
    if (res.canceled) return
    if (res.error) {
      ElMessage.error(`下载模板失败：${res.error}`)
      return
    }
    ElMessage.success(`模板已保存到：${res.path}`)
  }

  async function onPrint(): Promise<void> {
    if (!requireScheme()) return
    if (!(await confirmStale())) return
    const res = await window.api.printHtml(buildHtml())
    if (res?.error) ElMessage.error(`打印失败：${res.error}`)
  }

  async function onExportCsv(): Promise<void> {
    if (!requireScheme()) return
    if (!(await confirmStale())) return
    const rows = buildPersonRows(
      store.people.filter((p) => p.active !== false),
      store.units,
      store.activeScheme!.assignment
    )
    const res = await window.api.exportCsv(
      buildDetailCsv(rows, store.currency),
      `${store.defaultFileName}.csv`
    )
    if (res.canceled) return
    if (res.error) {
      ElMessage.error(`导出 CSV 失败：${res.error}`)
      return
    }
    ElMessage.success(`CSV 已保存到：${res.path}`)
  }

  return {
    generate,
    onNew,
    onOpen,
    onOpenByPath,
    onSave,
    onSaveAs,
    onImportMaterials,
    onImportMaterialsByPath,
    onImportPeople,
    onImportPeopleByPath,
    onExportPdf,
    onExportXlsx,
    onDownloadTemplate,
    onPrint,
    onExportCsv
  }
}

export type ProjectActions = ReturnType<typeof useProjectActions>

/** 应用菜单 / 快捷键动作分发（App.vue 挂载时订阅） */
export function dispatchMenuAction(action: string, actions: ProjectActions): void {
  const store = useProjectStore()
  switch (action) {
    case 'new':
      void actions.onNew()
      break
    case 'open':
      void actions.onOpen()
      break
    case 'save':
      void actions.onSave()
      break
    case 'save-as':
      void actions.onSaveAs()
      break
    case 'print':
      void actions.onPrint()
      break
    case 'undo':
      store.undo()
      break
    case 'redo':
      store.redo()
      break
  }
}
