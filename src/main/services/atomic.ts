import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 原子写文本文件：先写同目录临时文件再改名覆盖。
 * 避免写一半崩溃 / 断电留下截断文件（项目保存与草稿共用）。
 */
export function atomicWriteFileSync(file: string, content: string | Uint8Array): void {
  const dir = path.dirname(file)
  fs.mkdirSync(dir, { recursive: true })
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`)
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
    // POSIX 下 rename 的目录项也需落盘；部分文件系统不支持目录 fsync，失败不改变已成功的写入结果
    if (process.platform !== 'win32') {
      let dirFd: number | null = null
      try {
        dirFd = fs.openSync(dir, 'r')
        fs.fsyncSync(dirFd)
      } catch {
        // 目录持久化是增强项，部分挂载点不允许 fsync 目录
      } finally {
        if (dirFd !== null) {
          try {
            fs.closeSync(dirFd)
          } catch {
            // 忽略关闭失败
          }
        }
      }
    }
  } finally {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
    } catch {
      // 临时文件清理失败不影响结果
    }
  }
}
