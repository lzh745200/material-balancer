// 打包后钩子（linux）：
// 1. chrome-sandbox 补 SUID 位（4755）——Electron 发行包默认 755，SUID 缺失会导致
//    "The SUID sandbox helper binary was found, but is not configured correctly"，
//    麒麟 V10 等未开启非特权 user namespace 的系统上应用直接拒绝启动。
// 2. 复制应用图标与一键安装脚本 install.sh 到包根目录，
//    供不依赖系统安装器的绿色安装使用（麒麟自带 deb 安装器解析第三方包可能崩溃）。
const fs = require('fs')
const path = require('path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return
  const dir = context.appOutDir

  const helper = path.join(dir, 'chrome-sandbox')
  if (fs.existsSync(helper)) {
    fs.chmodSync(helper, 0o4755)
    console.log(`[afterPack] chrome-sandbox -> 4755 (${dir})`)
  } else {
    console.warn('[afterPack] chrome-sandbox 不存在于打包产物中，运行时将自动降级 no-sandbox')
  }

  // 图标：resources/icon.png 供 install.sh 写桌面快捷方式使用
  const iconSrc = path.join(context.packager.projectDir, 'build', 'icon.png')
  if (fs.existsSync(iconSrc)) {
    fs.mkdirSync(path.join(dir, 'resources'), { recursive: true })
    fs.copyFileSync(iconSrc, path.join(dir, 'resources', 'icon.png'))
  }

  // 一键安装脚本
  const scriptSrc = path.join(context.packager.projectDir, 'build', 'install.sh')
  if (fs.existsSync(scriptSrc)) {
    const dest = path.join(dir, 'install.sh')
    fs.copyFileSync(scriptSrc, dest)
    try {
      fs.chmodSync(dest, 0o755)
    } catch {
      // Windows 本地无 exec 位概念，CI Linux 上生效
    }
  }
}
