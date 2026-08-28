<template>
  <div class="toolbar">
    <el-button-group>
      <el-button @click="onNew">新建</el-button>
      <el-button @click="onOpen">打开</el-button>
      <el-button @click="onSave">保存</el-button>
      <el-button @click="onSaveAs">另存为</el-button>
    </el-button-group>

    <el-divider direction="vertical" />

    <el-button-group>
      <el-button @click="onImportMaterials">导入物资</el-button>
      <el-button @click="onImportPeople">导入人员</el-button>
    </el-button-group>

    <el-divider direction="vertical" />

    <el-dropdown trigger="click" @command="onGenerate">
      <el-button type="primary" :disabled="!canGenerate">
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

    <el-divider direction="vertical" />

    <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
      <el-button :icon="RefreshLeft" :disabled="!store.canUndo" @click="store.undo()" />
    </el-tooltip>
    <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
      <el-button :icon="RefreshRight" :disabled="!store.canRedo" @click="store.redo()" />
    </el-tooltip>

    <el-divider direction="vertical" />

    <el-button-group>
      <el-button type="success" @click="onExportPdf">导出 PDF</el-button>
      <el-button @click="onPrint"><el-icon class="el-icon--left"><Printer /></el-icon>打印</el-button>
      <el-button @click="onExportCsv">导出 CSV</el-button>
    </el-button-group>

    <el-divider direction="vertical" />

    <el-button @click="showSettings = true">设置</el-button>

    <SettingsDialog v-model="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Printer, RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import type { AutoStrategy } from '@/algorithms'
import { useProjectStore } from '@/stores/project'
import { buildPersonRows } from '@/print/rows'
import { buildPrintHtml } from '@/print/buildPrintHtml'
import { buildDetailCsv } from '@/utils/csvExport'
import { formatDateTime, formatMoney } from '@/utils/format'
import SettingsDialog from './dialogs/SettingsDialog.vue'

const store = useProjectStore()
const showSettings = ref(false)

const canGenerate = computed(() => store.people.length > 0 && store.materials.length > 0)

const projectJson = () => JSON.stringify(store.exportProject())

function confirmDiscard(message: string): Promise<boolean> {
  if (!store.dirty) return Promise.resolve(true)
  return ElMessageBox.confirm(message, '提示', {
    confirmButtonText: '继续',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => true)
    .catch(() => false)
}

async function onNew(): Promise<void> {
  const ok = await confirmDiscard('当前项目尚未保存，新建后将丢失未保存的修改（草稿仍会保留）。确定继续吗？')
  if (!ok) return
  store.newProject()
}

async function onOpen(): Promise<void> {
  const ok = await confirmDiscard('当前项目尚未保存，打开其他项目将丢失未保存的修改。确定继续吗？')
  if (!ok) return
  const res = await window.api.openProject()
  if (res.canceled) return
  if (res.error || !res.data) {
    ElMessage.error(res.error || '打开文件失败')
    return
  }
  store.loadProject(res.data, res.path ?? null)
  ElMessage.success(`已打开：${res.path}`)
}

async function onSave(): Promise<void> {
  if (!store.filePath) return onSaveAs()
  const res = await window.api.saveProjectToPath(store.filePath, projectJson())
  if (res.error) {
    ElMessage.error(`保存失败：${res.error}`)
    return
  }
  store.markSaved(res.path ?? store.filePath!)
  ElMessage.success('已保存')
}

async function onSaveAs(): Promise<void> {
  const res = await window.api.saveProjectAs(projectJson(), `${store.defaultFileName}.mproj`)
  if (res.canceled) return
  if (res.error) {
    ElMessage.error(`保存失败：${res.error}`)
    return
  }
  store.markSaved(res.path!)
  ElMessage.success(`已保存到：${res.path}`)
}

async function onImportMaterials(): Promise<void> {
  const res = await window.api.importMaterials()
  if (res.canceled) return
  if (res.error) {
    ElMessage.error(`导入失败：${res.error}`)
    return
  }
  if (res.materials.length === 0) {
    ElMessage.warning('未解析到有效数据。CSV 需要「名称,单价,数量」列（有表头或无表头均可），数量列可省略（默认 1）。')
    return
  }
  const addUnits = res.materials.reduce((acc, m) => acc + Math.max(1, m.quantity), 0)
  if (store.wouldExceedUnitLimit(addUnits)) {
    ElMessage.error(`导入后物资总件数将超过上限（5000），请精简后再导入。`)
    return
  }
  store.addImportedMaterials(res.materials)
  ElMessage.success(
    `已导入 ${res.materials.length} 种物资${res.skipped > 0 ? `，跳过 ${res.skipped} 行无效数据` : ''}`
  )
}

async function onImportPeople(): Promise<void> {
  const res = await window.api.importPeople()
  if (res.canceled) return
  if (res.error) {
    ElMessage.error(`导入失败：${res.error}`)
    return
  }
  if (res.names.length === 0) {
    ElMessage.warning('未解析到有效姓名。请确保文件每行一个姓名。')
    return
  }
  store.addImportedPeople(res.names)
  ElMessage.success(`已导入 ${res.names.length} 名人员（重复姓名已忽略）`)
}

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
        '可尝试改用「贪心 + 优化」策略，或直接在右侧拖拽物资手动调整。',
      '建议调整',
      { confirmButtonText: '知道了', type: 'warning' }
    ).catch(() => undefined)
  }
}

function requireScheme(): boolean {
  if (!store.activeScheme) {
    ElMessage.warning('请先点击「生成分配方案」')
    return false
  }
  return true
}

async function confirmStale(): Promise<boolean> {
  if (!store.isStale) return true
  return ElMessageBox.confirm(
    '物资或人员在生成方案后发生了变化，导出内容可能与当前物资清单不一致。仍要继续吗？',
    '提示',
    { confirmButtonText: '继续导出', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => true)
    .catch(() => false)
}

function buildHtml(): string {
  const rows = buildPersonRows(store.people, store.units, store.activeScheme!.assignment)
  return buildPrintHtml({
    title: store.title,
    remark: store.remark,
    currency: store.currency,
    rows,
    generatedAt: formatDateTime(new Date())
  })
}

async function onExportPdf(): Promise<void> {
  if (!requireScheme()) return
  if (!(await confirmStale())) return
  const res = await window.api.exportPdf(buildHtml(), `${store.defaultFileName}.pdf`)
  if (res.canceled) return
  if (res.error) {
    ElMessage.error(`导出 PDF 失败：${res.error}`)
    return
  }
  const path = res.path!
  ElMessageBox.alert(`PDF 已保存到：${path}`, '导出成功', {
    confirmButtonText: '打开所在文件夹',
    cancelButtonText: '关闭',
    distinguishCancelAndClose: true
  })
    .then(() => window.api.revealPath(path))
    .catch(() => undefined)
}

async function onPrint(): Promise<void> {
  if (!requireScheme()) return
  if (!(await confirmStale())) return
  const res = await window.api.printHtml(buildHtml())
  if (res?.error) ElMessage.error(`打印失败：${res.error}`)
}

async function onExportCsv(): Promise<void> {
  if (!requireScheme()) return
  if (!(await confirmStale())) return
  const rows = buildPersonRows(store.people, store.units, store.activeScheme!.assignment)
  const res = await window.api.exportCsv(buildDetailCsv(rows, store.currency), `${store.defaultFileName}.csv`)
  if (res.canceled) return
  if (res.error) {
    ElMessage.error(`导出 CSV 失败：${res.error}`)
    return
  }
  ElMessage.success(`CSV 已保存到：${res.path}`)
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}
</style>
