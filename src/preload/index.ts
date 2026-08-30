import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC, type Api, type MenuAction } from '@shared/types'

const api: Api = {
  openProject: () => ipcRenderer.invoke(IPC.ProjectOpen),
  openProjectByPath: (path) => ipcRenderer.invoke(IPC.ProjectOpenPath, path),
  saveProjectAs: (content, defaultName) =>
    ipcRenderer.invoke(IPC.ProjectSaveAs, { content, defaultName }),
  saveProjectToPath: (path, content) =>
    ipcRenderer.invoke(IPC.ProjectSaveToPath, { path, content }),
  importMaterials: () => ipcRenderer.invoke(IPC.ImportMaterials),
  importMaterialsFromPath: (path) => ipcRenderer.invoke(IPC.ImportMaterialsFile, path),
  importPeople: () => ipcRenderer.invoke(IPC.ImportPeople),
  importPeopleFromPath: (path) => ipcRenderer.invoke(IPC.ImportPeopleFile, path),
  saveDraft: (content) => ipcRenderer.invoke(IPC.DraftSave, content),
  saveDraftSync: (content) => {
    // 关窗兜底：同步等待主进程写完，避免窗口销毁时异步消息丢失
    ipcRenderer.sendSync(IPC.DraftSaveSync, content)
  },
  notifyDirty: (dirty) => ipcRenderer.send(IPC.ProjectDirtyChanged, dirty),
  loadDraft: () => ipcRenderer.invoke(IPC.DraftLoad),
  exportPdf: (html, defaultName) => ipcRenderer.invoke(IPC.ExportPdf, { html, defaultName }),
  printHtml: (html) => ipcRenderer.invoke(IPC.ExportPrint, html),
  exportCsv: (content, defaultName) => ipcRenderer.invoke(IPC.ExportCsv, { content, defaultName }),
  revealPath: (path) => ipcRenderer.invoke(IPC.RevealPath, path),
  listRecents: () => ipcRenderer.invoke(IPC.RecentsList),
  removeRecent: (path) => ipcRenderer.invoke(IPC.RecentsRemove, path),
  onMenuAction: (callback) => {
    const listener = (_e: Electron.IpcRendererEvent, action: MenuAction): void => callback(action)
    ipcRenderer.on(IPC.MenuAction, listener)
    return () => ipcRenderer.removeListener(IPC.MenuAction, listener)
  },
  pathForFile: (file) => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('api', api)
