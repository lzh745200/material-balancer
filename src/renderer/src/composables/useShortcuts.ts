import { onBeforeUnmount, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project'

/** 全局快捷键：Ctrl+Z 撤销、Ctrl+Y / Ctrl+Shift+Z 重做。输入框内交给系统文本撤销。 */
export function useShortcuts(): void {
  const store = useProjectStore()

  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    // 按住不放只触发一次，防止穿透 50 层撤销历史
    if (e.repeat) return
    const key = e.key.toLowerCase()
    const inEditable = (e.target as HTMLElement | null)?.closest?.('input, textarea')
    if (key === 'z' && !e.shiftKey) {
      if (inEditable) return
      e.preventDefault()
      store.undo()
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      if (inEditable) return
      e.preventDefault()
      store.redo()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
}
