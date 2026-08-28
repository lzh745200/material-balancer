import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type Api } from '@shared/types'

const api: Api = {
  openProject: () => ipcRenderer.invoke(IPC.ProjectOpen),
  saveProjectAs: (content, defaultName) =>
    ipcRenderer.invoke(IPC.ProjectSaveAs, { content, defaultName }),
  saveProjectToPath: (path, content) =>
    ipcRenderer.invoke(IPC.ProjectSaveToPath, { path, content }),
  importMaterials: () => ipcRenderer.invoke(IPC.ImportMaterials),
  importPeople: () => ipcRenderer.invoke(IPC.ImportPeople),
  saveDraft: (content) => ipcRenderer.invoke(IPC.DraftSave, content),
  loadDraft: () => ipcRenderer.invoke(IPC.DraftLoad),
  exportPdf: (html, defaultName) => ipcRenderer.invoke(IPC.ExportPdf, { html, defaultName }),
  printHtml: (html) => ipcRenderer.invoke(IPC.ExportPrint, html),
  exportCsv: (content, defaultName) => ipcRenderer.invoke(IPC.ExportCsv, { content, defaultName }),
  revealPath: (path) => ipcRenderer.invoke(IPC.RevealPath, path)
}

contextBridge.exposeInMainWorld('api', api)
