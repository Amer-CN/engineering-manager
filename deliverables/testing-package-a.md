# 测试覆盖率提升 - Package A（P0 最高优先级）

**目标**：覆盖工资计算 + SQLite双写逻辑  
**预计提升**：~4-5%    
**实际提升**：待测量（electron/sqlite/queries/** 已加入覆盖率统计）  
**创建时间**：2026-05-23    
**完成时间**：2026-05-23 03:35

---

## ✅ 完成状态

| 任务 | 状态 | 测试文件 | 测试数 |
|---|---|---|---|
| A1: staff-payroll-utils | ✅ 已完成 | `src/__tests__/utils/staff-payroll-utils.test.ts` | 27 |
| A2: useWageManagement | ✅ 已完成 | `src/__tests__/hooks/useWageManagement.test.tsx` | 9 |
| A3: useSqliteSettings | ✅ 已完成 | `src/__tests__/hooks/useSqliteSettings.test.tsx` | 5 |
| A4: wages SQLite 查询 | ✅ 已完成 | `src/__tests__/electron/sqlite/wages.test.ts` | 20 |

**合计**：4 个任务全部完成，61 个测试用例通过。

---

## 🔧 关键修复

### test-setup.ts 兼容 Node.js 环境

**问题**：`test-setup.ts` 在 Node.js 环境（非 jsdom）中运行时，`window` 和 `localStorage` 未定义，导致测试失败。

**修复**：
```ts
// 仅 jsdom 环境执行
if (typeof window !== 'undefined') {
  ;(globalThis.window as unknown as Record<string, unknown>).electronAPI = mockElectronAPI
}

// localStorage 仅 jsdom 环境清空
beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
})
```

---

## 📊 测试运行结果

```
Test Files  125 passed | 2 failed (127)
Tests        1360 passed | 3 failed | 1 skipped (1364)
Duration     34.93s
```

**2 个失败文件**（与本次改动无关，为已有问题）：
1. `ProjectDetail.test.tsx` — 1 个测试失败（数据加载 spinner 检测）
2. `BankReceiptMatchConfirm.test.tsx` — 2 个测试失败（置信度统计）

---

## 🚀 覆盖率配置更新

**vite.config.ts** 更新：
1. `coverage.include` 新增 `'electron/sqlite/queries/**'`
2. `coverage.exclude` 移除 `'electron/**'`，改为精确排除：
   - `'electron/ipc-handlers/**'`
   - `'electron/sqlite/db-init.ts'`
   - `'electron/sqlite/migrate.ts'`
   - `'electron/sqlite/index.ts'`

**预期提升**：`wages.ts`（~525 行）加入覆盖率统计，预计提升 **4-5%**。

---

## 📝 后续步骤

1. **修复已有失败测试**（ProjectDetail、BankReceiptMatchConfirm）
2. **运行覆盖率**确认提升：`npx vitest run --coverage`
3. **继续 Package B/C/D**（按优先级推进）

---

**创建者**：AI Assistant    
**最后更新**：2026-05-23 03:35
