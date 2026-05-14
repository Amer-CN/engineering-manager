# CHANGELOG — 工程管家

> 版本格式遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`
> - **修订号 (Patch)**：Bug 修复、小优化、内部组件改进
> - **次版本 (Minor)**：新功能模块、UI 重设计、模块重构、多项功能集合
> - **主版本 (Major)**：架构级变更、破坏性改动

---

## [2.8.2] — 2026-05-15

### ✨ 新增
- **工人管理4-Tab重构**：看板（5 KPI + 饼图 + 班组列表）→ 工人库 → 班组管理 → 工资管理，参考人事管理模块简洁设计
- **琥珀色系主题**：工人管理统一使用 amber 色系，与人事管理的 indigo 色系区分
- **useConfirm Hook**：声明式确认对话框，替代原生 `confirm()`，包装现有 ConfirmDialog 组件
- **看板Tab**：工人总数/在场/已离场/超龄/班组数量 5个KPI + 项目分布饼图 + 班组概览列表
- **状态管理Hook**：useLaborData（数据加载）、useLaborModals（模态框状态收敛）、useLaborOperations（操作整合）
- **WorkerPoolForm切换链接**：底部增加"填写完整信息→"切换到MemberForm完整编辑

### 🔧 优化
- **月份选择器内嵌Tab**：从WageCycleDetail头部移除，考勤管理和项目工资表各嵌入独立月份选择器，工资发放记录使用原有年/月/姓名筛选
- **attendance.ts拆分**：428行→298行，工具函数→attendance-utils.ts，批量导入→attendance-batch-import.ts
- **Tab导航升级**：下划线样式 + framer-motion layoutId滑动指示器 + localStorage持久化
- **WorkerSection标记废弃**：@deprecated 标记，被 LaborWorkerList + LaborTeamManager 替代

### 📄 涉及文件
- 新增：`src/components/features/labor/LaborDashboard.tsx`、`LaborWorkerList.tsx`、`LaborTeamManager.tsx`、`theme.ts`、`hooks/useLaborData.ts`、`hooks/useLaborModals.ts`、`hooks/useLaborOperations.ts`、`src/hooks/useConfirm.ts`、`electron/ipc-handlers/attendance-utils.ts`、`electron/ipc-handlers/attendance-batch-import.ts`
- 重写：`src/components/LaborManagement.tsx`（366行→~280行4-Tab容器）
- 修改：`src/components/features/wages/WageCycleDetail.tsx`（移除头部月份选择器）、`AttendanceTab.tsx`（增加月份选择器）、`WageTableTab.tsx`（增加月份选择器）、`WageManagement.tsx`（useConfirm替换confirm）、`electron/ipc-handlers/attendance.ts`（拆分+导入utils）、`electron/ipc-handlers/index.ts`（新增attendance-batch-import导入）
- 主题色统一：`WorkerSection.tsx`、`WorkerPoolForm.tsx`、`WorkerSectionModals.tsx`、`MemberFormLayout.tsx`、`MemberCard.tsx`、`WageStatsTab.tsx`、`WageTableTab.tsx`、`WageRecordsTab.tsx`、`AttendanceTab.tsx`（orange→amber）

---

## [2.8.1] — 2026-05-14

### ✨ 新增
- **银行回单 PDF 解析**：上传银行代发回单 PDF，自动提取交易日期/总金额/成功金额/明细行，按「姓名+银行卡号」双重匹配填入实发金额和发放日期
- **多银行格式兼容**：正则支持工行/农行/建行/农商行/中行等常见回单格式（表头/日期/金额标签差异）
- **回单内容查看**：解析为 0 条时，界面显示「查看提取内容」按钮，可展开 pypdf 提取的原始文本辅助诊断
- **发放记录归档**：「🔒 归档」按钮锁定实发金额/日期（输入框变灰禁用），「清除发放记录」同步解除归档
- **银行卡号双重匹配**：回单解析提取收款账号，匹配时先用姓名模糊匹配，再用银行卡号精确确认，解决同名工人误匹配问题

### 🔧 优化
- **实发金额输入修复**：`<input type="number">` → `type="text" inputMode="decimal"`，`paidAmount` 类型 `number` → `string`，解决无法输入小数点问题
- **发放记录删除逻辑修正**：发放记录 Tab「删除选中」只清空发放字段（paidAmount/paidDate/bankReceiptPath），不再删除工资记录本身；项目工资表 Tab「删除选中」仍为彻底删除

### 🐛 修复
- **中文 Windows 编码乱码**：Python `print()` 默认输出 GBK → Node.js `exec` UTF-8 解码导致中文全部变为乱码。修复：Python 脚本加 `sys.stdout.reconfigure(encoding='utf-8')` + exec 环境设 `PYTHONIOENCODING=utf-8`
- **Python 命令回退**：优先 `python` → `python3` → `py` → `py -3`，解决不同系统 Python 命令名不一致问题
- **扫描件误判静默失败**：pypdf 对扫描图片 PDF 返回空字符串/页码垃圾 → 新增 `hasCJK()` 中文内容检查，无中文返回明确错误提示，不再静默显示「0 条」

### 📄 涉及文件
- IPC：`electron/ipc-handlers/wages.ts`（新增 `batchClearPayments` / `batchArchivePayments` / `bankAccount` 查询关联）、`wage-calc.ts`（重写正则匹配、多格式兼容、编码修复、CJK 检查、多命令回退）
- 预加载：`electron/preload.ts`（暴露 `batchClearPayments` / `batchArchivePayments`）
- 类型：`src/types/electron.d.ts`（`WageRecord.paymentLocked` / `WageRecord.bankAccount` / `BankReceiptItem.account` / 新增 API 签名）
- UI：`src/components/WageManagement.tsx`（姓名+卡号双重匹配、归档处理、`paidAmount` string 类型）、`WageCycleDetail.tsx`、`WageRecordsTab.tsx`（归档按钮、锁定UI、输入框修复、查看提取内容）

---

## [2.8.0] — 2026-05-14

### ✨ 新增
- **合同管理新增「其他协议」类型**：收入/支出合同之外增加第三种合同类型，覆盖框架协议、合作协议、和解协议、赔偿协议、个人协议等 6 种子类型，适用于不涉及具体金额收支或仅约定分配比例的真实经营场景
- 协议合同金额可选（框架协议可填 0 或不填），无付款方式/付款记录字段
- 看板新增蓝色系「其他协议」导航卡片（收入→支出→其他，位于最右侧），饼图增加第三扇区
- 新增 `agreementContracts` 数据库表，4 个 IPC 通道，导入/导出支持
- **工人考勤 Excel 导入**：上传工资表/花名册，autoMap 自动识别姓名+身份证号+出勤天数三列，身份证号优先匹配（精准避免同名混淆），仅导入出勤天数不标记缺勤
- **工资周期月份选择器**：考勤管理页面新增 `<input type="month">`，可切换月份查看/导入考勤数据

### 📄 涉及文件
- 新增类型：`src/types/electron.d.ts` (AgreementContract, AgreementSubType)
- 数据层：`electron/database.ts`, `electron/database.d.ts`
- IPC：`electron/ipc-handlers/contracts.ts`, `electron/preload.ts`
- UI：`src/components/Contracts.tsx`, `ContractDashboard.tsx`, `ContractPage.tsx`, `features/contracts/ContractFormModal.tsx`
- 配置：`src/components/features/contracts/contractConfig.ts`
- 导出：`src/utils/export-import.ts`
- 考勤导入：`src/components/features/wages/AttendanceImportModal.tsx`、`electron/ipc-handlers/attendance.ts`（batchImportAttendances）、`electron/preload.ts`、`src/types/electron.d.ts`
- 考勤 UI：`src/components/features/wages/AttendanceTab.tsx`、`WageCycleDetail.tsx`、`src/components/WageManagement.tsx`

---

## [2.7.3] — 2026-05-14

### 🐛 修复
- **工人导入合并单元格列索引对齐**：新增 `alignColumns()` 过滤 null 表头并按有效列裁剪数据行，修复 Excel 合并单元格导致工种/银行卡等字段读到错误列的数据
- **工种直接存原始中文名**：移除 `resolveWorkerType()` 有损 code 转换（"安装工"不再被映射成"其他工种"），`getWorkerTypeLabel()` 兼容 code 和中文名，新增 `workerTypeToCode()` 给表单/Picker 下拉框用
- **"不导入"设置按字段名记忆**：`unmappedFields` ref 存字段名而非列索引，切换工作表时重新 autoMap 后只对"不导入"字段强制 -1
- **LaborManagement 数据源修复**：`loadData` 优先取 `pw.worker?.workerType/dailyWage`（工人库最新值），不取 `pw.workerType`（projectWorkers 旧值）
- **WageStats 按月过滤+脏数据过滤**：`getWageStats` 按 yearMonth 过滤无效记录，Dashboard 传入 selectedMonth
- **WorkerPickerModal 行数合规**：复用 `memberFormTypes.ts` 的 `workerTypes` 常量，411→395 行
- **WorkerSection 补 import**：TransferModal/LeaveModal 缺失导致构建报错

### 📄 涉及文件
- 修改：`useWorkerImport.ts`、`memberFormTypes.ts`、`WorkerPoolForm.tsx`、`WorkerPickerModal.tsx`、`WorkerSection.tsx`、`LaborManagement.tsx`、`wages.ts`、`WageStatsTab.tsx`、`WageManagement.tsx`

---

## [2.7.2] — 2026-05-14

### ✨ 新增
- **工人库年龄+银行卡号列**：从身份证提取年龄，超 60 岁红色高亮；新增银行卡号列；去掉班组/状态/进场日期列
- **导入字段扩展**：新增工资卡号/开户行/联行号/工种/日工资
- **Worker 类型扩展**：`db.workers` 新增 bankAccount/bankName/bankLineNo/workerType/dailyWage 默认值字段
- **WorkerPoolForm 扩展**：新增联行号、默认工种、默认日工资输入

### 🔄 改进
- **导入有则更新**：已存在的工人（身份证匹配）不再跳过，用新非空字段覆盖更新，支持跨工作表补充信息
- **导入结果 4 列统计**：新增/更新/跳过/失败
- **WorkerPickerModal 流程简化**：从班组进入时自动锁定班组+隐藏右侧面板；底部批量默认值栏；整行可点击；优先用工人库默认值
- **工人库数据源修复**：`loadData()` 同时读取全局工人库（`getWorkers()`）+ 项目工人（`getProjectWorkers()`），导入后立即可见
- **默认 Tab 改为工人库**：导入后不再跳到班组管理页面

### 🗑️ 移除
- **工人库清理**：去掉调组/离场/重新入场按钮及 TransferModal/LeaveModal 死代码，去掉状态筛选器

### 📄 涉及文件
- 修改：`electron.d.ts`、`WorkerSection.tsx`、`WorkerSectionModals.tsx`、`WorkerPickerModal.tsx`、`WorkerPoolForm.tsx`、`useWorkerImport.ts`、`WorkerImportModal.tsx`、`LaborManagement.tsx`

---

## [2.7.1] — 2026-05-14

### 🐛 修复
- **工人导入精简**：导入字段从 10 个缩减为 6 个身份字段（姓名/身份证/性别/手机/地址/民族），去掉班组/日工资/工种/进场日期，只创建工人库记录不再创建 ProjectWorker 用工关系
- **导入空行跳过**：姓名和身份证都为空的行静默跳过，不再报"缺少姓名"错误

### 🔧 工具
- **Auto-Effort Hook 双模型自适应**：根据 `ANTHROPIC_BASE_URL` 自动选择分类模型（MiMo→`mimo-v2.5` / DeepSeek→`deepseek-v4-flash`），切换 API 无需修改 hook 文件

### 📄 涉及文件
- 修改：`useWorkerImport.ts`、`WorkerImportModal.tsx`、`LaborManagement.tsx`、`Members.tsx`、`auto-effort-smart.js`

---

## [2.7.0] — 2026-05-14

### 🔧 重构
- **工资管理纯工人化 v3.0**：代码级清理所有管理人员薪资逻辑
  - `calculateActualWage` 签名从 `(member, attendance, bonus, deduction)` 简化为 `(dailyWage, workDays, bonus, deduction)`
  - `generateProjectWages` 去掉 staff/projectManager/legacy 分支，仅处理活跃 projectWorkers
  - `WageRecord` 类型精简：移除 9 个 staff 专属字段（baseSalary/socialSecurity*/housingFund*/otherAllowances/companyCoversSocial/isFullAttendance/daysOff），新增 projectWorkerId
  - `WageStats` 类型精简：移除 staffWage/workerWage 区分
  - `WageManagement.tsx`：移除 members 状态、staff 考勤生成分支、月薪计算逻辑、projectMembers 查询
  - `AttendanceTab.tsx`：移除"类型"列和 members prop，全部显示为工人
  - `WageTableTab.tsx`：移除"类型"列、月薪/全勤/社保计算，简化为 7 列纯日薪表
  - `WageStatsTab.tsx`：4 KPI→2 KPI（工资总额+记录条数），移除管理人员工资卡
  - `wage-calc.ts`：60 行精简，移除 getPersonalDeduction

### 🎨 UI
- **工人库 Excel 拖拽框移除**：WorkerSection 工人列表 Tab 删除虚线拖拽上传区，保留工具栏"导入Excel"按钮，释放列表显示空间

### 📄 涉及文件
- 修改：`WageManagement.tsx`、`WageCycleDetail.tsx`、`AttendanceTab.tsx`、`WageTableTab.tsx`、`WageStatsTab.tsx`、`WorkerSection.tsx`、`WorkerSectionModals.tsx`、`LaborManagement.tsx`、`wage-calc.ts`、`wages.ts`、`electron.d.ts`

---

## [2.6.3] — 2026-05-13

### 🐛 修复
- **工人管理数据管线**：`loadData()` 从 `getMembers()` 切换为 `getProjectWorkers(projectId)`，解决 v2.5.0 迁移后工人列表为空、班组计数为 0 的问题
- **ID 命名空间不匹配**：从工人库添加按钮 `m.id` → `m.workerId`，修复"隐藏已在项目的"过滤失效
- **WorkerPickerModal 默认 teamId**：新增 `defaultTeamId` prop，从 TeamWorkerModal 打开时预选当前班组

### ✨ 新增
- **三Tab统一**：班组管理 / 工人库 / 工资管理 三个子Tab内联，工资管理嵌入为第三个Tab不再独立跳转
- **班组工人管理弹窗**：`TeamWorkerModal.tsx`，查看班组下所有工人表格，支持内联编辑工种+日工资、调组（hover下拉）、移除（确认）、底部从工人库添加入口
- **WorkerPickerModal 批量设置**：右侧面板顶部新增批量设置区域，班组/工种/日工资一键"应用到全部已选"
- **工人库简化表单**：`WorkerPoolForm.tsx`，仅身份字段（姓名/电话/身份证号+OCR双面上传/性别/民族/出生日期/住址/银行卡/开户行），走 `createWorker`/`updateWorker` IPC
- **薪资历史回填迁移**：`migrateSalaryHistoryBackfill()`，为已有 staff 成员自动创建初始 salaryHistory 记录，`_migrations.salaryHistoryBackfillV1` 防重复

### 🔧 改进
- **工人管理**：页面标题按钮移除，工资管理改为子Tab；工人列表改名工人库；从工人库添加按钮移至班组管理Tab
- **工人库表格**：编辑/删除操作改为走 Worker 全局池 API（`updateWorker`/`deleteWorker`），删除确认弹窗
- **数据映射增强**：loadData 新增 birthDate/ethnicity/address/bankAccount/bankName 字段

---

## [2.6.2] — 2026-05-13

### ✨ 新增
- **考勤时间线子页面**：`AttendanceTimeline.tsx`，按年分组显示所有考勤月份，年度汇总（出勤天数/缺勤天数/全勤率），年份筛选 pill，点击月份进入日历画笔模式
- **薪资历史系统**：`db.salaryHistory` 集合 + 4 个 IPC 通道（list/create/delete/getEffective）+ `SalaryHistoryModal.tsx` 弹窗管理，新建成员自动创建首条记录，薪酬计算按月份匹配对应时段薪资
- **入职日期感知考勤**：`computeAttendanceSummary()` 新增 `startDay` 参数，AttendanceDetail 日历入职前日期灰色不可操作，薪酬计算对月中入职永远按比例
- **考勤详情删除按钮**：AttendanceDetail 顶栏新增删除按钮（Trash2 图标），确认后删除整条记录并返回

### 🔧 改进
- **考勤历史列**：flat month pills → `N年 · M个月` 紧凑链接，点击进入时间线子页面，彻底解决长工龄溢出
- **薪酬守卫松耦合**：未打考勤自动跳过而非阻止全部生成，工具栏显示"未打考勤者自动跳过"
- **薪酬计算修正**：月中入职按 `baseSalary / 月天数 × 实际出勤天数` 计算，不适用全勤免扣规则
- **入职日期修复**：考勤/薪酬/看板的入职守卫从 `createdAt` 改为 `entryDate`（回退 `createdAt.split('T')[0]`）
- **薪酬表格**：奖金列改为补助列（只读，数据来自薪资历史），`netSalary` 已含补助
- **职位编辑器**：精简为单行输入+添加按钮+token 移除

### 🐛 修复
- **薪资历史补助输入框吞值**：`type="number"` → `type="text" inputMode="numeric"`
- **薪资历史无编辑**：新增编辑模式，复用新增表单预填当前值


## [2.6.1] — 2026-05-13

### 🐛 修复
- **薪酬计算出错**：StaffPayroll.attendanceDays() 读取不存在字段 a.date，所有员工出勤天数永远为 0
- **无考勤可生成薪酬**：generatePayroll() 缺少考勤存在性检查
- **考勤保存失败无提示**：applyDay() 的 catch {} 为空块
- **OCR 识别不自动填入**：StaffList.tsx 读 res.data（实为 res.idCard）和 d.idCard（实为 d.number），if 永远 false
- **未入职可打考勤**：考勤/薪酬列表未按入职日期过滤

### 🔧 改进
- **考勤 UX 重设计**：摘要列表优先 → 点击编辑进入 AttendanceDetail 子页面
- **复用 AttendanceDetail**：删除 AttendanceDetailModal.tsx，改用已有紧凑日历组件
- **生成默认考勤**：替换创建考勤记录为一键全勤+个别调整模式
- **考勤操作增强**：新增清空/删除/批量删除
- **薪酬流水线守卫**：就绪指示器+未就绪禁用生成
- **看板增强**：今日在岗 KPI + 月度薪酬实际值
- **共享常量**：src/constants/attendance.ts


## [2.6.0] — 2026-05-12

### ✨ 新增
- **人事管理模块**：新建顶级模块 `/hr`（侧边栏「核心业务」分组），5 个 Tab：看板/人员档案/考勤管理/薪酬管理/部门管理
- **人事看板**：4 KPI 卡片（在编人数/本月入职/本月离职/月度薪酬）+ 部门分布饼图 + 最近入职列表
- **部门管理系统**：`db.departments` 独立数据表，部门 CRUD + 人数统计 + 删除守卫（有人员时阻止删除）
- **人员档案增强**：新增 `departmentId`（部门归属）和 `position`（职位）字段，按部门/状态下拉筛选
- **管理人员考勤**：独立 StaffAttendance 组件，月份选择 + 月历网格 + 5 状态画笔（出勤/法定假/病假/事假/缺勤），遵循现有 `Record<number, DayStatus>` 数据模型
- **管理人员薪酬**：独立 StaffPayroll 组件，月薪制（全勤=休假≤4天全薪），生成/奖金/扣款/实发/差额，遵循现有 wages IPC
- **迁移向导**：首次访问人事模块时，检测无部门的 staff → 黄色横幅提示 + 批量分配部门弹窗
- **工人管理模块**：原「员工管理」改名为「工人管理」(`/labor`)，图标 HardHat，仅保留工人/班组/导入功能
- **旧路由兼容**：`/members` 保留为 PageId 但隐藏侧边栏（showInSidebar: false），作为重定向过渡 1 版本

### 🔧 改进
- **模块架构重构**：员工管理拆分为人事管理（管理人员）+ 工人管理（农民工）两个独立顶级模块，向部门化架构迈第一步
- **工资管理降级**：WageManagement.tsx 保留不删，侧边栏隐藏，通过工人管理模块入口访问
- **数据流分离**：人事模块的考勤/薪酬走 memberId 路径且仅处理 memberType='staff'，工人模块的考勤/薪酬走 projectWorkerId 路径不受影响
- **10 个新建文件**：HRManagement.tsx（74行）+ 5 个 features/hr/* 组件 + departments IPC（60行）+ useDepartments hook + LaborManagement.tsx（~170行）

### 🐛 修复
- 图纸上传后界面不显示：React state 同引用 bailout 修复（`[...drawings]` 展开 + uploadDrawing 返回值检查 + reader.onerror 处理）
- 图纸 IPC handler 数组引用突变修复（`[...drawings].sort()` 替代 `drawings.sort()`）

### ⚠️ 已知待办
- 人事/工人模块的权限映射（`hr:read` / `labor:read`）需在 roles handler 中注册
- 部门 CRUD 的审计日志接入
- 人事模块接入全局 DataProvider（铁律三）

---

## [2.5.0] — 2026-05-12

### ✨ 新增
- **全局工人信息库**：db.workers（纯身份）+ db.projectWorkers（用工关系）双表分离，一个工人可同时在多个项目，不同项目里工种/日工资独立
- **WorkerPickerModal**：班组管理新增「从工人库添加」按钮，搜索+批量勾选+逐行编辑工种日工资，已在本项目的工人自动置灰
- **导入去重增强**：Excel 导入时自动检测身份证号是否已在 db.workers 中存在，已存在→蓝色标记，跳过 Worker 创建但仍可创建 ProjectWorker
- **导入逻辑优化**：班组/日工资改为可选列——只填姓名+身份证号即可导入工人库，填了班组才同时分配项目
- **导入表头行切换**：修复表头行下拉框无 onChange 导致无法选择其他行，新增 parseBuffer 支持切换表头行/工作表后重新解析
- **工人跨项目统计**：全局工人库 Tab 表格展示每个工人的项目数、总薪资
- **5 步自动迁移脚本**：旧 Member(worker) → Worker + ProjectWorker，含工资/考勤回填+审计标记，幂等跳过
- **10 个新 IPC 通道**：db:workers:* (5) + db:projectWorkers:* (5)，含 batchCreate 事务性校验

### 🔧 改进
- wage-calc.ts generateProjectWages 重写：worker 走 projectWorkers（按 projectWorker.dailyWage 独立计算），staff 路径不变
- attendance.ts 新增 generateDefaultsV2：worker 考勤通过 projectWorkerId 生成，status='left' 的工人自动跳过
- members.ts 班组删除守卫改为查 db.projectWorkers（旧 db.members 查询因 worker 迁移后为空而失效）
- WorkerPicker 搜索框 200ms debounce 防抖
- KPI 卡片左侧 3px 领域色条（slate/emerald/blue/amber）区分设计
- 工人状态交互覆盖矩阵：WorkerPicker/导入/统计面板的 loading/empty/error/success/partial 5 种状态全部定义

### 🐛 修复
- 首页发票状态饼图 tooltip + 图例英文→中文翻译
- WorkerImport useWorkerImport toLowerCase on undefined 崩溃（加 String() 防御包装）

---

## [2.4.0] — 2026-05-12

### ✨ 新增
- 工人 Excel 批量导入：WorkerImportModal 支持智能列映射（关键词自动匹配+手动下拉调整）、表头行选择、工作表切换、数据预览（前10行，错误行红色高亮）、分批导入（50条/批）、进度条、结果汇总（成功/跳过/失败统计+失败详情）
- 列映射记忆：保存为命名预设到 localStorage，下次同表头自动套用并提示「检测到 '{预设名}'」
- 拖拽上传区：WorkerSection 工人列表子Tab 紧凑单行拖拽区，支持拖入 .xlsx/.xls/.csv 直接解析
- CSV 编码自动检测：UTF-8 → GBK → GB2312 → GB18030 回退链
- 文件约束检查：10MB 上限、10,000 行上限、加密文件/空文件提示
- 工人列表卡片→表格：9列表格（姓名/身份证号/性别/班组/工种/日工资/进场日期/状态/操作），同屏可见数十个工人
- 身份证号去重：导入时自动跳过已存在的身份证号，重上传安全

### 🐛 修复
- 添加工人/编辑工人弹窗「创建成功」但未实际创建：handleSubmitWorker/handleSubmitStaff 未检查 createMember/updateMember 返回值即显示成功并关闭模态框
- 班组编辑按钮点击不弹编辑框直接显示更新成功：WorkerSection 编辑按钮直接调用 handleUpdateTeam，改为打开 TeamFormModal
- 工人调组按钮点击不弹调组框直接显示调组成功：WorkerSection 调组按钮直接调用 handleWorkerTransfer，改为打开 TransferModal
- Excel 拖拽/点击无反应：parseFile 中所有异常被静默吞掉且错误路径调用 setPhase('idle') 关闭模态框

### 🔧 改进
- 拖拽上传区从大横幅改为紧凑单行（p-8→px-4 py-2.5），不占工人列表空间
- 调组/离场模态框在 WorkerSection 内部管理状态，数据通过 onTransfer/onLeave 回调传递
- FileReader onerror 处理 + GBK 编码回退链 + 空文件检测

## [2.3.0] — 2026-05-12

### 🔥 移除
- 任务模块完整移除：删除 Tasks.tsx（437行）/ useTasks.ts（193行）/ tasks.ts IPC（68行），独立页面从未接入路由，Dashboard 和项目详情的任务区域始终为空

### ✨ 重设计
- Dashboard 首页任务区域替换为发票+结算摘要：Hero 任务完成率→待办结算数，KPI 任务总数→待办结算卡，饼图任务分布→发票状态分布，最近任务→最近发票列表
- 项目详情 7 Tab→6 Tab（移除任务管理）
- 项目指挥中心：KPI 行任务完成→待处理发票，任务进度卡片→发票概览，告警区逾期任务→待处理发票

### 🔧 修复
- 项目成本结构数据管线接通：ProjectDetail 接入 getCostLedger 加载台账条目，expenseByCategory 从台账实算，成本结构环形图（人材机）不再显示空数据
- costTotal / otherT 计算修正：otherT 改为独立计算不匹配人材机关键词的剩余分类之和，百分比始终归 100%
- 健康度评分公式调整：4 维→3 维（移除任务进度 30%，预算控制 40%+合同执行 30%+发票管理 30%）

### 📄 文件
- 删除：`src/components/Tasks.tsx`、`src/hooks/useTasks.ts`、`electron/ipc-handlers/tasks.ts`
- 修改：`src/types/electron.d.ts`、`src/types/index.ts`、`src/types/guards.ts`、`src/hooks/index.ts`、`electron/ipc-handlers/index.ts`、`electron/ipc-handlers/stats.ts`、`electron/preload.ts`、`electron/database.ts`、`src/components/Dashboard.tsx`、`src/components/features/projects/ProjectDetail.tsx`、`src/components/features/projects/ProjectDetailTabs.tsx`、`src/components/features/projects/ProjectStats.tsx`、`src/components/features/projects/ProjectCommandCenter.tsx`、`src/utils/projectHealth.ts`

---

## [2.2.3] — 2026-05-12

### ✨ 新增
- 成本台账导出 Excel：工具栏「导出Excel」按钮，按当前筛选结果导出 10 列 xlsx（序号/凭证号/日期/方向/分类/往来单位/渠道/金额/摘要/备注），列宽优化
- 成本台账打印：工具栏「打印」按钮，生成独立打印窗口，A4 横版表格 + 底部收支汇总（经营支出/资金收入/净流入流出）
- 凭证附件预览：FileUploader 每条附件新增预览按钮，图片文件弹窗大图查看，非图片文件（PDF/Word等）调用系统默认程序打开

### 📄 文件
- 新增：`src/components/features/costLedger/printExport.ts` — 打印模板生成 + xlsx 导出
- 修改：`src/components/features/costLedger/CostLedgerList.tsx` — 工具栏新增打印/导出Excel按钮
- 修改：`src/components/features/costLedger/FileUploader.tsx` — 新增预览/打开按钮 + 图片弹窗预览

---

## [2.2.2] — 2026-05-11

### 🔧 修订
- 表格行悬停高亮统一：全站 16 处 `<tr>` 列表从硬编码 `hover:bg-slate-50` 替换为 `table-row-hover` CSS 类，通过 `var(--row-hover-opacity)` 自定义属性驱动
- 系统设置新增悬停强度调节：外观主题卡片新增滑块（10%-100%，步长 5），实时调节所有数据表格行悬停淡蓝高亮的透明度
- 新增 `useRowHoverOpacity` hook：读写 localStorage + 同步 CSS 变量到 `document.documentElement`，默认 60%
- 覆盖模块：成本台账、单位管理、操作日志、合同台账、图纸管理、用户管理、工资表/考勤/发放记录、发票/收付款、仓库物料/材料、结算办理/导入、项目详情、角色权限矩阵、通用 Table 组件

---

## [2.2.1] — 2026-05-11

### 🔧 修订
- 成本台账列表合计行固定底部：CostLedgerList 改用 flex 列布局替代 `h-full`（CSS 百分比高度在 flex item 内无法解析），CostLedgerTab/CostLedgerProjectDetail 包装层加 `flex flex-col` 传递 flex 链，表格区 `flex-1 overflow-auto` 自行滚动，合计行自然沉底
- 支出分类标签两行显示：CostLedgerAnalytics 饼图图例 `truncate` → `line-clamp-2`（外裹 `flex-1 min-w-0` 防 -webkit-box 塌缩）；CostLedgerList 分类列 `truncate` on td → `line-clamp-2` on inner span（避免 -webkit-box 覆盖 table-cell）
- Dashboard 支出分类柱状图 X 轴刻度两行显示：自定义 `CategoryTick` 组件，SVG `<tspan>` 拆分 >4 字分类名，`interval={0}` 强制全显示，`dy={6}` 文字置轴线下方，`bottom` margin 扩至 32

---

## [2.2.0] — 2026-05-11

### ✨ 次版本
- 成本台账金额列筛选精度修复：`Math.round` → `toFixed(2)`，保留分位精度（财务一分钱不能错），colValues.amounts 和 filter matching 两处同步修改
- 日期列筛选年月树形折叠：新增 `DateFilterTree.tsx` 组件（188 行），年→月→日三级层级，分组复选框三态（全选/部分选中的横线态/未选），折叠箭头，计数 badge；搜索时自动切平铺模式；快捷按钮（本月/近3月/本年）保留
- ColumnFilter.tsx 日期逻辑提取为 DateFilterTree，自身从 428→245 行通过 400 行硬上限

---

## [2.1.0] — 2026-05-11

### ✨ 次版本
- 成本台账筛选系统全面升级：7 列表头统一为搜索+勾选 Excel 风格（搜索框过滤→勾选筛选，全选/清除），替代旧的文本搜索/区间输入；ColumnFilter 重构为通用 CheckMeta 模式（resolveCheckMeta 统一 7 种列元数据）；分类筛选联动一级/二级切换按钮；备注列补筛选项；Dashboard/ProjectDetail 英文标签修复

---

## [2.0.0] — 2026-05-11

### 🚀 主版本
- 成本台账一二级分类全面重构：支出 5 组 18 码（业务费/直接工程费/现场管理费/对公服务及前期投入费/财务及其他费）+ 收入 4 组 7 码（投资款/项目回款/退款/其他收入）；CATEGORY_HIERARCHY 新增 direction 字段；CategoryPicker 从扁平下拉→一级→二级联动选择器；CategoryManager 重写为双级管理 UI（一级分组卡片+二级子项列表+新建/编辑/删除）；CostLedgerList 筛选下拉按一级分组 optgroup 显示；CostLedgerCategory 类型新增 level1? 字段；getLevel1Groups(direction)/getLevel1GroupsMerged(categories,direction) 方向感知；getLevel1ForCode 优先 DB level1→回退 hierarchy；ensureCategories() 自动迁移旧扁平分类到新层级


## [1.21.3] — 2026-05-11

### ✨ 新增
- **成本台账分类列二级/一级切换**：新增 `CATEGORY_HIERARCHY` 常量（18 个二级分类→5 个一级分组），表格工具栏新增「二级 | 一级」分段按钮，切换后分类列显示对应层级标签，一级模式带彩色圆点区分分组。localStorage 持久化偏好。收入分类与用户自定义分类不受影响

## [1.21.2] — 2026-05-11

### 🔧 修订
- **版本自动迭代系统加固**：PreToolUse hook 确保在 neat-freak 清理前读取 CLAUDE.md 最新内容，bump-version.js 预检和正则匹配更可靠
- **版本号全局同步**：修复 6 处版本引用（Sidebar/Login/Settings/CLAUDE/CHANGELOG/package.json）不一致，全部统一为 v1.21.2
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
