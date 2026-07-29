# EngineeringManager.Api/Endpoints/ - C# API 端点域

> 本目录职责：全部 ASP.NET Core Minimal API 端点（Auth / Project / Invoice / Contract / Wage / Member / Inventory / Partner / CostLedger / Ocr / File / System 等 20+ 文件）。每个业务模块一个 `XxxEndpoints.cs`。

## 边界

- 端点只做参数校验 + 鉴权上下文 + SQL/Repository 调用 + 响应组装；可复用的数据访问下沉 `../Repositories/`（注入 `IDbConnection`，软删除用 `DapperHelpers.SoftDeleteAsync()`，时间戳用 `Common.NowString()`）
- 表结构变更不在端点里做：新建 `../Migrations/Scripts/NNN_Description.sql`，由 MigrationRunner 自动执行并记入 `schema_versions`
- 前端调用链：组件 → `src/services/tauri-bridge.ts` → api-client → 本目录端点

## 硬性规则

- **鉴权**：所有 `/api/*` 默认经 `GlobalAuthMiddleware` 强制鉴权。白名单仅 `/api/auth/login` `/api/health` `/api/ocr/setup/*`。新端点不得擅自加白
- **限流**：`/api/auth/login` 走 `login` 限流（5 次/分/IP）；其他写端点走 `write` 限流（30 次/秒/IP）
- **SQL**：必须参数化（Dapper 匿名对象 @Param），表名 `[]` 包裹，严禁字符串拼接
- **user-dim 隔离**：业务数据查询必须带当前用户维度（CurrentUser helpers），防越权读 —— 这是 P0-4 修复成果，不得回退
- **身份来源**：user_id 一律取 JWT uid claim，禁止信任 DTO 字段
- **异常**：所有 catch 必须 `Console.Error.WriteLine` + 正确 HTTP 状态码；错误信息用 `ex.SanitizedMessage()`，禁止把 `ex.Message` 直回前端
- **审计**：写入失败必须返回实际错误，不得返回 `{ success: true }`
- **PII**：新增 PII 列走 `PiiProtector` `_enc` 加密模式；GET 响应的 mask/unmask 遵循现有 `?unmask=true` 约定
- **金额**：一律 `INTEGER`（分），禁止 REAL/浮点

## 就近命令

```bash
cd EngineeringManager.Api && dotnet build     # 编译（0 错误 0 警告才合格，~1.2s）
cd EngineeringManager.Api && dotnet run      # 启动 API + WebView2 窗口（localhost:5048）
cd EngineeringManager.Tests && dotnet test   # 后端测试（Common/Endpoints/Migrations/Security 全绿）
```

## 深链

- 后端质量规则 + Repository/迁移规范 + 新增表 Checklist → [docs/CONVENTIONS.md](../../docs/CONVENTIONS.md)
- 权限系统 / 文件存储（IsPathSafe）/ 数据铁律（ResolveDataPath）→ [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md)
- 表清单 / ER 图 / 字段规范 → [docs/DATABASE_DESIGN.md](../../docs/DATABASE_DESIGN.md)
- 安全修复史（P0/P1 全部已修，勿回退）→ [docs/SECURITY-AUDIT.md](../../docs/SECURITY-AUDIT.md)
