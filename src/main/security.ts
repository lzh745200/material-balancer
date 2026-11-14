export interface RendererUrlOptions {
  /** 生产环境允许加载的 renderer 入口文件 URL */
  expectedUrl: string
  /** 开发服务器地址（存在时按 origin + 路径前缀校验） */
  devBase?: string | null
  /** 测试可注入；默认使用当前平台 */
  platform?: NodeJS.Platform
}

/**
 * 判断 URL 是否指向应用自身的渲染页面。
 * - Windows 文件路径不区分大小写，需归一化盘符与目录大小写；
 * - 开发模式按 origin + pathname 比较，不能使用字符串前缀（防止 localhost:5173.evil 混淆）。
 */
export function isAllowedRendererUrl(raw: string, options: RendererUrlOptions): boolean {
  try {
    const target = new URL(raw)
    if (options.devBase) {
      const base = new URL(options.devBase)
      const pathOk = base.pathname.endsWith('/')
        ? target.pathname.startsWith(base.pathname)
        : target.pathname === base.pathname
      return target.origin === base.origin && pathOk
    }

    const expected = new URL(options.expectedUrl)
    const platform = options.platform ?? process.platform
    const normalize = (p: string): string => (platform === 'win32' ? p.toLowerCase() : p)
    return (
      target.protocol === expected.protocol &&
      // file:///C:/... 的 host 为空；不接受 file://远程主机/C:/... 的 UNC 变体
      target.host === expected.host &&
      normalize(target.pathname) === normalize(expected.pathname)
    )
  } catch {
    return false
  }
}
