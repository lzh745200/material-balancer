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
        <el-button size="small" :disabled="!store.activeScheme" @click="reoptimize">
          重新优化{{ lockedCount ? `（${lockedCount} 件已锁定）` : '' }}
        </el-button>
        <el-button v-if="lockedCount" size="small" @click="store.unlockAllUnits()">解锁全部</el-button>
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
      :title="staleText"
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

    <el-card
      v-if="store.activeScheme && unassignedUnits.length"
      class="pool"
      shadow="never"
      @dragover.prevent
      @drop.prevent="onDropToPool"
    >
      <template #header>
        <div class="pool-head">
          <span>未分配池（{{ unassignedUnits.length }} 件）</span>
          <span class="muted">可拖到下方人员卡片完成分配；把已分配的件拖回这里即取消分配</span>
        </div>
      </template>
      <div class="chips">
        <el-tag
          v-for="u in unassignedUnits"
          :key="u.unitId"
          size="small"
          class="chip"
          type="warning"
          :title="`${u.name} 单价 ${money(u.price)}`"
          draggable="true"
          @dragstart="onPoolDragStart($event, u)"
        >
          {{ u.name }} · {{ money(u.price) }}
        </el-tag>
      </div>
    </el-card>

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
import type { Unit } from '@shared/types'
import { STRATEGY_LABELS } from '@shared/types'
import { useProjectStore } from '@/stores/project'
import { useGenerate } from '@/composables/useGenerate'
import { formatMoney } from '@/utils/format'
import StatsSummary from './StatsSummary.vue'
import PersonCard from './PersonCard.vue'
import SchemeHistoryDialog from './dialogs/SchemeHistoryDialog.vue'

const store = useProjectStore()
const { generate } = useGenerate()
const showHistory = ref(false)

const canGenerate = computed(() => store.people.length > 0 && store.materials.length > 0)
const strategyLabel = computed(() =>
  store.activeScheme ? `当前：${store.activeScheme.name} · ${STRATEGY_LABELS[store.activeScheme.strategy]}` : ''
)
const staleText = computed(() =>
  store.unassignedCount > 0
    ? `当前方案未覆盖全部物资（${store.unassignedCount} 件未分配或指向已删除的人员/物资），统计与导出可能不准确，建议重新生成。`
    : '当前方案引用了已不存在的物资件（如数量被调小），建议重新生成。'
)
const lockedCount = computed(() => store.activeScheme?.lockedUnits?.length ?? 0)

/** 未分配的件（未进入方案，或指向已删除人员） */
const unassignedUnits = computed<Unit[]>(() =>
  store.units.filter((u) => {
    const owner = store.activeAssignment[u.unitId]
    if (!owner) return true
    return !store.people.some((p) => p.id === owner)
  })
)

const money = (v: number) => formatMoney(v, store.currency)

function onGenerate(strategy: AutoStrategy): void {
  generate(strategy)
}

function reoptimize(): void {
  try {
    store.reoptimizeCurrent()
  } catch (err) {
    ElMessage.error((err as Error).message)
    return
  }
  const stats = store.stats
  if (stats) {
    ElMessage.success(`已重新优化：最大差值 ${money(stats.diff)}（平均 ${money(stats.avg)}）`)
  }
}

function onPoolDragStart(e: DragEvent, unit: Unit): void {
  e.dataTransfer?.setData('text/plain', unit.unitId)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDropToPool(e: DragEvent): void {
  const unitId = e.dataTransfer?.getData('text/plain')
  if (!unitId) return
  store.moveUnit(unitId, null)
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
.pool {
  margin-bottom: 8px;
}
.pool :deep(.el-card__header) {
  padding: 6px 12px;
}
.pool :deep(.el-card__body) {
  padding: 8px 12px;
}
.pool-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
}
.pool-head .muted {
  font-weight: 400;
  font-size: 12px;
  color: #909399;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 24px;
}
.chip {
  cursor: grab;
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
