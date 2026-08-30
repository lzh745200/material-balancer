<template>
  <div class="statusbar">
    <span class="file" :title="store.filePath ?? ''">
      {{ store.filePath ? store.filePath : '未保存的新项目' }}
      <i v-if="store.dirty" class="dirty">● 未保存</i>
    </span>
    <span v-if="store.draftSavedAt" class="draft">草稿已自动保存 {{ store.draftSavedAt }}</span>
    <span class="spacer" />
    <span>物资 {{ store.materials.length }} 种 / {{ store.unitCount }} 件</span>
    <span v-if="store.unitTruncated" class="warn-text">⚠ 件数超上限，分配与统计已按 {{ store.units.length }} 件截断</span>
    <el-divider direction="vertical" />
    <span>总价值 {{ money(store.totalValue) }}</span>
    <el-divider direction="vertical" />
    <span>人员 {{ store.people.length }} 人</span>
    <template v-if="store.stats">
      <el-divider direction="vertical" />
      <span>
        当前方案最大差值
        <b :class="{ warn: store.overDiffWarning }">{{ money(store.stats.diff) }}</b>
      </span>
      <template v-if="store.unassignedCount > 0">
        <el-divider direction="vertical" />
        <span class="warn-text">未分配 {{ store.unassignedCount }} 件</span>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import { formatMoney } from '@/utils/format'

const store = useProjectStore()
const money = (v: number) => formatMoney(v, store.currency)
</script>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  font-size: 12px;
  color: #606266;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}
.file {
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dirty {
  color: #e6a23c;
  font-style: normal;
  margin-left: 4px;
}
.draft {
  color: #909399;
}
.spacer {
  flex: 1;
}
b.warn {
  color: #e6a23c;
}
.warn-text {
  color: #e6a23c;
}
</style>
