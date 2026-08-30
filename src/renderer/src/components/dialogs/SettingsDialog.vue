<template>
  <el-dialog v-model="visible" title="表格与显示设置" width="520px" :close-on-click-modal="false">
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

      <el-divider content-position="left">分配偏好（会话级，不随项目保存）</el-divider>
      <el-form-item label="允许剩余">
        <div class="hint-line">
          <el-switch v-model="form.allowSurplus" />
          <span class="hint">每人不超过人均价值，装不下的件留作未分配池（使用贪心装填）</span>
        </div>
      </el-form-item>
      <el-form-item label="优化轮数">
        <div class="hint-line">
          <el-input-number v-model="form.optimizeMaxPasses" :min="1" :max="500" :step="10" />
          <span class="hint">「贪心 + 优化」的局部搜索轮数上限</span>
        </div>
      </el-form-item>
      <el-form-item label="随机重启">
        <div class="hint-line">
          <el-input-number v-model="form.randomRestarts" :min="0" :max="100" :step="4" />
          <span class="hint">随机模式的重启次数，越多越均衡也越慢</span>
        </div>
      </el-form-item>
      <el-form-item label="随机种子">
        <div class="hint-line">
          <el-input-number
            v-model="form.randomSeed"
            :min="1"
            :max="4294967295"
            :controls="false"
            placeholder="留空则每次随机"
            style="width: 160px"
          />
          <span class="hint">固定种子可复现同一结果</span>
        </div>
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

const form = reactive({
  title: DEFAULT_TITLE,
  remark: '',
  currency: '¥',
  allowSurplus: false,
  optimizeMaxPasses: 100,
  randomRestarts: 24,
  randomSeed: undefined as number | undefined
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.title = store.title
      form.remark = store.remark
      form.currency = store.currency
      form.allowSurplus = store.allowSurplus
      form.optimizeMaxPasses = store.optimizeMaxPasses
      form.randomRestarts = store.randomRestarts
      form.randomSeed = store.randomSeed ?? undefined
    }
  }
)

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

function save(): void {
  store.updateSettings({ title: form.title, remark: form.remark, currency: form.currency })
  store.setAlgoPrefs({
    allowSurplus: form.allowSurplus,
    optimizeMaxPasses: form.optimizeMaxPasses,
    randomRestarts: form.randomRestarts,
    randomSeed: form.randomSeed ?? null
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.hint-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hint {
  font-size: 12px;
  color: #909399;
}
</style>
