import { onBeforeUnmount, onMounted, watch } from 'vue'
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
    window.api.saveDraft(payload()).then((res) => {
      // 写失败不更新时间戳，状态栏就不会显示误导性的「已自动保存」
      if (!res?.ok) return
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      store.draftSavedAt = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    })
  }

  const onBeforeUnload = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    // 同步兜底保存：invoke 在窗口卸载时可能来不及送达，这里必须阻塞
    try {
      window.api.saveDraftSync(payload())
    } catch {
      // 最后兜底失败已无能为力
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
