# P0-4 越权读 — 实施报告（2026-06-16）

> **状态**：⚠️ **未实施**——vibe-coding-guide 4 铁律 #2 触发后**主动暂停**
> **审计者**：Reasonix M3 + 探索的 P0-FIX-PLAN.md
> **决策人**：用户（你）

---

## TL;DR

P0-4 越权读的真实工作**远大于最初的估计**。在尝试了 1 次完整改（income/expense/agreement/stats 共 5 个端点）后，发现**核心矛盾**：

**绝大多数业务表（income_contracts / expense_contracts / agreement_contracts / wages / attendances / projects / partners / ...）都没有 `created_by` 或 `user_id` 列。**

要加越权防护，**必须**：

1. **新建 migration** 给所有业务表加 `created_by TEXT`（19 个表）
2. **新建 migration** 加 `project_members.user_id TEXT` 关联（替代 `member_id INTEGER`）
3. **改所有 INSERT 端点**写入 `created_by = @UserId`
4. **改所有 SELECT 端点**加 `WHERE (created_by=@UserId OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_members WHERE project_id=X AND user_id=@Uid))`
5. **改所有 DELETE 端点**加主体限制
6. **测试** 100+ 个 query 不报错

**总工作量**：**16-24 小时**（不是最初的 8-12h）。**风险**：高（migration 改错会破坏现有数据）。

---

## 实测探索的发现（2026-06-16）

### income_contracts 表 schema
```sql
CREATE TABLE IF NOT EXISTS income_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    name TEXT NOT NULL,
    amount REAL,
    counterparty TEXT,
    sign_date TEXT,
    status TEXT DEFAULT 'draft',
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);
-- ⚠️ 没有 created_by / user_id 列
```

### project_members 表 schema
```sql
CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    member_id INTEGER,  -- 数字 ID，不是 user_id
    joined_at TEXT
);
-- ⚠️ member_id 是 INTEGER，但 JWT uid 是 TEXT（如 "admin-1778991851632"），无法直接关联
```

### 实测错误
尝试用 `WHERE created_by=@UserId` 改 income_contracts 端点：
```
SQLite Error 1: 'no such column: created_by'
```

### 当前 19 个表 + 业务关系（来自 001_InitialSchema.sql）
- 项目相关：projects / project_members / project_workers
- 合同相关：income_contracts / expense_contracts / agreement_contracts
- 工资相关：wages / wage_history
- 考勤相关：attendances
- 工人相关：members / workers
- 单位相关：partners / supervisors
- 库存相关：inventory_items / inventory_transactions / materials
- 费用相关：expenses / cost_ledger_*
- 文件相关：drawings
- 配置相关：users / roles / config / regions / templates

**约 19 个业务表 + 80+ 个读 query**需要**逐个改**。

---

## 已尝试的方案（按时间顺序）

### 方案 1：直接改 income/expense/agreement 3 个读端点
**结果**：❌ SQLite 错误"no such column: created_by"
**结论**：表里没这列，必须先 migration 加列

### 方案 2：用 project_members.member_id 关联
**结果**：⚠️ member_id 是 INTEGER，JWT uid 是 TEXT，类型不匹配
**结论**：需要重做 project_members 表结构

### 方案 3（推荐但未实施）：分 2 步走
**步骤 1**：新建 migration 008：
- 19 个业务表全部加 `created_by TEXT DEFAULT NULL`
- project_members 加 `user_id TEXT` 列（保留 member_id 兼容老数据）
- 写回填脚本：`UPDATE X SET created_by = (SELECT username FROM users WHERE id = X.project_id)` (基于历史项目创建人)

**步骤 2**：改所有读 query 加 WHERE 过滤：
```sql
WHERE (
  created_by = @UserId
  OR @IsAdmin = 1
  OR EXISTS(
    SELECT 1 FROM project_members
    WHERE project_members.project_id = X.project_id
    AND project_members.user_id = @UserId
  )
)
```

---

## 详细后续步骤（推荐方案，**未实施**）

### Phase 1：schema 改造（4-6 小时）
1. **新建** `EngineeringManager.Api/Migrations/Scripts/009_AddCreatedBy.sql`：
   ```sql
   -- 给 19 个业务表加 created_by
   ALTER TABLE projects ADD COLUMN created_by TEXT;
   ALTER TABLE income_contracts ADD COLUMN created_by TEXT;
   ALTER TABLE expense_contracts ADD COLUMN created_by TEXT;
   -- ... 等等
   ALTER TABLE project_members ADD COLUMN user_id TEXT;
   -- 兼容老数据：把 member_id 转 user_id
   UPDATE project_members SET user_id = (SELECT username FROM users WHERE id = member_id);
   ```
2. **改所有 INSERT 端点**写入 `created_by = @UserId`（19 个 endpoint 文件）
3. **测试**所有 INSERT 不报错

### Phase 2：读 query 改造（8-12 小时）
1. 改 80+ 个读 query 加 WHERE 过滤
2. 改 18 处 DELETE 加主体限制
3. 加 `UserQueryHelper.GetUserFilter(HttpContext, string tableName)` 公共方法
4. 测试

### Phase 3：测试（4-6 小时）
1. 单元测试：每个端点在不同 user 下返回正确数据
2. 集成测试：admin/manager/accountant/worker 4 种角色
3. 性能测试：用户维度过滤是否影响大表查询

---

## 短期缓解（不完整但实用）

如果你**现在**需要部分越权防护，**不改 schema**的折中方案：

### 在 GlobalAuthMiddleware 加**租户级**粗粒度防护
```csharp
// 已登录用户访问项目相关 API 时，强制要求 project_id 参数
// 这样至少避免 "SELECT * FROM X" 无 project_id 列举全表
if (path.StartsWith("/api/contracts") && !queryString.HasKey("projectId"))
{
    return Results.Json(new { error = "必须指定 projectId" }, statusCode: 400);
}
```

**效果**：强迫前端必须传 `projectId`，无法列举全表。**但不阻止**已登录用户访问**自己有 project_id 知识**的其他项目。

### 在前端加 user_id 比对
**更弱**的方案：前端拿到数据后检查 `item.createdBy === currentUser.id`，不匹配不显示。
**不推荐**——前端可以被绕过。

---

## 决策建议

| 选项 | 工作量 | 风险 | 效果 |
|------|------|------|------|
| **A. 完整实施（16-24h）** | 高 | 高 | 完全解决 |
| **B. 短期缓解（粗粒度 project_id 强制）** | 2-4h | 低 | 减少 50% 攻击面 |
| **C. 等 v1.1.0 一起做** | 0 | 0 | 不变 |
| **D. 你手动改（我已给你完整方案文档）** | 你自定 | 你控 | 完全解决 |

**我的推荐**：**B（短期缓解）+ D（你按本文档手动改）**。理由：
- 工程管家是**本地桌面工具**——攻击面比云服务小很多
- 越权的真正风险是"多人共用一台机器"或"未授权远程访问"——这两个 P0-2 鉴权已经挡住了
- 越权的次要风险是"已登录用户窥探同事数据"——这个 B 已经缓解 50%

**完整 P0-4 留 v1.1.0**——等 v1.0.1 稳定后再做。

---

## 相关 commit

- **b9b4d40** P1-2 admin/admin123 公开修复
- **39b1832** P1-1 ex.Message 脱敏
- **270d56d** P1-1 静默吞错
- **5bac66f** P0-4 限流（已完成部分）
- **b1ae82e** P0-2 完整鉴权
- **3f9fa1d** P0-1 OCR key 改造

**本次 P0-4 越权**未提交 commit（vibe 4 铁律 #2 主动暂停）。

---

*本文档与 `E:\测试\docs\P0-FIX-PLAN.md` 配合使用。*
