# src/components/ - 前端组件域

> 项目状态：v0.92.0（以 package.json 为唯一真源） · 最后同步：2026-08-03

> 本目录职责：全部 React 页面与组件。基础组件在 `ui/`，业务组件在 `features/<模块>/`，页面级组件在根层（如 `Projects.tsx`、`InvoicePage.tsx`）。

## 边界

- **`ui/`**：通用基础组件库（Button / Input / Modal / **Drawer** / Card / Badge / Select / Pagination / DropdownMenu / Tabs / Tooltip / ProgressBar / FormField / Toast / Loading / EmptyState / PageContainer / HoverScrollbar / StatusBar / MonthPicker / OCRRecognitionFeedback / DataTable 等）。改这里影响全站，先确认调用面
- **弹窗语义铁律（v0.84.0 起）**：写操作录入表单一律用 `<Drawer>`（S17 右侧滑出，全站 20 处）；浏览/统计/预览/确认/选择器保留居中 `<Modal>` / `<ConfirmDialog>`。新建写表单禁止再用居中 Modal
- **`features/<模块>/`**：业务组件唯一归属地。**新建业务组件必须放这里**，禁止在 `src/features/` 下建文件，新建前确认无同名组件
- **`DataTable.tsx`**：列表金标准，`TABLE` 常量是唯一样式来源；配合 `<FilterBar className="mb-6">` + `<DataTable useHoverScrollbar={true}>`
- 数据获取不写在组件里：走 `src/hooks/data/` 的 React Query hooks（见 [src/hooks/AGENTS.md](../hooks/AGENTS.md)）

## 硬性规则（违反会导致 `npm run check` HARD FAIL）

| 场景 | 必须 | 禁止 |
|------|------|------|
| 页面布局 | `<PageContainer>` | 手写 `p-6 max-w-[1400px] mx-auto` |
| 按钮 | `<Button variant="X" size="Y">` | `btn btn-*` CSS 类（@deprecated） |
| 卡片 | `<Card>` / `<StatCard>` | 手写 `bg-white rounded-xl shadow-sm` |
| Hero 横幅 | `<HeroBanner>` | 内联 slate 渐变 |
| 色系 | slate-* / primary-* / success-* / warning-* / danger-* | gray-*（主题定义除外） |
| 字号 | text-caption（10px）/ text-micro（11px） | text-[10px] 等任意值 |
| 图标 | `<Icon name="X" />`（iconMap.ts 注册） | 直接 import lucide 图标 |

## 风险红线

- 不得在组件中直接操作 localStorage —— 使用 `AuthContext`
- zustand store 订阅必须用 selector（如 `useToastStore(s => s.showToast)`），禁止 `useToastStore()` 全订阅 —— 全订阅进 useCallback/useEffect 依赖会引发无限重跑（AI 设置页卡死教训，v0.84.0）
- 敏感操作必须过 `usePermission()`（`can` / `canAll` / `canAny` / `isAdmin`）；路由级守卫用 `<RequirePermission />` / `<RequireAdmin />`
- PII 显示必须走 `useMaskedFn` hook，禁止写死 maskIdCard 或直接渲染明文身份证/银行卡/手机号
- 动画：spring 物理优先（stiffness≤200）、大元素禁 scale、页面切换只用 opacity

## 就近命令

```bash
npx vite build                     # 构建（dist/ 自动同步到 C# 输出目录）
npm run check                      # 组件规则检查（0 HARD FAIL 才合格）
npx tsc --noEmit --pretty false    # 类型检查（0 error）
npx vitest run                     # 前端测试（src/__tests__/）
```

## 深链

- 新页面开发 Checklist（8 条）与完整规范 → [docs/CONVENTIONS.md](../../docs/CONVENTIONS.md)
- UI 设计 Token / 三主题 / 动画系统 → [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md)「UI 规范」+ [DESIGN.md](../../DESIGN.md)
- 模块 ↔ 主文件 ↔ C# 端点映射表 → [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md)「核心模块架构」
