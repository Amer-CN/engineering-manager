# F2 三分类盘点报告（返工版 v2）

> 基线 commit：`5fb0241` / origin/master
> 生成时间：2026-08-01
> 状态：纯报告，等审。不含任何代码修改。

---

## X1 Git 分叉状况（最高优先）

### 当前状态

| 项目 | 值 |
|------|-----|
| 当前分支 | `feat/folderstack3d-react` |
| origin/master HEAD | `5fb0241`（chore: 清理 expenses 孤儿方法） |
| 本地 master | `5fb0241`（与 origin/master 同步） |
| 当前分支领先 origin/master | **14 个 commit**（全部是 FolderStack3D / 设计 / CI 工作） |
| 未提交改动 | **64 个文件**（M-EDITION1 全部工作 + 其他未提交功能） |
| M-EDITION1 代码是否已进 git | **否**。全部在工作区，未 commit |

### origin/master 迁移目录真态

```
git ls-tree origin/master --name-only EngineeringManager.Api/Migrations/Scripts/ | tail
→ 最新为 032_DropExpensesTable.sql
```

**不存在** `032_AddAgentConversationArchive.sql`、`033_AddKnowledgeEntitySeeds.sql` 于 origin/master。
这两个文件是本地未推送的 untracked 文件。

### 本地未推送的迁移文件（untracked）

| 本地文件 | 状态 |
|----------|------|
| `032_AddAgentConversationArchive.sql` | **与 origin/master 的 `032_DropExpensesTable.sql` 撞号** |
| `033_AddKnowledgeEntitySeeds.sql` | 本地独有，origin/master 无 033 |
| `034_AddUserProfileFields.sql` | 本次 M-EDITION1 新建 |

### 版本真源核实

| 来源 | 值 |
|------|-----|
| `package.json`（工作区） | `0.90.1` |
| `package.json`（origin/master） | `0.90.1` |
| commit dc23d8c 消息 | "bump 0.90.1" |
| commit 0d5c02f 消息 | "0.90.x master 线" |

**结论**：三者一致，均为 `0.90.1`。审查所述「package.json 显示 0.86.0」与仓库实际不符（已核实 origin/master 和工作区均为 0.90.1）。

### 处理方案

1. M-EDITION1 工作应从 `origin/master`（`5fb0241`）新开分支，不继承 `feat/folderstack3d-react` 的 14 个无关 commit
2. 迁移编号重排：
   - `032_AddAgentConversationArchive.sql` → **033**（让出 032 给 origin/master 的 DropExpensesTable）
   - `033_AddKnowledgeEntitySeeds.sql` → **034**
   - `034_AddUserProfileFields.sql` → **035**
3. 重命名只改文件名，不改内容。MigrationRunner 按全名排序，已有安装如果跑过旧名会在 `schema_versions` 留下旧记录——但这些文件从未推送/发布，不存在已安装用户跑过的情况

---

## 2.1 三分类盘点（四栏对齐）

### [保留] Keep — 个人版完整可用

| 前端路由 | 前端组件 | 后端端点 | DB 表 |
|----------|----------|----------|-------|
| `/login`（App.tsx 未认证分支） | `Login.tsx`, `LockScreen.tsx` | `POST /api/auth/login` L20 | `users`（认证用） |
| —（App.tsx 内嵌） | `App.tsx` passwordIsDefault 提示 | `POST /api/auth/change-password` L88 | `users` |
| —（App.tsx 内嵌） | — | `POST /api/auth/reset-password` L60 | `users` |
| `settings` | `Settings.tsx`, `AccountSection.tsx` | `GET/PUT /api/user-preferences` | `user_preferences` |
| `settings`（子区） | `AccountSection.tsx`「公司与专业信息」 | `GET/PUT /api/user-profile` | `users`（035 新增 4 列） |
| —（嵌入各页） | `AuditLogs.tsx`, `AuditDetailModal.tsx` | `GET /api/audit/logs` L99, `GET /api/audit/stats` L133 | `audit_logs` |
| —（全局） | — | `GET /api/config` L250 | —（读 config.json） |
| 全部业务页面 | 全部业务组件 | 全部业务 CRUD 端点 | 27 张业务表 + cloud sync 5 列（024） |

### [冻结] Freeze — personal 模式不可见/不可调用（代码禁用）

| 前端路由 | 前端组件 | 后端端点 | DB 表 |
|----------|----------|----------|-------|
| `users`（路由守卫 → Dashboard） | `Users.tsx`（整体）, `UserListTab.tsx`, `userListColumns.tsx` | `GET /api/users`, `GET /api/users/{id}`, `POST /api/users`, `PUT /api/users`, `DELETE /api/users/{id}` | `users`（CRUD 冻结，认证保留） |
| `users` → 角色权限 Tab | `RolePermissionsTab.tsx`（整体） | `GET /api/roles`, `GET /api/roles/{id}`, `PUT /api/roles`, `POST /api/roles/{id}/reset` | `roles` |
| —（无独立路由） | — | `GET/POST/DELETE /api/admin/project-authorizations`（4 个端点） | `project_authorizations`（013） |
| —（逻辑分支） | `src/types/permissions.ts` SYSTEM_ROLES manager/accountant/worker 分支 | — | — |
| —（逻辑分支） | `usePermission.tsx` / `permissionHelpers.tsx` RequirePermission / RequireAdmin | — | — |
| —（菜单项） | `Sidebar.tsx`「用户管理」按钮 | — | — |

### [降级] Degrade — 代码保留但行为改变（personal 下退化为恒真/单用户）

| 前端路由 | 前端组件 | 后端端点/逻辑 | 说明 |
|----------|----------|---------------|------|
| —（无 UI 变化） | — | `CurrentUser.GetDataScope()` personal 恒返 `DataScope.All` | 多用户分支保留但永不触发 |
| —（无 UI 变化） | — | `UserFilterCompany(scope)` → `(1=1)` | SQL 片段保留，personal 下恒真 |
| —（无 UI 变化） | — | `UserFilterWithAuthorizedProjects(scope)` → `(1=1)` | 同上 |
| —（无 UI 变化） | — | `GET /api/audit/logs` L106-L108 按 user_id 过滤 | personal 单用户，过滤等价于无 |

> **解冻注意**：[降级] 项在 enterprise 下自动恢复原行为（DataScope 按角色映射），无需「恢复代码」操作。与 [冻结] 项（需移除 gate）不同。

### [待定] Undetermined — 需产品裁决

| 前端路由 | 前端组件 | 后端端点 | DB 表 |
|----------|----------|----------|-------|
| —（不存在） | —（未实现） | —（未实现） | `sync_queue`（025）, `device_registrations`（025）— **dormant，已批准保留不冻结** |
| `settings`（子区） | 备份恢复 / PII 密钥轮换 UI（未实现） | `PiiKeyEndpoints` rotate/reencrypt（已实现但 UI 未做） | `pii_keys` |
| —（筛选维度） | N/A — 未实现（AuditFilterBar 当前无按用户下拉） | N/A | N/A |

---

## X4 破坏性 admin 端点（personal 下风险评估）

personal 下 owner 恒为 admin，以下端点变为无门槛可调：

| 端点 | 风险 | 与本次任务的冲突 |
|------|------|------------------|
| `POST /api/audit/clear` | 一键清空全部审计日志 | 直接与「误操作追溯」定位冲突——可清空的日志不具备追溯价值 |
| `POST /api/audit/logs` | 客户端可写入任意审计条目 | 配合 clear 使审计整体不可信（先 clear 再伪造） |
| `POST /api/admin/unmask-pii` | 解密任意记录 PII 明文 | personal 下无「他人隐私」问题，但设备共享场景仍有风险 |
| `POST /api/admin/backfill-pii` | 触发全库 PII 重加密 | 破坏性低（幂等），但无 UI 入口时不应暴露 |

### 处理建议（只建议不改代码）

| 端点 | 建议方案 | 理由 |
|------|----------|------|
| `POST /api/audit/clear` | personal 下**禁用**（返回 404）或改为需密码复验 | 与产品定位直接矛盾 |
| `POST /api/audit/logs` | 保留但**不暴露 UI**（当前已是纯后端写入，前端通过 `logAudit` 工具函数调用） | 前端无法直接构造任意条目（需经过 audit logger） |
| `POST /api/admin/unmask-pii` | 保留，personal 下合理（owner 看自己的数据） | 设备共享场景用锁屏防护 |
| `POST /api/admin/backfill-pii` | 保留，**不暴露 UI**（当前无 UI） | 幂等，仅迁移场景用 |

---

## 2.2 权限矩阵快照

### 来历

`docs/enterprise/PERMISSION-SNAPSHOT.md`（426 行）是**步骤 1 交接产出**，由上一轮会话（步骤 1 调研）创建。
当前为 untracked 文件（`docs/enterprise/` 整个目录未推送至 origin/master）。

上一轮全部产出文件（补全变更清单）：

| 文件 | 类型 |
|------|------|
| `docs/enterprise/HANDOFF-STEP1.md` | 新建（步骤 1 交接文档） |
| `docs/enterprise/PERMISSION-SNAPSHOT.md` | 新建（权限矩阵快照） |
| `docs/enterprise/FREEZE-CONTRACT.md` | 新建（冻结契约） |
| `docs/enterprise/F2-TRIAGE-REPORT.md` | 新建（本报告） |

### 差异分类摘要（55 处，按资源分组）

| 资源 | 差异数 | 差异性质 |
|------|--------|----------|
| `costLedger` | 12 | 前端类型有定义但 SYSTEM_ROLES 未授予；后端 admin/manager/accountant 均授予 |
| `labor` | 7 | 前端类型**完全未定义**；后端 3 角色授予 `labor:read` |
| `safeQuery` | 7 | 前端类型**完全未定义**；后端 admin/manager 授予 `safeQuery:read` |
| `expenses` | 7 | 前端 4 角色均有；后端**全无**（后端以 costLedger 承接） |
| `drawings` | 7 | 前端 admin/manager/worker 有；后端**全无** |
| `invoices` | 5 | 前端授予 `import`/`approve`；后端从不授予这两个动作 |
| `contracts` | 4 | 前端有 `approve`；后端无 |
| `settlement` | 3 | 前端有 `approve`；后端无 |
| `audit_logs` | 2 | 前端 admin 有 `export`；后端有 `export` 但角色映射不一致 |
| `users`/`roles` | 1 | 前端 admin 有 `users:*`/`roles:*`；后端不校验权限码（只校验登录） |

**核心差异性质**：前端定义了 7 种动作（含 import/approve），后端实际只用 5 种（从不授予 import/approve）。后端 RBAC 形同虚设——只校验「是否登录」，不校验「是否有权限码」。

---

## 2.3 users 表主键类型 + 云端绑定预留列

### 主键类型

```sql
-- 001_InitialSchema.sql L375-L389
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,   -- ← TEXT（UUID 风格），非自增整数
    username TEXT UNIQUE NOT NULL,
    ...
);
```

**结论**：`users.id` 是 **TEXT**，种子管理员 id 为 `"1"`（字符串），后续用户 id 格式为 `"user-{timestamp}"`。

### 云端绑定预留列

**无** `cloud_account_id` 或任何云端账号绑定列。

`device_registrations` 表（025）有 `user_id INTEGER NOT NULL`，但：
- 该表从未被任何 C# 端点或前端代码引用（grep 全库 0 命中）
- `user_id` 类型为 `INTEGER`，与 `users.id TEXT` 存在类型不匹配
- 该表属于「阶段 1 只建表不实现」的遗留产物

---

## 2.4 云同步归属判断

**已批准**：保留、不冻结。sync_queue / device_registrations 标记 dormant。

（论证见 v1 版，此处不重复。裁决理由：version 列已被乐观锁使用；sync 表零引用无行为可冻；语义差异是阶段 2 未来时。）

---

## 2.5 迁移编号交代（已纠错）

### 事实纠正

上一版错误地将本地 untracked 文件当作远端 master 存在。实际情况：

| 编号 | origin/master | 本地（untracked） |
|------|---------------|-------------------|
| 032 | `032_DropExpensesTable.sql` ✅ | `032_AddAgentConversationArchive.sql` ❌ **撞号** |
| 033 | 不存在 | `033_AddKnowledgeEntitySeeds.sql`（本地独有） |
| 034 | 不存在 | `034_AddUserProfileFields.sql`（本次新建） |

### 处理方案

1. `032_AddAgentConversationArchive.sql` → 重命名为 **`033_AddAgentConversationArchive.sql`**
2. `033_AddKnowledgeEntitySeeds.sql` → 重命名为 **`034_AddKnowledgeEntitySeeds.sql`**
3. `034_AddUserProfileFields.sql` → 重命名为 **`035_AddUserProfileFields.sql`**
4. 安全性：这三个文件从未推送/发布，不存在已安装用户跑过的情况，重命名无兼容风险

### 历史编号问题

| 问题 | 影响 | 处理建议 |
|------|------|----------|
| 011 重号（两个文件） | 无功能影响（MigrationRunner 按全名排序） | 不改历史，补文档说明 |
| 015 缺号 | 无功能影响 | 不改，补文档说明 |
| 007b 非标准后缀 | 无功能影响 | 不改 |

---

## X6 解冻清单第一条补强

`FREEZE-CONTRACT.md` 解冻第一条应改为：

> **后端补齐端点级 RBAC**
>
> 证据：当前权限检查**仅存在于前端**：
> - `src/hooks/usePermission.tsx` — `RequirePermission` / `RequireAdmin` 组件守卫
> - `src/hooks/permissionHelpers.tsx` — 守卫实现（读 `currentUser.permissions` 数组）
>
> 后端 `GlobalAuthMiddleware` 只校验「是否登录」（JWT 有效），**不校验权限码**。
> `CurrentUser.HasPermission(ctx, db, "xxx:read")` 方法存在（L127-L151）但**无任何端点调用它**。
>
> 企业版上线前，每个冻结端点解冻时必须同时接入 `HasPermission` 校验，否则绕过前端即可越权。

---

## X7 阶段 2 阻断项登记（不实施）

### 7.1 device_registrations.user_id 类型不匹配

- **现状**：`device_registrations.user_id INTEGER NOT NULL`（025 L45）
- **冲突**：`users.id TEXT PRIMARY KEY`（001 L376）
- **后果**：SQLite 类型 affinity 规则下，`INTEGER` 与 `TEXT` 做 JOIN 时**静默返回 0 行**（不报错）
- **阶段 2 必修**：重建 `device_registrations` 表，`user_id` 改为 `TEXT`。禁止用 `CAST` 兼容查询绕过
- **现在不动**

### 7.2 users.id 碰撞风险

- **现状**：种子管理员 id = `"1"`（每台安装相同）；其余用户 id = `"user-{UnixMilliseconds}"`
- **风险**：
  - 每台安装的 owner 都是 `"1"`，上云后多设备合并时无法区分
  - 同毫秒建号理论上可撞（极低概率但非零）
- **禁止改主键**：`users.id` 被 27 张表 `created_by` 列引用，改主键 = 全库迁移
- **方案**：新增 `global_uuid TEXT` 可空列（迁移脚本），安装时生成 UUID v4，云端映射用它，本地 `id` 不动
- **现在只登记，不实施**

---

## 附录：证据来源

| 结论 | 证据 |
|------|------|
| origin/master 最新迁移 = 032_DropExpensesTable | `git ls-tree origin/master --name-only ...Scripts/` |
| 本地 14 commit 领先 | `git log --oneline origin/master..HEAD`（14 行） |
| 64 个未提交文件 | `git status --short`（64 行） |
| package.json = 0.90.1 | `git show origin/master:package.json` + 工作区 |
| users.id TEXT | `001_InitialSchema.sql` L376 |
| sync 表零引用 | grep `sync_queue\|device_registrations` 全库 0 命中 |
| MigrationRunner 按全名排序 | `MigrationRunner.cs` L32-L35 |
| PERMISSION-SNAPSHOT 为步骤 1 产出 | `git status` 显示 `docs/enterprise/` 为 untracked |
| HasPermission 无调用者 | grep 全库仅定义处 1 命中 |


---

## 11.6 技术债登记：反射测试脆弱性

**涉及测试**：`AgentKnowledgeToolTests.E2_SystemPrompt_ContainsKnowledgeSecurityWarning`
和 `E3_SystemPrompt_ContainsSearchKnowledgeBaseGuidance`

**被反射调用的方法**：`AgentEndpoints.BuildSystemPrompt(HttpContext, IDbConnection)`
（private static，通过 BindingFlags.NonPublic | BindingFlags.Static 访问）

**风险**：方法签名一变即抛 TargetParameterCountException，编译期无保护。
AgentEndpoints 是 F1 之后还要继续动的区域（AI 助手功能迭代）。

**建议修复方向**（不在本轮实施）：
- 将 BuildSystemPrompt 改为 internal + InternalsVisibleTo 测试项目
- 或提取为独立 service 类（如 SystemPromptBuilder），通过 DI 注入，测试直接构造

---

## 11.8 修正：265e976 处置方案

### 方案 B 风险纠正

原报告写「改写已有 commit（但尚未推送，安全）」——**错误**。
`backup/pre-edition-split` 已在 X10.1 把 265e976 推到远端。
rebase 后 backup 分支仍指向旧 265e976，会留下两份并行历史。

### 方案 C 前置条件问题

方案 C 依赖另一会话配合推送，而对方至今一次都没推送过。
该前置条件不在我们控制内。

### Fallback 方案（不依赖另一会话）

**方案 D：feat/edition-split 独立合入 master，265e976 自然失效**

1. `feat/edition-split` 通过 PR 合入 master（M-EDITION1 干净 6+commit）
2. 另一会话的工作（Reports / Knowledge / Univer）仍在 265e976 中
3. 另一会话最终需要基于合入后的 master 重新 rebase/cherry-pick 自己的工作
4. 265e976 中的 M-EDITION1 部分在 master 已有等价版本，rebase 时自动 drop（git 检测 patch 已应用）
5. `backup/pre-edition-split` 保留至另一会话完成推送后可删除

**优点**：不依赖另一会话配合，不需要 force-push，不改写已推送历史。
**缺点**：另一会话 rebase 时会看到 M-EDITION1 冲突（但 git rerere 或手动 resolve 即可）。
