# 工程管家 v1.0.0 — P0/P1 安全审计修复计划
> **审计时间**：2026-06-16
> **审计者**：darwin-skill 9 维 rubric 参照 + vibe-coding-guide 19 条 + 4 个 explore 子代理 file:line 实证
> **回滚锚点**：`git reset --hard v1.0.0-pre-vibe`（commit fcdffea3fed06f878789db7f08d98303ffdf077f）
> **严重度图例**：🔴 P0 必须修 / 🟡 P1 强烈建议 / 🟢 P2 可选

> ✅ **状态更新（2026-07-04）**：本计划中的 P0-1/2/3/4 与 P1-1/2 均已在 v1.0.0–v0.74.0 落地完成，详见 AGENTS.md「✅ 当前安全状态」。以下为原始修复计划（含 file:line），保留作实施记录与回滚参考。
> ⚠️ 版本号：本文档 v1.0.x / v1.1.0 等为历史规划编号，项目现行版本为 v0.8x。
> ⚠️ 历史：文中 src-tauri/…（Rust）相关描述为 C# 迁移前的历史，src-tauri/ 目录现已移除。

---

## TL;DR

工程管家 v1.0.0 在**架构层（迁移/SQL/UI/审计/数据存储）合规度极高**，但**鉴权/安全基线几乎为零**——4 个 🔴 P0 缺口，5 个 🟡 P1 缺口。本计划给出每个缺口的**精确修复步骤 + file:line + diff 草稿 + 回滚命令**。

**总工作量估计**：40-70 小时（不含测试/部署）。

**修复顺序**：P0-1（OCR key）→ P0-2（鉴权）→ P0-4（越权）→ P0-3（PII）→ P1 全部。

---

## 🔴 P0-1: OCR API Key 公开在安装包（最高优先级）

### 现状
- `E:\测试\public\ocr-config.json:5-6` 明文 `apiKey=<REDACTED>` `secretKey=<REDACTED>`
- 已被打进 `dist/ocr-config.json`，随安装包发布到**所有用户机器**
- `OcrEndpoints.cs:531-558` 直接从 JSON 读明文 key
- `src/services/ocr.ts:158-194` 前端把 key 写到 `localStorage['workbuddy_ocr_config']`

### 风险
**任何下载 Setup.exe 的人**都能拿到这个 key，**用你的额度跑 OCR**，你的百度账户可能被刷爆。

### 修复步骤

#### Step 1: 立即 rotate 现有 key（你自己做）
1. 登录 https://console.bce.baidu.com/
2. 找到现有 OCR 应用的 apiKey/secretKey
3. **撤销**（或修改）
4. 创建**新 key**，建议：
   - 开启 **IP 白名单**（如果可）
   - 开启 **QPS/每日调用上限**

#### Step 2: 改后端 key 加载逻辑（改 `OcrEndpoints.cs:531-558`）

**当前**（伪代码）：
```csharp
private static (string apiKey, string secretKey) LoadOcrConfig()
{
    var json = File.ReadAllText("ocr-config.json");
    var config = JsonSerializer.Deserialize<OcrConfig>(json);
    return (config.Baidu.ApiKey, config.Baidu.SecretKey);
}
```

**改为**：
```csharp
private static (string apiKey, string secretKey) LoadOcrConfig()
{
    // 优先读环境变量
    var apiKey = Environment.GetEnvironmentVariable("BAIDU_OCR_API_KEY");
    var secretKey = Environment.GetEnvironmentVariable("BAIDU_OCR_SECRET_KEY");
    if (!string.IsNullOrEmpty(apiKey) && !string.IsNullOrEmpty(secretKey))
        return (apiKey, secretKey);

    // Fallback: Windows DPAPI 加密的文件
    var encryptedPath = Path.Combine(
        ApiConfig.ResolveDataPath(),
        "ocr-config.encrypted.json");
    if (File.Exists(encryptedPath))
    {
        var encrypted = File.ReadAllBytes(encryptedPath);
        var plaintext = ProtectedData.Unprotect(
            encrypted, null, DataProtectionScope.CurrentUser);
        var config = JsonSerializer.Deserialize<OcrConfig>(plaintext);
        return (config.Baidu.ApiKey, config.Baidu.SecretKey);
    }

    throw new InvalidOperationException(
        "OCR key not configured. Set BAIDU_OCR_API_KEY/BAIDU_OCR_SECRET_KEY " +
        "or run setup wizard.");
}
```

#### Step 3: 改前端 key 存储（改 `src/services/ocr.ts:158-194`）

**当前**：前端直接读 `ocr-config.json` 写 localStorage。

**改为**：**前端永远不存 key**。调用 `/api/ocr/*` 时后端代理，前端只传文件。

#### Step 4: 安装包脚本改造（改 `build-installer.bat`）

- 不打包 `public/ocr-config.json` 到 `dist/`
- 安装器首次启动时**引导用户输入 key** 或从环境变量读
- key 用 DPAPI 加密存到 `ApiConfig.ResolveDataPath()`

#### Step 5: 把新 key 部署给现有用户（升级指南）

文档告知现有用户：
1. 升级到 v1.0.1
2. 首次启动时输入新 key（向导）
3. 旧 `ocr-config.json` 自动失效

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
8-12 小时（含测试 + 文档 + 升级指南 + 现有用户数据迁移脚本）

### 验证
- 安装包下载后**搜索** `apiKey=<REDACTED>` 应**0 命中**
- 新用户首次启动**强制配置** key
- 已升级用户**保留**旧 key 配置（如已配）

---

## 🔴 P0-2: 全 API 无鉴权中间件

### 现状
- `Program.cs` 全文 `grep "UseAuthentication|AddAuthentication|AddAuthorization"` **0 命中**
- 所有 endpoint 任何人都能访问，包括：
  - `/api/users` 枚举所有用户
  - `/api/audit/logs` 读所有审计日志
  - `/api/sqlite/migrate` 执行任意 SQL
  - `/api/contracts` `/api/members` `/api/wages` 等所有数据端点

### 风险
- 拿到 localhost:5048 端口的人能改所有数据、看所有 PII
- 同一台机器的多个用户能互相看数据

### 修复步骤

#### Step 1: 加鉴权中间件（改 `Program.cs`）

在 `builder.Services` 段加：
```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? throw new InvalidOperationException("JWT_SECRET not configured");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "engineering-manager",
            ValidAudience = "engineering-manager",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy => policy.RequireRole("admin"));
});
```

在 `app` 段（before `app.Run()`）加：
```csharp
app.UseAuthentication();
app.UseAuthorization();
```

#### Step 2: 改造 `/api/auth/login` 签发 JWT（改 `AuthEndpoints.cs:19-51`）

```csharp
app.MapPost("/api/auth/login", async (LoginDto dto, IDbConnection db) =>
{
    var user = await db.QueryFirstOrDefaultAsync<User>(
        "SELECT * FROM users WHERE username = @Username",
        new { dto.Username });
    if (user == null) return Common.Fail("用户名或密码错误");

    var computedHash = Common.HashPassword(dto.Password, user.PasswordSalt, user.PasswordHashVersion ?? 2);
    if (computedHash != user.PasswordHash)
        return Common.Fail("用户名或密码错误");

    var token = GenerateJwtToken(user);  // 见下
    return Common.Ok(new { token, user });
});
```

#### Step 3: 给所有 endpoint 加 `.RequireAuthorization()`

99% endpoint 改：`.MapGet("/api/members", ...)` → `.MapGet("/api/members", ...).RequireAuthorization()`

`/api/auth/login` 和 `/api/health` **不加**（必须公开）。

#### Step 4: 管理员端点加 `.RequireAuthorization("RequireAdmin")`
- `/api/users/*` CRUD
- `/api/roles/*`
- `/api/audit/*`
- `/api/sqlite/*`
- `/api/diagnose` `/api/debug/*`

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
16-24 小时（含全端点改造 + 前端 token 存储 + 升级流程）

### 验证
- 未登录请求 → 401
- 普通用户请求 admin 端点 → 403
- 前端登录后 token 存 localStorage（**仅 token，不存 key**）
- token 过期前 5 分钟自动 refresh

---

## 🔴 P0-3: PII 零加密零脱敏

### 现状
- `members`/`workers`/`partners`/`supervisors` 表的 `id_card`/`phone`/`bank_account` 全部 TEXT 明文
- 9 个 OCR 端点不写库，但**前端把 OCR 原始结果 INSERT 明文**
- 所有列表 API 返回全表，前端组件直接渲染 `w.idCard` `w.bankAccount` `m.phone`
- `audit_logs.details` 也可能含 PII

### 风险
engineering.db 被拷 = 所有客户身份证/银行卡/工资泄露

### 修复（分两阶段）

#### 阶段 A（快速脱敏，本月完成）：UI 层 mask

**新建** `E:\测试\src\utils\mask.ts`：
```typescript
export function maskIdCard(s: string | null | undefined): string {
  if (!s) return '';
  if (s.length < 8) return s;
  return s.slice(0, 4) + '*'.repeat(s.length - 8) + s.slice(-4);
}

export function maskPhone(s: string | null | undefined): string {
  if (!s) return '';
  if (s.length < 7) return s;
  return s.slice(0, 3) + '****' + s.slice(-4);
}

export function maskBankAccount(s: string | null | undefined): string {
  if (!s) return '';
  if (s.length < 8) return s;
  return s.slice(0, 4) + '*'.repeat(s.length - 8) + s.slice(-4);
}
```

**改 5 个列表组件**：
- `src/components/features/labor/LaborWorkerList.tsx:64` `{w.idCard}` → `{maskIdCard(w.idCard)}`
- `src/components/features/labor/LaborWorkerRow.tsx:33` 同上
- `src/components/features/members/WorkerPickerItem.tsx:39` 同上
- `src/components/features/members/WorkerSection.tsx:86` 同上
- `src/components/features/members/StaffManagementTab.tsx:44` 同上
- `src/components/features/members/TeamWorkerModal.tsx:37` 同上
- `src/components/features/hr/StaffList.tsx:85` `m.phone` → `maskPhone(m.phone)`

**改 API 响应层**（`MemberEndpoints.cs:20-21,25,64,100-112,137-140,152-158`）返回前 mask。

#### 阶段 B（持久化加密，v1.1.0 完成）：AES 加密 + DPAPI

- 加 `EngineeringManager.Api/Security/PiiProtector.cs`：`Aes.Encrypt(plaintext) / Aes.Decrypt(ciphertext)`，用 `ProtectedData.Protect` 包 master key
- 改 `MemberEndpoints.cs` 等所有写入路径：INSERT 前 Encrypt
- 加 SQL 函数 `decrypt_id_card(id_card)` 用作视图层
- **代价**：所有现有数据库 PII 列需重新加密（一次性脚本）

### 回滚
- 阶段 A：UI 改动 `git restore` 易回滚
- 阶段 B：必须先备份 `engineering.db` 再迁移

### 工作量
- 阶段 A：4-8 小时
- 阶段 B：16-24 小时

### 验证
- 列表页显示 `5101**********1234` 而非完整身份证
- 数据库中**仍**存明文（阶段 A 只改 UI）
- 阶段 B 后数据库存密文 + 视图自动解密

---

## 🟢 P0-4: 越权读 — 全表无 user_id 过滤 (✅ 已完成 v1.1.0 commit e2c8cb7)

### 历史现状 (v1.0.0 之前)
- `grep "WHERE\s+(user_id|created_by)\s*="` **0 命中**
- 99% 读 query 仅按 `project_id` 过滤
- 18 处 DELETE/UPDATE 同样无主体限制
- 0 限流中间件

### 历史风险
- 登录用户 A 能看用户 B 的合同/工资/考勤
- 暴力穷举 ID 即可遍历全部数据

### 实际修复 (4 个 commit)

| Commit | 范围 |
|--------|------|
| `6dde702` | 6 个高危全表 SELECT 端点 + CurrentUser helper + migration 013 (project_authorizations) |
| `745617b` | 15 个 projId-only 端点 + 1 stats + CurrentUser createdByCol 参数 + GlobalAuthMiddleware 微调 |
| `6a58ed8` | 1 单条 (members/{id}) + 4 history 端点文档化 |
| `e2c8cb7` | migration 014 (7 表加 created_by) + 11 端点 user-dim + 4 个 project-authorizations 管理端点 |

### 实际实现

#### 基础设施
- `CurrentUser` 3 个 helper:
  - `UserFilterCompany` = `(created_by = @Uid OR @IsAdmin = 1)` (公司维度表)
  - `UserFilterWithAuthorizedProjects(projectCol, createdByCol)` = `(created_by = @Uid OR @IsAdmin = 1 OR EXISTS(project_authorizations WHERE project_id=X AND user_id=@Uid))` (项目级表)
  - `UserFilterFragment` const 保留兼容 (旧 5 处调用)
- 5 个 migration 链: 009/010/011/013/014 (27+ 张表加 created_by + 索引)

#### 33 业务端点 user-dim 隔离 (按文件)
- ContractEndpoints: income/expense/agreement + stats + settlements + contract-templates
- CostLedgerEndpoints: cost-ledger + summary + batches (batches 退回 projectId 因表无 created_by)
- ExpenseEndpoints: expenses
- FileEndpoints: drawings
- InventoryEndpoints: inventory + materials + transactions
- InvoiceEndpoints: invoices (内联 SQL 避 JOIN 冲突) + payment-records
- MemberEndpoints: members/workers/partners/supervisors/projects + project-workers + worker-teams + departments
- WageEndpoints: attendances + wages + wages/stats + payment-records + overdue-stats + overdue-list + team-wages + members/{id} + salary-history (2) + wage-history (2)
- AuthEndpoints: 4 个 project-authorizations 管理端点 (admin only)

#### 端到端验证
- admin token: 全表 (33 端点, 0/1 不等)
- worker1 token: 自己创建的 + 被授权项目的 (反向验证: worker 创建 1 partner → worker 1 / admin 13)
- 4 个管理端点: POST 授权 → GET 列表 → POST 重复幂等 → DELETE 撤销 → GET 空表
- 红绿灯: build 0/0 + tests 8/8 + frontend check 0 HARD FAIL (前端未改)

#### 兼容性与遗留
- 旧数据 `created_by = NULL`: admin 看到 (含 NULL 行), 非 admin 看不到 (除非项目被授权)
- project_authorizations 表默认空, admin 通过 4 个新管理端点 (`/api/admin/project-authorizations`) 授权
- 用户体验: 单人本地使用 (admin only) 0 影响; 多人共享机器需要 admin 主动授权

### 历史 (修复前)


#### Step 1: 引入当前用户识别

所有 endpoint 入口加：
```csharp
var userId = context.User.FindFirst("uid")?.Value;
if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
var isAdmin = context.User.IsInRole("admin");
```

#### Step 2: 所有读 query 加用户维度

模式 A（项目维度）：`WHERE project_id=@ProjectId` → `WHERE project_id=@ProjectId AND (created_by=@Uid OR EXISTS(SELECT 1 FROM project_members WHERE project_id=@ProjectId AND user_id=@Uid) OR @IsAdmin=1)`

模式 B（个人维度）：`WHERE id=@Id` → `WHERE id=@Id AND (user_id=@Uid OR @IsAdmin=1)`

#### Step 3: 限流（用 `aspnetcore-rate-limiting`）

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
    });
    options.AddFixedWindowLimiter("write", opt =>
    {
        opt.PermitLimit = 30;
        opt.Window = TimeSpan.FromSeconds(1);
    });
});
```

应用：
- `/api/auth/login` 用 `"login"` policy
- 所有写 endpoint（POST/PUT/DELETE）用 `"write"` policy
- 读 endpoint 不限（已通过用户维度过滤）

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
12-16 小时

### 验证
- 用户 A 用 ID `123` 访问 `/api/contracts/123` → 仅当 A 是创建人/项目成员/管理员时返回 200
- 登录端点 1 分钟内 6 次错误密码 → 第 6 次返回 429
- 写端点 1 秒内 31 次请求 → 第 31 次返回 429

---

## 🟡 P1-1: 静默吞错 + 误导性假成功

### 现状
5 处 `catch { }` 真静默 + 40 处单边 + 8 处 OCR `Results.Ok(new { success=false })` 假成功

### 修复

#### Step 1: 5 处真静默加日志
```csharp
// InvoiceEndpoints.cs:107
catch (Exception ex)
{
    Console.Error.WriteLine($"[InvoiceEndpoints] payment-record parse failed: {ex.Message}");
    invoice_infos = new List<...>();
}
```

#### Step 2: 8 处 OCR 假成功改回 5xx
```csharp
// OcrEndpoints.cs:64 等 8 处
catch (Exception ex)
{
    Console.Error.WriteLine($"[OcrEndpoints/id-card] {ex.Message}");
    return Results.Problem($"OCR 识别失败: {ex.Message}", statusCode: 500);
}
```

#### Step 3: 16 处 `Common.Fail(ex.Message)` 脱敏
- 文件 IO 错误：把绝对路径改为相对路径或不返回路径
- 用统一脱敏 helper：`ex.SanitizedMessage()`

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
4-6 小时

### 验证
- 故意触发各 catch 块 → 服务端 stderr 有日志 + 客户端收到合适的 HTTP 状态码
- ex.Message 不含绝对路径

---

## 🟡 P1-2: admin 默认密码多处公开

> 已修复（v1.0.0）：改读环境变量 + 启动日志去明文；以下为历史现状描述。

### 现状
- `src-tauri/src/db/init.rs:711` Rust 端硬编码 `let password = "<REDACTED>";`
- `init.rs:710` 硬编码盐 `"<REDACTED-SALT>"`
- `init.rs:732` 启动日志打印 `默认管理员账号已创建: admin / <REDACTED>`
- `AGENTS.md` / `README.md` 明文

### 修复

#### Step 1: Rust 端从环境变量读
```rust
let password = std::env::var("ADMIN_INITIAL_PASSWORD")
    .unwrap_or_else(|_| {
        use rand::distributions::Alphanumeric;
        rand::thread_rng()
            .sample_string(&Alphanumeric, 16)
    });
```

#### Step 2: 删日志里的密码
```rust
log::info!("默认管理员账号已创建: admin（首次登录后请立即修改密码）");
```

#### Step 3: 3 个文档改为
```markdown
- 默认管理员：`admin`（首次登录时**强制修改密码**）
- 初始密码：见安装器首次启动提示（或 [首次启动指南](docs/FIRST-RUN.md)）
```

#### Step 4: C# 端 Program.cs 加首次启动引导
```csharp
// 启动时检测 users 表空 + 无 admin → 弹窗引导创建
if (await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users") == 0)
{
    // 启动向导：生成随机密码 + 提示用户改密
}
```

### 回滚
```bash
git reset --hard v1.0.0-pre-vibe
```

### 工作量
6-8 小时

### 验证
- `grep -E` 检测 admin 默认密码及盐值字面量（正则 `admin[0-9]{3}|admin-.*-salt`）在 `E:\测试` **0 命中**
- 新安装用户首次启动有引导，**不会**有默认密码
- AGENTS.md/README.md 不含明文密码

---

## 🟢 P2-1: 字段命名分裂（轻微）

### 现状
`Program.cs:220` 用 `password`+`salt`，`AuthEndpoints.cs` 用 `password_hash`+`password_salt`+`password_hash_version`

### 修复
统一用 `password_hash`+`password_salt`+`password_hash_version`，删 `password`+`salt` 列（一次性 migration）

### 工作量
2-4 小时

---

## 🟢 P2-2: 红绿灯冒烟检查文档

### 现状
`EngineeringManager.Tests/` 存在但 AGENTS.md 无冒烟检查文档

### 修复
AGENTS.md 新增：
```markdown
## 🟢 冒烟检查（v1.0.0 红绿灯）
- 后端：`cd EngineeringManager.Api && dotnet test` — 应当全绿
- 前端：`npm run test:run` — 应当全绿
- 启动：`dotnet run` + WebView2 窗口能开 + 登录 + 主页面不出错
- 完整 release：见 `docs/SMOKE-TEST.md`
```

### 工作量
1-2 小时

---

## 总览时间表

| 阶段 | 工作量 | 优先级 | 建议发布 |
|------|------|------|------|
| P0-1 OCR key rotate + 加密 | 8-12h | 🔴 | v1.0.1 (紧急) |
| P0-2 鉴权中间件 | 16-24h | 🔴 | v1.1.0 |
| P0-3 PII 脱敏（阶段 A） | 4-8h | 🔴 | v1.0.2 |
| P0-3 PII 加密（阶段 B） | 16-24h | 🔴 | v1.2.0 |
| P0-4 越权 + 限流 | 12-16h | 🔴 | v1.1.0 |
| P1-1 静默吞错 | 4-6h | 🟡 | v1.0.2 |
| P1-2 admin 公开密码 | 6-8h | 🟡 | v1.0.2 |
| P2-1 字段命名 | 2-4h | 🟢 | v1.0.2 |
| P2-2 红绿灯文档 | 1-2h | 🟢 | v1.0.1 |

**合计**：70-100 小时（不含测试/部署/迁移/文档）

**建议发布策略**：
- v1.0.1：P0-1 + P2-2（紧急安全 + 文档）—— 2 周内
- v1.0.2：P0-3-A + P1-1 + P1-2 + P2-1 —— 1 个月内
- v1.1.0：P0-2 + P0-4 —— 2 个月内
- v1.2.0：P0-3-B —— 3 个月内

---

## 回滚预案（统一）

任意阶段出问题：
```bash
cd E:\测试
git status                    # 查未提交改动
git restore .                 # 撤销未提交改动
git reset --hard v1.0.0-pre-vibe  # 一秒回滚到 v1.0.0 完整状态
```

数据库回滚：
```bash
# 备份当前 db（快照恢复会自动备份）
cp <数据路径>/engineering.db <数据路径>/engineering.db.before-restore
# 恢复
<用工程的"快照恢复"功能>
```

---

**本文档与 `vibe-coding-guide-eval-2026-06-16.md` 配合使用。**
**审计基础：darwin-skill 9 维 rubric + vibe-coding-guide 19 条 + 4 个 explore 子代理 file:line 实证。**
