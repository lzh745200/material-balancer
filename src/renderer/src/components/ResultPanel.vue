<template>
  <div class="panel result-panel">
    <div class="panel-title">
      分配结果
      <span class="muted" v-if="store.activeScheme">{{ strategyLabel }}</span>
      <div class="actions">
        <el-dropdown trigger="click" @command="onGenerate">
          <el-button type="primary" size="small" :disabled="!canGenerate">
            生成分配方案
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="greedy">贪心均衡（速度快）</el-dropdown-item>
              <el-dropdown-item command="optimized">贪心 + 优化（差距最小，推荐）</el-dropdown-item>
              <el-dropdown-item command="random">随机模式（抽奖式）</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" @click="showHistory = true">方案历史（{{ store.schemes.length }}）</el-button>
        <el-button size="small" :disabled="!store.activeScheme" @click="clearScheme">清空当前方案</el-button>
      </div>
    </div>

    <StatsSummary v-if="store.stats" :stats="store.stats" />

    <el-alert
      v-if="store.activeScheme && store.isStale"
      type="warning"
      :closable="false"
      show-icon
      title="物资或人员在生成方案后发生了变化，当前方案可能已不准确，建议重新生成。"
      class="alert"
    />
    <el-alert
      v-if="store.overDiffWarning"
      type="warning"
      :closable="false"
      show-icon
      title="价值差超过平均价值的 10%：可能存在单件价值过高的物资，建议改用「贪心 + 优化」策略或拖拽手动调整。"
      class="alert"
    />

    <div class="cards" v-if="store.people.length">
      <PersonCard v-for="p in store.people" :key="p.id" :person="p" />
    </div>
    <el-empty
      v-else
      description="请先在中间一栏添加人员，再点击「生成分配方案」"
      :image-size="80"
    />

    <SchemeHistoryDialog v-model="showHistory" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import type { AutoStrategy } from '@/algorithms'
import { STRATEGY_LABELS } from '@shared/types'
import { useProjectStore } from '@/stores/project'
import { formatMoney } from '@/utils/format'
import StatsSummary from './StatsSummary.vue'
import PersonCard from './PersonCard.vue'
import SchemeHistoryDialog from './dialogs/SchemeHistoryDialog.vue'

const store = useProjectStore()
const showHistory = ref(false)

const canGenerate = computed(() => store.people.length > 0 && store.materials.length > 0)
const strategyLabel = computed(() =>
  store.activeScheme ? `当前：${store.activeScheme.name} · ${STRATEGY_LABELS[store.activeScheme.strategy]}` : ''
)

async function onGenerate(strategy: AutoStrategy): Promise<void> {
  try {
    store.generateAllocation(strategy)
  } catch (err) {
    ElMessage.error((err as Error).message)
    return
  }
  const stats = store.stats
  if (stats) {
    ElMessage.success(
      `方案已生成：最大差值 ${formatMoney(stats.diff, store.currency)}（平均 ${formatMoney(stats.avg, store.currency)}）`
    )
  }
  if (store.overDiffWarning) {
    ElMessageBox.alert(
      '当前方案的价值差仍超过平均价值的 10%。可能原因：某件物资价值远高于人均水平，物理上无法进一步均衡；' +
        '可尝试改用「贪心 + 优化」策略，或直接拖拽物资手动调整。',
      '建议调整',
      { confirmButtonText: '知道了', type: 'warning' }
    ).catch(() => undefined)
  }
}

function clearScheme(): void {
  ElMessageBox.confirm('确定清空当前方案的所有分配结果吗？（可通过 Ctrl+Z 撤销）', '清空方案', {
    confirmButtonText: '清空',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => store.clearActiveScheme())
    .catch(() => undefined)
}
</script>

<style scoped>
.result-panel {
  display: flex;
  flex-direction: column;
}
.panel-title .actions {
  display: flex;
  gap: 6px;
  align-items: center;
}
.alert {
  margin-bottom: 8px;
}
.cards {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 8px;
  align-content: start;
}
</style>
