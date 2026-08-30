import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import {
  IPC,
  type ImportMaterialsResult,
  type ImportPeopleResult,
  type OpenResult,
  type ProjectFile,
  type SaveResult
} from '@shared/types'
import { validateProject } from '@shared/validate'
import {
  decodeBuffer,
  isZipBuffer,
  parseMaterialsCsv,
  parseMaterialsXlsx,
  parsePeople,
  parsePeopleXlsx
} from './parse'
import { atomicWriteFileSync } from './atomic'
import { readDraft, writeDraft } from './draft'
import { generatePdf, printHtml } from './pdf'
import { listRecents, pushRecent, removeRecent } from './recents'
import { buildTemplateWorkbook } from './template'

const PROJECT_FILTERS = [
  { name: '物资分配项目', extensions: ['mproj', 'json'] },
  { name: '所有文件', extensions: ['*'] }
]

/** 项目文件运行时校验见 @shared/validate（与渲染层 loadProject 共用同一实现） */

function readJsonProject(file: string): ProjectFile {
  const buf = fs.readFileSync(file)
  const data = JSON.parse(decodeBuffer(buf))
  const project = validateProject(data)
  if (!project) throw new Error('文件格式不正确：不是有效的物资分配项目文件')
  return project
}

/** 原子写实现见 atomic.ts（避免与 draft.ts 循环引用） */

/** 有主窗口时以主窗口为父级弹对话框，否则退化为无父级调用 */
function showOpenDialog(e: Electron.IpcMainInvokeEvent, options: Electron.OpenDialogOptions) {
  const parent = BrowserWindow.fromWebContents(e.sender)
  return parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options)
}

function showSaveDialog(e: Electron.IpcMainInvokeEvent, options: Electron.SaveDialogOptions) {
  const parent = BrowserWindow.fromWebContents(e.sender)
  return parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options)
}

/** xlsx 魔数识别见 parse.ts 的 isZipBuffer */

/** 从磁盘读取项目文件（对话框与按路径打开共用） */
function openProjectFile(file: string): OpenResult {
  try {
    return { canceled: false, path: file, data: readJsonProject(file) }
  } catch (err) {
    return { canceled: false, path: file, error: (err as Error).message }
  }
}

/** 从磁盘解析物资表（对话框与拖拽导入共用） */
function importMaterialsFile(file: string): ImportMaterialsResult {
  try {
    const buffer = fs.readFileSync(file)
    const parsed = isZipBuffer(buffer)
      ? parseMaterialsXlsx(buffer)
      : parseMaterialsCsv(decodeBuffer(buffer))
    return { canceled: false, path: file, ...parsed }
  } catch (err) {
    return { canceled: false, path: file, materials: [], skipped: 0, error: (err as Error).message }
  }
}

/** 从磁盘解析人员名单（对话框与拖拽导入共用；xlsx 取第一列） */
function importPeopleFile(file: string): ImportPeopleResult {
  try {
    const buffer = fs.readFileSync(file)
    const names = isZipBuffer(buffer) ? parsePeopleXlsx(buffer) : parsePeople(decodeBuffer(buffer))
    return { canceled: false, path: file, names }
  } catch (err) {
    return { canceled: false, path: file, names: [], error: (err as Error).message }
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.ProjectOpen, async (e): Promise<OpenResult> => {
    const res = await showOpenDialog(e, {
      title: '打开项目',
      filters: PROJECT_FILTERS,
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true }
    const result = openProjectFile(res.filePaths[0])
    if (!result.error) pushRecent(res.filePaths[0])
    return result
  })

  ipcMain.handle(IPC.ProjectOpenPath, (_e, file: string): OpenResult => {
    const result = openProjectFile(file)
    if (!result.error) pushRecent(file)
    return result
  })

  ipcMain.handle(
    IPC.ProjectSaveAs,
    async (e, args: { content: string; defaultName: string }): Promise<SaveResult> => {
      const res = await showSaveDialog(e, {
        title: '保存项目',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: PROJECT_FILTERS
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        atomicWriteFileSync(res.filePath, args.content)
        return { canceled: false, path: res.filePath }
      } catch (err) {
        return { canceled: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    IPC.ProjectSaveToPath,
    async (_e, args: { path: string; content: string }): Promise<SaveResult> => {
      try {
        // 覆盖保存前留一份 .bak，写坏 / 误存时还有上一步可回退
        try {
          if (fs.existsSync(args.path)) fs.copyFileSync(args.path, `${args.path}.bak`)
        } catch {
          // 备份失败不阻塞保存
        }
        atomicWriteFileSync(args.path, args.content)
        return { canceled: false, path: args.path }
      } catch (err) {
        return { canceled: false, path: args.path, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(IPC.ImportMaterials, async (e): Promise<ImportMaterialsResult> => {
    const res = await showOpenDialog(e, {
      title: '导入物资（CSV / Excel）',
      filters: [
        { name: '表格文件', extensions: ['csv', 'xlsx', 'xls'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] }
      ],
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true, materials: [], skipped: 0 }
    return importMaterialsFile(res.filePaths[0])
  })

  ipcMain.handle(IPC.ImportMaterialsFile, (_e, file: string): ImportMaterialsResult =>
    importMaterialsFile(file)
  )

  ipcMain.handle(IPC.ImportPeople, async (e): Promise<ImportPeopleResult> => {
    const res = await showOpenDialog(e, {
      title: '导入人员名单（txt / CSV / Excel，每行一个姓名）',
      filters: [
        { name: '名单文件', extensions: ['txt', 'csv', 'xlsx', 'xls'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true, names: [] }
    return importPeopleFile(res.filePaths[0])
  })

  ipcMain.handle(IPC.ImportPeopleFile, (_e, file: string): ImportPeopleResult =>
    importPeopleFile(file)
  )

  ipcMain.handle(IPC.DraftSave, (_e, content: string) => writeDraft(content))

  ipcMain.on(IPC.DraftSaveSync, (e, content: string) => {
    e.returnValue = writeDraft(content)
  })

  ipcMain.handle(IPC.DraftLoad, () => readDraft())

  ipcMain.handle(
    IPC.ExportPdf,
    async (e, args: { html: string; defaultName: string; pageNumbers?: boolean }): Promise<SaveResult> => {
      const res = await showSaveDialog(e, {
        title: '导出 PDF',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        const pdf = await generatePdf(args.html, { pageNumbers: args.pageNumbers === true })
        fs.writeFileSync(res.filePath, pdf)
        return { canceled: false, path: res.filePath }
      } catch (err) {
        return { canceled: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(IPC.ExportPrint, async (_e, html: string) => {
    try {
      await printHtml(html)
      return {}
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC.ExportCsv,
    async (e, args: { content: string; defaultName: string }): Promise<SaveResult> => {
      const res = await showSaveDialog(e, {
        title: '导出 CSV 明细',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        // UTF-8 BOM：保证 Excel 直接打开中文不乱码
        const bom = args.content.startsWith('\uFEFF') ? '' : '\uFEFF'
        atomicWriteFileSync(res.filePath, bom + args.content)
        return { canceled: false, path: res.filePath }
      } catch (err) {
        return { canceled: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    IPC.ExportXlsx,
    async (e, args: { data: Uint8Array; defaultName: string }): Promise<SaveResult> => {
      const res = await showSaveDialog(e, {
        title: '导出 Excel',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }]
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        fs.writeFileSync(res.filePath, Buffer.from(args.data))
        return { canceled: false, path: res.filePath }
      } catch (err) {
        return { canceled: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(IPC.ExportTemplate, async (e): Promise<SaveResult> => {
    const res = await showSaveDialog(e, {
      title: '下载导入模板',
      defaultPath: path.join(app.getPath('documents'), '导入模板.xlsx'),
      filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }]
    })
    if (res.canceled || !res.filePath) return { canceled: true }
    try {
      fs.writeFileSync(res.filePath, buildTemplateWorkbook())
      return { canceled: false, path: res.filePath }
    } catch (err) {
      return { canceled: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.RevealPath, (_e, p: string) => {
    if (p && fs.existsSync(p)) shell.showItemInFolder(p)
  })

  ipcMain.handle(IPC.RecentsList, () => listRecents())

  ipcMain.handle(IPC.RecentsRemove, (_e, file: string) => removeRecent(file))
}
