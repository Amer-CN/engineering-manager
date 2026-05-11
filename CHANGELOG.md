# CHANGELOG — 工程管家

> 版本格式遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`
> - **修订号 (Patch)**：Bug 修复、小优化、内部组件改进
> - **次版本 (Minor)**：新功能模块、UI 重设计、模块重构、多项功能集合
> - **主版本 (Major)**：架构级变更、破坏性改动

---


## [1.21.3] — 2026-05-11

### 🔧 修订
- **版本自动迭代系统加固**：PreToolUse hook 确保在 neat-freak 清理前读取 CLAUDE.md 最新内容，bump-version.js 预检和正则匹配更可靠
- **版本号全局同步**：修复 6 处版本引用（Sidebar/Login/Settings/CLAUDE/CHANGELOG/package.json）不一致，全部统一为 v1.21.3
- **Settings 更新日志显示修复**：数组缩进从约 500 空格修正为 18 空格，版本历史正确渲染
- **表格列间距优化**：cell padding 从 px-2 增至 px-3，列间更宽松易读
- **表头标签优化**：「对方」改为「往来单位/个人」，语义更准确
- **项目详情页分类管理修复**：点击「管理分类」按钮现在正常弹出 CategoryManager 弹窗
- **成本台账分类管理修复**：编辑内置分类后列表名称不再卡在旧值，新增自定义分类会出现在筛选下拉框中。已删除的分类在相关条目上显示"已删"徽标

## [1.21.1] — 2026-05-11

### 🏗️ 重构
- **check-rules 硬违规清零**：7→0，子组件提取 8 文件 + hook 提取 3 个（useMemberOperations / useTeamOps / useInvoiceAmounts）
- **ContractPage 822→405**：提取 contractConfig + ContractFormModal
- **SettlementForm 714→314**：提取 SettlementItemsTable + SettlementImportModal
- **Members 756→368**：提取 useMemberOperations + useTeamOps + 复用 useMemberPasteHandler
- **InvoiceForm 564→325**：提取 useInvoiceAmounts + 复用 FileDropZone/FilePreviewModal/parseDateString
- **PartnerForm 519→388**：提取 FileDropZone + 合并 processFile
- **Settings 633→439**：接入 SettingsOcrSection

### 🐛 修复
- **ContractPage 遗留导入清理**：移除提取后残留的 FileDropZone 导入（ISSUE-001）
- **EmptyState 组件去重**：合并项目中两处重复的 EmptyState 定义，统一使用 src/components/ui/EmptyState（ISSUE-002）

### 🎨 设计
- **EmptyState 组件**：按 DESIGN.md 规范新建，接入 ContractPage/Drawings/ContractTemplates/InvoiceList
- **Inter 字体栈修复**：index.css 根 font-family 补 Inter 优先
- **WorkerSection 懒加载**：React.lazy + Suspense 拆分 13KB chunk，Members 首屏 80→70KB

### ⚡ 性能
- **/benchmark 基线**：2.4MB dist / 33 chunks / 9.1s build / Grade A

### 📝 文档
- **DESIGN.md 设计审计**：源码级审计 9/10 (A)，DESIGN.md 941 行成熟设计系统


## [1.21.0] — 2026-05-10

### ✨ 新增
- **自定义分类管理**：`db.costLedgerCategories` 集合 + 5 IPC（list/create/update/delete/reset），内置 12 种种子，用户可增删改
- **CategoryManager 弹窗**：双 Tab（支出/收入），行内编辑名称+颜色，内置不可删，恢复默认
- **useCostLedgerCategories hook**：分类数据统一加载，方向过滤，label/color 查询
- **备注列**：CostLedgerList 表头新增备注列，10 列表格

### 🔧 优化
- **列表列宽真实数据驱动**：基于熊会对账 775 行 Excel 实测优化，窄列定宽+宽列均分剩余空间，border-collapse 线框连续，金额 font-mono 右对齐
- **列间呼吸**：cell padding px-2→px-3
- **表头标签**：对方→往来单位/个人
- **CategoryPicker 升级**：动态分类列表+内置/自定义分组+"管理分类..."入口
- **Analytics 动态颜色**：饼图色值从分类数据读取

### 🐛 修复
- "管理分类"按钮在项目详情页无响应（modal 遗漏 detail 分支）

---

## [1.20.2] — 2026-05-10

### ✨ 新增
- **凭证号 (voucherNo)**：`CostLedgerEntry` 新增 `voucherNo` 字段，按项目自动递增（留空时查该项目最大号+1），支持手动修改
- **ColumnFilter 组件**：独立列筛选组件，Portal 渲染到 body（防遮挡+防失焦），对方/渠道 checkbox 多选（全选/清除），日期快捷按钮（本月/近3月/本年）+ 区间，金额区间，凭证号/摘要文本搜索，多列 AND 组合
- **CostLedgerAnalytics 组件**：ProjectDetail"费用明细"Tab 从数据录入改为只读领导视角分析看板 — KPI卡片 + 支出分类饼图 + 月度收支趋势柱状图 + 支出TOP10往来方排名

### 🔧 修订
- **收入分类修正**：删除"业主回款"（业主回款是明面账工程款，不出现在成本台账），新增"股东投资"+"融资款"，保留"垫资回收"
- **渠道标签方向感知**：支出→支付渠道，收入→收入渠道（`ChannelInput` 新增 `direction` prop + 上下文 placeholder）
- **日期粘贴解析**：日期字段从 `<input type="date">` 改为 `<input type="text">`，支持粘贴 `2024-12-17` / `2024/12/17` / `2024.12.17` / `20241217` / `2024年12月17日`
- **筛选系统三次迭代**：文本输入行 → Excel 风格列头漏斗弹出面板 → Portal 独立组件（修复弹窗被表格 overflow 裁剪、日期输入失焦需重新点击、滚动后位置偏移）
- **旧 ExpensesTab 移除**：`ProjectDetail.tsx` 清理 `expenses` 状态/API 调用/类型导入，`ExpensesTab` 函数体删除（18行），`costLedgerTab` 替换为 `CostLedgerAnalytics`

### 📁 涉及文件
- 新增：`ColumnFilter.tsx`、`CostLedgerAnalytics.tsx`
- 修改：`electron.d.ts`、`config.tsx`(costLedger)、`cost-ledger.ts`(IPC)、`CostLedgerForm.tsx`、`ChannelInput.tsx`、`CostLedgerList.tsx`、`ProjectDetail.tsx`、`CostLedgerDashboard.tsx`、`CostLedger.tsx`

---

## [1.20.0] — 2026-05-10

### ✨ 新增
- **成本台账模块**：新增独立模块 `db.costLedger`，追踪真实项目成本（含灰色支出、垫资、多开发票回流等明面账不覆盖的资金流）。双入口模式：侧边栏独立页面（Dashboard→项目详情）+ 项目详情页 Tab 嵌入
- 成本台账分类体系：9 种支出（人工/材料/机械/前期费用/业务费用/垫资支出/管理人员工资/税金/其他）+ 2 种收入（业主回款/垫资回收）
- 汇总行 sticky footer（总支出/总收入/净盈亏）+ 分类明细手风琴展开
- 表单 4 个子组件拆分：CategoryPicker（方向驱动）、ChannelInput（最近使用缓存）、InvoiceLinker（发票搜索+关联）、FileUploader（延后补传）
- 关联发票解析：服务端 `linkedInvoiceStatus` 解析（active/deleted/null），保存时发票存在性校验
- 凭证附件存储：`uploads/<项目名>/成本台账/凭证/`

### 🔧 修订
- **级联删除**：`db:projects:delete` 扩展为级联删除 8 个关联集合（costLedger/settlements/invoices/incomeContracts/expenseContracts/wages/attendances/projectMembers）
- **Dashboard 迁移**：统计卡片和支出饼图数据源从 `db.expenses` 迁移至 `db.costLedger`
- **审计日志**：新增 `costLedger` 资源标签和字段中文名映射
- **权限系统**：4 个角色种子新增 `costLedger:create/read/update/delete/export` 权限

### 🗑️ 移除
- **旧成本管理模块**：删除 `Expenses.tsx`（432 行，零数据），路由 `expenses` 重定向至成本台账

---

## [1.19.1] — 2026-05-10

### 🔧 修订
- 自动版本迭代修复：neat-freak PostToolUse hook 版本判定逻辑优化

---

## [1.19.0] — 2026-05-10

### ✨ 新增
- 自动版本迭代升级：`auto-version-on-neat-freak.js` 从硬编码 patch 改为自动检测 major/minor/patch 级别（关键词匹配 + 统计启发），支持 `AUTO_VERSION_LEVEL` 环境变量手动覆盖

---

## [1.18.0] — 2026-05-08

### ✨ 新增
- **锁定屏幕**：头像弹出菜单新增"锁定屏幕"入口，点击后全屏毛玻璃遮罩要求输入密码解锁，防止人走开时他人操作软件

### 🔧 修订
- **侧边栏重构**：系统设置和用户管理从导航菜单移除，统一收入头像弹出菜单（DropdownMenu），类 Windows 开始菜单风格，仅头像可点击
- **审计日志修复**：`actionConfig` 对未知操作类型（lock/unlock）增加兜底，防止列表渲染/详情弹窗崩溃白屏

---

## [1.17.1] — 2026-05-08

### 🔧 修订
- 修复 PostToolUse hook 不支持 `if` 字段的 bug：新建 `scripts/auto-version-on-neat-freak.js` 包装脚本，通过 stdin 读取 tool call JSON 解析 `tool_input.skill` 实现条件触发
- 压缩 CLAUDE.md 从 64.8 KB/782 行 → 18.8 KB/289 行：重要更新时间线叙述转为按主题分类的架构决策记录表格，保留全部核心文件路径和业务规则
- 更新 `bump-version.js` 支持新旧两种 CLAUDE.md 摘要提取格式（旧格式 `### YYYY-MM-DD（...本次会话）` regex + 新格式 `## 📋 本次会话` indexOf 位置提取）
- 修复 Settings.tsx 更新日志数组中重复的 v1.2.15 条目

---

## [1.17.0] — 2026-05-07

### ✨ 新增
- 模板系统实用化改造：服务端变量自动检测、TemplateSelectorModal、ContractPage/SettlementProjectDetail 集成从模板生成入口

---

## [1.16.1] — 2026-05-07

### 🔧 修订
- bump-version.js 全面修复：Sidebar/Login 版本替换改为上下文感知精确匹配（不再全局 `v[\d.]+` 替换）
- CLAUDE.md 仅替换"当前版本"行（不再全局替换版本号）
- 新增去重逻辑：提取 CLAUDE.md 会话摘要后与 CHANGELOG 最新条目逐条比对，重复自动跳过
- 新增 `--msg "说明"` 参数支持手动指定变更内容
- 新增回退逻辑：精确匹配失败时使用全局替换兜底
- Settings.tsx 更新日志渲染修复：新增 `renderMarkdownInline()` 辅助函数，`粗体` 在 JSX 中正确渲染为 `<strong>`；更新日志数组 22 条全部归一化为统一缩进
- CHANGELOG.md 格式规范化：补全 6 处缺失的 `---` 条目分隔符
- 同步目标扩展：`bump-version.js` 从 5 处同步扩展为 6 处（新增 CLAUDE.md）

---

## [1.16.0] — 2026-05-07

### ✨ 新增
- **模板管理独立模块**：从合同管理分离为顶级路由（侧边栏「模板管理」），7 种预定义分类（合同/结算/用印/用款/红头/函件/其他），支持用户上传 .docx/.xlsx 模板文件
- **模板变量系统**：text/number/date/select 四种类型，生成时 {{key}} → 值自动替换 + 实时预览 + 打印
- **模板预览**：Word 用 mammoth 渲染 HTML 预览；下载→本地编辑→上传覆盖工作流
- **结算看板重设计**：对标项目管理改为看板首页（SettlementDashboard 项目卡片网格+统计）→ 点击进入项目结算详情（SettlementProjectDetail），新增 SettlementProjectCard
- **结算模板接入模板库**：SettlementForm.downloadTemplate 优先从模板库获取用户上传的结算模板，无用户模板时回退硬编码默认模板

### 🔧 优化
- **合同管理简化**：移除内嵌合同模板入口，ContractDashboard 去掉模板导航卡片，Contracts 视图从 4 种精简为 3 种
- **Settlement.tsx 瘦身**：412 行 → 87 行容器组件，逻辑拆分到 SettlementDashboard / SettlementProjectDetail

### 🗃️ 数据
- 新增 `db.templates` 集合（JSON 持久化），IPC 通道 `db:templates:*`（5 个 handler）
- 文件存储新增 `templates/files` 分类（`uploads/模板/文件/`）
- `electron/ipc-handlers/templates.ts` — 新建独立 IPC handler 文件

---

## [1.15.0] — 2026-05-07

### ✨ 新增
- **合同管理重构**：改为看板首页+子页面模式（对标项目管理），3 张导航卡片（收入/支出/模板）点击进入子页面，返回按钮回到看板
- **结算办理全面重设计**：列表改为紧凑表格；结算类别新增 6 种细分（材料/分包/劳务/机械/服务/其他）；Excel 导入（模板秒导+灵活导入多工作表+表头行选择+列映射）；多文件凭证上传；状态流转（未办理→已办理→已归档，旧状态自动迁移）；办理核验 IPC（按单位自动匹配发票+汇总付款+差额警示+自动归档）
- **审计日志可读化**：详情弹窗从 JSON 代码块改为三列对比表格（字段中文名/修改前/修改后），金额格式化，状态翻译
- **发票统计重设计**：开票/收票数量合并入发票总数，新增专票税额（可抵扣）/普票税额，剩余未收/未付移至回款/付款统计
- **回款/付款统计重设计**：回款/付款笔数合并入记录总数，新增剩余未收/剩余未付
- **文件服务扩展**：FOLDER_MAP 新增 settlement/files，IPC 新增 file:openExternal

### 🔧 修复
- **收支对比数据修复**（合同看板+项目指挥中心）：barData 从空表 incomeRecords/expenseRecords 改为 paymentRecords；项目指挥中心"已收款↔已付款"数据互换修复，用词改为"已回款/已付款"

### 📁 涉及文件
Contracts.tsx, ContractDashboard.tsx, ContractPage.tsx, ContractTemplates.tsx, App.tsx, AuditLogs.tsx, InvoiceList.tsx, InvoiceStats.tsx, PaymentStats.tsx, ProjectCommandCenter.tsx, ProjectDetail.tsx, Settlement.tsx, SettlementList.tsx, SettlementForm.tsx, config.tsx, iconMap.ts, electron.d.ts, preload.ts, settlements.ts, contracts.ts, file-service.ts, files.ts

---

## [1.14.0] — 2026-05-07

### 🐛 修复
- **付款凭证预览失败**：PaymentRecord 缺失 projectName 字段导致文件路径不匹配；handlePreview 新增 projectId 回退 + MIME 实时类型检测
- **关联单位下拉仅显示一家**：PaymentForm 单位下拉原按合同过滤，改为列出全部合作单位（适配 <5 万零星采购不签合同的真实场景）
- **发票关联合同过滤**：收票按项目+销售方匹配支出合同，开票按项目+购买方匹配收入合同
- **审计日志撑爆 localStorage**：logAudit details 含完整发票对象导致配额溢出；改为 localStorage 仅存摘要（去 details）、上限降至 3000 条、启动时自动清理旧数据
- **发票状态标签错乱**：收票 issued 显示"已开具"→改为"已收票"；标签按 invoice_in/out 区分（已收票/已开具、部分付款/部分收款、已付清/已收齐）
- **发票状态滞后**：db:invoices:getAll 动态计算 receivedAmount 但不更新 status，改为加载时自动同步状态并回写 DB

### ✨ 新增
- **合同 Word 预览**：安装 mammoth，.docx 文件在线转换为 HTML 嵌入 iframe 渲染
- **发票税额手动编辑**：税额从只读改为可编辑，修改后含税价自动重算

### 🔧 优化
- **工资管理 UI**：标题去 DollarSign 图标；项目工资概览卡片网格→横向长条列表
- **回款/付款列表**：比例→本次收款比例消除歧义；关联发票列发票号+金额分行显示

---

## [1.13.0] — 2026-05-06

### 🔧 修订
- **工资模块重构**：对标 Projects.tsx → ProjectDetail.tsx 模式，Dashboard（统计+项目卡片）→ WageCycleDetail（3 Tab）
- **工资发放记录**：WageRecord 新增 paidAmount（实发金额）/ paidDate（发放日期）字段，差额自动计算
- **首页项目卡片**：WageProjectCard + WageProjectList，按项目汇总工资数据，点击进入工资周期
- **筛选简化**：去除统计看板的项目/月份筛选，工资发放记录改为年份（21年范围）/月份/姓名筛选
- **图标补全**：ArrowLeftRight 和 ClipboardFile（别名 ClipboardPen）注册到 iconMap

---

## [1.12.1] — 2026-05-06

### 🔧 修订
- **表头 sticky 固定**：InvoiceList/PaymentList/Expenses/Drawings 四个表 `<thead>` 统一 sticky 定位，`border-separate border-spacing-0`（`border-collapse` 与 sticky 冲突），wrapper 去除 `overflow-hidden`（拦截 sticky 参考容器）
- **页面动画修复**：App.tsx `<motion.div>` 动画从 `opacity+translateY` 改为纯 `opacity`（framer-motion `transform: none` 从浏览器层面禁用子孙 sticky）
- **发票页固定头部+嵌套滚动三层布局**：App.tsx `<motion.div>` 加 `className="h-full"` 补全高度链；Invoices.tsx 用 `h-full flex flex-col overflow-hidden` 实现头部 `flex-shrink-0`（标题+Tab+统计+筛选固定）+ 列表区 `flex-1 min-h-0 overflow-y-auto` + 表头 `sticky top-0 z-10`
- **图纸管理卡片→列表**：Drawings.tsx 卡片网格改为 Table 视图（6 列），表头 sticky
- **上传目录清理**：database.ts 移除英文扁平目录预创建，main.ts renameMap 目标改为 `未分类/` 前缀，新增空 flat 目录自动清理
- **数据库迁移**：旧 paymentRecords 补齐 `recordDate`/`createdAt`（从 ID 时间戳提取），drawings/expenses 补齐 `createdAt`

---

## [1.12.0] — 2026-05-06

### ✨ 新增
- 发票票种细化为 4 类：纸质普票/纸质专票/电子普票/电子专票（专票可抵扣税）
- `iconMap.ts` 补注册 ClipboardPen、PaintBucket、Sparkles 图标，Edit 别名

### 🔧 修复
- **收付款术语统一**：确立 收票→付款、开票→回款 规则，修复 ProjectCommandCenter 合同关联发票类型颠倒
- **数据库安全加固**：initDatabase() catch 块不再覆写真实数据，防止迁移异常导致全库丢失
- **金额显示统一**：全局 53 处 toLocaleString() 替换为 formatMoney()，确保 2 位小数
- Settings 错字："开发工元"→"开发工具"、"提示？"→"提示"、"恢天"→"恢复"
- PaymentForm/PaymentList 标题和表头根据类型动态显示

---

## [1.11.1] — 2026-05-06

### 🔧 修订
- neat-freak PostToolUse hook：收尾时自动触发版本迭代
- bump-version.js 补全 CLAUDE.md 版本引用自动同步
- 版本管理记忆+文档同步更新

---

## [1.11.0] — 2026-05-06

### 🔧 优化
- 动画性能深度优化：页面切换移除 scale（减少大面积重绘）、浮动光斑改 CSS @keyframes（合成器线程）
- Sidebar 删除无限循环 JS 动画、spring stiffness 降低（400→200）
- Dashboard CountUp spring stiffness 降低（60→40）

### ✨ 新增
- **版本自动迭代系统**：`scripts/bump-version.js` 脚本，支持 patch/minor/major 三级
- `CHANGELOG.md` 完整版本历史（1.0.0 → 1.11.0）
- Settings 关于页 / 更新日志与 CHANGELOG.md 同步

---

## [1.10.0] — 2026-05-06

### ✨ 新增
- **全站交互动画系统**：Sidebar 入场 slide-in + nav stagger + layoutId 激活态滑动 + whileHover 右移
- **Login 入场动画**：品牌区 stagger、表单卡片 fade-up、浮动光斑漂移、错误消息 shake
- **Dashboard 动画**：CountUp 数字滚动（useSpring）、Hero 光点呼吸、KPI 卡片 stagger+whileHover、进度条 animated width
- **数据可视化**：recharts Bar/Pie/RadialBar animationDuration、图表容器 fade+scale 入场
- **全局组件动画**：Button whileHover/whileTap、Card motion hover、Badge dot 脉冲、ProgressBar framer-motion width、DropdownMenu scale
- **Toast 升级**：图标 emoji → lucide-react SVG、spring 入场动画

---

## [1.9.2] — 2026-05-06

### 🔧 优化
- 侧边栏蓝色 primary-* → 深 slate-* 色系（匹配 Logo 渐变品牌色）
- 用户头像渐变 blue→slate-600/700

### 🐛 修复
- 单位管理白屏：Partners.tsx 缺 `Icon` 导入
- Partners "添加单位"按钮移到页面标题行右侧（不再孤悬）
- `BadgeCheck`、`Shield`、`AlertCircle` 注册到 iconMap

---

## [1.9.1] — 2026-05-06

### 🔧 优化
- 子页面模态框标准化：backdrop-blur-sm + rounded-2xl + scale 动画
- ContractDashboard Bento 网格 + recharts 重设计
- Inventory/WorkerSection spring-animated Tab 栏
- InvoiceList/Filters 原始 SVG → lucide Icon
- Login 移动端 Logo → 深色渐变
- 全站 `✕` → `<Icon name="X" />`

---

## [1.9.0] — 2026-05-06

### ✨ 新增
- **项目管理 8 文件全面重设计**：Bento 网格布局、健康度环形图
- **投资组合概览横幅**：深色渐变 + 4 KPI
- **告警区**：逾期任务/预算超支/收款率低自动检测
- **recharts 全面替代手工 SVG**：RadialBarChart 健康度、BarChart 收支对比、PieChart donut 成本结构
- **项目卡片健康环**：SVG 环形进度条，颜色随分数变化
- **Spring Tab 栏**：framer-motion layoutId + spring 物理动画

### 🔧 优化
- 设计语言：纯白卡片 + 细边框 + 柔和阴影替代玻璃态
- 领域色系统：收入=emerald、支出=red、任务=blue、合作方=violet

---

## [1.8.0] — 2026-05-06

### ✨ 新增
- 管理人员卡片→表格（7 列：姓名/职位/电话/身份证/状态/入职时间/操作）
- 状态下拉直切（内联 select，离职自动填日期）
- 批量删除考勤/工资表/工资记录（三 Tab 各加复选框列+全选）

### 🐛 修复
- 离职员工可入项目、考勤/工资含离职+项目经理
- 状态筛选兜底（老数据无 status 默认 active）
- StaffForm 新增 entryDate 字段

---

## [1.7.0] — 2026-05-06

### ✨ 新增
- **设计语言统一**：全站 gray→slate 色系（27 文件 682 处）、dark: 变体清理（15 文件 103 处）
- **主题系统**：Settings → 外观主题（浅色/深色），Tailwind `darkMode: 'class'`
- **Dashboard 重设计**：Hero 深色渐变横幅、KPI StatCard 模式、recharts 图表
- **Spring Tab 栏**：Contracts/WageManagement/Partners spring 药丸按钮

### 🔧 优化
- 侧边栏重设计：固定宽度、深色渐变 Logo 区、圆角药丸导航项+左侧激活指示条
- 操作日志合并到用户管理页面作为子 Tab
- CSS 组件类 dark: 变体补全（card/btn/input/select/table/badge）

---

## [1.6.0] — 2026-05-05

### ✨ 新增
- **考勤每日状态系统**：dailyStatus 字段、5 种状态（出勤/法定假/病假/事假/缺勤）
- **考勤子页面**：画笔模式日历（选状态→点日期涂色，Shift 批量，右键循环）
- **项目成员多对多**：db.projectMembers 关联表、MembersTab 添加/移除 UI

### 🐛 修复
- 法定假不计缺勤（computeFromDailyStatus 中 holiday 计为带薪日）
- 考勤/工资成员过滤改用 projectMembers 关联表

---

## [1.5.2] — 2026-05-05

### 🐛 修复
- **DB 全面防御**：ensureDatabaseFields() 覆盖全部 26 个集合
- **seedDefaultRoles 启动崩溃**：角色种子逻辑移入 initDefaultData()
- **6 个 .bat 启动脚本**：去中文乱码、统一 CRLF、chcp 65001
- **getProjectPartners API**：新 IPC handler（projectIds 过滤）
- settlements.ts / attendance.ts 守卫补齐
- OCR 网络检查 URL 修复（403→正常）

---

## [1.5.1] — 2026-05-05

### 🐛 修复
- **文件存储 projectName 参数 bug**：4 个文件间参数张冠李戴，导致附件落入 未分类/
- 编辑保存误报重名修复（useRef 记住原始文件名）
- 合作单位文件补传 projectName

### 🔧 优化
- **Toast 系统全局化**：11 页面从本地 Toast → useToastContext()，Portal 渲染
- 文件名去 Date.now() 随机后缀
- 图纸 DWG/DXF 支持

---

## [1.5.0] — 2026-05-05

### ✨ 新增
- **权限系统重设计**：15 资源 × 7 操作、角色权限编辑器、侧边栏按权限过滤
- **操作日志系统**：IPC 持久化（上限 10000 条）、用户身份关联
- **用户管理独立**：从 Settings 剥离，Users.tsx Tab 系统

### 🔧 优化
- 侧边栏根据用户权限动态显示菜单项
- 路由守卫：users/settings 加 RequireAdmin/RequirePermission

---

## [1.4.1] — 2026-05-05

### 🐛 修复
- 文件读取回退链修复：readFile/deleteFile 对 null projectName 漏搜 未分类/

---

## [1.4.0] — 2026-05-05

### ✨ 新增
- **PageContainer 组件**：统一页面宽度入口（wide/narrow/full 三种变体）
- **17 页面统一 max-w-[1400px]**（Dashboard 1600px、Settings 双列网格）

---

## [1.3.2] — 2026-05-04

### 🐛 修复
- **社保公积金计算逻辑修复**：个人部分仅在 companyCoversSocial=false 时扣除
- Member 新增 companyCoversSocial/housingFundPersonal 字段

### ✨ 新增
- **考勤附件支持**：图片/xlsx/PDF 上传，存于 uploads/<项目名>/考勤/记录/
- **考勤批量保存**：一键保存所有修改

---

## [1.3.1] — 2026-05-04

### 🐛 修复
- MemberDetail 照片读取漏传 projectName
- file-service readFile/deleteFile 对 null projectName 漏搜 未分类/

---

## [1.3.0] — 2026-05-04

### ✨ 新增
- **工资管理模块全面重写**：考勤系统 + 计算引擎 + 4 Tab UI
- 工人日薪制 × 出勤天数、管理人员月薪制（≤4天全勤）
- db.wages / db.attendances 持久化
- 6 个 attendance IPC handler + 7 个 wage IPC handler

---

## [1.2.2] — 2026-05-04

### 🐛 修复
- MemberForm props 不匹配（mode→type、缺 visible、onCancel→onClose）
- WorkerSection TeamFormModal 未渲染（添加班组报 clone 错误）
- readUploadedFile 未 import 导致编辑报错
- TeamFormModal JSX 作用域外导致启动白屏
- MemberForm 编辑时文件预览自动加载

---

## [1.2.1] — 2026-05-03

### ✨ 新增
- 项目名作为第一层目录（uploads/<项目名>/）
- 文件读取三级回退：项目路径 → 未分类 → 旧平铺路径

### 🐛 修复
- 合同 PDF 预览白屏（contract-file:// 协议中文路径支持）
- 支出合同附件错入收入文件夹（subCategory 参数）
- PaymentList 类型列 Icon JSX 字面量修复

---

## [1.2.0] — 2026-05-03

### ✨ 新增
- **文件存储系统**：base64 → 磁盘文件、中文分目录分类
- 统一 IPC 文件通道：file:save / file:read / file:delete
- engineering.json 从 18MB 瘦身至 1.4MB

### 🔧 优化
- 文件名含业务信息：`备注_名称_金额.ext`
- 发票/收付款分类型存储（收票/开票、回款/付款）

---

## [1.1.0] — 2026-05-02

### ✨ 新增
- **Toast 系统**：Context 模式、AnimatePresence 堆叠动画
- **登录页双列重设计**：品牌区 + 表单卡片

### 🔧 优化
- 全站 emoji → lucide-react SVG 图标（48 文件）
- 侧边栏独立组件化、路由图标系统

---

## [1.0.2] — 2026-05-02

### ✨ 新增
- **8 个核心组件升级**：Button/Input/Modal/Card/Badge/Select/Pagination/Table（variant/size/status/dark）
- **6 个新组件**：DropdownMenu/Tabs/Tooltip/ProgressBar/FormField/Loading(Skeleton)

---

## [1.0.1] — 2026-05-02

### 🐛 修复
- Tasks.tsx 40+ 处编码损坏（闭合标签/引号/尖括号）
- Login.tsx 红线：localStorage 直调 → AuthContext
- API 密钥从 MEMORY.md 移除
- IPC handler 34 个冗余 .js/.d.ts 产物清理

---

## [1.0.0] — 初始版本

- Electron 28 + React 18 + TypeScript 5 + Vite 5 + TailwindCSS
- 核心模块：项目管理、合同管理、发票管理、员工管理、仓库管理、单位管理
- JSON 文件存储、Tesseract.js OCR、lucide-react 图标库
