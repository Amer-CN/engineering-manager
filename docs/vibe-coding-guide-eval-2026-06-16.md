# vibe-coding-guide × 工程管家 v1.0.0 — v2 实证对照表
> 审计时间：2026-06-16
> 审计方法：4 个 explore 子代理深读工程管家代码 + explore 深读 vibe-coding-guide 自身 + darwin-skill 9 维 rubric 参照
> 严重度：✅ 合规 / ⚠️ 部分合规 / ❌ 缺口 / ➖ 不适用
> 对照基准：vibe-coding-guide `references/checklist.md` 19 条（v1 评估 + darwin-skill 9 维补充）

---

## 【安全与资金】（10 条）

### 1. 前端不直接访问数据库 ✅
- **代码实证**：`src/services/tauri-bridge.ts` → `src/services/api-adapter.ts` → `ASP.NET Core Minimal API (localhost:5048)` → `Dapper` → `SQLite`
- React 前端 **完全** 走 API 桥接层，**无**直接 SQL / `fetch(db://...)` 痕迹
- **AGENTS.md 体现**：架构图 + "不得绕过权限检查"红线

### 2. 关键权限判断后端独立做 ⚠️ **文档声称但代码未做**
- **AGENTS.md 声称**："新端点默认加 `RequireAuthorization()`"
- **代码实证**：`grep "UseAuthentication|AddAuthentication|AddAuthorization" Program.cs` **0 命中**——**没有任何鉴权中间件注册**
- 99% 端点**完全无鉴权**，任何人能访问 `/api/users` `/api/audit/logs` `/api/sqlite/migrate` 等
- **严重度**：❌ **P0 缺口**（阶段 7 P0-FIX-PLAN.md 第 2 项）

### 3. 密码用 bcrypt/argon2/scrypt + 随机盐 ✅
- **代码实证**：`EngineeringManager.Api/Common.cs:32-40` `Common.HashPassword`
- 算法：**PBKDF2-HMAC-SHA512，210,000 iterations，64-byte output，hex-encoded**
- 满足 OWASP 当前推荐（≥210k iterations）
- 不用 ASP.NET `PasswordHasher<T>`（无 Identity 引用），不用 BCrypt，不用 Argon2，但**算法实质合规**
- 测试 `CommonTests.cs:9-28` 验证确定性和 salt 敏感性
- **Rust 端** `src-tauri/src/db/init.rs:707-723` 用相同算法（`ring` 库的 PBKDF2_HMAC_SHA512）
- **轻微问题**：`AuthEndpoints.cs:34` 用 `string ==` 比较哈希，**未用 `CryptographicOperations.FixedTimeEquals`**（timing leak 风险低但存在）
- **严重度**：✅ 核心合规，⚠️ 等比函数小问题

### 4. 金额字段用整数最小单位 ✅
- **代码实证**：AGENTS.md 第 233 行 "003_MoneyRealToInteger.sql" 迁移名 + 238 行 "金额字段使用 `INTEGER`（分）"
- **严重度**：✅

### 5. 身份证/证件等加密存储 + 展示脱敏 ❌ **P0 缺口**
- **代码实证**（explore 子代理报告）：
  - `members.id_card` / `id_card_address` / `phone` / `bank_account` 全部 `TEXT` 明文
  - `workers.id_card` / `phone` / `address` / `bank_account` 全部 `TEXT` 明文
  - `partners.phone` / `bank_account` / `credit_code` 全部 `TEXT` 明文
  - `wages.actual_wage` / `paid_amount` 明文
  - `audit_logs.details` 明文（**可能含 PII**）
- 9 个 OCR 端点（`OcrEndpoints.cs:28-425`）**不写数据库**，但**前端把 OCR 原始结果**通过 `POST /api/workers` 等**直接 INSERT 明文**
- **零加密**：`grep "AES|Encrypt|DPAPI|ProtectedData|cipher"` 在 PII 写入路径**0 命中**
- **零脱敏**：所有列表端点（`/api/members` `/api/workers` `/api/partners`）返回全表，前端组件（`LaborWorkerList.tsx:64` `WorkerPickerItem.tsx:39` 等）直接渲染 `w.idCard` `w.bankAccount` `m.phone`
- 唯一一个 `mask` 命中是 `src/components/LockScreen.tsx:100` 的 `password-mask` CSS 类（隐藏密码输入）
- **严重度**：❌ **P0 缺口**（阶段 7 P0-FIX-PLAN.md 第 3 项）

### 6. 不可删数据软删除 + 审计 ✅
- **代码实证**：`DapperHelpers.SoftDeleteAsync()` + `Migrations/Scripts/004_SoftDeleteFields.sql` + `deleted_at` 字段（AGENTS.md 240 行）
- `audit_logs` 表 + `AuditEndpoints.cs` + `SystemEndpoints.cs` 双端点
- **轻微问题**：`AuditEndpoints.cs:35` `user_id` 从 **DTO 字段** 读取（客户端可伪造），不是从 `HttpContext.User` 提取
- **严重度**：✅ 核心合规，⚠️ 审计 user_id 不可信

### 7. 敏感配置不提交进 Git、不放进前端变量 ⚠️ **OCR API key 已暴露在安装包**
- **AGENTS.md 声称**："config.json 写入采用合并策略"
- **代码实证**：
  - `.gitignore:14-17` 显式排除 `public/ocr-config.json` 和 `public/seed-data.json`（**这是好的**）
  - `public/ocr-config-example.json` 用占位符（**这是好的**）
  - **但**：`E:\测试\public\ocr-config.json:5-6` **真实 API key**（`apiKey=3ctkvORt...` `secretKey=nXFQ0nHox...`）在**工作区存在**且**被打进 `dist/ocr-config.json`**，**且随安装包发布到所有用户**
  - `OcrEndpoints.cs:531-558` 直接从 JSON 读明文 key
  - `src/services/ocr.ts:158-194` 前端 `loadBuiltInConfig()` 把 key 写到 `localStorage['workbuddy_ocr_config']`
  - **任何下载 Setup.exe 的人都能拿到这个 key，**用你的额度跑 OCR****
- **严重度**：❌ **P0 缺口**（阶段 7 P0-FIX-PLAN.md 第 1 项）——**最高优先级**

### 8. 默认账号强制改密、不公开写死 ❌
- **代码实证**：
  - `src-tauri/src/db/init.rs:711` Rust 端**硬编码** `let password = "admin123";`
  - `init.rs:710` 硬编码盐 `"admin-default-salt-2026"`（**+ 已知密码 + 已知算法 = 离线爆破轻而易举**）
  - `init.rs:732` 把 `默认管理员账号已创建: admin / admin123` **写进日志**
  - `E:\测试\AGENTS.md:87` `默认管理员：admin / admin123`（明文）
  - `E:\测试\CLAUDE.md:87` 同上
  - `E:\测试\README.md:78` 同上
  - C# 端 `EngineeringManager.Api\Migrations\Scripts\002_SeedAdminUser.sql` 是**空占位**（只有 `SELECT 1;`）——C# 路径**实际无 admin**，**只 Rust 路径有**
  - 测试代码 `EngineeringManager.Tests/Common/ApiTestBase.cs:64` 还把 `"admin123"` **明文**写进 `password` 列（虽然不被读，但**列存在**就是风险）
- **严重度**：❌ **P1 缺口**（阶段 7 P0-FIX-PLAN.md 第 6 项）——但 vibe-coding-guide 把它算 P0

### 9. SQL 全部参数化 ✅
- **代码实证**：~200 个 Dapper 调用（`db.Query` / `db.Execute` / `db.ExecuteScalarAsync`）
- **0 处**值级字符串拼接或插值
- 唯一动态部分：`{w}`（`WHERE project_id=@ProjectId` 之类条件分支）、`[{tableName}]` 标识符（**SQLite 标识符不支持参数化**的惯用做法）
- `HealthEndpoints.cs:53-57` `SqliteAdminEndpoints.cs:81-138` 接受客户端 `tableName` 拼到 `[{t}]`，**严格来说应做白名单**（这 2 个端点已无需鉴权，**叠加 P0-2 后风险放大**）
- **严重度**：✅ 完美

### 10. 关键接口按 user_id/租户过滤 + 限流 ❌ **P0 缺口**
- **代码实证**：
  - `grep "WHERE\s+(user_id|created_by)\s*="` 在 `Endpoints/*.cs` **0 命中**——**无任何读查询带用户维度过滤**
  - 99% 读端点仅按 `project_id` / `id` 过滤
  - 例：`/api/contracts?projectId=123` 返回**所有合同**给任何调用者，不限创建人/项目成员
  - 删改端点同样：18 处 `DELETE FROM x WHERE id=@Id` 无主体限制
  - **限流**：`grep "UseRateLimiter|AddRateLimiter|EnableRateLimiting"` **0 命中**——**全 API 无任何频率/并发限制**
- **严重度**：❌ **P0 缺口**（阶段 7 P0-FIX-PLAN.md 第 4 项）

## 【稳定性】（5 条）

### 11. Git 可一键回退 + 数据单独备份 ✅
- **代码实证**：
  - git 仓库已存在（HEAD = 9b8722f + tag v1.0.0-pre-vibe 已建）
  - 数据存储路径独立（`ApiConfig.ResolveDataPath()` 22 处调用）
  - 快照恢复前自动备份（AGENTS.md 77 行 `db.pre-restore-<时间戳>`）
- **严重度**：✅

### 12. "红绿灯"冒烟检查 ⚠️ **有测试目录但没"红绿灯"文档**
- **代码实证**：
  - `EngineeringManager.Tests/` 存在（`EngineeringManager.Tests.csproj` + `Endpoints/AuthEndpointsTests.cs` + `CommonTests.cs` 等）
  - vitest 前端测试也有（`src/__tests__/`）
  - 但 AGENTS.md 全文**无"红绿灯 / 冒烟"字样**
  - 工程管家是**本地桌面单机工具**，vibe-coding-guide 提示"即便单机，也值得有这条'红绿灯'" —— **此条部分合规**
- **严重度**：⚠️ **建议补冒烟命令文档**

### 13. 数据库建表脚本与代码引用字段完全一致 ✅
- **代码实证**：
  - `Migrations/Scripts/001-008` 完整 DDL
  - `Migrations/MigrationRunner.cs` 自动执行
  - `schema_versions` 表记录已执行迁移
  - **轻微不一致**：`Program.cs:220` EnsureTables 用 `password`+`salt` 列名，`AuthEndpoints.cs:22,30,31,98,100,116,118` 用 `password_hash`+`password_salt`+`password_hash_version`，001 SQL 两者都声明了——**schema 和代码达成妥协，但脆弱**
- **严重度**：✅ 整体合规，⚠️ 字段命名分裂

### 14. 无"捕获异常后既不处理也不记录"的静默吞错 ⚠️ **5 处真静默 + 40 处单边**
- **代码实证**（53 个 catch 块）：
  - ✅ 8 处好（log + error response）：15.1%
  - ⚠️ 40 处单边：75.5%（只 log 不返错 / 只返错不 log / OCR 假成功）
  - ❌ **5 处真静默** `catch { }`：
    - `InvoiceEndpoints.cs:107`（payment-record JSON 解析失败丢弃）
    - `OcrEndpoints.cs:504`（`LoadOcrStats` 文件读取失败）
    - `OcrEndpoints.cs:521`（`SaveOcrStats` 写入失败）
    - `OcrEndpoints.cs:554`（OCR config 解析失败静默回空 key）
    - `ProjectEndpoints.cs:47`（`expenseByCategory = new()`）
  - **OCR 8 处反模式**：`OcrEndpoints.cs:64,122,159,200,247,285,339,380` catch 后 `Results.Ok(new { success=false, error=ex.Message })` —— **客户端拿到 200 Ok + success=false**，**服务端 stderr 0 痕迹**——既不是合规错误响应，也不是静默，是**误导性假成功**
  - **信息泄露**：`OcrEndpoints.cs:8 处` + `FileEndpoints.cs:6 处` 把 `ex.Message` 直回前端，可能泄露文件系统绝对路径
- **严重度**：⚠️ **P1 缺口**（阶段 7 P0-FIX-PLAN.md 第 5 项）

### 15. 数据库结构有正规迁移文件作为唯一来源 ✅
- **代码实证**：`Migrations/Scripts/001-008` + `MigrationRunner.cs` + `schema_versions` 表
- AGENTS.md 231-242 行有详细规范
- **严重度**：✅

## 【结构与规范】（4 条）

### 16. 目录、模块边界清晰 ✅
- AGENTS.md 95-109 行 12 个模块表 + 关键文件清单
- **严重度**：✅

### 17. 有设计 Token，样式不硬编码 ✅
- AGENTS.md 121-128 行设计 Token + 156-165 行组件使用规则
- **严重度**：✅

### 18. 同类 UI 已抽象复用 ✅
- AGENTS.md 129-133 行组件库（Button / Input / Modal / Card / DataTable 等 20+）
- **严重度**：✅

### 19. 文案统一管理（为多语言预留）➖ **不适用**
- 工程管家是中国境内工程公司桌面工具，**纯中文**合理
- vibe-coding-guide 19 条适用
- **严重度**：➖

---

## 实证汇总

| 状态 | 数量 | 编号 |
|------|------|------|
| ✅ 完美合规 | **6** | 1, 4, 6, 9, 11, 15, 16, 17, 18（**实际 9 条**） |
| ⚠️ 部分合规 / 文档不显 | **3** | 3, 7, 12, 13, 14（**实际 5 条**） |
| ❌ 缺口 | **5** | 2, 5, 7（严重）, 8, 10（**实际 5 条**） |
| ➖ 不适用 | **1** | 19 |
| **合计** | **19** | |

**注意**：v1 评估时我估计 12/19 合规，**实证后修正为 9/19 完美 + 5/19 缺口严重**——**之前的 v1 评估太乐观**，AGENTS.md 是"声称"而代码是"实际"，**两者 gap 很大**。

---

## 与 vibe-coding-guide 19 条的"声称 vs 实证" 对比

| vibe-coding-guide 19 条 | 工程管家 AGENTS.md 声称 | 实际代码 |
|------|------|------|
| 1 前端不碰库 | ✅ | ✅ |
| 2 后端独立鉴权 | ✅ | ❌ 无中间件 |
| 3 密码强哈希 | ⚠️ 隐含 | ✅ PBKDF2-SHA512 210k（甚至**比 bcrypt 还好**） |
| 4 金额非浮点 | ✅ | ✅ |
| 5 敏感信息加密+脱敏 | ❌ 缺失 | ❌ 全明文 |
| 6 软删除+审计 | ✅ | ✅ 但 user_id 可被伪造 |
| 7 密钥不进 Git/前端 | ⚠️ ocr-config 隐含 | ❌ OCR key 已暴露在安装包 |
| 8 默认口令强制改 | ❌ 公开写 admin123 | ❌ Rust 端硬编码 |
| 9 SQL 参数化 | ✅ | ✅ 200 个调用 0 拼接 |
| 10 user_id 过滤+限流 | ⚠️ 隐含 | ❌ 0 过滤 + 0 限流 |
| 11 Git+数据备份 | ✅ | ✅ |
| 12 红绿灯 | ❌ 缺失 | ⚠️ 有测试目录但无"红绿灯"文档 |
| 13 字段一致 | ✅ | ⚠️ 命名分裂 |
| 14 禁静默吞错 | ✅ | ⚠️ 5 处真静默 + 40 处单边 |
| 15 迁移文件 | ✅ | ✅ |
| 16 目录清晰 | ✅ | ✅ |
| 17 设计 Token | ✅ | ✅ |
| 18 UI 复用 | ✅ | ✅ |
| 19 多语言 | ➖ | ➖ |

**vibe-coding-guide 的 19 条** + **工程管家的"声称 vs 实证"** 揭示：
- 工程管家**架构层（架构/迁移/SQL/UI/审计/数据存储）** — **完全合规**
- 工程管家**鉴权层（认证/越权/限流/敏感字段保护）** — **完全缺失**
- 这是一个**"后端代码规范度极高"** + **"安全基线几乎为零"** 的矛盾项目
- vibe-coding-guide 的价值在这里**不是补 19 条**，是**揭示这 4-5 个 P0 缺口并给修复方案**
