// 打包后钩子：给 chrome-sandbox 设置 SUID 位（4755）。
// Electron 发行包默认是 755，SUID 缺失会导致
// "The SUID sandbox helper binary was found, but is not configured correctly"
// —— 麒麟 V10 等未开启非特权 user namespace 的系统上应用直接拒绝启动。
const fs = require('fs')
const path = require('path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return
  const helper = path.join(context.appOutDir, 'chrome-sandbox')
  if (fs.existsSync(helper)) {
    fs.chmodSync(helper, 0o4755)
    console.log(`[afterPack] chrome-sandbox -> 4755 (${context.appOutDir})`)
  } else {
    console.warn('[afterPack] chrome-sandbox 不存在于打包产物中，运行时将自动降级 no-sandbox')
  }
}
