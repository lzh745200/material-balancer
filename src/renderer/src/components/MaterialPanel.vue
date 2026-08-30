<template>
  <div class="panel">
    <div class="panel-title">
      物资清单
      <span class="muted">{{ store.materials.length }} 种 / {{ store.unitCount }} 件 / {{ money(store.totalValue) }}</span>
    </div>

    <div class="add-row">
      <el-input
        v-model="name"
        placeholder="物资名称（必填）"
        size="small"
        clearable
        @keydown.enter="add"
      />
      <el-input-number
        v-model="price"
        :min="0.01"
        :max="99999999"
        :precision="2"
        :step="1"
        :controls="false"
        size="small"
        placeholder="单价"
        class="price-input"
      />
      <el-input-number
        v-model="quantity"
        :min="1"
        :max="9999"
        :step="1"
        controls-position="right"
        size="small"
        class="qty-input"
      />
      <el-button type="primary" size="small" @click="add">添加</el-button>
    </div>

    <div class="table-wrap">
      <el-table :data="store.materials" size="small" height="100%" empty-text="暂无物资，请在上方添加或使用「导入物资」">
        <el-table-column type="index" label="序号" width="44" align="center" />
        <el-table-column label="物资名称" min-width="110">
          <template #default="{ row }">
            <el-input v-if="editingId === row.id" v-model="draft.name" size="small" @keydown.enter="saveEdit(row)" />
            <span v-else class="ellipsis" :title="row.name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="单价" width="96" align="right">
          <template #default="{ row }">
            <el-input-number
              v-if="editingId === row.id"
              v-model="draft.price"
              :min="0.01"
              :precision="2"
              :controls="false"
              size="small"
              class="full"
            />
            <span v-else>{{ money(row.price) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="92" align="center">
          <template #default="{ row }">
            <el-input-number
              v-if="editingId === row.id"
              v-model="draft.quantity"
              :min="1"
              :max="9999"
              controls-position="right"
              size="small"
              class="full"
            />
            <span v-else>×{{ row.quantity }}</span>
          </template>
        </el-table-column>
        <el-table-column label="小计" width="88" align="right">
          <template #default="{ row }">{{ money(row.price * row.quantity) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="128" align="center">
          <template #default="{ row, $index }">
            <template v-if="editingId === row.id">
              <el-button link type="primary" size="small" @click="saveEdit(row)">保存</el-button>
              <el-button link size="small" @click="cancelEdit">取消</el-button>
            </template>
            <template v-else>
              <el-button link type="primary" size="small" @click="startEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
              <el-button link size="small" :disabled="$index === 0" @click="store.moveMaterial(row.id, -1)">↑</el-button>
              <el-button link size="small" :disabled="$index === store.materials.length - 1" @click="store.moveMaterial(row.id, 1)">↓</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Material } from '@shared/types'
import { useProjectStore } from '@/stores/project'
import { formatMoney } from '@/utils/format'

const store = useProjectStore()

const name = ref('')
const price = ref<number | undefined>(undefined)
const quantity = ref(1)

const editingId = ref<string | null>(null)
const draft = reactive({ name: '', price: 1, quantity: 1 })

const money = (v: number) => formatMoney(v, store.currency)

function add(): void {
  const trimmed = name.value.trim()
  if (!trimmed) {
    ElMessage.warning('请填写物资名称')
    return
  }
  if (!price.value || price.value <= 0) {
    ElMessage.warning('单价必须为大于 0 的数字')
    return
  }
  if (store.materials.some((m) => m.name === trimmed)) {
    ElMessage.warning('已存在同名物资，若规格不同建议用名称区分（如「笔记本 A4」「笔记本 B5」）')
  }
  try {
    store.addMaterial(trimmed, price.value, quantity.value)
  } catch (err) {
    ElMessage.error((err as Error).message)
    return
  }
  name.value = ''
  price.value = undefined
  quantity.value = 1
}

function startEdit(row: Material): void {
  editingId.value = row.id
  draft.name = row.name
  draft.price = row.price
  draft.quantity = row.quantity
}

function cancelEdit(): void {
  editingId.value = null
}

function saveEdit(row: Material): void {
  const trimmed = draft.name.trim()
  if (!trimmed) {
    ElMessage.warning('物资名称不能为空')
    return
  }
  if (!draft.price || draft.price <= 0) {
    ElMessage.warning('单价必须为大于 0 的数字')
    return
  }
  try {
    store.updateMaterial(row.id, { name: trimmed, price: draft.price, quantity: draft.quantity })
  } catch (err) {
    ElMessage.error((err as Error).message)
    return
  }
  editingId.value = null
}

function remove(row: Material): void {
  store.removeMaterial(row.id)
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
.price-input {
  width: 84px;
  flex: none;
}
.qty-input {
  width: 92px;
  flex: none;
}
.full {
  width: 100%;
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
