# CLAUDE.md - 工程管家项目约定
> 项目状态：人事管理+工人管理部门化拆分（v2.6.3 考勤时间线+薪资历史+入职感知+工人管理数据管线修复）
> 最后同步：2026-05-13（工人管理数据管线接通 getProjectWorkers、三Tab统一、班组工人管理、WorkerPoolForm、薪资历史回填迁移）

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

### 人事管理（v2.6.3 — 考勤时间线+薪资历史+入职感知）
- **模块位置**：侧边栏「核心业务」分组，路由 `/hr`，图标 UserCog
- **职能范围**：公司管理人员（memberType='staff'）的档案、考勤、月薪薪酬
- **5 个 Tab**：看板（5 KPI 含今日在岗+实际薪酬）→ 人员档案（部门+职位字段，按部门/状态筛选，OCR 自动填入身份证信息，薪资历史弹窗）→ 考勤管理（摘要列表优先+AttendanceDetail 子页面+考勤时间线子页面+5状态画笔+入职守卫+删除/批量删除+生成默认考勤+导出Excel）→ 薪酬管理（月薪制+考勤→薪酬流水线+就绪指示器+入职守卫+补助列）→ 部门管理（CRUD + 人数统计 + 删除守卫+PositionEditor）
- **考勤 UX 模式**：摘要列表 → 点击姓名 → AttendanceTimeline 子页面（年度分组时间线，年份筛选，月度卡片网格，年度汇总统计）；点击「编辑」→ AttendanceDetail 子页面（紧凑 7 列日历网格，入职前日期灰底禁操作，Shift+点击批量涂色，右键循环切换，附件上传/预览/删除，删除按钮）
- **考勤时间线**：`AttendanceTimeline.tsx`（212行），按年分组显示所有考勤月份，每年展开显示月度卡片+出勤/缺勤/全勤率汇总，年份筛选 pill，点击月份进入 AttendanceDetail，无记录自动创建默认考勤
- **入职日期感知**：`computeAttendanceSummary()` 新增 `startDay` 参数，考勤统计只计入职日后的天数；AttendanceDetail 日历上入职前日期灰色不可操作；薪酬计算对月中入职永远按比例（不适用全勤免扣）
- **薪酬守卫**：松耦合——已打考勤者正常生成，未打考勤者自动跳过（不再阻止全部），工具栏显示"考勤就绪: N/M（未打考勤者自动跳过）"
- **薪资历史**：`db.salaryHistory` 集合（memberId/effectiveDate/baseSalary/subsidy/subsidyNote/note），`salary-history.ts` IPC（list/create/delete/getEffective），`SalaryHistoryModal.tsx` 弹窗查看/新增/编辑/删除，新建成员 IPC 层自动创建首条记录，薪酬计算 `getEffectiveSalary(memberId, yearMonth)` 按月份匹配对应时段的薪资
- **入职守卫**：`entryDate`（优先）或 `createdAt.split('T')[0]`（回退）晚于选中月份最后一天的员工不显示
- **职位编辑器**：`PositionEditor.tsx`（63行），单行输入+添加按钮+token 移除，去掉了拖拽/重命名/预设/批量
- **数据模型**：`db.departments`（部门 CRUD，含 memberCount 计算），`db.salaryHistory`（薪资变动记录），`db.members.departmentId` + `db.members.position` + `db.members.entryDate`
- **共享常量**：`src/constants/attendance.ts` — STATUS_META / summaryDot / summaryLabel / computeAttendanceSummary()，HR 和工人模块统一导入
- **考勤/薪酬**：走 memberId 路径，数据源过滤 memberType='staff'，独立于工人考勤/薪酬
- **迁移向导**：首次访问若存在无部门的 staff → 黄色横幅提示 + 批量分配弹窗
- **核心文件**：`HRManagement.tsx`（页面容器），`features/hr/HRDashboard.tsx`, `StaffList.tsx`, `StaffAttendance.tsx`, `StaffPayroll.tsx`, `DepartmentManager.tsx`, `PositionEditor.tsx`, `AttendanceTimeline.tsx`, `SalaryHistoryModal.tsx`, `config.tsx`，`src/constants/attendance.ts`（共享），`AttendanceDetail.tsx`，`electron/ipc-handlers/salary-history.ts`，`electron/ipc-handlers/attendance.ts`，`hooks/useDepartments.ts`，`departments.ts`（IPC）
- **设计 Token**：indigo-600 主色（区别于项目模块的 blue 色系）

### 工人管理（原「员工管理」改名，v2.6.0）
- **模块位置**：侧边栏「核心业务」分组，路由 `/labor`，图标 HardHat
- **职能范围**：农民工班组/档案/导入/调组/离场，工人工资入口（跳转旧 `/wages` 页面）
- **页面容器**：`LaborManagement.tsx`（~170行，从 Members.tsx 剥离管理人员 Tab，仅保留 WorkerSection + Excel 导入 + WorkerPicker 入口）
- **保持不变**：WorkerSection.tsx 及其子组件、导入逻辑、班组操作、调动/离场流程
- **原 `/members` 路由**：保留 PageId 但隐藏侧边栏（showInSidebar: false），作为重定向兼容过渡 1 版本

### 全局工人信息库（v2.5.0 新增）
- **双表分离**：`db.workers`（纯身份——name/idCard/gender/birthDate/ethnicity/phone/address）+ `db.projectWorkers`（用工关系——workerId/projectId/teamId/dailyWage/workerType/entryDate/status）
- 同一工人可在多个项目并行，不同项目里工种/日工资独立
- **WorkerPickerModal**：班组管理「从工人库添加」→ 搜索+批量勾选+逐行编辑工种日工资
- **导入去重**：身份证号自动检测 `db.workers` → 已存在蓝色标记 → 跳过 Worker 创建仍可创建 ProjectWorker
- **导入逻辑**：班组/日工资为可选项——只填姓名+身份证号即入库，填班组才分配项目
- **10 个 IPC 通道**：`db:workers:*` (5) + `db:projectWorkers:*` (5)，含 batchCreate 事务校验
- **5 步自动迁移**：`migrateDatabase()` 中旧 Member(worker)→Worker+ProjectWorker，含工资/考勤回填+审计标记
- **工资计算双路径**：staff 走 memberId，worker 走 projectWorkerId；`generateProjectWages` 重写
- 核心文件：`workers.ts`（IPC）, `WorkerPickerModal.tsx`, `useWorkerImport.ts`, `useMemberOperations.ts`, `WorkerSection.tsx` 

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
- 详情页 6 Tab：总览（指挥中心）、合同台账、发票、人员、费用明细（成本台账分析看板）、关联单位
- **项目指挥中心**：Bento网格，RadialBarChart健康度+4KPI+告警区（待处理发票/超支/收款率低）+收支BarChart+成本结构PieChart（人材机，数据来自成本台账）
- **人员管理 Tab**：从 `db.projectMembers` 多对多关联表管理，支持添加/移除
- 领域色系统：收入=emerald / 支出=red / 合作方=violet

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

### 工资管理（v2.6.0 — 降级为工人专用入口）
- **侧边栏**：隐藏（showInSidebar: false），通过工人管理模块按钮跳转或直接 URL `/wages`
- **职能范围**：仅工人日薪制工资/考勤（管理人员月薪制已移至人事管理模块）
- **架构不变**：Dashboard（统计+项目卡片）→ WageCycleDetail（考勤管理/项目工资表/工资发放记录 3 Tab）
- **考勤系统**：按月生成，5 种日状态，AttendanceDetail 画笔模式日历
- **计算规则**：工人日薪制 `日薪×出勤天数+奖金-扣款`
- **工资发放记录**：应发工资(只读) + 实发金额/发放日期(手动) + 差额(自动)
- 数据表：`db.wages`（projectWorkerId 路径）/ `db.attendances` / `db.projectWorkers`
- 核心文件：`WageManagement.tsx`, `WageCycleDetail.tsx`, `AttendanceTab.tsx`, `WageTableTab.tsx`, `WageRecordsTab.tsx`, `attendance.ts`, `wages.ts`

### 成本台账（独立顶级模块）
- **目的**：追踪挂靠施工项目的真实资金流（含灰色支出、垫资、股东融资等明面账不覆盖的资金流）
- **架构**：双入口，角色分离 — 侧边栏独立页面供财务人员录入/查账（Dashboard→项目详情→列表+新增/编辑/删除+Excel级筛选）；ProjectDetail"费用明细"Tab 供领导查看只读分析看板（KPI+饼图+月度趋势柱状图+TOP10排名，无数据录入）
- **UI 设计**：首页 Dashboard 对标项目管理看板（Hero 横幅+framer-motion 动画+CountUp 弹簧加速+KPI 卡片+CARD token），项目子页面头部对标合同管理（ArrowLeft 图标返回+amber 竖条色标+双行标题），项目卡片三层信息结构（方向色条+收支双栏+净额汇总底条）
- **数据模型**：`db.costLedger`（台账条目）+ `db.costLedgerCategories`（分类，含 `level1?` 一级归属），条目字段含 voucherNo(按项目自增凭证号)、direction(expense/income)、category(分类code)、counterparty(往来单位/个人)、channel、linkedInvoiceId(可选)、notes(备注)、attachments
- **分类系统**：二级层级：支出 5 组 18 码（业务费/直接工程费/现场管理费/对公服务及前期投入费/财务及其他费）+ 收入 4 组 7 码（投资款/项目回款/退款/其他收入）+ 用户可自定义增删改；`CATEGORY_HIERARCHY`（含 `direction` 字段）定义完整二级→一级映射；`getLevel1Groups(direction)`/`getLevel1GroupsMerged(categories,direction)` 方向感知分组；`getLevel1ForCode(code,categories)` 优先 DB `level1`→回退 hierarchy；`HIERARCHY_GROUP_NAMES` 内置分组名常量；`CategoryManager.tsx` 双级管理 UI（一级分组卡片+二级子项+新建一级/二级+编辑删除）；`CategoryPicker.tsx` 一级→二级联动选择器；`ensureCategories()` 自动迁移旧扁平分类；列表工具栏「二级/一级」切换+localStorage 持久化
- **业主回款不出现在成本台账中**（业主回款是明面账工程款）
- **渠道标签**：按方向动态切换 — 支出→支付渠道，收入→收入渠道
- **IPC 通道**：11 个 — 台账条目 6 个（`:list` / `:create` / `:update` / `:delete` / `:summary` / `:deleteByProject`）+ 分类管理 5 个（`:categories:list` / `:create` / `:update` / `:delete` / `:reset`）
- **级联删除**：项目删除时自动清理关联台账记录（`db:costLedger:deleteByProject`）
- **列表布局**：10 列表格（凭证号/日期/方向/分类/往来单位个人/渠道/金额/摘要/备注/操作），`table-fixed border-collapse` 线框连续，窄列定宽+宽列均分剩余空间不留白，列宽基于真实 Excel 数据（熊会对账775行）实测调优；工具栏「打印」按钮→新窗口打印（A4横版+底部收支汇总），「导出Excel」按钮→xlsx 导出（10列+列宽优化，按当前筛选结果）
- **筛选系统**：7 列统一 Excel 风格搜索+勾选（`ColumnFilter.tsx`，Portal 渲染防遮挡，通用 CheckMeta 模式），搜索框实时过滤选项列表→勾选筛选（全选/清除），日期保留快捷按钮（本月/近3月/本年）勾选对应日期，分类筛选联动一级/二级切换按钮，多列 AND 组合，筛选汇总跟随结果
- **表单子组件**：CategoryPicker（方向驱动+自定义分类+管理入口）/ ChannelInput（最近使用缓存+方向感知 placeholder）/ InvoiceLinker（发票搜索）/ FileUploader（延后补传+预览：图片弹窗大图查看，PDF等调用系统默认程序）；日期字段支持粘贴多种格式
- **文件存储**：`uploads/<项目名>/成本台账/凭证/`
- 核心文件：`CostLedger.tsx`, `CostLedgerDashboard.tsx`, `CostLedgerList.tsx`, `CostLedgerForm.tsx`, `ColumnFilter.tsx`, `CostLedgerAnalytics.tsx`, `CostLedgerTab.tsx`, `CostLedgerProjectDetail.tsx`, `CategoryPicker.tsx`, `CategoryManager.tsx`, `printExport.ts`（打印+导出Excel）, `useCostLedgerCategories.ts`, `cost-ledger.ts`（IPC）, `cost-ledger-categories-data.ts`（内置分类种子数据）

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
- **常量** (`src/constants/`)：`member.ts`(工种/角色/性别)、`attendance.ts`(考勤状态/色标/摘要计算)、`regions.ts`(省市区)、`permissions.ts`(角色/权限标签)
- **工具** (`src/utils/`)：`date.ts`(日期)、`format.ts`(金额/ID)、`validate.ts`(手机/身份证/邮箱)、`audit.ts`(审计)、`export-import.ts`(导入导出)、`projectHealth.ts`(健康度评分)
- 使用规范：常量从 `src/constants/` 导入，工具从 `src/utils/` 导入

## 📦 打包与部署
- **平时只构建不打包**：修改代码 → `vite build`（约5-10秒）→ dev模式测试 → 用户通知才生成安装包
- 安装包：`release\工程管家-Setup-1.0.0.exe`，便携版：`release\win-unpacked\工程管家.exe`
- 打包脚本：`build.js`、`build-nsis.js`、`一键打包.bat`；signAndEditExecutable: false

## 🔢 版本管理
- **语义化版本**：patch(Bug修复) / minor(新功能模块) / major(架构级变更)
- **手动迭代**：由开发者在使用 neat-freak 整理后手动更新版本号和 CHANGELOG.md
- 版本号引用位置：`package.json` / `Sidebar.tsx` / `Login.tsx` / `Settings.tsx` / `SettingsChangelog.tsx` / `CLAUDE.md` / `CHANGELOG.md`
- 版本历史：`CHANGELOG.md`（1.0.0→2.3.0）+ Settings 更新日志浮窗

### 当前版本：v2.6.1

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
- **Dashboard**：CountUp(useMotionValue+useSpring stiffness:100) + KPI stagger+whileHover + recharts animationDuration=1200；KPI 卡片 6 列（项目/待办结算/成员/支出/发票/库存）；发票状态饼图 + 最近发票列表
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
| `ensureDatabaseFields()` 27 集合防御 | 2026-05-06 | 覆盖全部 `db.*` 集合，旧数据库缺字段时不再崩溃 |
| `db.salaryHistory` 薪资历史表 | 2026-05-13 | memberId/effectiveDate/baseSalary/subsidy/subsidyNote/note，追踪薪资变动，薪酬计算按月份匹配 |
| `db.departments` 部门表 | 2026-05-12 | 部门 CRUD（名称+负责人），memberCount 计算字段，member.departmentId + member.position 新增 |
| `migrateSalaryHistoryBackfill` | 2026-05-13 | 为已有 staff 成员自动创建初始 salaryHistory 记录，`_migrations.salaryHistoryBackfillV1` 防重复 |

### 模块架构变更
| 变更 | 日期 | 说明 |
|------|------|------|
| 工人管理数据管线修复 | 2026-05-13 | loadData 改为 getProjectWorkers（不再用 getMembers），数据映射兼容旧 Member shape |
| 工人管理三Tab统一 | 2026-05-13 | 班组管理/工人库/工资管理 三Tab内联，工资管理嵌入为子Tab |
| 班组工人管理弹窗 | 2026-05-13 | TeamWorkerModal 查看/编辑/调组/移除班组内工人，WorkerPickerModal 批量设置 |
| 工人库简化表单 | 2026-05-13 | WorkerPoolForm 仅身份字段，调用 createWorker/updateWorker，不涉及项目/班组 |
| 模板管理独立顶级路由 | 2026-05-07 | 7 种分类 + 变量自动检测（mammoth 服务端）+ TemplateSelectorModal 业务集成 |
| 工资管理重构 | 2026-05-06 | 对标 Projects→ProjectDetail 模式，Dashboard+WageCycleDetail(3 Tab) |
| 结算办理重设计 | 2026-05-07 | 6 种细分类别 + 自动核验付款发票 + Excel 模板/灵活导入 + 多文件凭证 |
| 合同看板重构 | 2026-05-07 | 看板首页+子页面模式，收支数据改用 paymentRecords |
| 项目管理重设计 | 2026-05-06 | 8 文件 Bento网格+健康环+投资组合横幅+告警区，领导视角驾驶舱 |
| 考勤每日状态改造 | 2026-05-05 | dailyStatus 字段 + AttendanceDetail 画笔模式日历 + 法定假不计缺勤 |
| 全局工人信息库 | 2026-05-12 | db.workers + db.projectWorkers 双表分离，WorkerPickerModal，导入去重，工资考勤双路径 |
| 人事+工人管理部门化拆分 | 2026-05-12 | 员工管理拆为 HRManagement + LaborManagement 双模块，新增 db.departments 部门管理，Members→Labor 改名，WageManagement 降级隐藏 |
| 员工管理表格化 | 2026-05-06 | 管理人员卡片→Table + 内联状态下拉 + 批量删除；农民工保持卡片 |
| 成本台账一二级分类重构 | 2026-05-11 | 支出 5 组 18 码 + 收入 4 组 7 码，CategoryPicker 联动选择器，CategoryManager 双级管理，DB 自动迁移 |
| 成本台账筛选系统升级 | 2026-05-11 | 7 列统一搜索+勾选 Excel 风格，ColumnFilter CheckMeta 重构，分类筛选联动层级切换，Dashboard 英文标签修复 |
| check-rules 清零 | 2026-05-11 | 7 硬违规→0：子组件提取 8 文件 + hook 提取 3 个，ContractPage 822→405，SettlementForm 714→314 |
| 任务功能完整移除 | 2026-05-12 | 删除 Tasks.tsx / useTasks.ts / tasks.ts IPC；Dashboard 任务区域替换为发票+结算摘要；项目详情 7 Tab→6 Tab |
| 项目成本结构数据管线修复 | 2026-05-12 | ProjectDetail 接入 getCostLedger，expenseByCategory 从台账实算；otherT 独立计算不依赖外部 total |
| 健康度评分公式调整 | 2026-05-12 | 移除任务进度维度，预算控制 40% + 合同执行 30% + 发票管理 30% |

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
| EmptyState 组件 | 2026-05-11 | 按 DESIGN.md 规范新建，接入 ContractPage/Drawings/ContractTemplates/InvoiceList |
| Inter 字体栈修复 | 2026-05-11 | index.css 根 font-family 补 Inter 优先（DESIGN.md 规范对齐） |
| WorkerSection 懒加载 | 2026-05-11 | React.lazy + Suspense 拆分 13KB chunk，Members 首屏 80→70KB |
| 分类标签两行显示 + 合计行固定底部 | 2026-05-11 | CostLedgerList flex 链重构（flex-1 替代 h-full）；CostLedgerAnalytics/CostLedgerList line-clamp-2 防 -webkit-box 塌缩；Dashboard BarChart CategoryTick SVG tspan 两行 |
| Hero 横幅装饰光点统一 | 2026-05-11 | 6 页 hero banner 统一呼吸光点动画（radial-gradient + 2×motion.div opacity/scale infinite），ContractDashboard / ProjectCommandCenter / ProjectDetail / ProjectList 补齐 |
| Dashboard CountUp 弹簧加速 | 2026-05-11 | stiffness 40→100（2.5×）+ damping 25→20，数字滚动更快到位 |

### 工具链
| 变更 | 日期 | 说明 |
|------|------|------|
| check-rules.js 代码规则 | 2026-05-06 | 文件行数上限/禁止复制/useState限制/类型安全/代码分割强制检查 |
| DB 安全加固 | 2026-05-06 | `initDatabase()` 解析失败先备份再建新库，防止数据丢失 |
| /benchmark 基线 | 2026-05-11 | 构建产物性能基线：2.4MB dist / 33 chunks / 9.1s build / Grade A |
| Superpowers skill 体系修复 | 2026-05-11 | 15 个 sub-skill 从 `superpowers/skills/` 嵌套提取到 `~/.claude/skills/` 根级（Claude Code 只扫描一层），同步到 CC Switch；清理失效 superpowers git repo |

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
