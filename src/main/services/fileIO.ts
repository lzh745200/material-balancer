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
  isExcelBuffer,
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

/** 导入 / 打开文件的大小上限：在 JSON.parse、XLSX.read 前拒绝，避免主进程 OOM 或无响应 */
const MAX_INPUT_FILE_BYTES = 25 * 1024 * 1024

async function readFileLimited(file: string): Promise<Buffer> {
  const stat = await fs.promises.stat(file)
  if (!stat.isFile()) throw new Error('所选路径不是文件')
  if (stat.size > MAX_INPUT_FILE_BYTES) {
    throw new Error(
      `文件过大（${(stat.size / 1024 / 1024).toFixed(1)} MB），上限为 ${MAX_INPUT_FILE_BYTES / 1024 / 1024} MB`
    )
  }
  const buffer = await fs.promises.readFile(file)
  if (buffer.length > MAX_INPUT_FILE_BYTES) throw new Error('文件读取期间增大，已停止处理')
  return buffer
}

type SenderGuard = (event: { sender: Electron.WebContents }) => boolean

/** 覆盖已有项目前保留上一版；备份失败不阻塞主保存，但写入仍走原子路径 */
function backupExisting(file: string): void {
  try {
    if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`)
  } catch {
    // 备份是尽力而为，原子写负责目标文件完整性
  }
}

/** 项目文件运行时校验见 @shared/validate（与渲染层 loadProject 共用同一实现） */

async function readJsonProject(file: string): Promise<ProjectFile> {
  const buf = await readFileLimited(file)
  const data: unknown = JSON.parse(decodeBuffer(buf))
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

/** Excel 魔数识别见 parse.ts 的 isExcelBuffer（.xlsx=ZIP，.xls=OLE2） */

/** 从磁盘读取项目文件（对话框与按路径打开共用） */
async function openProjectFile(file: string): Promise<OpenResult> {
  try {
    return { canceled: false, path: file, data: await readJsonProject(file) }
  } catch (err) {
    return { canceled: false, path: file, error: (err as Error).message }
  }
}

/** 从磁盘解析物资表（对话框与拖拽导入共用） */
async function importMaterialsFile(file: string): Promise<ImportMaterialsResult> {
  try {
    const buffer = await readFileLimited(file)
    const parsed = isExcelBuffer(buffer)
      ? parseMaterialsXlsx(buffer)
      : parseMaterialsCsv(decodeBuffer(buffer))
    return { canceled: false, path: file, ...parsed }
  } catch (err) {
    return { canceled: false, path: file, materials: [], skipped: 0, error: (err as Error).message }
  }
}

/** 从磁盘解析人员名单（对话框与拖拽导入共用；xlsx 取第一列） */
async function importPeopleFile(file: string): Promise<ImportPeopleResult> {
  try {
    const buffer = await readFileLimited(file)
    const parsed = isExcelBuffer(buffer)
      ? parsePeopleXlsx(buffer)
      : parsePeople(decodeBuffer(buffer))
    return { canceled: false, path: file, ...parsed }
  } catch (err) {
    return { canceled: false, path: file, names: [], error: (err as Error).message }
  }
}

export function registerIpcHandlers(isTrustedSender: SenderGuard = () => true): void {
  const registerHandler = <Args extends unknown[], R>(
    channel: string,
    listener: (event: Electron.IpcMainInvokeEvent, ...args: Args) => R | Promise<R>
  ): void => {
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      if (!isTrustedSender(event)) throw new Error('拒绝来自非主窗口的请求')
      return listener(event, ...(args as Args))
    })
  }

  registerHandler(IPC.ProjectOpen, async (e): Promise<OpenResult> => {
    const res = await showOpenDialog(e, {
      title: '打开项目',
      filters: PROJECT_FILTERS,
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true }
    const result = await openProjectFile(res.filePaths[0])
    if (!result.error) pushRecent(res.filePaths[0])
    return result
  })

  registerHandler(IPC.ProjectOpenPath, async (_e, file: string): Promise<OpenResult> => {
    const result = await openProjectFile(file)
    if (!result.error) pushRecent(file)
    return result
  })

  registerHandler(
    IPC.ProjectSaveAs,
    async (e, args: { content: string; defaultName: string }): Promise<SaveResult> => {
      const res = await showSaveDialog(e, {
        title: '保存项目',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: PROJECT_FILTERS
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        backupExisting(res.filePath)
        atomicWriteFileSync(res.filePath, args.content)
        return { canceled: false, path: res.filePath }
      } catch (err) {
        return { canceled: false, error: (err as Error).message }
      }
    }
  )

  registerHandler(
    IPC.ProjectSaveToPath,
    async (_e, args: { path: string; content: string }): Promise<SaveResult> => {
      try {
        backupExisting(args.path)
        atomicWriteFileSync(args.path, args.content)
        return { canceled: false, path: args.path }
      } catch (err) {
        return { canceled: false, path: args.path, error: (err as Error).message }
      }
    }
  )

  registerHandler(IPC.ImportMaterials, async (e): Promise<ImportMaterialsResult> => {
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
    return await importMaterialsFile(res.filePaths[0])
  })

  registerHandler(IPC.ImportMaterialsFile, (_e, file: string): Promise<ImportMaterialsResult> =>
    importMaterialsFile(file)
  )

  registerHandler(IPC.ImportPeople, async (e): Promise<ImportPeopleResult> => {
    const res = await showOpenDialog(e, {
      title: '导入人员名单（txt / CSV / Excel，每行一个姓名）',
      filters: [
        { name: '名单文件', extensions: ['txt', 'csv', 'xlsx', 'xls'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true, names: [] }
    return await importPeopleFile(res.filePaths[0])
  })

  registerHandler(IPC.ImportPeopleFile, (_e, file: string): Promise<ImportPeopleResult> =>
    importPeopleFile(file)
  )

  registerHandler(IPC.DraftSave, (_e, content: string) => writeDraft(content))

  ipcMain.on(IPC.DraftSaveSync, (e, content: string) => {
    if (!isTrustedSender(e)) {
      e.returnValue = { ok: false, error: '拒绝来自非主窗口的请求' }
      return
    }
    e.returnValue = writeDraft(content)
  })

  registerHandler(IPC.DraftLoad, () => readDraft())

  registerHandler(
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
        atomicWriteFileSync(res.filePath, pdf)
        return { canceled: false, path: res.filePath }
      } catch (err) {
        return { canceled: false, error: (err as Error).message }
      }
    }
  )

  registerHandler(IPC.ExportPrint, async (_e, html: string) => {
    try {
      await printHtml(html)
      return {}
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  registerHandler(
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

  registerHandler(
    IPC.ExportXlsx,
    async (e, args: { data: Uint8Array; defaultName: string }): Promise<SaveResult> => {
      const res = await showSaveDialog(e, {
        title: '导出 Excel',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }]
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        atomicWriteFileSync(res.filePath, Buffer.from(args.data))
        return { canceled: false, path: res.filePath }
      } catch (err) {
        return { canceled: false, error: (err as Error).message }
      }
    }
  )

  registerHandler(IPC.ExportTemplate, async (e): Promise<SaveResult> => {
    const res = await showSaveDialog(e, {
      title: '下载导入模板',
      defaultPath: path.join(app.getPath('documents'), '导入模板.xlsx'),
      filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }]
    })
    if (res.canceled || !res.filePath) return { canceled: true }
    try {
      atomicWriteFileSync(res.filePath, buildTemplateWorkbook())
      return { canceled: false, path: res.filePath }
    } catch (err) {
      return { canceled: false, error: (err as Error).message }
    }
  })

  registerHandler(IPC.RevealPath, (_e, p: string) => {
    if (p && fs.existsSync(p)) shell.showItemInFolder(p)
  })

  registerHandler(IPC.RecentsList, () => listRecents())

  registerHandler(IPC.RecentsRemove, (_e, file: string) => removeRecent(file))
}
