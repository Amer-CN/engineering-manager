# 工程管家 深度治理计划 v3（共识版）

> **状态**：共识确认，待执行
> **日期**：2026-06-25
> **核心约束**：真实业务数据不能丢，业务中断可接受
> **方法论**：遵循视频"先设计再动手"原则 — Phase 0 先出设计文档，确认后再实施

---

## 一、审计结论

### 视频 8 条建议 vs 项目现状

| # | 视频建议 | 项目现状 | 结论 |
|---|---------|---------|------|
| 1 | 先从业务流程找对象 | 30+ 表，三张合同表结构重复，但 members(workers 保留)分离有业务原因 | ❌ |
| 2 | 确认对象之间的关系 | **零个 FOREIGN KEY，零个 INDEX** | ❌ |
| 3 | 选对数据库 | SQLite 适合桌面工具 | ✅ |
| 4 | 遵循三大范式 | 10+ TEXT 多值字段（1NF 违反）；三张合同表重复（待业务确认是否合并） | ❌ |
| 5 | 金额不用浮点数 | **全部金额用 REAL**，有精度丢失风险 | ❌ |
| 6 | 常见字段规范 | 部分表缺 updated_at；**零表有 deleted_at**，财务数据全部硬删除 | ❌ |
| 7 | 先保留设计文件 | 有迁移文件但无业务设计文档 | ❌ |
| 8 | 先跑通基础结构 | 能跑但地基有问题 | ⚠️ |

### 后端问题

| 问题 | 严重程度 |
|------|---------|
| `DefaultPolicy` 不自动保护未标记 `.RequireAuthorization()` 的端点 | 🔴 |
| `ContractEndpoints.cs` 用 `$"...{tableName}..."` 字符串插值 | 🟡 |
| 无服务层 — 业务逻辑直接写在 handler 里 | 🟡 |
| settlements/contract templates 用 `dynamic` | 🟡 |
| `var now = () => ...` 每个文件重复 | 🟡 |
| `Common.cs` 辅助函数 + 35 个 DTO 混在一起 | 🟡 |

### 前端问题

| 问题 | 严重程度 |
|------|---------|
| 同一数据 6+ 页面各取一次，无缓存 | 🟡 |
| WageManagement 25+ useState | 🟡 |
| `CountUp` 重复定义 | 🟡 |
| `getAPI().then(...)` 原始调用模式，40+ 组件 | 🟡 |
| 10+ 处 `useState<any[]>` | 🟡 |

---

## 二、修订后的 Phase 结构

> 核心变化：Phase 0 文档先行 + 优先级重排（数据安全 > 代码整洁）

### Phase 0：设计文档（先设计再动手）

**目标**：输出 `docs/DATABASE_DESIGN.md`，作为后续所有改动的蓝图

- **0.1 业务对象清单**：基于现有页面流程反推，列出每个核心对象的业务含义
  - 确认对象：项目、人员(staff)、工人(worker)、合同(三种类型待确认)、发票、收付款、结算、成本台账、库存、模板、用户/角色
  - **特别确认**：members(staff) 和 workers 保持分离（月薪 vs 日薪，流程不同）
  - **待业务确认**：三张合同表是否合并为一张（见下方"关键业务决策"）

- **0.2 关系矩阵**：每对关系的类型（1:1/1:N/M:N）、关联字段放在哪张表

- **0.3 ER 图**：Mermaid 语法，可视化所有表和关系

- **0.4 状态机图**：projects / invoices / settlements / wages 的状态流转

- **0.5 字段规范**：
  - 金额字段：INTEGER（以"分"为单位）+ 说明文档
  - 审计字段：所有表统一 `id`, `created_at`, `updated_at`
  - 软删除字段：财务表加 `deleted_at`
  - 状态字段：`CHECK` 约束 + 枚举定义

- **0.6 反范式设计说明**：如果某些地方需要反范式，必须说明原因

- **0.7 前端影响评估**：REAL→INTEGER 的前端 ÷100 转换方案

**产出物**：`docs/DATABASE_DESIGN.md` — 需人工确认后再进入 Phase 1

---

### Phase 1：数据安全修复（会丢数据/有安全风险的先修）

**目标**：修复精度丢失、安全漏洞、不可逆删除

#### 1.1 FallbackPolicy 安全修复
```csharp
// Program.cs — 改 DefaultPolicy → FallbackPolicy
options.FallbackPolicy = new AuthorizationPolicyBuilder()
    .RequireAuthenticatedUser()
    .Build();
// 显式豁免
app.MapGet("/api/health", ...).AllowAnonymous();
app.MapPost("/api/auth/login", ...).AllowAnonymous();
```
- 验证：未认证请求应返回 401

#### 1.2 金额 REAL → INTEGER（以"分"为单位）

**涉及字段（全部）**：
projects.budget, contracts(新合并表).amount, invoices.amount/price_amount/tax_amount/received_amount, payment_records.amount, settlements.amount, cost_ledger.amount, wages.daily_wage/bonus/deduction/actual_wage/paid_amount, members.base_salary/daily_wage, workers.daily_wage, project_workers.daily_wage, inventory_transactions.unit_price, expenses.amount, salary_history.base_salary/subsidy

**SQLite 迁移方式**（ALTER TABLE 不支持改类型，需重建表）：
```sql
-- 以 projects 为例
CREATE TABLE projects_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'planning' CHECK(status IN ('planning','active','completed','archived')),
    budget INTEGER DEFAULT 0,  -- 改为 INTEGER（分）
    project_manager_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO projects_new SELECT id, name, description, address, start_date, end_date, status,
    CAST(budget * 100 AS INTEGER), project_manager_id, created_at, updated_at FROM projects;
DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;
```

**迁移前预检**：
```sql
-- 检查是否有异常精度的金额
SELECT id, amount, CAST(amount * 100 AS INTEGER) as converted,
       amount * 100 - CAST(amount * 100 AS INTEGER) as diff
FROM invoices WHERE (amount * 100 - CAST(amount * 100 AS INTEGER)) != 0;
```

**前端 ÷100 转换方案**：在 `src/utils/format.ts` 的 `formatMoney()` 函数中统一处理，不需要每个组件改：
```typescript
export function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
```
- 确认所有金额展示都经过 `formatMoney()`
- API 层不做转换，前端展示时统一 ÷100

#### 1.3 财务表添加软删除

为以下表添加 `deleted_at TEXT`：invoices, payment_records, wages, settlements, cost_ledger

**注意**：此步骤在 Phase 2（Repository 层）建立后执行更安全，因为 Repository 封装了 SQL，可以统一加 `WHERE deleted_at IS NULL`。如果 Phase 1 就做软删除，需要手动修改 20+ 端点文件的几十条 SQL，极易遗漏。

**执行策略**：Phase 1 只添加字段（ALTER TABLE ADD COLUMN deleted_at TEXT），不在 SQL 中加 WHERE 过滤。WHERE 过滤在 Phase 2 Repository 层统一处理。

**验证**：
```sql
-- 确认字段已添加
PRAGMA table_info(invoices);  -- 应包含 deleted_at
```

#### 1.4 迁移前完整备份
```bash
copy engineering.db engineering.db.pre-restructure-YYYYMMDD
```
```sql
PRAGMA integrity_check;  -- 应返回 ok
```

#### 1.5 迁移后校验
```sql
-- 记录数对比
SELECT 'invoices' as tbl, COUNT(*) FROM invoices;
-- 金额总和对比（分→元）
SELECT SUM(amount)/100.0 FROM invoices WHERE deleted_at IS NULL;
```

---

### Phase 2：范式修复 + 性能（结构规范化）

**目标**：修复 1NF 违反，添加索引和约束

#### 2.1 拆解 TEXT 多值字段（1NF 修复）

> **修订**：不用统一 attachments 多态表，按业务实体各自建关联表

| 原字段 | 目标关联表 |
|--------|-----------|
| `partners.project_ids TEXT` | `partner_projects(partner_id INTEGER, project_id INTEGER)` |
| `supervisors.project_ids TEXT` | `supervisor_projects(supervisor_id INTEGER, project_id INTEGER)` |
| `income_contracts.files TEXT` | `contract_files(contract_id INTEGER, contract_type TEXT, file_name TEXT, file_url TEXT)` |
| `expense_contracts.files TEXT` | 同上 contract_files |
| `agreement_contracts.files TEXT` | 同上 contract_files |
| `settlements.files TEXT` | `settlement_files(settlement_id INTEGER, file_name TEXT, file_url TEXT)` |
| `payment_records.invoice_details TEXT` | `payment_invoices(payment_id INTEGER, invoice_id INTEGER, amount INTEGER)` |
| `settlements.invoice_details TEXT` | `settlement_invoices(settlement_id INTEGER, invoice_id INTEGER, amount INTEGER)` |
| `departments.positions TEXT` | `department_positions(dept_id INTEGER, position_name TEXT)` |

**迁移前预检**：
```sql
-- 确认 TEXT 字段的数据格式（JSON 数组？逗号分隔？）
SELECT id, project_ids FROM partners LIMIT 10;
SELECT id, files FROM income_contracts LIMIT 10;
SELECT id, invoice_details FROM payment_records LIMIT 10;
```

**SQLite 迁移方式**：同样用 CREATE new → INSERT → DROP → RENAME

#### 2.2 添加索引
```sql
-- 高频查询条件
CREATE INDEX idx_pw_project ON project_workers(project_id);
CREATE INDEX idx_pw_worker ON project_workers(worker_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_deleted ON invoices(deleted_at);
CREATE INDEX idx_cost_ledger_project ON cost_ledger(project_id);
CREATE INDEX idx_cost_ledger_direction ON cost_ledger(direction);
CREATE INDEX idx_wages_project_month ON wages(project_id, year_month);
CREATE INDEX idx_attendances_project_month ON attendances(project_id, year_month);
CREATE INDEX idx_settlements_project ON settlements(project_id);
CREATE INDEX idx_payment_records_project ON payment_records(project_id);
CREATE INDEX idx_payment_records_type ON payment_records(type);
```

#### 2.3 统一审计字段
为缺少 updated_at 的表补充：workers, payment_records, cost_ledger_categories, cost_ledger_match_rules, inventory_transactions, salary_history, project_members

#### 2.4 迁移后校验
```sql
-- 验证关联表数据
SELECT COUNT(*) FROM partner_projects;
SELECT COUNT(*) FROM settlement_files;
-- 验证索引生效
EXPLAIN QUERY PLAN SELECT * FROM cost_ledger WHERE project_id=1 AND direction='expense';
-- 应显示 "USING INDEX" 而非 "SCAN"
```

---

### Phase 3：合同表重构（需业务确认）

**前置条件**：用户确认以下"关键业务决策"

#### 3.1 关键业务决策（需用户回答）

**问题 A：三张合同表是否合并？**

当前状态：
- `income_contracts`、`expense_contracts`、`agreement_contracts` 结构 90% 相同
- `agreement_contracts` 多一个 `agreement_type` 字段
- 前端 `ContractPage.tsx` 按三种类型分 Tab
- 后端 `ContractEndpoints.cs` 的 `MapContractCrud` 方法已经对收入/支出合同做了复用（只是不同表名）

方案 A-1（合并）：三表合一 + `contract_type` 列，前端/后端按 type 过滤
- 优点：消除重复结构，统一查询，减少维护成本
- 缺点：影响前后端联动重构，`agreement_type` 需要额外处理

方案 A-2（不合并）：保持现状，但统一字段名和审计字段
- 优点：改动最小，不影响现有业务逻辑
- 缺点：结构重复依然存在

**建议**：如果三种合同的业务流程确实不同（不同的表单字段、不同的审批流程），则不合并。如果只是"类型标签"的区别，则合并。

#### 3.2 如果确认合并
- 统一 `contracts` 表 + `contract_type TEXT CHECK('income','expense','agreement')`
- `agreement_type` 字段保留为可选字段（仅 agreement 类型使用）
- 前端 ContractPage.tsx 按 contract_type 过滤
- 数据迁移：三表数据 INSERT INTO contracts

#### 3.3 如果不合并
- 统一三张表的审计字段（created_at, updated_at）
- 统一字段名（确认三表的字段完全对齐）

---

### Phase 4：后端架构重构

#### 4.1 引入 Repository 层
```
EngineeringManager.Api/
├── Endpoints/         # HTTP 路由 + 参数解析（瘦 handler）
├── Repositories/      # 数据访问
│   ├── ProjectRepository.cs
│   ├── InvoiceRepository.cs
│   ├── ContractRepository.cs
│   └── ...
├── Models/            # DTO 和实体类
│   ├── Project.cs
│   ├── Contract.cs
│   └── ...
└── Common.cs          # 纯辅助函数
```

> **修订**：不用 `CrudRepository<T>` 泛型基类。不同表查询模式差异太大（软删/硬删、不同 JOIN、不同过滤）。改用共享 helper 扩展方法：
> ```csharp
> public static class DapperHelpers
> {
>     public static async Task<IEnumerable<T>> QueryActive<T>(this IDbConnection db, string sql, object? param = null)
>         => await db.QueryAsync<T>(sql + " WHERE deleted_at IS NULL", param);
>
>     public static async Task<bool> SoftDelete(this IDbConnection db, string table, long id)
>         => await db.ExecuteAsync($"UPDATE [{table}] SET deleted_at=@Now WHERE id=@Id AND deleted_at IS NULL", ...) > 0;
> }
> ```
> 各 Repository 按需组合这些 helper。

#### 4.2 统一认证守卫
（Phase 1.1 已做 FallbackPolicy，此处验证覆盖所有端点）

#### 4.3 消除 `dynamic` DTO
为 settlements、contract templates 补充类型化 DTO

#### 4.4 拆分 Common.cs
- `Common.cs`：Ok/Fail/NotFound/ServerError/NowString/HashPassword/GetDefaultPermissions
- `Models/*.cs`：每种业务的 DTO record

#### 4.5 统一时间函数
删除每个文件的 `var now = () => ...`，统一用 `Common.NowString()`

#### 4.6 SQL 治理
`ContractEndpoints.cs` 的 `$"...{tableName}..."` 改为 switch 映射到编译时常量

#### 4.7 软删除 WHERE 过滤
在 Repository 层统一添加 `WHERE deleted_at IS NULL`（Phase 1.3 只加了字段，此处统一过滤逻辑）

---

### Phase 5：前端数据层重构

#### 5.1 引入 React Query（TanStack Query）
```bash
npm install @tanstack/react-query
```

#### 5.2 抽取数据 Hooks
```typescript
// src/hooks/data/useProjects.ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getProjects()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    staleTime: 30_000,
  })
}
```

#### 5.3 确认金额显示全部经过 formatMoney()
```typescript
// src/utils/format.ts — 确保所有金额展示走这个函数
export function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
```
- 全局搜索 `formatMoney` 调用点，确认参数已是"分"单位
- 全局搜索直接显示金额的地方（如 `¥${xxx.amount}`），改为 `formatMoney(xxx.amount)`

#### 5.4 拆分巨型组件
- WageManagement → WagePage + WageDashboard + WageCycleContainer
- ProjectDetail → ProjectDetailShell + 各 Tab 独立组件

#### 5.5 提取重复组件
- `CountUp` → `src/components/ui/CountUp.tsx`
- `HeroBanner` → `src/components/ui/HeroBanner.tsx`

#### 5.6 消除 `any` 类型

---

### Phase 6：文档与规范

#### 6.1 `docs/ARCHITECTURE.md`
后端分层架构图 + 新功能开发流程

#### 6.2 更新 AGENTS.md
新架构规范 + 迁移文件命名规范 + 新增表/字段 checklist

#### 6.3 版本号 v0.72.0 → v1.0.0

---

## 三、数据安全保障清单

1. ✅ Phase 1 迁移前：`engineering.db` 完整复制 + `PRAGMA integrity_check`
2. ✅ 每个迁移脚本前有预检查询（精度异常、TEXT 格式确认）
3. ✅ SQLite FK/CHECK 用 CREATE new → INSERT → DROP → RENAME 模式
4. ✅ 连接时 `PRAGMA foreign_keys = ON`
5. ✅ 金额 REAL→INTEGER 用 `CAST(amount * 100 AS INTEGER)`，逐表执行
6. ✅ 每步有 COUNT/SUM 校验查询
7. ✅ TEXT 拆分前先 SELECT 确认格式
8. ✅ 旧表保留到校验通过才 DROP
9. ✅ 软删除只加字段，WHERE 过滤在 Repository 层统一处理
10. ✅ 外键在数据迁移完成后才添加
11. ✅ 全程保留 `engineering.db.pre-restructure-*` 备份

---

## 四、关键业务决策（需用户回答）

### 决策 1：三张合同表是否合并？

| 选项 | 利 | 弊 |
|------|---|---|
| 合并为一张 `contracts` + `contract_type` | 消除结构重复，统一查询 | 影响前后端联动，`agreement_type` 需额外处理 |
| 保持三张表，统一字段名和审计字段 | 改动最小 | 结构重复依然存在 |

**我的建议**：鉴于 `MapContractCrud` 已经对收入/支出做了代码复用，且三种合同的业务流程（表单字段、审批）可能不同，**建议先保持三张表，只统一字段和审计字段**。等后续业务稳定后再评估是否合并。

### 决策 2：members 和 workers 是否合并？

**结论**：不合并。两者是不同业务对象：
- members = 管理人员（月薪制、base_salary、部门归属）
- workers = 农民工（日薪制、daily_wage、班组归属）

分离有明确的业务意义，强行合并会增加复杂度。

---

## 五、执行优先级总览

```
Phase 0 设计文档（最先做，需确认后才继续）
   ↓ 人工确认设计文档
Phase 1 数据安全（FallbackPolicy + REAL→INTEGER + 软删除字段 + 备份）
   ↓ 校验通过
Phase 2 范式修复（TEXT 拆分 + 索引 + 审计字段）
   ↓ 校验通过
Phase 3 合同表重构（需业务决策确认后）
   ↓ 校验通过
Phase 4 后端重构（Repository 层 + 代码清理 + 软删除 WHERE）
Phase 5 前端重构（React Query + Hooks + 组件拆分 + 金额显示）
Phase 6 文档 + 版本号
```
