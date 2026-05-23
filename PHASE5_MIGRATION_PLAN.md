# Phase 5: Zustand 状态管理迁移计划

## 📊 当前状态

### ✅ 已完成
- [x] 创建 `src/store/toastStore.ts` (Zustand store)
- [x] 创建 `src/store/authStore.ts` (Zustand store)
- [x] 修改 `ToastProvider.tsx` 兼容 Zustand store
- [x] 示例迁移 `AttendanceDetail.tsx` (待确认)

### ⚠️ 待迁移组件统计
- **Toast 迁移**: 32 个组件使用 `useToastContext` → 需迁移到 `useToastStore`
- **Auth 迁移**: 5 个文件使用 `AuthContext` → 需迁移到 `useAuthStore`

---

## 🎯 迁移策略

### 策略 A: 渐进式迁移（推荐）
**优点**: 风险低，可随时暂停，易于调试
**缺点**: 迁移周期长

1. **第一批（示例）**: 迁移 3-5 个核心组件
   - `Invoices.tsx`
   - `Projects.tsx`
   - `Members.tsx`
   - `Contracts.tsx`
   - `Dashboard.tsx`

2. **第二批（业务模块）**: 迁移 10-15 个组件
   - 合同管理相关
   - 员工管理相关
   - 工资管理相关

3. **第三批（剩余组件）**: 迁移剩余组件
   - 清理旧 Context API
   - 移除兼容层

### 策略 B: 批量迁移
**优点**: 快速完成
**缺点**: 风险高，难以调试

- 使用脚本批量替换 import 和调用
- 一次性迁移所有组件
- 需要全面测试

---

## 🔧 迁移步骤（单个组件）

### Toast 迁移示例

**修改前**:
```typescript
import { useToastContext } from '../hooks/useToast'
const { showToast } = useToastContext()
```

**修改后**:
```typescript
import { useToastStore } from '@/store/toastStore'
const showToast = useToastStore(state => state.showToast)
```

### Auth 迁移示例

**修改前**:
```typescript
import { useAuthContext } from '@/hooks/AuthContext'
const { isAuthenticated, login, logout } = useAuthContext()
```

**修改后**:
```typescript
import { useAuthStore } from '@/store/authStore'
const isAuthenticated = useAuthStore(state => state.isAuthenticated)
const login = useAuthStore(state => state.login)
const logout = useAuthStore(state => state.logout)
```

---

## 📋 待迁移组件清单

### Toast 迁移（32 个组件）
1. `src/components/ContractPage.tsx`
2. `src/components/ContractTemplates.tsx`
3. `src/components/Drawings.tsx`
4. `src/components/features/contracts/ContractFormModal.tsx`
5. `src/components/features/costLedger/CostLedgerProjectDetail.tsx`
6. `src/components/features/costLedger/CostLedgerTab.tsx`
7. `src/components/features/hr/AttendanceTimeline.tsx`
8. `src/components/features/hr/BatchDeptAssignModal.tsx`
9. `src/components/features/hr/DepartmentManager.tsx`
10. `src/components/features/hr/PositionEditor.tsx`
11. `src/components/features/hr/SalaryHistoryModal.tsx`
12. `src/components/features/hr/StaffAttendance.tsx`
13. `src/components/features/hr/StaffList.tsx`
14. `src/components/features/hr/StaffPayroll.tsx`
15. `src/components/features/labor/hooks/useLaborData.ts`
16. `src/components/features/labor/hooks/useLaborOperations.ts`
17. `src/components/features/labor/WorkerWageHistoryModal.tsx`
18. `src/components/features/members/MemberForm.tsx`
19. `src/components/features/members/useMemberPasteHandler.ts`
20. `src/components/features/settlement/SettlementProjectDetail.tsx`
21. `src/components/features/templates/TemplateForm.tsx`
22. `src/components/features/templates/TemplateGenerate.tsx`
23. `src/components/HRManagement.tsx`
24. `src/components/Inventory.tsx`
25. `src/components/Invoices.tsx` ⚠️ 文件锁定中
26. `src/components/LaborManagement.tsx`
27. `src/components/Members.tsx`
28. `src/components/Partners.tsx`
29. `src/components/Projects.tsx`
30. `src/components/RolePermissionsTab.tsx`
31. `src/components/SnapshotsTab.tsx`
32. `src/components/WageManagement.tsx`

### Auth 迁移（5 个文件）
1. `src/components/Users.tsx`
2. `src/hooks/AuthContext.tsx` (核心文件，需重构)
3. `src/hooks/useAuth.ts`
4. `src/types/index.ts` (类型定义)
5. `src/types/permissions.ts` (权限集成)

---

## 🚀 建议执行方案

### 方案 1: 分批迁移（推荐）
- **第一批**: 迁移 5 个核心组件（今天）
- **第二批**: 迁移 10 个组件（明天）
- **第三批**: 迁移剩余组件（后天）
- **清理**: 移除旧 Context API

**预计时间**: 3-4 小时

### 方案 2: 暂停迁移
- 保持当前状态（Zustand store 已创建，但大部分组件仍使用 Context）
- 新组件使用 Zustand
- 旧组件逐步迁移

### 方案 3: 跳过 Phase 5
- 继续使用 Context API
- Zustand store 作为备用方案

---

## ❓ 需要你的决策

请选择一个方案：

**A**. 方案 1 - 继续迁移（分批完成）
**B**. 方案 2 - 暂停迁移（新组件用 Zustand）
**C**. 方案 3 - 跳过 Phase 5（保持 Context API）

**或者**，如果你想要调整计划，请告诉我你的想法。
