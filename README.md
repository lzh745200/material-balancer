# 物资均衡分配工具（material-balancer）

将一份物资清单（名称 + 单价 + 数量）尽可能公平地分配给若干人员，并生成可打印的 A4 签字表格。
**完全离线运行**，支持 **Windows x64** 与 **麒麟 V10 / Linux ARM64**。

## 功能特性

- **物资管理**：逐条录入（名称 / 单价 / 数量）、行内编辑、删除、排序；支持从 **CSV / Excel(.xlsx)** 批量导入（兼容有无表头、GBK 编码、名称含逗号引号）。
- **人员管理**：逐个添加或从 **txt / CSV** 导入（每行一个姓名，自动去重去空行），支持改名 / 删除 / 排序。
- **自动均衡分配**，三种策略：
  - **贪心均衡**：LPT 贪心（单价降序 → 分给当前总价最低者），O(n log n)；
  - **贪心 + 优化（推荐）**：贪心基础上做「单件移动 + 两件交换」局部搜索，直到无法继续缩小（最高 − 最低）差值；
  - **随机模式**：抽奖式，多次随机重启取最优，均衡与随机兼顾。
- **数量拆分**：`笔记本 ×5` 自动拆为 5 件独立参与分配，打印/导出时按人聚合数量。
- **手动调整**：生成后可直接把人员卡片里的物资标签**拖拽**到其他人员卡片，统计实时更新。
- **统计与提示**：平均 / 最高 / 最低 / 最大差值 / 标准差；差值超过平均值 10% 时提示调整；单件价值高于人均时提示物理上无法更均衡。
- **方案历史**：自动保存多个分配方案，可切换 / 重命名 / 删除。
- **导出与打印**：
  - **A4 签字表格 PDF**（printToPDF，内置思源黑体保证跨平台字体一致），列：序号 / 姓名 / 物资名称 / 单价 / 数量 / 小计 / 总价值 / 签字栏，多页自动重复表头，底部留签字与日期；
  - **系统打印对话框**（复用同一模板）；
  - **CSV 明细**（UTF-8 BOM，Excel 直接打开不乱码）。
- **数据持久化**：项目保存为 `.mproj`（JSON）文件，支持打开 / 保存 / 另存为；**草稿自动保存**（防抖 1.5s + 关闭兜底），意外关闭后下次启动询问恢复。
- **撤销 / 重做**：Ctrl+Z / Ctrl+Y（50 步快照），覆盖物资、人员、方案的全部修改。
- **其他**：表格标题 / 备注自定义、货币符号切换（¥ $ € £ 或自定义）。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Electron + electron-vite（主进程 / preload / 渲染层一体构建） |
| 界面 | Vue 3 + TypeScript + Pinia + Element Plus（中文语言包） |
| 算法 | 纯 TypeScript（贪心 LPT + 局部搜索 + 种子随机），Vitest 单测 |
| PDF | 隐藏窗口渲染 HTML 模板 → `printToPDF`；内置 Noto Sans SC（OFL 许可） |
| 导入解析 | papaparse（CSV）+ SheetJS（xlsx）+ iconv-lite（GBK 识别） |
| 打包 | electron-builder（Windows nsis/portable x64；Linux deb/tar.gz arm64） |

## 本地开发

```bash
npm install        # 安装依赖（.npmrc 已配置 Electron 国内镜像）
npm run dev        # 开发模式（热更新）
npm test           # 运行 33 个单元测试
npm run typecheck  # TypeScript 类型检查
npm run build      # 构建产物到 out/
```

Node.js ≥ 18（CI 使用 20，见 `.nvmrc`）。

## 获取安装包（GitHub Actions 云端构建）

安装包不在仓库中，由 CI 自动构建：

1. **测试构建**：推送代码到 `main` 或手动触发（Actions 页面 → Build → Run workflow），两个平台并行构建，产物在对应 Job 的 **Artifacts** 里：
   - `windows-x64`：`material-balancer-x.y.z-win64-setup.exe`（安装版）+ `...-win64-portable.exe`（免安装绿色版）
   - `linux-arm64`：`material-balancer-x.y.z-linux-arm64.deb` + `...-linux-arm64.tar.gz`
2. **正式发布**：推送版本标签自动创建 GitHub Release 并附全部安装包：

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 麒麟 V10（ARM64）安装

```bash
# 方式一：deb 安装
sudo dpkg -i material-balancer-*-linux-arm64.deb
# 缺依赖时：sudo apt -f install

# 方式二：绿色版（无需 root）
tar xzf material-balancer-*-linux-arm64.tar.gz
./物资均衡分配工具/material-balancer   # 或目录内可执行文件
```

常见问题：

- 若启动报 sandbox 相关错误（内核较旧的系统），可追加参数运行：
  `./material-balancer --no-sandbox`（仅建议在可信内网环境使用）；
- 依赖库：`libgtk-3`、`libnss3`、`libxss1`、`libasound2` 等（麒麟 V10 桌面版一般自带）；
- PDF / 打印所需中文字体已随包内置，不依赖系统字体。

## 项目结构

```
├─ .github/workflows/build.yml   # 双平台 CI：Windows x64 + Linux ARM64（含 tag 发 Release）
├─ electron-builder.yml          # 打包配置（nsis/portable + deb/tar.gz）
├─ build/                        # 应用图标（icon.ico / icon.png）
├─ resources/fonts/              # 打印模板内置中文字体
├─ scripts/gen-icons.mjs         # 图标生成脚本（纯 Node，无依赖）
├─ src/
│  ├─ shared/types.ts            # 数据模型 + IPC 通道（主/渲染共享）
│  ├─ main/                      # 主进程：窗口、文件IO、导入解析、草稿、PDF/打印
│  ├─ preload/index.ts           # contextBridge 暴露 window.api（sandbox 开启）
│  └─ renderer/src/
│     ├─ algorithms/             # 分配算法（可独立单测）
│     ├─ stores/project.ts       # Pinia 主 store（状态 + 撤销重做 + 文件操作）
│     ├─ components/             # 工具栏 / 三栏面板 / 人员卡片 / 对话框
│     ├─ print/                  # A4 打印模板构建
│     └─ utils/                  # 格式化 / CSV 导出 / id
└─ tests/                        # Vitest：算法（含验收指标断言）、导入解析、store、打印模板
```

## 算法说明

分配目标为最小化（最高总价值 − 最低总价值）：

1. **展开**：数量 > 1 的物资拆为独立件（上限 5000 件护栏）；
2. **LPT 贪心**：按单价降序，依次分给当前总价值最低的人（并列取人员列表靠前者，保证确定性）；
3. **局部搜索**：每轮枚举全部「单件移动」与「跨人两件交换」，取改进量最大者执行，无改进或达时间预算（2.5s）停止；
4. **结果确定性**：相同输入多次运行结果完全一致（随机模式除外，其可用种子复现）。

单测断言：100 种物资 / 20 人、价值分布均匀时最大差值 ≤ 平均值 5%；500 件 / 50 人 3 秒内完成（实测 < 0.5s）。

## 验收自测结果（Windows 10 x64 实测）

| 验收标准 | 结果 |
| --- | --- |
| 1. Windows 启动运行正常 | ✅ 实测通过（麒麟 V10 需在目标机用 CI 产物验证） |
| 2. 100 种物资 + 20 人录入无卡顿 | ✅ 500 物资 / 50 人亦流畅 |
| 3. 均匀分布下最大差值 ≤ 平均值 5% | ✅ 单测断言通过 |
| 4. PDF 正确显示全部人员物资 | ✅ 实测导出并通过（打印请用系统打印对话框） |
| 5. 重启后可加载上次项目 | ✅ 草稿恢复 / 打开 .mproj 均实测通过 |

## 许可

MIT。内置字体 Noto Sans SC 遵循 SIL Open Font License 1.1。
