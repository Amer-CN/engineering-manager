# 工程管家 AI 助手 · Agent 安全与功能增强 执行报告

> **执行时间**: 2026-06-29  
> **基于提交**: `0384539`  
> **执行者**: MiMo AI Agent  
> **文档用途**: 供审查 Agent 在 GitHub 上直接读取代码进行 Code Review

---

## 一、执行概览

本次执行了「工程管家 AI 助手架构剖析与演进路线」中的 **8 个任务**（P0×4 + P1×1 + P2×2 + P3×1），涵盖：

| 优先级 | 任务 | 类型 | 状态 |
|--------|------|------|------|
| P0 | 任务 1: 修复 `getWorkers`/`getInventory` 权限串失效 | 安全缺陷 | ✅ 完成 |
| P0 | 任务 2: `getDashboardStats` 跨公司数据越权 | 安全缺陷 | ✅ 完成 |
| P0 | 任务 3: `getCostSummary` 跨公司越权 + SQL 字符串拼接 | 安全缺陷 | ✅ 完成 |
| P0 | 任务 4: `getInventory` 无行级隔离 | 安全缺陷 | ✅ 完成 |
| P1 | 任务 5: chat 主路径接入 SSE 流式 | 体验增强 | ✅ 完成 |
| P2 | 任务 6: 新增 `runSafeQuery` 受限只读查询 | 能力增强 | ✅ 完成 |
| P2 | 任务 7: 系统提示注入语义层 | 能力增强 | ✅ 完成 |
| P3 | 任务 8: 统一 PII 字段名口径 | 代码清理 | ✅ 完成 |

**编译状态**: 全部通过（Release 配置，仅有一个预先存在的 CS8601 nullable warning）

---

## 二、变更文件清单

### 新增文件（1 个）

| 文件 | 行数 | 说明 |
|------|------|------|
| `EngineeringManager.Api/Services/SafeQueryValidator.cs` | ~300 | 受限只读查询的安全验证器 |

### 修改文件（3 个）

| 文件 | 增/删行 | 说明 |
|------|---------|------|
| `EngineeringManager.Api/Common.cs` | +8/-5 | 权限补全 + PII 脱敏统一 |
| `EngineeringManager.Api/Services/AgentToolService.cs` | +170/-28 | 行级隔离 + runSafeQuery 工具 |
| `EngineeringManager.Api/Endpoints/AgentEndpoints.cs` | +270/+0 | SSE 流式端点 + 语义层 |

---

## 三、各任务详细改动

### P0 · 任务 1: 修复 `getWorkers`/`getInventory` 权限串失效

**问题**: `getWorkers` 的 `RequiredPermission = "labor:read"`、`getInventory` 的 `RequiredPermission = "inventory:read"`，但 `GetDefaultPermissions` 中四个角色都没有这两个权限串，导致这两个工具对所有人（包括 admin）永久不可用。

**改动**:
- **文件**: `EngineeringManager.Api/Common.cs` (第 108-129 行)
- **变更**:
  - `admin` 角色新增: `"inventory:read"`, `"labor:read"`, `"safeQuery:read"`
  - `manager` 角色新增: `"inventory:read"`, `"labor:read"`, `"safeQuery:read"`
  - `accountant` 角色新增: `"labor:read"`（财务管工资需看工人）
  - `worker` 角色: 不变

**验证方法**: manager 账号问「有哪些工人」「库存还剩什么」应正常返回；worker 账号问工人仍应被拒。

---

### P0 · 任务 2: `getDashboardStats` 跨公司数据越权

**问题**: `ExecuteGetDashboardStats` 方法内全是裸查询（`SELECT COUNT(*) FROM projects` 等），完全没注入用户过滤，传进来的 `uid`/`isAdmin` 一个都没用。非 admin 看到的是全库（所有公司）汇总。

**改动**:
- **文件**: `EngineeringManager.Api/Services/AgentToolService.cs` (第 141-163 行 → 第 141-170 行)
- **变更**:
  ```csharp
  // 新增: 提取过滤条件
  var companyFilter = CurrentUser.UserFilterCompany("created_by");
  var projectFilter = CurrentUser.UserFilterWithAuthorizedProjects("project_id", "created_by");
  var p = new { Uid = uid, IsAdmin = isAdmin };
  
  // 所有查询注入过滤
  var projectsCount = db.ExecuteScalar<int>($"SELECT COUNT(*) FROM projects WHERE {companyFilter}", p);
  // ... 其他查询类似
  ```

**过滤规则**:
- 公司级表（projects/members/workers）: `UserFilterCompany("created_by")`
- 项目级表（invoices/settlements/cost_ledger）: `UserFilterWithAuthorizedProjects("project_id", "created_by")`

---

### P0 · 任务 3: `getCostSummary` 跨公司越权 + SQL 字符串拼接

**问题**: 
1. 使用字符串拼接 `$"WHERE project_id = {projectId.Value}"`（虽然 projectId 是 long 注入风险低，但风格不一致）
2. byCategory/totalIncome/totalExpense 三处均无用户过滤

**改动**:
- **文件**: `EngineeringManager.Api/Services/AgentToolService.cs` (第 355-392 行 → 第 363-395 行)
- **变更**:
  ```csharp
  // 新增: 用户过滤 + 参数化
  var filter = CurrentUser.UserFilterWithAuthorizedProjects("project_id", "created_by");
  var projectFilter = projectId.HasValue
      ? $"{filter} AND project_id = @ProjectId"
      : filter;
  var p = new { Uid = uid, IsAdmin = isAdmin, ProjectId = projectId };
  
  // 所有查询改用参数化
  var byCategory = db.Query($@"... WHERE {projectFilter} ...", p).ToList();
  ```

---

### P0 · 任务 4: `getInventory` 无行级隔离

**问题**: `ExecuteGetInventory(IDbConnection db)` 只接收 db、无 uid/isAdmin，SQL 裸查 `inventory_items`。

**改动**:
- **文件**: `EngineeringManager.Api/Services/AgentToolService.cs`
- **变更 1**: 方法签名改为 `ExecuteGetInventory(IDbConnection db, string uid, int isAdmin)`
- **变更 2**: SQL 加 `WHERE {UserFilterCompany("created_by")}` + 参数化
- **变更 3**: switch 分支改为 `await ExecuteGetInventory(db, uid, isAdmin)`

---

### P1 · 任务 5: chat 主路径接入 SSE 流式

**问题**: `/api/agent/chat` 全程用非流式 `ChatAsync`，`ChatStreamAsync` 已实现但没有任何端点调用。

**改动**:
- **文件**: `EngineeringManager.Api/Endpoints/AgentEndpoints.cs` (新增 ~210 行)
- **新增端点**: `POST /api/agent/chat/stream`
- **SSE 事件类型**:
  - `conversation_id`: 对话 ID
  - `tool`: 工具执行进度（含工具名）
  - `content`: 流式文本片段
  - `done`: 完成信号（含 conversationId + toolCalls）
  - `error`: 错误信息

**实现逻辑**:
1. 工具调用轮次仍用 `ChatAsync`（需完整解析 tool_calls）
2. 最终文本回复用 `ChatStreamAsync` 走 SSE
3. 响应头: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`
4. 保留原有 `/api/agent/chat` 作为非流式降级

**辅助方法**:
```csharp
private static async Task WriteSSE(HttpContext ctx, object data)
{
    var json = JsonSerializer.Serialize(data);
    await ctx.Response.WriteAsync($"data: {json}\n\n");
    await ctx.Response.Body.FlushAsync();
}
```

---

### P2 · 任务 6: 新增 `runSafeQuery` 受限只读查询

**问题**: 13 个固定工具答不了的长尾问题无法处理。

**新增文件**: `EngineeringManager.Api/Services/SafeQueryValidator.cs` (~300 行)

**安全护栏清单**（10 项，缺一不可）:

| # | 护栏 | 实现方式 |
|---|------|----------|
| 1 | 权限门槛 | `RequiredPermission = "safeQuery:read"`，仅 admin/manager |
| 2 | 语句类型 | 正则检查必须以 `SELECT` 开头，拒绝 `;` 多语句 |
| 3 | 禁止关键字 | 拒绝 INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/ATTACH/DETACH/PRAGMA/VACUUM/REPLACE |
| 4 | 禁止函数 | 拒绝 `load_extension` 等 |
| 5 | 表白名单 | 10 张业务表，拒绝 `sqlite_master`/`users`/`roles`/`audit_logs` 等 |
| 6 | 列白名单 | 每张表的可查列明确定义 |
| 7 | 禁 SELECT * | 正则拒绝 `SELECT *` |
| 8 | 强制注入用户过滤 | 根据表类型自动追加 `UserFilterCompany` 或 `UserFilterWithAuthorizedProjects` |
| 9 | 强制 LIMIT | 无 LIMIT 补 100，有则裁到 ≤100 |
| 10 | 超时 | `CommandDefinition` 设置 `commandTimeout: 5` |

**额外安全措施**:
- PII 脱敏: 结果中 `id_card`/`phone`/`bank_account` 字段自动打码
- 审计日志: 每次调用写 `audit_logs`（记录原始 SQL + 改写后 SQL）
- 错误处理: 校验失败返回简短原因（不漏路径/堆栈）

**改动的其他文件**:
- `AgentToolService.cs`: 新增 `ExecuteRunSafeQuery` 方法 + `BuildToolRegistry` 注册 + switch 分支
- `Common.cs`: 新增 `"safeQuery:read"` 权限（admin/manager）
- `AgentEndpoints.cs`: `BuildSystemPrompt` 补 runSafeQuery 使用说明

---

### P2 · 任务 7: 系统提示注入语义层

**问题**: `BuildSystemPrompt` 只列工具名 + 回答规范，没有表结构、字段含义、业务术语。

**改动**:
- **文件**: `EngineeringManager.Api/Endpoints/AgentEndpoints.cs` (BuildSystemPrompt 方法)
- **新增三块内容**:

1. **术语映射**（中文 → 数据库表名）:
   - 项目=projects, 成员=members, 工人=workers, 发票=invoices, 结算=settlements...

2. **字段含义说明**:
   - `projects.status`: active=进行中, completed=已完成, pending=待开工
   - `cost_ledger.direction`: income=收入, expense=支出
   - `members.member_type`: staff=管理人员, worker=工人
   - ...

3. **工具选择指引**:
   - 查询项目列表 → getProjects
   - 查询发票 → getInvoices（可选 projectId 筛选）
   - 按项目筛选数据 → 先 getProjects 获取 projectId，再用 projectId 调用其他工具
   - ...

---

### P3 · 任务 8: 统一 PII 字段名口径

**问题**: 工具 `PiiFields` 用 SQL 列名（`bank_account`），而 `MaskPiiField` 的 switch 分支是 `bankAccount`，`bank_account` 落到 default。

**改动**:
- **文件**: `EngineeringManager.Api/Common.cs` (第 88-94 行)
- **变更**:
  ```csharp
  // 原来
  "bankAccount" => MaskBankAccount(value),
  
  // 改为
  "bankAccount" or "bank_account" => MaskBankAccount(value),
  ```

---

## 四、审查要点

### 安全相关（高优先级）

1. **行级过滤注入**: 确认 `getDashboardStats`/`getCostSummary`/`getInventory` 的 WHERE 子句注入正确
2. **runSafeQuery 护栏**: 确认 10 项安全护栏完整，无绕过路径
3. **参数化查询**: 确认所有 SQL 使用 Dapper 参数化，无字符串拼接
4. **权限串一致性**: 确认 `Common.cs` 的权限与前端 `src/types/permissions.ts` 一致

### 功能相关（中优先级）

5. **SSE 端点**: 确认 `POST /api/agent/chat/stream` 的事件类型和错误处理
6. **语义层**: 确认系统提示中的术语映射与实际表结构一致
7. **审计日志**: 确认 `runSafeQuery` 的审计写入逻辑

### 代码质量（低优先级）

8. **PII 脱敏**: 确认 `bank_account` 分支正确
9. **编译警告**: 确认 CS8601 是预先存在的，非本次引入

---

## 五、测试建议

### 手动测试

1. **权限测试**:
   - admin 调用 `getWorkers`/`getInventory` 应正常返回
   - worker 调用 `getWorkers` 应被拒
   - manager 调用 `runSafeQuery` 应正常
   - worker 调用 `runSafeQuery` 应被拒

2. **数据隔离测试**:
   - 创建仅属某公司的普通账号
   - 问「有哪些项目」「库存还剩什么」「成本多少」
   - 确认只返回该公司数据

3. **SSE 测试**:
   - 调用 `POST /api/agent/chat/stream`
   - 确认先收到 `tool` 事件，再收到 `content` 事件，最后收到 `done` 事件

4. **runSafeQuery 测试**:
   - 正常查询: `SELECT name, status FROM projects`
   - 拒绝查询: `SELECT * FROM projects`（应返回错误）
   - 拒绝查询: `DELETE FROM projects`（应返回错误）
   - 拒绝查询: `SELECT * FROM users`（应返回错误）

### 自动化测试

建议为 `SafeQueryValidator` 编写单元测试，覆盖:
- 正常 SELECT 查询
- 拒绝非 SELECT 语句
- 拒绝多语句
- 拒绝禁止关键字
- 拒绝白名单外表
- 拒绝 SELECT *
- LIMIT 强制注入
- 用户过滤注入

---

## 六、风险与注意事项

1. **前端权限同步**: 前端 `src/types/permissions.ts` 已有 `inventory:read`（所有角色），但后端 `GetDefaultPermissions` 之前缺失。本次补全后需确认前端行为一致。

2. **WebView2 SSE 兼容**: 文档提到 WebView2 对 EventSource 支持有限，前端应优先用 `fetch + ReadableStream`。

3. **runSafeQuery 白名单维护**: 如果后续新增表，需同步更新 `SafeQueryValidator.TableWhitelist`。

4. **审计日志表**: 确认 `audit_logs` 表有 `action`/`level`/`user_id`/`resource`/`details`/`description`/`created_at` 列。

---

## 七、提交建议

```bash
git add EngineeringManager.Api/Common.cs \
        EngineeringManager.Api/Services/AgentToolService.cs \
        EngineeringManager.Api/Services/SafeQueryValidator.cs \
        EngineeringManager.Api/Endpoints/AgentEndpoints.cs

git commit -m "fix(agent): 修复 P0 数据越权 + 新增 SSE 流式 + runSafeQuery + 语义层

P0 安全修复:
- 修复 getWorkers/getInventory 权限串失效（补 labor:read/inventory:read）
- 修复 getDashboardStats 跨公司数据越权（注入行级过滤）
- 修复 getCostSummary 跨公司越权 + SQL 字符串拼接（参数化查询）
- 修复 getInventory 无行级隔离（添加 uid/isAdmin 参数）

P1 体验增强:
- 新增 POST /api/agent/chat/stream SSE 流式端点

P2 能力增强:
- 新增 runSafeQuery 受限只读查询（含 10 项安全护栏）
- 系统提示注入语义层（术语映射/字段说明/工具指引）

P3 代码清理:
- 统一 PII 字段名口径（bank_account 分支）

Co-authored-by: MiMo AI Agent <mimo@xiaomi.com>"
```

---

**文档结束** | 供审查 Agent 在 GitHub 上直接读取代码验证
