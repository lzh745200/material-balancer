<template>
  <el-dialog v-model="visible" title="表格与显示设置" width="480px" :close-on-click-modal="false">
    <el-form label-width="90px">
      <el-form-item label="表格标题">
        <el-input v-model="form.title" maxlength="50" show-word-limit placeholder="默认：物资分配领取表" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="2"
          maxlength="100"
          show-word-limit
          placeholder="将显示在打印表格标题下方（可选）"
        />
      </el-form-item>
      <el-form-item label="货币符号">
        <el-select v-model="form.currency" filterable allow-create style="width: 120px">
          <el-option v-for="c in CURRENCIES" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useProjectStore, DEFAULT_TITLE } from '@/stores/project'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const store = useProjectStore()
const CURRENCIES = ['¥', '$', '€', '£']

const form = reactive({ title: DEFAULT_TITLE, remark: '', currency: '¥' })

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.title = store.title
      form.remark = store.remark
      form.currency = store.currency
    }
  }
)

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

function save(): void {
  store.updateSettings({ title: form.title, remark: form.remark, currency: form.currency })
  emit('update:modelValue', false)
}
</script>
