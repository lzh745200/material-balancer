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
import { decodeBuffer, parseMaterialsCsv, parseMaterialsXlsx, parsePeople } from './parse'
import { readDraft, writeDraft } from './draft'
import { generatePdf, printHtml } from './pdf'

const PROJECT_FILTERS = [
  { name: '物资分配项目', extensions: ['mproj', 'json'] },
  { name: '所有文件', extensions: ['*'] }
]

/** 校验并规范化项目文件（打开外部 / 旧文件时防御性处理） */
export function validateProject(raw: unknown): ProjectFile | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.materials) || !Array.isArray(o.people)) return null
  return {
    version: 1,
    title: typeof o.title === 'string' ? o.title : '物资分配领取表',
    remark: typeof o.remark === 'string' ? o.remark : '',
    currency: typeof o.currency === 'string' && o.currency ? o.currency : '¥',
    materials: (o.materials as ProjectFile['materials']).filter(
      (m) => m && typeof m.id === 'string' && typeof m.name === 'string' && Number.isFinite(m.price)
    ),
    people: (o.people as ProjectFile['people']).filter(
      (p) => p && typeof p.id === 'string' && typeof p.name === 'string'
    ),
    schemes: Array.isArray(o.schemes)
      ? (o.schemes as ProjectFile['schemes']).filter(
          (s) => s && typeof s.id === 'string' && typeof s.assignment === 'object'
        )
      : [],
    activeSchemeId: typeof o.activeSchemeId === 'string' ? o.activeSchemeId : null
  }
}

function readJsonProject(file: string): ProjectFile {
  const buf = fs.readFileSync(file)
  const data = JSON.parse(decodeBuffer(buf))
  const project = validateProject(data)
  if (!project) throw new Error('文件格式不正确：不是有效的物资分配项目文件')
  return project
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.ProjectOpen, async (e): Promise<OpenResult> => {
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, {
      title: '打开项目',
      filters: PROJECT_FILTERS,
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true }
    try {
      return { canceled: false, path: res.filePaths[0], data: readJsonProject(res.filePaths[0]) }
    } catch (err) {
      return { canceled: false, path: res.filePaths[0], error: (err as Error).message }
    }
  })

  ipcMain.handle(
    IPC.ProjectSaveAs,
    async (e, args: { content: string; defaultName: string }): Promise<SaveResult> => {
      const res = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender)!, {
        title: '保存项目',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: PROJECT_FILTERS
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        fs.writeFileSync(res.filePath, args.content, 'utf-8')
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
        fs.writeFileSync(args.path, args.content, 'utf-8')
        return { canceled: false, path: args.path }
      } catch (err) {
        return { canceled: false, path: args.path, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(IPC.ImportMaterials, async (e): Promise<ImportMaterialsResult> => {
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, {
      title: '导入物资（CSV / Excel）',
      filters: [
        { name: '表格文件', extensions: ['csv', 'xlsx', 'xls'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] }
      ],
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true, materials: [], skipped: 0 }
    const file = res.filePaths[0]
    try {
      const buffer = fs.readFileSync(file)
      const parsed = /\.(xlsx|xls)$/i.test(file) ? parseMaterialsXlsx(buffer) : parseMaterialsCsv(decodeBuffer(buffer))
      return { canceled: false, path: file, ...parsed }
    } catch (err) {
      return { canceled: false, path: file, materials: [], skipped: 0, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.ImportPeople, async (e): Promise<ImportPeopleResult> => {
    const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, {
      title: '导入人员名单（txt / CSV，每行一个姓名）',
      filters: [
        { name: '文本文件', extensions: ['txt', 'csv'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (res.canceled || res.filePaths.length === 0) return { canceled: true, names: [] }
    try {
      const names = parsePeople(decodeBuffer(fs.readFileSync(res.filePaths[0])))
      return { canceled: false, path: res.filePaths[0], names }
    } catch (err) {
      return { canceled: false, path: res.filePaths[0], names: [], error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC.DraftSave, (_e, content: string) => {
    writeDraft(content)
  })

  ipcMain.handle(IPC.DraftLoad, () => readDraft())

  ipcMain.handle(
    IPC.ExportPdf,
    async (e, args: { html: string; defaultName: string }): Promise<SaveResult> => {
      const res = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender)!, {
        title: '导出 PDF',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        const pdf = await generatePdf(args.html)
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
      const res = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender)!, {
        title: '导出 CSV 明细',
        defaultPath: path.join(app.getPath('documents'), args.defaultName),
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      try {
        // UTF-8 BOM：保证 Excel 直接打开中文不乱码
        const bom = args.content.startsWith('\uFEFF') ? '' : '\uFEFF'
        fs.writeFileSync(res.filePath, bom + args.content, 'utf-8')
        return { canceled: false, path: res.filePath }
      } catch (err) {
        return { canceled: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(IPC.RevealPath, (_e, p: string) => {
    if (p && fs.existsSync(p)) shell.showItemInFolder(p)
  })
}
