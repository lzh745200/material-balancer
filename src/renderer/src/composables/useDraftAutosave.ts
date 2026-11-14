import { onBeforeUnmount, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/project'

const DEBOUNCE_MS = 1500

/**
 * 草稿自动保存：项目状态变化后防抖写入本地草稿，
 * 窗口关闭时同步兜底再写一次，防止意外关闭丢数据。
 * 同时把 dirty 状态上报主进程，用于关窗确认。
 */
export function useDraftAutosave(): void {
  const store = useProjectStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  const payload = () => JSON.stringify(store.exportProject())

  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, DEBOUNCE_MS)
  }

  const flush = () => {
    timer = null
    // 仅在确有未保存修改时写崩溃恢复草稿；已保存则无需草稿，
    // 也消除「保存后仍有待发定时器把草稿写回」的竞态
    if (!store.dirty) return
    window.api.saveDraft(payload()).then((res) => {
      // 写失败不更新时间戳，状态栏就不会显示误导性的「已自动保存」
      if (!res?.ok) return
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      store.draftSavedAt = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    })
  }

  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!store.dirty) return
    // 同步兜底保存：invoke 在窗口卸载时可能来不及送达，这里必须阻塞
    try {
      const res = window.api.saveDraftSync(payload())
      if (!res?.ok) throw new Error(res?.error || '未知错误')
    } catch (err) {
      // 草稿写失败时取消本次卸载，避免主进程已确认「保留草稿」却实际丢失
      e.preventDefault()
      e.returnValue = ''
      ElMessage.error(`草稿保存失败，已取消关闭：${(err as Error).message}`)
    }
  }

  onMounted(() => {
    watch(payload, schedule)
    watch(
      () => store.dirty,
      (dirty) => window.api.notifyDirty(dirty),
      { immediate: true }
    )
    window.addEventListener('beforeunload', onBeforeUnload)
  })

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
    window.removeEventListener('beforeunload', onBeforeUnload)
  })
}
