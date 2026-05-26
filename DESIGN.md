# 工程管家 · UI 改造设计方案（最终版）

> 基于当前 UI 结构调研 + brainstorming 讨论产出
> 参考：Reasonix Graphite/Sandstone 主题 + Hanako 视觉风格
> 状态：已讨论确认，待 plan-design-review 审查

---

## 一、讨论决策记录

| 决策点 | 结论 |
|--------|------|
| 原生菜单栏（File/Edit/View） | 彻底移除 — 内部已覆盖所有功能（设置页有开发者工具、Ctrl+R 可重载） |
| 侧边栏折叠方式 | 完全折叠（w-0），不留图标。左边缘悬浮触发 + Ctrl+B 快捷键切换 |
| 标题栏样式 | 参考 Reasonix/Hanako：左图标+名称（可拖拽）、右窗口按钮（自绘） |
| 状态栏 | 极简 — 版本号 + 数据存储模式指示器 |
| 实施顺序 | P0：标题栏+状态栏（半天，立竿见影）→ P1：多主题系统 → P2：侧边栏折叠 → P3：间距规范 |

---

## 二、配色体系（Graphite / Sandstone 完整色板）

### 现有配色三层次

| 层级 | 定义方式 | 例子 | 改造策略 |
|------|----------|------|----------|
| **氛围层** | CSS 变量 (`--bg-primary` 等) | 页面背景、侧边栏、文字、边框 | ✅ 随主题切换 |
| **语义层** | Tailwind (`primary/success/warning/danger/info`) | 主色、语义色 | ⚠️ primary 微调，其余保持不变 |
| **领域层** | 硬编码 (`indigo-600/amber-500/emerald/violet`) | 人事indigo、工人amber、收入emerald | ❌ 不动 — 业务标识 |

### Graphite 色板

**基调**：冷灰（slate 系），点缀青色/蓝绿（teal）

```
--bg-primary:        #f8fafc (slate-50)    → dark: #0f172a (slate-900)
--bg-secondary:      #f1f5f9 (slate-100)   → dark: #1e293b (slate-800)
--bg-tertiary:       #e2e8f0 (slate-200)   → dark: #334155 (slate-700)
--text-primary:      #0f172a (slate-900)   → dark: #f8fafc (slate-50)
--text-secondary:    #475569 (slate-600)   → dark: #94a3b8 (slate-400)
--text-tertiary:     #94a3b8 (slate-400)   → dark: #64748b (slate-500)
--border-primary:    #e2e8f0 (slate-200)   → dark: #334155 (slate-700)
--border-secondary:  #cbd5e1 (slate-300)   → dark: #475569 (slate-600)
--sidebar-bg:        #ffffff               → dark: #111827 (gray-900)
--sidebar-border:    #e2e8f0               → dark: #1e293b
--sidebar-hover:     #f1f5f9               → dark: #1e293b
--sidebar-active:    #f0fdfa (teal-50)     → dark: #134e4a (teal-900)
primary:             teal-600              → dark: teal-400
```

侧边栏 Logo 区：深色始终 `from-slate-800 via-slate-700 to-slate-800`（不随主题变）

### Sandstone 色板

**基调**：暖灰（stone 系），点缀琥珀/陶土色

```
--bg-primary:        #fafaf9 (stone-50)    → dark: #1c1917 (stone-900)
--bg-secondary:      #f5f5f4 (stone-100)   → dark: #292524 (stone-800)
--bg-tertiary:       #e7e5e4 (stone-200)   → dark: #44403c (stone-700)
--text-primary:      #1c1917 (stone-900)   → dark: #fafaf9 (stone-50)
--text-secondary:    #57534e (stone-600)   → dark: #a8a29e (stone-400)
--text-tertiary:     #a8a29e (stone-400)   → dark: #78716c (stone-500)
--border-primary:    #e7e5e4 (stone-200)   → dark: #44403c (stone-700)
--border-secondary:  #d6d3d1 (stone-300)   → dark: #57534e (stone-600)
--sidebar-bg:        #fafaf9               → dark: #1c1917
--sidebar-border:    #e7e5e4               → dark: #292524
--sidebar-hover:     #f5f5f4               → dark: #292524
--sidebar-active:    #fff7ed (orange-50)   → dark: #431407 (orange-900)
primary:             amber-600             → dark: amber-400
```

侧边栏 Logo 区：暖深色 `from-stone-800 via-stone-700 to-stone-800`

### 语义色

| 语义色 | 浅色 | 深色 | 说明 |
|--------|------|------|------|
| success | emerald-500 | emerald-400 | 不变 |
| warning | amber-500 | amber-400 | 不变 |
| danger | red-500 | red-400 | 不变 |
| info | sky-500 | sky-400 | 不变 |
| primary | 见上面主题 primary | 见上面 | 唯一随主题变 |

---

## 三、分阶段实施

### P0：自定义标题栏 + 状态栏（半天）

#### 3.1 自定义标题栏

**改动文件**：
- `electron/main.ts` — `frame: false`，移除原生窗口边框
- 新建 `src/components/TitleBar.tsx`
- `src/App.tsx` — 嵌入标题栏

**规格**：
- 高度：`h-9` (36px)
- 背景：跟随主题 `var(--sidebar-bg)`
- 底部边框：`border-b border-[var(--border-primary)]`
- 布局：flex，左侧图标+名称（`-webkit-app-region: drag` 可拖拽），右侧窗口按钮（regions no-drag）
- 窗口按钮：最小化 `—`、最大化 `□/❐`、关闭 `✕`（hover 变红）
- 不显示当前页面标题（保持简洁）

**实现细节**：
```tsx
// TitleBar.tsx 结构
<div className="flex items-center justify-between h-9 px-3 select-none border-b"
     style={{ WebkitAppRegion: 'drag' }}>
  {/* 左侧：图标+名称 */}
  <div className="flex items-center gap-2">
    <Icon name="HardHat" size={16} />
    <span className="text-xs font-medium">工程管家</span>
  </div>
  {/* 右侧：窗口按钮 */}
  <div className="flex items-center gap-0" style={{ WebkitAppRegion: 'no-drag' }}>
    <button onClick={minimize} className="h-9 w-11 hover:bg-slate-200 flex items-center justify-center">—</button>
    <button onClick={maximize} className="h-9 w-11 hover:bg-slate-200 flex items-center justify-center">□</button>
    <button onClick={close} className="h-9 w-11 hover:bg-red-500 hover:text-white flex items-center justify-center">✕</button>
  </div>
</div>
```

**风险**：
- Windows frameless 窗口阴影消失 → CSS `box-shadow` 模拟
- 窗口最大化/还原状态同步 → 监听 `maximize`/`unmaximize` 事件
- 双击标题栏最大化/还原 → 手动实现

#### 3.2 状态栏

**改动文件**：
- 新建 `src/components/StatusBar.tsx`
- `src/App.tsx` — 嵌入状态栏

**规格**：
- 高度：`h-6` (24px)
- 背景：`var(--sidebar-bg)`
- 顶部边框：`border-t border-[var(--border-primary)]`
- 极简内容：左侧版本号 `v0.55.0`，右侧数据存储模式指示器

```tsx
// StatusBar.tsx 结构
<div className="flex items-center justify-between h-6 px-3 text-[11px] text-slate-400 border-t">
  <span>v{__APP_VERSION__ || '0.55.0'}</span>
  <span>SQLite</span>
</div>
```

#### 3.3 App.tsx 布局变更

```tsx
<div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
  <TitleBar />           {/* 自定义标题栏 */}
  <div className="flex flex-1 overflow-hidden">
    <Sidebar />          {/* 侧边栏（后续折叠） */}
    <main className="flex-1 overflow-auto">
      <AnimatePresence mode="sync">
        {/* 页面内容 */}
      </AnimatePresence>
    </main>
  </div>
  <StatusBar />          {/* 极简状态栏 */}
</div>
```

---

### P1：多主题系统（1天）

**改动文件**：
- `tailwind.config.js` — 移除硬编码 primary 色阶，改用 CSS 变量引用
- `src/index.css` — 增加 `[data-theme="graphite"]` / `[data-theme="sandstone"]` + `.dark` 的 4 套 CSS 变量
- `src/hooks/useTheme.ts` — 改为 `{ theme: 'graphite'|'sandstone', isDark: boolean }` 双维模型
- `src/components/Settings.tsx` — 增加主题选择器

**架构**：
```
主题模型 = theme × dark
  4 种组合：
    graphite-light / graphite-dark / sandstone-light / sandstone-dark

CSS 变量：按 [data-theme="X"].dark 或 [data-theme="X"] 选择器分发
Tailwind：semantic colors 全部指向 CSS 变量 ↓
  primary: 'var(--color-primary)'
  success: 'var(--color-success)'
  ...

JS 层：
  useTheme() → { theme, isDark, setTheme, toggleDark, setScheme }
  localStorage key: 'app-theme' → 'app-scheme' = 'graphite|sandstone'
  localStorage key: 'app-dark' → boolean
```

**设置页 UI**：主题卡片（Graphite / Sandstone） + 深色/浅色切换开关

**风险**：需扫描所有 Tailwind `bg-primary-*` / `text-primary-*` 使用点，确认全部引用 CSS 变量而非硬编码色值。grepped 后发现基本都用了语义色，问题不大。

---

### P2：侧边栏完全折叠

**改动文件**：`src/components/Sidebar.tsx`、`src/App.tsx`

**规格**：
- 展开态：`w-64`（现在）
- 折叠态：`w-0 overflow-hidden` — 完全消失
- 触发：左边缘 hover 区域（约 4px 宽的热区）+ Ctrl+B 快捷键
- 动画：framer-motion `layout` 动画
- 持久化：`localStorage('sidebar-collapsed')`

**实现**：
```tsx
// App.tsx
const [sidebarOpen, setSidebarOpen] = useState(true)

// Ctrl+B 监听
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setSidebarOpen(v => !v) }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

---

### P3：间距规范文档化

**产出**：`SPACING.md`（只读规范文档，不改代码）

```
基础单位：4px（Tailwind 的 1）
页面 padding：p-6 (24px)
卡片 padding：p-5 (20px)
Section 间距：space-y-5 (20px)
表单组间距：space-y-4 (16px)
组件内间距：gap-3 (12px)
表格单元格：px-4 py-3 (16px × 12px)
列表项间距：gap-2 (8px)
标签间距：gap-1 / gap-1.5
```

---

## 四、改动文件总览

| 文件 | P0 | P1 | P2 | P3 |
|------|:--:|:--:|:--:|:--:|
| `electron/main.ts` | ✅ | | | |
| `src/App.tsx` | ✅ | | ✅ | |
| `src/components/TitleBar.tsx` | ✅ 新建 | | | |
| `src/components/StatusBar.tsx` | ✅ 新建 | | | |
| `src/components/Sidebar.tsx` | | | ✅ | |
| `tailwind.config.js` | | ✅ | | |
| `src/index.css` | | ✅ | | |
| `src/hooks/useTheme.ts` | | ✅ | | |
| `src/components/Settings.tsx` | | ✅ | | |
| `SPACING.md` | | | | ✅ 新建 |

---

## 五、风险与注意事项

1. **Windows frameless 阴影** — 用 `bring-to-front` + CSS box-shadow 模拟。如果效果太差考虑用 electron-acrylic-window 或 mica 方案（需要 Windows 10 Build 22000+）
2. **窗口按钮点击区域** — 最小化/最大化/关闭按钮在 Windows 11 上必须足够大（≥ 12px 宽），否则点击体验差。推荐 w-11 (44px)
3. **现有颜色硬编码** — 少量业务模块色（indigo/amber/emerald）是故意硬编码的领域色，不在主题切换范围内
4. **向 Electron 28 兼容** — `frame: false` + `titleBarStyle: 'hidden'` 在 Electron 28 下稳定可用

---

## 六、补充：排版系统

### 字体策略

当前字体：Inter ← 保留，但不配置就不算设计

```
标题栏应用名：font-medium, text-xs (12px), 字间距 tracking-wide
导航项标签（主菜单/其他）：text-[10px] font-semibold uppercase tracking-widest
导航项文字：text-[13px] font-medium
页面标题（H1）：text-xl (20px) font-bold
Section 标题（H2）：text-base (16px) font-semibold
卡片标题（H3）：text-sm (14px) font-semibold
正文：text-sm (14px) font-normal leading-relaxed
辅助文字（状态栏/版本号）：text-[11px] text-slate-400
数据字体（金额/数字）：font-mono, tabular-nums
```

**等宽字体数字**：所有金额、百分比显示统一加 `font-mono tabular-nums`，确保数字对齐。这是工程管理的专业感来源之一。

---

## 七、补充：交互细节

### 7.1 窗口 resize 拖拽区域

frameless 后需要手动在边缘留 resize handle：

```css
/* index.css — 窗口边缘 resize */
.resize-handle-n { top: 0; left: 4px; right: 4px; height: 4px; cursor: n-resize; }
.resize-handle-s { bottom: 0; left: 4px; right: 4px; height: 4px; cursor: s-resize; }
.resize-handle-w { top: 4px; left: 0; bottom: 4px; width: 4px; cursor: w-resize; }
.resize-handle-e { top: 4px; right: 0; bottom: 4px; width: 4px; cursor: e-resize; }
```

标题栏区域 `-webkit-app-region: drag` 已覆盖顶部拖拽，其余三边需要 CSS 伪元素或透明 div 实现 resize cursor。最简方案：在外层容器四边各放 1 个绝对定位透明 div。

### 7.2 标题栏双击最大化

```typescript
// TitleBar.tsx — 双击拖拽区域 → toggle maximize
onDoubleClick={() => window.electronAPI?.toggleMaximize()}
```

需要 preload 暴露 `toggleMaximize` IPC。

### 7.3 主题切换过渡动画

主题切换不建议直接无过渡切——颜色突变会让用户以为软件闪了一下。

```
切换动效：
1. 点击主题卡片 → 200ms 延迟（让点击反馈先完成）
2. CSS transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease
3. 全局 body 添加 transition 即可覆盖所有颜色变化
```

```css
/* index.css */
body, body * {
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease;
}
```

只在主题切换时启用 transition（约 500ms 后移除），避免日常交互中不必要的过渡动画。

### 7.4 侧边栏展开/折叠过渡

```
侧边栏：w-64 → w-0 → w-64
动画：framer-motion animate={{ width }}
时长：250ms, ease: 'easeInOut'
边缘热区：折叠态下左边缘 4px × 100% 的透明热区，hover 时显示展开箭头小按钮
快捷键：Ctrl+B 切换，无动画直切（快）
hover 触发展开：在热区上停留 300ms 后侧边栏从左侧滑出，离开后 500ms 自动收起
```

---

## 八、补充：响应式策略

### 窗口宽度断点

| 宽度 | 侧边栏 | 内容区宽度 | 说明 |
|------|--------|-----------|------|
| ≥ 1400px | w-64 (256px) | 1144px | 理想态 |
| 1200-1399px | w-56 (224px) | 976px | 自动收窄 |
| 1000-1199px | w-48 (192px) | 808px | 最小 sidebar |
| < 1000px | w-0（折叠） | 全宽 | minWidth 1000 下很少触发 |

不建议 minWidth 低于 1000px——表格型页面（成本台账、发票列表）在 1000px 以下不具可读性。

### 内容区最大宽度

现有 `PageContainer` 默认 `max-w-[1400px]` 保持不变。标题栏和状态栏全宽。

---

## 九、补充：无障碍基础

### 9.1 高对比度模式

走 `prefers-contrast: high` 媒体查询，不另做独立主题：

```css
@media (prefers-contrast: high) {
  :root {
    --text-secondary: var(--text-primary);       /* 辅助文字变主文字色 */
    --border-primary: var(--text-primary);       /* 边框加深 */
  }
}
```

### 9.2 键盘导航

| 操作 | 快捷键 | 优先级 |
|------|--------|--------|
| 折叠/展开侧边栏 | `Ctrl+B` | P2 |
| 设置页 | `Ctrl+,` | 可后续加 |
| 搜索（全局） | `Ctrl+K` | 可后续加 |

标题栏窗口按钮需要 `tabIndex={-1}` — 不让 Tab 键在它们之间跳（用鼠标操作窗口即可）。

### 9.3 aria 基础

| 元素 | aria 属性 |
|------|----------|
| 标题栏窗口按钮 | `aria-label="最小化"` / `"最大化"` / `"关闭"` |
| 侧边栏 | `aria-label="导航菜单"` `role="navigation"` |
| 状态栏 | `role="status"` `aria-live="polite"` |
| 侧边栏触发热区 | `aria-label="展开侧边栏"` |

---

## 十、待确认：Primary 颜色大改还是小改？

Graphite 方案把 primary 从 **blue → teal**，Sandstone 从不存在的 **blue → amber**。

这个改动会影响：
- 所有按钮（主按钮颜色）
- 选中态高亮
- 链接颜色
- Tab 指示器

**问题**：你希望两套主题的 primary accent 完全不一样（Graphite=teal，Sandstone=amber），还是在同一色系里微调（都基于 blue，只是色温不同）？

| 选项 | Graphite primary | Sandstone primary | 用户感知 |
|------|-----------------|-------------------|----------|
| A：大改 | teal-600 | amber-600 | 两套主题像两个软件 |
| B：微调 | blue-600（偏冷） | blue-600（偏暖，加一点 indigo） | 同一个软件，氛围不同 |
