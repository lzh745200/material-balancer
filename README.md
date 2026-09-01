# 物资均衡分配工具（material-balancer）

将一份物资清单（名称 + 单价 + 数量）尽可能公平地分配给若干人员，并生成可打印的 A4 签字表格。
**完全离线运行**，支持 **Windows x64** 与 **麒麟 V10 / Linux ARM64**。

> 📖 第一次接触本项目？推荐阅读 [docs/项目文件结构说明.md](docs/项目文件结构说明.md)——
> 用大白话讲解每个目录的职责、数据流动方式与「改哪儿」速查表。
> 另有 [docs/系统介绍.pptx](docs/系统介绍.pptx) 演示文稿（43 页）可完整了解系统。


## 功能特性

- **物资管理**：逐条录入（名称 / 单价 / 数量）、行内编辑、删除、排序、**名称搜索**；支持从 **CSV / Excel(.xlsx)** 批量导入（兼容有无表头、GBK 编码、名称含逗号引号、全角数字）。
- **人员管理**：逐个添加或从 **txt / CSV / Excel(.xlsx)** 导入（每行一个姓名，自动去重去空行、自动跳过表头），支持改名 / 删除 / 排序；同名会被拦截。
- **自动均衡分配**，三种策略：
  - **贪心均衡**：LPT 贪心（单价降序 → 分给当前总价最低者），O(n log n)；
  - **贪心 + 优化（推荐）**：贪心基础上做「单件移动 + 两件交换」局部搜索，直到无法继续缩小（最高 − 最低）差值；
  - **随机模式**：抽奖式，多次随机重启取最优，均衡与随机兼顾。
- **分配偏好**（设置对话框，会话级）：
  - **允许剩余**：每人不超过人均价值，装不下的件留在「未分配池」，可在池与人员卡片间拖拽；
  - **按人排除**：人员卡片上的开关可把某人排除在本轮分配外（统计与导出同步排除）；
  - **锁定 + 重新优化**：点击物资标签锁定归属，「重新优化」在当前方案上继续缩小差距而不重建；
  - 优化轮数 / 随机重启次数 / 随机种子可调（固定种子可复现结果）。
- **数量拆分**：`笔记本 ×5` 自动拆为 5 件独立参与分配，打印/导出时按人聚合数量。
- **手动调整**：生成后可直接把人员卡片 / 未分配池里的物资标签**拖拽**到其他人员卡片（拖到未分配池即取消分配），统计实时更新。
- **统计与提示**：平均 / 最高 / 最低 / 最大差值 / 标准差 / 未分配件数；差值超过平均值 10% 时提示调整；物资增删后方案自动判定「失效」并提示重新生成。
- **方案历史**：自动保存多个分配方案（上限 30 个，编号不重复），可切换 / 重命名 / 删除。
- **导出与打印**：
  - **A4 签字表格 PDF**（printToPDF，内置思源黑体保证跨平台字体一致；可选页脚页码「第 X 页 / 共 Y 页」），列：序号 / 姓名 / 物资名称 / 单价 / 数量 / 小计 / 总价值 / 签字栏；小块人员整块不跨页，大块跨页时每行重复姓名，多页自动重复表头；
  - **系统打印对话框**（复用同一模板）；
  - **Excel 双表导出**：分配明细 + 按人汇总；
  - **CSV 明细**（UTF-8 BOM，Excel 直接打开不乱码；已防公式注入）。
- **数据持久化**：项目保存为 `.mproj`（JSON）文件，支持打开 / 保存 / 另存为 / **最近打开列表** / **拖拽打开**；保存前自动写 `.bak` 备份、原子写入防损坏；**草稿自动保存**（防抖 1.5s + 关窗同步兜底），意外关闭后下次启动询问恢复。
- **关窗保护**：有未保存修改时关闭窗口会弹确认，退出前自动保留草稿。
- **撤销 / 重做**：Ctrl+Z / Ctrl+Y（50 步快照），覆盖物资、人员、方案的全部修改。
- **快捷键**：Ctrl+N 新建、Ctrl+O 打开、Ctrl+S 保存、Ctrl+Shift+S 另存为、Ctrl+P 打印（应用菜单）。
- **导入模板**：工具栏一键下载含示例数据的模板（物资表 + 人员名单双 sheet）。
- **其他**：表格标题 / 备注自定义、货币符号切换（¥ $ € £ 或自定义）。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Electron + electron-vite（主进程 / preload / 渲染层一体构建） |
| 界面 | Vue 3 + TypeScript + Pinia + Element Plus（中文语言包） |
| 算法 | 纯 TypeScript（贪心 LPT + 局部搜索 + 种子随机），Vitest 单测 |
| PDF | 隐藏窗口渲染 HTML 模板 → `printToPDF`；内置 Noto Sans SC（OFL 许可） |
| 导入解析 | papaparse（CSV）+ SheetJS（xlsx）+ iconv-lite（GBK 识别） |
| 代码质量 | ESLint（flat config）+ Prettier + vue-tsc 类型检查，CI 三道闸 |
| 打包 | electron-builder（Windows nsis/portable x64；Linux deb/tar.gz arm64） |

## 本地开发

```bash
npm install        # 安装依赖（.npmrc 已配置 Electron 国内镜像）
npm run dev        # 开发模式（热更新）
npm test           # 运行单元 + 组件测试
npm run lint       # ESLint 检查
npm run typecheck  # TypeScript 类型检查
npm run build      # 构建产物到 out/
```

Node.js ≥ 18（CI 使用 20，见 `.nvmrc`）。

## 获取安装包（GitHub Actions 云端构建）

安装包不在仓库中，由 CI 自动构建（先过 lint + typecheck + 测试三道闸）：

1. **测试构建**：推送代码到 `main` 或手动触发（Actions 页面 → Build → Run workflow），两个平台并行构建，产物在对应 Job 的 **Artifacts** 里：
   - `windows-x64`：`material-balancer-x.y.z-win64-setup.exe`（安装版）+ `...-win64-portable.exe`（免安装绿色版）
   - `linux-arm64`：`material-balancer-x.y.z-linux-arm64.deb` + `...-linux-arm64.tar.gz`
2. **正式发布**：推送与 `package.json` 版本一致的标签，自动创建 GitHub Release 并附全部安装包：

```bash
git tag v1.1.1
git push origin v1.1.1
```

### 麒麟 V10（ARM64）安装

> **重要**：麒麟 V10 自带的 deb 图形安装器（Python 实现）解析第三方 deb 时存在已知缺陷，
> 双击安装可能报 `local variable 'deb' referenced before assignment` —— 这是系统安装器
> 自身的问题，与本应用无关。请改用下面**方式一（命令行安装 deb）**或**方式二（一键脚本，完全不经过系统安装器）**。

```bash
# 方式一：命令行安装 deb（标准 dpkg 路径，不经过麒麟图形安装器）
sudo apt install ./material-balancer-*-linux-arm64.deb
# 或：sudo dpkg -i material-balancer-*-linux-arm64.deb && sudo apt -f install

# 方式二：绿色版一键安装（推荐，同样自动创建桌面菜单图标）
tar xzf material-balancer-*-linux-arm64.tar.gz
cd 物资均衡分配工具
sudo bash install.sh        # 无 root 时去掉 sudo，装到 ~/.local/opt
```

**沙箱与启动（v1.1.1 起无需手动处理）**：

- v1.1.1 修复了 Electron 打包产物 `chrome-sandbox` 缺少 SUID 位（默认 755）导致的
  `FATAL: The SUID sandbox helper binary was found, but is not configured correctly`
  启动失败：打包阶段、deb 安装后与 install.sh 都会把权限修正为 4755；
- 即使权限仍不满足（如内核关闭了非特权 user namespace），应用也会**自动降级为
  no-sandbox 模式启动**并在终端输出提示，保证一定打得开；
- 如遇界面空白（老旧 ARM GPU），可改用软件渲染启动：`MB_DISABLE_GPU=1 ./material-balancer`。

依赖库：`libgtk-3`、`libnss3`、`libxss1`、`libasound2` 等（麒麟 V10 桌面版一般自带）；
PDF / 打印所需中文字体已随包内置，不依赖系统字体。实测确认 Electron 37 的 Linux 二进制
仅要求 GLIBC ≥ 2.25，麒麟 V10（2.28/2.31）无需任何额外处理。

## 导入格式

- **物资表**（CSV / xlsx）：列 `名称, 单价, 数量`，有表头或无表头均可，数量列可省略（默认 1）；
  单价列按「单价 / 价格 / 金额」优先级识别；全角数字、货币符号、千分位逗号自动处理。
- **人员名单**（txt / CSV / xlsx）：每行一个姓名（xlsx 取第一列），`姓名 / Name` 等表头自动跳过。
- **项目文件**：`.mproj`（JSON），载入时逐条校验，畸形数据自动剔除而不是崩溃。

## 项目结构

```
├─ .github/workflows/build.yml   # CI：质量门禁（lint+typecheck+test）→ 双平台构建 → tag 发 Release
├─ electron-builder.yml          # 打包配置（nsis/portable + deb/tar.gz）
├─ build/                        # 应用图标（icon.ico / icon.png）
├─ resources/fonts/              # 打印模板内置中文字体
├─ scripts/gen-icons.mjs         # 图标生成脚本（纯 Node，无依赖）
├─ src/
│  ├─ shared/                    # 数据模型 + IPC 通道 + 项目校验（主/渲染共享）
│  ├─ main/                      # 主进程：窗口、菜单、文件IO、导入解析、草稿、最近文件、PDF/打印
│  ├─ preload/index.ts           # contextBridge 暴露 window.api（sandbox 开启）
│  └─ renderer/src/
│     ├─ algorithms/             # 分配算法（可独立单测）
│     ├─ stores/project.ts       # Pinia 主 store（状态 + 撤销重做 + 分配偏好）
│     ├─ composables/            # 用户动作 / 生成反馈 / 草稿自动保存 / 快捷键
│     ├─ components/             # 工具栏 / 三栏面板 / 人员卡片 / 未分配池 / 对话框
│     ├─ print/                  # A4 打印模板构建
│     └─ utils/                  # 格式化 / CSV 导出 / XLSX 导出 / id
└─ tests/                        # Vitest：算法、导入解析、store、打印模板、组件冒烟
```

## 算法说明

分配目标为最小化（最高总价值 − 最低总价值）：

1. **展开**：数量 > 1 的物资拆为独立件（上限 5000 件护栏）；
2. **LPT 贪心**：按单价降序，依次分给当前总价值最低的人（并列取人员列表靠前者，保证确定性）；
3. **局部搜索**：每轮枚举全部「单件移动」与「跨人两件交换」，取改进量最大者执行，无改进或达到确定性操作数预算（默认 200 万次候选评估）停止；
4. **结果确定性**：预算按评估次数计数而非墙钟时间，相同输入多次运行结果完全一致（随机模式除外，其可用种子复现）；
5. **允许剩余模式**：带人均上限的贪心装填，超限件留在未分配池。

单测断言：100 种物资 / 20 人、价值分布均匀时最大差值 ≤ 平均值 5%；500 件 / 50 人 3 秒内完成且两次运行结果全等。

## 许可

MIT。内置字体 Noto Sans SC 遵循 SIL Open Font License 1.1。
