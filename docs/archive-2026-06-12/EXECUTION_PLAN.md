# 工程管家 治理执行计划

> **状态**：已确认，待执行
> **日期**：2026-06-25
> **前置共识**：Phase 0 设计文档已由两个 AI 达成共识，用户已确认所有业务决策
> **核心约束**：真实业务数据不能丢；每个 Phase 完成后必须通过校验方可进入下一 Phase

---

## 业务决策确认

| 决策 | 结论 |
|------|------|
| 三张合同表是否合并？ | **不合并**，保持 `income_contracts` / `expense_contracts` / `agreement_contracts` 三张独立表，仅统一字段名和审计字段 |
| members 和 workers 是否合并？ | **不合并**，保持分离（staff 月薪 vs 工人 日薪） |

---

## Phase 0：设计文档

> ⚠️ 第一个 Phase，产出物需人工确认后才继续

### 产出物
**`docs/DATABASE_DESIGN.md`**，包含：

- **0.1 业务对象清单**：列出所有业务对象及含义
  - 项目 / 人员(staff) / 工人(worker) / 收入合同 / 支出合同 / 协议合同 / 发票 / 收付款 / 结算 / 成本台账 / 库存 / 模板 / 用户/角色
- **0.2 关系矩阵**：每对关系的类型（1:1/1:N/M:N）和关联字段
  - 关键关系：项目↔人员(M:N via project_members)、项目↔工人(M:N via project_workers)、项目↔合同(1:N)、合同↔发票(1:N)、发票↔收付款(M:N via payment_invoices)
- **0.3 Mermaid ER 图**：可视化全部表
- **0.4 状态机图**：projects / invoices / settlements / wages
- **0.5 字段规范**：金额 INTEGER(分)、审计字段 created_at/updated_at、软删除 deleted_at、状态 CHECK 约束
- **0.6 反范式设计说明**：如有反范式，必须写原因

### 验收标准
- [ ] 所有当前表都有对应业务对象说明
- [ ] 所有表间关系都有 1:1/1:N/M:N 标注
- [ ] ER 图可直接在 Markdown 查看器中渲染
- [ ] 字段规范与后续 Phase 的迁移 SQL 一致

### 确认点
**产出 `docs/DATABASE_DESIGN.md` 后暂停，等人工确认后再进入 Phase 1。**

---

## Phase 1：数据安全修复

> 会丢数据 / 安全漏洞的先修

### 1.1 迁移前完整备份

```powershell
# 备份数据库文件
Copy-Item "<dataPath>\engineering.db" "<dataPath>\engineering.db.pre-phase1-20260625"
```

```sql
-- 验证备份完整性
PRAGMA integrity_check;  -- 必须返回 ok
```

**验收**：备份文件存在 + integrity_check 返回 ok

---

### 1.2 FallbackPolicy 安全修复

**文件**：`EngineeringManager.Api/Program.cs`

**改动**：`DefaultPolicy` → `FallbackPolicy`

```csharp
// 改前
options.DefaultPolicy = new AuthorizationPolicyBuilder()
    .RequireAuthenticatedUser()
    .Build();

// 改后
options.FallbackPolicy = new AuthorizationPolicyBuilder()
    .RequireAuthenticatedUser()
    .Build();
```

同时在健康检查和登录端点上显式加 `.AllowAnonymous()`：

```csharp
app.MapGet("/api/health", ...).AllowAnonymous();
app.MapPost("/api/auth/login", ...).AllowAnonymous();
```

**验收**：
- [ ] 未认证请求 `/api/projects` 返回 401
- [ ] `/api/health` 无需认证即可访问
- [ ] `/api/auth/login` 无需认证即可访问

---

### 1.3 金额 REAL → INTEGER（以"分"为单位）

**涉及的全部表和字段**：

| 表 | 字段 |
|----|------|
| `projects` | `budget` |
| `members` | `base_salary`, `daily_wage` |
| `workers` | `daily_wage` |
| `project_workers` | `daily_wage` |
| `income_contracts` | `amount` |
| `expense_contracts` | `amount` |
| `agreement_contracts` | `amount` |
| `invoices` | `amount`, `price_amount`, `tax_amount`, `received_amount` |
| `payment_records` | `amount` |
| `wages` | `daily_wage`, `bonus`, `deduction`, `actual_wage`, `paid_amount` |
| `settlements` | `amount` |
| `cost_ledger` | `amount` |
| `inventory_transactions` | `unit_price` |
| `expenses` | `amount` |
| `salary_history` | `base_salary`, `subsidy` |

**SQLite 迁移方法**（ALTER TABLE 不支持改列类型，必须重建表）：

#### 预检查：每张表执行前先检查异常精度

```sql
-- 以 invoices 为例，每张表都要做
SELECT id, amount,
       CAST(amount * 100 AS INTEGER) as converted,
       amount * 100 - CAST(amount * 100 AS INTEGER) as diff
FROM invoices
WHERE (amount * 100 - CAST(amount * 100 AS INTEGER)) != 0;
```

如果有结果，记录并人工判断是否可安全转换。

#### 迁移：每张表 CREATE NEW → INSERT → DROP → RENAME

```sql
-- 以 projects 为例
CREATE TABLE projects_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    budget INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

INSERT INTO projects_new
SELECT id, name, description, address, start_date, end_date, status,
       CAST(budget * 100 AS INTEGER), created_at, updated_at
FROM projects;

-- 校验：金额总和对比（旧 REAL 值 vs 新 INTEGER/100 值）
SELECT 'old_sum' as src, ROUND(SUM(budget), 2) FROM projects
UNION ALL
SELECT 'new_sum', CAST(SUM(budget) AS REAL)/100.0 FROM projects_new;
-- 两个值应一致

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;
```

对所有 15+ 张表逐表执行此模式。

**验收**：
- [ ] 每张表迁移后 COUNT 不变
- [ ] 每张表金额总和一致（旧值 ≈ 新值÷100，误差 < 0.02 元）
- [ ] 预检查异常记录已人工处理

---

### 1.4 统一 time 函数

**文件**：`EngineeringManager.Api/Program.cs` 的 `Common` 类

添加 `NowString()` 静态方法：

```csharp
public static string NowString() => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
```

将所有端点文件中 `var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")` 替换为 `Common.NowString`。

**验收**：
- [ ] 全局搜索 `var now = () =>` 无遗留

---

### 1.5 迁移后备份

```powershell
Copy-Item "<dataPath>\engineering.db" "<dataPath>\engineering.db.post-phase1-20260625"
```

```sql
PRAGMA integrity_check;
```

---

## Phase 2：范式修复 + 性能

### 2.1 财务表添加软删除字段

为以下表添加 `deleted_at TEXT`：

| 表 |
|----|
| `invoices` |
| `payment_records` |
| `wages` |
| `settlements` |
| `cost_ledger` |

```sql
ALTER TABLE invoices ADD COLUMN deleted_at TEXT;
ALTER TABLE payment_records ADD COLUMN deleted_at TEXT;
ALTER TABLE wages ADD COLUMN deleted_at TEXT;
ALTER TABLE settlements ADD COLUMN deleted_at TEXT;
ALTER TABLE cost_ledger ADD COLUMN deleted_at TEXT;
```

> ⚠️ 此阶段只添加字段，不在 SQL 中加 WHERE 过滤。WHERE 过滤在 Phase 4 Repository 层统一处理。

**验收**：
- [ ] `PRAGMA table_info(invoices)` 包含 `deleted_at` 列
- [ ] 所有 5 张表确认

---

### 2.2 拆解 TEXT 多值字段（1NF 修复）

#### 预检查：确认每个字段的数据格式

```sql
SELECT id, project_ids FROM partners LIMIT 10;
SELECT id, project_ids FROM supervisors LIMIT 10;
SELECT id, files FROM income_contracts LIMIT 10;
SELECT id, files FROM expense_contracts LIMIT 10;
SELECT id, files FROM agreement_contracts LIMIT 10;
SELECT id, files FROM settlements LIMIT 10;
SELECT id, invoice_details FROM payment_records LIMIT 10;
SELECT id, invoice_details FROM settlements LIMIT 10;
SELECT id, positions FROM departments LIMIT 10;
```

根据实际格式（JSON 数组 / 逗号分隔）确定拆分逻辑。

#### 拆解清单

| 原字段 | 新建关联表 | 关联字段 |
|--------|-----------|---------|
| `partners.project_ids TEXT` | `partner_projects` | `partner_id INTEGER, project_id INTEGER, PRIMARY KEY(partner_id, project_id)` |
| `supervisors.project_ids TEXT` | `supervisor_projects` | `supervisor_id INTEGER, project_id INTEGER, PRIMARY KEY(supervisor_id, project_id)` |
| `income_contracts.files TEXT` | `contract_files` | `id INTEGER PK, contract_id INTEGER, contract_type TEXT, file_name TEXT, file_url TEXT` |
| `expense_contracts.files TEXT` | 同上 `contract_files` | `contract_type='expense'` |
| `agreement_contracts.files TEXT` | 同上 `contract_files` | `contract_type='agreement'` |
| `settlements.files TEXT` | `settlement_files` | `id INTEGER PK, settlement_id INTEGER, file_name TEXT, file_url TEXT` |
| `payment_records.invoice_details TEXT` | `payment_invoices` | `payment_id INTEGER, invoice_id INTEGER, amount INTEGER, PRIMARY KEY(payment_id, invoice_id)` |
| `settlements.invoice_details TEXT` | `settlement_invoices` | `settlement_id INTEGER, invoice_id INTEGER, amount INTEGER, PRIMARY KEY(settlement_id, invoice_id)` |
| `departments.positions TEXT` | `department_positions` | `dept_id INTEGER, position_name TEXT, PRIMARY KEY(dept_id, position_name)` |

#### 每张关联表的迁移步骤

```sql
-- 1. 建新表
CREATE TABLE partner_projects (
    partner_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    PRIMARY KEY (partner_id, project_id)
);

-- 2. 迁移数据（根据预检查确定的格式写拆分逻辑）

-- 3. 校验
SELECT COUNT(DISTINCT partner_id) FROM partner_projects;
-- 应与原表有 project_ids 不为空的记录数一致

-- 4. 删除原字段
-- SQLite 不支持 DROP COLUMN 直接删，需要重建整张原表
-- 同 Phase 1.3 的 CREATE NEW → INSERT → DROP → RENAME 模式
```

**验收**：
- [ ] 每个关联表记录数与原表非空记录数一致
- [ ] 原表 TEXT 字段已清除

---

### 2.3 添加索引

```sql
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

**验收**：
- [ ] `EXPLAIN QUERY PLAN SELECT * FROM cost_ledger WHERE project_id=1 AND direction='expense'` 显示 USING INDEX

---

### 2.4 统一审计字段

为缺少 `updated_at` 的表补充：

```sql
ALTER TABLE workers ADD COLUMN updated_at TEXT;
ALTER TABLE payment_records ADD COLUMN updated_at TEXT;
ALTER TABLE cost_ledger_categories ADD COLUMN updated_at TEXT;
ALTER TABLE cost_ledger_match_rules ADD COLUMN updated_at TEXT;
ALTER TABLE inventory_transactions ADD COLUMN updated_at TEXT;
ALTER TABLE salary_history ADD COLUMN updated_at TEXT;
ALTER TABLE project_members ADD COLUMN updated_at TEXT;
```

**验收**：
- [ ] `PRAGMA table_info(<table>)` 确认每张表都有 `created_at` 和 `updated_at`

---

### 2.5 三张合同表统一字段名和审计字段

三张合同表的字段完全一致（除 `agreement_contracts` 多一个 `agreement_type`），统一命名为：

```sql
-- 所有三张表统一字段：project_id, name, amount(INTEGER), counterparty, sign_date, status, remark, created_at, updated_at
-- 不合并表，但确保字段名和类型完全对齐
```

**验收**：
- [ ] `PRAGMA table_info(income_contracts)` / `expense_contracts` / `agreement_contracts` 字段名和类型一致
- [ ] `agreement_contracts` 额外保留 `agreement_type` 字段

---

## Phase 3：后端架构重构

> 以下改动基于 Phase 1-2 完成后的数据库

### 3.1 引入 Repository 层

#### 目录结构
```
EngineeringManager.Api/
├── Endpoints/              # 只做 HTTP 路由 + 参数解析 + 调用 Repository
├── Repositories/           # 所有数据访问
│   ├── ProjectRepository.cs
│   ├── MemberRepository.cs
│   ├── WorkerRepository.cs
│   ├── ContractRepository.cs
│   ├── InvoiceRepository.cs
│   ├── PaymentRepository.cs
│   ├── WageRepository.cs
│   ├── SettlementRepository.cs
│   ├── CostLedgerRepository.cs
│   ├── InventoryRepository.cs
│   ├── PartnerRepository.cs
│   ├── TemplateRepository.cs
│   └── ...
├── Models/                 # DTO record
│   ├── ProjectDto.cs
│   ├── MemberDto.cs
│   └── ...
└── Common.cs               # 纯辅助（Ok/Fail/NotFound/ServerError/NowString/HashPassword）
```

#### 共享 Helper（`Repositories/DapperHelpers.cs`）

```csharp
public static class DapperHelpers
{
    // 软删除表查询 — 自动追加 WHERE deleted_at IS NULL
    public static async Task<IEnumerable<T>> QueryActiveAsync<T>(
        this IDbConnection db, string sql, object? param = null)
    {
        // 如果 SQL 已有 WHERE，用 AND 追加；否则用 WHERE
        if (sql.Contains("WHERE", StringComparison.OrdinalIgnoreCase))
            sql += " AND deleted_at IS NULL";
        else
            sql += " WHERE deleted_at IS NULL";
        return await db.QueryAsync<T>(sql, param);
    }

    // 软删除
    public static async Task<bool> SoftDeleteAsync(
        this IDbConnection db, string table, long id)
    {
        var now = Common.NowString();
        var result = await db.ExecuteAsync(
            $"UPDATE [{table}] SET deleted_at = @Now, updated_at = @Now WHERE id = @Id AND deleted_at IS NULL",
            new { Now = now, Id = id });
        return result > 0;
    }
}
```

> ⚠️ QueryActiveAsync 的字符串拼接有局限性——如果 SQL 本身有子查询中的 WHERE，可能追加位置不对。执行 agent 需要在写具体 Repository 时根据实际 SQL 结构调整。如果某条 SQL 不适用自动追加，就在 Repository 里手写 `WHERE deleted_at IS NULL`。

#### Repository 模式（以 ProjectRepository 为例）

```csharp
public class ProjectRepository
{
    private readonly IDbConnection _db;
    public ProjectRepository(IDbConnection db) => _db = db;

    public async Task<IEnumerable<Project>> GetAll() =>
        await _db.QueryAsync<Project>("SELECT * FROM projects ORDER BY created_at DESC");

    public async Task<Project?> GetById(long id) =>
        await _db.QuerySingleOrDefaultAsync<Project>("SELECT * FROM projects WHERE id=@Id", new { Id = id });

    public async Task<long> Create(Project p)
    {
        var now = Common.NowString();
        var sql = @"INSERT INTO projects (name, description, ...) VALUES (...) RETURNING id";
        return await _db.ExecuteScalarAsync<long>(sql, new { ..., CreatedAt = now, UpdatedAt = now });
    }

    // ... Update, Delete
}
```

**验收**：
- [ ] `Endpoints/` 下的文件不再直接 `conn.QueryAsync<T>(sql)`，全部通过 Repository
- [ ] 所有对发票/收付款/工资/结算/成本台账的查询自动包含 `WHERE deleted_at IS NULL`
- [ ] 所有 DELETE 改为软删除（`UPDATE SET deleted_at=...`）

---

### 3.2 拆分 Common.cs

当前 `Common.cs` 包含 35 个 DTO record + 辅助函数。拆分：

- `Common.cs` → Ok/Fail/NotFound/ServerError/NowString/HashPassword/GetDefaultPermissions/IsPathSafe
- `Models/` → 每个 DTO record 独立文件（`ProjectDto.cs`, `MemberDto.cs` …）

**验收**：
- [ ] `Common.cs` 只含辅助函数，不含 DTO

---

### 3.3 消除 `dynamic`

当前 settlements 和 contract templates 使用 `dynamic` 接收请求参数。改为类型化 DTO：

```csharp
// 改前
app.MapPost("/api/settlements", async (IDbConnection db, dynamic body) => { ... })

// 改后
app.MapPost("/api/settlements", async (IDbConnection db, SettlementCreateDto dto) => { ... })
```

**验收**：
- [ ] 全局搜索 `dynamic` 在 Endpoints/ 下无遗留

---

### 3.4 SQL 字符串插值治理

`ContractEndpoints.cs` 中 `$"...{tableName}..."` 改为：

```csharp
string tableName = type switch
{
    "income"    => "income_contracts",
    "expense"   => "expense_contracts",
    "agreement" => "agreement_contracts",
    _ => throw new ArgumentException($"Unknown contract type: {type}")
};
var sql = $"SELECT * FROM [{tableName}] WHERE ...";  // tableName 现在来自编译时常量
```

**验收**：
- [ ] 全局搜索 `$\"...` 在 Endpoints/ 下无表名来自变量的情况

---

## Phase 4：前端数据层重构

### 4.1 金额显示统一

**文件**：`src/utils/format.ts`

确认 `formatMoney()` 函数存在并处理"分→元"转换：

```typescript
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
```

全局搜索所有金额显示点，确保全部经过 `formatMoney()`：

```bash
# 在 src/ 下搜索直接显示金额的 pattern
grep -r "¥" src/ --include="*.tsx" --include="*.ts"
grep -r "amount" src/ --include="*.tsx" --include="*.ts"
```

**验收**：
- [ ] 无直接 `¥{xxx.amount}` 而未经过 formatMoney 的情况
- [ ] 无直接 `xxx.budget` 显示而未经过 formatMoney 的情况

---

### 4.2 引入 React Query

```bash
npm install @tanstack/react-query
```

**文件**：`src/App.tsx`

包裹 `QueryClientProvider`：

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()

// 在 AppContent 外层包裹
<QueryClientProvider client={queryClient}>
  <AppContent />
</QueryClientProvider>
```

---

### 4.3 抽取数据 Hooks

在 `src/hooks/data/` 下创建：

| Hook | queryKey | 对应 API |
|------|----------|---------|
| `useProjects()` | `['projects']` | `api.getProjects()` |
| `useMembers()` | `['members']` | `api.getMembers()` |
| `useWorkers()` | `['workers']` | `api.getWorkers()` |
| `usePartners()` | `['partners']` | `api.getPartners()` |
| `useContracts()` | `['contracts']` | `api.getContracts()` |
| `useInvoices(projectId?)` | `['invoices', projectId]` | `api.getInvoices()` |
| `useCostLedger(projectId)` | `['costLedger', projectId]` | `api.getCostLedger()` |
| `useSettlements()` | `['settlements']` | `api.getSettlements()` |
| `useTemplates()` | `['templates']` | `api.getTemplates()` |
| `useDepartments()` | `['departments']` | `api.getDepartments()` |

每个 hook 模式：

```typescript
import { useQuery } from '@tanstack/react-query'
import { getAPI } from '../../services/api-adapter'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getProjects()
      if (!res.success) throw new Error(res.error || '获取项目失败')
      return res.data
    },
    staleTime: 30_000,
  })
}
```

将页面组件中的 `getAPI().then(api => api.getProjects()).then(...)` 替换为 `const { data: projects } = useProjects()`。

**验收**：
- [ ] 同一 queryKey 的请求在 30 秒内不会重复发送
- [ ] 所有数据 hooks 有统一错误处理

---

### 4.4 拆分巨型组件

| 原文件 | 拆分后 |
|--------|--------|
| `WageManagement.tsx` | `WagePage.tsx`（路由容器）+ `WageDashboard.tsx` + `WageCycleContainer.tsx` |
| `ProjectDetail.tsx` | 保持外壳，各 Tab 内容已拆分到 ProjectDetailTabs，确认各 Tab 不超过 300 行 |

---

### 4.5 提取重复组件

| 组件 | 当前位置 | 目标位置 |
|------|---------|---------|
| `CountUp` | `Projects.tsx` + `Dashboard.tsx` 各定义一次 | `src/components/ui/CountUp.tsx` |

确认 `HeroBanner` 是否已提取（AGENTS.md 提到是 ui 组件），如未提取则同样处理。

---

### 4.6 消除 `any` 类型

全局搜索 `useState<any` 和 `useState<any[]`，替换为具体类型。

**验收**：
- [ ] 全局搜索 `useState<any` 无遗留

---

## Phase 5：文档与版本

### 5.1 `docs/ARCHITECTURE.md`

内容：
- 后端分层架构图（Endpoints → Repositories → Dapper → SQLite）
- 前端架构图（React → Hooks → API Client → C# API）
- 新增功能开发流程 checklist

### 5.2 更新 AGENTS.md

- 新增 Repository 层开发规范
- 新增 React Query 数据层规范
- 迁移文件命名规范（`NNN_Description.sql`）
- 新增表/字段 checklist

### 5.3 更新版本号

`package.json` / `Sidebar.tsx` / `Login.tsx` / `installer/src/App.tsx` / `CHANGELOG.md` — `v0.72.0` → `v1.0.0`

---

## 数据安全保障清单（每 Phase 执行前检查）

1. ☐ Phase 1.1：`engineering.db` 完整复制到 `<dataPath>\engineering.db.pre-phase1-YYYYMMDD`
2. ☐ Phase 1.1：`PRAGMA integrity_check` 返回 `ok`
3. ☐ Phase 1.3：每张表金额转换前做预检查（异常精度）
4. ☐ Phase 1.3：每张表转换后 COUNT 不变、金额 SUM 一致
5. ☐ Phase 2.2：TEXT 拆分前 SELECT 确认数据格式
6. ☐ Phase 2.2：每个关联表记录数与原表非空记录数一致
7. ☐ Phase 2.4：`PRAGMA foreign_keys = ON` 在迁移完成后激活
8. ☐ 每个 Phase 结束后再做一次 `PRAGMA integrity_check`
9. ☐ 全程保留备份，不可删除

---

## 执行规则

1. **严格按 Phase 顺序执行**，不可跳过
2. **每个 Phase 的每个子步骤完成后必须校验**，通过才继续
3. **Phase 0 和 Phase 1 之间需人工确认**设计文档
4. **所有 SQL 操作必须在事务中执行**，失败则回滚
5. **迁移脚本保留在 `Migrations/Scripts/003_SchemaRestructure.sql`**，记录所有变更