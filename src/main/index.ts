import { app, BrowserWindow, Menu } from 'electron'
import * as path from 'path'
import { registerIpcHandlers } from './services/fileIO'

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
  win.on('ready-to-show', () => win.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  return win
}

// 界面操作全部通过窗口内工具栏完成，隐藏英文默认菜单
Menu.setApplicationMenu(null)

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    registerIpcHandlers()
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}
