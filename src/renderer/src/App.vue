<template>
  <el-container class="app-root">
    <el-header height="auto" class="app-header">
      <AppToolbar />
    </el-header>
    <el-main class="app-main">
      <MaterialPanel class="pane pane-materials" />
      <PersonPanel class="pane pane-people" />
      <ResultPanel class="pane pane-result" />
    </el-main>
    <el-footer height="auto" class="app-footer">
      <StatusBar />
    </el-footer>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppToolbar from './components/AppToolbar.vue'
import MaterialPanel from './components/MaterialPanel.vue'
import PersonPanel from './components/PersonPanel.vue'
import ResultPanel from './components/ResultPanel.vue'
import StatusBar from './components/StatusBar.vue'
import { useProjectStore } from './stores/project'
import { useDraftAutosave } from './composables/useDraftAutosave'
import { useShortcuts } from './composables/useShortcuts'

const store = useProjectStore()
useDraftAutosave()
useShortcuts()

onMounted(async () => {
  try {
    const draft = await window.api.loadDraft()
    if (!draft) return
    let parsed: { version?: number; materials?: unknown[]; people?: unknown[] }
    try {
      parsed = JSON.parse(draft)
    } catch {
      // 主进程已会清理损坏草稿，这里兜底提示一次
      ElMessage.warning('本地草稿已损坏，无法恢复')
      return
    }
    if (parsed?.version !== 1 || !Array.isArray(parsed.materials)) return
    const hasContent = parsed.materials.length > 0 || (parsed.people?.length ?? 0) > 0
    if (!hasContent) return

    const action = await ElMessageBox.confirm(
      '检测到上次未正常关闭时留下的草稿，是否恢复？',
      '恢复草稿',
      {
        confirmButtonText: '恢复草稿',
        cancelButtonText: '丢弃草稿',
        type: 'info',
        distinguishCancelAndClose: true
      }
    )
      .then(() => 'restore' as const)
      .catch((action: string) => (action === 'cancel' ? 'discard' as const : 'keep' as const))

    if (action === 'restore') {
      try {
        store.loadProject(parsed as never, null)
      } catch (err) {
        ElMessage.warning(`草稿恢复失败：${(err as Error).message || '数据无效'}`)
        return
      }
      store.dirty = true
      ElMessage.success('已恢复上次草稿')
    } else if (action === 'discard') {
      await window.api.saveDraft('')
    }
  } catch {
    // 草稿恢复流程失败不阻塞启动
  }
})
</script>

<style>
* {
  box-sizing: border-box;
}
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Microsoft YaHei', 'Noto Sans CJK SC', 'PingFang SC', system-ui, sans-serif;
  font-size: 13px;
  color: #303133;
  overflow: hidden;
}
.app-root {
  height: 100%;
}
.app-header {
  padding: 0;
}
.app-main {
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow: hidden;
  background: #f5f7fa;
}
.pane {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 8px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.pane-materials {
  flex: 0 0 30%;
  min-width: 300px;
}
.pane-people {
  flex: 0 0 19%;
  min-width: 220px;
}
.pane-result {
  flex: 1 1 auto;
  min-width: 0;
}
.app-footer {
  padding: 0;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.panel-title .muted {
  font-weight: 400;
  font-size: 12px;
  color: #909399;
}
.panel-title .actions {
  margin-left: auto;
}
.table-wrap {
  flex: 1;
  min-height: 0;
}
</style>
