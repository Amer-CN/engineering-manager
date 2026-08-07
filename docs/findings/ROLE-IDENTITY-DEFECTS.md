# ROLE-IDENTITY-DEFECTS.md — 角色身份缺陷链（G50，M-FIX4 登记，只登记不修生产）

> 缺陷链：roles 表的数据与代码的硬编码映射不一致 → 企业版非 admin 角色权限全瘫 + PII 全脱敏。
> 测试基座（ApiTestBase.SeedTestData）已按生产【应有】状态 JSON 化 roles 来测——与当前生产库不一致，
> 差异清单见本文件。

## 第①层：roles.permissions 逗号串
- **证据**：`Migrations/Scripts/001_InitialSchema.sql:489` `('manager', '项目经理', 'project:read,project:write,wage:read,...')`
- **影响**：`CurrentUser.HasPermission`（CurrentUser.cs:127-150）`JsonSerializer.Deserialize<string[]>(逗号串)` 抛异常 → catch return false → 非 admin 全部权限码 false → 写端点全 403。
- **修复归属**：R9（迁移转 JSON）。

## 第②层：role name 不匹配
- **证据**：001 给 manager 的 name = 「项目经理」；登录端点（AuthEndpoints.cs:169）把 role name 写进 ClaimTypes.Role；`HasPermission` 中文映射（CurrentUser.cs:132）只认「经理」。
- **影响**：roleId 保持「项目经理」→ `SELECT permissions FROM roles WHERE id='项目经理'` 无行 → HasPermission false（所有权限码）。写端点全 403。
- **修复归属**：R9（name 归一或改用 role_id）。

## 第③层：同一 name 不匹配打到 ResolveRole（PII）
- **证据**：`CurrentUser.ResolveRole`（CurrentUser.cs:98-108）case 列表 = `管理员/admin→Admin / 经理/manager→Manager / 财务/accountant→Accountant / 工人/worker→Worker`，**不含「项目经理」**。
- **影响**：manager 登录 → claim=「项目经理」→ ResolveRole 落 `PiiRole.None` → `PiiReadable[None]` → 身份证/电话/银行卡/地址全被脱敏（manager 看不到 PII）。
- **修复归属**：R9（与第②层同源，一起修）。

## 第④层：finance vs accountant（已修）
- **证据**：001:490 用 `finance` 角色 id；master 迁移 038（H-1，`fix(permissions): 迁移 038 finance→accountant 角色 id 归一`）已建 accountant（name「财务」）、重映射用户、删 finance 行。
- **影响**：财务角色已修好；**但 038 没碰 manager 的 name（「项目经理」）和逗号串 → 经理仍全瘫**（第①-③层未修）。

## 测试基座对齐说明
ApiTestBase.SeedTestData 用 `INSERT OR REPLACE` + `GetDefaultPermissions` JSON 覆盖 roles 三行
（manager name 改「经理」对齐映射）——这是生产【应有】状态，非当前生产库现状。
生产修复见 R9（下方 042 草案）。
> **改号说明（M-FIX7 U3）**：原 039 号已被 M 窗口 PR #9 占用（039_AddKnowledgeFolders.sql），R9 roles 归一迁移改为 042。

## R9 迁移 042 草案（M-FIX4 Z6 起草，M-FIX7 U3 改号）

### 方案 A：迁移转 JSON + name 归一
- **动作**：042 迁移把 manager/worker 的 permissions 逗号串转 JSON 数组 + 把 manager 的 name 从「项目经理」改为「经理」（对齐 HasPermission/ResolveRole 映射）；accountant 已由 038 修好。
- **SQL 草案**：
  ```sql
  -- 1) permissions 逗号串转 JSON 数组
  UPDATE roles SET permissions =
    CASE WHEN permissions LIKE '%,%' AND permissions NOT LIKE '[%' THEN
      '["' || replace(permissions, ',', '","') || '"]' ELSE permissions END;
  -- 2) manager name 归一（对齐 CurrentUser.cs:132 映射）
  UPDATE roles SET name='经理' WHERE id='manager' AND name='项目经理';
  ```
- **影响面**：一次性迁移，修 manager/worker 全部权限；风险 = 逗号串转 JSON 的拼接正确性（需验证 replace 转义）。
- **风险**：若 permissions 已有 JSON 形态（`[%`）会误转 → 需 `NOT LIKE '[%'` 守卫；name 归一影响前端显示（「项目经理」→「经理」）。

### 方案 B（审查方倾向）：登录时把 role_id 写进 claim，映射优先读 role_id
- **动作**：登录端点（AuthEndpoints.cs:169）额外写 `ClaimTypes.NameIdentifier` 或自定义 claim 存 role_id（'manager'/'accountant'/'worker'）；HasPermission / ResolveRole 优先按 role_id 查，中文 name 映射只作兼容兜底。
- **影响面**：代码层修改（登录 + HasPermission + ResolveRole），不碰 roles 数据；从此不再依赖 name 字面量 → 第②③层根治（name 怎么变都不影响）。
- **风险**：需保证旧 token（无 role_id claim）兼容兜底；JWT 结构变化需前端同步。

### 推荐
**方案 B**——它根治第②③层（name 依赖），且对已存在生产库零数据迁移风险；
第①层（逗号串→JSON）仍需一次迁移（方案 A 的 SQL 第 1 步），可与 B 并行。
A 的 name 归一可作为 B 的兜底兼容（新旧 token 都认）。
