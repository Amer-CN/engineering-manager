# R16 Sprint Handoff — any 深度清理（Russell/Galileo 续跑）

## 状态总览

- **HEAD**：`4b65076`（R15：代码结构优化 — any 清理 + 大文件拆分）
- **分支**：master
- **目标**：在 R15 基础上继续清理前端 `any`，优先完成 Russell/Galileo 未完成范围，再决定是否做 services 层

## 当前 any 统计（R15 后）

- `: any` ≈ 670
- `as any` ≈ 309

## R15 已完成 ✅

- 20 个 hooks/components/utils 文件的 `catch error: any` 等改为 `unknown`
- `src/services/ocr/` 拆分（13 文件）
- `src/utils/audit/` 拆分（8 文件）
- `useLaborOperations` 拆分（5 子 hook + 聚合层）
- `AttendanceImportModal` tsc 修复

## R16 已确认完成 ✅（Hilbert 范围）

- members 模块 8 文件（30+ 处 any 清理）

## 本次接手要做的任务

### 1）Russell（payroll/hr）

- `src/components/features/payroll/usePayrollData.ts`（~20）
- `src/components/features/payroll/PayrollTable.tsx`（~8）
- `src/components/features/hr/StaffPayrollToolbar.tsx`（~7）
- `src/components/features/hr/StaffPayrollTable.tsx`（~5）
- `src/components/features/hr/useStaffPayrollFilters.ts`（~5）
- `src/components/features/hr/DepartmentManager.tsx`（~6）

### 2）Galileo（settlement/labor/costLedger）

- `src/components/features/settlement/SettlementForm.tsx`（~6）
- `src/components/features/settlement/useSettlementHandlers.ts`（~6）
- `src/components/features/settlement/SettlementProjectActions.tsx`（~6）
- `src/components/features/labor/hooks/useLaborProjectWorker.ts`（~6）
- settlement/labor/costLedger/dashboard 散落文件若干（各1处）

## 替换策略

- `catch (error: any)` → `catch (error: unknown)`
- `any[]` → 具体类型（如 `Member[]`、`PayrollRecord[]`、`string[][]`）
- `Record<string, any>` → `Record<string, unknown>` 或具体类型
- `Dispatch<SetStateAction<any>>` → 具体泛型
- `(x as any).foo` → `(x as unknown as Record<string, unknown>).foo` 或直接删断言

## 验收标准（必须全绿）

- `tsc --noEmit --pretty false`：0 error
- `vite build`：success
- `npm run check`：0 HARD FAIL

## 操作提示

- 先做 payrolls/hr，再做 settlement/labor/costLedger
- 每个 worker 单次任务不超过 20 文件，避免超时
- services 层（tauri-bridge / api-methods）any 属历史技术债，建议本轮先不动

---
接手后只需执行三件事：摸底剩余 any → 分批清理 → 每批跑红绿灯。
## 2026-06-25 执行记录

- 首次子代理尝试失败：Param Incorrect / Not supported model gpt-5.2
- 改为手动分批执行（每批 ≤ 20 文件），先做 src/components/features + src/utils（非 services、非 tests）


## 2026-06-25 R16 执行记录（第一轮）

### 成果

- **any 总数**：375 → 297（非 services/tests 范围，减少 78 处）
- **修改文件**：28 个（含 6 个预存 tsc 错误修复）
- **三灯状态**：tsc 0 error ✅ / vite build ✅ / npm run check ALL CLEAN ✅

### 已完成文件

| 文件 | before → after |
|------|---------------|
| StaffList.tsx | 10 → 0 |
| useSettlementHandlers.ts | 6 → 0 |
| SettlementProjectActions.tsx | 6 → 0 |
| useLaborProjectWorker.ts | 8 → 0 |
| useLaborData.ts | 6 → 0 |
| StaffAttendanceDashboard.tsx | 6 → 0 |
| DepartmentManager.tsx | 1 → 0 |
| useLaborOperations.ts | 20 → 0 |
| audit/logger.ts | 11 → 0 |
| audit.ts | 8 → 0 |
| useCompanyQuery.ts | 6 → 0 |
| usePartnerActions.ts | 5 → 0 |
| WorkerImportPhase.tsx | 6 → 0 |
| LaborDashboard.tsx | 5 → 0 |
| useLaborWorkerLifecycle.ts | 5 → 0 |
| useWageActions.ts | 5 → 0 |
| auditFieldFormat.tsx | 0 → 0 (tsc 修复) |

### 预存 tsc 错误修复（6 个文件）

- CostLedgerAnalytics.tsx：API 响应类型 + recharts formatter
- CostLedgerImportModal.tsx：WorkBook 类型 + CostLedgerMatchRule
- SettlementForm.tsx：Excel 导入行类型
- usePayrollData.ts：teamId 默认值
- SettlementItemsTable.tsx：onUpdate 类型
- useMemberOperations.ts：logCreate 参数类型

### 经验教训

- **interface 参数类型（如 formData: any → Record<string, unknown>）**：容易引发连锁 tsc 错误，因为调用方传入的具体类型（如 StaffFormData）不兼容 Record<string, unknown>。**策略**：对函数参数的 any，优先用具体类型或保持 any，不要盲目改 unknown
- **catch (error: any) → catch (error: unknown)**：安全且无副作用，是最优先的清理目标
- **Record<string, any> → Record<string, unknown>**：在 audit/logger 等工具层安全，但在业务组件里需小心 JSX 渲染 unknown 的问题
- **批量 revert + 只做安全替换**：对于顽固文件，revert 到 HEAD 后只做 catch 块替换，比硬改接口类型效率高

### 下一步（新会话接手）

1. 剩余 any ≈ 297 处（含 services ~100、tests ~50、types ~20、组件 ~127）
2. 组件层 127 处可继续清理，但需逐文件评估是否会引起 tsc 连锁错误
3. services 层（tauri-bridge/api-methods）是 API 桥接设计债，建议不动
4. 建议每批 ≤10 文件，每批结束跑 tsc，发现连锁错误立即 revert 该文件
