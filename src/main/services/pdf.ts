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

interface RenderedPrint {
  win: BrowserWindow
  /** 结束后销毁窗口并清理临时目录 */
  cleanup: () => void
}

async function renderToHiddenWindow(html: string): Promise<RenderedPrint> {
  // 每次渲染用独立临时目录，避免并发导出 / 打印时互相覆盖
  const dir = await fs.promises.mkdtemp(path.join(app.getPath('temp'), 'mb-print-'))
  const tmp = path.join(dir, 'print.html')
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, offscreen: false }
  })
  const cleanup = (): void => {
    win.destroy()
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
  try {
    await fs.promises.writeFile(tmp, html.replace('<!--FONT_INJECT-->', fontFaceStyle()), 'utf-8')
    await win.loadFile(tmp)
  } catch (err) {
    cleanup()
    throw err
  }
  // 等待字体加载完成，替代固定延时（字体未就绪会导致 PDF 走回退字体）
  await win.webContents
    .executeJavaScript('document.fonts ? document.fonts.ready.then(() => true) : true')
    .catch(() => undefined)
  // 少量余量等待排版稳定
  await new Promise((r) => setTimeout(r, 60))
  return { win, cleanup }
}

/** 生成 A4 PDF 字节流（页面边距由模板 CSS 的 @page 控制） */
export async function generatePdf(html: string): Promise<Buffer> {
  const { win, cleanup } = await renderToHiddenWindow(html)
  try {
    return await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
  } finally {
    cleanup()
  }
}

/** 调起系统打印对话框（复用同一份 A4 模板） */
export async function printHtml(html: string): Promise<void> {
  const { win, cleanup } = await renderToHiddenWindow(html)
  try {
    await new Promise<void>((resolve, reject) => {
      win.webContents.print({ silent: false, printBackground: true }, (success, reason) => {
        if (success || reason === 'cancelled') {
          resolve()
          return
        }
        // NotaMemberOfAppGroup 是 Windows 打印后端拒绝，不是用户取消，必须如实报错
        const detail =
          reason === 'NotaMemberOfAppGroup'
            ? '系统打印服务拒绝了本次打印请求（NotaMemberOfAppGroup）。可改用「导出 PDF」后手动打印。'
            : `打印失败（${reason || '未知原因'}）`
        reject(new Error(detail))
      })
    })
  } finally {
    cleanup()
  }
}
