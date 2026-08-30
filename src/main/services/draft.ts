import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { atomicWriteFileSync } from './atomic'

/** 草稿自动保存（userData/draft.mproj.json），失败不致命但要如实上报。 */

export interface DraftWriteResult {
  ok: boolean
  error?: string
}

function draftPath(): string {
  return path.join(app.getPath('userData'), 'draft.mproj.json')
}

/** content 为空字符串时删除草稿 */
export function writeDraft(content: string): DraftWriteResult {
  try {
    if (!content) {
      if (fs.existsSync(draftPath())) fs.unlinkSync(draftPath())
      return { ok: true }
    }
    atomicWriteFileSync(draftPath(), content)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

/**
 * 读取草稿。内容无法解析为 JSON 时视为损坏：删除并返回 null，
 * 避免渲染层反复弹恢复提示，也避免半截 JSON 被当项目加载。
 */
export function readDraft(): string | null {
  try {
    if (!fs.existsSync(draftPath())) return null
    const content = fs.readFileSync(draftPath(), 'utf-8')
    try {
      JSON.parse(content)
    } catch {
      try {
        fs.unlinkSync(draftPath())
      } catch {
        // 删除失败不影响返回
      }
      return null
    }
    return content
  } catch {
    return null
  }
}
