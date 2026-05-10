# UI大更新 — 新对话上下文

## 当前状态

全站UI已从旧的杂项风格统一为项目管理模块的设计语言。以下是已完成和待完成的工作。

## ✅ 已完成

### 结构性变更
- **侧边栏**：删除收起按钮和暗黑切换按钮，宽度固定w-64，Logo区使用深色渐变`from-slate-800 via-slate-700 to-slate-800`，导航项圆角药丸按钮+左侧激活指示条，完整dark:变体
- **Ctrl+K快速导航**：完全删除（键盘监听+浮窗弹窗）
- **操作日志**：从独立页面/路由合并到Users.tsx第三个Tab，`AuditLogs.tsx`导出`AuditLogsContent`可嵌入组件
- **主题系统**：`tailwind.config.js`有`darkMode: 'class'`，`useTheme` hook在Settings的外观主题卡片中切换，`document.documentElement`添加/移除`.dark`类

### 设计语言统一
- **色系**：全站`gray-`→`slate-`（27文件682处），所有`dark:`类清理后重新按需添加
- **CSS基础类**（`index.css`）：btn-secondary/ghost、card/card-header、input/select/label、table th/td、badge、empty-state、loading-spinner 全部有`dark:`变体
- **CARD常量**：`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm`
- **Hero横幅**：`bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800` + `bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.1),transparent_50%)]`

### 页面改造
- **Dashboard**：Hero欢迎横幅（深色渐变+KPI摘要）、KPI卡片改为StatCard模式（图标彩色背景盒）、图表使用CARD常量+uppercase section标题、staggerChildren动画
- **Contracts**：4个Tab的spring-animated pill bar（`motion.div layoutId="contract-tab"`）
- **WageManagement**：4个Tab同样spring动画（`layoutId="wage-tab"`）
- **Partners**：2个Tab spring动画（`layoutId="partner-tab"`）
- **Settings**：外观主题卡片（浅色/深色选择）、关于区（深色渐变HardHat logo + 版本号v1.6.0 + 更新日志浮窗按钮）、更新日志浮窗（半透明backdrop-blur + 点击外部关闭）
- **Login**：左侧品牌区深色渐变、右侧表单卡片

### 版本系统
- **当前版本**：v1.6.0
- **统一位置**：Sidebar（v1.6）、Login（v1.6）、Settings关于（Version 1.6.0）
- **更新日志**：Settings→关于→"更新日志"按钮→半透明浮窗（v1.0~v1.6完整历史）
- **Logo统一**：全部使用`HardHat`图标+深色渐变背景（Sidebar/Login/Settings三处一致）

## ✅ 全部完成（2026-05-06 收尾会话）

### 高优先级 — 已完成
1. ✅ **子页面内部重设计** — IncomeContracts/ExpenseContracts/Settlement/Inventory/Expenses/Drawings/Tasks 模态框标准化（backdrop-blur-sm+rounded-2xl+scale动画）
2. ✅ **表单/弹窗重设计** — MemberForm/MemberDetail/Inventory(3个)/WorkerSection(3个) 模态框统一
3. ✅ **ContractDashboard重设计** — Bento网格+recharts BarChart/PieChart+Hero横幅+StatCard+快捷操作

### 中优先级 — 已完成
4. ✅ **Table组件统一** — DataTable.tsx divide-slate-200→divide-slate-100
5. ✅ **Members子组件** — WorkerSection Spring-animated Tab栏+CARD常量+模态框标准化
6. ✅ **Invoices子组件** — InvoiceList raw SVG→Icon(Eye/Printer/Edit/Trash2)、InvoiceFilters SVG→Icon(Printer/Download)
7. ✅ **Login页面** — 移动端HardHat Logo bg-primary-500→深色渐变

### 低优先级 — 已完成
8. ✅ **CLAUDE.md更新** — 旧描述已清理，新增收尾会话条目
9. ✅ **图标一致性** — 全站✕→Icon X，raw SVG→lucide Icon

## 目标设计规则（参考项目管理模块）

### CSS常量
```
CARD = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm'
HERO = 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 text-white p-6 rounded-2xl'
HERO_OVERLAY = 'bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.1),transparent_50%)]'
INPUT = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20'
SECTION_TITLE = 'text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500'
```

### Spring Tab Bar
```tsx
<div className="flex items-center gap-1 mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-2xl w-fit shadow-sm">
  {tabs.map(tab => (
    <button key={tab.id} onClick={...}
      className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        active === tab.id ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
      }`}>
      {active === tab.id && (
        <motion.div layoutId="xxx-tab" className="absolute inset-0 bg-primary-600 rounded-xl shadow-md"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
      )}
      <span className="relative z-10 flex items-center gap-1.5"><Icon name={tab.icon} size={14} />{tab.label}</span>
    </button>
  ))}
</div>
```

### 领域色
- 收入/盈利：emerald
- 支出/亏损：red
- 任务/信息：blue
- 合作方/单位：violet
- 工资/考勤：amber
- 仓库/物料：orange

### 暗黑模式
- `darkMode: 'class'`已配置，Tailwind自动生成`dark:`变体
- 基础CSS组件类已覆盖dark:变体
- 页面组件需要按需添加`dark:bg-slate-800`、`dark:text-slate-*`、`dark:border-slate-700`

## 项目结构关键文件
- `src/App.tsx` — 主路由（简化后无Ctrl+K、无audit_logs路由）
- `src/components/Sidebar.tsx` — 侧边栏（固定w-64，深色渐变Logo，dark:变体）
- `src/components/Dashboard.tsx` — 首页（Hero横幅+CARD卡片+recharts图表）
- `src/components/Settings.tsx` — 系统设置（主题+OCR+数据路径+开发工具+关于/更新日志）
- `src/components/Users.tsx` — 用户管理（用户列表/角色权限/操作日志三Tab）
- `src/routes.ts` — 路由配置（无audit_logs）
- `src/index.css` — CSS组件类+设计Token+`.dark`变量
- `tailwind.config.js` — darkMode: 'class'、自定义颜色/阴影/圆角
- `src/hooks/useTheme.ts` — 主题hook（localStorage持久化+`.dark`类切换）
- `src/components/features/projects/` — 参考设计风格（8文件，不要修改）

## 验证方法
- `npx vite build` — 构建验证
- 浅色/深色切换：Settings→外观主题→选择→全局变化
- 更新日志：Settings→关于→更新日志按钮→浮窗弹出→点击外部关闭

---

## 2026-05-06（晚间·表头+图纸+清理+补全）

### 表头 sticky 固定
- **四个表统一**：InvoiceList、PaymentList、Expenses、Drawings 的 `<thead>` 全部 `sticky top-0 z-10` + `border-separate border-spacing-0` + 每个 `<th>` 和 `<tr>` 显式 `bg-slate-50`
- **关键发现**：`border-collapse` 在 Chromium 里与 `position: sticky` 冲突；`overflow-hidden` 在 wrapper 上会拦截 sticky 参考容器
- **根因修复**：`App.tsx` 的 `<motion.div>` 动画从 `opacity+translateY` 改为纯 `opacity`（framer-motion `transform: none` 禁用子孙 sticky）
- **布局修复**：`Invoices.tsx` 移除 `h-[100vh]` 和内嵌 `flex-1 overflow-y-auto`，统一由 App.tsx `<main>` 处理滚动

### 图纸管理
- **卡片→列表**：Drawings.tsx 替换卡片网格为 Table 视图（图纸名称/所属项目/图纸类型/备注/上传日期/操作）
- **数据丢失**：`db.drawings` 为空（0条），主库和备份均无数据，无法恢复

### 上传目录清理
- `database.ts` 移除旧英文扁平子目录预创建
- `main.ts` renameMap 目标改为 `未分类/` 前缀；新增启动时自动删空 flat 目录
- 物理删除 12 个空目录，`uploads/` 仅保留项目文件夹和未分类

### 数据库迁移
- `migrateDatabase()` 新增 paymentRecords `recordDate`/`createdAt` 补齐（从 ID 时间戳提取）

### 配置
- `.claude/settings.local.json`：`defaultMode` "auto"→"acceptEdits"（DeepSeek 不支持 auto）
