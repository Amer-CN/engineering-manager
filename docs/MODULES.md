# 核心模块详细说明

> 本文档包含各业务模块的详细设计说明，CLAUDE.md 只保留模块索引。
> 最后同步：2026-06-02（C# 迁移后更新）

---

## 🤖 AI 智能识别（百度 OCR）

### 架构
```
表单组件 → useXxxOCR hook → recognizeXxx() → baiduXxxOCR() → HTTP POST → C# API → 百度 API
```

### 已接入的 9 种识别功能

| 功能 | Hook | 集成位置 | 自动填入字段 |
|------|------|----------|-------------|
| 身份证 | useIdCardOCR | WorkerForm | 姓名/身份证号/性别/民族/出生日期/住址 |
| 增值税发票 | useInvoiceOCR | InvoiceForm | 发票号/日期/金额/税率/商品名称/双方 |
| 银行卡 | useBankCardOCR | WorkerForm | 卡号/银行名称 |
| 营业执照 | useBusinessLicenseOCR | PartnerForm | 公司名/信用代码/地址/经营范围 |
| 银行回单 | useBankReceiptOCR | PaymentForm | 日期/金额/收付款方 |
| 开户许可证 | usePermitOCR | PartnerForm | 信用代码/公司名 |
| 银行单据 | useBankStatementOCR | — | 交易明细列表 |
| 通用票据 | useGeneralReceiptOCR | — | 文字内容/金额/日期 |
| 企业查询 | useCompanyQueryOCR | — | 工商注册信息（需单独配置 API） |

### 关键文件
- `EngineeringManager.Api/Endpoints/OcrEndpoints.cs` — C# OCR 端点（572 行，9 种识别 API）
- `src/services/ocr.ts` — 渲染进程 OCR 服务层
- `src/hooks/use*OCR.ts` — 8 个 OCR Hook
- `src/components/SettingsOcrSection.tsx` — AI 智能识别设置页

### UI 模式（统一）
- **识别中**：蓝紫渐变按钮 + 旋转加载 + 脉冲文字
- **成功后**：emerald 绿色结果卡片 + 滑入动画 + 详细摘要
- **图标**：Sparkles（AI 感）→ CheckCircle（成功）

### 调用统计
- 保存路径：`<userData>/ocr-stats.json`
- 按月自动重置
- C# 端点：`EngineeringManager.Api/Endpoints/OcrEndpoints.cs`

---

## 📁 核心模块架构

### 人事管理（v2.7.0 — 考勤时间线+薪资历史+入职感知）
- **模块位置**：侧边栏「核心业务」分组，路由 `/hr`，图标 UserCog
- **职能范围**：公司管理人员（memberType='staff'）的档案、考勤、月薪薪酬
- **5 个 Tab**：看板（5 KPI 含今日在岗+实际薪酬）→ 人员档案（部门+职位字段，按部门/状态筛选，OCR 自动填入身份证信息，薪资历史弹窗）→ 考勤管理（摘要列表优先+AttendanceDetail 子页面+考勤时间线子页面+5状态画笔+入职守卫+删除/批量删除+生成默认考勤+导出Excel）→ 薪酬管理（月薪制+考勤→薪酬流水线+就绪指示器+入职守卫+补助列）→ 部门管理（CRUD + 人数统计 + 删除守卫+PositionEditor）
- **考勤 UX 模式**：摘要列表 → 点击姓名 → AttendanceTimeline 子页面（年度分组时间线，年份筛选，月度卡片网格，年度汇总统计）；点击「编辑」→ AttendanceDetail 子页面（紧凑 7 列日历网格，入职前日期灰底禁操作，Shift+点击批量涂色，右键循环切换，附件上传/预览/删除，删除按钮）
- **考勤时间线**：`AttendanceTimeline.tsx`（212行），按年分组显示所有考勤月份，每年展开显示月度卡片+出勤/缺勤/全勤率汇总，年份筛选 pill，点击月份进入 AttendanceDetail，无记录自动创建默认考勤
- **入职日期感知**：`computeAttendanceSummary()` 新增 `startDay` 参数，考勤统计只计入职日后的天数；AttendanceDetail 日历上入职前日期灰色不可操作；薪酬计算对月中入职永远按比例（不适用全勤免扣）
- **薪酬守卫**：松耦合——已打考勤者正常生成，未打考勤者自动跳过（不再阻止全部），工具栏显示"考勤就绪: N/M（未打考勤者自动跳过）"
- **薪资历史**：`db.salaryHistory` 集合（memberId/effectiveDate/baseSalary/subsidy/subsidyNote/note），前端 `SalaryHistoryModal.tsx` 弹窗查看/新增/编辑/删除，新建成员自动创建首条记录，C# 端点 `WageEndpoints.cs`
- **入职守卫**：`entryDate`（优先）或 `createdAt.split('T')[0]`（回退）晚于选中月份最后一天的员工不显示
- **职位编辑器**：`PositionEditor.tsx`（63行），单行输入+添加按钮+token 移除，去掉了拖拽/重命名/预设/批量
- **数据模型**：`db.departments`（部门 CRUD，含 memberCount 计算），`db.salaryHistory`（薪资变动记录），`db.members.departmentId` + `db.members.position` + `db.members.entryDate`
- **共享常量**：`src/constants/attendance.ts` — STATUS_META / summaryDot / summaryLabel / computeAttendanceSummary()，HR 和工人模块统一导入
- **考勤/薪酬**：走 memberId 路径，数据源过滤 memberType='staff'，独立于工人考勤/薪酬
- **迁移向导**：首次访问若存在无部门的 staff → 黄色横幅提示 + 批量分配弹窗
- **核心文件**：`HRManagement.tsx`（页面容器），`features/hr/HRDashboard.tsx`, `StaffList.tsx`, `StaffAttendance.tsx`, `StaffPayroll.tsx`, `DepartmentManager.tsx`, `PositionEditor.tsx`, `AttendanceTimeline.tsx`, `SalaryHistoryModal.tsx`, `config.tsx`，`src/constants/attendance.ts`（共享），`AttendanceDetail.tsx`，`hooks/useDepartments.ts`
- **旧 IPC 通道**【已迁移到 C#】：`electron/ipc-handlers/salary-history.ts` → `WageEndpoints.cs`，`electron/ipc-handlers/attendance.ts` → `WageEndpoints.cs`，`departments.ts` → `SystemEndpoints.cs`
- **C# 端点**：`EngineeringManager.Api/Endpoints/WageEndpoints.cs`（考勤+薪资），`EngineeringManager.Api/Endpoints/MemberEndpoints.cs`（人员档案），`EngineeringManager.Api/Endpoints/SystemEndpoints.cs`（部门管理）
- **设计 Token**：indigo-600 主色（区别于项目模块的蓝色系）

### 工人管理（v2.8.2 — 4-Tab重构+琥珀色系）
- **模块位置**：侧边栏「核心业务」分组，路由 `/labor`，图标 HardHat
- **职能范围**：农民工班组/档案/导入/工资管理，一级Tab直接访问工资数据
- **页面容器**：`LaborManagement.tsx`（~280行，4-Tab容器，参考HRManagement.tsx简洁模式）
- **4个Tab**：看板（5 KPI + 饼图 + 班组列表）→ 工人库（表格：姓名/身份证/年龄/性别/工种/日工资/银行卡号/操作）→ 班组管理（按项目分组卡片网格）→ 工资管理（直接渲染WageManagement）
- **Tab导航**：下划线样式（border-b），琥珀色系(amber)，localStorage持久化 `labor_active_tab`，framer-motion layoutId="labor-tab-indicator" 滑动指示器
- **状态管理**：3个Hook收敛——useLaborData（数据加载）、useLaborModals（~10个模态框状态）、useLaborOperations（整合useMemberOperations+useTeamOps+PoolWorker操作）
- **表单统一**：WorkerPoolForm（快速添加）底部增加"填写完整信息→"切换到MemberForm（完整编辑）
- **主题色**：琥珀色系(amber)，与人事管理的靛蓝色系(indigo)区分，`theme.ts` 导出常量
- **确认对话框**：useConfirm Hook 替代原生 confirm()，包装现有 ConfirmDialog 组件
- **核心文件**：`LaborManagement.tsx`（主容器），`features/labor/LaborDashboard.tsx`（看板），`features/labor/LaborWorkerList.tsx`（工人库），`features/labor/LaborTeamManager.tsx`（班组管理），`features/labor/theme.ts`（主题常量），`features/labor/hooks/useLaborData.ts`，`features/labor/hooks/useLaborModals.ts`，`features/labor/hooks/useLaborOperations.ts`，`hooks/useConfirm.ts`
- **C# 端点**：`EngineeringManager.Api/Endpoints/WageEndpoints.cs`
- **废弃文件**（标记@deprecated）：`WorkerSection.tsx`，`MemberCard.tsx`，`MemberList.tsx`
- **原 `/members` 路由**：保留 PageId 但隐藏侧边栏（showInSidebar: false），作为重定向兼容过渡

### 全局工人信息库（v2.5.0 新增，v2.7.2 扩展）
- **双表分离**：`db.workers`（身份+默认值——name/idCard/gender/birthDate/ethnicity/phone/address/bankAccount/bankName/bankLineNo/workerType/dailyWage）+ `db.projectWorkers`（用工关系——workerId/projectId/teamId/dailyWage/workerType/entryDate/status）
- 同一工人可在多个项目并行，不同项目里工种/日工资独立；Worker 上的 workerType/dailyWage 作为"默认值"
- **WorkerPickerModal**：从特定班组进入时自动锁定班组，无需逐人选择；底部批量默认值栏（工种+日工资）；勾选时优先用工人库自带的 workerType/dailyWage，无则回退批量默认值；全选/取消全选；整行可点击
- **导入更新**：身份证匹配已存在工人 → 用新非空字段覆盖更新（不跳过），支持跨工作表补充信息（表1导入身份证+电话，表2导入工种+工资）
- **导入字段**（9 字段）：姓名/身份证（必填）+ 性别/手机/地址/民族/工资卡号/开户行/联行号/工种/日工资（可选，有就导入）；工种直接存原始中文名（不做 code 转换），`alignColumns()` 修复合并单元格 null 表头列索引错位
- **工种显示**：`getWorkerTypeLabel()` 兼容 code（'welder'）和中文名（'焊工'），表单/Picker 用 `workerTypeToCode()` 转 code 匹配下拉框
- **导入结果**：4 列统计（新增/更新/跳过/失败）
- **工资计算双路径**：staff 走 memberId，worker 走 projectWorkerId；`generateProjectWages` 由 C# 端处理
- 核心文件：`WorkerPickerModal.tsx`, `useWorkerImport.ts`, `useMemberOperations.ts`（被 useLaborOperations 整合）
- **C# 端点**：`EngineeringManager.Api/Endpoints/WageEndpoints.cs`

### 发票管理
- **票种**（`InvoiceKind`）：`paper_regular` / `paper_special` / `electronic_regular` / `electronic_special`
- **业务规则**：收票(invoice_in)→付款（资金流出），开票(invoice_out)→回款（资金流入）
- **状态**（按类型区分）：收票→已收票/部分付款/已付清；开票→已开具/部分收款/已收齐
- 登记回款/付款时可勾选关联发票，自动更新发票状态；入口统一在发票管理
- 收票按销售方关联支出合同，开票按购买方关联收入合同
- **C# 端点**：`EngineeringManager.Api/Endpoints/InvoiceEndpoints.cs`

### 合同管理
- 收入合同 / 支出合同 / 其他协议（框架、合作、和解、赔偿、个人等 6 种子类型）
- 协议合同金额可选，无付款方式/付款记录
- 已收款统计从 `paymentRecords` 表（仅收入/支出合同适用）
- 附件走统一文件服务 `uploads/<项目名>/合同/收入|支出|协议/`，文件名：`合同名[_金额元].ext`
- .docx 用 mammoth 转 HTML iframe 预览；`contract-file:///` 自定义协议支持中英文路径
- **C# 端点**：`EngineeringManager.Api/Endpoints/ContractEndpoints.cs`

### 项目管理
- 项目列表：投资组合概览横幅（深色渐变+4 KPI）+ 项目卡片网格（含 SVG 健康环）
- 详情页 6 Tab：总览（指挥中心）、合同台账、发票、人员、费用明细（成本台账分析看板）、关联单位
- **项目指挥中心**：Bento网格，RadialBarChart健康度+4KPI+告警区（待处理发票/超支/收款率低）+收支BarChart+成本结构PieChart（人材机，数据来自成本台账）
- **人员管理 Tab**：从 `db.projectMembers` 多对多关联表管理，支持添加/移除
- 领域色系统：收入=emerald / 支出=red / 合作方=violet
- **C# 端点**：`EngineeringManager.Api/Endpoints/ProjectEndpoints.cs`

### 结算办理
- **状态**：未办理 → 已办理（自动核验付款+发票）→ 已归档；旧状态自动迁移
- **6 种细分类别**：材料结算 / 专业分包结算 / 劳务人工结算 / 机械设备结算 / 服务类结算 / 其他结算
- **办理核验**：按结算单位自动匹配发票（收入→开票/buyerId，支出→收票/sellerId），按 invoiceDetails 汇总付款，差额警示
- **Excel 导入**：模板导入（固定列映射）+ 灵活导入（多工作表+表头行+列映射）
- 核心文件：`Settlement.tsx`, `SettlementList.tsx`, `SettlementForm.tsx`, `config.tsx`
- **C# 端点**：`EngineeringManager.Api/Endpoints/SystemEndpoints.cs`

### 模板管理（独立顶级模块）
- **架构**：Dashboard（4统计+7分类入口）→ 分类详情（返回+统计+卡片网格）→ 新建/编辑/预览/生成
- **7 种分类**：contract(合同)/settlement(结算)/seal_application(用印)/fund_application(用款)/official_document(红头)/letter(函件)/other
- **变量系统**：text/number/date/select 四种类型；上传 .docx 时 C# 后端用 mammoth 自动检测 `{{变量名}}`
- **TemplateSelectorModal**：按分类加载+搜索+选中回调，合同/结算模块共用（ContractPage + SettlementProjectDetail 集成"从模板生成"入口）
- **编辑模式**：下载→编辑→上传；文件走统一文件服务 `uploads/模板/文件/`
- 核心文件：`Templates.tsx`, `TemplateDashboard.tsx`, `TemplateList.tsx`, `TemplateForm.tsx`, `TemplateCard.tsx`, `TemplatePreview.tsx`, `TemplateGenerate.tsx`, `TemplateSelectorModal.tsx`, `config.tsx`
- **C# 端点**：`EngineeringManager.Api/Endpoints/SystemEndpoints.cs`

### 工资管理（v3.2 — 月份选择器内嵌Tab）
- **侧边栏**：隐藏（showInSidebar: false），通过工人管理模块「工资管理」Tab 直接访问，或直接 URL `/wages`
- **职能范围**：仅工人日薪制工资/考勤，管理人员薪资逻辑已彻底移除（v3.0 代码级清理）
- **架构**：Dashboard（2 KPI 统计+项目卡片）→ WageCycleDetail（考勤管理/项目工资表/工资发放记录 3 Tab）
- **月份选择器**：从 WageCycleDetail 头部移除，嵌入各 Tab 内部——考勤管理和项目工资表各有一个 `<input type="month">`，工资发放记录使用独立的年/月/姓名筛选
- **考勤系统**：按月生成，5 种日状态，AttendanceDetail 画笔模式日历，支持 Excel 导入（出勤天数），走 `generateDefaultAttendancesV2` / `batchImportAttendances` 两条路径
- **计算规则**：`日薪 × 出勤天数 + 奖金 - 扣款`（`calculateActualWage(dailyWage, workDays, bonus, deduction)`）
- **工资发放记录**：应发工资(只读) + 实发金额/发放日期(手动，`type="text" inputMode="decimal"` 支持精确小数输入) + 差额(自动)
- **银行回单解析**：上传 PDF → Python pypdf 提取文字 → 正则解析（兼容多银行格式）→ 姓名+银行卡号双重匹配 → 填入实发金额/日期
- **归档功能**：发放记录 Tab「归档」按钮锁定实发金额/日期，useConfirm 确认对话框
- **提交级操作**：项目工资表「删除选中」→ `batchDeleteWages` 彻底删除；发放记录「删除选中」→ `batchClearPayments` 仅清空发放字段
- 数据表：`db.wages`（projectWorkerId 路径）/ `db.attendances` / `db.projectWorkers`
- 核心文件：`WageManagement.tsx`, `WageCycleDetail.tsx`, `WageRecordsTab.tsx`, `AttendanceTab.tsx`（含月份选择器）, `WageTableTab.tsx`（含月份选择器）
- **旧 IPC 拆分**【已迁移到 C#】：`attendance.ts` + `attendance-utils.ts` + `attendance-batch-import.ts` → 合入 `WageEndpoints.cs`
- **C# 端点**：`EngineeringManager.Api/Endpoints/WageEndpoints.cs`（考勤+工资+发放）

### 成本台账（独立顶级模块）
- **目的**：追踪挂靠施工项目的真实资金流（含灰色支出、垫资、股东融资等明面账不覆盖的资金流）
- **架构**：双入口，角色分离 — 侧边栏独立页面供财务人员录入/查账（Dashboard→项目详情→列表+新增/编辑/删除+Excel级筛选）；ProjectDetail"费用明细"Tab 供领导查看只读分析看板（KPI+饼图+月度趋势柱状图+TOP10排名，无数据录入）
- **UI 设计**：首页 Dashboard 对标项目管理看板（Hero 横幅+framer-motion 动画+CountUp 弹簧加速+KPI 卡片+CARD token），项目子页面头部对标合同管理（ArrowLeft 图标返回+amber 竖条色标+双行标题），项目卡片三层信息结构（方向色条+收支双栏+净额汇总底条）
- **数据模型**：`db.costLedger`（台账条目）+ `db.costLedgerCategories`（分类，含 `level1?` 一级归属），条目字段含 voucherNo(string，支持"3-1""税-12"等，空=无凭证)、direction(expense/income)、category(分类code)、counterparty(往来单位/个人)、channel、linkedInvoiceId(可选)、notes(备注)、attachments
- **分类系统**：二级层级：支出 5 组 18 码（业务费/直接工程费/现场管理费/对公服务及前期投入费/财务及其他费）+ 收入 4 组 7 码（投资款/项目回款/退款/其他收入）+ 用户可自定义增删改；`CATEGORY_HIERARCHY`（含 `direction` 字段）定义完整二级→一级映射；`getLevel1Groups(direction)`/`getLevel1GroupsMerged(categories,direction)` 方向感知分组；`getLevel1ForCode(code,categories)` 优先 DB `level1`→回退 hierarchy；`HIERARCHY_GROUP_NAMES` 内置分组名常量；`CategoryManager.tsx` 双级管理 UI（一级分组卡片+二级子项+新建一级/二级+编辑删除）；`CategoryPicker.tsx` 一级→二级联动选择器；`ensureCategories()` 自动迁移旧扁平分类；列表工具栏「二级/一级」切换+localStorage 持久化
- **业主回款不出现在成本台账中**（业主回款是明面账工程款）
- **渠道标签**：按方向动态切换 — 支出→支付渠道，收入→收入渠道
- **级联删除**：项目删除时自动清理关联台账记录（C# 端点处理）
- **列表布局**：10 列表格（凭证号/日期/方向/分类/往来单位个人/渠道/金额/摘要/备注/操作），`table-fixed border-collapse` 线框连续；Ctrl+滚轮缩放（50-200%），默认110%，工具栏+/-按钮；汇总行独立加大字号深色；日期归一化为YYYY-MM-DD
- **筛选系统**：7 列统一 Excel 风格搜索+勾选（`ColumnFilter.tsx`，Portal 渲染防遮挡，通用 CheckMeta 模式），搜索框实时过滤选项列表→勾选筛选（全选/清除），日期保留快捷按钮（本月/近3月/本年）勾选对应日期，分类筛选联动一级/二级切换按钮，多列 AND 组合，筛选汇总跟随结果
- **表单子组件**：CategoryPicker（方向驱动+自定义分类+管理入口）/ ChannelInput（最近使用缓存+方向感知 placeholder）/ InvoiceLinker（发票搜索）/ FileUploader（延后补传+预览：图片弹窗大图查看，PDF等调用系统默认程序）；日期字段支持粘贴多种格式
- **文件存储**：`uploads/<项目名>/成本台账/凭证/`
- 核心文件：`CostLedger.tsx`, `CostLedgerDashboard.tsx`, `CostLedgerList.tsx`, `CostLedgerForm.tsx`, `ColumnFilter.tsx`, `CostLedgerAnalytics.tsx`, `CostLedgerTab.tsx`, `CostLedgerProjectDetail.tsx`, `CategoryPicker.tsx`, `CategoryManager.tsx`, `CostLedgerBatchBar.tsx`, `CostLedgerCompareModal.tsx`, `CostLedgerImportModal.tsx`, `printExport.ts`（打印+导出Excel）, `useCostLedgerCategories.ts`, `useCostLedgerBatches.ts`
- **旧 IPC**【已迁移到 C#】：`cost-ledger.ts` → `CostLedgerEndpoints.cs`，`cost-ledger-categories-data.ts` → `CostLedgerEndpoints.cs`
- **C# 端点**：`EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs`

### 其他模块
- **仓库管理**：物料库 / 出入库记录 / 项目材料（整合材料管理）→ `EngineeringManager.Api/Endpoints/InventoryEndpoints.cs`
- **单位管理**：合作单位 + 监管单位（Tab切换），纳税资质，统一社会信用代码联网填充 → `EngineeringManager.Api/Endpoints/PartnerEndpoints.cs`

---

## 📁 文件存储系统

### 架构链路
```
前端组件 → src/services/fileService.ts → HTTP POST/GET
                                         → EngineeringManager.Api/Endpoints/FileEndpoints.cs
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
| `EngineeringManager.Api/Endpoints/FileEndpoints.cs` | C# 文件端点：save/read/delete/openExternal |
| `src/services/fileService.ts` | 前端封装：uploadFile / readUploadedFile / FILE_CATEGORIES |
