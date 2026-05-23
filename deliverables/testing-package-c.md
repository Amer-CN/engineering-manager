# 测试覆盖率提升 - Package C（P2 中优先级）

**目标**：覆盖最大的几个组件  
**预计提升**：~3-4%  
**创建时间**：2026-05-23

---

## 🟡 优先级说明

**P2 = 中优先级**——界面错了重刷就行：
- 大组件渲染失败 → 用户体验差，但不影响数据
- 组件交互错误 → 可以重做操作

---

## 📋 任务清单

### 任务 C1：项目详情标签页组件测试

**文件**：`src/components/features/projects/ProjectDetailTabs.tsx` (387行)  
**优先级**：P2 🟡  
**测试文件**：`src/__tests__/components/features/projects/ProjectDetailTabs.test.tsx`

#### 组件说明
- 项目详情页的标签页容器
- 包含多个标签页：概况、成员、合同、工资等
- 使用 `useProjectDetail` Hook 获取项目数据

#### 测试重点
1. **渲染测试**：各标签页渲染正常
2. **标签切换**：点击标签切换内容
3. **数据传递**：项目数据正确传递给子组件
4. **加载状态**：数据加载时显示加载提示

#### Mock 规范
```ts
// useProjectDetail Hook mock
vi.mock('@/hooks/useProjectDetail', () => ({
  useProjectDetail: vi.fn(() => ({
    project: mockProject,
    loading: false,
    error: null,
    refresh: vi.fn()
  }))
}))

// 子组件 mock
vi.mock('@/components/features/projects/ProjectOverviewTab', () => ({
  ProjectOverviewTab: vi.fn(() => <div data-testid="overview-tab" />)
}))

vi.mock('@/components/features/projects/ProjectMembersTab', () => ({
  ProjectMembersTab: vi.fn(() => <div data-testid="members-tab" />)
}))
```

#### 完成标准
- ✅ 渲染测试（所有标签页）
- ✅ 标签切换测试
- ✅ 加载状态测试
- ✅ 运行 `npx vitest run src/__tests__/components/features/projects/ProjectDetailTabs.test.tsx` 全部通过

---

### 任务 C2：银行回单匹配确认组件测试

**文件**：`src/components/features/wages/BankReceiptMatchConfirm.tsx` (371行)  
**优先级**：P2 🟡  
**测试文件**：`src/__tests__/components/features/wages/BankReceiptMatchConfirm.test.tsx`

#### 组件说明
- 银行回单匹配确认模态框
- 显示匹配结果，允许用户确认或拒绝匹配
- 使用 `window.electronAPI` 调用匹配确认 API

#### 测试重点
1. **渲染测试**：模态框显示/隐藏
2. **匹配结果显示**：正确显示匹配的员工和金额
3. **确认操作**：点击确认按钮调用 API
4. **拒绝操作**：点击拒绝按钮调用 API
5. **错误处理**：API 调用失败时的错误提示

#### Mock 规范
```ts
// window.electronAPI mock
window.electronAPI.confirmBankReceiptMatch = vi.fn().mockResolvedValue({ success: true })
window.electronAPI.rejectBankReceiptMatch = vi.fn().mockResolvedValue({ success: true })

// useToastStore mock
vi.mock('@/stores/toastStore', () => ({
  useToastStore: vi.fn(() => ({ showToast: vi.fn() }))
}))
```

#### 完成标准
- ✅ 渲染测试（显示/隐藏）
- ✅ 匹配结果显示测试
- ✅ 确认操作测试
- ✅ 拒绝操作测试
- ✅ 运行 `npx vitest run src/__tests__/components/features/wages/BankReceiptMatchConfirm.test.tsx` 全部通过

---

### 任务 C3：成本台账列表组件测试

**文件**：`src/components/features/costLedger/CostLedgerList.tsx` (361行)  
**优先级**：P2 🟡  
**测试文件**：`src/__tests__/components/features/costLedger/CostLedgerList.test.tsx`

#### 组件说明
- 成本台账列表展示
- 支持筛选、排序、缩放
- 使用 `CostLedgerRow` 子组件渲染每行

#### 测试重点
1. **渲染测试**：列表渲染、空状态、加载状态
2. **筛选测试**：按类型筛选（全部/支出/收入）
3. **排序测试**：按字段排序（日期、金额等）
4. **缩放测试**：缩放级别切换
5. **分类层级测试**：分类层级切换

#### Mock 规范
```ts
// CostLedgerRow 子组件 mock
vi.mock('@/components/features/costLedger/CostLedgerRow', () => ({
  CostLedgerRow: vi.fn(() => <div data-testid="row" />)
}))

// printExport mock
vi.mock('@/components/features/costLedger/printExport', () => ({
  printCostLedgerList: vi.fn(),
  exportCostLedgerList: vi.fn()
}))

// localStorage mock
beforeEach(() => {
  Storage.prototype.getItem = vi.fn(() => '1.0')
})
```

#### 完成标准
- ✅ 渲染测试（列表/空状态/加载状态）
- ✅ 筛选测试
- ✅ 排序测试
- ✅ 缩放测试
- ✅ 运行 `npx vitest run src/__tests__/components/features/costLedger/CostLedgerList.test.tsx` 全部通过

---

### 任务 C4：成本台账分类管理组件测试

**文件**：`src/components/features/costLedger/CategoryManager.tsx` (355行)  
**优先级**：P2 🟡  
**测试文件**：`src/__tests__/components/features/costLedger/CategoryManager.test.tsx`

#### 组件说明
- 成本台账分类管理模态框
- 支持支出/收入分类管理
- 支持分类编辑、添加、删除、恢复默认

#### 测试重点
1. **渲染测试**：模态框显示/隐藏，支出/收入标签页
2. **标签切换**：切换支出/收入标签页
3. **编辑分类**：编辑 L2 分类
4. **添加分类**：添加新分类
5. **删除分类**：删除分类
6. **恢复默认**：恢复默认分类

#### Mock 规范
```ts
// window.electronAPI mock
window.electronAPI.getCostLedgerMatchRules = vi.fn().mockResolvedValue({ success: true, data: [] })
window.electronAPI.updateCostLedgerCategory = vi.fn().mockResolvedValue({ success: true })
window.electronAPI.deleteCostLedgerCategory = vi.fn().mockResolvedValue({ success: true })
window.electronAPI.createCostLedgerCategory = vi.fn().mockResolvedValue({ success: true })
window.electronAPI.resetCostLedgerCategories = vi.fn().mockResolvedValue({ success: true })
window.electronAPI.saveCostLedgerMatchRules = vi.fn().mockResolvedValue({ success: true })

// config mock
vi.mock('@/config', () => ({
  getLevel1GroupsMerged: vi.fn(() => ['直接成本', '间接成本']),
  HIERARCHY_GROUP_NAMES: ['材料费', '人工费']
}))
```

#### 完成标准
- ✅ 渲染测试（显示/隐藏，支出/收入标签页）
- ✅ 标签切换测试
- ✅ 编辑分类测试
- ✅ 添加分类测试
- ✅ 删除分类测试
- ✅ 恢复默认测试
- ✅ 运行 `npx vitest run src/__tests__/components/features/costLedger/CategoryManager.test.tsx` 全部通过

---

## 🔧 统一 Mock 规范

### 1. window.electronAPI
```ts
// 项目 test-setup.ts 已全局 mock，只需覆写用到的
beforeEach(() => {
  window.electronAPI.xxx = vi.fn().mockResolvedValue({ success: true, data: {} })
})
```

### 2. 路由（react-router-dom）
```ts
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})
```

### 3. 子组件
```ts
vi.mock('@/components/xxx', () => ({
  Xxx: vi.fn(() => <div data-testid="mock" />)
}))
```

---

## ✅ 验证步骤

每个任务完成后：

1. **运行单个测试文件**：
   ```bash
   cd E:/测试
   npx vitest run src/__tests__/components/features/xxx/xxx.test.tsx --reporter=verbose
   ```

2. **运行完整测试套件**（确保无回归）：
   ```bash
   cd E:/测试
   npx vitest run --reporter=verbose
   ```

3. **运行覆盖率测试**（查看提升）：
   ```bash
   cd E:/测试
   npx vitest run --coverage
   ```

4. **更新主任务清单**（`deliverables/testing-master-plan.md` 的"完成进度"部分）

---

## 🆘 遇到问题？

常见问题：
- **测试失败**：检查 mock 是否正确，用 `console.log` 调试
- **导入错误**：使用懒加载导入（`await import()`）避免 memo 陷阱
- **jsdom 限制**：`required` 属性会阻止表单提交，需要 `removeAttribute('required')`

---

**创建者**：AI Assistant  
**最后更新**：2026-05-23
