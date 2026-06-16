# 工程管家 — 前端 `any` 类型清理 & 代码质量提升执行计划

> **目标**：将 src/ 生产代码中的 `any` 类型替换为精确类型，同时清理调试日志、补齐后端异常处理  
> **原则**：纯类型层面改动，不改运行时行为，每批次改完跑 build 验证  
> **类型定义来源**：`src/types/electron.d.ts`（60+ 个 interface/type，已完整定义所有实体）

---

## 执行前必读

### 项目启动
```bash
cd EngineeringManager.Api && dotnet run   # C# API + WebView2 窗口
```

### 验证命令
```bash
npx vite build          # 前端类型检查 + 构建（约 5-10 秒）
dotnet build            # 后端编译检查（约 1.2 秒）
```

### 关键文件
| 文件 | 作用 |
|------|------|
| `src/types/electron.d.ts` | 所有实体类型定义（Project, Member, Invoice, WageRecord 等 60+） |
| `src/types/guards.ts` | 类型守卫函数 |
| `src/types/index.ts` | 类型统一导出入口 |
| `src/services/api-methods.ts` | 前端 API 桥接层（~270 行，几乎全 any） |
| `src/services/tauri-bridge.ts` | 前端 API 桥接层（与 api-methods.ts 近乎重复） |

### 类型对应关系速查
| API 方法名 | 对应实体类型 |
|-----------|-------------|
| `createProject` / `updateProject` | `Project` |
| `createMember` / `updateMember` | `Member` |
| `createWorker` / `updateWorker` | `Worker` |
| `createProjectWorker` / `updateProjectWorker` | `ProjectWorker` |
| `createPartner` / `updatePartner` | `Partner` |
| `createInvoice` / `updateInvoice` | `Invoice` |
| `createIncomeContract` / `updateIncomeContract` | `IncomeContract` |
| `createExpenseContract` / `updateExpenseContract` | `ExpenseContract` |
| `createAgreementContract` / `updateAgreementContract` | `AgreementContract` |
| `createSettlement` / `updateSettlement` | `Settlement` |
| `createCostLedger` / `updateCostLedger` | `CostLedgerEntry` |
| `createCostLedgerBatch` | `CostLedgerBatch` |
| `createCostLedgerCategory` / `updateCostLedgerCategory` | `CostLedgerCategory` |
| `createAttendance` / `updateAttendance` | `AttendanceRecord` |
| `createWage` / `updateWage` | `WageRecord` |
| `createDepartment` / `updateDepartment` | `Department` |
| `createTemplate` / `updateTemplate` | `Template` |
| `createContractTemplate` / `updateContractTemplate` | `ContractTemplate` |
| `createPaymentRecord` / `updatePaymentRecord` | `PaymentRecord` |
| `createRegion` | `Region` |
| `createSupervisor` / `updateSupervisor` | `Supervisor` |
| `createWorkerTeam` / `updateWorkerTeam` | `WorkerTeam` |
| `createSalaryHistory` | `SalaryHistoryEntry` |
| `createUser` / `updateUser` | `UserInfo` |
| `createInventoryItem` / `updateInventoryItem` | `InventoryItem` |
| `createInventoryTransaction` | `InventoryTransaction` |
| `createMaterial` / `updateMaterial` | `Material` |
| `createExpense` / `updateExpense` | `Expense` |
| `uploadDrawing` / `updateDrawing` | `Drawing` |
| `auditLog` | `AuditLogEntry` |

---

## Phase 1: 热身 — C# 异常处理标准化 + console.log 清理

**目的**：快速跑通"改完→验证"流程，风险极低

### 1.1 C# 异常处理补齐

**检查范围**：`EngineeringManager.Api/Endpoints/*.cs`（23 个文件）

**标准模板**：每个 `catch (Exception ex)` 块必须包含：
```csharp
catch (Exception ex)
{
    Console.Error.WriteLine($"[ERROR] {EndpointName}.{MethodName}: {ex.Message}");
    return Common.ServerError("{MethodName}", ex);
}
```

**已知需要补齐的文件**：
- `FileEndpoints.cs` — 6 处 catch 只有 `Common.Fail(ex.Message)` 无日志
- `SystemEndpoints.cs` — 部分 catch 无日志
- `ProjectEndpoints.cs` — 第 55 行 catch 为空

**操作**：
1. 用 grep 搜索所有 `catch (Exception ex)` 块
2. 检查每个是否已有 `Console.Error.WriteLine`
3. 没有的按上述模板补齐
4. 跑 `dotnet build` 验证

### 1.2 前端 console.log/debug 清理

**已知位置**（共 10 处）：

| 文件 | 行 | 内容 |
|------|-----|------|
| `src/components/Dashboard.tsx` | ~107 | `console.log('[Dashboard] expenseByCategory final:', ...)` |
| `src/components/Partners.tsx` | ~84 | `console.log('[PartnerSubmit] called, name:', ...)` |
| `src/components/Partners.tsx` | ~145 | `console.log('[PartnerSubmit] creating partner...')` |
| `src/components/Partners.tsx` | ~147 | `console.log('[PartnerSubmit] result:', ...)` |
| `src/components/Partners.tsx` | ~153 | `console.log('[PartnerSubmit] loadData...')` |
| `src/components/WageManagement.tsx` | ~385 | `console.debug('[bankReceipt]', ...)` |
| `src/components/ContractPage.tsx` | ~75 | `console.warn(...)` — 保留（这是有用的警告） |
| `src/components/features/projects/ProjectDetail.tsx` | ~67 | `console.warn(...)` — 保留 |
| `src/hooks/useInvoiceOCR.ts` | ~94,99 | `console.log('[发票OCR] ...')` — 2 处 |

**操作**：删除所有生产调试日志（保留 `console.warn` 和 `console.error`）

### 完成标准
- [ ] `dotnet build` 无错误
- [ ] `vite build` 无错误
- [ ] grep `console.log` 生产代码无结果（测试文件除外）

---

## Phase 2: API 层类型化（api-methods.ts + tauri-bridge.ts）

**目的**：为最底层的 API 调用加上精确类型，上层所有调用方自动受益

### 2.1 确认运行时使用哪个文件

**操作**：
1. 搜索 `import.*api-methods` 和 `import.*tauri-bridge` 在 src/ 下的引用
2. 确认哪个文件被实际使用（或两个都用）
3. 只改被实际引用的文件

### 2.2 类型替换

**规则**：每个 `createXxx(data: any)` → `createXxx(data: Partial<XxxType>)`  
每个 `updateXxx(data: any)` → `updateXxx(data: Partial<XxxType>)`  
每个 `updateXxx(id: number, updates: any)` → `updateXxx(id: number, updates: Partial<XxxType>)`

**完整替换清单**（按文件中的出现顺序）：

```
api-methods.ts / tauri-bridge.ts 中的 any 参数：
─────────────────────────────────────────────────────
createUser(user: any)                    → UserInfo
authCreateUser(user: any)                → UserInfo
updateUser(user: any)                    → UserInfo
authUpdateUser(user: any)                → UserInfo
createProject(project: any)              → Partial<Project>
updateProject(project: any)              → Partial<Project>
createMember(member: any)                → Partial<Member>
updateMember(member: any)                → Partial<Member>
createWorker(worker: any)                → Partial<Worker>
updateWorker(worker: any)                → Partial<Worker>
createProjectWorker(pw: any)             → Partial<ProjectWorker>
batchCreateProjectWorkers(pws: any[])    → Partial<ProjectWorker>[]
updateProjectWorker(pw: any)             → Partial<ProjectWorker>
createPartner(partner: any)              → Partial<Partner>
updatePartner(partner: any)              → Partial<Partner>
createInvoice(invoice: any)              → Partial<Invoice>
updateInvoice(invoice: any)              → Partial<Invoice>
createIncomeContract(contract: any)      → Partial<IncomeContract>
createExpenseContract(contract: any)      → Partial<ExpenseContract>
createContract(contract: any)            → Partial<AgreementContract>
updateIncomeContract(contract: any)      → Partial<IncomeContract>
updateExpenseContract(contract: any)     → Partial<ExpenseContract>
createSettlement(settlement: any)        → Partial<Settlement>
updateSettlement(settlement: any)        → Partial<Settlement>
createCostLedger(entry: any)             → Partial<CostLedgerEntry>
updateCostLedger(entry: any)             → Partial<CostLedgerEntry>
createCostLedgerCategory(category: any)  → Partial<CostLedgerCategory>
updateCostLedgerCategory(category: any)  → Partial<CostLedgerCategory>
batchCreateCostLedger(entries: any[])    → Partial<CostLedgerEntry>[]
createCostLedgerBatch(batch: any)        → Partial<CostLedgerBatch>
saveCostLedgerMatchRule(rule: any)       → Partial<CostLedgerMatchRule>
createAttendance(record: any)            → Partial<AttendanceRecord>
updateAttendance(record: any)            → Partial<AttendanceRecord>
batchCreateAttendances(records: any[])   → Partial<AttendanceRecord>[]
batchImportAttendances(projectId, ym, records: any[]) → Partial<AttendanceRecord>[]
createWage(record: any)                   → Partial<WageRecord>
updateWage(record: any)                   → Partial<WageRecord>
batchSaveWages(records: any[])           → Partial<WageRecord>[]
createSalaryHistory(entry: any)          → SalaryHistoryEntry
auditLog(entry: any)                     → AuditLogEntry
auditQuery(query: any)                   → AuditQueryParams
queryAuditLogs(query: any)               → AuditQueryParams
createDepartment(department: any)        → Partial<Department>
updateDepartment(id, updates: any)       → Partial<Department>
createTemplate(template: any)            → Partial<Template>
updateTemplate(template: any)            → Partial<Template>
createContractTemplate(template: any)   → Partial<ContractTemplate>
updateContractTemplate(id, updates: any) → Partial<ContractTemplate>
createPaymentRecord(record: any)         → Partial<PaymentRecord>
updatePaymentRecord(id, updates: any)    → Partial<PaymentRecord>
createRegion(region: any)                → Partial<Region>
createSupervisor(supervisor: any)        → Partial<Supervisor>
updateSupervisor(id, updates: any)       → Partial<Supervisor>
updateProjectMember(id, updates: any)    → Partial<ProjectMember>
createWorkerTeam(team: any)              → Partial<WorkerTeam>
updateWorkerTeam(id, updates: any)       → Partial<WorkerTeam>
uploadDrawing(drawing: any)              → Partial<Drawing>
updateDrawing(id, updates: any)          → Partial<Drawing>
createExpense(expense: any)              → Partial<Expense>
updateExpense(id, updates: any)          → Partial<Expense>
createInventoryItem(item: any)           → Partial<InventoryItem>
updateInventoryItem(id, updates: any)    → Partial<InventoryItem>
createInventoryTransaction(trans: any)   → Partial<InventoryTransaction>
createMaterial(material: any)            → Partial<Material>
updateMaterial(id, updates: any)         → Partial<Material>
saveFile(options: any)                   → FileSaveOptions
readFile(options: any)                   → FileReadOptions
deleteFile(options: any)                 → FileDeleteOptions
openFileExternal(options: any)           → FileOpenOptions
saveContractFile(options: any)           → ContractFileSaveOptions
ocrBaiduIdCard(imageBase64, config: any) → OcrConfig
ocrBaiduInvoice(imageBase64, config: any) → OcrConfig
ocrBaiduBankCard(imageBase64, config: any) → OcrConfig
ocrBaiduBusinessLicense(imageBase64, config: any) → OcrConfig
ocrBaiduBankReceipt(imageBase64, config: any) → OcrConfig
ocrBaiduPermit(imageBase64, config: any) → OcrConfig
ocrBaiduBankStatement(imageBase64, config: any) → OcrConfig
ocrBaiduGeneralReceipt(imageBase64, config: any) → OcrConfig
ocrBaiduCompanyQuery(companyName, config: any) → OcrConfig
```

**注意**：
- `Partial<Xxx>` 用于 create/update，因为新建时 id 可能不存在
- 如果 `electron.d.ts` 中缺少某个精确类型（如 `AuditLogEntry`、`OcrConfig` 等），**不要跳过**，直接查看该文件中最接近的接口，或者创建一个新 interface 放在 `src/types/` 下
- 需要在文件顶部添加 import：`import type { Project, Member, ... } from '../types/electron'`

### 完成标准
- [ ] 文件中不再有任何参数类型的 `any`（返回值的 `any` 可以暂不改）
- [ ] `vite build` 无类型错误

---

## Phase 3: 全量前端 `any` 类型精确化

**核心策略**：自底向上，先改 hooks（被所有组件依赖），再改组件

### 执行规则

1. **每改一个文件**，立即跑 `npx tsc --noEmit` 或 `vite build` 确认无新错误
2. **推断方法**：看代码中访问了哪些属性（如 `.memberType`、`.departmentId`），去 `electron.d.ts` 找包含这些属性的 interface
3. **如果不确定类型**：先标注 `// TODO: 确认类型` 并在文件顶部加 `import type { ... }`，不要留 `any`
4. **回调函数参数**：看父组件传下来的 props 类型定义
5. **useState 的初始值**：如果是空数组 `useState([])`，改为 `useState<XxxType[]>([])`

### 批次 A — Hooks 层（最优先）

**文件清单及要点**：

| 文件 | 主要 any 参数 | 目标类型 |
|------|-------------|---------|
| `src/hooks/useMembers.ts` | `(m: any)` 回调参数 | `Member` |
| `src/hooks/useInventoryPage.ts` | `handleItemSubmit(data: any)` | `Partial<InventoryItem>` |
| `src/hooks/useInventoryPage.ts` | `handleTransSubmit(data: any)` | `Partial<InventoryTransaction>` |
| `src/hooks/useInvoicePage.ts` | `handleSubmitInvoice(data: any)` | `Partial<Invoice>` |
| `src/hooks/useInvoicePage.ts` | `handleSubmitPayment(data: any)` | `Partial<PaymentRecord>` |
| `src/hooks/usePartners.ts` | `(item: any)` | `Partner` |
| `src/hooks/useProjects.ts` | `(p: any)` | `Project` |
| `src/hooks/useLaborOperations.ts` | `(formData: any)` | 对应表单数据类型 |
| `src/hooks/useLaborData.ts` | `(p: any)`, `(t: any)`, `(w: any)` | `Project`, `WorkerTeam`, `Worker` |
| `src/hooks/useLaborModals.ts` | 各种回调参数 | 对应实体类型 |
| `src/hooks/usePayrollData.ts` | `(m: any)`, `(w: any)`, `(p: any)` | `Member`, `WageRecord`, `Project` |
| `src/hooks/useWorkerImport.ts` | `createMember: (data: any) => ...` | `Partial<Member>` |
| `src/hooks/useMemberOperations.ts` | 各种回调 | 对应实体 |
| `src/hooks/useTeamOps.ts` | 各种回调 | 对应实体 |
| `src/hooks/useMemberPasteHandler.ts` | `(data: any)` | 对应实体 |
| `src/hooks/useBankReceiptBatch.ts` | `(matches: any[])` | `BankReceiptMatch[]` |
| `src/hooks/useCostLedgerBatches.ts` | `(batch: any)` | `CostLedgerBatch` |
| `src/hooks/useCostLedgerCategories.ts` | `(category: any)` | `CostLedgerCategory` |
| `src/hooks/useDepartments.ts` | `(dept: any)` | `Department` |
| `src/hooks/usePaymentRecords.ts` | `(record: any)` | `PaymentRecord` |
| `src/hooks/useWorkerTeams.ts` | `(team: any)` | `WorkerTeam` |

### 批次 B — Features 子组件（按模块逐个推进）

#### B1: features/hr/（约 12 个文件，最大的 any 集中区）

每个文件中的 `(m: any)` → `(m: Member)`，`(w: any)` → `(w: WageRecord)`，`(d: any)` → `(d: Department)`，`(a: any)` → `(a: AttendanceRecord)`，`(s: any)` → `(s: Member)`（staff），`(dept: any)` → `(dept: Department)`

**文件**：
- `HRDashboard.tsx`
- `StaffAttendance.tsx`（最大，~430 行，50+ 处 any）
- `StaffAttendanceRow.tsx`
- `StaffPayroll.tsx`
- `StaffPayrollRow.tsx`
- `StaffPayrollTable.tsx`
- `StaffList.tsx`
- `StaffListRow.tsx`
- `StaffFormModal.tsx`
- `DepartmentManager.tsx`
- `AttendanceTimeline.tsx`
- `SalaryHistoryModal.tsx`
- `BatchDeptAssignModal.tsx`
- `PositionEditor.tsx`

#### B2: features/costLedger/

`(d: any)` → `(d: CostLedgerEntry)`，`(inv: any)` → `(inv: Invoice)`，`(r: any)` → `(r: CostLedgerMatchRule)`

**文件**：
- `CostLedgerAnalytics.tsx`
- `CostLedgerForm.tsx`
- `CostLedgerImportModal.tsx`
- `CostLedgerList.tsx`
- `CostLedgerProjectDetail.tsx`
- `CostLedgerTab.tsx`
- `InvoiceLinker.tsx`
- `CategoryManager.tsx`
- `importComponents/importHelpers.ts`
- `importComponents/importLogic.ts`
- `importComponents/ImportMappingStep.tsx`

#### B3: features/labor/

`(m: any)` → `Member`，`(w: any)` → `Worker`/`Member`，`(t: any)` → `WorkerTeam`

**文件**：
- `LaborDashboard.tsx`
- `LaborWorkerList.tsx`
- `LaborWorkerRow.tsx`
- `LaborTeamManager.tsx`
- `LaborWorkerFilterPopup.tsx`
- `TeamWageModal.tsx`
- `WorkerWageModal.tsx`
- `WorkerWageHistoryModal.tsx`

#### B4: features/invoices/

`(record: any)` → `PaymentRecord`/`Invoice`，`(info: any)` → `InvoicePaymentDetail`

**文件**：
- `InvoiceForm.tsx`
- `InvoiceFilters.tsx`
- `InvoiceList.tsx`
- `InvoiceStats.tsx`
- `PaymentList.tsx`
- `PaymentStats.tsx`
- `PaymentForm.tsx`
- `PaymentFileUpload.tsx`
- `FilePreviewModal.tsx`
- `printExport.ts`
- `useInvoiceAmounts.ts`
- `useInvoiceFormOCR.ts`

#### B5: features/wages/

`(w: any)` → `WageRecord`，`(record: any)` → `WageRecord`/`BankReceiptMatch`

**文件**：
- `WageDetailTable.tsx`
- `WageDetailRow.tsx`
- `WageDetailTab.tsx`
- `WageDetailTable.tsx`
- `WageStatsTab.tsx`
- `WageSummaryTab.tsx`
- `WageTableTab.tsx`
- `WageProjectCard.tsx`
- `WageProjectList.tsx`
- `WageBatchViews.tsx`
- `WagePaymentRecords.tsx`
- `WageCycleDetail.tsx`
- `AttendanceTab.tsx`
- `AttendanceImportModal.tsx`
- `BankReceiptBatch.tsx`
- `BankReceiptMatchConfirm.tsx`
- `OverdueBanner.tsx`
- `FileImportDialog.tsx`
- `useWageActions.ts`

#### B6: features/members/

`(m: any)` → `Member`，`(w: any)` → `Worker`/`Member`

**文件**：
- `MemberCard.tsx`
- `MemberDetail.tsx`
- `MemberDetailParts.tsx`
- `MemberFilters.tsx`
- `MemberForm.tsx`
- `MemberFormLayout.tsx`
- `MemberList.tsx`
- `StaffForm.tsx`
- `StaffManagementTab.tsx`
- `WorkerForm.tsx`
- `WorkerImportModal.tsx`
- `WorkerPickerItem.tsx`
- `WorkerPickerModal.tsx`
- `WorkerPoolForm.tsx`
- `WorkerSection.tsx`
- `WorkerSectionModals.tsx`
- `TeamWorkerModal.tsx`
- `LeaveModal.tsx`
- `FormUploadWidgets.tsx`
- `useWorkerImport.ts`
- `useMemberOperations.ts`
- `useMemberPasteHandler.ts`
- `useTeamOps.ts`

#### B7: features/payroll/

**文件**：
- `PayrollPage.tsx`
- `usePayrollData.ts`

#### B8: features/settlement/

`(item: any)` → `SettlementItem`/`Settlement`

**文件**：
- `SettlementDashboard.tsx`
- `SettlementForm.tsx`
- `SettlementImportModal.tsx`
- `SettlementItemsTable.tsx`
- `SettlementList.tsx`
- `SettlementPrintTemplate.tsx`
- `SettlementProjectCard.tsx`
- `SettlementProjectDetail.tsx`

#### B9: features/contracts/

`(contract: any)` → `IncomeContract`/`ExpenseContract`/`AgreementContract`

**文件**：
- `ContractFormModal.tsx`
- `contractConfig.ts`

#### B10: features/templates/

`(template: any)` → `Template`

**文件**：
- `TemplateCard.tsx`
- `TemplateDashboard.tsx`
- `TemplateForm.tsx`
- `TemplateGenerate.tsx`
- `TemplateList.tsx`
- `TemplatePreview.tsx`
- `TemplateSelectorModal.tsx`

#### B11: features/partners/

`(partner: any)` → `Partner`，`(supervisor: any)` → `Supervisor`

**文件**：
- `PartnerForm.tsx`
- `PartnerList.tsx`
- `PartnerSelect.tsx`
- `PartnerFileUploadField.tsx`
- `FileDropZone.tsx`
- `SupervisorForm.tsx`
- `SupervisorList.tsx`
- `usePartnerFormOCR.ts`
- `useCompanyQuery.ts`

#### B12: features/projects/

`(item: any)` → 对应实体类型

**文件**：
- `ProjectCard.tsx`
- `ProjectDetail.tsx`
- `ProjectDetailTabs.tsx`
- `ProjectFilters.tsx`
- `ProjectForm.tsx`
- `ProjectList.tsx`
- `ProjectStats.tsx`
- `ProjectTimeline.tsx`
- `ProjectCommandCenter.tsx`
- `PortfolioAnalysis.tsx`
- `AlertBar.tsx`

### 批次 C — 顶层页面组件

| 文件 | 主要 any 类型 |
|------|-------------|
| `src/components/Members.tsx` | `(p: any)` → `Project`，`(t: any)` → `WorkerTransferRecord` |
| `src/components/Partners.tsx` | `(item: any)` → `Partner` |
| `src/components/Projects.tsx` | `(e: any)` → `Error` |
| `src/components/WageManagement.tsx` | `(error: any)` → `Error` |
| `src/components/ContractDashboard.tsx` | `(contract: any)` → `IncomeContract`/`ExpenseContract` |
| `src/components/ContractTemplates.tsx` | `(error: any)` → `Error` |
| `src/components/ContractTemplateFormModal.tsx` | `(d: any)` → 表单数据类型 |
| `src/components/Templates.tsx` | `(error: any)` → `Error` |
| `src/components/Users.tsx` | `(err: any)` → `Error`，`(updates: any)` → `Partial<UserInfo>` |
| `src/components/RolePermissionsTab.tsx` | `(e: any)` → `Error` |
| `src/components/Dashboard.tsx` | `(c: any)` → `CostLedgerCategory`，`(err: any)` → `Error` |
| `src/components/SnapshotsTab.tsx` | `(error: any)` → `Error` |
| `src/components/Settings.tsx` | `(e: any)` → `Error` |
| `src/components/Drawings.tsx` | `(error: any)` → `Error` |
| `src/components/AuditLogs.tsx` | `(e: any)` → `Error` |
| `src/components/AuditDetailModal.tsx` | `(value: any)` → `string | number | boolean | null` |
| `src/components/AuditFilterBar.tsx` | `(e: any)` → `Error` |
| `src/components/Login.tsx` | `(err: any)` → `Error` |
| `src/components/TitleBar.tsx` | `(event: any)` → `MouseEvent` |
| `src/components/StatusBar.tsx` | 检查是否有 any |

**注意**：`catch (e: any)` 中的 `e: any` 可以保留或改为 `catch (e: unknown)` + `e instanceof Error ? e.message : '未知错误'`，这是 TypeScript 推荐写法。

### 完成标准
- [ ] `src/components/` 和 `src/hooks/` 中非测试文件的参数 `any` 减少 90%+
- [ ] `vite build` 无类型错误
- [ ] 剩余的 `any` 仅出现在：catch 句柄、JSON.parse 返回值、第三方库回调等合理场景

---

## Phase 4: JSDoc 文档补全（可选，在 Phase 3 中顺带做）

在改 `any` 的过程中，顺手为以下导出添加 JSDoc：

**格式**：
```typescript
/** 管理 xxx 的组件，负责 yyy */
export default function XxxComponent({ prop1, prop2 }: Props) { ... }
```

**优先补全**：
- 所有 `export default function` 组件
- 所有 `export const` hooks
- 所有 `export function` 工具函数

---

## Phase 5: 类型守卫补全（收尾）

**检查** `src/types/guards.ts` 中是否覆盖了 `electron.d.ts` 中所有 interface。

**模式**（每个守卫完全一致）：
```typescript
export function isDepartment(value: unknown): value is Department {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof (value as Department).id === 'number'
    && 'name' in value && typeof (value as Department).name === 'string'
}
```

**需要补全的守卫**（如果缺失）：
- `isDepartment`
- `isCostLedgerEntry`
- `isCostLedgerBatch`
- `isCostLedgerMatchRule`
- `isCostLedgerCategory`
- `isCostLedgerSummary`
- `isIncomeContract` / `isExpenseContract` / `isAgreementContract`
- `isIncomeRecord` / `isExpenseRecord`
- `isContractExpiringItem`
- `isContractTemplate`
- `isTemplateVariable`
- `isSettlementItem`
- `isInventoryTransaction`
- `isInvoicePaymentDetail`
- `isOverdueRecord`
- `isOverdueStats`
- `isBankReceiptItem`
- `isParsedBankReceipt`
- `isBatchParseResult`
- `isBankReceiptMatch`
- `isSalaryHistoryEntry`
- `isAuditLogEntry`
- `isWorkerTransferRecord`

---

## 注意事项

1. **不要改动测试文件**（`__tests__/` 目录）
2. **不要改动 `electron.d.ts`**（类型定义源头）
3. **如果遇到循环依赖**：使用 `import type { ... }` 代替 `import { ... }`
4. **如果改了 `catch (e: any)` 为 `catch (e: unknown)`**：记得加类型收窄 `e instanceof Error ? e.message : String(e)`
5. **保留合理的 any**：JSON 动态字段、第三方库未类型化回调、`window.electronAPI` 等
6. **每批次改完立即验证**：不要积压改动再一次性 build

---

*文档版本：v1.0 | 生成日期：2026-06-11 | 基于项目 v0.72.0*
