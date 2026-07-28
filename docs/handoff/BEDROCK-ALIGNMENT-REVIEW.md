# Bedrock 设计语言对齐 Sprint — 审查材料

> 生成时间：2026-07-27 · 分支工作区快照（未提交）
> 类型：refactor sprint（视觉/设计系统对齐，按版本规范不 bump 版本号）
> 规模：**317 文件改动，+4274 / -4715 行**（净 -441 行，含死代码清除）
> 新增文件：FormStepper.tsx / SectionHeader.tsx / NoAccessState.tsx / ProjectTable.tsx / Mascot.tsx + 3 个 codemod 脚本

---

## 一、验收标准逐条证据

| # | 验收项 | 证据 | 状态 |
|---|--------|------|------|
| 1 | 后端编译 | `dotnet build` → **0 警告 0 错误**（1.4s） | ✅ |
| 2 | 后端测试 | `dotnet test` → **642/644 通过**；2 个失败均为 SttE2ETests 的 ffmpeg 环境依赖缺失（验证机 PATH 无 ffmpeg.exe），复跑稳定复现同因；本 sprint 后端零文件改动（git status 确认），非回归 | ⚠️ 环境依赖 |
| 3 | 前端规则检查 | `npm run check` → **BUILD PASSED**（0 HARD FAIL，14 历史软警告） | ✅ |
| 4 | vite build | 6.4s 成功 | ✅ |
| 5 | tsc --noEmit | **0 error** | ✅ |
| 6 | vitest 全量 | **162 files / 1601 tests 全通过** | ✅ |
| 7 | 浏览器实证 | admin 登录 + 10 屏截图（登录/AI主页/发票/结算/人事×2/工人/模板/设置/外壳） | ✅ |

## 二、变更主题（8 大类）

### 1. 色彩 Token 化 100%（约 200 文件）
- 全部 `primary-*` / `gray-*` / `bg-white` / `bg-slate-*` 硬编码 → CSS 变量 token
  （`--fg` `--fg-2` `--muted` `--accent` `--accent-soft` `--on-accent` `--card` `--panel-2` `--border` `--bg`）
- 双对比模式区分：`--accent`/`--on-accent`（主按钮）vs `--fg`/`--bg`（高对比反转：侧栏 active/tooltip）
- index.css 死代码清除：graphite/sandstone 主题的 32 行 `.bg-primary-*` 覆盖选择器（组件直用 token 后已无引用）
- 辅助脚本：`scripts/bedrock-*-codemod.mjs`（一次性迁移工具，保留备查）

### 2. 数字排版体系（约 60 文件）
- tailwind.config.js 新增：`text-numeric-xl`（28px/700/-0.03em）、`text-display-lg`（27px/750/-0.02em）
- **8 大业务模块全部数字列 → `font-mono tabular-nums`**（JetBrains Mono）：
  发票 S16 / 成本台账 S18 / 结算 S19 / 合同 S12 / 人事 S22 / 工人 S24 / 仓库 S25 / 薪酬 S23
- 覆盖范围：金额、编号、日期、时间戳（审计日志）、时长（录音/转写）、库存量、百分比进度
- KPI 数字 60+ 处统一 `text-numeric-xl font-mono tracking-tight`
- 豁免：SettlementPrintTemplate（纸质打印模板）、装饰性文本（人名/品牌名）

### 3. 阴影系统主题感知
- index.css 三主题各自定义：`--shadow-card` / `--shadow-card-hover` / `--shadow-lift`
  （white 0.07/0.1/0.12 · graphite 0.35/0.4/0.5 · sandstone 0.06/0.08/0.1，oklch 透明度）
- tailwind `boxShadow.card/card-hover/lift` → 指向 CSS 变量
- 全部内联 `boxShadow: rgba(...)` 清零（segmented control/Card hover/CARD_HOVER 常量）
- 卡片 hover-lift 统一：`hover:shadow-lift hover:-translate-y-0.5 hover:border-accent`
  （ProjectCard / SettlementProjectCard / WageProjectCard / TemplateDashboard / Card 组件）

### 4. 屏级结构对齐（S12-S33）
- **Sidebar**：active 项 → 实心填充药丸（`bg:var(--fg)` + `color:var(--bg)`）
- **FilterBar**：S21 contained 模式（`bg-panel-2 p-2.5 rounded-lg border`），`bare` prop 兼容旧用法
- **S22 人事列表**：avatar 首字母圆形头像+姓名首列 / pill 搜索框（`h-[34px] rounded-[22px] w-[240px]`）/ 状态徽章半透明模式（`bg-success-500/10 border-success-500/20`）
- **S24 工人列表**：28px avatar 首列 / 操作列 hover 显隐（`opacity-0 group-hover:opacity-100 focus-within:opacity-100`）
- **S23 薪酬**：ManagerSalaryCard 重写为两栏 ledger（应发/扣减 dashed 分隔 + Net Pay footer）
- **S20 结算表单**：新增 FormStepper 步骤条组件
- **S33 设置页**：侧栏用户头像片段 + 分类导航简化 active 态
- **S16 Badge outlined**：状态色 30% 半透明描边 + bg-transparent（accent 用 `color-mix(in oklch)` — Tailwind 3.4 不支持 var() 透明度修饰符）
- **S30 录音/转写**：计时器 numeric-xl / 段落时间戳 / 任务时长 mono

### 5. 通用状态屏（S37/S38/S39）
- **S37 EmptyState 重排**：w-16 图标容器+发丝边框、描述 max-w-[240px]（全站 30+ 使用点级联）
- **S38 NoAccessState 新组件**：居中 Lock 图标+文案+返回按钮；接入 App.tsx 三处路由守卫 fallback
  ⚠️ 修复真实缺陷：此前无权限用户（知识库/用户管理/设置）看到**完全空白页**
- **S39 Button loading 修复**：`仅 spinner` → `spinner + 文字`（提交中保留上下文，宽度不塌缩）
  Input 错误态经查已合规（danger 发丝边 + 下方错误文字 + aria）

### 6. 新组件（src/components/ui/）
| 文件 | 用途 | Stitch 屏 |
|------|------|-----------|
| FormStepper.tsx | 步骤条（active=bg-fg 圆圈/past=✓/future=半透明） | S20 |
| SectionHeader.tsx | 分区标题（icon+heading+border-b） | S14 |
| NoAccessState.tsx | 无权限占位（中性色，不吓人） | S38 |

### 7. Dev 环境修复（浏览器 E2E 验证时发现）
| 文件 | 问题 | 修复 |
|------|------|------|
| vite.config.ts | proxy target `localhost:5048` → Node 17+ 解析为 IPv6 ::1，后端仅监听 IPv4，proxy 永远 502 | → `127.0.0.1:5048` |
| src/services/api-client.ts | `VITE_API_BASE \|\| fallback` 吞掉 .env.development 的空串（空串=走 proxy），导致直连 5048 被 CORS 拦截 | → `??`（生产行为不变） |

### 8. 测试同步（约 20 文件）
- 3 个断言更新（Badge/Pagination/FileDropZone 的 token 类名）
- 1 个快照更新（BankReceiptBatch）
- 其余为 config 测试对 token 值的同步

## 三、关键新文件完整源码

### src/components/ui/NoAccessState.tsx（S38）
```tsx
import { Icon } from './Icon'
import { Button } from './Button'

interface NoAccessStateProps {
  title?: string
  description?: string
  onBack?: () => void
}

export function NoAccessState({
  title = '无访问权限',
  description = '当前账号没有查看此页面的权限，如需访问请联系管理员分配。',
  onBack,
}: NoAccessStateProps) {
  const handleBack = () => {
    if (onBack) { onBack(); return }
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center mb-4">
        <Icon name="Lock" size={24} className="text-[color:var(--muted)]" />
      </div>
      <h2 className="text-base font-semibold text-[color:var(--fg)] mb-1.5">{title}</h2>
      <p className="text-sm text-[color:var(--muted)] max-w-sm mb-6">{description}</p>
      <Button variant="secondary" size="sm" onClick={handleBack} leftIcon="ArrowLeft">
        返回工作台
      </Button>
    </div>
  )
}
```

### App.tsx 路由守卫接线（diff）
```diff
-case 'knowledge': return <RequirePermission permission="knowledge:read"><SpeechKnowledgePage /></RequirePermission>
-case 'users': return <RequireAdmin><Users /></RequireAdmin>
-case 'settings': return <RequirePermission permission="settings:read"><Settings /></RequirePermission>
+case 'knowledge': return <RequirePermission permission="knowledge:read" fallback={<NoAccessState />}><SpeechKnowledgePage /></RequirePermission>
+case 'users': return <RequireAdmin fallback={<NoAccessState description="用户管理仅限管理员访问。" />}><Users /></RequireAdmin>
+case 'settings': return <RequirePermission permission="settings:read" fallback={<NoAccessState />}><Settings /></RequirePermission>
```

### Button loading 修复（diff）
```diff
 {loading ? (
+<>
 <Icon name="Loader2" size={iconSize} className="animate-spin" />
+{children && !iconOnly && <span>{children}</span>}
+</>
 ) : (
```

### tailwind.config.js 关键新增
```js
boxShadow: {
  'card': 'var(--shadow-card)',
  'card-hover': 'var(--shadow-card-hover)',
  'lift': 'var(--shadow-lift)',
},
fontSize: {
  'numeric-xl': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.03em', fontWeight: '700' }],
  'display-lg': ['1.6875rem', { lineHeight: '1.875rem', letterSpacing: '-0.02em', fontWeight: '750' }],
},
```

### index.css 阴影变量（white 主题，另两主题各自透明度）
```css
--shadow-card: 0 1px 3px oklch(0% 0 0 / 0.07);
--shadow-card-hover: 0 4px 12px oklch(0% 0 0 / 0.1);
--shadow-lift: 0 8px 24px -4px oklch(0% 0 0 / 0.12);
```

## 四、测试运行输出

```
# vitest 全量（第 89 turn 实测）
Test Files  162 passed (162)
     Tests  1601 passed (1601)

# npm run check
BUILD PASSED: 14 项警告（历史软警告，0 HARD FAIL）

# tsc --noEmit
（无输出 = 0 error）

# vite build
✓ built in 6.4s
```

## 五、浏览器实证（admin 登录态截图 11 屏）

后端 `dotnet run -- --api-only` + vite dev 5176，browser-use MCP 截图确认：
1. **S1 登录**：深色实心按钮 + on-accent 白字 + 发丝边输入框
2. **S7 AI 主页**：IP 圆球 + 问候 + 快捷指令 pills
3. **S13 合同看板**：页头 KPI 斜切零 + 三导航卡 + 新 KPI 汇总条（DOM 确认）
4. **S16 发票**：KPI mono + 发票列表/回款记录 segmented control
5. **S19 结算**：KPI 卡 **JetBrains Mono 斜切零字形清晰可辨**
6. **S22 人事看板**：numeric-xl KPI + 语义色图标容器
7. **S22 人员档案**：pill 搜索框 + FilterBar contained + DataTable 列头
8. **S24 工人库**：S37 三段式空态（图标+文案+主按钮）
9. **S28 模板**：分类 pill-tabs 黑底白字选中态
10. **S33 设置**：头像片段 + 六分类导航 + 内容区
11. **S0 外壳**：Sidebar 药丸 active / 自绘标题栏 / 状态栏（贯穿所有截图）

## 六、遗留与建议

1. **未提交**：全部改动在工作区，等待审查后由用户决定 commit 粒度（建议按 8 大主题拆分或单笔 `refactor(ui): Bedrock design language alignment`；refactor sprint 不 bump 版本、不打 tag）
2. **S13 合同 Kanban 拖拽板 / S15 侧滑抽屉**：大结构改动未在本 sprint 启动，建议列入下一里程碑（注：S13 的 **KPI 汇总卡样式已完成对齐**——label-caps 顶栏 + 语义色小图标居右 + numeric-xl 贴底 + min-h-100px 纵排，ContractDashboard 已实施并截图验证；仅剩三列拖拽看板属结构项）
3. **⚠️ ffmpeg 生产级依赖缺口（本次红绿灯发现，非本 sprint 引入）**：`AudioPreprocessor.cs:44` 硬依赖 PATH 中的 `ffmpeg`，但 ffmpeg.exe **既不在 repo、也不在安装器 payload（app-files）中**——未自行安装 ffmpeg 的用户机器上，语音转写的音频预处理会直接抛 Win32Exception。建议三选一：a) 随安装包分发 ffmpeg（注意 LGPL 与 ~100MB 体积）；b) OcrSetupWizard 式首次引导下载；c) 优雅降级+设置页提示。此项涉及安装包决策，留待用户裁定
4. **rounded-2xl 剩余 9 处**：Agent 气泡/Splash/OCR 浮窗/About——独立浮层容器，判定合理保留
5. **codemod 脚本**（scripts/bedrock-*.mjs）：一次性迁移工具，审查后可删或归档
6. **窄视口（479px）截图显示纵向堆叠**：响应式降级正常不破版，宽屏布局未在本轮截图（浏览器窗口不可调），可在桌面端 WebView2 实机复核
