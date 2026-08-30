<template>
  <div class="toolbar">
    <el-button-group>
      <el-button @click="actions.onNew()">新建</el-button>
      <el-button @click="actions.onOpen()">打开</el-button>
      <el-button @click="actions.onSave()">保存</el-button>
      <el-button @click="actions.onSaveAs()">另存为</el-button>
    </el-button-group>

    <el-dropdown trigger="click" @command="onRecent" @visible-change="loadRecents">
      <el-button>
        最近打开<el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-if="!recents.length" disabled>暂无最近文件</el-dropdown-item>
          <template v-else>
            <el-dropdown-item
              v-for="r in recents"
              :key="r"
              :command="r"
              :title="r"
            >
              {{ baseName(r) }}
            </el-dropdown-item>
            <el-dropdown-item divided command="__clear__">清空最近列表</el-dropdown-item>
          </template>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-divider direction="vertical" />

    <el-button-group>
      <el-button @click="actions.onImportMaterials()">导入物资</el-button>
      <el-button @click="actions.onImportPeople()">导入人员</el-button>
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
      <el-button type="success" @click="actions.onExportPdf()">导出 PDF</el-button>
      <el-button @click="actions.onPrint()"><el-icon class="el-icon--left"><Printer /></el-icon>打印</el-button>
      <el-button @click="actions.onExportCsv()">导出 CSV</el-button>
    </el-button-group>

    <el-divider direction="vertical" />

    <el-button @click="showSettings = true">设置</el-button>

    <SettingsDialog v-model="showSettings" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, Printer, RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import type { AutoStrategy } from '@/algorithms'
import { useProjectStore } from '@/stores/project'
import { useProjectActions } from '@/composables/useProjectActions'
import SettingsDialog from './dialogs/SettingsDialog.vue'

const store = useProjectStore()
const actions = useProjectActions()
const showSettings = ref(false)

const canGenerate = computed(() => store.people.length > 0 && store.materials.length > 0)

const recents = ref<string[]>([])

async function loadRecents(): Promise<void> {
  try {
    const list = await window.api.listRecents()
    recents.value = list.filter((p) => p !== store.filePath)
  } catch {
    recents.value = []
  }
}

function baseName(p: string): string {
  return p.split(/[\\/]/).pop() || p
}

async function onRecent(command: string): Promise<void> {
  if (command === '__clear__') {
    for (const p of recents.value) await window.api.removeRecent(p).catch(() => undefined)
    recents.value = []
    return
  }
  await actions.onOpenByPath(command)
}

function onGenerate(strategy: AutoStrategy): void {
  actions.generate(strategy)
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
