<template>
  <el-dialog v-model="visible" title="方案历史" width="760px" :close-on-click-modal="false">
    <el-table v-if="store.schemes.length" :data="reversed" size="small" max-height="440">
      <el-table-column label="方案名称" min-width="140">
        <template #default="{ row }">
          <span :class="{ active: row.id === store.activeSchemeId }">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="生成时间" width="140">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="策略" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="row.id === store.activeSchemeId ? 'success' : 'info'">
            {{ STRATEGY_LABELS[row.strategy as Strategy] ?? row.strategy }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="已分配件数" width="100" align="center">
        <template #default="{ row }">{{ assignedCount(row.assignment) }}</template>
      </el-table-column>
      <el-table-column label="最大差值" width="110" align="right">
        <template #default="{ row }">{{ money(diffOf(row.assignment)) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" align="center">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            size="small"
            :disabled="row.id === store.activeSchemeId"
            @click="switchTo(row)"
          >
            设为当前
          </el-button>
          <el-button link type="primary" size="small" @click="rename(row)">重命名</el-button>
          <el-button link type="danger" size="small" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="还没有生成过方案" :image-size="80" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AllocationScheme, Strategy } from '@shared/types'
import { STRATEGY_LABELS } from '@shared/types'
import { useProjectStore } from '@/stores/project'
import { computeStats } from '@/algorithms'
import { formatDateTime, formatMoney } from '@/utils/format'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const store = useProjectStore()
const money = (v: number) => formatMoney(v, store.currency)

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const reversed = computed(() => [...store.schemes].reverse())

function assignedCount(assignment: Record<string, string>): number {
  const map = store.unitMap
  const personIds = new Set(store.people.map((p) => p.id))
  return Object.entries(assignment).filter(([u, p]) => map.has(u) && personIds.has(p)).length
}

function diffOf(assignment: Record<string, string>): number {
  return computeStats(assignment, store.units, store.people.map((p) => p.id)).diff
}

function switchTo(row: AllocationScheme): void {
  store.switchScheme(row.id)
}

async function rename(row: AllocationScheme): Promise<void> {
  const res = await ElMessageBox.prompt('新的方案名称', '重命名', {
    inputValue: row.name,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '名称不能为空'
  }).catch(() => null)
  if (res?.value) store.renameScheme(row.id, res.value)
}

function del(row: AllocationScheme): void {
  ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '删除方案', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      store.deleteScheme(row.id)
      ElMessage.success('已删除')
    })
    .catch(() => undefined)
}
</script>

<style scoped>
.active {
  font-weight: 700;
  color: #409eff;
}
</style>
