# R4 Spec: 硬编码 hex 颜色迁常量

## 目标
消除 20 个文件中的 ~150 处硬编码 hex 颜色警告。

## 策略
**最小风险方案**：不替换 hex 为 Tailwind 语义色，提取到文件顶部 `const COLORS` 常量中。
- 视觉效果零变化
- 集中管理便于后续主题化
- 通过 `as const` 保留类型推断

## 通用模式
```typescript
// 文件顶部
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  // ...
} as const

// 使用
<svg fill={COLORS.primary} />
<Bar fill={COLORS.success} />
```

## 约束
1. 视觉效果必须完全一致
2. 颜色值不变（保留 hex）
3. 不引入新依赖
4. 不改其他代码

## Commit
```
refactor(R4): <文件名> 硬编码 hex 提取为 COLORS 常量
```

## 文件清单 (20 个)
- ContractDashboard.tsx (7)
- Dashboard.tsx (7)
- costLedger/CategoryManager.tsx (2)
- costLedger/CategoryManagerGroupList.tsx (1)
- costLedger/config.tsx (4)
- costLedger/CostLedgerAnalytics.tsx (14)
- costLedger/costLedgerColors.ts (50) — 已是常量文件，需要重构为 as const + export
- costLedger/printExport.ts (7)
- dashboard/dashboardConstants.ts (6)
- hr/HRDashboard.tsx (8)
- invoices/printExport.ts (4)
- labor/LaborDashboard.tsx (10)
- projects/ProjectCard.tsx (4)
- projects/ProjectCommandCenter.tsx (12)
- settlement/SettlementProjectActions.tsx (4)
- settlement/useSettlementHandlers.ts (4)
- templates/TemplateGenerate.tsx (3)
- templates/TemplatePreview.tsx (3)
- hooks/useCostLedgerCategories.ts (1)
- utils/wage-export.ts (5)