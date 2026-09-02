import * as fs from 'fs'
import * as path from 'path'

/**
 * 原子写文本文件：先写同目录临时文件再改名覆盖。
 * 避免写一半崩溃 / 断电留下截断文件（项目保存与草稿共用）。
 */
export function atomicWriteFileSync(file: string, content: string): void {
  const dir = path.dirname(file)
  fs.mkdirSync(dir, { recursive: true })
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`)
  try {
    const fd = fs.openSync(tmp, 'w')
    try {
      fs.writeFileSync(fd, content, 'utf-8')
      // 落盘后再改名：断电时不会留下 0 字节 / 截断的目标文件
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    fs.renameSync(tmp, file)
  } finally {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
    } catch {
      // 临时文件清理失败不影响结果
    }
  }
}
