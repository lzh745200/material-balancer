<template>
  <div class="stats" v-if="stats">
    <div class="stat">
      <label>平均价值</label>
      <b>{{ money(stats.avg) }}</b>
    </div>
    <div class="stat">
      <label>最高价值</label>
      <b>{{ money(stats.max) }}</b>
    </div>
    <div class="stat">
      <label>最低价值</label>
      <b>{{ money(stats.min) }}</b>
    </div>
    <div class="stat">
      <label>最大差值</label>
      <b :class="{ warn: overDiff }">{{ money(stats.diff) }}</b>
    </div>
    <div class="stat">
      <label>标准差</label>
      <b>{{ money(stats.std) }}</b>
    </div>
    <div v-if="stats.unassignedCount > 0" class="stat">
      <label>未分配件数</label>
      <b class="warn">{{ stats.unassignedCount }}</b>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GlobalStats } from '@/algorithms'
import { useProjectStore } from '@/stores/project'
import { formatMoney } from '@/utils/format'

const props = defineProps<{ stats: GlobalStats }>()

const store = useProjectStore()
const money = (v: number) => formatMoney(v, store.currency)
const overDiff = computed(() => store.overDiffWarning)
</script>

<style scoped>
.stats {
  display: flex;
  gap: 20px;
  padding: 8px 10px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat label {
  font-size: 12px;
  color: #909399;
}
.stat b {
  font-size: 14px;
}
.stat b.warn {
  color: #e6a23c;
}
</style>
