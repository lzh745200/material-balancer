<template>
  <el-card
    class="person-card"
    shadow="hover"
    :class="{ 'drag-over': dragOver }"
    @dragover.prevent="onDragOver"
    @dragleave="dragOver = false"
    @drop.prevent="onDrop"
  >
    <template #header>
      <div class="card-head">
        <span class="name" :title="person.name">{{ person.name }}</span>
        <span class="meta">{{ stat.count }} 件 · {{ money(stat.total) }}</span>
      </div>
    </template>
    <div class="chips">
      <el-tag
        v-for="u in units"
        :key="u.unitId"
        size="small"
        class="chip"
        :title="`${u.name} 单价 ${money(u.price)}`"
        draggable="true"
        @dragstart="onDragStart($event, u)"
        @dragend="dragOver = false"
      >
        {{ u.name }} · {{ money(u.price) }}
      </el-tag>
      <span v-if="!units.length" class="empty">暂无物资，可把其他卡片的物资拖到此处</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Person, Unit } from '@shared/types'
import { useProjectStore } from '@/stores/project'
import { formatMoney } from '@/utils/format'
import { computeStats } from '@/algorithms'

const props = defineProps<{ person: Person }>()

const store = useProjectStore()
const dragOver = ref(false)

const units = computed<Unit[]>(() => store.unitsOf(props.person.id))
const stat = computed(() => {
  const stats = computeStats(store.activeAssignment, store.units, [props.person.id])
  return stats.totals[0]
})
const money = (v: number) => formatMoney(v, store.currency)

function onDragStart(e: DragEvent, unit: Unit): void {
  e.dataTransfer?.setData('text/plain', unit.unitId)
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(e: DragEvent): void {
  if (!store.activeScheme) return
  dragOver.value = true
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onDrop(e: DragEvent): void {
  dragOver.value = false
  if (!store.activeScheme) return
  const unitId = e.dataTransfer?.getData('text/plain')
  if (!unitId) return
  store.moveUnit(unitId, props.person.id)
}
</script>

<style scoped>
.person-card {
  width: 100%;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.person-card.drag-over {
  border: 1px solid #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.25);
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.card-head .name {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-head .meta {
  flex: none;
  font-size: 12px;
  color: #606266;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 24px;
}
.chip {
  cursor: grab;
  max-width: 100%;
}
.chip:active {
  cursor: grabbing;
}
.empty {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
