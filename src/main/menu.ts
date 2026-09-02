import { BrowserWindow, Menu } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { IPC, type MenuAction } from '@shared/types'

/**
 * 应用菜单：提供 Ctrl+N/O/S/P 等标准快捷键。
 * 菜单项动作通过 IPC 转发给渲染层执行（数据逻辑都在渲染层 store）。
 * 撤销 / 重做不注册 accelerator：键盘由渲染层 useShortcuts 处理，
 * 避免菜单拦截后 store 撤销与文本撤销的双重触发。
 */
export function buildAppMenu(win: BrowserWindow): void {
  const send = (action: MenuAction) => (): void => {
    if (!win.isDestroyed()) win.webContents.send(IPC.MenuAction, action)
  }

  const template: MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建', accelerator: 'CmdOrCtrl+N', click: send('new') },
        { label: '打开...', accelerator: 'CmdOrCtrl+O', click: send('open') },
        { type: 'separator' },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: send('save') },
        { label: '另存为...', accelerator: 'CmdOrCtrl+Shift+S', click: send('save-as') },
        { type: 'separator' },
        { label: '打印...', accelerator: 'CmdOrCtrl+P', click: send('print') }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', click: send('undo') },
        { label: '重做', click: send('redo') },
        { type: 'separator' },
        // 标准编辑 role：注册 Ctrl+X/C/V/A 加速键，保证输入框（物资名/姓名/标题/备注）
        // 在打包版仍能剪切/复制/粘贴/全选（自定义菜单会覆盖 Chromium 默认的编辑加速键）
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
        { type: 'separator' },
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
