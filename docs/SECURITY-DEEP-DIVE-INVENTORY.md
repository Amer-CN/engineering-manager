# 安全架构深度盘点（工程管家）

> 生成基线：`bbddc22f` · 日期：2026-08-22
> 数据源：`Security/*.cs`、`Services/SafeQueryValidator.cs`、`EntryPoint.cs`、`routes.ts`

## 目录

1. [PII 加密体系（PiiProtector）](#pii-加密体系piiprotector)
2. [PII 重加密 Worker](#pii-重加密-worker)
3. [行级写权限裁决（RowWriteGate）](#行级写权限裁决rowwritegate)
4. [SafeQueryValidator — SQL 注入防护](#safequeryvalidator--sql-注入防护)
5. [桌面壳架构（EntryPoint + MainWindow）](#桌面壳架构entrypoint--mainwindow)
6. [前端路由系统](#前端路由系统)

---

## PII 加密体系（PiiProtector）

**文件**：`Security/PiiProtector.cs`（330 行）

### 加密参数

| 参数 | 值 |
|------|-----|
| 算法 | AES-GCM |
| Key 长度 | 32 字节（256-bit） |
| Nonce 长度 | 12 字节 |
| Tag 长度 | 16 字节 |
| Master key 保护 | Windows DPAPI（CurrentUser scope） |
| 密文格式 | `base64(version[1] || nonce[12] || tag[16] || ciphertext[N])` |
| 旧密文格式（v1.2.0） | `base64(nonce[12] || tag[16] || ciphertext[N])`（无 version 字节） |

### 密钥管理

- **存储**：`pii_keys` 表，`encrypted_key` BLOB 列存 DPAPI 加密后的 master key
- **Active key**：`is_active=1`，同一时刻只有一个
- **Retired key**：`is_active=0` + `retired_at` 记录退役时间，仍可用于解密旧密文
- **启动初始化**：
  1. `pii_keys` 表空 → 从 `%APPDATA%\工程管家\pp.key` 迁移 legacy key → 写 key_id=1
  2. `pii_keys` 表非空 → 加载所有 key，DPAPI 解密后缓存在内存 `_keysById`
  3. 找 active：`is_active=1` 优先，否则取最大 key_id

### 密文解密流程

```
1. base64 decode → byte[]
2. 读首字节 firstByte
3. 启发式判断：
   - firstByte ∈ [1, 200] 且 _keysById 包含 → 新格式（headerSize = 1+12+16）
   - 否则 → 旧格式 fallback key_id=1（headerSize = 12+16）
4. 分离 nonce + tag + ciphertext
5. AES-GCM Decrypt
6. UTF-8 decode → 明文
```

**边界风险**：旧格式首字节是随机 nonce 字节（0-255），撞上 [1,200] 且是有效 key_id 的概率 ~1/256。这种 case 解密会失败抛异常，不会静默错解。

### Key Rotation

```
1. 生成新 32 字节随机 key
2. DPAPI 加密
3. UPDATE pii_keys SET is_active=0, retired_at=now WHERE is_active=1
4. INSERT pii_keys (encrypted_key, is_active=1, created_by=adminUid)
5. 内存更新 _keysById + _activeKeyId
```

### 线程安全

单例，所有 `_keysById` / `_activeKeyId` 读写用 `_lock` 保护。

---

## PII 重加密 Worker

**文件**：`Security/PiiReencryptWorker.cs`（228 行）

### 功能

admin rotate 新 key 后，调此 worker 用新 active key 重新加密所有 `_enc` 列。

### 处理的 13 个 _enc 列

| 表 | 列 |
|----|-----|
| members | id_card_enc, id_card_address_enc, phone_enc, bank_account_enc |
| workers | id_card_enc, phone_enc, address_enc, bank_account_enc |
| partners | phone_enc, bank_account_enc, credit_code_enc, tax_number_enc |
| supervisors | phone_enc |

### 性能优化（v0.78.1）

| 参数 | 值 | 说明 |
|------|-----|------|
| ChunkSize | 500 | 每批 SELECT 500 行（游标分页 `WHERE id > lastId`） |
| BatchCommitSize | 50 | 每 50 行开一个事务提交 |
| 进度更新粒度 | 每 50 行 | 前端轮询 3s 可见变化 |
| 重启继续 | `last_processed_id` + `current_table/column` 持久化 | 断点续传 |

### 状态机

```
idle → running → completed / completed_with_errors
```

### 执行流程

```
1. 检查 status != "running"（防并发）
2. 初始化状态（清零进度）
3. 算 total rows（遍历 13 列 COUNT）
4. chunked 处理每列：
   - 每次取 500 行
   - 逐行 Decrypt → Encrypt（新 key）
   - 每 50 行批量事务提交
   - 每 50 行更新进度
5. 完成：status = completed / completed_with_errors
```

---

## 行级写权限裁决（RowWriteGate）

**文件**：`Security/RowWriteGate.cs`（76 行）

### RowWriteOutcome 枚举

```csharp
public enum RowWriteOutcome
{
    Denied,                  // 无权操作
    AllowedOwn,              // 本人创建的行
    AllowedViaAuthorization  // 授权项目内跨人（需落 audit）
}
```

### Classify 裁决逻辑

```csharp
public static RowWriteOutcome Classify(ctx, db, rowCreatedBy, rowProjectId)
{
    if (IsAdmin(ctx)) return AllowedOwn;        // admin 全放行
    if (uid == null) return Denied;              // 未登录 fail-closed
    if (rowCreatedBy == uid) return AllowedOwn;  // 本人行
    if (GetDataScope == AuthorizedProjects
        && rowProjectId != null
        && EXISTS(project_authorizations WHERE project_id=@P AND user_id=@U))
        return AllowedViaAuthorization;          // 授权项目内跨人
    return Denied;
}
```

### AuditWriter.CrossUserEdit

```csharp
public static void CrossUserEdit(db, tx, ctx, table, rowId, endpoint, rowOwner, projectId)
```

- **不写 try/catch** — 审计写不进 → 事务回滚 → 修改不生效（fail-closed）
- 审计记录：`action=cross_user_edit`, `level=warning`, `details=endpoint=X; rowOwner=Y; projectId=Z`

---

## SafeQueryValidator — SQL 注入防护

**文件**：`Services/SafeQueryValidator.cs`（851 行）

### 防护层级

```
1. 基本清理（trim, 去尾分号）
2. AST 解析（SqlQueryParser + SQLiteDialect）
3. 必须恰好一条语句且为 Query
4. Body 必须是 Select（拒绝 UNION/INTERSECT/EXCEPT）
5. ForbiddenKeywords 二次兜底（INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/ATTACH/DETACH/PRAGMA/VACUUM/TRUNCATE/GRANT/REVOKE）
6. ForbiddenFunctions 二次兜底（load_extension/edit/fts3/fts4/fts5）
7. 收集所有被引用表（递归 FROM/JOIN/子查询）+ 校验表名白名单
8. 校验列白名单（递归校验投影/WHERE/GROUP BY/HAVING/ORDER BY 中的所有列引用）
9. AST 回写 SQL
10. 强制注入用户过滤（公司级 → UserFilterCompany / 项目级 → UserFilterWithAuthorizedProjects）
11. 强制 LIMIT 100（字符串兜底，括号深度感知定位）
```

### 白名单表（10 张）

| 表 | 维度 | 允许的列数 |
|----|------|-----------|
| projects | 公司级 | 11 |
| members | 公司级 | 16 |
| workers | 公司级 | 9 |
| invoices | 项目级 | 21 |
| settlements | 项目级 | 11 |
| cost_ledger | 项目级 | 14 |
| income_contracts | 项目级 | 11 |
| expense_contracts | 项目级 | 11 |
| inventory_items | 公司级 | 10 |
| partners | 公司级 | 12 |

### 禁止访问的表

`sqlite_master`、`sqlite_temp_master`、`sqlite_sequence`、`users`、`roles`、`audit_logs`、`llm_config`、`llm-config`

### 列校验递归覆盖的表达式类型

Identifier / CompoundIdentifier / Function / BinaryOp / UnaryOp / Case / Cast / Extract / Substring / InList / InSubquery / Exists / Between / Like / IsNull / IsNotNull / IsTrue / IsNotTrue / IsFalse / IsNotFalse / IsUnknown / IsNotUnknown / IsDistinctFrom / IsNotDistinctFrom / Nested / Subquery

### 顶层关键字定位

`FindTopLevelKeyword(sql, keyword)` 用括号深度追踪，只匹配深度 0 的关键字，避免命中子查询内的同名关键字。

### DryRun 预检

```sql
EXPLAIN <rewrittenSql>
```

只读操作，验证语法和表/列存在性。

### 审计日志

每次 `runSafeQuery` 执行（无论成功/失败）都写 `audit_logs`：
- `action=safe_query`
- `level=info`（成功）/ `warning`（失败）
- `details=Original SQL + Rewritten SQL`

---

## 桌面壳架构（EntryPoint + MainWindow）

### EntryPoint.cs（115 行）

**双模式启动**：

```
入口 [STAThread] Main(args)
  ├── args 包含 --api-only → 纯 API 模式（开发用）
  │     └── ConfigureServices → InitializeDatabase → ConfigureApp → Run
  │
  └── 桌面模式（默认）
        ├── HighDPI 设置
        ├── 记录已有 node PID（退出时不杀）
        ├── 检测 dist/ 目录
        ├── 开发模式：启动 Vite dev server
        ├── API 后台线程（MTA）
        │     └── ConfigureServices → InitializeDatabase → ConfigureApp → Run
        ├── 主线程（STA）：MainWindow
        └── 退出时清理 Vite node 进程
```

**关键**：
- API 在后台线程运行，WinForms 窗口在 STA 主线程
- 退出时只杀本次启动新增的 node 进程（不杀已有的）
- `Environment.Exit(0)` 确保完全退出

### MainWindow.cs（402 行）

WinForms + WebView2 桌面窗口，功能包括：
- WebView2 控件加载前端（生产：`dist/index.html` / 开发：`http://localhost:5173`）
- 自定义窗口控制（最小化/最大化/关闭/拖拽/全屏）
- 通过 WebView2 消息通信接收前端窗口控制命令
- 系统托盘支持

---

## 前端路由系统

**文件**：`src/routes.ts`（347 行）

### PageId 枚举（20 个页面）

```typescript
type PageId = 'dashboard' | 'projects' | 'contracts' | 'partners' | 'members'
            | 'hr' | 'labor' | 'costLedger' | 'drawings' | 'wages'
            | 'settlement' | 'templates' | 'inventory' | 'invoices'
            | 'knowledge' | 'voice' | 'writing' | 'reports'
            | 'settings' | 'users'
```

### 路由分类

| 分类 | 页面 | 侧边栏显示 |
|------|------|-----------|
| 核心业务 | dashboard, projects, contracts, partners, hr, labor | ✓ |
| 隐藏（重定向） | members, wages | ✗ |
| 财务模块 | settlement, templates, invoices, costLedger | ✓ |
| 资产模块 | inventory, drawings | ✓ |
| AI 模块 | knowledge, voice, writing, reports | ✓ |
| 系统模块 | settings, users | ✗ |

### 权限过滤

`getFilteredSidebarRoutes(permissions)` 按用户权限码过滤侧边栏路由：
- 管理员（`permissions.includes('users:create')`）→ 看到全部
- 非管理员 → 只看有 `<resource>:read` 权限的页面

### 快捷键导航

每条路由配置 `shortcut`（如 `G D` = 首页，`G P` = 项目），支持 `getRouteByShortcut(shortcut)` 查找。

### 合同子视图

```typescript
type ContractView = 'dashboard' | 'income' | 'expense'
```

合同看板 / 收入合同 / 支出合同三视图切换。

---

## 安全配置汇总表

| 安全项 | 实现位置 | 机制 |
|--------|---------|------|
| JWT 认证 | Program.cs | HmacSha256，环境变量 > 持久化文件 > 随机生成 |
| 密码哈希 | Common.cs | PBKDF2-SHA512，v2=210k iterations |
| 固定时间比较 | AuthEndpoints.cs | `CryptographicOperations.FixedTimeEquals` |
| PII 加密 | PiiProtector.cs | AES-GCM + DPAPI master key |
| PII 密钥轮换 | PiiProtector.cs | pii_keys 表，多 key 并存 |
| PII 重加密 | PiiReencryptWorker.cs | chunked + batched + 断点续传 |
| 数据范围过滤 | CurrentUser.cs | UserFilterCompany / UserFilterWithAuthorizedProjects |
| 行级写裁决 | RowWriteGate.cs | 四态裁决 + audit fail-closed |
| SQL 注入防护 | SafeQueryValidator.cs | AST 解析 + 白名单 + 用户过滤注入 |
| 限流 | Program.cs | login 5/min, write 30/s |
| 路径遍历 | FileEndpoints.cs / SttEndpoints.cs | IsPathSafe() |
| 可执行文件 | FileEndpoints.cs | 扩展名白名单（open-external） |
| 异常脱敏 | Common.cs | Sanitize() 移除路径 + 截断 |
| CORS | Program.cs | 仅 localhost:5173/3000/5048 |
| 静态文件缓存 | Program.cs | HTML no-cache / JS-CSS immutable |
| WebView2 消息 | MainWindow.cs | JSON 消息通信窗口控制 |

---

*文档结束。*
