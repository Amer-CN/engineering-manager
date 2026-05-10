# 项目管理模块重设计 - 上下文交接 ✅ 已完成

> 日期：2026-05-06
> 状态：**已完成** — 8 文件全面重设计、暗黑模式移除、构建通过
> 目标：为整个软件做 UI/UX 重新设计，先从项目管理模块（项目指挥中心）试点

---

## 本次会话已完成的工作

### 1. 项目管理模块 - 删除白色底色
- 修改 `src/components/features/projects/ProjectDetail.tsx:303`
- 去掉了 Tab 内容区的 `bg-white rounded-xl shadow-sm` 外层容器
- 与其他模块风格保持一致

### 2. 单位管理 - 删除白色底色
- 修改 `src/components/Partners.tsx:267,277`
- 将非激活 Tab 按钮从 `bg-white text-slate-600 hover:bg-slate-50` 改为 `text-slate-600 hover:bg-slate-100`
- 去掉白色背景，与其他模块风格统一

### 3. 结算办理 - 修复新建结算单无法滚动
- 修改 `src/components/Settlement.tsx:337-355`
- 模态框从 `overflow-hidden` 改为 `flex flex-col` 布局
- Header 加 `shrink-0`，表单区包在 `overflow-y-auto flex-1` 的 div 中
- 保存/取消按钮现在可完整显示

---

## 已完成的代码探索

### ProjectCommandCenter 当前结构 (~900行)
文件: `src/components/features/projects/ProjectCommandCenter.tsx`

接收 14 个 props: project, stats, expenseByCategory, tasks, expenses, materials,
incomeContracts, expenseContracts, invoices, partners, paymentRecords, settlements, members, workerTeams

当前 10 个区域（全部使用手工 SVG，未用 recharts）：
1. 深色渐变状态横幅 + 4 个汇总指标
2. 8 个 KPI 统计卡片（8列网格）
3. 收支总览（合同进度条 + CSS柱形图）
4. 人材机成本分析（3个手工 SVG 环形图）
5. 材料使用分析表格
6. 发票与资金流卡片
7. 关联单位矩阵
8. 进度甘特图
9. 健康度仪表盘（手工 SVG 雷达图 + 3个进度组件）
10. 项目基本信息页脚

内联 6 个子组件: StatCard, InfoItem, DonutChart(SVG), RadarChart(SVG), ProgressBar, EmptyState

### 数据流
```
Projects.tsx → 加载项目和成员 → 选中项目后加载8个API数据
  → ProjectDetail.tsx → 收到 project+members → 自行加载10个API数据
    → ProjectCommandCenter.tsx → 接收全部数据 → 计算衍生指标 → 渲染10区域
```

### 技术栈确认
- React 18 + TypeScript 5 + Vite 5
- Tailwind CSS 3.4 (darkMode: 'class')
- recharts 3.8 (已在 Dashboard.tsx 中使用了 BarChart, PieChart)
- framer-motion 12
- lucide-react 图标 (~70个已注册在 iconMap.ts)
- UI 组件库: Card(含glass模式), Badge(9变体), ProgressBar(5变体), Button, Icon, Modal, Table, EmptyState, Skeleton 等

### CSS 设计令牌 (src/index.css)
- `:root`: --bg-primary: #ffffff, --bg-secondary: #f8fafc, --text-primary: #1e293b 等
- `.dark`: --bg-primary: #0f172a, --bg-secondary: #1e293b, --text-primary: #f1f5f9 等
- 组件 CSS 类: .card(bg-white), .btn-primary, .input, .badge, .modal-content 等
- 自定义阴影: shadow-soft, shadow-card, shadow-card-hover, shadow-glow, shadow-glow-lg

### Tailwind 配置 (tailwind.config.js)
- 自定义色板: primary(蓝), success(绿), warning(琥珀), danger(红), info(天蓝) - 各9阶
- 自定义圆角: xl(1rem), 2xl(1.5rem), 3xl(2rem)
- 字体系列: Inter 优先

---

## UI/UX Pro Max 设计方向（已确定，待在新对话中实施）

### 产品类型: 企业级数据监控仪表盘 (Enterprise Dashboard / Command Center)
### 推荐风格: Dark Tech Glass-Morphism + Data-Dense
### 推荐配色:
- 主背景: slate-900/950 深色科技风
- 卡片: bg-white/5~10 + backdrop-blur 玻璃效果
- 收入/正向: emerald-400/500
- 支出/负向: red-400/500
- 警告: amber-400/500
- 图表辅助: purple-500, cyan-500, orange-500
- 文字: white/90, white/70, white/50

### 布局策略（6区域）:
1. **Hero Banner** - 深色科技横幅，项目名+健康度径向仪表+4大核心KPI
2. **财务深度区** - 2列：收支柱形图(recharts BarChart) + 成本环形图(recharts PieChart donut)
3. **KPI网格** - 6列紧凑指标卡片
4. **合同与资金** - 2列合同进度 + 4卡片发票统计
5. **关联单位与任务** - 2列
6. **材料汇总+信息页脚**

### 动画策略:
- framer-motion staggerChildren (80ms间隔, 6个section依次入场)
- recharts 内置动画 (isAnimationActive=true)
- 卡片 hover: scale(1.02)

### 设计原则:
- 使用 recharts 替代手工 SVG (RadialBarChart 替代环形图, BarChart 替代CSS柱形图, PieChart 替代手工环形图)
- 使用现有 UI 组件 (Card glass模式, Badge, ProgressBar, EmptyState)
- 目标代码量: ~640行 (从900行缩减)
- 必须同时支持亮色/暗黑模式

---

## 下一步行动计划

### 在新对话中执行:
1. 先尝试让 UI/UX Pro Max skill 的 Python 搜索脚本工作（python3 --version 确认环境）
2. 运行 `--design-system` 获取完整设计系统推荐
3. 运行 `--domain chart "dashboard monitoring"` 获取图表类型建议
4. 运行 `--domain ux "animation accessibility dashboard"` 获取 UX 最佳实践
5. 综合设计系统建议，重写 `ProjectCommandCenter.tsx`
6. 运行 `npx vite build` 验证编译通过
7. 如果项目管理模块试点成功 → 按同样流程重设计其他模块

### 待重设计的其他模块（第二阶段）:
- 仪表板 (Dashboard.tsx)
- 员工管理 (Members.tsx + 子组件)
- 发票管理 (Invoices.tsx + 子组件)
- 合同管理 (Contracts.tsx, IncomeContracts.tsx, ExpenseContracts.tsx)
- 仓库管理 (Inventory.tsx)
- 工资管理 (WageManagement.tsx)
- 结算办理 (Settlement.tsx)
- 单位管理 (Partners.tsx)
- 费用管理 (Expenses.tsx)
- 图纸管理 (Drawings.tsx)
- 任务管理 (Tasks.tsx)
- 系统设置 (Settings.tsx)
- 用户管理 (Users.tsx)
- 操作日志 (AuditLogs.tsx)
