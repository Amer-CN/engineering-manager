# R3 Spec: features/ 大文件拆分 (30 个文件, >250 行)

## 目标
将 `src/components/features/` 下 30 个超过 250 行的文件拆分为更小的模块。

## 拆分原则
1. 每个文件拆成 1 个主文件 + N 个辅助文件
2. 辅助文件放在同模块目录下
3. 主文件保留核心逻辑和布局
4. 提取纯渲染的 JSX 片段和常量
5. 不改变外部行为、props、回调
6. 每个子文件 ≤250 行

## 按模块分批 (每批独立 commit)

### R3-A: costLedger (7 个文件)
- `config.tsx` (317 行) → 提取颜色/图表配置到 `costLedgerColors.ts`
- `CategoryManager.tsx` (356 行) → 提取分类表单到 `CategoryForm.tsx`
- `CostLedgerImportModal.tsx` (291 行) → 提取导入步骤组件
- `CostLedgerList.tsx` (294 行) → 提取列表卡片渲染
- `importComponents/ImportMappingStep.tsx` (291 行) → 提取映射配置 UI
- `CostLedgerAnalytics.tsx` → 已存在,检查行数
- `printExport.ts` → 工具函数,不拆

### R3-B: hr (3 个文件)
- `StaffAttendance.tsx` (295 行) → 提取考勤日历组件
- `StaffList.tsx` (339 行) → 提取员工卡片列表
- `StaffPayroll.tsx` (305 行) → 提取薪资表组件

### R3-C: members (10 个文件)
- `MemberCard.tsx` (319 行) → 提取卡片媒体部分
- `MemberDetail.tsx` (329 行) → 提取详情 Tab 内容
- `MemberForm.tsx` (329 行) → 提取表单字段组件
- `WorkerImportModal.tsx` (365 行) → 提取导入步骤
- `WorkerPickerModal.tsx` (259 行) → 提取搜索/过滤
- `WorkerSection.tsx` (285 行) → 提取班组选择器
- `WorkerSectionModals.tsx` (286 行) → 提取添加工人表单
- `MembersTab.tsx` (259 行) → 提取成员列表项
- `MemberDetailParts.tsx` → 检查行数
- `MemberFilters.tsx` → 检查行数

### R3-D: wages (5 个文件)
- `AttendanceImportModal.tsx` (333 行) → 提取导入预览
- `BankReceiptBatch.tsx` (341 行) → 提取批量操作
- `BankReceiptMatchConfirm.tsx` (323 行) → 提取确认对话框
- `WageDetailTab.tsx` (326 行) → 提取详情行
- `WageDetailRow.tsx` → 检查行数

### R3-E: projects (2 个文件)
- `ProjectCommandCenter.tsx` (294 行) → 提取 Tab 内容
- `MembersTab.tsx` (259 行) → 提取成员面板

### R3-F: settlement (2 个文件)
- `SettlementForm.tsx` (302 行) → 提取表单字段
- `SettlementProjectDetail.tsx` (335 行) → 提取项目摘要

### R3-G: settings (1 个文件)
- `SettingsPiiKeySection.tsx` (273 行) → 提取密钥输入组件

### R3-H: invoices (1 个文件)
- `InvoiceList.tsx` (257 行) → 提取发票卡片

## 通用约束
1. 每个子文件 ≤250 行
2. 主文件行数目标 ≤250
3. 不改变外部行为、props、回调
4. 类型定义提取到同目录 `types.ts`
5. 常量提取到同目录 `constants.ts`
6. 每批独立 commit (refactor, 不 bump version)

## Commit message 格式
```
refactor(R3-A): costLedger 大文件拆分 (config + category + import + list)
refactor(R3-B): hr 大文件拆分 (attendance + list + payroll)
...
```

## Reviewer 检查点
1. import 路径是否正确
2. 类型导出/导入是否完整
3. props 传递是否完整
4. 主文件是否有冗余代码
5. 子文件是否自包含