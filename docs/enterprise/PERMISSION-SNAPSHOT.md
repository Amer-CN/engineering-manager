# 权限矩阵基线快照 · PERMISSION-SNAPSHOT

> **本文件是 M-EDITION1「版本分线」任务的权限基线快照（Permission Baseline Snapshot）。**
>
> - **基线 commit：** `46da1f8` / `master`
> - **生成日期：** 2026-07-31
> - **用途：** 冻结「拆分前」的权限现状，作为个人版 / 企业版分线的对照基线。
> - **原则：仅导出，不修差异。** 本快照只忠实记录当前源码状态，**不对齐、不修复、不合并**任何前端 / 后端权限差异。
> - 所有已识别的差异，其修复留待**企业版解冻时**统一处理，不在本任务范围内。
>
> **权威数据来源（真源，直接读取核对）：**
>
> - 前端：[`src/types/permissions.ts`](../../src/types/permissions.ts) → `SYSTEM_ROLES`（约 L76–L158）
> - 后端：[`EngineeringManager.Api/Common.cs`](../../EngineeringManager.Api/Common.cs) → `GetDefaultPermissions(string roleId)`（约 L119–L145）
>
> 说明采用中文，权限码 / 资源名 / 角色名 / 动作名一律保留英文标识符原样（如 `contracts:approve`、`costLedger`、`admin`）。

---

## 1. 概览

### 1.1 角色集合

| 侧 | 角色标识 | 中文名 |
|----|----------|--------|
| 前端 `SystemRole` | `admin` / `manager` / `accountant` / `worker` | 管理员 / 项目经理 / 财务人员 / 普通员工 |
| 后端 `GetDefaultPermissions` | `admin` / `manager` / `accountant` / `worker` | （同上，`_ => []` 兜底其它角色返回空权限） |

前后端角色集合**完全一致**（均为 4 个系统角色）。

### 1.2 资源清单

**前端 `PermissionResource` 类型定义（17 项，L19–L36）：**

`dashboard`, `projects`, `contracts`, `partners`, `members`, `wages`, `settlement`, `inventory`, `invoices`, `expenses`, `costLedger`, `drawings`, `knowledge`, `settings`, `users`, `roles`, `audit_logs`

> ⚠️ 注意：`costLedger` 虽在前端 `PermissionResource` 类型与 `RESOURCE_LABELS`（'成本台账'）中有定义，但**没有任何 `SYSTEM_ROLES` 角色实际授予 `costLedger:*` 权限**——即前端「类型有定义、角色未使用」。

**后端角色中额外出现、前端角色未授予的资源：**

- `costLedger`（前端类型有定义但角色未用；后端 `admin` / `manager` / `accountant` 均授予）
- `labor`（前端类型**完全未定义**；后端 `admin` / `manager` / `accountant` 授予 `labor:read`）
- `safeQuery`（前端类型**完全未定义**；后端 `admin` / `manager` 授予 `safeQuery:read`）

**前端角色使用、后端角色完全未出现的资源：**

- `expenses`（前端 `admin` / `manager` / `accountant` / `worker` 均有；后端全无——后端以 `costLedger` 承接成本口径）
- `drawings`（前端 `admin` / `manager` / `worker` 有；后端全无）

### 1.3 动作集合

前端 `PermissionAction` 类型（7 项，L14）：

`create`, `read`, `update`, `delete`, `export`, `import`, `approve`

> ⚠️ 后端 `GetDefaultPermissions` 未声明独立的动作枚举，实际使用的动作仅有 `create` / `read` / `update` / `delete` / `export`（`export` 仅出现于 `audit_logs:export`）。后端**从不授予 `import` 与 `approve`** 任何权限。

### 1.4 快照规模

- 参与矩阵的资源（前后端并集）：**19 个**
- 动作：**7 个**
- 实际出现的「资源 × 动作」组合（前后端任一侧出现过）：**78 行**
- 其中：**一致 23 行 / 差异 55 行**

---

## 2. 全量矩阵表（资源 × 动作 × 角色，前端 / 后端）

标记说明：`✓` = 该角色在该侧拥有此权限；`✗` = 无。结论列「一致」= 四个角色在前后端两侧完全相同；「差异」= 至少一个角色前后端不同。

| 资源 | 动作 | admin 前端 | admin 后端 | manager 前端 | manager 后端 | accountant 前端 | accountant 后端 | worker 前端 | worker 后端 | 结论 |
|------|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:----:|
| dashboard | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 一致 |
| dashboard | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| projects | create | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| projects | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 一致 |
| projects | update | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | 一致 |
| projects | delete | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| projects | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | 差异 |
| projects | import | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| contracts | create | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| contracts | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | 差异 |
| contracts | update | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | 一致 |
| contracts | delete | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| contracts | approve | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| contracts | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| contracts | import | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| partners | create | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| partners | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | 差异 |
| partners | update | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| partners | delete | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| partners | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| partners | import | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| members | create | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| members | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 一致 |
| members | update | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| members | delete | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| members | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| members | import | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| wages | create | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | 一致 |
| wages | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 一致 |
| wages | update | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | 一致 |
| wages | delete | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| wages | approve | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| wages | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| settlement | create | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| settlement | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | 一致 |
| settlement | update | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| settlement | delete | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| settlement | approve | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| settlement | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| inventory | create | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| inventory | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | 差异 |
| inventory | update | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| inventory | delete | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| inventory | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | 差异 |
| inventory | import | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| invoices | create | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | 一致 |
| invoices | read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | 差异 |
| invoices | update | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | 一致 |
| invoices | delete | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| invoices | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| expenses | create | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| expenses | read | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | 差异 |
| expenses | update | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| expenses | delete | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | 差异 |
| expenses | export | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | 差异 |
| costLedger | create | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | 差异 |
| costLedger | read | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | 差异 |
| costLedger | update | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | 差异 |
| costLedger | delete | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| drawings | create | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| drawings | read | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | 差异 |
| drawings | update | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| drawings | delete | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| drawings | export | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| drawings | import | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | 差异 |
| knowledge | read | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | 一致 |
| settings | read | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | 差异 |
| settings | update | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| users | create | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| users | read | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | 差异 |
| users | update | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| users | delete | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| roles | read | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | 差异 |
| roles | update | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 一致 |
| audit_logs | read | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | 差异 |
| audit_logs | export | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | 一致 |
| labor | read | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | 差异 |
| safeQuery | read | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | 差异 |

**矩阵合计：78 行 = 一致 23 行 + 差异 55 行。**

---

## 3. 差异清单（按类别分组）

> 下列所有条目均为**当前源码事实**，仅登记、不修复。「差异总计 55 条」与第 2 节矩阵的「差异 55 行」一一对应。

### A. 前端定义、后端未实现的 export / import / approve —— 小计 20 条

后端 `GetDefaultPermissions` 对 `export`（除 `audit_logs:export` 外）/ `import` / `approve` 均无授予，UI 层定义但后端无对应默认权限。

1. `dashboard:export`
2. `projects:export`
3. `projects:import`
4. `contracts:approve`
5. `contracts:export`
6. `contracts:import`
7. `partners:export`
8. `partners:import`
9. `members:export`
10. `members:import`
11. `wages:approve`
12. `wages:export`
13. `settlement:approve`
14. `settlement:export`
15. `inventory:export`
16. `inventory:import`
17. `invoices:export`
18. `expenses:export`
19. `drawings:export`
20. `drawings:import`

### B. 业务 CRUD 权限范围不对称（前端授予、后端未授予）—— 小计 19 条

`create` / `update` / `delete` 类权限在前端授予、后端未授予；涉及 admin / manager / accountant 的业务边界（后端保守收敛，manager / accountant 的写权限被清零；`expenses` / `drawings` 后端整资源缺失）。

1. `projects:create`（manager 前端有、后端无）
2. `projects:delete`（manager 前端有、后端无）
3. `contracts:create`（manager 前端有、后端无）
4. `partners:create`（manager 前端有、后端无）
5. `partners:update`（manager 前端有、后端无）
6. `members:create`（manager 前端有、后端无）
7. `members:update`（manager 前端有、后端无）
8. `settlement:create`（manager / accountant 前端有、后端无）
9. `settlement:update`（manager / accountant 前端有、后端无）
10. `inventory:create`（admin / manager 前端有、后端无）
11. `inventory:update`（admin / manager 前端有、后端无）
12. `inventory:delete`（admin 前端有、后端无）
13. `invoices:delete`（accountant 前端有、后端无）
14. `expenses:create`（后端无 expenses 资源）
15. `expenses:update`（后端无 expenses 资源）
16. `expenses:delete`（后端无 expenses 资源）
17. `drawings:create`（后端无 drawings 资源）
18. `drawings:update`（后端无 drawings 资源）
19. `drawings:delete`（后端无 drawings 资源）

### C. 后端有、前端无：`costLedger:*` —— 小计 4 条

后端将成本口径落在 `costLedger`，前端类型虽定义 `costLedger` 但无角色授予。

1. `costLedger:create`（后端 admin / accountant）
2. `costLedger:read`（后端 admin / manager / accountant）
3. `costLedger:update`（后端 admin / accountant）
4. `costLedger:delete`（后端 admin）

### D. 角色 read 权限不对称 —— 小计 10 条

同一资源的 `read` 权限在前后端授予的角色范围不一致。

1. `contracts:read`（worker 前端有、后端无）
2. `partners:read`（accountant / worker 前端有、后端无）
3. `inventory:read`（accountant / worker 前端有、后端无）
4. `invoices:read`（worker 前端有、后端无）
5. `expenses:read`（后端无 expenses 资源；前端 admin / manager / accountant / worker 有）
6. `drawings:read`（后端无 drawings 资源；前端 admin / manager / worker 有）
7. `settings:read`（manager 后端有、前端无）
8. `users:read`（manager 后端有、前端无）
9. `roles:read`（manager 后端有、前端无）
10. `audit_logs:read`（manager 后端有、前端无）

### E. 后端独有资源 `labor` / `safeQuery` —— 小计 2 条

前端类型完全未定义的后端系统资源。

1. `labor:read`（后端 admin / manager / accountant）
2. `safeQuery:read`（后端 admin / manager）

### 差异汇总

| 类别 | 说明 | 条数 |
|------|------|:----:|
| A | 前端有、后端无的 export / import / approve | 20 |
| B | 业务 CRUD 权限范围不对称（前端授予、后端未授予） | 19 |
| C | 后端有、前端无（`costLedger:*`） | 4 |
| D | 角色 read 权限不对称 | 10 |
| E | 后端独有资源（`labor` / `safeQuery`） | 2 |
| **总计** | | **55** |

---

## 4. 按角色分组的前端 vs 后端权限清单

> 逐角色列出：前端 `SYSTEM_ROLES` 权限列表、后端 `GetDefaultPermissions` 权限列表、以及双向差异，便于人工核对。

### 4.1 admin（管理员）

**前端（SYSTEM_ROLES `admin`，共 51 条）：**

```
dashboard:read, dashboard:export
projects:create, projects:read, projects:update, projects:delete, projects:export, projects:import
contracts:create, contracts:read, contracts:update, contracts:delete, contracts:approve, contracts:export, contracts:import
partners:create, partners:read, partners:update, partners:delete, partners:export, partners:import
members:create, members:read, members:update, members:delete, members:export, members:import
wages:create, wages:read, wages:update, wages:delete, wages:approve, wages:export
settlement:create, settlement:read, settlement:update, settlement:delete, settlement:approve, settlement:export
inventory:create, inventory:read, inventory:update, inventory:delete, inventory:export, inventory:import
invoices:create, invoices:read, invoices:update, invoices:delete, invoices:export
expenses:create, expenses:read, expenses:update, expenses:delete, expenses:export
drawings:create, drawings:read, drawings:update, drawings:delete, drawings:export, drawings:import
knowledge:read
settings:read, settings:update
users:create, users:read, users:update, users:delete
roles:read, roles:update
audit_logs:read, audit_logs:export
```

**后端（GetDefaultPermissions `admin`，共 45 条）：**

```
dashboard:read
projects:create, projects:read, projects:update, projects:delete
contracts:create, contracts:read, contracts:update, contracts:delete
partners:create, partners:read, partners:update, partners:delete
members:create, members:read, members:update, members:delete
wages:create, wages:read, wages:update, wages:delete
settlement:create, settlement:read, settlement:update, settlement:delete
inventory:read
invoices:create, invoices:read, invoices:update, invoices:delete
costLedger:create, costLedger:read, costLedger:update, costLedger:delete
settings:read, settings:update
users:create, users:read, users:update, users:delete
roles:read, roles:update
audit_logs:read, audit_logs:export
labor:read, safeQuery:read, knowledge:read
```

**差异：**

- 前端有、后端无：`dashboard:export`；`projects:export/import`；`contracts:approve/export/import`；`partners:export/import`；`members:export/import`；`wages:approve/export`；`settlement:approve/export`；`inventory:create/update/delete/export/import`；`invoices:export`；`expenses:create/read/update/delete/export`；`drawings:create/read/update/delete/export/import`
- 后端有、前端无：`costLedger:create/read/update/delete`；`labor:read`；`safeQuery:read`

### 4.2 manager（项目经理）

**前端（SYSTEM_ROLES `manager`，共 39 条）：**

```
dashboard:read, dashboard:export
projects:create, projects:read, projects:update, projects:delete, projects:export, projects:import
contracts:create, contracts:read, contracts:update, contracts:approve, contracts:export, contracts:import
partners:create, partners:read, partners:update, partners:export
members:create, members:read, members:update, members:export
wages:read, wages:export
settlement:create, settlement:read, settlement:update, settlement:export
inventory:create, inventory:read, inventory:update, inventory:export, inventory:import
invoices:read, invoices:export
expenses:create, expenses:read, expenses:update, expenses:export
drawings:create, drawings:read, drawings:update, drawings:export, drawings:import
knowledge:read
```

**后端（GetDefaultPermissions `manager`，共 18 条）：**

```
dashboard:read
projects:read, projects:update
contracts:read, contracts:update
partners:read
members:read
wages:read
settlement:read
invoices:read
inventory:read
costLedger:read
settings:read
users:read
roles:read
audit_logs:read
labor:read, safeQuery:read, knowledge:read
```

**差异：**

- 前端有、后端无：`dashboard:export`；`projects:create/delete/export/import`；`contracts:create/approve/export/import`；`partners:create/update/export`；`members:create/update/export`；`wages:export`；`settlement:create/update/export`；`inventory:create/update/export/import`；`invoices:export`；`expenses:create/read/update/export`；`drawings:create/read/update/export/import`
- 后端有、前端无：`costLedger:read`；`settings:read`；`users:read`；`roles:read`；`audit_logs:read`；`labor:read`；`safeQuery:read`

### 4.3 accountant（财务人员）

**前端（SYSTEM_ROLES `accountant`，共 34 条）：**

```
dashboard:read, dashboard:export
projects:read, projects:export
contracts:read, contracts:approve, contracts:export
partners:read, partners:export
members:read, members:export
wages:create, wages:read, wages:update, wages:approve, wages:export
settlement:create, settlement:read, settlement:update, settlement:approve, settlement:export
inventory:read, inventory:export
invoices:create, invoices:read, invoices:update, invoices:delete, invoices:export
expenses:create, expenses:read, expenses:update, expenses:delete, expenses:export
audit_logs:read, audit_logs:export
```

**后端（GetDefaultPermissions `accountant`，共 18 条）：**

```
dashboard:read
projects:read
contracts:read
members:read
wages:create, wages:read, wages:update
settlement:read
invoices:create, invoices:read, invoices:update
costLedger:create, costLedger:read, costLedger:update
settings:read
audit_logs:read, audit_logs:export
labor:read
```

**差异：**

- 前端有、后端无：`dashboard:export`；`projects:export`；`contracts:approve/export`；`partners:read/export`；`members:export`；`wages:approve/export`；`settlement:create/update/approve/export`；`inventory:read/export`；`invoices:delete/export`；`expenses:create/read/update/delete/export`
- 后端有、前端无：`costLedger:create/read/update`；`settings:read`；`labor:read`

### 4.4 worker（普通员工）

**前端（SYSTEM_ROLES `worker`，共 13 条）：**

```
dashboard:read
projects:read, projects:export
contracts:read, contracts:export
partners:read
members:read
inventory:read, inventory:export
invoices:read
expenses:read, expenses:export
drawings:read
```

**后端（GetDefaultPermissions `worker`，共 4 条）：**

```
dashboard:read
projects:read
members:read
wages:read
```

**差异：**

- 前端有、后端无：`projects:export`；`contracts:read/export`；`partners:read`；`inventory:read/export`；`invoices:read`；`expenses:read/export`；`drawings:read`
- 后端有、前端无：`wages:read`

---

## 5. 交叉校验说明

- 本快照的矩阵、差异分类与逐角色清单均**直接从源码 `src/types/permissions.ts` 与 `EngineeringManager.Api/Common.cs` 推导**，未做任何对齐或修复。
- 每个角色的权限条数为源码逐项统计：admin 前端 51 / 后端 45；manager 前端 39 / 后端 18；accountant 前端 34 / 后端 18；worker 前端 13 / 后端 4。
- 差异判定规则：某「资源 × 动作」组合，若四个角色在前后端两侧的持有情况完全相同则记为「一致」，否则记为「差异」。据此本快照差异合计 **55 条**（A 20 / B 19 / C 4 / D 10 / E 2）。
- 本文件仅为基线快照，不改动任何权限定义 / 迁移；差异修复留待企业版解冻时统一处理。

---

## R8.12 manager 写权限裁决与施工面盘点（2026-08-06）

**裁决（R9 落地，本轮只盘点不改代码）**：方案丙 —— manager 对其被授权项目内的记录：
可读、可改，**不可删**。删除仍限记录创建人本人或 admin。所有跨人修改必须落审计
（action 中标注被改记录的 created_by 与操作人 uid 不同）。仅影响企业版；个人版单用户不受影响。

### 施工面盘点（9 类资源 PUT/PATCH/DELETE，grep 原文）

| 资源 | 方法/路由 | WHERE 子句原文（grep） | 当前写侧口径 | 读侧口径 | 读写一致？ |
|---|---|---|---|---|---|
| drawings | PUT /api/drawings | `WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)` | created_by 独占 | 授权项目（GET 含 UserFilterWithAuthorizedProjects） | ❌ 不一致 |
| drawings | DELETE /api/drawings/{id} | 同 | created_by 独占 | — | ❌（R9 保持删除限 created_by） |
| attendances | PUT /api/attendances | `WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)` | created_by 独占 | 授权项目 | ❌ 不一致 |
| attendances | DELETE /api/attendances/{id} | 同 | created_by 独占 | — | ❌（删除保持） |
| wages | PUT /api/wages | `WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)` | created_by 独占 | 授权项目（GET 三分支） | ❌ 不一致 |
| wages | DELETE /api/wages/{id} | 同（软删 `deleted_at=@Now`） | created_by 独占 | — | ❌（删除保持） |
| invoices | PUT /api/invoices | `WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)` | created_by 独占 | 授权项目（GET R5.4） | ❌ 不一致 |
| invoices | DELETE /api/invoices/{id} | 同（软删） | created_by 独占 | — | ❌（删除保持） |
| payment_records | PUT /api/payment-records | `WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)` | created_by 独占 | 授权项目 | ❌ 不一致 |
| payment_records | DELETE /api/payment-records/{id} | 同（软删） | created_by 独占 | — | ❌（删除保持） |
| settlements | PUT /api/settlements | `WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)` | created_by 独占 | 授权项目（GET R5.4） | ❌ 不一致 |
| settlements | DELETE /api/settlements/{id} | 同（WriteResult） | created_by 独占 | — | ❌（删除保持） |
| settlements | PUT /{id}/process、/{id}/unarchive | 同 | created_by 独占 | — | ❌ 不一致 |
| contracts | PUT /api/contracts/income（expense/agreement 同构） | `WHERE id=@Id AND {UserFilterWithAuthorizedProjects(scope, "income_contracts.project_id")}` | **授权项目口径** | 授权项目 | ✅ 一致 |
| contracts | DELETE /api/contracts/{income,expense,agreement}/{id} | `WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)` | created_by 独占 | — | ❌ **同资源内 PUT/DELETE 不一致**（删除保持） |
| cost_ledger | PUT /api/cost-ledger | `WHERE id=@Id AND {UserFilterWithAuthorizedProjects(scope, "cost_ledger.project_id")}` | **授权项目口径** | 授权项目（R5.5） | ✅ 一致 |
| cost_ledger | DELETE /api/cost-ledger/{id} | 同 | **授权项目口径** | — | ✅（R5.5 已对齐） |
| cost_ledger_batches | PUT /api/cost-ledger/batches/{id} | `WHERE id=@Id AND {UserFilterCompany(scope)}` | UserFilterCompany（created_by 仅） | 授权项目（GET R5.5） | ❌ 不一致 |
| cost_ledger_batches | DELETE /api/cost-ledger/batches/{id} | 同 | UserFilterCompany | — | ❌（删除保持） |

### R9 施工面（读授权、写 created_by 的 PUT/PATCH 端点）

1. drawings PUT / api/drawings
2. attendances PUT /api/attendances
3. wages PUT /api/wages（含批量生成路径）
4. invoices PUT /api/invoices（+ PUT /api/invoices/{id}/status）
5. payment_records PUT /api/payment-records
6. settlements PUT /api/settlements（+ PUT /{id}/process、/{id}/unarchive）
7. contracts 三表 DELETE（同资源内 PUT 已授权、DELETE 未）
8. cost_ledger_batches PUT（读侧已授权、写侧 UserFilterCompany）

**删除端点全部保持 created_by 独占**（方案丙：不可删他人记录）；cost_ledger PUT/DELETE 已是授权口径（R5.5），不属于施工面。

### 跨人修改审计（R9 一并落地）

PUT/PATCH 生效行 created_by ≠ 操作人 uid 时，写 audit_logs（action 含修改人 + 被改记录 created_by）。
