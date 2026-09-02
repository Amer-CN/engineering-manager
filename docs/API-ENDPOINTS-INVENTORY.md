# API 端点全量盘点（工程管家后端）

> 最后增量同步：dbee34de · 2026-09-02（新增 2 端点：batch-import-resolve / issue-collection；batch-import 行为更新为三分冲突）
> 数据源：`EngineeringManager.Api/Endpoints/*.cs`（24 个文件，约 200+ 端点）
> 本文档为只读扫描产物，不修改任何业务代码。

## 目录

1. [架构总览](#架构总览)
2. [鉴权与权限模型](#鉴权与权限模型)
3. [数据范围过滤机制](#数据范围过滤机制)
4. [跨人写入守卫（RowWriteGate）](#跨人写入守卫rowwritegate)
5. [端点清单（按模块）](#端点清单按模块)
   - 5.1 [Agent AI 助手](#51-agent-ai-助手)
   - 5.2 [认证 / 角色 / 用户管理](#52-认证--角色--用户管理)
   - 5.3 [合同 / 结算 / 合同模板](#53-合同--结算--合同模板)
   - 5.4 [成本台账](#54-成本台账)
   - 5.5 [文件 / 图纸](#55-文件--图纸)
   - 5.6 [库存 / 物料](#56-库存--物料)
   - 5.7 [发票 / 收付款记录](#57-发票--收付款记录)
   - 5.8 [知识库](#58-知识库)
   - 5.9 [知识库文件夹](#59-知识库文件夹)
   - 5.10 [成员 / 工人 / 部门 / 班组](#510-成员--工人--部门--班组)
   - 5.11 [OCR](#511-ocr)
   - 5.12 [合作伙伴 / 监管单位](#512-合作伙伴--监管单位)
   - 5.13 [仪表盘 / 项目 / 项目成员](#513-仪表盘--项目--项目成员)
   - 5.14 [杂项端点](#514-杂项端点)
   - 5.15 [区域（省市区）](#515-区域省市区)
   - 5.16 [报告生成](#516-报告生成)
   - 5.17 [语音转文字（STT）](#517-语音转文字stt)
   - 5.18 [系统级端点](#518-系统级端点)
   - 5.19 [更新管理](#519-更新管理)
   - 5.20 [工资 / 考勤](#520-工资--考勤)
   - 5.21 [用户偏好](#521-用户偏好)
   - 5.22 [模板管理](#522-模板管理)
   - 5.23 [写作中心](#523-写作中心)
   - 5.24 [PII 密钥管理](#524-pii-密钥管理)
6. [权限码总表](#权限码总表)
7. [涉及数据库表总表](#涉及数据库表总表)
8. [SSE 流式端点汇总](#sse-流式端点汇总)

---

## 架构总览

后端为 ASP.NET Core Minimal API（.NET 8），所有端点注册在 `Program.cs` 中通过扩展方法 `Register*Endpoints` 挂载。数据访问层使用 Dapper + SQLite（`Microsoft.Data.Sqlite`）。

**统一响应格式**（`Common` 静态类）：
- `Common.Ok(data)` → `{ success: true, data: ... }`
- `Common.Fail(msg, code?)` → `{ success: false, error: msg }`（默认 200，可指定状态码）
- `Common.NotFound(msg)` → 404
- `Common.WriteResult(affected, db, table, id)` → 根据影响行数判断 200/403/404
- `Common.Sanitize(msg)` → 脱敏异常信息（不泄露内部路径/堆栈）
- `Common.ServerError(label, ex)` → 500 + 日志

**全局中间件**：
- `GlobalAuthMiddleware`：强制鉴权，白名单端点（如 `/api/health`、`/api/agent/setup/status`）无需登录，其余 `/api/*` 必须携带有效 JWT。
- 限流策略：`login`（登录端点）、`write`（写操作端点）。

---

## 鉴权与权限模型

### 身份来源

用户身份通过 JWT 获取（`CurrentUser.GetUserId(ctx)`），**绝不信任客户端传入的身份字段**。JWT claims 包含 `uid`（用户 ID）、`Name`（用户名）、`Role`（角色名）。

### 权限层级

```
请求 → GlobalAuthMiddleware（白名单检查 + JWT 解析）
     → HasPermission(ctx, db, "module:action")（功能权限码门禁）
     → RowWriteGate.Classify(...)（行级归属裁决，仅写操作）
     → SQL WHERE 数据范围过滤（UserFilter / UserFilterCompany / UserFilterWithAuthorizedProjects）
```

### 三层守卫

1. **功能权限码门禁**（`HasPermission`）：检查当前用户角色是否拥有指定权限码（如 `contracts:create`）。未通过返回 403。
2. **项目级写入门**（`CanWriteProject`，G75/G76 门）：仅部分端点使用（考勤、工资的创建/批量操作），要求用户在目标项目有写权限。
3. **行级归属裁决**（`RowWriteGate.Classify`）：写操作时预读行归属，判断 `Denied` / `Owned` / `AllowedViaAuthorization`（跨人修改但授权项目内）。

### PII 数据保护

- 敏感字段（身份证、手机、银行账号、地址等）同时写入明文列 + `_enc` 加密列。
- GET 响应默认返回脱敏值（`Common.MaskPiiField`），受 `piiAccess` 控制。
- admin 可通过 `/api/admin/unmask-pii` 读取明文（Decrypt `_enc` 列）。
- PII 加密使用 `PiiProtector` 服务（支持密钥轮换）。

---

## 数据范围过滤机制

`CurrentUser` 静态类提供三个过滤辅助方法，按数据维度分级：

| 方法 | 适用表维度 | 过滤逻辑 |
|------|-----------|---------|
| `UserFilterCompany(scope, alias?)` | 公司级表（无 project_id） | `created_by=@Uid OR @IsAdmin=1` |
| `UserFilterWithAuthorizedProjects(scope, projectCol, createdCol?)` | 项目级表（有 project_id） | `created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=<projectCol> AND user_id=@Uid)` |
| `GetDataScope(ctx)` | 返回数据范围枚举 | `admin`（全量） / `user`（仅自己） |

**关键约束**：所有查询端点的 SQL WHERE 都必须包含数据范围过滤，防止用户看到无权访问的数据。单条查询（`GET /api/xxx/{id}`）同样加过滤，防 ID 枚举越权。

---

## 跨人写入守卫（RowWriteGate）

R9 系列改造引入的行级写权限裁决机制，用于处理「授权项目内跨人编辑」场景。

### 裁判流程

```
预读行归属 (SELECT created_by, project_id FROM <table> WHERE id=@Id)
  → 行不存在 → 404（部分端点维持现状 403 语义）
  → RowWriteGate.Classify(ctx, db, createdBy, projectId)
      → Denied          → 403
      → Owned           → 正常修改（无 audit）
      → AllowedViaAuthorization → 事务内修改 + AuditWriter.CrossUserEdit（fail-closed）
```

**fail-closed 语义**：跨人修改时，审计日志写入与数据修改在同一事务内。审计写失败 → 事务回滚 → 修改不生效。确保跨人操作留痕。

### 软删行处理

- `settlements`：预读 `deleted_at`，软删行返回 403（维持现状语义）。
- `wages`：预读 `paid_amount` + `payment_locked`，已发款/已归档行返回 409。
- 其他无锁列表（contracts、invoices 等）：预读不加 `deleted_at`，与现状 WHERE 一致。

---

## 端点清单（按模块）

### 5.1 Agent AI 助手

**文件**：`AgentEndpoints.cs` · **路由前缀**：`/api/agent`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/agent/chat` | 登录 | LLM 对话（function calling，最多 5 轮 tool_use 循环） |
| 2 | POST | `/api/agent/chat/stream` | 登录 | SSE 流式对话（逐 token 输出） |
| 3 | GET | `/api/agent/conversations` | 登录 | 对话列表（`scope=deleted` 返回已删除） |
| 4 | GET | `/api/agent/conversations/{id}` | 登录 | 对话详情（含全部消息） |
| 5 | DELETE | `/api/agent/conversations/{id}` | 登录 | 软删对话 |
| 6 | PUT | `/api/agent/conversations/{id}` | 登录 | 重命名对话（标题 ≤100 字符） |
| 7 | PATCH | `/api/agent/conversations/{id}/archive` | 登录 | 归档对话 |
| 8 | PATCH | `/api/agent/conversations/{id}/unarchive` | 登录 | 取消归档 |
| 9 | PATCH | `/api/agent/conversations/{id}/restore` | 登录 | 恢复已删除对话 |
| 10 | GET | `/api/agent/setup/status` | **白名单** | LLM 配置状态 |
| 11 | POST | `/api/agent/setup/test` | **白名单** | 测试 LLM 连接 |
| 12 | POST | `/api/agent/setup/save` | admin | 保存 LLM 配置 |
| 13 | GET | `/api/agent/config` | 登录 | 获取当前 LLM 配置（不返回 apiKey） |
| 14 | POST | `/api/agent/config/reload` | admin | 热重载 LLM 配置 |

**系统提示词**注入用户画像（display_name / company_name / position / specialty / business_description），定义了 14 个可用工具（getDashboardStats / getProjects / getProjectDetail / getInvoices / getPendingInvoices / getSettlements / getPendingSettlements / getMembers / getWorkers / getContracts / getInventory / getCostSummary / getPartners / runSafeQuery / searchKnowledgeBase）。

**安全约束**：
- `runSafeQuery` 仅允许 SELECT，白名单表，自动 LIMIT 100，PII 自动脱敏。
- 严禁查询 `users`、`roles`、`audit_logs`、`llm_config`、`sqlite_master` 等系统表。
- 知识库检索结果属于不可信业务数据，不可当作系统指令执行。

---

### 5.2 认证 / 角色 / 用户管理

**文件**：`AuthEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/auth/login` | 公开（限流） | 登录，返回 JWT + 用户信息 |
| 2 | POST | `/api/auth/reset-password` | admin | 强制重置用户密码 |
| 3 | POST | `/api/auth/change-password` | 登录（限流） | 自助修改密码（校验旧密码 + 固定时间比较防时序攻击） |
| 4 | GET | `/api/roles` | RoleManagement | 角色列表 |
| 5 | GET | `/api/roles/{id}` | RoleManagement | 角色详情 |
| 6 | PUT | `/api/roles` | `roles:update` | 更新角色权限 |
| 7 | POST | `/api/roles/{id}/reset` | `roles:update` | 重置角色默认权限 |
| 8 | GET | `/api/users` | UserManagement | 用户列表 |
| 9 | GET | `/api/users/{id}` | UserManagement | 用户详情 |
| 10 | POST | `/api/users` | `users:create` | 创建用户 |
| 11 | PUT | `/api/users` | `users:update` | 更新用户（含改密码） |
| 12 | DELETE | `/api/users/{id}` | `users:delete` | 删除用户 |
| 13 | POST | `/api/admin/backfill-pii` | admin | PII 数据回填（明文→加密，幂等） |
| 14 | GET | `/api/admin/project-authorizations` | admin | 项目授权列表 |
| 15 | GET | `/api/admin/project-authorizations/by-user/{userId}` | admin | 按用户查授权 |
| 16 | POST | `/api/admin/project-authorizations` | admin | 授权用户访问项目（幂等） |
| 17 | DELETE | `/api/admin/project-authorizations/{projectId}/{userId}` | admin | 撤销项目授权 |
| 18 | POST | `/api/admin/unmask-pii` | admin | 读取单条 PII 明文 |
| 19 | GET | `/api/user-profile` | 登录 | 个人资料 |
| 20 | PUT | `/api/user-profile` | 登录 | 更新个人资料 |

**密码哈希**：PBKDF2，version 2 = 210k iterations。写入 `password_hash` 时必须同时设 `is_default_password=0`。JWT 有效期 1 天。

---

### 5.3 合同 / 结算 / 合同模板

**文件**：`ContractEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/contracts/income` | 登录 | 收入合同列表（可选 projectId 筛选） |
| 2 | GET | `/api/contracts/expense` | 登录 | 支出合同列表 |
| 3 | GET | `/api/contracts/agreement` | 登录 | 协议合同列表 |
| 4 | GET | `/api/contracts/stats` | 登录 | 合同统计（数量+金额） |
| 5 | POST | `/api/contracts/income` | `contracts:create` | 新建收入合同 |
| 6 | POST | `/api/contracts/expense` | `contracts:create` | 新建支出合同 |
| 7 | POST | `/api/contracts/agreement` | `contracts:create` | 新建协议合同 |
| 8 | PUT | `/api/contracts/income` | `contracts:update` | 更新收入合同（RowWriteGate 裁决） |
| 9 | PUT | `/api/contracts/expense` | `contracts:update` | 更新支出合同 |
| 10 | PUT | `/api/contracts/agreement` | `contracts:update` | 更新协议合同 |
| 11 | DELETE | `/api/contracts/income/{id}` | `contracts:delete` | 删除收入合同 |
| 12 | DELETE | `/api/contracts/expense/{id}` | `contracts:delete` | 删除支出合同 |
| 13 | DELETE | `/api/contracts/agreement/{id}` | `contracts:delete` | 删除协议合同 |
| 14 | GET | `/api/contract-templates` | 登录 | 合同模板列表 |
| 15 | POST | `/api/contract-templates` | `contracts:update` | 新建模板 |
| 16 | PUT | `/api/contract-templates` | `contracts:update` | 更新模板 |
| 17 | DELETE | `/api/contract-templates/{id}` | `contracts:update` | 删除模板 |
| 18 | GET | `/api/settlements` | 登录 | 结算列表（软删过滤） |
| 19 | POST | `/api/settlements` | `settlement:create` | 新建结算单 |
| 20 | PUT | `/api/settlements` | `settlement:update` | 更新结算（RowWriteGate + 软删 403） |
| 21 | DELETE | `/api/settlements/{id}` | `settlement:delete` | 软删结算 |
| 22 | PUT | `/api/settlements/{id}/process` | `settlement:approve` | 标记已结算 |
| 23 | PUT | `/api/settlements/{id}/unarchive` | `settlement:update` | 恢复为待结算 |

**实体种子**：合同/结算的 POST/PUT 操作会 fire-and-forget 调用 `KnowledgeEntityService.UpsertEntityAsync`，将实体名+projectId 写入知识库种子表（供语义检索关联）。

---

### 5.4 成本台账

**文件**：`CostLedgerEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/cost-ledger` | 登录 | 台账条目列表（软删过滤） |
| 2 | GET | `/api/cost-ledger/summary` | 登录 | 汇总统计（总数/支出/收入） |
| 3 | POST | `/api/cost-ledger` | `costLedger:create` | 新增台账 |
| 4 | PUT | `/api/cost-ledger` | `costLedger:update` | 更新台账 |
| 5 | DELETE | `/api/cost-ledger/{id}` | `costLedger:delete` | 软删台账 |
| 6 | POST | `/api/cost-ledger/batch` | `costLedger:create` | 批量新增 |
| 7 | GET | `/api/cost-ledger/categories` | 登录 | 分类列表 |
| 8 | POST | `/api/cost-ledger/categories` | `settings:update` | 新增分类 |
| 9 | PUT | `/api/cost-ledger/categories` | `settings:update` | 更新分类 |
| 10 | DELETE | `/api/cost-ledger/categories/{id}` | `settings:update` | 删除分类 |
| 11 | POST | `/api/cost-ledger/categories/reset` | `settings:update` | 清空全部分类 |
| 12 | GET | `/api/cost-ledger/batches` | 登录 | 批次列表 |
| 13 | POST | `/api/cost-ledger/batches` | `costLedger:create` | 新建批次 |
| 14 | POST | `/api/cost-ledger/batches/{id}/copy` | `costLedger:create` | 复制批次 |
| 15 | PUT | `/api/cost-ledger/batches/{id}` | `costLedger:update` | 重命名批次 |
| 16 | DELETE | `/api/cost-ledger/batches/{id}` | `costLedger:delete` | 删除批次 |
| 17 | GET | `/api/cost-ledger/match-rules` | 登录 | 匹配规则列表 |
| 18 | POST | `/api/cost-ledger/match-rules` | `costLedger:update` | 保存匹配规则（UPSERT，hit_count+1） |
| 19 | GET | `/api/cost-ledger/{batchId}/sheet` | 登录 | 电子表格视图（批次下条目） |
| 20 | POST | `/api/cost-ledger/{batchId}/sheet` | `costLedger:update` | 批量 upsert 电子表格 |

**金额单位**：`cost_ledger.amount` 为 REAL（元），直接存 double（M-FIX1 F6 修正，原先注释撒谎说 INTEGER 分却强制取整丢小数）。

---

### 5.5 文件 / 图纸

**文件**：`FileEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/files/save` | 登录 | 保存 base64 文件到 uploads/ |
| 2 | GET | `/api/files/read` | 登录 | 读取文件（多路径回退查找） |
| 3 | POST | `/api/files/delete` | 登录 | 删除文件 |
| 4 | POST | `/api/files/open-external` | 登录 | 系统默认程序打开文件（扩展名白名单） |
| 5 | GET | `/api/drawings` | 登录 | 图纸列表 |
| 6 | POST | `/api/drawings` | `drawings:create` | 上传图纸（base64→存盘） |
| 7 | PUT | `/api/drawings` | `drawings:update` | 更新图纸 |
| 8 | DELETE | `/api/drawings/{id}` | `drawings:delete` | 删除图纸 |
| 9 | POST | `/api/inventory/transactions` | `inventory:create` | 出入库登记 |
| 10 | GET | `/api/contracts/read-file` | 登录 | 读取合同附件 |
| 11 | POST | `/api/contracts/save-file` | `contracts:update` | 保存合同附件 |

**路径安全**：`IsPathSafe` 校验解析后路径在允许基目录内，防路径遍历。`open-external` 端点扩展名白名单仅允许文档+图片，排除 `.bat/.exe/.cmd/.ps1` 等可执行文件。

---

### 5.6 库存 / 物料

**文件**：`InventoryEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/inventory` | 登录 | 物料列表（公司维度过滤） |
| 2 | POST | `/api/inventory` | `inventory:create` | 新增物料 |
| 3 | PUT | `/api/inventory` | `inventory:update` | 更新物料 |
| 4 | DELETE | `/api/inventory/{id}` | `inventory:delete` | 删除物料 |
| 5 | GET | `/api/inventory/transactions` | 登录 | 出入库流水 |
| 6 | GET | `/api/materials` | 登录 | 材料列表 |
| 7 | POST | `/api/materials` | `inventory:create` | 新增材料 |
| 8 | PUT | `/api/materials` | `inventory:update` | 更新材料 |
| 9 | DELETE | `/api/materials/{id}` | `inventory:delete` | 删除材料 |

---

### 5.7 发票 / 收付款记录

**文件**：`InvoiceEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/invoices` | 登录 | 发票列表（内联 SQL 避 JOIN 冲突，含 sellerName/buyerName） |
| 2 | POST | `/api/invoices` | `invoices:create` | 新建发票 |
| 3 | PUT | `/api/invoices` | `invoices:update` | 更新发票（RowWriteGate 裁决） |
| 4 | DELETE | `/api/invoices/{id}` | `invoices:delete` | 软删发票 |
| 5 | GET | `/api/payment-records` | 登录 | 收付款记录列表（解析 invoice_details JSON） |
| 6 | POST | `/api/payment-records` | `invoices:create` | 新增收付款记录 |
| 7 | PUT | `/api/payment-records` | `invoices:update` | 更新收付款记录（RowWriteGate） |
| 8 | DELETE | `/api/payment-records/{id}` | `invoices:delete` | 软删收付款记录 |

---

### 5.8 知识库

**文件**：`KnowledgeEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/knowledge/documents` | `knowledge:create` | 入库（手动/从转写） |
| 2 | GET | `/api/knowledge/search` | `knowledge:read` | 混合检索（FTS5 + 语义 + RRF + 实体偏置） |
| 3 | GET | `/api/knowledge/documents/{id}` | `knowledge:read` | 文档详情（含 chunks） |
| 4 | DELETE | `/api/knowledge/documents/{id}` | `knowledge:read` | 删除文档（级联删 chunks + fts） |
| 5 | PUT | `/api/knowledge/documents/{id}` | `knowledge:update` | 文档归入/移出文件夹 |
| 6 | GET | `/api/knowledge/documents` | `knowledge:read` | 文档列表（分页） |
| 7 | GET | `/api/knowledge/entity-context` | `knowledge:read` | 实体关联上下文 |
| 8 | POST | `/api/knowledge/seed-entities` | admin | 全量扫描业务表生成实体种子 |

**混合检索**：`SearchAsync` 返回每个 hit 的 FTS5 分数/排名、语义分数/排名、RRF 融合分数。`BuildScopeFilter` 统一构造数据范围过滤。

---

### 5.9 知识库文件夹

**文件**：`KnowledgeFolderEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/knowledge/folders` | `knowledge:read` | 文件夹列表（含文档数） |
| 2 | POST | `/api/knowledge/folders` | `knowledge:create` | 建文件夹 |
| 3 | PUT | `/api/knowledge/folders/{id}` | `knowledge:update` | 改文件夹（CanAccessFolder 校验） |
| 4 | DELETE | `/api/knowledge/folders/{id}` | `knowledge:delete` | 软删文件夹 + 文档移出（事务） |
| 5 | GET | `/api/knowledge/folders/{id}/documents` | `knowledge:read` | 文件夹内文档 |

**M-FIX8 T2 (G58)**：PUT/DELETE/GET-documents 共用 `CanAccessFolder` 判定，范围表达式逐字一致。软删在事务内同时 `folders.deleted_at` + `documents.folder_id=NULL`（不依赖外键 PRAGMA）。

---

### 5.10 成员 / 工人 / 部门 / 班组

**文件**：`MemberEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/members` | 登录 | 成员列表（PII 脱敏） |
| 2 | GET | `/api/members/{id}` | 登录 | 成员详情 |
| 3 | POST | `/api/members` | `members:create` | 新增成员（PII 加密） |
| 4 | PUT | `/api/members` | `members:update` | 更新成员 |
| 5 | DELETE | `/api/members/{id}` | `members:delete` | 删除成员 |
| 6 | GET | `/api/workers` | 登录 | 工人列表（PII 脱敏） |
| 7 | GET | `/api/workers/stats` | 登录 | 工人统计 |
| 8 | POST | `/api/workers` | `members:create` | 新增工人 |
| 9 | PUT | `/api/workers` | `members:update` | 更新工人 |
| 10 | DELETE | `/api/workers/{id}` | `members:delete` | 删除工人 |
| 11 | GET | `/api/project-workers` | 登录 | 项目工人列表（JOIN workers + teams） |
| 12 | POST | `/api/project-workers` | `members:create` | 添加项目工人 |
| 13 | DELETE | `/api/project-workers/{id}` | `members:delete` | 移除项目工人 |
| 14 | GET | `/api/departments` | 登录 | 部门列表（positions JSON parse） |
| 15 | POST | `/api/departments` | `members:create` | 新建部门 |
| 16 | PUT | `/api/departments` | `members:update` | 更新部门 |
| 17 | DELETE | `/api/departments/{id}` | `members:delete` | 删除部门 |
| 18 | GET | `/api/worker-teams` | 登录 | 班组列表 |
| 19 | POST | `/api/worker-teams` | `members:create` | 新建班组 |
| 20 | PUT | `/api/worker-teams` | `members:update` | 更新班组（COALESCE 保留空字段） |
| 21 | DELETE | `/api/worker-teams/{id}` | `members:delete` | 删除班组 |

---

### 5.11 OCR

**文件**：`OcrEndpoints.cs` · **外部服务**：百度云 OCR

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/ocr/id-card` | 登录 | 身份证 OCR |
| 2 | POST | `/api/ocr/invoice` | 登录 | 发票 OCR |
| 3 | POST | `/api/ocr/bank-card` | 登录 | 银行卡 OCR |
| 4 | POST | `/api/ocr/business-license` | 登录 | 营业执照 OCR |
| 5 | POST | `/api/ocr/bank-receipt` | 登录 | 银行回单 OCR |
| 6 | POST | `/api/ocr/permit` | 登录 | 开户许可证 OCR |
| 7 | POST | `/api/ocr/bank-statement` | 登录 | 银行流水 OCR |
| 8 | POST | `/api/ocr/general-receipt` | 登录 | 通用票据 OCR |
| 9 | POST | `/api/ocr/company-query` | 登录 | 企业工商信息查询（返回不支持提示） |
| 10 | GET | `/api/ocr/check-network` | 登录 | 检查百度连通性 |
| 11 | POST | `/api/ocr/clear-token-cache` | admin | 清除 access_token 缓存 |
| 12 | GET | `/api/ocr/stats` | admin | OCR 使用统计（按月重置） |

**OCR 配置优先级**：环境变量 > DPAPI 加密文件 > 兼容老明文 JSON。Token 缓存带提前 1 小时刷新。

---

### 5.12 合作伙伴 / 监管单位

**文件**：`PartnerEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/partners` | 登录 | 合作伙伴列表（PII 字段返回原值） |
| 2 | POST | `/api/partners` | `partners:create` | 新增（PII 加密） |
| 3 | PUT | `/api/partners` | `partners:update` | 更新 |
| 4 | DELETE | `/api/partners/{id}` | `partners:delete` | 删除 |
| 5 | GET | `/api/supervisors` | 登录 | 监管单位列表（JOIN regions） |
| 6 | POST | `/api/supervisors` | `partners:create` | 新增（phone 加密） |
| 7 | PUT | `/api/supervisors` | `partners:update` | 更新 |
| 8 | DELETE | `/api/supervisors/{id}` | `partners:delete` | 删除 |

---

### 5.13 仪表盘 / 项目 / 项目成员

**文件**：`ProjectEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/dashboard/stats` | 登录 | 仪表盘统计（项目/成员/工人/发票/结算/支出/库存） |
| 2 | GET | `/api/projects` | 登录 | 项目列表（JOIN project_manager） |
| 3 | GET | `/api/projects/{id}` | 登录 | 项目详情（单条加过滤防枚举） |
| 4 | POST | `/api/projects` | `projects:create` | 新建项目 |
| 5 | PUT | `/api/projects/{id}` | `projects:update` | 更新项目 |
| 6 | DELETE | `/api/projects/{id}` | `projects:delete` | 删除项目 |
| 7 | GET | `/api/project-members/{projectId}` | 登录 | 项目成员列表 |
| 8 | POST | `/api/project-members` | `projects:update` | 添加项目成员（幂等） |
| 9 | DELETE | `/api/project-members/{id}` | `projects:update` | 移除项目成员 |

---

### 5.14 杂项端点

**文件**：`ProjectWorkerMiscEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/project-workers/batch` | `members:create` | 批量添加项目工人 |
| 2 | PUT | `/api/project-workers` | `members:update` | 更新项目工人 |
| 3 | PUT | `/api/invoices/{id}/status` | `invoices:update` | 发票状态切换（RowWriteGate） |

---

### 5.15 区域（省市区）

**文件**：`RegionEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/regions` | 登录 | 省市区列表 |
| 2 | POST | `/api/regions` | `settings:update` | 新增区域 |
| 3 | DELETE | `/api/regions/{id}` | `settings:update` | 删除区域 |

---

### 5.16 报告生成

**文件**：`ReportEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/reports/generate` | `reports:create` | AI 生成日/周/月报 |

---

### 5.17 语音转文字（STT）

**文件**：`SttEndpoints.cs` · **引擎**：qwen3-asr-1.7b-gguf（本地 GGUF）

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/stt/upload` | 登录 | 上传音频（multipart/form-data，原子改名，路径穿越防护） |
| 2 | POST | `/api/stt/transcribe` | 登录 | 创建转写任务（创建 stt_jobs 行） |
| 3 | GET | `/api/stt/jobs/{id}` | 登录 | 查询任务状态/结果 |
| 4 | GET | `/api/stt/jobs` | 登录 | 任务列表（分页，按 created_by 过滤） |
| 5 | GET | `/api/stt/status` | 登录 | 转写能力检测（GPU/模型状态） |
| 6 | POST | `/api/stt/jobs/{id}/ingest` | `knowledge:create` | 转写文本入库知识库（支持校对后文本） |

**入库校验**：segments 说话人编号必须从 1 开始连续；segments 重组文本必须与提交全文一致；单段 text ≤10KB，总 segments ≤5000，全文 ≤100KB。

---

### 5.18 系统级端点

**文件**：`SystemEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/health` | 公开 | 健康检查（含版本号） |
| 2 | POST | `/api/admin/db-checkpoint` | admin | WAL checkpoint |
| 3 | GET | `/api/admin/pii-stats` | admin | PII 加密进度统计 |
| 4 | GET | `/api/audit/logs` | 登录 | 审计日志（admin 看全部，普通用户只看自己） |
| 5 | POST | `/api/audit/logs` | 登录 | 写审计日志（身份取自 JWT） |
| 6 | GET | `/api/audit/stats` | 登录 | 审计统计 |
| 7 | POST | `/api/audit/clear` | admin | 清理旧审计日志 |
| 8 | GET | `/api/snapshots` | 登录 | 快照列表 |
| 9 | POST | `/api/snapshots` | `settings:update` | 创建快照（自动修剪超限） |
| 10 | DELETE | `/api/snapshots/{id}` | `settings:update` | 删除快照 |
| 11 | GET | `/api/snapshots/max-count` | 登录 | 快照上限配置 |
| 12 | PUT | `/api/snapshots/max-count` | `settings:update` | 设置快照上限（1-100） |
| 13 | POST | `/api/snapshots/{id}/restore` | admin | 恢复快照（先备份当前库） |
| 14 | GET | `/api/config` | 登录 | 系统配置（数据路径/版本/功能开关） |
| 15 | GET | `/api/config/data-path` | 登录 | 数据存储路径 |
| 16 | GET | `/api/config/uploads-path` | 登录 | uploads 路径 |
| 17 | PUT | `/api/config/data-path` | admin | 修改数据路径（含文件夹选择对话框） |
| 18 | GET | `/api/config/gpu-acceleration` | 登录 | GPU 加速配置 |
| 19 | PUT | `/api/config/gpu-acceleration` | `settings:update` | 设置 GPU 加速 |
| 20 | GET | `/api/sqlite/status` | 登录 | SQLite 表统计 |
| 21 | GET | `/api/health/consistency` | 登录 | 数据一致性检查 |
| 22 | GET | `/api/health/integrity` | 登录 | SQLite 完整性检查 |
| 23 | GET | `/api/debug/schema/{tableName}` | 登录 | 查看表结构（白名单字符） |
| 24 | POST | `/api/backup` | `settings:update` | 备份数据库到桌面 |
| 25 | POST | `/api/restore` | `settings:update` | 从桌面备份恢复 |
| 26 | POST | `/api/diagnose` | 登录 | 诊断（integrity_check + 表列表） |
| 27 | POST | `/api/sqlite/migrate` | `settings:update` | JSON→SQLite 数据迁移 |
| 28 | PUT | `/api/sqlite/read-mode` | `settings:update` | 切换读取模式 |

---

### 5.19 更新管理

**文件**：`UpdateEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/update/check` | 登录 | 检查更新 |
| 2 | POST | `/api/update/download` | 登录 | 启动后台下载（并发闸） |
| 3 | POST | `/api/update/download/cancel` | 登录 | 取消下载 |
| 4 | GET | `/api/update/download/stream` | 登录 | SSE 进度推送 |
| 5 | POST | `/api/update/apply` | 登录 | 装包 + 重启 |

---

### 5.20 工资 / 考勤

**文件**：`WageEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/attendances` | 登录 | 考勤列表 |
| 2 | POST | `/api/attendances` | `wages:create` | 新增考勤（G75 项目门） |
| 3 | PUT | `/api/attendances` | `wages:update` | 更新考勤（RowWriteGate） |
| 4 | DELETE | `/api/attendances/{id}` | `wages:delete` | 删除考勤 |
| 5 | POST | `/api/attendances/batch-delete` | `wages:delete` | 批量删除 |
| 6 | POST | `/api/attendances/batch-create` | `wages:create` | 批量创建（G75） |
| 7 | POST | `/api/attendances/generate` | `wages:create` | 生成默认考勤（staff 路径，全勤预填） |
| 8 | POST | `/api/attendances/generate-v2` | `wages:create` | 生成默认考勤（worker 路径） |
| 9 | POST | `/api/attendances/batch-import` | `wages:create` | Excel 导入（G75 + 行级守卫 + 三分冲突：未改覆盖/同值清标/不同列冲突） |
| 10 | POST | `/api/attendances/batch-import-resolve` | `wages:create` | 考勤导入冲突逐条裁决（v0.95.0） |
| 11 | GET | `/api/wages` | 登录 | 工资列表（分→元转换） |
| 12 | GET | `/api/wages/stats` | 登录 | 工资统计 |
| 13 | POST | `/api/wages` | `wages:create` | 新增工资（G76 项目门） |
| 14 | PUT | `/api/wages` | `wages:update` | 更新工资（锁检查 409 + RowWriteGate） |
| 15 | DELETE | `/api/wages/{id}` | `wages:delete` | 软删工资 |
| 16 | POST | `/api/wages/batch-delete` | `wages:delete` | 批量软删 |
| 17 | POST | `/api/wages/batch-clear-payments` | `wages:update` | 批量清除付款记录 |
| 18 | POST | `/api/wages/archive` | `wages:update` | 批量归档（payment_locked=1） |
| 19 | POST | `/api/wages/batch-unarchive` | `wages:update` | 批量解锁归档 |
| 20 | POST | `/api/wages/match-receipts` | `wages:read` | 回单批量匹配（纯读打分） |
| 21 | POST | `/api/wages/confirm-matches` | `wages:update` | 回单确认（显式配对写库） |
| 22 | GET | `/api/wages/payment-records` | 登录 | 已发款记录 |
| 23 | GET | `/api/wages/overdue-stats` | 登录 | 欠薪统计 |
| 24 | GET | `/api/wages/overdue-list` | 登录 | 欠薪列表 |
| 25 | POST | `/api/wages/batch-save` | `wages:update` | 批量保存（upsert + RowWriteGate + 锁检查） |
| 26 | POST | `/api/wages/batch-payment` | `wages:update` | 批量付款写入（RowWriteGate + 锁检查） |
| 27 | POST | `/api/wages/generate` | `wages:create` | 生成工资表（从考勤行 upsert） |

**金额单位契约**（v0.92.0 起强制）：库内一律「分」（INTEGER），API 对外一律「元」。换算只在 `ToFen` / `ToYuan` 两个 helper 内发生。`work_days` 是天数（REAL），不参与换算。

**锁机制**：`paid_amount≠0`（已发款）或 `payment_locked=1`（已归档）→ 409 拒绝修改。PUT 只管工资列，付款走 batch-payment / confirm-matches。

---

### 5.21 用户偏好

**文件**：`UserPreferencesEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/user-preferences` | 登录 | 全部偏好 |
| 2 | PUT | `/api/user-preferences` | 登录 | 批量更新（UPSERT） |
| 3 | GET | `/api/user-preferences/{key}` | 登录 | 单个偏好 |
| 4 | PUT | `/api/user-preferences/{key}` | 登录 | 更新单个偏好 |

当前支持偏好：`pii_mask_enabled`（默认 `true`，保守策略）。

---

### 5.22 模板管理

**文件**：`TemplateEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/templates` | 登录 | 模板列表 |
| 2 | DELETE | `/api/templates/{id}` | `settings:update` | 删除模板 |
| 3 | GET | `/api/templates/stats` | 登录 | 模板统计（按分类） |
| 4 | POST | `/api/templates` | `settings:update` | 新建模板 |
| 5 | PUT | `/api/templates` | `settings:update` | 更新模板 |
| 6 | POST | `/api/templates/{id}/issue-collection` | `wages:create` | 采集表下发（填标题占位符回 dataUrl，v0.95.0） |

---

### 5.23 写作中心

**文件**：`WritingEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/writing/doc-types` | `writing:read` | 文体/风格可选项 |
| 2 | GET | `/api/writing/documents` | `writing:read` | 文档列表（软删过滤+归属隔离） |
| 3 | POST | `/api/writing/documents` | `writing:create` | 新建文档 |
| 4 | GET | `/api/writing/documents/{id}` | `writing:read` | 文档详情 |
| 5 | PUT | `/api/writing/documents/{id}` | `writing:update` | 保存编辑（白名单字段） |
| 6 | DELETE | `/api/writing/documents/{id}` | `writing:delete` | 软删 |
| 7 | POST | `/api/writing/draft` | `writing:create` | AI 整篇起草（SSE 流式） |
| 8 | POST | `/api/writing/assist` | `writing:create` | AI 行内改写（一次返回） |

**保护标记**：起草输出经过 `StripProtectedMarkers` 去除潜在注入标记。

---

### 5.24 PII 密钥管理

**文件**：`PiiKeyEndpoints.cs`

| # | 方法 | 路由 | 权限 | 说明 |
|---|------|------|------|------|
| 1 | GET | `/api/admin/pii/keys` | admin | 列出所有 PII 密钥 |
| 2 | POST | `/api/admin/pii/rotate` | admin | 轮换密钥（旧 key 标 retired，仍可解密） |
| 3 | POST | `/api/admin/pii/reencrypt` | admin | 启动后台 re-encrypt worker |
| 4 | GET | `/api/admin/pii/reencrypt/status` | admin | 查询 re-encrypt 进度 |

---

## 权限码总表

| 权限码 | 适用模块 | 操作 |
|--------|---------|------|
| `contracts:create` | 合同 | 新建收入/支出/协议合同 |
| `contracts:update` | 合同 | 更新合同 + 合同模板 + 合同附件 |
| `contracts:delete` | 合同 | 删除合同 |
| `costLedger:create` | 成本台账 | 新增台账/批次 |
| `costLedger:update` | 成本台账 | 更新台账/批次/匹配规则/电子表格 |
| `costLedger:delete` | 成本台账 | 软删台账/批次 |
| `drawings:create` | 图纸 | 上传图纸 |
| `drawings:update` | 图纸 | 更新图纸 |
| `drawings:delete` | 图纸 | 删除图纸 |
| `invoices:create` | 发票 | 新建发票/收付款记录 |
| `invoices:update` | 发票 | 更新发票/收付款记录/状态切换 |
| `invoices:delete` | 发票 | 软删发票/收付款记录 |
| `inventory:create` | 库存 | 新增物料/材料/出入库 |
| `inventory:update` | 库存 | 更新物料/材料 |
| `inventory:delete` | 库存 | 删除物料/材料 |
| `knowledge:create` | 知识库 | 入库/转写入库/建文件夹 |
| `knowledge:read` | 知识库 | 检索/文档详情/列表/文件夹 |
| `knowledge:update` | 知识库 | 更新文档归属/文件夹 |
| `knowledge:delete` | 知识库 | 软删文件夹 |
| `members:create` | 人事 | 新增成员/工人/项目工人/部门/班组 |
| `members:update` | 人事 | 更新成员/工人/项目工人/部门/班组 |
| `members:delete` | 人事 | 删除成员/工人/项目工人/部门/班组 |
| `partners:create` | 合作方 | 新增合作伙伴/监管单位 |
| `partners:update` | 合作方 | 更新合作伙伴/监管单位 |
| `partners:delete` | 合作方 | 删除合作伙伴/监管单位 |
| `projects:create` | 项目 | 新建项目 |
| `projects:update` | 项目 | 更新项目/项目成员 |
| `projects:delete` | 项目 | 删除项目 |
| `reports:create` | 报告 | 生成报告 |
| `settlement:create` | 结算 | 新建结算 |
| `settlement:update` | 结算 | 更新结算/取消归档 |
| `settlement:delete` | 结算 | 软删结算 |
| `settlement:approve` | 结算 | 标记已结算 |
| `settings:update` | 系统 | 模板/区域/分类/快照/备份/GPU/读取模式/快照上限 |
| `users:create` | 用户 | 创建用户 |
| `users:update` | 用户 | 更新用户 |
| `users:delete` | 用户 | 删除用户 |
| `roles:update` | 角色 | 更新/重置角色权限 |
| `wages:create` | 工资 | 新增考勤/工资/批量/生成 |
| `wages:update` | 工资 | 更新考勤/工资/批量/付款/归档 |
| `wages:delete` | 工资 | 删除考勤/工资 |
| `wages:read` | 工资 | 回单匹配（纯读） |
| `writing:read` | 写作 | 文档列表/详情/文体 |
| `writing:create` | 写作 | 新建/起草/改写 |
| `writing:update` | 写作 | 更新文档 |
| `writing:delete` | 写作 | 软删文档 |

---

## 涉及数据库表总表

| 表名 | 维度 | 说明 |
|------|------|------|
| `projects` | 公司级 | 工程项目主表 |
| `members` | 公司级 | 成员/员工 |
| `workers` | 公司级 | 现场施工工人 |
| `partners` | 公司级 | 合作伙伴/供应商 |
| `supervisors` | 公司级 | 监管单位 |
| `inventory_items` | 公司级 | 库存物料 |
| `materials` | 项目级 | 材料 |
| `departments` | 公司级 | 部门 |
| `worker_teams` | 项目级 | 班组 |
| `project_workers` | 项目级 | 项目工人关联 |
| `project_members` | 项目级 | 项目成员关联 |
| `project_authorizations` | 项目级 | 用户-项目授权 |
| `invoices` | 项目级 | 发票 |
| `payment_records` | 项目级 | 收付款记录 |
| `income_contracts` | 项目级 | 收入合同 |
| `expense_contracts` | 项目级 | 支出合同 |
| `agreement_contracts` | 项目级 | 协议合同 |
| `contract_templates` | 公司级 | 合同模板 |
| `settlements` | 项目级 | 结算单（软删） |
| `cost_ledger` | 项目级 | 成本台账（软删） |
| `cost_ledger_categories` | 全局 | 成本分类字典 |
| `cost_ledger_batches` | 项目级 | 台账批次 |
| `cost_ledger_match_rules` | 全局 | 匹配规则 |
| `drawings` | 项目级 | 图纸 |
| `attendances` | 项目级 | 考勤 |
| `wages` | 项目级 | 工资（软删 + 锁） |
| `templates` | 全局 | 通用模板 |
| `audit_logs` | 全局 | 审计日志 |
| `users` | 全局 | 用户表 |
| `roles` | 全局 | 角色表 |
| `regions` | 全局 | 省市区 |
| `user_preferences` | 用户级 | 用户偏好 |
| `knowledge_documents` | 项目级 | 知识库文档 |
| `knowledge_chunks` | 文档级 | 知识库分块 |
| `knowledge_folders` | 项目级 | 知识库文件夹 |
| `knowledge_entities` | 全局 | 实体种子 |
| `stt_jobs` | 用户级 | 语音转写任务 |
| `writing_documents` | 项目级 | 写作中心文档 |
| `pii_keys` | 全局 | PII 加密密钥 |

---

## SSE 流式端点汇总

| 端点 | 事件类型 | 说明 |
|------|---------|------|
| `POST /api/agent/chat/stream` | `conversation_id` / `tool` / `content` / `done` / `error` | Agent 流式对话 |
| `GET /api/update/download/stream` | 进度对象（Phase: downloading/done/error/cancelled） | 更新下载进度 |
| `POST /api/writing/draft` | `content` / `done` / `error` | AI 整篇起草 |

所有 SSE 端点统一设置 `Content-Type: text/event-stream`、`Cache-Control: no-cache`、`Connection: keep-alive`、`X-Accel-Buffering: no`。

---

*文档结束。如需更新，重新扫描 `EngineeringManager.Api/Endpoints/` 目录即可。*
