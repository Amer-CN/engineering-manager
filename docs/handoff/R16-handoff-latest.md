# R16 Sprint Handoff — 接手文档（2026-06-25 更新）

## 状态总览

| 项目 | 状态 |
|------|------|
| **HEAD** | `4b65076`（R15：代码结构优化 — any 清理 + 大文件拆分） |
| **分支** | master |
| **未提交改动** | 34 个文件（见下方清单） |
| **三灯状态** | tsc 0 error ✅ / vite build ✅ / npm run check ALL CLEAN ✅ |

---

## 本轮已完成内容（2026-06-25）

### any 清理成果

| 指标 | 开始 | 结束 |
|------|------|------|
| any 总数（非 services/tests） | 375 | 282 |
| 改动文件数 | 0 | 34 |
| 减少量 | — | **93** |

### 已清理文件（22 个，any 已归零）

| 文件 | before → after |
|------|---------------|
| StaffList.tsx | 10 → 0 |
| useLaborOperations.ts | 22 → 12（catch 块已清，接口参数保持 any） |
| useSettlementHandlers.ts | 6 → 0 |
| SettlementProjectActions.tsx | 6 → 0 |
| useLaborProjectWorker.ts | 8 → 0 |
| useLaborData.ts | 6 → 0 |
| StaffAttendanceDashboard.tsx | 6 → 0 |
| DepartmentManager.tsx | 1 → 0 |
| audit/logger.ts | 11 → 0 |
| audit.ts | 8 → 0 |
| useCompanyQuery.ts | 6 → 0 |
| usePartnerActions.ts | 5 → 2（catch 已清，formData 参数保持 any） |
| useLaborWorkerLifecycle.ts | 5 → 0 |
| LaborDashboard.tsx | 5 → 0 |
| useWageActions.ts | 5 → 0 |
| CostLedgerAnalytics.tsx | tsc 修复 |
| CostLedgerImportModal.tsx | tsc 修复 |
| SettlementForm.tsx | tsc 修复 |
| SettlementItemsTable.tsx | tsc 修复 |
| usePayrollData.ts | tsc 修复 |
| auditFieldFormat.tsx | tsc 修复 |
| useMemberOperations.ts | tsc 修复 |

### 未提交改动清单（34 文件）

已 stage 的改动（可直接 commit）：

```
src/components/Projects.tsx
src/components/Users.tsx
src/components/features/audit/auditFieldFormat.tsx
src/components/features/costLedger/CostLedgerAnalytics.tsx
src/components/features/costLedger/CostLedgerImportModal.tsx
src/components/features/hr/StaffAttendanceDashboard.tsx
src/components/features/hr/StaffList.tsx
src/components/features/hr/StaffPayrollTable.tsx
src/components/features/hr/StaffPayrollToolbar.tsx
src/components/features/hr/useStaffPayrollFilters.ts
src/components/features/labor/LaborDashboard.tsx
src/components/features/labor/hooks/useLaborOperations.ts
src/components/features/labor/hooks/useLaborProjectWorker.ts
src/components/features/labor/hooks/useLaborWorkerLifecycle.ts
src/components/features/members/MemberWorkerSection.tsx
src/components/features/members/TeamWorkerModal.tsx
src/components/features/members/WorkerSectionModals.tsx
src/components/features/members/useMemberFileHandlers.ts
src/components/features/members/useMemberFileUrls.ts
src/components/features/members/useMemberOperations.ts
src/components/features/members/useWorkerImport.ts
src/components/features/members/useWorkerPicker.ts
src/components/features/partners/useCompanyQuery.ts
src/components/features/partners/usePartnerActions.ts
src/components/features/payroll/PayrollPage.tsx
src/components/features/payroll/PayrollTable.tsx
src/components/features/payroll/usePayrollData.ts
src/components/features/settlement/SettlementForm.tsx
src/components/features/settlement/SettlementItemsTable.tsx
src/components/features/settlement/SettlementProjectActions.tsx
src/components/features/settlement/useSettlementHandlers.ts
src/components/features/wages/useWageActions.ts
src/utils/audit.ts
src/utils/audit/logger.ts
```

---

## 剩余任务

### 剩余 any 分布（282 处，126 文件）

| 分类 | 估计数量 | 说明 |
|------|---------|------|
| 组件层接口参数 | ~120 | `useState<any>`、`formData: any`、`Column<any>` 等 |
| types/electron.d.ts | 9 | 类型定义文件中的 any |
| test-utils/ | ~10 | 测试辅助工具 |
| services 层 | ~100 | tauri-bridge / api-methods（建议不动） |
| tests 层 | ~50 | 测试文件（建议不动） |

### Top 15 待清理文件

| 文件 | any 数 | 类型 |
|------|--------|------|
| useLaborOperations.ts | 12 | 接口参数（projects: any[] 等） |
| DepartmentManager.tsx | 8 | useState / props |
| WorkerImportPhase.tsx | 6 | Column / render |
| StaffFormModal.tsx | 5 | editing / departments props |
| AttendanceImportBody.tsx | 5 | wb: any / Column |
| useLaborData.ts | 5 | projects: any[] |
| ProjectDetail.tsx | 5 | useState / filter |
| InvoiceLinker.tsx | 5 | useState / filter |
| WageDetailTable.tsx | 5 | scopeData / Column |
| db-helpers.ts | 5 | 测试辅助 |
| FormUploadWidgets.tsx | 4 | |
| useLaborModals.ts | 4 | |
| ContractFormModal.tsx | 4 | |
| useLaborPoolWorker.ts | 4 | |
| LaborWorkerList.tsx | 4 | |

---

## 经验教训（重要）

### ✅ 安全替换（零连锁风险）

```typescript
// 1. catch 块（最安全）
catch (error: any) → catch (error: unknown)
error.message || 'xxx' → (error instanceof Error ? error.message : 'xxx')

// 2. Record<string, any>（在工具层安全）
Record<string, any> → Record<string, unknown>

// 3. showToast 类型（联合类型）
type: any → type: 'success' | 'error' | 'warning' | 'info'
```

### ⚠️ 危险替换（会引发连锁 tsc 错误）

```typescript
// 1. useState 泛型（会破坏所有 setXxx 调用）
useState<any[]>([]) → useState<Member[]>([])
// 问题：setMembers(data) 的 data 类型不匹配

// 2. 函数参数类型（会破坏所有调用方）
formData: any → formData: Record<string, unknown>
// 问题：调用方传入 StaffFormData 不兼容 Record<string, unknown>

// 3. Column 泛型（会破坏 render 函数）
Column<any>[] → Column<Record<string, unknown>>[]
// 问题：render: (item: Record) => JSX 中 item.xxx 变成 unknown

// 4. PromiseSettledResult 泛型（会破坏 .value 访问）
PromiseSettledResult<any> → PromiseSettledResult<unknown>
// 问题：r.value.success 变成 unknown 没有 .success
```

### 策略建议

1. **先做 catch 块**（安全，每个文件 1-3 处）
2. **再做 Record<string, any>**（工具层安全，组件层小心）
3. **接口参数最后做**（需要逐文件评估，改一个可能要改 5 个调用方）
4. **每批 ≤10 文件**，每批结束跑 tsc
5. **发现连锁错误立即 revert 该文件**，不要硬修
6. **services 层和 tests 层建议不动**（是 API 桥接设计债，改了收益低风险高）

---

## 红绿灯

```bash
cd "E:\测试" && npx tsc --noEmit --pretty false    # 0 error
cd "E:\测试" && npx vite build                       # success (16-18s)
cd "E:\测试" && npm run check                         # ALL CLEAN
```

---

## 推荐接手流程

1. **先 commit 当前改动**（34 文件已清理完毕，三灯全绿）
2. **跑一次摸底**：`grep -r '\\bany\\b' src/ --include='*.ts' | wc -l`
3. **按 Top 15 清单逐文件处理**，每文件先判断 any 类型：
   - catch 块 → 直接改
   - Record<string, any> → 改
   - useState / 函数参数 / Column → 评估连锁风险，保守处理
4. **每 5-10 文件跑一次 tsc**
5. **全部完成后 commit + tag**

---

*最后更新：2026-06-25 22:xx*
