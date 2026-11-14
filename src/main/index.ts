import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { IPC } from '@shared/types'
import { registerIpcHandlers } from './services/fileIO'
import { buildAppMenu } from './menu'
import { isAllowedRendererUrl } from './security'

/**
 * 麒麟 V10 等旧内核发行版的启动兜底：
 * chrome-sandbox 不存在或缺少 SUID 位（4755）时，Chromium 会直接拒绝启动。
 * 此时自动降级为无沙箱模式（应用完全离线，风险可控），
 * 而不是弹一个用户看不懂的 FATAL 报错。以 root 运行时也必须降级。
 */
if (process.platform === 'linux') {
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0
  const helper = path.join(path.dirname(process.execPath), 'chrome-sandbox')
  let sandboxOk = false
  try {
    const st = fs.statSync(helper)
    sandboxOk = (st.mode & 0o4000) !== 0 && st.uid === 0
  } catch {
    // 助手不存在同样视为不可用
  }
  if (isRoot || !sandboxOk) {
    app.commandLine.appendSwitch('no-sandbox')
    app.commandLine.appendSwitch('disable-setuid-sandbox')
    console.warn('[main] SUID 沙箱不可用，已自动降级为 no-sandbox 模式启动')
  }
  // 老旧 GPU（部分麒麟 ARM 机型）白屏时的软件渲染逃生开关：MB_DISABLE_GPU=1
  if (process.env.MB_DISABLE_GPU === '1') app.disableHardwareAcceleration()
}

/** 每个渲染窗口独立的「有未保存修改」标志，避免多窗口互相覆盖关窗保护状态 */
const rendererDirtyByContents = new Map<number, boolean>()
/** 仅主窗口 WebContents 可使用特权 IPC（隐藏的打印窗口不应具备项目读写能力） */
const trustedMainContents = new Set<number>()

const rendererEntryFile = path.join(__dirname, '../renderer/index.html')
const rendererEntryUrl = pathToFileURL(rendererEntryFile).href

function isTrustedRenderer(sender: Electron.WebContents): boolean {
  try {
    return (
      trustedMainContents.has(sender.id) &&
      isAllowedRendererUrl(sender.getURL(), {
        expectedUrl: rendererEntryUrl,
        devBase: process.env.ELECTRON_RENDERER_URL
      })
    )
  } catch {
    return false
  }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    title: '物资均衡分配工具',
    show: false,
    backgroundColor: '#f5f7fa',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })
  const contentsId = win.webContents.id
  trustedMainContents.add(contentsId)
  win.on('ready-to-show', () => win.show())
  buildAppMenu(win)

  // 离线工具：只允许应用自身页面，禁止新窗口、外部跳转与重定向替换文档
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  const blockUntrustedNavigation = (e: Electron.Event, navigationUrl: string): void => {
    const allowed = isAllowedRendererUrl(navigationUrl, {
      expectedUrl: rendererEntryUrl,
      devBase: process.env.ELECTRON_RENDERER_URL
    })
    if (!allowed) e.preventDefault()
  }
  win.webContents.on('will-navigate', blockUntrustedNavigation)
  win.webContents.on('will-redirect', blockUntrustedNavigation)

  // 未保存时弹确认；确认退出后走正常 close 流程，
  // 渲染层 beforeunload 的同步草稿兜底会在此期间完成写入
  let forceClose = false
  win.on('close', (e) => {
    if (forceClose || rendererDirtyByContents.get(contentsId) !== true) return
    e.preventDefault()
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      title: '未保存的修改',
      message: '当前项目有未保存的修改。',
      detail: '退出前会自动保留一份本地草稿，下次打开可恢复；如果草稿写入失败，应用会取消本次关闭并提示原因。',
      buttons: ['退出并保留草稿', '取消'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    })
    if (choice === 0) {
      forceClose = true
      win.close()
    }
  })
  // 渲染层同步草稿写失败时会阻止卸载；撤销强制关闭标记，避免下次关闭绕过确认
  win.webContents.on('will-prevent-unload', () => {
    forceClose = false
  })
  win.webContents.on('did-finish-load', () => {
    rendererDirtyByContents.delete(contentsId)
  })
  win.webContents.on('destroyed', () => {
    rendererDirtyByContents.delete(contentsId)
    trustedMainContents.delete(contentsId)
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  return win
}

// 界面操作通过窗口内工具栏与应用菜单（Ctrl+N/O/S/P）完成

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  ipcMain.on(IPC.ProjectDirtyChanged, (e, dirty: unknown) => {
    if (!isTrustedRenderer(e.sender)) {
      rendererDirtyByContents.delete(e.sender.id)
      return
    }
    rendererDirtyByContents.set(e.sender.id, dirty === true)
  })

  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    registerIpcHandlers((e) => isTrustedRenderer(e.sender))
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}
