# 应用配置与启动流程盘点（工程管家）

> 生成基线：`bbddc22f` · 日期：2026-08-22
> 版本：v0.91.0
> 数据源：`Program.cs`、`Common.cs`、`EditionFeatures.cs`、`appsettings.json`、`package.json`

## 目录

1. [启动流程](#启动流程)
2. [服务注册（DI 容器）](#服务注册di-容器)
3. [中间件管道](#中间件管道)
4. [数据库初始化](#数据库初始化)
5. [版本与版本分线](#版本与版本分线)
6. [DTO 总表](#dto-总表)
7. [权限默认值总表](#权限默认值总表)
8. [安全配置汇总](#安全配置汇总)

---

## 启动流程

```
EntryPoint.cs (WinForms + WebView2)
  ↓
ApiConfig.ConfigureServices(builder)
  → 配置 Kestrel（端口 5048 / 测试端口 0）
  → 配置大文件上传（550MB）
  → 注册 DI 服务
  → 配置 CORS
  → 配置 SQLite 连接工厂
  → 配置 JWT 认证
  → 配置限流（login 5/min, write 30/s）
  → 配置 JSON camelCase
  ↓
ApiConfig.InitializeDatabaseOrExit()
  → ResolveDataPath()（环境变量 > config.json > %APPDATA%\工程管家）
  → 打开 SQLite + PRAGMA WAL
  → EnsureTables()（CREATE TABLE IF NOT EXISTS，含旧列迁移）
  → is_default_password 列迁移
  → SeedDefaultAdmin()（空表时创建 admin/admin123）
  → MigrationRunner.Run()（幂等执行 042 个 SQL 脚本）
  ↓
ApiConfig.ConfigureApp(app)
  → 检测 dist/ 目录（生产模式）
  → 静态文件服务（缓存策略：HTML no-cache, JS/CSS immutable）
  → CORS
  → 异常处理（500 + 不泄露内部信息）
  → UseAuthentication → UseAuthorization → UseMiddleware<GlobalAuthMiddleware>
  → UseRateLimiter（测试环境跳过）
  → RegisterEndpoints(app)（20 个 Register* 扩展方法）
  → PiiProtector.Initialize(db)
  → SPA 回退（非 /api 路由返回 index.html）
  ↓
app.Run()
```

### 端口

- 生产：`http://localhost:5048`
- 测试：`http://127.0.0.1:0`（随机端口，`ASPNETCORE_ENVIRONMENT=Development` + `DISABLE_RATELIMIT=1`）

---

## 服务注册（DI 容器）

### Singleton（单例）

| 服务 | 说明 |
|------|------|
| `PiiProtector` | PII 字段加密（AES-GCM + DPAPI master key） |
| `PiiReencryptWorker` | PII 后台重加密 worker |
| `LlmConfigResolver` | LLM 配置解析器 |
| `LlmProviderService` | LLM 提供商管理（同时实现 `ILlmChatService`） |
| `IModelRouter` → `ModelRoutingService` | 模型路由 |
| `AgentToolService` | Agent 工具注册与管理 |
| `AgentConversationService` | Agent 对话持久化 |
| `ReportGenerationService` | AI 报告生成 |
| `WritingSkillService` | 写作中心 |
| `UpdateService` | 版本更新 |
| `IEmbeddingService` → `BgeEmbeddingService` | BGE 嵌入（ONNX） |

### HostedService（后台服务）

| 服务 | 说明 |
|------|------|
| `SttWorker` | STT 语音转写后台 worker（单并发） |

### Scoped

| 服务 | 说明 |
|------|------|
| `IDbConnection` | SQLite 连接（每请求创建，WAL 模式） |

### HttpClient

| 名称 | 用途 | 超时 |
|------|------|------|
| 默认 | OCR / 通用 | 默认 |
| `"update"` | manifest 拉取 | 30s |
| `"update-download"` | 安装包下载 | 无限（看门狗控制） |

---

## 中间件管道

```
请求进入
  ↓
UseCors()                         — CORS 策略
  ↓
UseExceptionHandler()              — 500 错误处理（不泄露内部信息）
  ↓
UseAuthentication()                — JWT 认证
  ↓
UseAuthorization()                 — 授权
  ↓
UseMiddleware<GlobalAuthMiddleware>()  — 白名单检查 + 强制鉴权
  ↓
UseRateLimiter()                   — 限流（测试环境跳过）
  ↓
端点路由
```

### 限流策略

| 策略名 | 限制 | 适用端点 |
|--------|------|---------|
| `login` | 5 次/分钟/IP | `/api/auth/login` |
| `write` | 30 次/秒/IP | `/api/auth/change-password` 等 |
| 429 响应 | `{ success: false, error: "请求过于频繁，请稍后再试" }` | — |

---

## 数据库初始化

### 数据路径解析优先级

```
1. ENGINEERING_MANAGER_DATA_PATH 环境变量
2. config.json 的 dataPath 字段
3. %APPDATA%\工程管家（默认）
```

### EnsureTables 逻辑

`EnsureTables()` 在启动时执行 `CREATE TABLE IF NOT EXISTS`（29 张表），并对旧库做列迁移：
- invoices 加 seller_id / buyer_id / received_amount / settlement_id
- contract_templates 加 content / variables / created_at / updated_at / created_by / version / last_modified_at
- payment_records 旧 schema（date 列存在时）→ 迁移到新 schema

### 种子管理员

仅在 `users` 空表时触发：
- 创建 4 个角色（admin/manager/accountant/worker）+ 默认权限
- 创建 admin 用户：`admin / admin123`，`is_default_password=1`

### MigrationRunner

幂等执行 `Migrations/Scripts/` 下 42 个 SQL 脚本。每个脚本可重复执行（`IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` 重复报错被吞）。

---

## 版本与版本分线

### 版本号

- **当前版本**：v0.91.0（以 `package.json` 为唯一真源）
- 版本引用 6 处：package.json / csproj / AssemblyInfo / App.xaml / 安装器 / changelog

### EditionFeatures（版本能力开关）

`config.json` 的 `edition` 字段（`personal` / `enterprise`）→ `EditionFeatures` 映射表：

| 能力键 | personal | enterprise |
|--------|----------|------------|
| UserManagement | ✗ | ✓ |
| RoleManagement | ✗ | ✓ |
| ProjectAuthorization | ✗ | ✓ |
| MultiUserDataScope | ✗ | ✓ |
| AuditUserFilter | ✗ | ✓ |
| CloudSync | ✗ | ✗（预留） |

**关键**：个人版单 admin，`IsAdmin(ctx)` 恒真 → `GetDataScope` 恒返 `All` → 所有数据可见。

### 更新检查

`appsettings.json` 配置 manifest URL（双源回退）：
```json
"Update": {
  "ManifestUrls": [
    "https://gh-proxy.com/.../manifest.json",
    "https://raw.githubusercontent.com/.../manifest.json"
  ]
}
```

---

## DTO 总表

### Common.cs 内联 DTO（30 个）

| DTO | 用途 |
|-----|------|
| `LoginDto` | 登录请求 |
| `UserDto` | 用户 CRUD |
| `PasswordResetDto` | admin 重置密码 |
| `ChangePasswordDto` | 自助改密 |
| `RoleUpdateDto` | 角色权限更新 |
| `ProjectDto` | 项目 CRUD |
| `MemberDto` | 成员 CRUD |
| `WorkerDto` | 工人 CRUD |
| `PartnerDto` | 合作伙伴 CRUD |
| `InvoiceDto` | 发票 CRUD |
| `PaymentRecordDto` | 收付款 CRUD |
| `AttendanceDto` | 考勤 CRUD |
| `WageDto` | 工资 CRUD |
| `DepartmentDto` | 部门创建 |
| `DepartmentUpdateDto` | 部门更新 |
| `KnowledgeFolderDto` | 文件夹 CRUD |
| `FolderAssignDto` | 文档归入文件夹 |
| `AuditLogDto` | 审计日志写入 |
| `FileSaveDto` | 文件保存 |
| `RegionDto` | 区域 CRUD |
| `SupervisorDto` | 监管单位 CRUD |
| `ProjectMemberDto` | 项目成员 |
| `WorkerTeamDto` | 班组 CRUD |
| `InventoryItemDto` | 库存 CRUD |
| `MaterialDto` | 材料 CRUD |
| `SalaryHistoryDto` | 薪资历史 |
| `ContractTemplateDto` | 合同模板 |
| `OcrImageDto` | OCR 图片 |
| `CostLedgerEntryDto` | 成本台账条目 |
| `CostLedgerSheetEntry/Dto` | 电子表格条目/批量 |
| `CostLedgerCategoryDto` | 成本分类 |
| `CostLedgerBatchDto` | 成本批次 |
| `CostLedgerMatchRuleDto` | 匹配规则 |

### Models/ 目录 DTO（13 个）

| DTO | 用途 |
|-----|------|
| `AgentMessage` | Agent 消息（含 tool_calls） |
| `AgentTool` | 工具定义 |
| `AgentChatRequest` | 前端聊天请求 |
| `ToolCall` / `ToolCallFunction` / `ToolCallResult` | LLM 工具调用 |
| `ChatCompletionResponse` / `ChatChoice` / `ChatResponseMessage` | LLM 非流式响应 |
| `ChatCompletionChunk` / `ChatChunkChoice` / `ChatChunkDelta` | LLM 流式响应 |
| `ChatUsage` | token 用量 |
| `LlmProviderConfig` | LLM 配置（ApiKey 标记 [JsonIgnore]） |
| `AuditClearDto` | 审计清理 |
| `ContractCreateDto` / `ContractUpdateDto` | 合同创建/更新 |
| `DrawingDto` | 图纸 |
| `FileDeleteDto` | 文件删除 |
| `InventoryTransactionDto` | 出入库 |
| `InvoiceStatusDto` | 发票状态 |
| `ProjectWorkerDto` | 项目工人 |
| `SettlementCreateDto` / `SettlementUpdateDto` | 结算创建/更新 |

---

## 权限默认值总表

`Common.GetDefaultPermissions(roleId)` 返回各角色的默认权限码数组：

### admin（73 个权限码）

全部权限：dashboard / projects / contracts / partners / members / wages / settlement / inventory / invoices / costLedger / drawings / settings / users / roles / audit_logs / reports / labor / safeQuery / knowledge / voice / writing 的全部 CRUD + export。

### manager（37 个权限码）

dashboard:read / projects:read+update+export / contracts:read+update+export / partners:read / members:read / wages:read / settlement:read / invoices:read / inventory:read+create+update / costLedger:read / settings:read / users:read / roles:read / audit_logs:read / drawings:create+read+update / reports:create+read / labor:read / safeQuery:read / knowledge:read+create+update+delete / voice:read / writing:read+create+update+delete

**注意**：manager 没有 members:create/update/delete、wages:create/update/delete、settlement:create/update/delete 等写权限（这些归 admin/accountant）。

### accountant（21 个权限码）

dashboard:read / projects:read / contracts:read+export / members:read / wages:create+read+update / settlement:read+approve / invoices:create+read+update / costLedger:create+read+update / settings:read / audit_logs:read+export / reports:create+read / labor:read

### worker（6 个权限码）

dashboard:read / projects:read+export / contracts:export / members:read / wages:read

---

## 安全配置汇总

| 配置项 | 值 / 策略 |
|--------|----------|
| JWT Secret 来源 | 环境变量 `JWT_SECRET`（≥32 字符）> 持久化文件 `%APPDATA%\工程管家\jwt.key` > 首次生成 32 字节随机 |
| JWT 有效期 | 1 天 |
| JWT 签名算法 | HMAC-SHA256 |
| 密码哈希 | PBKDF2-SHA512，v2=210k iterations |
| PII 加密 | AES-GCM + DPAPI master key（CurrentUser scope） |
| PII 密钥轮换 | `pii_keys` 表，支持多 key 并存 |
| 限流（登录） | 5 次/分钟/IP |
| 限流（写） | 30 次/秒/IP |
| 文件上传上限 | 550MB（Kestrel + FormOptions） |
| 路径遍历防护 | `IsPathSafe()` 校验解析后路径在允许基目录内 |
| 可执行文件防护 | `open-external` 扩展名白名单（仅文档+图片） |
| 异常脱敏 | `Common.Sanitize()` 移除 Windows 绝对路径 + 截断 200 字符 |
| 固定时间比较 | `CryptographicOperations.FixedTimeEquals`（密码校验） |
| CORS | 仅允许 localhost:5173/3000/5048 |
| 静态文件缓存 | HTML: no-cache / JS-CSS: immutable, 1 年 / 其他: no-cache |

---

*文档结束。*
