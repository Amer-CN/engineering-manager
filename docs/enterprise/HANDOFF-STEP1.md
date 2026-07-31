# M-EDITION1 版本分线与企业功能冻结 — 步骤 1 交接文档

> 基线 commit：46da1f8 / master（2026-07-31）
> 生成时间：2026-08-01
> 状态：步骤 1（调研 + 快照）已完成，步骤 2-6 待执行

---

## §1 任务与基线

### 任务名称
M-EDITION1 版本分线与企业功能冻结 v2

### 产品拆分边界
- **个人版（personal）保留**：单账号 + 密码登录 + 审计日志 + PII 加密
- **冻结区**：仅冻结【多账号 / 角色 / 权限授予】一层，**不冻整个账号体系**

### 三条铁律
1. **只冻代码不冻数据** — `users` / `roles` / `project_authorizations` / `created_by` 等表和列保留，禁止删表删列迁移
2. **冻结区代码必须继续编译跑测试** — 禁止删除其对应测试
3. **企业版（enterprise）功能原样可用** — 冻结不等于删除

---

## §2 步骤 1 交付物清单

| # | 交付物 | 路径 |
|---|--------|------|
| 1 | 三分类清单（保留/冻结/待定） | 本文档 §3 |
| 2 | 权限快照（19 资源 × 7 动作 = 78 组合，前后端差异 55 处） | `docs/enterprise/PERMISSION-SNAPSHOT.md` |
| 3 | 数据库 schema 核实结论 | 本文档 §4 |

---

## §3 三分类清单

### 3.1 保留 Keep

#### 前端 — 登录 / 锁屏
- `src/components/Login.tsx`
- `src/components/LockScreen.tsx`
- `src/App.tsx` — `passwordIsDefault` 提示逻辑（约 L88-L103）

#### 前端 — 设置 / 个人资料
- `src/components/Settings.tsx`
- `src/components/features/settings/AccountSection.tsx`
- `src/constants/settingsIndex.ts`

#### 前端 — 审计日志
- `src/components/AuditLogs.tsx`
- `src/components/AuditFilterBar.tsx`
- `src/components/AuditDetailModal.tsx`

#### 后端 — 登录 / 密码
- `EngineeringManager.Api/Endpoints/AuthEndpoints.cs`
  - `POST /api/auth/login` L20
  - `POST /api/auth/change-password` L88
  - `POST /api/auth/reset-password` L60

#### 后端 — 审计日志
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs`
  - `GET /api/audit/logs` L99
  - `POST /api/audit/logs` L113
  - `GET /api/audit/stats` L133
  - `POST /api/audit/clear` L153

#### 后端 — PII 加密
- `EngineeringManager.Api/Endpoints/PiiKeyEndpoints.cs` — `keys` / `rotate` / `reencrypt`
- `EngineeringManager.Api/Endpoints/AuthEndpoints.cs`
  - `POST /api/admin/backfill-pii` L258
  - `POST /api/admin/unmask-pii` L408
- `EngineeringManager.Api/Security/PiiProtector.cs` — AES-GCM + DPAPI 实现

#### 后端 — 用户偏好 / 个人资料
- `EngineeringManager.Api/Endpoints/UserPreferencesEndpoints.cs`
  - `GET /api/user-preferences` / `PUT /api/user-preferences` L28
  - `GET/PUT /api/user-preferences/{key}` L71

#### 后端 — 配置查询
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs`
  - `GET /api/config` L250

---

### 3.2 冻结 Freeze

#### 前端 — 用户管理页面
- `src/components/Users.tsx` — 整体（`RequireAdmin` 守卫约 L142）
- `src/components/features/users/UserListTab.tsx`
- `src/components/features/users/userListColumns.tsx`

#### 前端 — 角色权限 Tab
- `src/components/RolePermissionsTab.tsx` — 整体

#### 前端 — 权限类型定义
- `src/types/permissions.ts` — `SYSTEM_ROLES`（`admin` / `manager` / `accountant` / `worker` 分支逻辑）

#### 前端 — 路由守卫
- `src/hooks/usePermission.tsx` — `RequirePermission` / `RequireAdmin`（re-export from `permissionHelpers`）
- `src/hooks/permissionHelpers.tsx` — 守卫组件实现
- `src/routes.ts` — `getFilteredSidebarRoutes` L262-L270

#### 前端 — 菜单过滤
- `src/App.tsx` — `useEffect` 菜单过滤逻辑（约 L102-L112）
- `src/components/Sidebar.tsx` — `users` 菜单项硬编码

#### 后端 — 用户 CRUD 端点
- `EngineeringManager.Api/Endpoints/AuthEndpoints.cs`
  - `GET /api/users` L213
  - `GET /api/users/{id}` L216
  - `POST /api/users` L222
  - `PUT /api/users` L233
  - `DELETE /api/users/{id}` L252
  - **注意**：`POST /api/admin/backfill-pii` L258 属保留区，仅冻结用户 CRUD

#### 后端 — 角色端点
- `EngineeringManager.Api/Endpoints/AuthEndpoints.cs`
  - `GET /api/roles` L184
  - `GET /api/roles/{id}` L187
  - `PUT /api/roles` L193
  - `POST /api/roles/{id}/reset` L200

#### 后端 — 项目授权端点
- `EngineeringManager.Api/Endpoints/AuthEndpoints.cs`
  - `GET /api/admin/project-authorizations` L341
  - `GET /api/admin/project-authorizations/by-user/{userId}` L354
  - `POST /api/admin/project-authorizations` L365
  - `DELETE /api/admin/project-authorizations/{projectId}/{userId}` L393

#### 后端 — DataScope 体系
- `EngineeringManager.Api/Security/CurrentUser.cs`
  - `DataScope` enum（约 L28）
  - `GetDataScope()` 方法
  - `UserFilterCompany()` L54
  - `UserFilterWithAuthorizedProjects()` L64

#### 后端 — SQL 过滤使用点
以下端点的 `WHERE` 条件中使用了 `UserFilterCompany(scope)` 或 `UserFilterWithAuthorizedProjects`：

| 文件 | 行号 |
|------|------|
| `EngineeringManager.Api/Endpoints/MemberEndpoints.cs` | L28 / L55 / L124 / L149 |
| `EngineeringManager.Api/Endpoints/InvoiceEndpoints.cs` | L32 / L90 |
| `EngineeringManager.Api/Endpoints/ContractEndpoints.cs` | L286 |
| `EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs` | L28 / L41 / L157 |

#### 后端 — 审计按用户过滤
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs`
  - `GET /api/audit/logs` L106-L108 — admin 看全部 / 普通用户看自己

---

### 3.3 待定 Undetermined

| 项目 | 现状 | 建议 |
|------|------|------|
| 前端「按用户筛选」审计维度 | `AuditFilterBar` 当前无此下拉；后端 L106-L108 仍按 `user_id` 过滤 | 个人版改为恒真（`WHERE 1=1`） |
| 前端 edition 开关消费点 | 目前不存在 | 步骤 2 新建 |
| 设置中心「备份恢复」「PII 密钥轮换」等 admin 项 | 目前未实现 | 企业版才启用 |

---

## §4 数据库 schema 核实结论

### users 表
- **主键**：`TEXT`（UUID 风格，非自增整数）
- **建表位置**：`EngineeringManager.Api/Migrations/Scripts/001_InitialSchema.sql` L374-L389
- **cloud_account_id 预留列**：无。云端绑定通过 `device_registrations` 表（Migration 025，`device_registrations.user_id` 外键到 `users.id`）

### roles 表
- **建表位置**：`001_InitialSchema.sql` L365-L372
- **结构**：`id TEXT PRIMARY KEY`（值为 `'admin'` / `'manager'` / `'accountant'` / `'worker'`），`permissions TEXT`（JSON），`is_system INTEGER`

### project_authorizations 表
- **建表位置**：`013_AddProjectAuthorizations.sql` L16-L22
- **主键**：复合主键 `(project_id, user_id)`

### created_by 列分布
- 全库 **29 张业务表**有 `created_by` 列：
  - Migration 009：+19 张
  - Migration 011：+2 张
  - Migration 014：+7 张
  - Migration 020：+1 张

### 迁移脚本总览
- 编号 001–032，共 **32 个**迁移脚本
- 详见 `docs/enterprise/PERMISSION-SNAPSHOT.md` 所在目录的调研产出

---

## §5 顺手修的真 bug（步骤 5 执行）

### 5.1 CostLedger user-dim 过滤缺失

**文件**：`EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs`

| 端点 | 行号 | 问题 |
|------|------|------|
| `PUT /api/cost-ledger` | L60-L69 | 缺 `AND (created_by=@Uid OR @IsAdmin=1)`，`scope` L63 死变量 |
| `DELETE /api/cost-ledger/{id}` | L71-L76 | 同上，`scope` L74 死变量 |
| `PUT /api/cost-ledger/batches/{id}` | L180-L187 | 同上，`scope` L183 死变量 |
| `DELETE /api/cost-ledger/batches/{id}` | L189-L194 | 同上，`scope` L192 死变量 |

**对标**：`EngineeringManager.Api/Endpoints/InvoiceEndpoints.cs` L59
```sql
WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)
```

### 5.2 PUT /api/config/data-path 未登录可调用

**文件**：`EngineeringManager.Api/Endpoints/SystemEndpoints.cs` L283-L350

- 白名单 `GlobalAuthMiddleware.cs` L52 放行（允许首次启动安装后设置数据路径）
- 内部 L287-L289 仅**已登录**才做 admin 检查 → **未登录完全绕过**
- 修复时机：个人版有登录墙时修复

### 5.3 GlobalAuthMiddleware 白名单前缀匹配

**文件**：`EngineeringManager.Api/GlobalAuthMiddleware.cs` L42

```csharp
path.StartsWith(p, StringComparison.OrdinalIgnoreCase)
```

白名单前缀列表 L16-L23：
- `/api/auth/login`
- `/api/health`
- `/api/ocr/setup`
- `/api/agent/setup`
- `/api/update/download`

**边界问题**：
- `/api/healthz` 会被 `/api/health` 前缀匹配放行
- `/api/auth/loginx` 会被 `/api/auth/login` 前缀匹配放行

**修复方向**：改为精确相等或要求路径后接 `/`

---

## §6 步骤 2-6 实施要点

### 步骤 2 — 版本开关

1. **config.json** 加 `edition` 字段：`"personal"` | `"enterprise"`，默认 `"personal"`
2. **后端**启动时读取，经 `GET /api/config` 下发
3. **前端**启动从同一处消费（建议 `src/App.tsx` 启动 `useEffect` + 全局 store）
4. **GetDataScope** personal 模式直接返回 admin scope，使 `UserFilter*` 恒真（保留代码片段本身）
5. personal 下 `users.role_id` 恒为 `'admin'`，`created_by` 正常写 owner ID 不为 `null`

### 步骤 3 — 四层冻结

| 层 | 动作 | 验收 |
|----|------|------|
| 3.1 后端 | 冻结端点统一 gate，personal 返回 **404**（不用 403） | curl 逐一验证 |
| 3.2 前端路由 | 守卫拦截手敲 URL → 重定向首页 | 浏览器截图 |
| 3.3 侧边栏 / 设置入口 | 隐藏冻结区菜单 | 目视确认 |
| 3.4 组件渲染 | 保留由 edition 开关控制渲染 | 组件不挂载 |

### 步骤 4 — 个人版新增功能

#### 4.1 设置中心「个人资料」新增字段
- 公司名称、职位、工种/专业、主要业务描述
- **硬性要求**：确认 AI 助手实际读到这些字段（查 `EngineeringManager.Api/Services/` 下 agent 相关 services 和表，给实证）

#### 4.2 人事模块隔离约束
- 个人资料属账号资料（`users` 表相关）
- 人事模块 `members` 表是两张皮
- **禁止**合并 / 双向同步，只可做「从账号资料填充」单向按钮

#### 4.3 审计日志改定位
- 字段与写入不动
- 页面文案 / 筛选器从追责视角改为**操作历史 / 误操作追溯**
- 移除按用户筛选（个人版单用户）

### 步骤 5 — 修 bug
- 见 §5 清单

### 步骤 6 — 文档

1. **新建** `docs/enterprise/FREEZE-CONTRACT.md`，包含：
   - 冻结清单（§3 内容）
   - 三条维护铁律
   - 解冻检查清单
   - **解冻第一条**：后端补齐端点级 RBAC — 当前后端只校验登录、不校验权限，企业版上线前必须先解决，否则绕过前端即可越权
2. **AGENTS.md** 增加「版本分线」章节，指向 `FREEZE-CONTRACT.md`

---

## §7 验收口径

### personal 模式
- [ ] 冻结端点全 404（curl 清单）
- [ ] 路由手敲进不去（浏览器截图）
- [ ] 菜单无入口
- [ ] 组件不渲染
- [ ] 密码登录正常
- [ ] 个人资料可填且 AI 助手能读到
- [ ] 审计日志正常记录
- [ ] PII 仍加密

### enterprise 模式
- [ ] 所有原功能照常可用

### CI 五项全绿
- [ ] `dotnet test`
- [ ] `vitest`（或 `npm run test`）
- [ ] `npx tsc --noEmit`
- [ ] `npm run check`
- [ ] `npm run check:backend`（如适用）
- [ ] **冻结区测试仍在运行未被删除**（测试数量前后对比）

---

## §8 附录：相关文档与产出

| 文档 | 路径 |
|------|------|
| 权限快照 | `docs/enterprise/PERMISSION-SNAPSHOT.md` |
| 本交接文档 | `docs/enterprise/HANDOFF-STEP1.md` |
| 冻结契约（步骤 6 新建） | `docs/enterprise/FREEZE-CONTRACT.md` |
| 项目导航入口 | `AGENTS.md` |
| 开发约定 | `docs/CONVENTIONS.md` |
| 技术栈与架构 | `docs/STACK-AND-ARCHITECTURE.md` |
| 数据库设计 | `docs/DATABASE_DESIGN.md` |
