# src/utils/ - 前端工具函数域

> 本目录职责：纯函数工具集——`date.ts`(日期) / `format.ts`(金额/ID) / `validate.ts`(手机/身份证/邮箱) / `mask.ts`(PII 脱敏) / `iconMap.ts`(图标注册) / `export-import.ts` `wage-export.ts`(导入导出) / `projectHealth.ts`(健康度评分) / `audit/`(审计子模块：logger/query/stats/storage/cleanup/export) 等。

## 边界

- 只放**无 React 依赖的纯函数**；带状态/副作用的逻辑归 `src/hooks/`（见 [src/hooks/AGENTS.md](../hooks/AGENTS.md)），API 调用归 `src/services/`（见 [src/services/AGENTS.md](../services/AGENTS.md)）
- `iconMap.ts` 是全站图标唯一注册点：新图标先在此注册，组件统一用 `<Icon name="X" />`
- `mask.ts` 只提供脱敏纯函数；组件侧的显示开关必须经 `useMaskedFn` hook，不得在组件里直接调 mask 函数写死
- `audit/` 子模块是前端审计的分层实现（types → logger → storage → query/stats → cleanup/export），新增审计能力按此分层放置
- 常量不放这里：工种/考勤/省市区/权限标签等常量归 `src/constants/`

## 风险红线

- 金额计算基于**分（整数）**，格式化才转元；禁止在工具函数里引入浮点累加
- 不得在工具函数里读写 localStorage 做认证/权限状态（那是 `AuthContext` / `MaskContext` 的职责）
- 修改 `format.ts` / `date.ts` 这类高扇出函数前先全局检索调用面，跑 vitest 回归

## 就近命令

```bash
npx tsc --noEmit --pretty false    # 类型检查（0 error）
npx vitest run                     # 单元测试（工具函数是主要覆盖对象）
npm run check                      # 前端规则检查
```

## 深链

- 工具/常量清单与职责划分 → [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md)「工具函数与常量」
- 审计日志端到端架构（前端 utils/audit ↔ 后端 audit_logs）→ [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md)「审计日志」
- 金额 INTEGER(分) 铁律与字段规范 → [docs/CONVENTIONS.md](../../docs/CONVENTIONS.md) + [docs/DATABASE_DESIGN.md](../../docs/DATABASE_DESIGN.md)
