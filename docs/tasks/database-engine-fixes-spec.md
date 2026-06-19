# 数据库引擎 10 项修复任务规格书

## 背景

项目从 Electron 迁移到 C# (ASP.NET Core + Dapper + SQLite)，迁移过程中数据库引擎存在多处硬编码和缺失端点。所有数据文件应位于用户选择的 `dataPath`（默认 `%APPDATA%/工程管家`），但当前多处硬编码导致路径不一致。

---

## 问题 1: config.json 的 dataPath 被完全忽略 (P0 严重)

### 现状
`Program.cs` 第 17-28 行注册 `IDbConnection` 时硬编码数据库路径：
```csharp
var dbPath = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
    "工程管家", "engineering.db");
```
完全不读取 `config.json` 中的 `dataPath` 字段。

### 需要修改的文件
- `EngineeringManager.Api/Program.cs` — 第 17-28 行

### 修复方案
1. 在 `Program.cs` 中添加一个静态方法 `ResolveDataPath()`：
   - 先读取 `%APPDATA%/工程管家/config.json`
   - 如果存在且包含 `dataPath` 字段，使用该路径
   - 否则使用默认路径 `%APPDATA%/工程管家`
2. 在 `IDbConnection` 注册中调用 `ResolveDataPath()` 拼接 `engineering.db`
3. 将 `ResolveDataPath()` 设为 `public static`，供其他端点类使用

### 验证
- 修改 `config.json` 的 `dataPath` 为其他路径后重启，数据库连接应指向新路径
- 不配置 `config.json` 时应使用默认路径

---

## 问题 2: readMode 硬编码为 "dual"，切换功能无效 (P1 重要)

### 现状
- `SystemEndpoints.cs` 第 327 行：成功时 `readMode = "dual"` 硬编码
- `SystemEndpoints.cs` 第 340 行：失败时 `readMode = "json-only"` 硬编码
- 没有 `PUT /api/sqlite/read-mode` 端点

### 需要修改的文件
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs`

### 修复方案
1. 在 `config.json` 中添加 `readMode` 字段（默认 `"dual"`）
2. `GET /api/sqlite/status` 从 `config.json` 读取 `readMode`，不再硬编码
3. 添加 `PUT /api/sqlite/read-mode` 端点：
   - 接收 `{ "mode": "dual" | "sqlite-primary" | "json-only" }`
   - 写入 `config.json`
   - 返回 `Common.Ok()`

### 验证
- 调用 `PUT /api/sqlite/read-mode` 切换模式后，`GET /api/sqlite/status` 返回对应值

---

## 问题 3: enableSqlite 和 migrateToSqlite 端点缺失 (P0 严重)

### 现状
前端 `tauri-bridge.ts` 定义了：
- `enableSqlite()` → `POST /api/sqlite/enable`
- `migrateToSqlite()` → `POST /api/sqlite/migrate`

这两个端点在 C# 后端**完全不存在**，调用返回 404。

### 需要修改的文件
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs`

### 修复方案
1. 添加 `POST /api/sqlite/enable` 端点：
   - 确保数据库文件和目录存在
   - 执行建表逻辑（见问题 7）
   - 返回 `Common.Ok(new { success = true })`

2. 添加 `POST /api/sqlite/migrate` 端点：
   - 读取 `dataPath` 下的 JSON 数据文件（projects.json, members.json 等）
   - 将数据导入 SQLite 对应表
   - 返回 `Common.Ok(new { success = true, migratedTables = [...] })`

### 验证
- 首次运行调用 `POST /api/sqlite/enable` 后数据库表应被创建
- 调用 `POST /api/sqlite/migrate` 后 JSON 数据应被导入 SQLite

---

## 问题 7: 数据库无表结构初始化逻辑 (P1 重要)

### 现状
`Program.cs` 第 24-26 行只执行 `PRAGMA journal_mode=WAL`，没有建表。
项目中引用了至少 24 张表但没有 CREATE TABLE 语句。

### 需要修改的文件
- `EngineeringManager.Api/Program.cs`

### 修复方案
在 `IDbConnection` 注册的 `conn.Open()` 和 WAL PRAGMA 之后，添加建表逻辑。需要创建的表（根据 `SystemEndpoints.cs` 和其他端点的查询推断）：

```sql
-- 项目
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    start_date TEXT,
    end_date TEXT,
    budget REAL,
    description TEXT,
    address TEXT,
    manager TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 成员/员工
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    id_card TEXT,
    gender TEXT,
    department TEXT,
    position TEXT,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    photo TEXT,
    bank_card TEXT,
    bank_name TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 工人
CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    id_card TEXT,
    gender TEXT,
    worker_type TEXT,
    team_id TEXT,
    bank_card TEXT,
    bank_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    updated_at TEXT
);

-- 项目工人关联
CREATE TABLE IF NOT EXISTS project_workers (
    id TEXT PRIMARY KEY,
    worker_id TEXT,
    project_id TEXT,
    team_id TEXT,
    daily_wage REAL,
    worker_type TEXT,
    entry_date TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT
);

-- 工资
CREATE TABLE IF NOT EXISTS wages (
    id TEXT PRIMARY KEY,
    worker_id TEXT,
    project_id TEXT,
    amount REAL,
    month TEXT,
    paid_amount REAL,
    paid_date TEXT,
    status TEXT DEFAULT 'pending',
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 考勤
CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    worker_id TEXT,
    project_id TEXT,
    date TEXT,
    status TEXT,
    check_in TEXT,
    check_out TEXT,
    remark TEXT,
    created_at TEXT
);

-- 发票
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_no TEXT,
    type TEXT,
    direction TEXT,
    amount REAL,
    tax_amount REAL,
    status TEXT DEFAULT 'pending',
    project_id TEXT,
    partner_id TEXT,
    contract_id TEXT,
    date TEXT,
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 合同
CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT DEFAULT 'draft',
    amount REAL,
    project_id TEXT,
    partner_id TEXT,
    start_date TEXT,
    end_date TEXT,
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 结算
CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    project_id TEXT,
    partner_id TEXT,
    date TEXT,
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 合作单位
CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    contact TEXT,
    phone TEXT,
    bank_card TEXT,
    bank_name TEXT,
    address TEXT,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 库存物料
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    spec TEXT,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 出入库记录
CREATE TABLE IF NOT EXISTS inventory_records (
    id TEXT PRIMARY KEY,
    item_id TEXT,
    project_id TEXT,
    type TEXT,
    quantity REAL,
    unit_price REAL,
    date TEXT,
    remark TEXT,
    created_at TEXT
);

-- 审计日志
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT,
    resource TEXT,
    resource_id TEXT,
    resource_name TEXT,
    username TEXT,
    details TEXT,
    created_at TEXT
);

-- 角色
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    permissions TEXT,
    is_system INTEGER DEFAULT 0,
    created_at TEXT
);

-- 用户
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    updated_at TEXT
);

-- 快照元数据
CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    name TEXT,
    size INTEGER,
    created_at TEXT
);

-- 班组
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    project_id TEXT,
    leader_id TEXT,
    remark TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 成本台账
CREATE TABLE IF NOT EXISTS cost_ledger (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    category TEXT,
    subcategory TEXT,
    direction TEXT,
    amount REAL,
    date TEXT,
    partner_id TEXT,
    invoice_id TEXT,
    remark TEXT,
    files TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 成本分类
CREATE TABLE IF NOT EXISTS cost_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    direction TEXT,
    parent_id TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT
);

-- 工资历史
CREATE TABLE IF NOT EXISTS salary_history (
    id TEXT PRIMARY KEY,
    worker_id TEXT,
    amount REAL,
    effective_date TEXT,
    remark TEXT,
    created_at TEXT
);

-- 部门
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT
);

-- 模板
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    content TEXT,
    variables TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- 收付款记录
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT,
    type TEXT,
    amount REAL,
    date TEXT,
    remark TEXT,
    files TEXT,
    created_at TEXT
);
```

### 注意事项
- 建表语句放在一个 `EnsureTables(IDbConnection db)` 私有静态方法中
- 在 `IDbConnection` 注册的 lambda 中调用
- 所有字段名使用 snake_case（与 Dapper 查询一致）
- TEXT 类型存储日期（SQLite 无原生日期类型）
- 如果表已存在，`CREATE TABLE IF NOT EXISTS` 不会覆盖

### 验证
- 删除数据库文件后重启，所有表应自动创建
- 调用 `GET /api/sqlite/status` 应返回各表行数（均为 0）

---

## 问题 4: 审计日志 localStorage 双写残留 (P2 中等)

### 现状
`src/utils/audit.ts` 保留了完整的 localStorage 双写机制。C# 后端已有完整审计日志端点。

### 需要修改的文件
- `src/utils/audit.ts`

### 修复方案
1. 移除 `audit.ts` 中所有 localStorage 读写代码
2. `logAudit()` 只调用后端 API `POST /api/audit/logs`
3. `queryAuditLogs()` 只调用后端 API `GET /api/audit/logs`
4. `getAuditStats()` 只调用后端 API `GET /api/audit/stats`
5. `clearAuditLogs()` 只调用后端 API `DELETE /api/audit/clear`
6. 移除 `setCurrentAuditUser()` 中的 localStorage 写入
7. 移除启动时清理 localStorage 的逻辑

### 验证
- 操作后审计日志只通过 API 读写
- 浏览器 localStorage 中不再有 `audit_logs` 数据

---

## 问题 5: AuthContext.tsx 是死代码 (P2 中等)

### 现状
`src/hooks/AuthContext.tsx` 仍存在且包含从 localStorage 恢复会话的逻辑。实际使用的是 `src/store/authStore.ts` (Zustand)。

### 需要修改的文件
- 删除 `src/hooks/AuthContext.tsx`

### 修复方案
1. 确认没有组件导入 `AuthContext.tsx`（搜索 `from.*AuthContext`）
2. 如果没有引用，直接删除该文件
3. 如果有引用，改为导入 `authStore`

### 验证
- `grep -r "AuthContext" src/` 无结果
- 应用正常启动，登录功能正常

---

## 问题 6: 登录凭据以 Base64 存储 (P2 中等)

### 现状
`src/components/Login.tsx` 第 40 行：
```typescript
function saveCred(u: string, p: string) { localStorage.setItem(CRED_KEY, btoa(JSON.stringify({ u, p }))) }
```
Base64 是可逆编码，不是加密。

### 需要修改的文件
- `src/components/Login.tsx`

### 修复方案
方案 A（推荐）：只记住用户名，不存密码
```typescript
function saveCred(u: string) { localStorage.setItem(CRED_KEY, JSON.stringify({ u })) }
function loadCred() { try { return JSON.parse(localStorage.getItem(CRED_KEY) || '{}') } catch { return {} } }
```

方案 B：如果必须记住密码，用简单混淆（桌面应用安全要求较低）
```typescript
function saveCred(u: string, p: string) {
  // 简单混淆，防止直接可读
  const encoded = btoa(encodeURIComponent(JSON.stringify({ u, p: btoa(p) })))
  localStorage.setItem(CRED_KEY, encoded)
}
```

### 验证
- 勾选"记住密码"后重启，用户名应被记住
- 方案 A 下密码不被记住，需重新输入

---

## 问题 8: SQLite 状态查询 readMode 展示不一致 (P3 低)

### 现状
已在问题 2 中修复（从 config.json 读取 readMode）。

### 额外需要修改的文件
- `src/components/SettingsSqliteSection.tsx` — 第 156 行

### 修复方案
确认前端展示与后端返回值一致。`status.readMode || 'dual'` 兜底逻辑保留即可。

---

## 问题 9: uploads 路径与 dataPath 脱节 (P3 低)

### 现状
`FileEndpoints.cs` 所有端点硬编码 `%APPDATA%/工程管家/uploads/`。

### 需要修改的文件
- `EngineeringManager.Api/Endpoints/FileEndpoints.cs`
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs` — 第 204-205 行

### 修复方案
1. 使用问题 1 中的 `ResolveDataPath()` 方法获取基础路径
2. uploads 路径改为 `Path.Combine(ResolveDataPath(), "uploads")`
3. `GET /api/config/uploads-path` 返回正确路径
4. 快照目录也改为 `Path.Combine(ResolveDataPath(), "db-snapshots")`

### 验证
- 修改 dataPath 后，文件上传/下载应使用新路径下的 uploads 目录

---

## 问题 10: 快照恢复后 WAL 未清理 (P3 低)

### 现状
`SystemEndpoints.cs` 第 141-149 行，`File.Copy` 替换数据库后没有清理 WAL 文件。

### 需要修改的文件
- `EngineeringManager.Api/Endpoints/SystemEndpoints.cs` — 第 141-149 行

### 修复方案
在 `File.Copy` 之后，添加 WAL 清理：
```csharp
// 删除 WAL 和 SHM 文件
var walPath = dbPath + "-wal";
var shmPath = dbPath + "-shm";
if (File.Exists(walPath)) File.Delete(walPath);
if (File.Exists(shmPath)) File.Delete(shmPath);
```

### 验证
- 有 WAL 文件时执行快照恢复，恢复后 WAL 文件应被清理

---

## 执行顺序建议

1. **问题 7**（建表）— 其他所有功能依赖表存在
2. **问题 1**（dataPath）— 核心路径问题
3. **问题 9**（uploads 路径）— 与问题 1 联动
4. **问题 3**（enableSqlite/migrate 端点）— 依赖建表逻辑
5. **问题 2 + 8**（readMode）— 依赖 config.json 读写
6. **问题 10**（WAL 清理）— 小改动
7. **问题 4**（审计日志清理）— 纯前端
8. **问题 5**（删除死代码）— 纯前端
9. **问题 6**（密码存储）— 纯前端

---

## 关键辅助方法

问题 1 中需要在 `Program.cs` 添加的 `ResolveDataPath()` 方法，建议如下：

```csharp
public static string ResolveDataPath()
{
    var defaultPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "工程管家");

    var configPath = Path.Combine(defaultPath, "config.json");
    if (File.Exists(configPath))
    {
        try
        {
            var json = File.ReadAllText(configPath);
            var config = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json);
            if (config != null && config.ContainsKey("dataPath"))
            {
                var customPath = config["dataPath"]?.ToString();
                if (!string.IsNullOrEmpty(customPath) && Directory.Exists(customPath))
                {
                    return customPath;
                }
            }
        }
        catch { }
    }

    return defaultPath;
}
```

此方法可在所有端点类中调用，统一路径解析逻辑。
