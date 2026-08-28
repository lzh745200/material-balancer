import { app, BrowserWindow } from 'electron'
import { pathToFileURL } from 'url'
import * as fs from 'fs'
import * as path from 'path'

/**
 * PDF 生成与打印：用隐藏 BrowserWindow 渲染 A4 HTML 模板，
 * 复用 Chromium 排版引擎，中文字体由「内置字体 + 系统字体回退」保证。
 */

const PRINT_FONT_CANDIDATES = ['NotoSansSC-Regular.otf', 'NotoSansSC-Regular.ttf']

/** 内置中文字体的 @font-face 注入片段；未随包携带字体时返回空串（走系统字体回退） */
export function fontFaceStyle(): string {
  const dir = app.isPackaged
    ? path.join(process.resourcesPath, 'fonts')
    : path.join(app.getAppPath(), 'resources', 'fonts')
  for (const name of PRINT_FONT_CANDIDATES) {
    const file = path.join(dir, name)
    if (fs.existsSync(file)) {
      const url = pathToFileURL(file).href
      return `<style>
@font-face{font-family:'NotoSansSC';src:url('${url}') format('${name.endsWith('.otf') ? 'opentype' : 'truetype'}');font-weight:normal;font-style:normal;}
body{font-family:'NotoSansSC','Microsoft YaHei','Noto Sans CJK SC','WenQuanYi Micro Hei',sans-serif !important;}
</style>`
    }
  }
  return ''
}

async function renderToHiddenWindow(html: string): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, offscreen: false }
  })
  const tmp = path.join(app.getPath('temp'), 'material-balancer-print.html')
  fs.writeFileSync(tmp, html.replace('<!--FONT_INJECT-->', fontFaceStyle()), 'utf-8')
  await win.loadFile(tmp)
  // 等待布局与字体渲染稳定
  await new Promise((r) => setTimeout(r, 300))
  return win
}

/** 生成 A4 PDF 字节流（页面边距由模板 CSS 的 @page 控制） */
export async function generatePdf(html: string): Promise<Buffer> {
  const win = await renderToHiddenWindow(html)
  try {
    return await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
  } finally {
    win.destroy()
  }
}

/** 调起系统打印对话框（复用同一份 A4 模板） */
export async function printHtml(html: string): Promise<void> {
  const win = await renderToHiddenWindow(html)
  try {
    await new Promise<void>((resolve, reject) => {
      win.webContents.print({ silent: false, printBackground: true }, (success, reason) => {
        if (success || reason === 'cancelled' || reason === 'NotaMemberOfAppGroup') resolve()
        else reject(new Error(reason || '打印失败'))
      })
    })
  } finally {
    win.destroy()
  }
}
