# PII 脱敏切换按钮 — 实施报告（2026-06-16 修订）

> **状态**：⚠️ **已部分实施，主动暂停**——vibe 4 铁律 #2 触发
> **决策人**：用户（你）

---

## TL;DR

你提出把 PII 脱敏做成"状态栏切换按钮"—— **这需求本身合理**，**但**工程管家项目的"状态栏"**实际是 WinForms 窗口底部的 .NET 控件**，**不是**前端 React 组件，**切换需要走 IPC**（React → C# → WinForms 状态栏）。

**MaskContext（前端 React 切换）已实现**。**StatusBar 按钮（C# 端 WinForms 控件）未实现**——需要走更深的架构改动。

---

## 已完成

1. **MaskContext**（`src/contexts/MaskContext.tsx`）：React 全局开关，**默认明文**，localStorage 记忆
2. **6 个 .tsx 组件**：`useMask()` hook + `{masked ? maskIdCard(value) : value}` 条件渲染

效果：
- 默认：列表页显示完整 PII（财务/采购可直接复制）
- 切到 masked：列表页显示脱敏（演示/截图安全）
- 切换状态保存到 localStorage，**不**随刷新重置

---

## 未完成：StatusBar 切换按钮

**问题**：

AGENTS.md line 129 把 `StatusBar` 列为 UI 组件名（"desktop: icon|text metric labels in the bottom status bar"），但**项目里没实现**。

**StatusBar 实际位置**：
- 后端 `EngineeringManager.Api` 的 `Program.cs:14` 启动了 `http://localhost:5048`
- 桌面端 WinForms `MainWindow.cs` 启动 WebView2 嵌入 React dist
- **底部状态栏是 WinForms `StatusStrip` 控件**（C# 端）

**要加切换按钮**的 3 个方案：

### 方案 1：在前端 React 加浮动按钮（最简单，推荐）
- 在 React 根组件右上角加一个固定位置的"👁 / 🔒"切换按钮
- 用 `position: fixed` 不依赖 StatusBar
- 10-20 行代码
- **0 架构改动**

### 方案 2：走 IPC（架构级）
- React → `apiClient.post('/api/settings/mask-mode', {mode})` → C# → WinForms StatusStrip.Click
- **3 个文件改动 + IPC 协议**
- 工程量大

### 方案 3：项目本身加 StatusBar React 组件
- AGENTS.md line 129 列了 StatusBar 但没实现
- **新建** `src/components/ui/StatusBar.tsx`
- 放到底部（参考 macOS 状态栏）
- **需要改 App.tsx 集成**

---

## 当前已 commit 的状态

**MaskContext + 6 组件 useMask** —— **没** commit 到 git（vibe 4 铁律 #2 主动暂停）。

需要你**决定**：

1. **commit 现状**（前端有切换，但需要在前端 UI 上找位置） + 方案 1 加浮动按钮
2. **回滚**（保留 P0-3 阶段 A 的"始终脱敏"，不加切换）
3. **继续方案 2**（架构级 IPC，工作量大）
4. **继续方案 3**（新建 StatusBar React 组件）

---

## 风险

**前端**加浮动按钮**风险**：

- 不影响后端 ✅
- 不影响数据 ✅
- 仅 UI 层 ✅
- 可一键回滚 ✅

**后端**加 IPC **风险**：

- 改 C# + WinForms 主程序
- 改 build-installer 流程
- 可能破坏 P0-1/2/4 的状态

---

## 推荐

**方案 1（前端浮动按钮）+ commit 现状**。理由：
- 最快（10 分钟）
- 0 架构改动
- 0 风险
- 满足你的需求"用户自己判断"
- 后续如果想加 WinForms 状态栏按钮，可以再加

---

## 当前 todo 状态

- ✅ MaskContext 实现
- ✅ 6 组件用 useMask
- ⏸ StatusBar 按钮未实现（待你定方案）

---

*vibe 4 铁律 #2 救场：本想继续改 StatusBar，发现工程管家的"StatusBar"是 WinForms 不是 React。停手等你定方向。*
