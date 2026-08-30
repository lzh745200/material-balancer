import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { atomicWriteFileSync } from './atomic'

/** 最近打开的项目文件（userData/recents.json，最新在前，最多 10 条）。 */

const MAX_RECENTS = 10

function recentsPath(): string {
  return path.join(app.getPath('userData'), 'recents.json')
}

function readRecents(): string[] {
  try {
    const raw = fs.readFileSync(recentsPath(), 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p): p is string => typeof p === 'string')
  } catch {
    return []
  }
}

function writeRecents(list: string[]): void {
  try {
    atomicWriteFileSync(recentsPath(), JSON.stringify(list, null, 2))
  } catch {
    // 最近列表写失败不影响主流程
  }
}

export function listRecents(): string[] {
  return readRecents()
}

/** 记录一次成功打开；去重后置顶，超限截断 */
export function pushRecent(file: string): string[] {
  const next = [file, ...readRecents().filter((p) => p !== file)].slice(0, MAX_RECENTS)
  writeRecents(next)
  return next
}

export function removeRecent(file: string): string[] {
  const next = readRecents().filter((p) => p !== file)
  writeRecents(next)
  return next
}
