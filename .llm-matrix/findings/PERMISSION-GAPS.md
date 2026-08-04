# PERMISSION-GAPS.md — 4 个权限码缺口（前端在用、后端权限表缺失）

> 生成：2026-08-04 · 状态：**待修复**（门禁 1 已按「已知缺口（待修复）」豁免并持续打印）
> 结论：**[功能失效]** —— 这 4 个功能对所有角色（含 admin）均无法使用，属功能缺失，**不是安全漏洞（非 FAIL-OPEN）**。

## 缺口清单（门禁报的行号为剥离注释后的提取行号）

| 权限码 | 调用点（真实文件行号） | 用途 |
|--------|------------------------|------|
| `projects:export` | `src/components/features/projects/ProjectFilters.tsx:61`（门禁报 59）| 导出按钮条件渲染 |
| `projects:export` | `src/components/Projects.tsx:67` | 导出守卫（toast + return） |
| `contracts:export` | `src/components/ContractPage.tsx:111`、`:273` | 导出守卫（toast + return）；导出按钮条件渲染 |
| `inventory:delete` | `src/hooks/useInventoryPage.ts:75`、`:124` | 删除守卫（toast + return） |
| `settlement:approve` | `src/components/features/settlement/SettlementProjectActions.tsx:116` | 办理守卫（toast + return） |
| `settlement:approve` | `src/hooks/useSettlementHandlers.ts:127` | 办理守卫（toast + return） |

> `ProjectFilters.tsx` 门禁行号比真实行号少 2：文件头 3 行块注释被门禁的注释剥离逻辑折叠成 1 行。

## 四个问题的答案

### 1. 前端 `can('projects:export')` 遇到不在权限列表里的码，返回 false 还是 true？

**返回 `false`，无「找不到就放行」兜底。**

- `usePermission().can` → `hasPermission()`（`src/types/permissions.ts:207-210`）：
  `if (!currentUser) return false; return currentUser.permissions.includes(permission)` —— 纯数组 `includes` 判定，**没有 admin 特判、没有 fail-open 分支**（`isAdmin()` 是独立函数，`hasPermission` 不调用它）。
- 权限列表来源：登录响应 `role.permissions`（`AuthEndpoints.cs:43,53` 从 `roles` 表读取 JSON）→ `authContextHelpers.ts:12-28 syncAuthSession` → `setCurrentUser`。即**前端权限 = 后端 roles 表 JSON**，不是 `src/types/permissions.ts` 里的静态 `SYSTEM_ROLES`（那只是角色编辑页的默认展示值）。
- `roles` 表种子数据：`Program.cs:615-628` 启动时用 `Common.GetDefaultPermissions(id)`（`Common.cs:121-156`）写入。4 个码在该函数中全部缺失 → 默认种子库里也不存在 → 所有角色（含 admin）`can()` 恒 `false`。

### 2. 这 4 个调用点的返回值用来干什么？

| 调用点 | 用法 | 后果 |
|--------|------|------|
| `ProjectFilters.tsx:61` | `{can('projects:export') && <Button>导出</Button>}` | 导出按钮**整块不渲染**（隐藏） |
| `ContractPage.tsx:111` | `if (!can(...)) { showToast; return }` | 导出处理函数**直接返回**（仅提示） |
| `useInventoryPage.ts:75/:124` | 同上 | 删除处理函数**直接返回**（仅提示） |
| `SettlementProjectActions.tsx:116` | 同上 | 办理（审批）处理函数**直接返回**（仅提示） |
| `useSettlementHandlers.ts:127` | 同上 | 办理处理函数**直接返回**（仅提示） |

全是按钮隐藏或「toast + return」守卫，无一处是仅文案提示。

### 3. 后端对应接口是否有 RequirePermission 校验？

**导出类：后端根本没有导出接口** —— `exportContracts` 是纯前端工具（`src/utils/export-import`），`ProjectEndpoints.cs` / `ContractEndpoints.cs` / `InventoryEndpoints.cs` 中无任何导出路由（全后端仅 `SystemEndpoints.cs:498` 有一个 `/api/health/export-json`，与本缺口无关）。不存在「后端兜底」，功能完全由前端 `can()` 决定。

**删除/审批类：后端有接口，但都不调 `HasPermission`**（`ContractEndpoints.cs` / `ProjectEndpoints.cs` / `InventoryEndpoints.cs` 中 `HasPermission` 调用数为 0）：
- `/api/inventory/{id}` DELETE（`InventoryEndpoints.cs:55`）：仅鉴权（GlobalAuthMiddleware）+ 用户维度 `created_by=@Uid OR @IsAdmin=1` 过滤
- `/api/settlements/{id}/process`（`ContractEndpoints.cs:464`）：同上，仅用户维度过滤
- `/api/settlements/{id}` DELETE（`ContractEndpoints.cs:457`）：同上

后端权限校验机制为 `CurrentUser.HasPermission`（`Security/CurrentUser.cs:127-151`）：admin 直接 true；非 admin 读 roles 表 JSON 做 `Contains`，**未知码 → false（fail-closed）**。但它只被 Knowledge/Report/Stt 端点使用。

### 4. 结论（二选一）

**⇒ [功能失效]** —— 这 4 个功能对所有角色（含 admin）都点不动，是**功能缺失，不是安全漏洞**。

理由：未知码在前端 `hasPermission` 中恒判 false（fail-closed），按钮隐藏 / 处理函数直接返回，任何人（含 admin）都无法通过 UI 触发。**不存在「找不到就放行」的 FAIL-OPEN 路径。**

## 附带观察（修复时参考，非本轮范围）

1. 修复方向：在 `Common.cs GetDefaultPermissions`（+ 已部署库的 roles 表 JSON，可能需要迁移脚本或角色重置端点 `AuthEndpoints.cs:208` 的默认值重写）补入 4 个码，并同步 `src/types/permissions.ts` 静态 SYSTEM_ROLES 保持展示一致。
2. 纵深缺口（既有问题，与本次缺码无关）：库存删除、结算办理/删除端点只做用户维度过滤、不查权限码——绕过前端直调 API 时，非本人创建的行会被 `created_by` 过滤挡住，但**任何登录用户仍可操作自己创建的行**（即使其角色本无该权限）。若需收紧，应在这些端点补 `CurrentUser.HasPermission`。
3. `useSettlementHandlers.ts:127`、`Projects.tsx:67`、`ContractPage.tsx:273`、`useInventoryPage.ts:124` 是同一权限码的其余调用点，修复后一并受益；门禁按码去重只报首个位置，白名单精确匹配的是门禁报出的 (码, 文件, 行号)。
