import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/** 草稿自动保存（userData/draft.mproj.json），失败不致命。 */

function draftPath(): string {
  return path.join(app.getPath('userData'), 'draft.mproj.json')
}

/** content 为空字符串时删除草稿 */
export function writeDraft(content: string): void {
  try {
    if (!content) {
      if (fs.existsSync(draftPath())) fs.unlinkSync(draftPath())
      return
    }
    fs.mkdirSync(path.dirname(draftPath()), { recursive: true })
    fs.writeFileSync(draftPath(), content, 'utf-8')
  } catch {
    // 草稿写失败不影响主流程
  }
}

export function readDraft(): string | null {
  try {
    return fs.existsSync(draftPath()) ? fs.readFileSync(draftPath(), 'utf-8') : null
  } catch {
    return null
  }
}
