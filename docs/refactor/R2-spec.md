# R2 Spec: 5 个大文件拆分

## 目标
消除 5 个 SOFT WARN（文件行数 >350）:
- Dashboard.tsx: 376 行
- Drawings.tsx: 331 行
- Members.tsx: 418 行
- SplashScreen.tsx: 333 行
- WageManagement.tsx: 392 行

## 拆分策略
每个大文件拆成 1 个主文件（保留原名）+ N 个子组件/常量文件。
主文件保留核心逻辑和布局，子组件提取独立 UI 片段。

---

## R2-1: Dashboard.tsx (376 行)

### 拆分点
主文件保留：Dashboard 组件 + loadStats + loadInvoiceData 数据逻辑
提取到 `src/components/features/dashboard/`:
- `DashboardStats.tsx` — 统计卡片渲染（含 getStatValue / StatValue 类型）
- `DashboardCharts.tsx` — 图表区域渲染（含 chartData / recentInvoices / 图表配置）
- `dashboardConstants.ts` — 常量（CATEGORY_HIERARCHY / statusLabels / invoiceStatusLabels / greeting 逻辑）

### 约束
- Dashboard 组件名不变，export default 不变
- StatValue interface 移到 DashboardStats.tsx
- 所有 useState / useEffect 保留在主文件
- import 路径用相对路径 `../features/dashboard/DashboardStats`

---

## R2-2: Drawings.tsx (331 行)

### 拆分点
主文件保留：Drawings 组件 + loadData + handleSubmit + handleEdit + handleDelete
提取到 `src/components/features/drawings/`:
- `DrawingsFormModal.tsx` — 表单弹窗（已有 `FormDataState` 类型，从 Drawings.tsx 的 import 可知）
- `drawingsConstants.ts` — columns 定义 + getProjectName 辅助函数

### 约束
- DrawingsProps interface 保留在主文件
- FormDataState type 需要共享 — 放到 `drawingsTypes.ts` 或在 DrawingsFormModal.tsx 里 export
- columns 定义移到 drawingsConstants.ts

---

## R2-3: Members.tsx (418 行)

### 拆分点
主文件保留：Members 组件 + 数据加载 + 状态管理
提取到 `src/components/features/members/`:
- `MemberFormFields.tsx` — 人员表单字段渲染（staff form / worker form 的 JSX 部分）
- `membersConstants.ts` — 表单默认值 + 常量
- `membersTypes.ts` — StaffFormData / WorkerFormData 等类型定义

### 约束
- MembersProps 保留在主文件
- 表单状态（staffFormData / workerFormData）保留在主文件
- 只提取纯渲染的 JSX 片段

---

## R2-4: SplashScreen.tsx (333 行)

### 拆分点
主文件保留：SplashScreen 组件主结构
提取到 `src/components/features/splash/`:
- `SplashParticles.tsx` — 粒子背景动画组件
- `SplashBranding.tsx` — Logo 脉冲 + 品牌文字逐字淡入
- `splashConstants.ts` — 动画参数常量

### 约束
- export default SplashScreen 不变
- framer-motion 动画参数保留在子组件中

---

## R2-5: WageManagement.tsx (392 行)

### 拆分点
主文件保留：WageManagement 组件 + 数据逻辑
提取到 `src/components/features/wages/`:
- `WageStatsCards.tsx` — 统计卡片区域
- `WageTable.tsx` — 工资表格区域
- `wageConstants.ts` — 表格 columns + 状态标签常量

### 约束
- export default function WageManagement() 不变
- 数据获取和状态管理保留在主文件

---

## 通用约束
1. 每个子文件 ≤250 行
2. 主文件行数目标 ≤350
3. 不改变任何外部行为、props、回调
4. 不改变路由引用（import 路径更新即可）
5. 每个文件独立可构建（无循环依赖）

## 验证清单（每文件）
- [ ] `npx tsc --noEmit --pretty false` 0 error
- [ ] `npm run check` 0 HARD FAIL
- [ ] 主文件行数 ≤350
- [ ] 子文件行数 ≤250

## Commit message（每文件独立 commit）
```
refactor(R2-1): Dashboard.tsx 拆分 DashboardStats + DashboardCharts + constants
refactor(R2-2): Drawings.tsx 拆分 DrawingsFormModal + constants
refactor(R2-3): Members.tsx 拆分 MemberFormFields + constants + types
refactor(R2-4): SplashScreen.tsx 拆分 SplashParticles + SplashBranding + constants
refactor(R2-5): WageManagement.tsx 拆分 WageStatsCards + WageTable + constants
```

## Reviewer 检查点
1. import 路径是否正确（相对路径 vs @/ 别名）
2. 类型导出/导入是否完整（interface / type）
3. props 传递是否完整（所有子组件需要的 props 都传了）
4. 主文件是否还有冗余代码可以进一步清理
5. 子文件是否自包含（不依赖主文件的内部变量）