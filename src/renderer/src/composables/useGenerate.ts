import { ElMessage } from 'element-plus'
import type { AutoStrategy } from '@/algorithms'
import { useProjectStore } from '@/stores/project'
import { formatMoney } from '@/utils/format'

/**
 * 生成方案并统一反馈。工具栏与结果面板共用，
 * 避免「生成 + 提示」逻辑在两处漂移（此前超差提示会重复弹两次）。
 */
export function useGenerate(): {
  generate: (strategy: AutoStrategy) => boolean
} {
  const store = useProjectStore()

  const generate = (strategy: AutoStrategy): boolean => {
    try {
      store.generateAllocation(strategy)
    } catch (err) {
      ElMessage.error((err as Error).message || '生成方案失败')
      return false
    }
    const stats = store.stats
    if (stats) {
      ElMessage.success(
        `方案已生成：最大差值 ${formatMoney(stats.diff, store.currency)}（平均 ${formatMoney(stats.avg, store.currency)}）`
      )
    }
    // 超差详情由结果面板的常驻 alert 呈现，这里只提醒一次，不再弹模态框
    if (store.overDiffWarning) {
      ElMessage.warning('价值差仍超过平均价值的 10%，可能存在单件价值过高的物资，建议手动微调。')
    }
    return true
  }

  return { generate }
}
