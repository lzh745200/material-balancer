import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useProjectStore } from '@/stores/project'

const DEBOUNCE_MS = 1500

/**
 * 草稿自动保存：项目状态变化后防抖写入本地草稿，
 * 窗口关闭时兜底再写一次，防止意外关闭丢数据。
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
    window.api.saveDraft(payload()).then(() => {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      store.draftSavedAt = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    })
  }

  onMounted(() => {
    watch(payload, schedule)
    window.addEventListener('beforeunload', onBeforeUnload)
  })

  const onBeforeUnload = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    // 尽力而为的同步兜底保存
    window.api.saveDraft(payload())
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
    window.removeEventListener('beforeunload', onBeforeUnload)
  })
}
