# FRONTEND-GATING-MATRIX.md — G2 端点前端门控盘点（窗口 G2 产出）

> 生成：2026-08-06 · HEAD：6747f11（工作区仅 check-backend-rules.cjs 既有未提交改动）· 提取方式：9 个并行 Explore agent 本地 grep（tauri-bridge.ts URL → 方法名 → 业务调用点 → UI 入口），关键行号已抽查复核
> 哨兵：**入口提取总数 68 ≥ 60 ✓**（70 个 G2 path 中 68 个找到前端写入口，4 个无 UI 入口——见 §3）
> 状态：G2-1 完成 · G2-2 待拍板。本文为**批次执行状态真源**：每批完成后更新 §5 状态列。

## 0. 数字勘误（相对任务书锚点「84 个 G2 端点」）

- 任务书锚点声称 84，实测（2026-08-06 展开脚本，口径与门禁5 完全一致：先判合规再查豁免）：**G2 豁免 = 70 条 path 条目（array.length），展开为 90 个端点实例**，其中 20 条 path 覆盖 POST+PUT（或 PUT+DELETE）双端点、50 条单端点。
- 拍板确认：「G2 84」为端点级算术值，门禁5 清单口径为 **70 path（约 20 条 path 各覆盖 POST+PUT 两端点）**；执行以展开后端点集（90 实例）为准，同 path 双端点必须同批完成后方可删该条豁免。
- 交叉验证：git 历史中 check-write-permission.cjs 的 G2 条目数 66（11ebd1b）→ 67（defd73d）→ 70（9e04445）；C 窗口矩阵 §6.4 的「79/84」均为手算数，无法复现。
- 已合规不计入展开的 4 个实例：PUT contracts/income·expense·agreement（C-4 已加 contracts:update）、DELETE /api/projects/{id}（C-4 已加 projects:delete）——门禁5 判定 compliant，不查豁免。
- 执行单位 = 90 端点实例 + B1 特任务 POST /api/snapshots（从设计豁免转 settings:update，共 91 实例覆盖 71 path）。

## 1. 门控惯用法结论（G2-0 抽样）

- **多数派 = `can()` hook**：全项目 16 处 `can('...')` 调用点（非测试）vs RequirePermission 组件仅 3 个文件使用（App.tsx 路由级、ReportsIndex、ProjectAuthorizationsTab）。
- 既有风格二型并存：
  - 按钮渲染条件：`{can('code') && <Button/>}`（ProjectFilters.tsx:61,66；ContractPage.tsx:273）
  - handler 守卫：`if (!can('code')) { showToast('...', 'error'); return }`（ContractPage.tsx:99,111,124；useSettlementHandlers.ts:103,127；useInventoryPage.ts:75,124）
- **本轮拟用形式**：跟随页面既有风格；无既有风格页面默认**隐藏**（`{can('code') && <入口/>}`），handler 首行加守卫双保险。与后端 HasPermission 同批落地，杜绝「同一事实两处各写一份」。

## 2. 端点 → 前端入口全景（70 path，按模块分组）

### 2.1 settings 系（6 G2 path + 2 特任务端点）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/snapshots/{id} DELETE | settings:update | SnapshotsTab.tsx:78,162 | 「删除快照」行按钮（handleDelete，经 useConfirm） | 父容器 DataStorageSection.tsx:46 admin && | can('settings:update') && 渲染（父容器 admin 门控可保留/收紧） |
| /api/config/gpu-acceleration PUT | settings:update | GpuToggle.tsx:22（DevToolsSection.tsx:24-29） | 「GPU 硬件加速」开关 toggle | 无 | 开关禁用或隐藏 + toggle 守卫 |
| /api/backup POST | settings:update | **无 UI 入口**（backupDatabase 零调用，tauri-bridge.ts:419） | — | — | 后端加码即可 |
| /api/sqlite/read-mode PUT | settings:update | useSqliteSettings.ts:108 → SettingsSqliteSection.tsx:114-122 | 「选择读取模式」三档切换（handleSetReadMode） | 无 | 切换禁用 + handler 守卫 |
| /api/templates POST,PUT | settings:update | Templates.tsx:95,100,139-140 | 「新建/编辑模板」表单提交（handleSubmit） | 无 | 入口按钮 can && + handler 守卫 |
| /api/templates/{id} DELETE | settings:update | Templates.tsx:79 | 「删除模板」按钮（handleDelete，经 useConfirm） | 无 | 行按钮 can && + handler 守卫 |
| /api/snapshots POST（特任务） | settings:update | SnapshotsTab.tsx:43,188 | 「手动创建备份」按钮（handleCreate） | 父容器 admin && | can('settings:update') && 渲染 |
| /api/audit/logs POST（特任务 O1） | 豁免（审计写入） | utils/audit.ts:197 logAudit（fire-and-forget，无独立按钮） | 统一审计写入口 | 无 | 本轮仅改 JWT 派生，不加码不删豁免 |

### 2.2 wages+attendances+salary-history 系（18 path）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/attendances POST | wages:create | hr/useStaffAttendanceActions.ts:47,107；AttendanceDetail.tsx:154（PUT 另见下行） | 「生成默认考勤」按钮；点历史月份自动建档 | 无 | 按钮 can && + handler 守卫 |
| /api/attendances PUT | wages:update | AttendanceDetail.tsx:154；hr/AttendanceTimeline.tsx:119 | 考勤详情「保存」；点月份自动补全 | 无 | 保存按钮 can && + 守卫 |
| /api/attendances/{id} DELETE | wages:delete | AttendanceDetail.tsx:186；hr/useStaffAttendanceActions.ts:60；wages/useWageActions.ts:66；useWageAttendance.ts:49 | 各处考勤行删除按钮 | 无 | 行按钮 can && + 守卫 |
| /api/attendances/batch-delete POST | wages:delete | hr/useStaffAttendanceActions.ts:71；wages/useWageActions.ts:75；useWageManagement.ts:56 | 「删除选中 (N)」按钮 ×3 处 | 无 | 批量按钮 can && + 守卫 |
| /api/attendances/batch-create POST | wages:create | **无 UI 入口**（batchCreateAttendances 仅 mock） | — | — | 后端加码即可 |
| /api/attendances/generate POST | wages:create | **无 UI 入口**（V1 零调用，前端统一走 generate-v2） | — | — | 后端加码即可 |
| /api/attendances/generate-v2 POST | wages:create | wages/useWageActions.ts:53；useWageAttendance.ts:34 | 「生成默认考勤」按钮（worker 模式 + 工资管理页） | 无 | 按钮 can && + 守卫 |
| /api/attendances/batch-import POST | wages:create | WageManagement.tsx:82；wages/useWageActions.ts:83 | 「导入考勤」按钮（CSV） | 无 | 按钮 can && + 守卫 |
| /api/wages POST | wages:create | payroll/PayrollPage.tsx:91,192；hr/StaffPayroll.tsx:117 | 「生成薪酬」（逐人 create） | 无 | 按钮 can && + 守卫 |
| /api/wages PUT | wages:update | payroll/PayrollTable.tsx:50；PayrollPage.tsx:90；hr/StaffPayroll.tsx:115,196 | 实发字段内联编辑；生成薪酬更新已有记录 | 无 | 编辑触发守卫（内联编辑处） |
| /api/wages/{id} DELETE | wages:delete | payroll/PayrollTable.tsx:46；PayrollPage.tsx:116；hr/StaffPayroll.tsx:135 | 薪酬行删除按钮 / 「删除本月」 | 无 | 行按钮 can && + 守卫 |
| /api/wages/batch-delete POST | wages:delete | wages/useWageActions.ts:119；useWageManagement.ts:72；hr/StaffPayroll.tsx:186 | 「删除选中 (N)」按钮 ×3 | 无 | 批量按钮 can && + 守卫 |
| /api/wages/batch-clear-payments POST | wages:update | wages/useWageActions.ts:157；useWagePaymentOps.ts:23 | 发放记录「删除选中」清除发放 | 无 | 批量按钮 can && + 守卫 |
| /api/wages/archive POST | wages:update | useWagePaymentOps.ts:42；wages/useWageActions.ts:167 | 「归档」按钮（⚠️ 调 batchArchivePayments，bridge 无此方法，见 §4 观察 A） | 无 | 按钮 can && + 守卫 |
| /api/wages/batch-unarchive POST | wages:update | **无 UI 入口**（bridge 注释「前端 UI 未接」） | — | — | 后端加码即可 |
| /api/wages/batch-save POST | wages:update | wages/useWageActions.ts:110；useWageTable.ts:56 | 「保存修改 (N)」按钮 | 无 | 批量按钮 can && + 守卫 |
| /api/wages/batch-payment POST | wages:update | wages/useWageActions.ts:148；useWagePaymentOps.ts:74 | 「保存发放 (N)」按钮（handleSavePayments） | 无 | 批量按钮 can && + 守卫 |
| /api/wages/generate POST | wages:create | wages/useWageActions.ts:93；useWageTable.ts:35 | 「生成工资表」按钮 | 无 | 按钮 can && + 守卫 |
| /api/salary-history POST | wages:create | hr/SalaryHistoryModal.tsx:55；hr/useStaffFormActions.ts:120 | 薪资历史弹窗「新增/保存」；人员表单保存同步建档 | 无 | 弹窗按钮 can && + 守卫 |
| /api/salary-history/{id} DELETE | wages:delete | hr/SalaryHistoryModal.tsx:52,95；hr/useStaffFormActions.ts:119 | 薪资记录「删除」；编辑保存替换旧记录 | 无 | 行按钮 can && + 守卫 |

### 2.3 contracts+settlements+contract-templates 系（8 path）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/contracts/income POST | contracts:create | ContractPage.tsx:279-282「新增合同」按钮 → ContractFormModal.tsx:114 handleSubmit | 新增收入合同 | 页有 can('contracts:update/delete/export')，无 create | 按钮 can('contracts:create') && + handleSubmit 守卫 |
| /api/contracts/expense POST | contracts:create | 同上（ContractDashboard.tsx:235-241 入口） | 新增支出合同 | 同上 | 同上 |
| /api/contracts/agreement POST | contracts:create | 同上（ContractDashboard.tsx:80 入口） | 新增协议合同 | 同上 | 同上 |
| /api/contract-templates POST,PUT | contracts:update | ContractTemplates.tsx:59-81,68,70（表单提交，入口 :182-184/:249-254） | 模板「添加/编辑」 | 无 | 入口按钮 can && + handleSubmit 守卫 |
| /api/contract-templates/{id} DELETE | contracts:update | ContractTemplates.tsx:94-107,98（:255-260 删除按钮） | 模板「删除」 | 无 | 行按钮 can && + 守卫 |
| /api/settlements POST,PUT | settlement:create/update | SettlementProjectDetail.tsx:81-87 新建按钮 → SettlementForm → useSettlementHandlers.ts:84(create)/:78(update)；SettlementList.tsx:105-109 编辑 | 新建/编辑结算单 | useSettlementHandlers 有 delete/approve 门控，submit 无 | handleSubmit 守卫（create→settlement:create，update→settlement:update） |
| /api/settlements/{id}/unarchive PUT | settlement:update | SettlementList.tsx:98-104 → useSettlementHandlers.ts:146 handleUnarchive | 「取消归档」行按钮 | 无 | 行按钮 can && + 守卫 |
| /api/contracts/save-file POST | contracts:update | ContractFormModal.tsx:98（handleSubmit 内，选附件时先传文件） | 合同附件上传（随表单提交） | 无 | 随 contracts:create/update 门控自然覆盖 |

### 2.4 invoices+payment-records 系（5 path）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/invoices POST,PUT | invoices:create/update | Invoices.tsx:53-55「新建发票」→ InvoiceForm.tsx:134 提交 → useInvoicePage.invoice.ts:54(create)/:51(update) | 发票新建/编辑表单 | 无（整页零门控） | 入口按钮 can && + handleSubmit 守卫 |
| /api/invoices/{id} DELETE | invoices:delete | features/invoices/InvoiceList.tsx:188-191 → Invoices.tsx:89 → useInvoicePage.invoice.ts:70 | 「删除」行按钮（另 Invoices.tsx:170-178 重复发票弹窗删除） | 无 | 行按钮 can && + 守卫 |
| /api/invoices/{id}/status PUT | invoices:update | features/invoices/InvoiceList.tsx:139-144 状态 select → useInvoicePage.invoice.ts:78 | 状态切换 | 无 | select 禁用 + 守卫 |
| /api/payment-records POST,PUT | invoices:create/update | Invoices.tsx:50-52「回款/付款登记」→ PaymentForm.tsx:78 提交 → useInvoicePage.payment.ts:54/51 | 收付款登记表单 | 无 | 入口按钮 can && + handleSubmit 守卫 |
| /api/payment-records/{id} DELETE | invoices:delete | features/invoices/PaymentList.tsx:136-139 → Invoices.tsx:93 → useInvoicePage.payment.ts:69 | 「删除」行按钮 | 无 | 行按钮 can && + 守卫 |

### 2.5 members+workers+project-workers+departments+worker-teams 系（11 path）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/members POST,PUT | members:create/update | hr/useStaffFormActions.ts:109/108（StaffList.tsx:177 新增人员按钮）；hr/StaffList.tsx:114 状态切换；hr/BatchDeptAssignModal.tsx:30；hr/SalaryHistoryModal.tsx:60,103；members/useMemberOperations.ts:71,164；labor/hooks/useLaborOperations.ts:270,290,310 | 员工新增/编辑/状态/批量分配/离场返场 | 无 | 各 handler 首行守卫 + 主要入口按钮 can && |
| /api/members/{id} DELETE | members:delete | members/useMemberOperations.ts:31（Members.tsx:95,111,203 删除按钮）；hr/staffListColumns.tsx:70 | 人员/农民工删除 | 无 | 行按钮 can && + 守卫 |
| /api/workers POST,PUT | members:create/update | members/useMemberOperations.ts:85,174（Members.tsx:178,192/LaborManagement.tsx:206,219 表单保存）；useWorkerImport.ts:473,460（Excel 导入） | 工人建档/编辑/导入 | 无 | handler 守卫 + 入口按钮 can && |
| /api/workers/{id} DELETE | members:delete | labor/hooks/useLaborOperations.ts:158（LaborWorkerList.tsx:143 删除按钮） | 工人删除 | 无 | 行按钮 can && + 守卫 |
| /api/project-workers POST,PUT | members:create/update | members/useMemberOperations.ts:101,182（MemberForm 同步建档）；labor/hooks/useLaborOperations.ts:187,215,238（TeamWorkerModal 编辑/调组/调动） | 项目工人建档/编辑/调组 | 无 | handler 守卫 |
| /api/project-workers/{id} DELETE | members:delete | labor/hooks/useLaborOperations.ts:201（TeamWorkerModal.tsx:66 移除按钮） | 移除项目工人 | 无 | 行按钮 can && + 守卫 |
| /api/project-workers/batch POST | members:create | labor/hooks/useLaborOperations.ts:173（WorkerPickerModal.tsx:188 确认添加按钮）；useMembersBatch.ts:15 | 批量添加 N 人 | 无 | 按钮 can && + 守卫 |
| /api/departments POST,PUT | members:create/update | useDepartments.ts:23,29（hr/DepartmentManager.tsx:60-66,98,115） | 部门新建/编辑 | 无 | handler 守卫 + 按钮 can && |
| /api/departments/{id} DELETE | members:delete | useDepartments.ts:35（hr/DepartmentManager.tsx:84,99） | 部门删除 | 无 | 行按钮 can && + 守卫 |
| /api/worker-teams POST,PUT | members:create/update | members/useTeamOps.ts:14,22（labor/LaborTeamManager.tsx:73-88,106-112；WorkerSection.tsx:159-160） | 班组新建/编辑 | 无 | handler 守卫 + 按钮 can && |
| /api/worker-teams/{id} DELETE | members:delete | members/useTeamOps.ts:31（LaborTeamManager.tsx:135 删除；WorkerSection.tsx:122） | 班组删除 | 无 | 行按钮 can && + 守卫 |

### 2.6 partners+supervisors 系（4 path）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/partners POST,PUT | partners:create/update | Partners.tsx:120 添加按钮 → PartnerForm.tsx:121 提交 → usePartnerActions.ts:75(create)/:72(update)；PartnerList.tsx:109 编辑 | 合作单位新建/编辑 | 无（整页零门控） | 入口按钮 can && + handleSubmit 守卫 |
| /api/partners/{id} DELETE | partners:delete | PartnerList.tsx:115 → Partners.tsx:153 → usePartnerActions.ts:110 | 「删除」行按钮（经 confirm） | 无 | 行按钮 can && + 守卫 |
| /api/supervisors POST,PUT | partners:create/update | Partners.tsx:120 添加监管单位按钮 → SupervisorForm.tsx:65 提交 → usePartnerActions.ts:127(create)/:124(update)；SupervisorList.tsx:157 编辑 | 监管单位新建/编辑 | 无 | 同上 |
| /api/supervisors/{id} DELETE | partners:delete | SupervisorList.tsx:163 → Partners.tsx:183 → usePartnerActions.ts:145 | 「删除」行按钮（经 confirm） | 无 | 行按钮 can && + 守卫 |

### 2.7 projects+project-members 系（3 path）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/projects/{id} PUT | projects:update | Projects.tsx:54 handleSubmit 编辑分支（ProjectForm.tsx:132-133 保存按钮） | 编辑项目弹窗提交 | 页有 can('projects:delete')(:43)/can('projects:export')(:67)；**无 projects:update** | 编辑按钮 can && + handleSubmit 守卫 |
| /api/project-members POST | projects:update | features/projects/MembersTab.tsx:60 handleAdd（:111 添加成员按钮；:79 confirmTransfer 调离） | 添加成员/确认调离 | 无 | 按钮 can && + 守卫 |
| /api/project-members/{id} DELETE | projects:update | features/projects/MembersTab.tsx:143（:141-145 删除按钮） | 移除项目成员 | 无 | 行按钮 can && + 守卫 |

### 2.8 inventory+materials+transactions+drawings 系（5 path）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/inventory POST,PUT | inventory:create/update | useInventoryPage.ts:62 handleItemSubmit（ItemFormModal，Inventory.tsx:48-50 添加物料按钮） | 物料项新建/编辑 | 仅 can('inventory:delete')(:75) | handler 守卫 + 入口按钮 can && |
| /api/materials POST,PUT | inventory:create/update | useInventoryPage.ts:111/108 handleMaterialSubmit（MaterialFormModal，Inventory.tsx:42-44 添加项目材料） | 项目材料新建/编辑 | 仅 can('inventory:delete')(:124) | handler 守卫 + 入口按钮 can && |
| /api/inventory/transactions POST | inventory:create | useInventoryPage.ts:93 handleTransSubmit（TransactionFormModal，Inventory.tsx:45-47 出入库按钮） | 出入库登记（⚠️ :96 出库时隐性调 updateInventoryItem） | 无 | handler 守卫 + 入口按钮 can && |
| /api/drawings POST,PUT | drawings:create/update | Drawings.tsx:132/99 handleSubmit（:273-282 上传图纸按钮；:175 handleEdit） | 图纸上传/编辑 | 无（整页零门控） | 入口按钮 can && + handleSubmit 守卫 |
| /api/drawings/{id} DELETE | drawings:delete | Drawings.tsx:193 handleDelete（:227/:331 删除触发，经 useConfirm） | 图纸删除 | 无 | 行按钮 can && + 守卫 |

### 2.9 cost-ledger 系（10 path）

| path | 目标码 | 前端入口（文件:行号） | 入口描述 | 现状门控 | 拟用门控 |
|------|--------|----------------------|----------|----------|----------|
| /api/cost-ledger POST,PUT | costLedger:create/update | CostLedgerProjectDetail.tsx:121(create)/:108(update) handleSave（:211 新增台账按钮；CostLedgerForm.tsx:93 提交）；CostLedgerGrid.tsx:133 单元格内联编辑 | 台账新建/编辑/内联编辑 | 无（仅侧边栏路由级） | handler 守卫 + 入口按钮 can && |
| /api/cost-ledger/{id} DELETE | costLedger:delete | CostLedgerProjectDetail.tsx:136（CostLedgerList 行删除）；CostLedgerGrid.tsx:86 | 台账行删除 | 无 | 行按钮 can && + 守卫 |
| /api/cost-ledger/batch POST | costLedger:create | importComponents/importLogic.ts:103（CostLedgerImportModal.tsx:157 导入按钮 :233-235） | Excel 批量导入 | 无 | 导入按钮 can && + 守卫 |
| /api/cost-ledger/categories POST,PUT | costLedger:update | CategoryManager.tsx:123/138(create)/63/88(update)（:221-226 新建分类按钮） | 分类新建/编辑 | 无 | handler 守卫 + 按钮 can && |
| /api/cost-ledger/categories/{id} DELETE | costLedger:update | CategoryManager.tsx:102/113（带 useConfirm） | 分类删除 | 无 | 行按钮 can && + 守卫 |
| /api/cost-ledger/batches POST | costLedger:create | useCostLedgerBatches.ts:22 ← CostLedgerBatchBar.tsx:25-34（:94-96 新建版本按钮） | 新建版本 | 无 | 按钮 can && + 守卫 |
| /api/cost-ledger/batches/{id} PUT,DELETE | costLedger:update/delete | useCostLedgerBatches.ts:52/32 ← CostLedgerBatchBar.tsx:47,53（重命名）/ :124-127（删除，:132 图标） | 版本重命名/删除 | 无 | handler 守卫 + 按钮 can && |
| /api/cost-ledger/batches/{id}/copy POST | costLedger:create | useCostLedgerBatches.ts:42 ← CostLedgerBatchBar.tsx:109-116 | 「复制版本」按钮 | 无 | 按钮 can && + 守卫 |
| /api/cost-ledger/match-rules POST | costLedger:update | LearningRulesView.tsx:16/24（:44 规则删除、:51-53 清空）；importLogic.ts:89、importHelpers.ts:44（学习合并，隐式写入） | 学习规则删除/清空/自动学习（⚠️ 调 saveCostLedgerMatchRules 复数，bridge 无此方法，见 §4 观察 B） | 无 | handler 守卫 |
| /api/cost-ledger/{batchId}/sheet POST | costLedger:update | CostLedgerSpreadsheet.tsx:85-88 handleSave（直接 apiClient.post，无 bridge 封装；:160-166 保存按钮） | 电子表格保存 | 无 | 保存按钮 can && + 守卫 |

## 3. 无 UI 入口（4 个，后端加码即可，无前端突变）

| path | 目标码 | 说明 |
|------|--------|------|
| /api/backup POST | settings:update | backupDatabase（tauri-bridge.ts:419）全项目零调用 |
| /api/attendances/batch-create POST | wages:create | batchCreateAttendances 仅 api-adapter mock，业务零调用 |
| /api/attendances/generate POST | wages:create | V1 零调用，前端统一走 generate-v2 |
| /api/wages/batch-unarchive POST | wages:update | bridge 注释明确「前端 UI 未接」 |

## 4. 附加发现（记录，不在本轮修复范围）

- **A（wages:archive 桥接断裂）**：「归档」按钮（useWagePaymentOps.ts:42、wages/useWageActions.ts:167）调用 `batchArchivePayments`，但 tauri-bridge.ts 无此方法（仅 electron.d.ts:1169 类型声明，实际命名 archiveWages/batchArchiveWages）→ 运行时 TypeError。加门控时顺带修调用点方法名（同批，属接线修复）。
- **B（match-rules 桥接断裂）**：cost-ledger 学习规则调用 `saveCostLedgerMatchRules`（复数），bridge 定义 `saveCostLedgerMatchRule`（单数）→ 运行时 undefined。同理顺带修正。
- **C（签名不一致）**：多个调用点签名与 bridge 定义不符（如 PayrollPage.tsx:90 `updateWage(existing.id, record)`；costLedger `updateCostLedger(id, data)`）——桥接层可能按参数个数做了重载，执行批次时以实际编译/运行验证为准。
- **D（死代码链）**：SettlementProjectActions.tsx（useSettlementActions 全仓无导入）；useInvoices.ts / usePaymentRecords.ts / usePartnersHelpers.ts / useRegionsAndSupervisors.ts / useWorkerTeamsActions.ts 等 hook 均无组件消费——门控只加在活路径，死代码不动。
- **E（invoices 页面零门控）**：Invoices.tsx 及其整条调用链无任何权限门控，是 B4 批次的重点补码页。

## 5. 批次执行状态（真源，每批完成更新）

| 批次 | 模块 | path 数 | 状态 |
|------|------|---------|------|
| B1 | settings 系 + O1 + 快照/备份 + 0 警告固化 | 6+2 | ✅ 完成（fd98d97） |
| B2 | wages+attendances+salary-history 系 + O3 + generate-v2 归属 | 18 | ✅ 完成（cc41919）；PUT /api/wages 收窄已落地（H-2，D-9 关闭：SET 工资列 only + 已发款/已归档守卫，付款走 batch-payment/batch-clear-payments） |
| B3 | contracts+settlements+contract-templates 系 | 8 | ✅ 完成（9993c94） |
| B4 | invoices+payment-records 系 | 5 | ✅ 完成（589160f） |
| B5 | members+workers+project-workers+departments+worker-teams 系 | 11 | ✅ 完成（db0088e） |
| B6 | partners+supervisors 系 | 4 | ✅ 完成（981793b） |
| B7 | projects+project-members 系 | 3 | ✅ 完成（ede9b14） |
| B8 | inventory+materials+transactions+drawings 系 | 5 | ✅ 完成（d1433a2） |
| B9 | cost-ledger 全家 | 10 | ✅ 完成（fe6b395） |
| 合计 | | 70 | ✅ **G2 豁免清零**（EXEMPT 剩 39 = 白名单/STUB/用户自助/基础设施） |

## 6. 执行总结（G2 收官）

- **90 端点实例全部加码**（70 path，含 20 条双方法 path 同批完成）；门禁5 合规 39 → 130，0 违反。
- 后端测试累计 +96（WritePermissionB1-B9）；前端门控测试 +9（B1 SnapshotsTab ×4、B2 WageActions ×5）；全量 814 通过 / 2 跳过。
- 既有 bug 修复 6 处（被测试暴露，均为匿名参数对象缺参导致生产路径必 500）：
  audit_logs 列名 resource_type→resource（7 处引用）、PUT members/workers 缺 Now、
  project-members INSERT 缺 Now、cost-ledger batches/copy INSERT 缺 CreatedBy；
  前端桥接断链 2 处（batchArchivePayments→batchArchiveWages、saveCostLedgerMatchRules→saveCostLedgerMatchRule）。
- 测试基建：G2EnvIsolatedCollection 串行化 env 隔离测试类（B1/B3/B8 数据路径隔离，防并行污染）。
- 角色 id 漂移记录：001 种子是 finance，GetDefaultPermissions/037 用 accountant——C 窗口已知范围外，测试补建角色行。
- 遗留：SettlementProjectActions 等死代码链未动。
