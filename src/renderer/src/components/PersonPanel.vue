<template>
  <div class="panel">
    <div class="panel-title">
      人员列表
      <span class="muted">{{ store.people.length }} 人</span>
    </div>

    <div class="add-row">
      <el-input
        v-model="name"
        placeholder="输入姓名后回车"
        size="small"
        clearable
        @keydown.enter="add"
      />
      <el-button type="primary" size="small" @click="add">添加</el-button>
    </div>

    <div class="table-wrap">
      <el-table :data="store.people" size="small" height="100%" empty-text="暂无人员，请在上方添加或使用「导入人员」">
        <el-table-column type="index" label="序号" width="44" align="center" />
        <el-table-column label="姓名" min-width="80">
          <template #default="{ row }">
            <el-input v-if="editingId === row.id" v-model="draftName" size="small" @keydown.enter="saveEdit(row)" />
            <span v-else class="ellipsis" :title="row.name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="118" align="center">
          <template #default="{ row, $index }">
            <template v-if="editingId === row.id">
              <el-button link type="primary" size="small" @click="saveEdit(row)">保存</el-button>
              <el-button link size="small" @click="cancelEdit">取消</el-button>
            </template>
            <template v-else>
              <el-button link type="primary" size="small" @click="startEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="store.removePerson(row.id)">删除</el-button>
              <el-button link size="small" :disabled="$index === 0" @click="store.movePerson(row.id, -1)">↑</el-button>
              <el-button link size="small" :disabled="$index === store.people.length - 1" @click="store.movePerson(row.id, 1)">↓</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Person } from '@shared/types'
import { useProjectStore } from '@/stores/project'

const store = useProjectStore()
const name = ref('')
const editingId = ref<string | null>(null)
const draftName = ref('')

function add(): void {
  const trimmed = name.value.trim()
  if (!trimmed) {
    ElMessage.warning('请填写姓名')
    return
  }
  try {
    store.addPerson(trimmed)
  } catch (err) {
    ElMessage.error((err as Error).message)
    return
  }
  name.value = ''
}

function startEdit(row: Person): void {
  editingId.value = row.id
  draftName.value = row.name
}

function cancelEdit(): void {
  editingId.value = null
}

function saveEdit(row: Person): void {
  if (!draftName.value.trim()) {
    ElMessage.warning('姓名不能为空')
    return
  }
  try {
    store.renamePerson(row.id, draftName.value)
  } catch (err) {
    ElMessage.error((err as Error).message)
    return
  }
  editingId.value = null
}
</script>

<style scoped>
.add-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.add-row .el-input {
  flex: 1;
}
.ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
