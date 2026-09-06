/* 物资均衡分配工具 · 系统介绍 PPT 构建脚本（44 页）
 * 运行：npm run ppt  （输出 docs/系统介绍.pptx） */
const pptxgen = require("pptxgenjs");

const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
p.author = "Material Balancer Team";
p.title = "物资均衡分配工具 · 系统介绍";

/* ---------- 设计系统 ---------- */
const F = "微软雅黑";
const BG_DARK = "0C3B36"; // 深青：封面/章节/结尾
const BG = "FFFFFF";
const PANEL = "F0F6F5"; // 极浅青灰卡片底
const PANEL_DEEP = "DCEBE9"; // 稍深卡片底
const PRIMARY = "0F766E";
const PRIM_MID = "14A89C";
const PRIM_SOFT = "8FD4CD";
const ACCENT = "F59E0B"; // 琥珀：唯一强调色
const TEXT = "1F2D2B";
const MUTED = "647774";
const WHITE = "FFFFFF";
const W = 13.33, M = 0.55;

const shadow = () => ({ type: "outer", color: "0C3B36", blur: 7, offset: 2, angle: 90, opacity: 0.13 });
const bu = () => ({ code: "2022", indent: 12 });

let pageNo = 0;
function slide(dark = false) {
  const s = p.addSlide();
  s.background = { color: dark ? BG_DARK : BG };
  pageNo++;
  if (!dark) {
    s.addText("物资均衡分配工具 · 系统介绍", { x: M, y: 7.08, w: 4, h: 0.3, fontSize: 12, fontFace: F, color: MUTED, margin: 0 });
    s.addText(String(pageNo), { x: W - 1.0, y: 7.08, w: 0.5, h: 0.3, fontSize: 12, fontFace: F, color: MUTED, align: "right", margin: 0 });
  }
  return s;
}

function header(s, kicker, title) {
  s.addText(kicker, { x: M, y: 0.42, w: 9, h: 0.32, fontSize: 13, bold: true, fontFace: F, color: PRIMARY, charSpacing: 2, margin: 0 });
  s.addText(title, { x: M, y: 0.74, w: W - 2 * M, h: 0.62, fontSize: 30, bold: true, fontFace: F, color: TEXT, margin: 0 });
}

function card(s, x, y, w, h, fill = PANEL) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, rectRadius: 0.09, line: { type: "none" } });
}
function cardShadow(s, x, y, w, h, fill = WHITE) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, rectRadius: 0.09, line: { type: "none" }, shadow: shadow() });
}

function stat(s, x, y, w, value, label, dark = false, vColor = null) {
  s.addText(value, { x, y, w, h: 0.85, fontSize: 54, bold: true, fontFace: F, color: vColor || (dark ? WHITE : PRIMARY), align: "center", margin: 0 });
  s.addText(label, { x, y: y + 0.88, w, h: 0.55, fontSize: 14, fontFace: F, color: dark ? PRIM_SOFT : MUTED, align: "center", margin: 0 });
}

function bullets(s, items, x, y, w, h, opts = {}) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: bu(), breakLine: i < items.length - 1 } })),
    { x, y, w, h, fontSize: opts.size || 15, fontFace: F, color: opts.color || TEXT, paraSpaceAfter: opts.gap ?? 10, margin: 0, valign: "top" });
}

function arrow(s, x, y, w, color = PRIMARY) {
  s.addShape(p.shapes.LINE, { x, y, w, h: 0, line: { color, width: 2.2, endArrowType: "triangle" } });
}

/* =============== 1 封面 =============== */
(() => {
  const s = slide(true);
  // 均衡天平母题：支点 + 横梁 + 两端等大圆
  s.addShape(p.shapes.LINE, { x: 4.4, y: 3.62, w: 4.53, h: 0, line: { color: PRIM_SOFT, width: 3 } });
  s.addShape(p.shapes.ISOSCELES_TRIANGLE, { x: 6.44, y: 3.68, w: 0.46, h: 0.4, fill: { color: ACCENT }, line: { type: "none" } });
  s.addShape(p.shapes.OVAL, { x: 3.98, y: 3.28, w: 0.68, h: 0.68, fill: { color: PRIM_MID }, line: { type: "none" } });
  s.addShape(p.shapes.OVAL, { x: 8.68, y: 3.28, w: 0.68, h: 0.68, fill: { color: PRIM_MID }, line: { type: "none" } });
  s.addText("物资均衡分配工具", { x: 0, y: 1.55, w: W, h: 1.1, fontSize: 52, bold: true, fontFace: F, color: WHITE, align: "center", charSpacing: 3, margin: 0 });
  s.addText("把每一份物资，都分得明明白白", { x: 0, y: 2.72, w: W, h: 0.5, fontSize: 20, fontFace: F, color: PRIM_SOFT, align: "center", charSpacing: 2, margin: 0 });
  s.addText("系统介绍 · 从功能到架构", { x: 0, y: 4.55, w: W, h: 0.4, fontSize: 16, fontFace: F, color: PRIM_SOFT, align: "center", margin: 0 });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 5.99, y: 5.15, w: 1.35, h: 0.46, fill: { color: "12574F" }, rectRadius: 0.23, line: { type: "none" } });
  s.addText("v1.1.1", { x: 5.99, y: 5.15, w: 1.35, h: 0.46, fontSize: 15, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
  s.addText("完全离线 · Windows x64 / 麒麟 V10 ARM64", { x: 0, y: 6.55, w: W, h: 0.35, fontSize: 13, fontFace: F, color: PRIM_SOFT, align: "center", margin: 0 });
  s.addNotes("开场：一句话定位——把一份物资清单尽量公平地分给一群人，并生成可打印的 A4 签收表。强调完全离线。");
})();

/* =============== 2 目录 =============== */
(() => {
  const s = slide();
  header(s, "CONTENTS", "目录");
  const items = [
    ["01", "项目概述", "定位 · 解决的问题 · 核心特性 · 关键数字"],
    ["02", "功能详解", "三栏工作台 · 三种分配策略 · 手动调整 · 方案历史"],
    ["03", "导入导出与打印", "格式容错 · 数据安检 · Excel/CSV/PDF · A4 打印模板"],
    ["04", "技术架构", "三进程模型 · 数据流动 · 确定性 · 安全 · 麒麟适配 · 质量与 CI"],
    ["05", "使用指南与展望", "五步上手 · 快捷键 · 性能指标 · 版本路线"]
  ];
  items.forEach(([n, t, d], i) => {
    const y = 1.72 + i * 1.06;
    s.addText(n, { x: M, y: y, w: 1.1, h: 0.8, fontSize: 40, bold: true, fontFace: F, color: i % 2 ? PRIM_SOFT : PRIMARY, margin: 0 });
    s.addText(t, { x: 1.85, y: y + 0.02, w: 4.2, h: 0.45, fontSize: 22, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(d, { x: 6.15, y: y + 0.13, w: 6.6, h: 0.4, fontSize: 14, fontFace: F, color: MUTED, margin: 0 });
    if (i < items.length - 1) s.addShape(p.shapes.LINE, { x: 1.85, y: y + 0.92, w: 10.9, h: 0, line: { color: "E4ECEA", width: 1 } });
  });
})();

/* =============== 3 章节页 01 =============== */
function divider(num, title, subs, note) {
  const s = slide(true);
  s.addText(num, { x: M, y: 1.5, w: 3.6, h: 1.9, fontSize: 110, bold: true, fontFace: F, color: "1B5A52", margin: 0 });
  s.addText(title, { x: M + 0.06, y: 3.55, w: 11, h: 0.9, fontSize: 42, bold: true, fontFace: F, color: WHITE, margin: 0 });
  s.addText(subs.join("   ·   "), { x: M + 0.06, y: 4.62, w: 12, h: 0.45, fontSize: 15, fontFace: F, color: PRIM_SOFT, margin: 0 });
  if (note) s.addNotes(note);
  return s;
}
divider("01", "项目概述", ["项目定位", "解决的问题", "核心特性", "关键数字"]);

/* =============== 4 项目是什么 =============== */
(() => {
  const s = slide();
  header(s, "OVERVIEW", "项目是什么");
  s.addText([
    { text: "把一份物资清单（名称 + 单价 + 数量），", options: { breakLine: true } },
    { text: "尽可能公平地分配给若干人员，", options: { breakLine: true } },
    { text: "并生成可打印签字的 A4 表格。", options: {} }
  ], { x: M, y: 1.85, w: 6.6, h: 1.9, fontSize: 24, bold: true, fontFace: F, color: TEXT, paraSpaceAfter: 8, margin: 0, valign: "top" });
  s.addText("典型场景：年会奖品发放、工会福利领取、应急物资签收、班级/团队物品分发——凡是「人人有份、还要公平」的场合都适用。",
    { x: M, y: 3.9, w: 6.6, h: 1.1, fontSize: 15, fontFace: F, color: MUTED, margin: 0 });
  const feats = [
    ["完全离线", "不联网、不上传，数据只留在本机"],
    ["公平均衡", "算法保证价值差距最小化，可量化验收"],
    ["开箱即用", "导入清单 → 一键生成 → 打印签字"]
  ];
  feats.forEach(([t, d], i) => {
    const y = 1.85 + i * 1.42;
    cardShadow(s, 7.6, y, 5.15, 1.18);
    s.addText(t, { x: 7.95, y: y + 0.16, w: 4.5, h: 0.4, fontSize: 18, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: 7.95, y: y + 0.58, w: 4.5, h: 0.4, fontSize: 14, fontFace: F, color: MUTED, margin: 0 });
  });
})();

/* =============== 5 解决什么问题 =============== */
(() => {
  const s = slide();
  header(s, "PROBLEM → SOLUTION", "它解决什么问题");
  card(s, M, 1.8, 6.0, 4.7, "FBF3E4");
  s.addText("人工分配的痛点", { x: 0.95, y: 2.05, w: 5, h: 0.45, fontSize: 19, bold: true, fontFace: F, color: "B45309", margin: 0 });
  bullets(s, [
    "逐个抄写名单，几百件物资对到手软",
    "分多分少全凭感觉，事后说不清",
    "Excel 手算合计，一改数量全盘重来",
    "签字表要手工排版、手工画格"
  ], 0.95, 2.6, 5.2, 3.6, { gap: 14, size: 15.5 });
  card(s, 6.95, 1.8, 5.85, 4.7, PANEL);
  s.addText("工具带来的改变", { x: 7.35, y: 2.05, w: 5, h: 0.45, fontSize: 19, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  bullets(s, [
    "清单导入 / 录入一次，反复使用",
    "算法均衡：最大差值有量化指标",
    "改数量即改结果，撤销重做随便试",
    "A4 签字表自动排版，直接打印"
  ], 7.35, 2.6, 5.1, 3.6, { gap: 14, size: 15.5 });
  s.addText("核心主张：把「分得公平」从一门手艺，变成一次点击。", { x: M, y: 6.68, w: 12, h: 0.35, fontSize: 14, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
})();

/* =============== 6 六大核心特性 =============== */
(() => {
  const s = slide();
  header(s, "FEATURES", "六大核心特性");
  const feats = [
    ["三种分配策略", "贪心 / 贪心+优化 / 随机模式，速度与均衡可权衡"],
    ["数量拆分与聚合", "笔记本 ×5 自动拆 5 件参与分配，打印时按人聚合"],
    ["拖拽手动微调", "生成后在人员卡片间拖物资，统计实时更新"],
    ["未分配池", "「允许剩余」模式下装不下的件集中放置、可再拖出"],
    ["方案历史", "最多 30 个方案并存，切换 / 重命名 / 对比差值"],
    ["一站式导出", "A4 PDF（含页码）/ Excel 双表 / CSV 明细"]
  ];
  feats.forEach(([t, d], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * 4.18, y = 1.85 + row * 2.45;
    cardShadow(s, x, y, 3.9, 2.15);
    s.addShape(p.shapes.OVAL, { x: x + 0.3, y: y + 0.3, w: 0.52, h: 0.52, fill: { color: row ? PRIM_SOFT : PRIMARY }, line: { type: "none" } });
    s.addText(String(i + 1), { x: x + 0.3, y: y + 0.3, w: 0.52, h: 0.52, fontSize: 18, bold: true, fontFace: F, color: row ? PRIMARY : WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(t, { x: x + 0.3, y: y + 0.95, w: 3.35, h: 0.4, fontSize: 17, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(d, { x: x + 0.3, y: y + 1.38, w: 3.35, h: 0.68, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
  });
})();

/* =============== 7 关键数字 =============== */
(() => {
  const s = slide();
  header(s, "KEY NUMBERS", "关键数字");
  stat(s, M, 2.0, 3.9, "98", "个自动化测试全绿");
  stat(s, 4.72, 2.0, 3.9, "0.39s", "500 件物资均衡耗时", false, ACCENT);
  stat(s, 8.88, 2.0, 3.9, "5000", "件物资处理上限");
  stat(s, M, 4.55, 3.9, "2", "平台安装包（Win x64 / 麒麟 ARM64）");
  stat(s, 4.72, 4.55, 3.9, "100%", "离线运行，数据不出本机");
  stat(s, 8.88, 4.55, 3.9, "50", "步撤销 / 重做");
  s.addText("数据来源：vitest 实测与 GitHub Actions CI（2026-09，v1.1.1）", { x: M, y: 6.55, w: 9, h: 0.32, fontSize: 12, fontFace: F, color: MUTED, margin: 0 });
})();

/* =============== 8 章节页 02 =============== */
divider("02", "功能详解", ["三栏工作台", "物资 / 人员管理", "三种策略", "手动调整", "统计与方案"]);

/* =============== 9 主界面总览（UI 示意） =============== */
(() => {
  const s = slide();
  header(s, "WORKSPACE", "主界面：三栏工作台");
  // 整体外框
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.7, w: 8.6, h: 4.9, fill: { color: PANEL }, rectRadius: 0.08, line: { color: "DCE7E5", width: 1 } });
  // 工具栏
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 1.9, w: 8.2, h: 0.55, fill: { color: WHITE }, rectRadius: 0.06, line: { type: "none" } });
  ["新建", "打开", "保存", "导入", "生成方案", "导出", "打印"].forEach((t, i) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.9 + i * 1.13, y: 2.02, w: 1.0, h: 0.32, fill: { color: i === 4 ? ACCENT : PANEL_DEEP }, rectRadius: 0.16, line: { type: "none" } });
    s.addText(t, { x: 0.9 + i * 1.13, y: 2.02, w: 1.0, h: 0.32, fontSize: 11, bold: i === 4, fontFace: F, color: i === 4 ? WHITE : TEXT, align: "center", valign: "middle", margin: 0 });
  });
  // 三栏
  const panes = [["物资清单", "名称 · 单价 · 数量", "支持搜索过滤"], ["人员列表", "姓名 · 参与开关", "同名自动拦截"], ["分配结果", "人员卡片 + 拖拽", "未分配池"] ];
  panes.forEach(([t, d1, d2], i) => {
    const x = 0.75 + i * 2.78;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.6, w: 2.6, h: 3.15, fill: { color: WHITE }, rectRadius: 0.06, line: { color: "DCE7E5", width: 1 } });
    s.addText(t, { x: x + 0.15, y: 2.72, w: 2.3, h: 0.35, fontSize: 14, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d1, { x: x + 0.15, y: 3.1, w: 2.3, h: 0.3, fontSize: 11.5, fontFace: F, color: MUTED, margin: 0 });
    s.addText(d2, { x: x + 0.15, y: 3.4, w: 2.3, h: 0.3, fontSize: 11.5, fontFace: F, color: MUTED, margin: 0 });
    // 伪行/卡片
    for (let k = 0; k < 4; k++) {
      s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: 3.85 + k * 0.44, w: 2.3, h: 0.34, fill: { color: i === 2 && k < 2 ? PRIMARY : PANEL }, rectRadius: 0.05, line: { type: "none" } });
      s.addText(i === 2 && k < 2 ? "张三 · 李四" : "", { x: x + 0.25, y: 3.85 + k * 0.44, w: 2.1, h: 0.34, fontSize: 11, fontFace: F, color: WHITE, valign: "middle", margin: 0 });
    }
  });
  // 底部状态栏
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.92, w: 8.2, h: 0.42, fill: { color: WHITE }, rectRadius: 0.06, line: { type: "none" } });
  s.addText("状态栏：文件路径 · 未保存标记 · 件数 · 总价值 · 未分配警告", { x: 0.9, y: 5.92, w: 8, h: 0.42, fontSize: 11.5, fontFace: F, color: MUTED, valign: "middle", margin: 0 });
  // 右侧说明
  const notes = [
    ["左栏 · 物资", "增删改排序、名称搜索，实时显示件数与总价值"],
    ["中栏 · 人员", "添加 / 导入人员，卡片开关可把某人排除出本轮"],
    ["右栏 · 结果", "三种策略生成，拖拽微调、锁定物资、方案历史"],
    ["底部 · 状态", "随时看到「分完了没有、差多少」"]
  ];
  notes.forEach(([t, d], i) => {
    const y = 1.78 + i * 1.24;
    s.addShape(p.shapes.OVAL, { x: 9.5, y: y + 0.05, w: 0.14, h: 0.14, fill: { color: ACCENT }, line: { type: "none" } });
    s.addText(t, { x: 9.78, y: y - 0.06, w: 3.1, h: 0.36, fontSize: 15, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(d, { x: 9.78, y: y + 0.32, w: 3.1, h: 0.72, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
  });
})();

/* =============== 10 物资管理 =============== */
(() => {
  const s = slide();
  header(s, "MATERIALS", "物资管理：清单是分配的地基");
  const rows = [
    ["三种录入方式", "逐条添加 / CSV · Excel 批量导入 / 模板下载后照填"],
    ["行内编辑", "名称、单价、数量直接在表格里改，无需弹窗"],
    ["名称搜索", "几百条清单里一秒定位目标物资"],
    ["口径统一", "小数数量向下取整、单价两位小数，件数与总价永远对得上"],
    ["上限护栏", "拆分总件数 ≤ 5000，超出提前拦截并说明"]
  ];
  rows.forEach(([t, d], i) => {
    const y = 1.8 + i * 0.92;
    s.addText(t, { x: M, y: y, w: 3.1, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: 3.8, y: y + 0.03, w: 8.9, h: 0.4, fontSize: 14.5, fontFace: F, color: TEXT, margin: 0 });
    if (i < rows.length - 1) s.addShape(p.shapes.LINE, { x: M, y: y + 0.68, w: 12.23, h: 0, line: { color: "E8EFEE", width: 1 } });
  });
  s.addText("导入容错：GBK 编码、有无表头、全角数字、货币符号、名称含逗号——全部自动处理。", { x: M, y: 6.5, w: 12.2, h: 0.4, fontSize: 14, bold: true, fontFace: F, color: "B45309", margin: 0 });
})();

/* =============== 11 人员管理 =============== */
(() => {
  const s = slide();
  header(s, "PEOPLE", "人员管理：小功能里的大讲究");
  const feats = [
    ["多途径导入", "txt / CSV / Excel 名单，每行一个姓名；xlsx 自动取第一列"],
    ["表头自动跳过", "第一行是「姓名 / Name」不会被当成真人"],
    ["重名拦截", "手动添加或改名撞车时直接拒绝，避免签字表无法区分"],
    ["参与开关", "人员卡片上的开关，可把请假者排除出本轮分配"],
    ["导出同步排除", "被排除者不出现在统计、打印和导出文件里"]
  ];
  feats.forEach(([t, d], i) => {
    const y = 1.78 + i * 0.94;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: y + 0.02, w: 0.42, h: 0.42, fill: { color: i === 3 ? ACCENT : PRIMARY }, rectRadius: 0.08, line: { type: "none" } });
    s.addText(String(i + 1), { x: M, y: y + 0.02, w: 0.42, h: 0.42, fontSize: 15, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(t, { x: 1.25, y: y, w: 2.9, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(d, { x: 4.25, y: y + 0.04, w: 8.5, h: 0.4, fontSize: 14, fontFace: F, color: MUTED, margin: 0 });
  });
  // 右侧小卡片：上限
  card(s, 1.25, 6.35, 11.5, 0.62, PANEL);
  s.addText("人员上限 200 人（与 5000 件上限配合，保证算法瞬时完成、界面不卡顿）", { x: 1.55, y: 6.35, w: 11, h: 0.62, fontSize: 13.5, fontFace: F, color: MUTED, valign: "middle", margin: 0 });
})();

/* =============== 12 三种分配策略 =============== */
(() => {
  const s = slide();
  header(s, "STRATEGIES", "三种分配策略：把选择权留给你");
  const head = ["策略", "怎么做", "优势", "适合场景"].map(t => ({ text: t, options: { fill: { color: PRIMARY }, color: WHITE, bold: true, fontSize: 15, align: "center" } }));
  const mk = (t, d1, d2, d3, hl) => [
    { text: t, options: { bold: true, color: hl ? ACCENT : TEXT } },
    { text: d1 }, { text: d2 }, { text: d3 }
  ];
  s.addTable([
    head,
    mk("贪心均衡", "最贵的先分给当前拿得最少的人", "瞬间完成，逻辑透明", "日常快速分配", false),
    mk("贪心 + 优化", "贪心后再反复「挪一件 / 换两件」缩小差距", "差距最小（推荐）", "对公平要求高", false),
    mk("随机模式", "洗牌 + 贪心 + 优化，抽 24 轮取最优", "过程有随机感", "抽奖式发放", false)
  ], {
    x: M, y: 1.85, w: 12.23, colW: [2.1, 4.4, 2.7, 3.03],
    border: { pt: 1, color: "DCE7E5" }, fontFace: F, fontSize: 14, color: TEXT,
    rowH: [0.55, 1.0, 1.0, 1.0], valign: "middle", margin: 0.08, fill: { color: WHITE }
  });
  s.addText("三种策略结果都完全确定：相同清单 + 相同设置 = 相同方案（随机模式可用固定种子复现）。", { x: M, y: 5.75, w: 12.2, h: 0.4, fontSize: 14.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  s.addText("配合设置中的「允许剩余」开关，还能切换为「每人不超过人均价值、剩余入池」的装填模式。", { x: M, y: 6.25, w: 12.2, h: 0.4, fontSize: 13.5, fontFace: F, color: MUTED, margin: 0 });
})();

/* =============== 13 贪心算法 =============== */
(() => {
  const s = slide();
  header(s, "ALGORITHM 1/3", "贪心 LPT：最贵的先给拿得最少的");
  // 左：按单价降序的件
  s.addText("① 物资按单价降序", { x: M, y: 1.8, w: 3.6, h: 0.4, fontSize: 15, bold: true, fontFace: F, color: TEXT, margin: 0 });
  [6, 5, 4, 3, 2, 1].forEach((v, i) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M + 0.4, y: 2.3 + i * 0.62, w: 1.5, h: 0.5, fill: { color: i === 0 ? ACCENT : PRIM_MID }, rectRadius: 0.07, line: { type: "none" } });
    s.addText(`单价 ${v}`, { x: M + 0.4, y: 2.3 + i * 0.62, w: 1.5, h: 0.5, fontSize: 14, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
  });
  arrow(s, 2.85, 4.0, 1.3);
  // 中右：三个人 + 累计
  s.addText("② 依次分给「当前总价值最低」的人", { x: 4.35, y: 1.8, w: 6, h: 0.4, fontSize: 15, bold: true, fontFace: F, color: TEXT, margin: 0 });
  const people = [["张三", 7], ["李四", 7], ["王五", 7]];
  people.forEach(([n, v], i) => {
    const y = 2.35 + i * 1.15;
    cardShadow(s, 4.35, y, 3.4, 0.92);
    s.addText(n, { x: 4.62, y: y + 0.1, w: 1.6, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(`累计 ${v}`, { x: 4.62, y: y + 0.48, w: 1.6, h: 0.34, fontSize: 13, fontFace: F, color: MUTED, margin: 0 });
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 6.45, y: y + 0.22, w: 1.0, h: 0.44, fill: { color: PRIM_SOFT }, rectRadius: 0.07, line: { type: "none" } });
    s.addText("6+1", { x: 6.45, y: y + 0.22, w: 1.0, h: 0.44, fontSize: 12.5, bold: true, fontFace: F, color: PRIMARY, align: "center", valign: "middle", margin: 0 });
  });
  // 右侧结果
  card(s, 9.0, 2.35, 3.75, 3.25, PANEL);
  s.addText("结果示例", { x: 9.3, y: 2.55, w: 3.2, h: 0.4, fontSize: 15, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  bullets(s, ["总价 21 → 人均 7", "三人拿到恰好 7", "并列时取列表靠前者", "耗时 O(n log n)"], 9.3, 3.0, 3.3, 2.4, { gap: 9, size: 13.5 });
  s.addText("贪心快而准，但遇到「3+3+2+2+2 分两人」这类组合，可能留下 7 vs 5 的差距 —— 这就需要下一步优化。", { x: M, y: 6.35, w: 12.2, h: 0.65, fontSize: 13.5, fontFace: F, color: MUTED, margin: 0 });
})();

/* =============== 14 局部搜索优化 =============== */
(() => {
  const s = slide();
  header(s, "ALGORITHM 2/3", "局部搜索：挪一件、换两件");
  // 两种操作
  const box = (x, y, label, chips) => {
    cardShadow(s, x, y, 2.5, 1.7);
    s.addText(label, { x: x + 0.2, y: y + 0.12, w: 2.1, h: 0.35, fontSize: 14, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    chips.forEach((c, i) => {
      s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: x + 0.2 + i * 1.05, y: y + 0.6, w: 0.95, h: 0.8, fill: { color: PANEL_DEEP }, rectRadius: 0.07, line: { type: "none" } });
      s.addText(c, { x: x + 0.2 + i * 1.05, y: y + 0.6, w: 0.95, h: 0.8, fontSize: 15, bold: true, fontFace: F, color: TEXT, align: "center", valign: "middle", margin: 0 });
    });
  };
  s.addText("操作一：单件移动", { x: M, y: 1.85, w: 3, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: TEXT, margin: 0 });
  box(M, 2.3, "张三 · 10", ["3", "2"]);
  box(M, 4.35, "李四 · 5", ["2", "1"]);
  arrow(s, 3.25, 3.15, 1.05, ACCENT);
  s.addText("把一件从「高者」挪给「低者」", { x: 3.15, y: 3.3, w: 1.5, h: 0.9, fontSize: 11.5, fontFace: F, color: MUTED, margin: 0 });
  s.addText("操作二：跨人交换", { x: 5.1, y: 1.85, w: 3, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: TEXT, margin: 0 });
  box(5.1, 2.3, "张三 · 10", ["5", "2"]);
  box(5.1, 4.35, "李四 · 5", ["3", "1"]);
  s.addShape(p.shapes.LINE, { x: 6.6, y: 3.02, w: 0.95, h: 2.02, line: { color: ACCENT, width: 2.2, endArrowType: "triangle" } });
  s.addShape(p.shapes.LINE, { x: 7.55, y: 3.15, w: -0.95, h: 1.7, line: { color: ACCENT, width: 2.2, endArrowType: "triangle" } });
  s.addText("大小件互换，差距立即缩小", { x: 5.0, y: 6.25, w: 2.9, h: 0.6, fontSize: 11.5, fontFace: F, color: MUTED, margin: 0 });
  // 右侧机制
  card(s, 8.6, 1.85, 4.15, 4.7, PANEL);
  s.addText("每一轮", { x: 8.9, y: 2.05, w: 3.6, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  bullets(s, [
    "枚举全部移动 / 交换候选",
    "只执行「改进最大」的那一个",
    "无法再改进即停止",
    "最多 100 轮 · 200 万次评估"
  ], 8.9, 2.55, 3.6, 2.6, { gap: 11, size: 13.5 });
  s.addText("实测：3+3+2+2+2 两人 → 贪心 7:5，优化后 6:6", { x: 8.9, y: 5.5, w: 3.6, h: 0.8, fontSize: 13, bold: true, fontFace: F, color: "B45309", margin: 0 });
})();

/* =============== 15 随机模式 =============== */
(() => {
  const s = slide();
  header(s, "ALGORITHM 3/3", "随机模式：抽奖的仪式感，均衡的底线");
  // 循环示意
  const steps = ["打乱顺序", "贪心装填", "局部优化", "留下更优"];
  steps.forEach((t, i) => {
    const x = M + i * 3.15;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.1, w: 2.6, h: 1.05, fill: { color: i === 3 ? ACCENT : PRIMARY }, rectRadius: 0.09, line: { type: "none" } });
    s.addText(`${i + 1}. ${t}`, { x, y: 2.1, w: 2.6, h: 1.05, fontSize: 16, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
    if (i < 3) arrow(s, x + 2.66, 2.62, 0.43);
  });
  s.addText("×24 轮重启，每轮换一种洗牌结果", { x: 0, y: 3.45, w: W, h: 0.4, fontSize: 15, fontFace: F, color: MUTED, align: "center", margin: 0 });
  const feats = [
    ["为什么随机？", "分配结果不再是「算出来的唯一解」，抽奖过程本身有仪式感"],
    ["公平不放松", "每一轮都做局部优化，最终取差值最小的一次"],
    ["可复现", "设置里填固定随机种子，两次生成结果完全一致"]
  ];
  feats.forEach(([t, d], i) => {
    const y = 4.15 + i * 0.88;
    s.addText(t, { x: M + 1.2, y: y, w: 2.2, h: 0.4, fontSize: 15.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: 4.1, y: y + 0.03, w: 8.6, h: 0.4, fontSize: 14, fontFace: F, color: TEXT, margin: 0 });
  });
})();

/* =============== 16 允许剩余与未分配池 =============== */
(() => {
  const s = slide();
  header(s, "SURPLUS MODE", "允许剩余：装不下的，先放池子里");
  // 两个箱子 + 上限线
  const cap = 2.35;
  [["张三", M + 0.55], ["李四", M + 3.45]].forEach(([n, x]) => {
    s.addShape(p.shapes.LINE, { x: x - 0.15, y: cap, w: 2.4, h: 0, line: { color: ACCENT, width: 2, dashType: "dash" } });
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: cap + 0.18, w: 2.1, h: 2.2, fill: { color: PANEL_DEEP }, rectRadius: 0.08, line: { type: "none" } });
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: x + 0.18, y: cap + 0.35, w: 1.74, h: 0.75, fill: { color: PRIMARY }, rectRadius: 0.07, line: { type: "none" } });
    s.addText("90 元", { x: x + 0.18, y: cap + 0.35, w: 1.74, h: 0.75, fontSize: 15, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(`${n} · 已装 ≤ 人均`, { x, y: cap + 1.25, w: 2.1, h: 0.4, fontSize: 13, bold: true, fontFace: F, color: TEXT, align: "center", margin: 0 });
  });
  s.addText("人均价值 = 上限（虚线）", { x: M + 0.4, y: 1.92, w: 3.4, h: 0.35, fontSize: 12.5, fontFace: F, color: "B45309", margin: 0 });
  // 池子
  arrow(s, 6.35, 3.4, 0.85, "B45309");
  cardShadow(s, 7.4, 2.0, 5.3, 2.85, "FBF3E4");
  s.addText("未分配池", { x: 7.72, y: 2.22, w: 4.6, h: 0.42, fontSize: 18, bold: true, fontFace: F, color: "B45309", margin: 0 });
  ["90 元的大件谁拿都超限 → 留在池里", "池里的件可拖给任何人（自行取舍）", "已分配的件也可拖回池中取消分配", "状态栏与统计实时显示「未分配 N 件」"].forEach((t, i) => {
    s.addText([{ text: t, options: { bullet: bu(), breakLine: i < 3 } }],
      { x: 7.72, y: 2.72 + i * 0.5, w: 4.7, h: 0.45, fontSize: 13.5, fontFace: F, color: TEXT, margin: 0 });
  });
  s.addText("适用：奖品价值悬殊（如一等奖 + 纪念奖）、或想把部分物资留作机动时。", { x: M, y: 5.35, w: 12.2, h: 0.4, fontSize: 14, fontFace: F, color: MUTED, margin: 0 });
  card(s, M, 5.95, 12.23, 0.75, PANEL);
  s.addText("开启方式：设置 → 分配与打印偏好 → 「允许剩余」开关。该模式使用带人均上限的贪心装填，方案策略如实记录为贪心。",
    { x: 0.9, y: 5.95, w: 11.6, h: 0.75, fontSize: 13.5, fontFace: F, color: TEXT, valign: "middle", margin: 0 });
})();

/* =============== 17 手动调整与锁定 =============== */
(() => {
  const s = slide();
  header(s, "MANUAL", "手动调整：算法给底线，人来拍板");
  const feats = [
    ["拖拽即分配", "把物资标签从 A 卡片拖到 B 卡片，统计瞬间重算"],
    ["拖出即取消", "拖到「未分配池」表示这件先不发"],
    ["参与开关", "某人临时请假？关掉开关后重新生成即可"],
    ["锁定物资", "点击物资标签加锁：这件必须给某人（如奖品归属已定）"],
    ["重新优化", "在当前方案上继续优化，锁定的件纹丝不动，不新建方案"],
    ["一键解锁", "全部解锁回到「完全自动」状态"]
  ];
  feats.forEach(([t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.25, y = 1.82 + row * 1.52;
    cardShadow(s, x, y, 5.98, 1.28);
    s.addText(t, { x: x + 0.3, y: y + 0.14, w: 5.4, h: 0.4, fontSize: 16.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: x + 0.3, y: y + 0.58, w: 5.4, h: 0.55, fontSize: 13, fontFace: F, color: MUTED, margin: 0 });
  });
  s.addText("手动调整后方案策略自动标记为「手动调整」，与自动生成的方案明确区分。", { x: M, y: 6.5, w: 12.2, h: 0.4, fontSize: 13.5, fontFace: F, color: MUTED, margin: 0 });
})();

/* =============== 18 方案历史 =============== */
(() => {
  const s = slide();
  header(s, "HISTORY", "方案历史：每次生成都可回溯");
  // 左：列表示意
  const schemes = [["方案4", "贪心 + 优化", "差值 ¥2.10", true], ["方案3", "随机模式", "差值 ¥2.35", false], ["方案2", "贪心均衡", "差值 ¥3.80", false]];
  schemes.forEach(([n, st, df, active], i) => {
    const y = 1.85 + i * 1.06;
    cardShadow(s, M, y, 6.3, 0.86, active ? PANEL_DEEP : WHITE);
    s.addText(n, { x: 0.85, y: y + 0.1, w: 1.3, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: active ? ACCENT : TEXT, margin: 0 });
    s.addText(st, { x: 2.2, y: y + 0.14, w: 2.0, h: 0.36, fontSize: 13, fontFace: F, color: MUTED, margin: 0 });
    s.addText(df, { x: 4.3, y: y + 0.14, w: 1.9, h: 0.36, fontSize: 13, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    if (active) s.addText("当前", { x: 5.9, y: y + 0.14, w: 0.7, h: 0.36, fontSize: 13, bold: true, fontFace: F, color: ACCENT, margin: 0 });
  });
  s.addText("（示意数据）", { x: M, y: 5.15, w: 3, h: 0.3, fontSize: 12, fontFace: F, color: MUTED, margin: 0 });
  // 右说明
  const pts = [
    ["最多 30 个并存", "上限自动淘汰最旧方案，撤销历史独立管理"],
    ["编号不重复", "删除「方案2」后再生成是「方案4」，永不重名"],
    ["随时切换", "一键设为当前方案；重命名自由定制"],
    ["逐方案对比", "列表直接显示每个方案的最大差值"]
  ];
  pts.forEach(([t, d], i) => {
    const y = 1.85 + i * 1.18;
    s.addText(t, { x: 7.35, y: y, w: 5.3, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: 7.35, y: y + 0.42, w: 5.3, h: 0.45, fontSize: 13.5, fontFace: F, color: MUTED, margin: 0 });
  });
})();

/* =============== 19 统计指标 =============== */
(() => {
  const s = slide();
  header(s, "STATISTICS", "六个数字，看清「分得平不平」");
  const items = [
    ["平均价值", "人均应得多少", false],
    ["最高 / 最低", "拿最多和最少的人", false],
    ["最大差值", "高减低——均衡的核心指标", true],
    ["标准差", "整体偏离平均的程度", false],
    ["未分配件数", "还有多少件没着落", false]
  ];
  items.forEach(([t, d, hl], i) => {
    const x = M + i * 2.5;
    cardShadow(s, x, 1.9, 2.28, 1.75);
    s.addText(t, { x: x + 0.16, y: 2.1, w: 1.96, h: 0.62, fontSize: 15.5, bold: true, fontFace: F, color: hl ? ACCENT : PRIMARY, margin: 0 });
    s.addText(d, { x: x + 0.16, y: 2.72, w: 1.96, h: 0.75, fontSize: 12, fontFace: F, color: MUTED, margin: 0 });
  });
  card(s, M, 4.05, 12.23, 1.35, PANEL);
  s.addText([
    { text: "10% 预警线：", options: { bold: true, color: "B45309" } },
    { text: "最大差值超过平均价值的 10% 时，界面持续提醒。因为此时大概率存在「单件价值就超过人均」的物资，物理上无法更均衡——建议手动调整或开启允许剩余。", options: { color: TEXT } }
  ], { x: 0.9, y: 4.05, w: 11.6, h: 1.35, fontSize: 14, fontFace: F, valign: "middle", margin: 0 });
  s.addText("统计口径与算法、打印、导出完全一致：指向已删除人员或未进入方案的件，一律计入「未分配」，绝不静默漏算。",
    { x: M, y: 5.75, w: 12.2, h: 0.65, fontSize: 14, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
})();

/* =============== 20 失效检测 =============== */
(() => {
  const s = slide();
  header(s, "STALE DETECTION", "物资变了？方案会自己「报警」");
  const cases = [
    ["数量调大", "新增的件不在任何方案里", "提示「N 件未分配」", ACCENT],
    ["数量调小", "方案还引用着已不存在的件", "提示方案失效", ACCENT],
    ["删了人员", "有人名下的件没了着落", "提示方案失效", ACCENT],
    ["清空方案", "导出一张全空的表格", "导出前二次确认", ACCENT]
  ];
  cases.forEach(([t, d1, d2], i) => {
    const x = M + i * 3.13;
    cardShadow(s, x, 1.9, 2.9, 2.5);
    s.addText(t, { x: x + 0.22, y: 2.1, w: 2.45, h: 0.42, fontSize: 16.5, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(d1, { x: x + 0.22, y: 2.6, w: 2.45, h: 0.72, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
    s.addText(d2, { x: x + 0.22, y: 3.55, w: 2.45, h: 0.6, fontSize: 13.5, bold: true, fontFace: F, color: "B45309", margin: 0 });
  });
  card(s, M, 4.85, 12.23, 1.5, PANEL);
  s.addText([
    { text: "设计原则：不阻止你，但一定告诉你。", options: { bold: true, color: PRIMARY, breakLine: true } },
    { text: "所有提示都允许「仍要导出」，尊重现场指挥者的临场决定；但绝不静默漏算——打印表上的每一行都对得上账。", options: { color: TEXT } }
  ], { x: 0.9, y: 4.85, w: 11.6, h: 1.5, fontSize: 14.5, fontFace: F, paraSpaceAfter: 6, valign: "middle", margin: 0 });
})();

/* =============== 21 章节页 03 =============== */
divider("03", "导入导出与打印", ["格式容错", "数据安检", "Excel / CSV / PDF", "A4 打印模板"]);

/* =============== 22 导入物资 =============== */
(() => {
  const s = slide();
  header(s, "IMPORT 1/2", "导入物资：脏活累活全自动");
  const cells = [
    ["GBK 编码", "中文版 Excel 导出的默认编码直接可读"],
    ["有无表头", "「名称，单价，数量」表头自动识别；无表头按列序"],
    ["全角数字", "１２３、１２.５ 中文输入法数字照常解析"],
    ["列名容错", "单价 / 价格 / 金额 优先级识别，金额（总额）不会被误当单价"],
    ["货币符号", "¥5、$3.5、1,000 千分位统统剥掉"],
    ["坏行不丢人", "解析不了的行计入「跳过 N 行」明确告知，绝不静默消失"]
  ];
  cells.forEach(([t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.25, y = 1.85 + row * 1.5;
    card(s, x, y, 5.98, 1.26);
    s.addText(t, { x: x + 0.3, y: y + 0.13, w: 5.4, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: x + 0.3, y: y + 0.56, w: 5.4, h: 0.6, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
  });
  s.addText("支持 .csv / .xlsx / .xls；xlsx 按文件魔数（PK）识别，改了扩展名也不会走错解析器。", { x: M, y: 6.45, w: 12.2, h: 0.4, fontSize: 13.5, bold: true, fontFace: F, color: "B45309", margin: 0 });
})();

/* =============== 23 导入人员 =============== */
(() => {
  const s = slide();
  header(s, "IMPORT 2/2", "导入人员：一行一个名字");
  s.addText("支持格式", { x: M, y: 1.85, w: 3, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: TEXT, margin: 0 });
  const fmts = [["txt", "每行一个姓名"], ["CSV", "取第一列"], ["Excel", "第一列，自动跳过表头"]];
  fmts.forEach(([t, d], i) => {
    const x = 1.3 + i * 2.3;
    card(s, x, 2.3, 2.05, 1.15);
    s.addText(t, { x, y: 2.42, w: 2.05, h: 0.42, fontSize: 17, bold: true, fontFace: F, color: PRIMARY, align: "center", margin: 0 });
    s.addText(d, { x: x + 0.1, y: 2.86, w: 1.85, h: 0.5, fontSize: 11.5, fontFace: F, color: MUTED, align: "center", margin: 0 });
  });
  arrow(s, 1.0, 4.15, 11.3);
  s.addText("自动处理", { x: M, y: 4.35, w: 3, h: 0.4, fontSize: 16, bold: true, fontFace: F, color: TEXT, margin: 0 });
  bullets(s, ["去空行、去首尾空白", "重复姓名自动忽略（重复导入同一份名单也安全）", "「姓名 / Name / 人员」等表头行不会变成真人", "导入结果与现有名单合并去重"], 1.0, 4.85, 11.3, 1.7, { gap: 10, size: 14.5 });
})();

/* =============== 24 数据安检 =============== */
(() => {
  const s = slide();
  header(s, "VALIDATION", "打开任何文件前，先过一遍安检");
  s.addText("项目文件（.mproj）载入时的逐条检查：", { x: M, y: 1.8, w: 11, h: 0.4, fontSize: 15.5, bold: true, fontFace: F, color: TEXT, margin: 0 });
  const checks = [
    "物资：id 非空、名称非空、单价为正数、数量取整 ≥ 1",
    "人员：id 与姓名有效；「参与开关」状态恢复",
    "方案：assignment 逐条校验——指向不存在人员 / 已不存在物资件的引用直接剔除",
    "悬空字段：标题缺失补默认值；激活方案不存在则置空",
    "旧版本 / 手工编辑 / 草稿恢复：同一套安检，坏数据剔除而不是崩溃"
  ];
  bullets(s, checks, M, 2.35, 12.2, 3.2, { gap: 13, size: 15 });
  card(s, M, 5.6, 12.23, 1.1, PANEL);
  s.addText([
    { text: "为什么这么执着？", options: { bold: true, color: PRIMARY, breakLine: true } },
    { text: "项目文件是 JSON，任何人都能手工编辑。安检保证：无论文件从哪来（邮件 / U 盘 / 三年前的旧版本），打开后行为一致、绝不崩溃。", options: { color: TEXT } }
  ], { x: 0.9, y: 5.6, w: 11.6, h: 1.1, fontSize: 13.5, fontFace: F, paraSpaceAfter: 5, valign: "middle", margin: 0 });
})();

/* =============== 25 导出三格式 =============== */
(() => {
  const s = slide();
  header(s, "EXPORT", "一次分配，三种出口");
  const cards3 = [
    ["A4 PDF", ["printToPDF 原生渲染", "内置思源黑体，跨平台一致", "页脚页码可选「第 X 页 / 共 Y 页」", "直接发送存档 / 打印"], true],
    ["Excel 双表", ["「分配明细」逐人逐件", "「按人汇总」件数 + 总价值", "打开即可二次加工", "适合财务对账"], false],
    ["CSV 明细", ["UTF-8 BOM，Excel 直开不乱码", "同一物资合并为数量", "防公式注入（= 开头转义）", "通用性最强的交换格式"], false]
  ];
  cards3.forEach(([t, pts, hl], i) => {
    const x = M + i * 4.18;
    cardShadow(s, x, 1.85, 3.9, 4.0, hl ? "FBF3E4" : WHITE);
    s.addText(t, { x: x + 0.3, y: 2.08, w: 3.3, h: 0.45, fontSize: 19, bold: true, fontFace: F, color: hl ? "B45309" : PRIMARY, margin: 0 });
    bullets(s, pts, x + 0.3, 2.65, 3.35, 3.0, { gap: 9, size: 12.5 });
  });
  s.addText("全部走「先选路径再写盘 + 原子写入」：写到一半断电，原文件不损坏。", { x: M, y: 6.2, w: 12.2, h: 0.4, fontSize: 14, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
})();

/* =============== 26 A4 打印模板 =============== */
(() => {
  const s = slide();
  header(s, "PRINT 1/2", "A4 签字表格：为「签字」这一刻设计");
  // 表头
  const cols = ["序号", "姓名", "物资名称", "单价", "数量", "小计", "总价值", "签字栏"];
  const cw = [0.75, 1.15, 3.3, 1.15, 0.95, 1.3, 1.5, 2.13];
  let cx = M;
  cols.forEach((c, i) => {
    s.addShape(p.shapes.RECTANGLE, { x: cx, y: 1.9, w: cw[i], h: 0.5, fill: { color: i === 7 ? ACCENT : PRIMARY }, line: { color: WHITE, width: 1 } });
    s.addText(c, { x: cx, y: 1.9, w: cw[i], h: 0.5, fontSize: 13, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
    cx += cw[i];
  });
  // 数据行示意（张三 2 行合并）
  s.addShape(p.shapes.RECTANGLE, { x: M, y: 2.4, w: 0.75, h: 1.0, fill: { color: WHITE }, line: { color: "B9C6C4", width: 1 } });
  s.addText("1", { x: M, y: 2.4, w: 0.75, h: 1.0, fontSize: 13, fontFace: F, color: TEXT, align: "center", valign: "middle", margin: 0 });
  s.addShape(p.shapes.RECTANGLE, { x: M + 0.75, y: 2.4, w: 1.15, h: 1.0, fill: { color: WHITE }, line: { color: "B9C6C4", width: 1 } });
  s.addText("张三", { x: M + 0.75, y: 2.4, w: 1.15, h: 1.0, fontSize: 13, bold: true, fontFace: F, color: TEXT, align: "center", valign: "middle", margin: 0 });
  [["笔记本 ×2", "¥5", "2", "¥10"], ["钢笔 ×1", "¥3", "1", "¥3"]].forEach((r, ri) => {
    let rx = M + 1.9;
    r.forEach((cval, ci) => {
      s.addShape(p.shapes.RECTANGLE, { x: rx, y: 2.4 + ri * 0.5, w: cw[ci + 2], h: 0.5, fill: { color: WHITE }, line: { color: "B9C6C4", width: 1 } });
      s.addText(cval, { x: rx, y: 2.4 + ri * 0.5, w: cw[ci + 2], h: 0.5, fontSize: 12, fontFace: F, color: TEXT, align: "center", valign: "middle", margin: 0 });
      rx += cw[ci + 2];
    });
  });
  // 总价值+签字 合并单元格
  s.addShape(p.shapes.RECTANGLE, { x: M + 8.6, y: 2.4, w: 1.5, h: 1.0, fill: { color: PANEL }, line: { color: "B9C6C4", width: 1 } });
  s.addText("¥13", { x: M + 8.6, y: 2.4, w: 1.5, h: 1.0, fontSize: 13, bold: true, fontFace: F, color: TEXT, align: "center", valign: "middle", margin: 0 });
  s.addShape(p.shapes.RECTANGLE, { x: M + 10.1, y: 2.4, w: 2.13, h: 1.0, fill: { color: PANEL }, line: { color: "B9C6C4", width: 1 } });
  s.addText("（签名区）", { x: M + 10.1, y: 2.4, w: 2.13, h: 1.0, fontSize: 12, fontFace: F, color: MUTED, align: "center", valign: "middle", margin: 0 });
  // 脚注
  s.addText("页脚：发放人签字 ____   监发人签字 ____   日期 ____ 年 __ 月 __ 日", { x: M, y: 3.75, w: 12.2, h: 0.4, fontSize: 13.5, fontFace: F, color: MUTED, margin: 0 });
  const pts = [
    ["同人多件自动合并", "「笔记本 ×2」占一行，数量、小计自动算"],
    ["一人一块", "序号 / 姓名 / 总价值 / 签字栏纵向合并，签字归属一目了然"],
    ["标题与备注", "「年会物资领取表」等自定义标题 + 备注显示在表头下方"]
  ];
  pts.forEach(([t, d], i) => {
    const y = 4.45 + i * 0.78;
    s.addText(t, { x: M, y: y, w: 3.2, h: 0.4, fontSize: 14.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: 3.9, y: y + 0.03, w: 8.8, h: 0.4, fontSize: 13.5, fontFace: F, color: TEXT, margin: 0 });
  });
})();

/* =============== 27 打印分页保护 =============== */
(() => {
  const s = slide();
  header(s, "PRINT 2/2", "跨页不断链：50 人也能放心打印");
  // 两页示意
  const page = (x, title) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.9, w: 5.6, h: 4.3, fill: { color: WHITE }, rectRadius: 0.06, line: { color: "C9D6D4", width: 1.5 }, shadow: shadow() });
    s.addText(title, { x: x + 0.2, y: 2.0, w: 5.2, h: 0.32, fontSize: 12, fontFace: F, color: MUTED, margin: 0 });
  };
  page(M, "第 1 页"); page(7.18, "第 2 页");
  s.addShape(p.shapes.RECTANGLE, { x: 0.85, y: 2.45, w: 5.0, h: 1.5, fill: { color: PANEL_DEEP }, line: { type: "none" } });
  s.addText("张三的 3 件（小块）", { x: 1.0, y: 2.55, w: 4.6, h: 0.35, fontSize: 13, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  s.addText("整块禁止跨页：姓名、总价值、签字栏绝不身首异处", { x: 1.0, y: 2.95, w: 4.6, h: 0.7, fontSize: 12, fontFace: F, color: TEXT, margin: 0 });
  s.addShape(p.shapes.RECTANGLE, { x: 0.85, y: 4.15, w: 5.0, h: 1.9, fill: { color: PANEL }, line: { type: "none" } });
  s.addText("王五的 15 件（大块）", { x: 1.0, y: 4.25, w: 4.6, h: 0.35, fontSize: 13, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  s.addText("块太大允许分页……", { x: 1.0, y: 4.65, w: 4.6, h: 0.4, fontSize: 12, fontFace: F, color: TEXT, margin: 0 });
  // 页2
  s.addShape(p.shapes.RECTANGLE, { x: 7.48, y: 2.45, w: 5.0, h: 0.55, fill: { color: PRIMARY }, line: { type: "none" } });
  s.addText("表头自动重复（序号/姓名/…/签字栏）", { x: 7.62, y: 2.45, w: 4.7, h: 0.55, fontSize: 12.5, bold: true, fontFace: F, color: WHITE, valign: "middle", margin: 0 });
  [1, 2, 3].forEach((k) => {
    s.addShape(p.shapes.RECTANGLE, { x: 7.48, y: 3.2 + k * 0.62, w: 5.0, h: 0.5, fill: { color: PANEL }, line: { color: "DCE7E5", width: 1 } });
    s.addText("王五", { x: 7.6, y: 3.2 + k * 0.62, w: 0.9, h: 0.5, fontSize: 12, fontFace: F, color: "8AA19D", valign: "middle", margin: 0 });
    s.addText(`续页第 ${k} 件 · 姓名淡色重复`, { x: 8.6, y: 3.2 + k * 0.62, w: 3.8, h: 0.5, fontSize: 12, fontFace: F, color: TEXT, valign: "middle", margin: 0 });
  });
  s.addText("小块（≤14 行）整块不跨页；大块续页每行重复姓名（淡色），页脚自动加页码。", { x: M, y: 6.45, w: 12.2, h: 0.4, fontSize: 14, bold: true, fontFace: F, color: "B45309", margin: 0 });
})();

/* =============== 28 章节页 04 =============== */
divider("04", "技术架构", ["三进程模型", "数据流动", "确定性设计", "安全与可靠性", "麒麟适配", "质量与 CI"]);

/* =============== 29 技术栈 =============== */
(() => {
  const s = slide();
  header(s, "STACK", "技术栈：全部开源、全部本地");
  const stack = [
    ["Electron 37", "跨平台桌面壳", "主"],
    ["Vue 3 + Pinia", "界面与状态管理", "主"],
    ["TypeScript 5", "全量类型检查（tsc + vue-tsc）", "主"],
    ["Element Plus", "中文界面组件库", "主"],
    ["SheetJS (xlsx)", "Excel 读写", "辅"],
    ["PapaParse", "CSV 解析", "辅"],
    ["iconv-lite", "GBK 等编码识别", "辅"],
    ["Vitest", "86 个自动化测试", "辅"]
  ];
  stack.forEach(([t, d, tag], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.25, y = 1.85 + row * 1.2;
    cardShadow(s, x, y, 5.98, 0.96);
    s.addText(t, { x: x + 0.3, y: y + 0.1, w: 2.5, h: 0.4, fontSize: 15.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: x + 2.8, y: y + 0.1, w: 2.35, h: 0.8, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: x + 5.25, y: y + 0.16, w: 0.5, h: 0.32, fill: { color: tag === "主" ? PRIMARY : PRIM_SOFT }, rectRadius: 0.16, line: { type: "none" } });
    s.addText(tag, { x: x + 5.25, y: y + 0.16, w: 0.5, h: 0.32, fontSize: 11, bold: true, fontFace: F, color: tag === "主" ? WHITE : PRIMARY, align: "center", valign: "middle", margin: 0 });
  });
  s.addText("无数据库、无服务端、无网络请求——删掉安装目录即彻底卸载。", { x: M, y: 6.6, w: 12.2, h: 0.4, fontSize: 14, bold: true, fontFace: F, color: "B45309", margin: 0 });
})();

/* =============== 30 三进程架构 =============== */
(() => {
  const s = slide();
  header(s, "ARCHITECTURE", "三进程模型：能力与安全各就各位");
  // 渲染进程
  cardShadow(s, M, 2.0, 4.4, 3.6);
  s.addText("渲染进程（界面）", { x: 0.85, y: 2.2, w: 3.9, h: 0.42, fontSize: 17, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  ["Pinia 仓库（唯一数据源）", "分配算法（纯函数）", "Vue 组件 / 拖拽交互"].forEach((t, i) => {
    card(s, 0.85, 2.75 + i * 0.88, 3.8, 0.72, PANEL);
    s.addText(t, { x: 1.05, y: 2.75 + i * 0.88, w: 3.4, h: 0.72, fontSize: 13, fontFace: F, color: TEXT, valign: "middle", margin: 0 });
  });
  // preload
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 5.35, y: 2.9, w: 2.2, h: 1.8, fill: { color: ACCENT }, rectRadius: 0.1, line: { type: "none" } });
  s.addText("preload\n传话筒", { x: 5.35, y: 3.15, w: 2.2, h: 0.9, fontSize: 15, bold: true, fontFace: F, color: WHITE, align: "center", margin: 0 });
  s.addText("window.api 白名单", { x: 5.35, y: 4.05, w: 2.2, h: 0.4, fontSize: 11.5, fontFace: F, color: "7A4A05", align: "center", margin: 0 });
  // 主进程
  cardShadow(s, 7.95, 2.0, 4.8, 3.6);
  s.addText("主进程（管家）", { x: 8.25, y: 2.2, w: 4.2, h: 0.42, fontSize: 17, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  ["文件 IO / 对话框 / 最近文件", "CSV · Excel 解析 / 数据安检", "草稿 · 备份 · PDF / 打印"].forEach((t, i) => {
    card(s, 8.25, 2.75 + i * 0.88, 4.2, 0.72, PANEL);
    s.addText(t, { x: 8.45, y: 2.75 + i * 0.88, w: 3.8, h: 0.72, fontSize: 13, fontFace: F, color: TEXT, valign: "middle", margin: 0 });
  });
  // 箭头
  arrow(s, 5.02, 3.35, 0.3, PRIMARY); arrow(s, 5.02, 3.75, -0.3, PRIMARY);
  void 0;
  s.addShape(p.shapes.LINE, { x: 7.58, y: 3.35, w: 0.34, h: 0, line: { color: PRIMARY, width: 2.2, endArrowType: "triangle" } });
  s.addShape(p.shapes.LINE, { x: 7.92, y: 3.75, w: -0.34, h: 0, line: { color: PRIMARY, width: 2.2, endArrowType: "triangle" } });
  s.addText("invoke（异步请求）", { x: 5.0, y: 2.35, w: 2.9, h: 0.35, fontSize: 12, fontFace: F, color: MUTED, align: "center", margin: 0 });
  s.addText("sendSync（关窗同步兜底）", { x: 4.9, y: 4.85, w: 3.1, h: 0.35, fontSize: 12, fontFace: F, color: MUTED, align: "center", margin: 0 });
  s.addText("界面运行在沙箱中：不能碰磁盘、不能开网页；每一次读写都要经 preload 白名单「传话」给主进程代办。",
    { x: M, y: 5.95, w: 12.2, h: 0.75, fontSize: 14, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
})();

/* =============== 31 数据流动 =============== */
(() => {
  const s = slide();
  header(s, "DATA FLOW", "点下「生成方案」之后发生了什么");
  const steps = [
    ["拆件", "笔记本 ×3 → 3 个独立件"],
    ["贪心", "最贵的给拿得最少的"],
    ["优化", "挪 / 换缩差距"],
    ["统计", "差值 · 标准差 · 覆盖率"],
    ["入库", "存为新方案（可撤销）"],
    ["刷新", "界面重渲 + 1.5s 后存草稿"]
  ];
  steps.forEach(([t, d], i) => {
    const x = M + (i % 3) * 4.18, y = 1.95 + Math.floor(i / 3) * 2.15;
    cardShadow(s, x, y, 3.9, 1.75);
    s.addShape(p.shapes.OVAL, { x: x + 0.28, y: y + 0.26, w: 0.56, h: 0.56, fill: { color: i === 5 ? ACCENT : PRIMARY }, line: { type: "none" } });
    s.addText(String(i + 1), { x: x + 0.28, y: y + 0.26, w: 0.56, h: 0.56, fontSize: 19, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(t, { x: x + 1.0, y: y + 0.28, w: 2.7, h: 0.5, fontSize: 18, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(d, { x: x + 0.3, y: y + 1.0, w: 3.3, h: 0.6, fontSize: 13, fontFace: F, color: MUTED, margin: 0 });
    if (i % 3 < 2) arrow(s, x + 3.94, y + 0.54, 0.2);
  });
  s.addText("先算后存：任何一步抛异常（如超 5000 件），状态零变化、历史零污染。", { x: M, y: 6.4, w: 12.2, h: 0.4, fontSize: 14, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
})();

/* =============== 32 文件读写路径 =============== */
(() => {
  const s = slide();
  header(s, "PERSISTENCE", "你的数据住在哪里");
  const rows = [
    [".mproj 项目文件", "自选位置保存", "JSON 格式，跨机器可迁移，载入过安检"],
    [".bak 备份", "与项目同目录", "每次覆盖保存前自动生成上一步快照"],
    ["草稿 draft.mproj.json", "系统用户目录", "改动后 1.5s 防抖保存 + 关窗同步兜底"],
    ["recents.json", "系统用户目录", "最近 10 个项目，失效条目自动清理"]
  ];
  rows.forEach(([t, where, d], i) => {
    const y = 1.85 + i * 1.08;
    s.addText(t, { x: M, y: y, w: 3.6, h: 0.42, fontSize: 15.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(where, { x: 4.3, y: y + 0.03, w: 2.6, h: 0.4, fontSize: 13, fontFace: F, color: "B45309", bold: true, margin: 0 });
    s.addText(d, { x: 7.1, y: y + 0.03, w: 5.6, h: 0.4, fontSize: 13, fontFace: F, color: MUTED, margin: 0 });
    if (i < rows.length - 1) s.addShape(p.shapes.LINE, { x: M, y: y + 0.82, w: 12.23, h: 0, line: { color: "E8EFEE", width: 1 } });
  });
  card(s, M, 6.15, 12.23, 0.8, PANEL);
  s.addText("意外关闭？下次启动会询问「是否恢复草稿」——恢复的是完整项目状态，含方案与手动调整。",
    { x: 0.9, y: 6.15, w: 11.6, h: 0.8, fontSize: 14, fontFace: F, color: TEXT, valign: "middle", margin: 0 });
})();

/* =============== 33 确定性设计 =============== */
(() => {
  const s = slide();
  header(s, "DETERMINISM", "确定性：同样的输入，永远同样的结果");
  card(s, M, 1.9, 6.0, 4.3, "FBF3E4");
  s.addText("常见做法（我们放弃了）", { x: 0.95, y: 2.12, w: 5, h: 0.42, fontSize: 16.5, bold: true, fontFace: F, color: "B45309", margin: 0 });
  bullets(s, [
    "设一个墙钟时间预算（如 2.5 秒）",
    "快机器多算几轮，慢机器少算几轮",
    "同一清单，不同电脑 → 不同结果",
    "「公平」变成了碰运气"
  ], 0.95, 2.65, 5.1, 3.3, { gap: 12, size: 14 });
  card(s, 6.95, 1.9, 5.85, 4.3, PANEL);
  s.addText("本工具的做法", { x: 7.35, y: 2.12, w: 5, h: 0.42, fontSize: 16.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
  bullets(s, [
    "预算按「候选操作评估次数」计（200 万次）",
    "与机器快慢完全无关",
    "同输入两次运行结果逐字节一致",
    "另有 8 秒应急止损，仅极端规模触发并告警"
  ], 7.35, 2.65, 5.1, 3.3, { gap: 12, size: 14 });
  s.addText("回归测试锁定：500 件 / 50 人两次运行结果全等（tests/algorithms.spec.ts）。",
    { x: M, y: 6.45, w: 12.2, h: 0.4, fontSize: 14, bold: true, fontFace: F, color: ACCENT, margin: 0 });
})();

/* =============== 34 安全与可靠性 =============== */
(() => {
  const s = slide();
  header(s, "SECURITY", "安全与可靠性：看不见的地方更较真");
  const items = [
    ["沙箱 + 上下文隔离", "界面进程与系统隔离，preload 只暴露白名单 API"],
    ["导航拦截 + CSP", "禁止打开外部网页 / 新窗口；内容安全策略锁死脚本来源"],
    ["原子写入", "临时文件 + 改名覆盖：断电、磁盘满不留半截文件"],
    ["关窗确认", "有未保存修改时弹确认，退出前自动留草稿"],
    ["打印失败如实上报", "系统拒绝打印时明确报错，不再伪装成功"],
    ["CSV 防注入", "= 开头的内容自动转义，防止 Excel 执行公式"]
  ];
  items.forEach(([t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.25, y = 1.85 + row * 1.52;
    card(s, x, y, 5.98, 1.28);
    s.addText("✓", { x: x + 0.22, y: y + 0.34, w: 0.5, h: 0.5, fontSize: 22, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(t, { x: x + 0.85, y: y + 0.14, w: 5.0, h: 0.4, fontSize: 15.5, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(d, { x: x + 0.85, y: y + 0.56, w: 5.0, h: 0.6, fontSize: 12, fontFace: F, color: MUTED, margin: 0 });
  });
})();

/* =============== 34b 麒麟 V10 适配 =============== */
(() => {
  const s = slide();
  header(s, "KYLIN V10", "麒麟 V10 适配：三层防御，装上就能用");
  card(s, M, 1.8, 12.23, 1.25, "FBF3E4");
  s.addText([
    { text: "两个根因（实测定位）：", options: { bold: true, color: "B45309", breakLine: true } },
    { text: "① 系统自带 deb 图形安装器解析第三方包时自身崩溃（Python 报错），应用从未装上；", options: { color: TEXT, breakLine: true } },
    { text: "② Electron 发行包的 chrome-sandbox 缺少 SUID 位，内核较旧的麒麟直接拒绝启动。", options: { color: TEXT } }
  ], { x: 0.9, y: 1.8, w: 11.6, h: 1.25, fontSize: 13.5, fontFace: F, paraSpaceAfter: 4, valign: "middle", margin: 0 });

  const layers = [
    ["打包层", "afterPack 钩子强制 chrome-sandbox → 4755，Linux 产物出厂即带 SUID"],
    ["安装层", "deb 安装后脚本二次修正权限；tar.gz 内置 install.sh 一键安装，完全绕开系统安装器"],
    ["运行层", "启动时自动检测沙箱：不可用即自动降级 no-sandbox，保证必能打开；MB_DISABLE_GPU 兜底白屏"]
  ];
  layers.forEach(([t, d], i) => {
    const x = M + i * 4.18;
    cardShadow(s, x, 3.3, 3.9, 2.05);
    s.addText(String(i + 1), { x: x + 0.28, y: 3.5, w: 0.6, h: 0.6, fontSize: 26, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(t, { x: x + 0.95, y: 3.58, w: 2.7, h: 0.45, fontSize: 17, bold: true, fontFace: F, color: TEXT, margin: 0 });
    s.addText(d, { x: x + 0.3, y: 4.2, w: 3.3, h: 1.0, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
  });
  card(s, M, 5.7, 12.23, 1.0, PANEL);
  s.addText([
    { text: "CI 回归防线：", options: { bold: true, color: PRIMARY } },
    { text: "每次构建自动校验产物内 chrome-sandbox 必须为 4755（SUID）且 tar.gz 必须内置 install.sh——任何退步都会被拦下。", options: { color: TEXT } }
  ], { x: 0.9, y: 5.7, w: 11.6, h: 1.0, fontSize: 13.5, fontFace: F, valign: "middle", margin: 0 });
  s.addNotes("麒麟适配是 v1.1.1 的核心主题：根因两层（系统安装器缺陷 + SUID 缺失），修复三层（打包/安装/运行），CI 有回归校验。");
})();

/* =============== 35 质量保障（图表页） =============== */
(() => {
  const s = slide();
  header(s, "QUALITY", "质量保障：98 个测试组成的安全网");
  s.addChart(p.charts.BAR, [{
    name: "测试用例数",
    labels: ["算法", "导入/导出 IO", "数据仓库 store", "界面组件"],
    values: [23, 37, 32, 6]
  }], {
    x: M, y: 1.95, w: 6.6, h: 4.3, barDir: "col",
    chartColors: ["0F766E", "F59E0B", "14A89C", "8FD4CD"],
    varyColors: true, showValue: true, dataLabelPosition: "outEnd", dataLabelColor: "1F2D2B", dataLabelFontSize: 13, dataLabelFontFace: F,
    catAxisLabelColor: "647774", catAxisLabelFontSize: 12, catAxisLabelFontFace: F,
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    showLegend: false, chartArea: { fill: { color: "FFFFFF" } }
  });
  const pts = [
    ["三层防护网", "算法指标硬断言 + store 行为断言 + 解析/导出快照"],
    ["验收指标入测试", "100 物资/20 人差值 ≤ 平均 5% 直接写成断言"],
    ["确定性入测试", "500 件两次运行结果全等"],
    ["CI 强制执行", "lint → 类型检查 → 测试，不过不许打包"]
  ];
  pts.forEach(([t, d], i) => {
    const y = 2.0 + i * 1.15;
    s.addText(t, { x: 7.55, y: y, w: 5.2, h: 0.4, fontSize: 15.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: 7.55, y: y + 0.4, w: 5.2, h: 0.42, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
  });
  s.addText("数据来源：vitest 运行报告（2026-08，v1.1.0）", { x: M, y: 6.45, w: 8, h: 0.32, fontSize: 12, fontFace: F, color: MUTED, margin: 0 });
})();

/* =============== 36 CI/CD =============== */
(() => {
  const s = slide();
  header(s, "CI/CD", "从 git push 到安装包，全程无人值守");
  // 第一行：门禁
  const gate = ["git push", "ESLint 检查", "类型检查", "86 个测试"];
  gate.forEach((t, i) => {
    const x = M + i * 3.15;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.0, w: 2.6, h: 0.85, fill: { color: i === 0 ? "37544F" : PRIMARY }, rectRadius: 0.09, line: { type: "none" } });
    s.addText(t, { x, y: 2.0, w: 2.6, h: 0.85, fontSize: 15, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
    if (i < 3) arrow(s, x + 2.66, 2.42, 0.43);
  });
  s.addText("任一环节失败 → 构建直接被拦下", { x: 0, y: 3.0, w: W, h: 0.35, fontSize: 12.5, fontFace: F, color: "B45309", align: "center", margin: 0 });
  // 第二行：并行构建
  const builds = [["Windows x64", "安装版 + 便携版"], ["Linux ARM64", "deb + tar.gz（麒麟 V10）"]];
  builds.forEach(([t, d], i) => {
    const x = 2.2 + i * 4.8;
    cardShadow(s, x, 3.7, 4.1, 1.15);
    s.addText(t, { x: x + 0.3, y: 3.84, w: 3.5, h: 0.42, fontSize: 16, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: x + 0.3, y: 4.28, w: 3.5, h: 0.4, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
    arrow(s, i === 0 ? 4.3 : 9.1, 3.35, 0, PRIMARY); // 向下箭头用 shape 替代
    s.addShape(p.shapes.LINE, { x: i === 0 ? 4.28 : 9.08, y: 2.95, w: 0, h: 0.7, line: { color: PRIMARY, width: 2.2, endArrowType: "triangle" } });
  });
  // 第三行：产物/发布
  card(s, M, 5.35, 5.9, 1.1, PANEL);
  s.addText([{ text: "Artifacts 构建产物", options: { bold: true, color: PRIMARY, breakLine: true } }, { text: "每次 push 自动产出，保留 14 天", options: { color: MUTED } }],
    { x: 0.9, y: 5.35, w: 5.2, h: 1.1, fontSize: 13.5, fontFace: F, paraSpaceAfter: 4, valign: "middle", margin: 0 });
  card(s, 6.85, 5.35, 5.9, 1.1, "FBF3E4");
  s.addText([{ text: "打 v* 标签 → 自动发 Release", options: { bold: true, color: "B45309", breakLine: true } }, { text: "tag 与 package.json 版本一致性由 CI 校验", options: { color: MUTED } }],
    { x: 7.2, y: 5.35, w: 5.2, h: 1.1, fontSize: 13.5, fontFace: F, paraSpaceAfter: 4, valign: "middle", margin: 0 });
})();

/* =============== 37 项目结构 =============== */
(() => {
  const s = slide();
  header(s, "STRUCTURE", "项目结构：约 6000 行代码各司其职");
  s.addChart(p.charts.DOUGHNUT, [{
    name: "代码行数",
    labels: ["界面组件", "自动化测试", "主进程", "状态仓库", "分配算法", "共享契约等"],
    values: [2306, 1280, 957, 607, 533, 309]
  }], {
    x: M, y: 1.95, w: 5.4, h: 4.4, holeSize: 62,
    chartColors: ["0F766E", "F59E0B", "134E4A", "14A89C", "8FD4CD", "C9D6D4"],
    showPercent: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 12, dataLabelFontFace: F,
    showLegend: true, legendPos: "b", legendFontSize: 12, legendFontFace: F, legendColor: "647774",
    chartArea: { fill: { color: "FFFFFF" } }
  });
  const dirs = [
    ["src/main/", "管家：文件、解析、草稿、打印"],
    ["src/preload/", "传话筒：window.api 白名单"],
    ["src/renderer/", "界面 + 算法 + 仓库 + 导出"],
    ["src/shared/", "两边的契约：类型 + 安检"],
    ["tests/", "86 个用例的安全网"]
  ];
  dirs.forEach(([t, d], i) => {
    const y = 1.95 + i * 0.88;
    s.addText(t, { x: 6.7, y: y, w: 2.6, h: 0.4, fontSize: 14.5, bold: true, fontFace: "Consolas", color: PRIMARY, margin: 0 });
    s.addText(d, { x: 9.4, y: y + 0.02, w: 3.4, h: 0.4, fontSize: 12.5, fontFace: F, color: MUTED, margin: 0 });
  });
  s.addText("配套文档：docs/项目文件结构说明.md（小白版，含「改哪儿」速查表）", { x: 6.7, y: 6.35, w: 6.1, h: 0.4, fontSize: 12.5, bold: true, fontFace: F, color: ACCENT, margin: 0 });
})();

/* =============== 38 章节页 05 =============== */
divider("05", "使用指南与展望", ["五步上手", "快捷键", "性能指标", "版本路线"]);

/* =============== 39 五步上手 =============== */
(() => {
  const s = slide();
  header(s, "GET STARTED", "五步上手：从安装到签字");
  const steps = [
    ["准备清单", "下载模板照着填，或直接导入现有 Excel"],
    ["导入 / 录入", "物资 + 人员各就各位，顺手设标题与货币"],
    ["一键生成", "选「贪心 + 优化」，差值立刻可见"],
    ["微调确认", "拖拽个别件、锁定特殊归属、排除请假者"],
    ["打印签收", "A4 表格直接打印，或导出 PDF 存档"]
  ];
  steps.forEach(([t, d], i) => {
    const x = M + i * 2.5;
    cardShadow(s, x, 2.1, 2.28, 3.3);
    s.addShape(p.shapes.OVAL, { x: x + 0.72, y: 2.45, w: 0.84, h: 0.84, fill: { color: i === 4 ? ACCENT : PRIMARY }, line: { type: "none" } });
    s.addText(String(i + 1), { x: x + 0.72, y: 2.45, w: 0.84, h: 0.84, fontSize: 28, bold: true, fontFace: F, color: WHITE, align: "center", valign: "middle", margin: 0 });
    s.addText(t, { x: x + 0.14, y: 3.5, w: 2.0, h: 0.42, fontSize: 16, bold: true, fontFace: F, color: TEXT, align: "center", margin: 0 });
    s.addText(d, { x: x + 0.18, y: 3.98, w: 1.92, h: 1.2, fontSize: 12, fontFace: F, color: MUTED, align: "center", margin: 0 });
    if (i < 4) arrow(s, x + 2.3, 3.75, 0.2);
  });
  s.addText("全程不需要联网、不需要注册、不需要看说明书。", { x: 0, y: 5.9, w: W, h: 0.45, fontSize: 16, bold: true, fontFace: F, color: PRIMARY, align: "center", margin: 0 });
})();

/* =============== 40 快捷键 =============== */
(() => {
  const s = slide();
  header(s, "SHORTCUTS", "快捷键：手不离键盘");
  const keys = [
    ["Ctrl + N", "新建项目"], ["Ctrl + O", "打开项目"], ["Ctrl + S", "保存"], ["Ctrl + Shift + S", "另存为"],
    ["Ctrl + P", "打印"], ["Ctrl + Z", "撤销（50 步）"], ["Ctrl + Y", "重做"], ["拖入文件", "打开 / 导入对应类型"]
  ];
  keys.forEach(([k, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.25, y = 1.85 + row * 1.15;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.5, h: 0.72, fill: { color: PANEL_DEEP }, rectRadius: 0.08, line: { type: "none" } });
    s.addText(k, { x, y, w: 2.5, h: 0.72, fontSize: 15, bold: true, fontFace: "Consolas", color: PRIMARY, align: "center", valign: "middle", margin: 0 });
    s.addText(d, { x: x + 2.75, y: y + 0.14, w: 3.1, h: 0.45, fontSize: 15, fontFace: F, color: TEXT, valign: "middle", margin: 0 });
  });
  card(s, M, 6.15, 12.23, 0.8, PANEL);
  s.addText("输入框内的 Ctrl+Z 保留系统文本撤销，与项目撤销互不干扰；按住不放只算一步，不会穿透历史。",
    { x: 0.9, y: 6.15, w: 11.6, h: 0.8, fontSize: 13.5, fontFace: F, color: MUTED, valign: "middle", margin: 0 });
})();

/* =============== 41 性能与验收 =============== */
(() => {
  const s = slide();
  header(s, "PERFORMANCE", "性能与验收：指标写在测试里");
  stat(s, M, 2.0, 3.9, "0.39s", "500 件 / 50 人优化耗时（要求 < 3s）", false, ACCENT);
  stat(s, 4.72, 2.0, 3.9, "≤ 5%", "100 物资 / 20 人最大差值 / 平均值");
  stat(s, 8.88, 2.0, 3.9, "200 万", "候选评估预算（确定性上限）");
  const rows = [
    ["5000 件上限", "超限提前拦截并提示，杜绝界面卡死"],
    ["200 人上限", "与件数上限配合，任何操作瞬时响应"],
    ["50 步撤销", "快照式实现，任意回跳"],
    ["30 个方案", "历史容量充足，自动淘汰最旧"]
  ];
  rows.forEach(([t, d], i) => {
    const y = 4.15 + i * 0.68;
    s.addText(t, { x: M + 0.6, y: y, w: 2.6, h: 0.4, fontSize: 14.5, bold: true, fontFace: F, color: PRIMARY, margin: 0 });
    s.addText(d, { x: 4.1, y: y + 0.02, w: 8.6, h: 0.4, fontSize: 13.5, fontFace: F, color: TEXT, margin: 0 });
  });
})();

/* =============== 42 版本与展望 =============== */
(() => {
  const s = slide();
  header(s, "ROADMAP", "版本路线：1.0 → 1.1 → 未来");
  // 时间轴
  s.addShape(p.shapes.LINE, { x: 1.2, y: 2.6, w: 9.6, h: 0, line: { color: PRIM_SOFT, width: 3 } });
  const ver = [
    ["v1.0.0", "2025-08", "三策略 · 打印导出 · 项目文件 · 撤销重做", false],
    ["v1.1.1（当前）", "2026-09", "麒麟适配三层防御 · install.sh 一键安装 · 30+ 缺陷修复 · 未分配池 · 锁定重优化 · Excel 导出", true],
    ["未来", "—", "打印预览与边距配置 · 代码签名 · SheetJS 升级 · 界面主题", false]
  ];
  ver.forEach(([t, d, desc, cur], i) => {
    const x = 1.2 + i * 3.7;
    s.addShape(p.shapes.OVAL, { x: x - 0.12, y: 2.48, w: 0.26, h: 0.26, fill: { color: cur ? ACCENT : PRIMARY }, line: { type: "none" } });
    s.addText(t, { x: x - 0.12, y: 2.95, w: 3.4, h: 0.42, fontSize: 17, bold: true, fontFace: F, color: cur ? "B45309" : TEXT, margin: 0 });
    s.addText(d, { x: x - 0.12, y: 3.4, w: 3.0, h: 0.35, fontSize: 13, fontFace: F, color: MUTED, margin: 0 });
    s.addText(desc, { x: x - 0.12, y: 3.85, w: 3.55, h: 1.15, fontSize: 12.5, fontFace: F, color: TEXT, margin: 0 });
  });
  card(s, M, 5.4, 12.23, 1.15, PANEL);
  s.addText([
    { text: "v1.1.0 修复的关键缺陷（节选）：", options: { bold: true, color: PRIMARY, breakLine: true } },
    { text: "损坏文件不再崩溃 · 算法结果跨机器一致 · 数量调整后不再静默漏分配 · 关窗未保存确认 · 打印失败如实报错 · CSV 防公式注入", options: { color: TEXT } }
  ], { x: 0.9, y: 5.4, w: 11.6, h: 1.15, fontSize: 13.5, fontFace: F, paraSpaceAfter: 5, valign: "middle", margin: 0 });
})();

/* =============== 43 结束页 =============== */
(() => {
  const s = slide(true);
  s.addShape(p.shapes.LINE, { x: 4.4, y: 4.62, w: 4.53, h: 0, line: { color: PRIM_SOFT, width: 3 } });
  s.addShape(p.shapes.ISOSCELES_TRIANGLE, { x: 6.44, y: 4.68, w: 0.46, h: 0.4, fill: { color: ACCENT }, line: { type: "none" } });
  s.addShape(p.shapes.OVAL, { x: 3.98, y: 4.28, w: 0.68, h: 0.68, fill: { color: PRIM_MID }, line: { type: "none" } });
  s.addShape(p.shapes.OVAL, { x: 8.68, y: 4.28, w: 0.68, h: 0.68, fill: { color: PRIM_MID }, line: { type: "none" } });
  s.addText("谢谢观看", { x: 0, y: 2.0, w: W, h: 1.0, fontSize: 50, bold: true, fontFace: F, color: WHITE, align: "center", charSpacing: 6, margin: 0 });
  s.addText("愿每一次发放，都分得明明白白", { x: 0, y: 3.1, w: W, h: 0.5, fontSize: 18, fontFace: F, color: PRIM_SOFT, align: "center", margin: 0 });
  s.addText("github.com/lzh745200/material-balancer   ·   v1.1.1   ·   MIT License",
    { x: 0, y: 5.55, w: W, h: 0.4, fontSize: 14, fontFace: F, color: PRIM_SOFT, align: "center", margin: 0 });
})();

const path = require("path");
p.writeFile({ fileName: path.join(__dirname, "..", "docs", "系统介绍.pptx") }).then(() => console.log("DONE, slides:", pageNo));
