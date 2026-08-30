/**
 * 主进程 / 渲染进程共享的类型与 IPC 通道常量。
 * 本文件不依赖任何运行时，保证两侧均可安全引用。
 */

/** 物资（quantity 为该物资的件数，分配时按件拆分） */
export interface Material {
  id: string
  name: string
  /** 单价，必须 > 0 */
  price: number
  /** 数量（件），整数 >= 1 */
  quantity: number
}

/** 人员 */
export interface Person {
  id: string
  name: string
}

/** 分配策略 */
export type Strategy = 'greedy' | 'optimized' | 'random' | 'manual'

export const STRATEGY_LABELS: Record<Strategy, string> = {
  greedy: '贪心均衡',
  optimized: '贪心 + 优化',
  random: '随机模式',
  manual: '手动调整'
}

/** 一个分配方案（保存在方案历史中） */
export interface AllocationScheme {
  id: string
  name: string
  createdAt: string
  strategy: Strategy
  /** unitId -> personId（按拆分件存储，unitId 规则见 UNIT_ID） */
  assignment: Record<string, string>
}

/** 项目文件（.mproj，JSON 格式） */
export interface ProjectFile {
  version: 1
  title: string
  remark: string
  /** 货币显示符号，如 "¥" "$" */
  currency: string
  materials: Material[]
  people: Person[]
  schemes: AllocationScheme[]
  activeSchemeId: string | null
}

/** 拆分件 unitId 规则：物资 id # 第 k 件 */
export const unitIdOf = (materialId: string, k: number): string => `${materialId}#${k}`

/** 单件物资（分配算法的操作对象） */
export interface Unit {
  unitId: string
  materialId: string
  name: string
  price: number
}

/** 拆分件数量上限（性能护栏） */
export const MAX_UNITS = 5000

/* ---------------- IPC 结果类型 ---------------- */

/** 应用菜单 / 快捷键动作（主进程菜单 → 渲染进程） */
export type MenuAction = 'new' | 'open' | 'save' | 'save-as' | 'print' | 'undo' | 'redo'

export interface OpenResult {
  canceled: boolean
  path?: string
  data?: ProjectFile
  error?: string
}

export interface SaveResult {
  canceled: boolean
  path?: string
  error?: string
}

export interface ImportMaterialsResult {
  canceled: boolean
  path?: string
  materials: Material[]
  /** 因名称为空 / 价格非法被跳过的行数 */
  skipped: number
  /** 解析器报告的问题（如 CSV 引号格式错误），用于向用户提示 */
  warnings?: string[]
  error?: string
}

export interface ImportPeopleResult {
  canceled: boolean
  path?: string
  names: string[]
  error?: string
}

/* ---------------- IPC 通道 ---------------- */

export const IPC = {
  ProjectOpen: 'project:open',
  /** 直接按路径打开（最近文件 / 拖拽打开） */
  ProjectOpenPath: 'project:open-path',
  ProjectSaveAs: 'project:save-as',
  ProjectSaveToPath: 'project:save-to-path',
  ImportMaterials: 'import:materials',
  /** 按路径导入物资（拖拽） */
  ImportMaterialsFile: 'import:materials-file',
  ImportPeople: 'import:people',
  /** 按路径导入人员（拖拽） */
  ImportPeopleFile: 'import:people-file',
  DraftSave: 'draft:save',
  /** 关窗兜底：beforeunload 中同步写草稿（invoke 在卸载时可能来不及送达） */
  DraftSaveSync: 'draft:save-sync',
  DraftLoad: 'draft:load',
  /** 渲染进程向主进程同步 dirty 状态（用于关窗确认） */
  ProjectDirtyChanged: 'project:dirty-changed',
  /** 应用菜单动作 → 渲染进程 */
  MenuAction: 'menu:action',
  RecentsList: 'recents:list',
  RecentsRemove: 'recents:remove',
  ExportPdf: 'export:pdf',
  ExportPrint: 'export:print',
  ExportCsv: 'export:csv',
  RevealPath: 'shell:reveal-path'
} as const

/* ---------------- 渲染层可用的 window.api 形状 ---------------- */

export interface Api {
  /** 弹出打开对话框并读取项目文件 */
  openProject(): Promise<OpenResult>
  /** 按路径打开项目文件（最近文件 / 拖拽），不弹对话框 */
  openProjectByPath(path: string): Promise<OpenResult>
  /** 弹出另存为对话框并写入 */
  saveProjectAs(content: string, defaultName: string): Promise<SaveResult>
  /** 静默保存到已知路径 */
  saveProjectToPath(path: string, content: string): Promise<SaveResult>
  /** 弹出对话框导入物资（CSV / XLSX） */
  importMaterials(): Promise<ImportMaterialsResult>
  /** 按路径导入物资（拖拽），不弹对话框 */
  importMaterialsFromPath(path: string): Promise<ImportMaterialsResult>
  /** 弹出对话框导入人员（txt / CSV，每行一个姓名） */
  importPeople(): Promise<ImportPeopleResult>
  /** 按路径导入人员（拖拽），不弹对话框 */
  importPeopleFromPath(path: string): Promise<ImportPeopleResult>
  /** 保存草稿（content 为空字符串时删除草稿）；写失败时 ok=false 并带 error */
  saveDraft(content: string): Promise<{ ok: boolean; error?: string }>
  /** 关窗时的同步兜底保存（阻塞渲染进程直到主进程写完） */
  saveDraftSync(content: string): void
  /** 向主进程同步当前未保存标志（用于关窗确认） */
  notifyDirty(dirty: boolean): void
  /** 读取草稿，无草稿返回 null */
  loadDraft(): Promise<string | null>
  /** 生成 PDF 并保存，返回保存路径 */
  exportPdf(html: string, defaultName: string): Promise<SaveResult>
  /** 调起系统打印对话框 */
  printHtml(html: string): Promise<{ error?: string }>
  /** 导出 CSV */
  exportCsv(content: string, defaultName: string): Promise<SaveResult>
  /** 在文件管理器中显示文件 */
  revealPath(path: string): Promise<void>
  /** 最近打开的项目文件列表（最新的在前，最多 10 条） */
  listRecents(): Promise<string[]>
  /** 从最近列表移除一条 */
  removeRecent(path: string): Promise<void>
  /** 订阅应用菜单 / 快捷键动作，返回取消订阅函数 */
  onMenuAction(callback: (action: MenuAction) => void): () => void
  /** 拖拽文件的磁盘路径（Electron ≥32 渲染层 File.path 已移除，由 preload 用 webUtils 解析） */
  pathForFile(file: File): string
}
