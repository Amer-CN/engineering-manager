# CLAUDE.md - 工程管家项目约定
> 项目状态：成本台账模块 + 级联删除加固 + 旧成本管理模块清理 + 模板管理独立模块 + 变量自动识别 + 业务模块模板集成
> 最后同步：2026-05-10（成本台账分类管理CRUD + 备注列 + 列表列宽真实数据驱动优化 + neat-freak 整理）

## 🌐 gstack 浏览器工具集
- **Web 浏览**：使用 gstack 的 `/browse` skill 进行所有网页浏览操作，**严禁使用 `mcp__claude-in-chrome__*` 工具**
- **可用 skills**：`/office-hours` `/plan-ceo-review` `/plan-eng-review` `/plan-design-review` `/design-consultation` `/design-shotgun` `/design-html` `/review` `/ship` `/land-and-deploy` `/canary` `/benchmark` `/browse` `/connect-chrome` `/qa` `/qa-only` `/design-review` `/setup-browser-cookies` `/setup-deploy` `/setup-gbrain` `/retro` `/investigate` `/document-release` `/codex` `/cso` `/autoplan` `/plan-devex-review` `/devex-review` `/careful` `/freeze` `/guard` `/unfreeze` `/gstack-upgrade` `/learn`

## 🛠️ 技术栈
- **Electron 28** - 跨平台桌面应用框架
- **React 18 + TypeScript 5** - 类型安全的 UI 开发
- **Vite 5** - 极速构建工具
- **TailwindCSS** - 实用优先的样式框架
- **JSON 文件存储** - 本地数据持久化（`db.*` 集合），无需数据库
- **Tesseract.js** - 离线 OCR 识别
- **lucide-react** - SVG 图标库（`iconMap.ts` 注册，`<Icon name="X" />` 统一入口）
- **recharts** - 数据可视化（BarChart/PieChart/RadialBarChart）
- **framer-motion** - 全站动画引擎

## 📁 核心模块架构

### 员工管理
- 以「班组」为中心，支持人员流动；班组必须关联项目
- 工人状态：active / left；调动记录自动创建
- 管理人员表格视图（7列），状态下拉直切；农民工卡片视图

### 发票管理
- **票种**（`InvoiceKind`）：`paper_regular` / `paper_special` / `electronic_regular` / `electronic_special`
- **业务规则**：收票(invoice_in)→付款（资金流出），开票(invoice_out)→回款（资金流入）
- **状态**（按类型区分）：收票→已收票/部分付款/已付清；开票→已开具/部分收款/已收齐
- 登记回款/付款时可勾选关联发票，自动更新发票状态；入口统一在发票管理
- 收票按销售方关联支出合同，开票按购买方关联收入合同

### 合同管理
- 收入合同 / 支出合同；已收款统计从 `paymentRecords` 表
- 附件走统一文件服务 `uploads/<项目名>/合同/收入|支出/`，文件名：`合同名_金额元.ext`
- .docx 用 mammoth 转 HTML iframe 预览；`contract-file:///` 自定义协议支持中英文路径

### 项目管理
- 项目列表：投资组合概览横幅（深色渐变+4 KPI）+ 项目卡片网格（含 SVG 健康环）
- 详情页 7 Tab：总览（指挥中心）、合同台账、发票、人员、任务、费用明细（成本台账分析看板）、关联单位
- **项目指挥中心**：Bento网格，RadialBarChart健康度+4KPI+告警区（逾期/超支/收款率低）+收支BarChart+成本PieChart
- **人员管理 Tab**：从 `db.projectMembers` 多对多关联表管理，支持添加/移除
- 领域色系统：收入=emerald / 支出=red / 任务=blue / 合作方=violet

### 结算办理
- **状态**：未办理 → 已办理（自动核验付款+发票）→ 已归档；旧状态自动迁移
- **6 种细分类别**：材料结算 / 专业分包结算 / 劳务人工结算 / 机械设备结算 / 服务类结算 / 其他结算
- **办理核验**（`settlements:process`）：按结算单位自动匹配发票（收入→开票/buyerId，支出→收票/sellerId），按 invoiceDetails 汇总付款，差额警示
- **Excel 导入**：模板导入（固定列映射）+ 灵活导入（多工作表+表头行+列映射）
- 核心文件：`Settlement.tsx`, `SettlementList.tsx`, `SettlementForm.tsx`, `config.tsx`, `settlements.ts`

### 模板管理（独立顶级模块）
- **架构**：Dashboard（4统计+7分类入口）→ 分类详情（返回+统计+卡片网格）→ 新建/编辑/预览/生成
- **7 种分类**：contract(合同)/settlement(结算)/seal_application(用印)/fund_application(用款)/official_document(红头)/letter(函件)/other
- **变量系统**：text/number/date/select 四种类型；上传 .docx 时 Electron 主进程用 mammoth 自动检测 `{{变量名}}`
- **TemplateSelectorModal**：按分类加载+搜索+选中回调，合同/结算模块共用（ContractPage + SettlementProjectDetail 集成"从模板生成"入口）
- **编辑模式**：下载→编辑→上传；文件走统一文件服务 `uploads/模板/文件/`
- 核心文件：`Templates.tsx`, `TemplateDashboard.tsx`, `TemplateList.tsx`, `TemplateForm.tsx`, `TemplateCard.tsx`, `TemplatePreview.tsx`, `TemplateGenerate.tsx`, `TemplateSelectorModal.tsx`, `config.tsx`, `templates.ts`（IPC）

### 工资管理
- **架构**：Dashboard（统计+项目卡片）→ WageCycleDetail（考勤管理/项目工资表/工资发放记录 3 Tab）
- **考勤系统**：按月生成，5 种日状态（出勤/法定假/病假/事假/缺勤），AttendanceDetail 画笔模式日历（选状态→点日期涂色，Shift批量，右键循环）
- **计算规则**：工人日薪制 `日薪×出勤天数+奖金-扣款`；管理人员月薪制（全勤=休假≤4天），社保公积金 `companyCoversSocial`=true 时公司承担
- **成员来源**：管理人员从 `db.projectMembers` + 项目经理单独加入，工人通过班组→项目链
- **工资发放记录**：应发工资(只读) + 实发金额/发放日期(手动) + 差额(自动)
- 数据表：`db.wages` / `db.attendances` / `db.projectMembers`
- 核心文件：`WageManagement.tsx`, `WageCycleDetail.tsx`, `AttendanceTab.tsx`, `WageTableTab.tsx`, `WageRecordsTab.tsx`, `attendance.ts`, `wages.ts`, `members.ts`

### 成本台账（独立顶级模块）
- **目的**：追踪挂靠施工项目的真实资金流（含灰色支出、垫资、股东融资等明面账不覆盖的资金流）
- **架构**：双入口，角色分离 — 侧边栏独立页面供财务人员录入/查账（Dashboard→项目详情→列表+新增/编辑/删除+Excel级筛选）；ProjectDetail"费用明细"Tab 供领导查看只读分析看板（KPI+饼图+月度趋势柱状图+TOP10排名，无数据录入）
- **数据模型**：`db.costLedger`（台账条目）+ `db.costLedgerCategories`（用户自定义分类），条目字段含 voucherNo(按项目自增凭证号)、direction(expense/income)、category(分类code)、counterparty(往来单位/个人)、channel、linkedInvoiceId(可选)、notes(备注)、attachments
- **分类系统**：内置 12 种分类（9支出+3收入）+ 用户可自定义增删改；`CategoryManager.tsx` 双Tab管理弹窗（内置不可删/自定义CRUD/恢复默认）；`useCostLedgerCategories` hook 统一加载；饼图颜色动态读取分类色值
- **业主回款不出现在成本台账中**（业主回款是明面账工程款）
- **渠道标签**：按方向动态切换 — 支出→支付渠道，收入→收入渠道
- **IPC 通道**：11 个 — 台账条目 6 个（`:list` / `:create` / `:update` / `:delete` / `:summary` / `:deleteByProject`）+ 分类管理 5 个（`:categories:list` / `:create` / `:update` / `:delete` / `:reset`）
- **级联删除**：项目删除时自动清理关联台账记录（`db:costLedger:deleteByProject`）
- **列表布局**：10 列表格（凭证号/日期/方向/分类/往来单位个人/渠道/金额/摘要/备注/操作），`table-fixed border-collapse` 线框连续，窄列定宽+宽列均分剩余空间不留白，列宽基于真实 Excel 数据（熊会对账775行）实测调优
- **筛选系统**：Excel 风格列头漏斗弹出面板（`ColumnFilter.tsx`，Portal 渲染防遮挡），对方/渠道 checkbox 多选(全选/清除)，日期快捷按钮(本月/近3月/本年)+区间，金额区间，凭证号/摘要文本搜索，多列 AND 组合，筛选汇总跟随结果
- **表单子组件**：CategoryPicker（方向驱动+自定义分类+管理入口）/ ChannelInput（最近使用缓存+方向感知 placeholder）/ InvoiceLinker（发票搜索）/ FileUploader（延后补传）；日期字段支持粘贴多种格式（YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD / YYYYMMDD / 中文年月日）
- **文件存储**：`uploads/<项目名>/成本台账/凭证/`
- 核心文件：`CostLedger.tsx`, `CostLedgerDashboard.tsx`, `CostLedgerList.tsx`, `CostLedgerForm.tsx`, `ColumnFilter.tsx`, `CostLedgerAnalytics.tsx`, `CostLedgerTab.tsx`, `CostLedgerProjectDetail.tsx`, `CategoryPicker.tsx`, `CategoryManager.tsx`, `useCostLedgerCategories.ts`, `cost-ledger.ts`（IPC）

### 其他模块
- **仓库管理**：物料库 / 出入库记录 / 项目材料（整合材料管理）
- **单位管理**：合作单位 + 监管单位（Tab切换），纳税资质，统一社会信用代码联网填充

## 📁 文件存储系统

### 架构链路
```
前端组件 → src/services/fileService.ts → IPC(file:save/read/delete)
                                         → electron/ipc-handlers/files.ts
                                         → electron/file-service.ts（核心）
                                         → <dataPath>/uploads/
```

### 存储策略
- 所有附件统一存磁盘，`engineering.json` 只存文件名，不再存 base64
- 文件名格式：`备注_业务描述_金额.ext`，无随机后缀；同名自动检测并提示改名
- 向后兼容旧 data URL；编辑时未更换附件则跳过上传
- 读取回退链：项目名文件夹 → `未分类/` → `_common/` → 旧版平铺路径

### 文件夹结构
```
uploads/
├── <项目名称>/           ← 按项目名分第一层
│   ├── 发票/收票|开票/
│   ├── 收付款/回款|付款/
│   ├── 合同/收入|支出/
│   ├── 合作单位/营业执照|附件/
│   ├── 图纸/文件/、考勤/记录/、结算/凭证/
└── 未分类/              ← 无项目归属的文件
```
- 类型映射：`invoice_out`→发票/开票/ + 收付款/回款/；`invoice_in`→发票/收票/ + 收付款/付款/

### 核心文件
| 文件 | 作用 |
|------|------|
| `electron/file-service.ts` | saveFile / readFile / deleteFile / FOLDER_MAP |
| `electron/ipc-handlers/files.ts` | 统一 IPC 通道 file:save / file:read / file:delete / file:openExternal |
| `src/services/fileService.ts` | 前端封装：uploadFile / readUploadedFile / FILE_CATEGORIES |
| `electron/database.ts` | `migrateFileStorageV1()` 迁移旧 base64 → 磁盘 |

## 🧰 工具函数与常量
- **常量** (`src/constants/`)：`member.ts`(工种/角色/性别)、`regions.ts`(省市区)、`permissions.ts`(角色/权限标签)
- **工具** (`src/utils/`)：`date.ts`(日期)、`format.ts`(金额/ID)、`validate.ts`(手机/身份证/邮箱)、`audit.ts`(审计)、`export-import.ts`(导入导出)、`projectHealth.ts`(健康度评分)
- 使用规范：常量从 `src/constants/` 导入，工具从 `src/utils/` 导入

## 📦 打包与部署
- **平时只构建不打包**：修改代码 → `vite build`（约5-10秒）→ dev模式测试 → 用户通知才生成安装包
- 安装包：`release\工程管家-Setup-1.0.0.exe`，便携版：`release\win-unpacked\工程管家.exe`
- 打包脚本：`build.js`、`build-nsis.js`、`一键打包.bat`；signAndEditExecutable: false

## 🔢 版本管理
- **语义化版本**：patch(Bug修复) / minor(新功能模块) / major(架构级变更)
- **自动迭代**：neat-freak PostToolUse hook → `scripts/auto-version-on-neat-freak.js`（stdin 条件判断 + 自动检测 major/minor/patch 级别）→ `bump-version.js`
- **bump-version.js** 自动同步 6 处：`package.json` / `Sidebar.tsx` / `Login.tsx` / `Settings.tsx` / `CLAUDE.md` / `CHANGELOG.md`
- 版本历史：`CHANGELOG.md`（1.0.0→1.19.0）+ Settings 更新日志浮窗

### 当前版本：v1.21.0

## 🎨 UI 规范

### 设计 Token
- **图标**：lucide-react `<Icon name="IconName" />`，`iconMap.ts` 注册
- **中性色**：slate 色系；语义色：primary(蓝)/success(绿)/warning(琥)/danger(红)/info(天蓝)
- **暗黑模式**：Settings→外观主题切换 Tailwind `darkMode: 'class'`
- **CSS Token**：`src/index.css` 中 `:root` / `.dark` 定义

### 组件库（`src/components/ui/`）
Button(variants/sizes/iconOnly) / Input(status+leftSection/rightSection) / Modal(AnimatePresence+centered) / Card(padding+glass+hover) / Badge(variants+dot脉冲) / Select(下拉动画+clearable) / Table(stickyHeader+sizes) / Pagination / DropdownMenu(Portal+AnimatePresence) / Tabs(layoutId弹簧指示器+badge) / Tooltip(延迟300ms+箭头) / ProgressBar(variants+animated width) / FormField(label/error/helpText) / Toast(Context管理+AnimatePresence堆叠+spring) / Loading(Spinner+Skeleton) / EmptyState / PageContainer(`max-w-[1400px] mx-auto p-6`, wide/narrow/full)

### 动画系统（framer-motion）
- **原则**：spring 物理优先（stiffness≤200）、大元素禁 scale、装饰动画走 CSS @keyframes（合成器线程）、GPU 加速
- **Sidebar**：入场 slide-in + layoutId 激活态弹簧滑动(spring 500/30) + nav stagger(0.03s) + whileHover 右移4px
- **Login**：品牌区 stagger + 浮动光斑 CSS @keyframes + 表单卡片 fade-up + 错误 shake
- **Dashboard**：CountUp(useMotionValue+useSpring stiffness:40) + KPI stagger+whileHover + recharts animationDuration=1200
- **页面切换**：AnimatePresence mode="wait"、opacity 纯透明度（无 scale 防重绘）、duration 0.2s
- **全局交互**：Button whileHover(1.03)+whileTap(0.97) / Card y:-3+boxShadow / Badge dot 呼吸脉冲 / DropdownMenu scale 0.95→1 / Toast spring 入场

### 页面布局
- **侧边栏**：固定 w-64、深色渐变Logo区、圆角药丸导航+左侧激活指示条；底部头像弹出菜单（DropdownMenu，类 Windows 开始菜单），收纳用户管理/系统设置/锁定屏幕/退出登录
- **登录页**：双列布局（左侧品牌区+右侧表单卡片）
- **内容页**：统一 `PageContainer`，仪表板1600px/其他1400px/设置双列网格
- **图纸管理**：支持 JPG/PNG/PDF/DWG/DXF 格式
- **CARD 常量**：`bg-white border border-slate-200 rounded-xl shadow-sm` + `hover:shadow-md transition-all duration-200`

## 🔐 权限系统
- **角色存储**：`db.roles` 集合，`getRolePermissions()` 优先读 db 回退硬编码；系统角色：admin/manager/accountant/worker
- **权限格式**：`resource:action`（15 种资源×7 种操作）
- **权限检查**：`usePermission()` hook → `can(code)` / `canAll(codes)` / `canAny(codes)` / `isAdmin()` / `hasRole(roleId)`
- **权限组件**：`<RequirePermission />` / `<RequireAdmin />` — App.tsx 路由级守卫
- **角色编辑**：Users.tsx→角色权限 Tab→checkbox 矩阵编辑器，`roles:update` IPC
- **侧边栏过滤**：`getFilteredSidebarRoutes(permissions)` 按权限过滤，管理员看到全部
- **屏幕锁定**：`AuthContext.lock()` / `AuthContext.unlock(username, password)`，`LockScreen.tsx` 全屏毛玻璃遮罩，密码验证走 `window.electronAPI.login`
- 默认管理员：`admin` / `admin123`

## 📝 审计日志
- **后端**：`db.auditLogs` 集合，上限 3000 条，`audit.ts`（audit:log/query/stats/clear）
- **存储**：IPC + localStorage 双写；登录时 `AuthContext.login()` 调用 `setCurrentAuditUser()`
- **覆盖模块**：Members, Partners, Invoices, Projects, Contracts, Settlement, Inventory（8 个模块）
- **查看入口**：Users 页"操作日志"Tab（AuditLogsContent 嵌入式：筛选/分页/统计/详情/导出）
- **详情可读化**：三列对比表格（字段中文名/修改前/修改后），金额格式化，状态翻译
- **兼容性**：`actionConfig` 未知操作类型兜底（可选链+默认样式），防止新审计操作导致列表/详情白屏

## 🚀 快速开发指南
1. `npm run dev` 启动开发服务器
2. 修改代码后 `vite build` 快速构建测试
3. 所有组件已拆分至 600 行以内，保持模块化
4. 新增功能时参考 `docs/` 目录下的设计规范

## 📋 架构决策记录

### 数据模型变更
| 变更 | 日期 | 说明 |
|------|------|------|
| `db.projectMembers` 多对多关联表 | 2026-05-05 | 替代 `Member.projectId` 单一字段，支持一个管理人员归属多个项目 |
| `db.templates` 模板集合 | 2026-05-07 | 模板管理独立模块，5 个 IPC handler（`db:templates:*`） |
| `db.wages` + `db.attendances` | 2026-05-04 | 工资计算引擎 + 考勤系统（dailyStatus 五种日状态） |
| `db.auditLogs` + `db.roles` | 2026-05-05 | 审计日志 IPC 持久化 + 角色权限编辑器 |
| `ensureDatabaseFields()` 26 集合防御 | 2026-05-06 | 覆盖全部 `db.*` 集合，旧数据库缺字段时不再崩溃 |

### 模块架构变更
| 变更 | 日期 | 说明 |
|------|------|------|
| 模板管理独立顶级路由 | 2026-05-07 | 7 种分类 + 变量自动检测（mammoth 服务端）+ TemplateSelectorModal 业务集成 |
| 工资管理重构 | 2026-05-06 | 对标 Projects→ProjectDetail 模式，Dashboard+WageCycleDetail(3 Tab) |
| 结算办理重设计 | 2026-05-07 | 6 种细分类别 + 自动核验付款发票 + Excel 模板/灵活导入 + 多文件凭证 |
| 合同看板重构 | 2026-05-07 | 看板首页+子页面模式，收支数据改用 paymentRecords |
| 项目管理重设计 | 2026-05-06 | 8 文件 Bento网格+健康环+投资组合横幅+告警区，领导视角驾驶舱 |
| 考勤每日状态改造 | 2026-05-05 | dailyStatus 字段 + AttendanceDetail 画笔模式日历 + 法定假不计缺勤 |
| 员工管理表格化 | 2026-05-06 | 管理人员卡片→Table + 内联状态下拉 + 批量删除；农民工保持卡片 |

### 文件存储演进
| 变更 | 日期 | 说明 |
|------|------|------|
| base64→磁盘统一文件服务 | 2026-05-03 | `engineering.json` 18MB→1.4MB，中文目录归类 |
| 项目名第一层目录 | 2026-05-04 | 有项目归属→`<项目名>/`，无项目→`未分类/`；三级回退链 |
| projectName 参数修复 | 2026-05-05 | 4 文件间参数名张冠李戴修复，文件正确归入项目文件夹 |
| 同名检测 + 去随机后缀 | 2026-05-05 | `saveFile` 同名返回错误；文件名不再附加 `Date.now().toString(36)` |

### 权限与审计
| 变更 | 日期 | 说明 |
|------|------|------|
| 权限分配重设计 | 2026-05-05 | `db.roles` + 角色权限编辑器 + `getFilteredSidebarRoutes()` + 路由守卫 |
| 审计日志接通 | 2026-05-05 | IPC 持久化 + localStorage 双写 + `setCurrentAuditUser()` + 详情可读化 |
| 用户管理去重 | 2026-05-05 | Settings.tsx 删除内嵌用户管理（~270行），统一到 Users.tsx |

### UI 系统演进
| 变更 | 日期 | 说明 |
|------|------|------|
| lucide-react 图标系统 | 2026-05-06 | emoji 全部替换，`iconMap.ts` + `<Icon>` 统一入口 |
| framer-motion 全站动画 | 2026-05-06 | CountUp+stagger+spring 物理+全局交互反馈 |
| slate 色系统一 | 2026-05-06 | 27 文件 682 处 `gray-`→`slate-`；15 文件 103 处 `dark:` 清理 |
| 全站表头 sticky | 2026-05-06 | 4 个列表 `border-separate`+sticky thead；App.tsx 动画改纯 opacity |
| Toast 全局 Context | 2026-05-05 | 11 页面统一 `useToastContext()`，Portal 渲染到 `document.body` |
| 发票票种细化 | 2026-05-06 | `InvoiceKind` 4 种：纸/电 × 普/专；收付款术语统一（收票→付款/开票→回款） |
| 金额 formatMoney 全局化 | 2026-05-06 | 53 处 `toLocaleString()`→`formatMoney()`，14 文件补 import |

### 工具链
| 变更 | 日期 | 说明 |
|------|------|------|
| bump-version.js 自动迭代 | 2026-05-06 | patch/minor/major 三级，自动同步 6 处版本引用 + CLAUDE.md 去重 |
| check-rules.js 代码规则 | 2026-05-06 | 文件行数上限/禁止复制/useState限制/类型安全/代码分割强制检查 |
| neat-freak PostToolUse hook | 2026-05-06 | stdin 条件判断脚本 `auto-version-on-neat-freak.js`，自动检测 major/minor/patch 级别（关键词+统计启发） |
| DB 安全加固 | 2026-05-06 | `initDatabase()` 解析失败先备份再建新库，防止数据丢失 |

## ⚠️ 红线
- 不得直接修改 `electron/main.ts` 中的 IPC 处理器（已模块化到 `electron/ipc-handlers/`）
- 不得使用 `any` 类型，必须使用严格类型
- 不得在组件中直接操作 localStorage，使用 `AuthContext`
- 不得绕过权限检查，所有敏感操作必须使用 `usePermission` hook

---

# 架构铁律（由 `scripts/check-rules.js` 自动检查，违反硬上限 → 构建失败）

## 铁律一：文件行数上限
| 文件类型 | 硬上限 | 软上限 |
|---------|--------|--------|
| 页面组件 (`src/components/*.tsx`) | 500 行 | 350 行 |
| 功能组件 (`src/components/features/`) | 400 行 | 250 行 |
| IPC handler (`electron/ipc-handlers/`) | 350 行 | 200 行 |
| Hook (`src/hooks/`) | 250 行 | 150 行 |

## 铁律二：禁止复制粘贴
- 两个文件相似度 > 60% → 提取共用逻辑
- 同一文件内同一模式重复 ≥ 3 次 → 提取函数或 hook
- IPC handler 中的 `if (!db.xxx) db.xxx = []` 已由 `ensureDatabaseFields()` 统一处理，新代码禁止再加

## 铁律三：数据流单向规则
- 页面组件禁止直接调用 `window.electronAPI` → 必须通过 hook 层
- 基础数据（projects/partners/members）由全局 `DataProvider` 提供，页面只消费不重复加载
- 新 CRUD 页面必须使用 `useCRUDBase` hook，不要手写 `loadData`/`setLoading`/`setError`

## 铁律四：useState 数量限制
- 单个组件 ≤ 8 个 useState（硬上限）；超过 5 个（软上限）→ 拆分子组件或 useReducer

## 铁律五：类型安全底线
- `preload.ts` 所有 IPC 方法必须有明确类型签名，禁止 `any`
- 新增类型必须在 `src/types/electron.d.ts` 声明，并注册到 `src/types/index.ts`

## 铁律六：代码分割强制
- 每个路由页面必须使用 `React.lazy()` + `Suspense` 动态导入
- 主 bundle 目标：< 500KB (gzip < 150KB)
- 大库（recharts/tesseract/xlsx）仅在对应页面加载

## 反模式黑名单
| 模式 | 替代方案 |
|------|---------|
| `key={refreshKey}` 强制重挂 | 组件接收 `refresh` 回调，内部 `useEffect` 重新 `loadData()` |
| 两个文件仅类型名不同 | 泛型组件接收 `type` prop |
| `Promise.all([getProjects, getMembers, ...])` 写在每个页面 | 全局 DataProvider + useData() hook |
| 表单 onChange 逐字段展开 `...prev` | 通用 `useForm` hook 批量处理 |
| `catch (error: any)` 然后 `showToast(error?.message)` | `handleError(err).getUserMessage()` |
| 页面组件在 App.tsx 顶层 `import` | `React.lazy(() => import('./components/XPage'))` |

## AI 辅助开发自检清单
- [ ] 新增文件是否超过行数上限？
- [ ] 是否复制了已有文件的逻辑？能不能抽共用？
- [ ] 是否直接调了 `window.electronAPI`？（应走 hook）
- [ ] 单个组件 useState 是否 > 5？
- [ ] 新 IPC 方法是否在 `electron.d.ts` 中加了类型？
- [ ] 新页面是否用了 `React.lazy` 动态导入？
- [ ] `npm run build` 是否通过？（含 `check-rules.js`）

## 📋 本次会话
<!-- bump-version.js 从此段落提取变更摘要到 CHANGELOG。每行一条，以 "- " 开头。会话结束后由 neat-freak 触发自动提取。 -->
- 新增自定义分类管理模块：db.costLedgerCategories集合 + 5 IPC(list/create/update/delete/reset) + 内置12种种子 + 用户可增删改
- 新增 CategoryManager 分类管理弹窗：双Tab(支出/收入) + 行内编辑名称颜色 + 内置不可删 + 恢复默认
- 新增 useCostLedgerCategories hook：分类数据统一加载 + 方向过滤 + label/color查询
- 新增备注列：CostLedgerList表头新增备注列，10列表格
- 优化列表列宽：基于熊会对账775行真实Excel数据实测调优，窄列定宽(凭证96/日期84/方向60/分类96/渠道96/金额136/操作52)+宽列均分剩余(往来单位个人/摘要/备注)，border-collapse线框连续，金额font-mono右对齐
- 优化 CategoryPicker：支持动态分类列表+内置/自定义分组+"管理分类..."入口
- 优化 CostLedgerAnalytics：饼图颜色从分类数据动态读取
- 优化 cell padding：px-2→px-3 列间呼吸感
- 优化表头标签：对方→往来单位/个人
- 修复"管理分类"按钮在项目详情页无响应（CategoryManager modal遗漏detail分支渲染）

---

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

---
*本文档与 `CHANGELOG.md`、`MEMORY.md` 和 `docs/` 保持同步，定期更新。*
