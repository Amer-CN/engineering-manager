# 测试覆盖率提升 - Package B（P1 高优先级）

**目标**：覆盖合同 + 数据导入导出  
**预计提升**：~4-5%  
**创建时间**：2026-05-23

---

## 🟠 优先级说明

**P1 = 高优先级**——数据错了很麻烦：
- 合同金额校验失败 → 财务数据错误，纠纷
- 数据导入导出失败 → 信息丢失，无法恢复

---

## 📋 任务清单

### 任务 B1：合同表单组件测试

**文件**：`src/components/features/contracts/ContractFormModal.tsx` (~400行)  
**优先级**：P1 🟠  
**测试文件**：`src/__tests__/components/features/contracts/ContractFormModal.test.tsx`

#### 组件 Props
```ts
interface ContractFormModalProps {
  visible: boolean
  onClose: () => void
  initialData?: Contract | null
  mode: 'create' | 'edit'
  contractType: 'income' | 'expense' | 'other'
  projects: Project[]
  partners: Partner[]
  onRefresh: () => void
}
```

#### 测试重点
1. **渲染测试**：创建模式、编辑模式
2. **表单填写**：合同名称、金额、日期
3. **选择关联**：项目、合作单位
4. **提交测试**：CREATE、UPDATE 操作
5. **验证测试**：必填项校验、金额格式校验

#### Mock 规范
```ts
// window.electronAPI mock
window.electronAPI.createContract = vi.fn().mockResolvedValue({ success: true, data: {} })
window.electronAPI.updateContract = vi.fn().mockResolvedValue({ success: true })
window.electronAPI.getContractCategories = vi.fn().mockResolvedValue({ success: true, data: [] })
window.electronAPI.saveContractFile = vi.fn().mockResolvedValue({ success: true, data: '/path/to/file' })

// PartnerSelect mock
vi.mock('@/components/features/partners/PartnerSelect', () => ({
  PartnerSelect: vi.fn(({ onChange }) => (
    <select data-testid="partner-select" onChange={(e) => onChange(e.target.value)}>
      <option value="1">合作单位A</option>
    </select>
  ))
}))

// FileDropZone mock
vi.mock('@/components/features/partners/FileDropZone', () => ({
  FileDropZone: vi.fn(() => <div data-testid="file-drop-zone" />)
}))
```

#### 完成标准
- ✅ 渲染测试（创建/编辑模式）
- ✅ 表单填写测试
- ✅ 提交测试（CREATE/UPDATE）
- ✅ 验证测试（必填项、金额格式）
- ✅ 运行 `npx vitest run src/__tests__/components/features/contracts/ContractFormModal.test.tsx` 全部通过

---

### 任务 B2：合同管理 Hook 测试

**文件**：`src/hooks/useContracts.ts` (~200行)  
**优先级**：P1 🟠  
**测试文件**：`src/__tests__/hooks/useContracts.test.tsx`

#### 测试重点
1. **状态管理**：`contracts`、`loading`、`error` 状态
2. **CRUD 操作**：`createContract`、`updateContract`、`deleteContract`
3. **数据获取**：`fetchContracts`、`fetchCategories`
4. **错误处理**：API 失败时的错误提示

#### Mock 规范
```ts
// window.electronAPI mock
window.electronAPI.getContracts = vi.fn().mockResolvedValue({ success: true, data: [] })
window.electronAPI.createContract = vi.fn().mockResolvedValue({ success: true, data: {} })
window.electronAPI.updateContract = vi.fn().mockResolvedValue({ success: true })
window.electronAPI.deleteContract = vi.fn().mockResolvedValue({ success: true })
window.electronAPI.getContractCategories = vi.fn().mockResolvedValue({ success: true, data: [] })

// useToastStore mock
vi.mock('@/stores/toastStore', () => ({
  useToastStore: () => ({ showToast: vi.fn() })
}))
```

#### 完成标准
- ✅ 渲染测试（smoke test）
- ✅ 状态管理测试
- ✅ CRUD 操作测试
- ✅ 错误处理测试
- ✅ 运行 `npx vitest run src/__tests__/hooks/useContracts.test.tsx` 全部通过

---

### 任务 B3：数据导出导入工具函数测试

**文件**：`src/utils/export-import.ts` (~300行)  
**优先级**：P1 🟠  
**测试文件**：`src/__tests__/utils/export-import.test.ts`

#### 要测试的函数
```ts
// 1. exportToExcel(data, columns, filename) - 导出到 Excel
export function exportToExcel(data: any[], columns: Column[], filename: string): void

// 2. importFromExcel(file, mapping) - 从 Excel 导入
export function importFromExcel(file: File, mapping: Mapping): Promise<any[]>

// 3. exportToCsv(data, columns, filename) - 导出到 CSV
export function exportToCsv(data: any[], columns: Column[], filename: string): void

// 4. importFromCsv(file, mapping) - 从 CSV 导入
export function importFromCsv(file: File, mapping: Mapping): Promise<any[]>
```

#### 测试重点
1. **导出测试**：数据格式、文件名、文件内容
2. **导入测试**：文件解析、字段映射、错误处理
3. **边界情况**：空数据、无效文件、字段缺失

#### Mock 规范
```ts
// xlsx mock (如果用到)
vi.mock('xlsx', () => ({
  utils: { book_new: vi.fn(), book_append_sheet: vi.fn() },
  writeFile: vi.fn()
}))

// FileReader mock
global.FileReader = class {
  onload: any
  readAsArrayBuffer(file: File) {
    this.onload({ target: { result: new ArrayBuffer(8) } })
  }
} as any
```

#### 完成标准
- ✅ 所有导出函数都有测试
- ✅ 所有导入函数都有测试
- ✅ 边界情况已测试（空数据、无效文件）
- ✅ 运行 `npx vitest run src/__tests__/utils/export-import.test.ts` 全部通过

---

### 任务 B4：成本台账导入组件测试

**文件**：`src/components/features/costLedger/CostLedgerImportModal.tsx` (~294行)  
**优先级**：P1 🟠  
**测试文件**：`src/__tests__/components/features/costLedger/CostLedgerImportModal.test.tsx`

#### 测试重点
1. **渲染测试**：模态框显示/隐藏
2. **文件上传**：选择文件、文件预览
3. **字段映射**：列映射配置
4. **导入操作**：执行导入、进度显示
5. **错误处理**：文件格式错误、导入失败

#### Mock 规范
```ts
// window.electronAPI mock
window.electronAPI.importCostLedger = vi.fn().mockResolvedValue({ success: true, data: { imported: 10, skipped: 2 } })
window.electronAPI.getCostLedgerCategories = vi.fn().mockResolvedValue({ success: true, data: [] })

// FileDropZone mock
vi.mock('@/components/features/partners/FileDropZone', () => ({
  FileDropZone: vi.fn(() => <div data-testid="file-drop-zone" />)
}))
```

#### 完成标准
- ✅ 渲染测试（显示/隐藏）
- ✅ 文件上传测试
- ✅ 导入操作测试
- ✅ 错误处理测试
- ✅ 运行 `npx vitest run src/__tests__/components/features/costLedger/CostLedgerImportModal.test.tsx` 全部通过

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
   npx vitest run src/__tests__/xxx/xxx.test.tsx --reporter=verbose
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

## 📞 遇到问题？

常见问题：
- **测试失败**：检查 mock 是否正确，用 `console.log` 调试
- **导入错误**：使用懒加载导入（`await import()`）避免 memo 陷阱
- **jsdom 限制**：`required` 属性会阻止表单提交，需要 `removeAttribute('required')`

---

**创建者**：AI Assistant  
**最后更新**：2026-05-23
