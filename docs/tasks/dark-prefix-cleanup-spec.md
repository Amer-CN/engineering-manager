# 任务：清理 `dark:` 前缀死代码

## 背景

项目使用自定义三主题系统（White/Graphite/Sandstone），通过 `data-theme` 属性驱动 CSS 变量，**不使用** Tailwind 的 `dark:` 暗色模式。所有 `dark:xxx` 类名是历史遗留的死代码，CSS 里没有对应的 dark 模式规则，不会产生任何视觉效果。

## 任务范围

### 文件数量
- `src/components/` 下 **69 个 .tsx 文件**（共 ~497 处 dark: 类名）
- `src/index.css` 下 **17 处** @apply 中的 dark: 前缀

### 不需要处理的
- `src/hooks/`、`src/utils/`、`src/services/` 等非组件文件（没有 dark:）
- `public/`、`docs/` 等非代码目录

## 操作规则

### 在 .tsx 文件中（className 字符串）

**规则：删除 `dark:` 前缀及其后的类名，保留前面的空格不变成多余空格。**

示例：
```tsx
// 修改前
<div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">

// 修改后
<div className="bg-white rounded-xl shadow-sm">
```

```tsx
// 修改前
<span className="text-sm text-slate-700 dark:text-slate-200 font-medium">

// 修改后
<span className="text-sm text-slate-700 font-medium">
```

```tsx
// 修改前
className={`px-4 py-2 text-slate-800 dark:text-slate-100 ${someVar}`}

// 修改后
className={`px-4 py-2 text-slate-800 ${someVar}`}
```

### 在 index.css 中（@apply 语句）

**规则：同样删除 `dark:` 前缀及其后的类名。**

示例：
```css
/* 修改前 */
@apply bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600;

/* 修改后 */
@apply bg-white text-slate-700 border border-slate-200;
```

## 高频 dark: 类名（按出现次数排序）

| 类名 | 次数 | 说明 |
|------|------|------|
| `dark:bg-slate-800` | 88 | 深色背景 |
| `dark:text-slate-400` | 62 | 浅色文字 |
| `dark:border-slate-700` | 60 | 深色边框 |
| `dark:text-slate-200` | 45 | 浅色文字 |
| `dark:text-slate-100` | 33 | 浅色文字 |
| `dark:border-slate-600` | 23 | 深色边框 |
| `dark:text-slate-300` | 14 | 浅色文字 |
| `dark:bg-slate-700` | 11 | 深色背景 |
| `dark:bg-slate-600` | 7 | 深色背景 |
| `dark:text-slate-500` | 6 | 浅色文字 |
| 其他 | ~118 | 各种 dark: 变体 |

## 完整文件清单（69 个 .tsx + 1 个 .css）

```
src/components/AttendanceDetail.tsx
src/components/AuditDetailModal.tsx
src/components/AuditLogViewer.tsx
src/components/AuditLogs.tsx
src/components/AuditStatsPanel.tsx
src/components/ContractDashboard.tsx
src/components/ContractTemplates.tsx
src/components/Contracts.tsx
src/components/Dashboard.tsx
src/components/DataTable.tsx
src/components/Drawings.tsx
src/components/Inventory.tsx
src/components/Invoices.tsx
src/components/Members.tsx
src/components/Partners.tsx
src/components/Projects.tsx
src/components/RolePermissionsTab.tsx
src/components/Settings.tsx
src/components/SettingsOcrSection.tsx
src/components/SettingsSqliteSection.tsx
src/components/Sidebar.tsx
src/components/Users.tsx
src/components/features/costLedger/CostLedgerBatchBar.tsx
src/components/features/costLedger/CostLedgerDashboard.tsx
src/components/features/costLedger/CostLedgerImportModal.tsx
src/components/features/costLedger/importComponents/ImportDoneStep.tsx
src/components/features/costLedger/importComponents/ImportFileStep.tsx
src/components/features/costLedger/importComponents/ImportMappingStep.tsx
src/components/features/costLedger/importComponents/ImportProgressStep.tsx
src/components/features/inventory/InventoryStats.tsx
src/components/features/inventory/ItemList.tsx
src/components/features/inventory/MaterialList.tsx
src/components/features/invoices/InvoiceFilters.tsx
src/components/features/invoices/InvoiceForm.tsx
src/components/features/invoices/InvoiceRow.tsx
src/components/features/invoices/InvoiceStats.tsx
src/components/features/invoices/PaymentFileUpload.tsx
src/components/features/invoices/PaymentForm.tsx
src/components/features/invoices/PaymentList.tsx
src/components/features/invoices/PaymentStats.tsx
src/components/features/members/LeaveModal.tsx
src/components/features/members/MemberCard.tsx
src/components/features/members/MemberDetail.tsx
src/components/features/members/MemberDetailParts.tsx
src/components/features/members/TeamWorkerModal.tsx
src/components/features/members/WorkerImportModal.tsx
src/components/features/members/WorkerPickerItem.tsx
src/components/features/members/WorkerPickerModal.tsx
src/components/features/members/WorkerPoolForm.tsx
src/components/features/members/WorkerSection.tsx
src/components/features/members/WorkerSectionModals.tsx
src/components/features/partners/FileDropZone.tsx
src/components/features/partners/PartnerForm.tsx
src/components/features/partners/PartnerSelect.tsx
src/components/features/partners/SupervisorForm.tsx
src/components/features/projects/ProjectForm.tsx
src/components/features/wages/FileImportDialog.tsx
src/components/ui/Button/Button.tsx
src/components/ui/Card/Card.tsx
src/components/ui/EmptyState.tsx
src/components/ui/FormField/FormField.tsx
src/components/ui/Input/Input.tsx
src/components/ui/Modal/Modal.tsx
src/components/ui/PageHeader.tsx
src/components/ui/Pagination/Pagination.tsx
src/components/ui/ProgressBar/ProgressBar.tsx
src/components/ui/Select/Select.tsx
src/components/ui/Tabs/Tabs.tsx
src/components/ui/Tooltip/Tooltip.tsx
src/index.css
```

## 验证方式

1. 清理完成后运行 `npx tsc --noEmit --skipLibCheck` 确保无类型错误
2. 运行 `npx vite build` 确保编译通过
3. 手动检查几个页面（Dashboard、Projects、Settings）确认 UI 无异常
4. `grep -r "dark:" src/ --include="*.tsx" --include="*.css"` 应返回 0 结果

## 注意事项

- **不要改业务逻辑**，只删 dark: 类名
- **不要改 className 的其他部分**
- 如果一行中 dark: 类名是唯一的类名（如 `className="dark:bg-slate-800"`），删完后保留空字符串 `className=""`
- 处理完后清理多余空格（如 `"bg-white  rounded-xl"` → `"bg-white rounded-xl"`）
