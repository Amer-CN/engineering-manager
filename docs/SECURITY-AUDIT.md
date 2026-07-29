# 安全审计与当前安全状态

> 从根 AGENTS.md 下沉（2026-07-29）。主题：2026-06-16 历史安全审计快照（仅存档）+ 当前 P0/P1 修复状态。

## 🩺 历史安全审计（2026-06-16，v1.0.0 之前快照 · 仅存档）

> **审计者**：darwin-skill 9 维 rubric 参照 + vibe-coding-guide 19 条 + 4 个 explore 子代理 file:line 实证
> **回滚锚点**：git reset --hard v0.69.0（v1.0.0-pre-vibe 之前，commit fcdffea3fed06f878789db7f08d98303ffdf077f 之上的版本）
> **完整修复计划**：[P0-FIX-PLAN.md](P0-FIX-PLAN.md)
> ⚠️ 本节为历史审计快照。下列 P0/P1 问题**均已修复**，当前状态见下一节「✅ 当前安全状态」。
> 注：本节 v1.0.0 等为历史规划编号；项目现行版本号为 v0.8x（见 [VERSIONING.md](VERSIONING.md)）。

### 4 个 🔴 P0 缺口（历史 · v1.0.0 之前 · 现已全部修复）

| # | 缺口 | 现状 | 严重度 |
|---|------|------|------|
| P0-1 | **OCR API key 公开在安装包** | public/ocr-config.json:5-6 明文 key 已被打进 dist + 装到所有用户机器。OcrEndpoints.cs:531-558 + src/services/ocr.ts:158-194 直接读明文 | 🔴 **最高优先级** |
| P0-2 | **全 API 无鉴权中间件** | Program.cs 全文 grep "UseAuthentication|AddAuthentication|AddAuthorization" **0 命中**。所有 endpoint 任何人都能访问（含 /api/users /api/audit/logs /api/sqlite/migrate） | 🔴 |
| P0-3 | **PII 零加密零脱敏** | members/workers/partners 表的 id_card/phone/ank_account 全部 TEXT 明文。所有列表 API 返回全表，前端组件直接渲染 w.idCard w.bankAccount m.phone | 🔴 |
| P0-4 | **越权读 + 无限流** | grep "WHERE\s+(user_id|created_by)\s*=" **0 命中**。0 限流中间件。任意用户能看任意数据 | 🔴 |

### 5 个 🟡 P1 缺口

| # | 缺口 | 现状 |
|---|------|------|
| P1-1 | **静默吞错** | 5 处 catch { } 真静默 + 40 处单边（只 log 不返错 / 只返错不 log）+ 8 处 OCR Results.Ok(new { success=false }) 假成功（OcrEndpoints.cs:64,122,159,200,247,285,339,380） |
| P1-2 | **admin 默认密码多处公开** | Rust 端 init.rs:711 硬编码 + 启动日志 :732 打印明文 + AGENTS.md/README.md 多处明文 |
| P1-3 | **OCR 8 处把 ex.Message 直回前端** | 信息泄露风险（OcrEndpoints.cs:8 处） |
| P1-4 | **审计 user_id 来自 DTO 字段** | AuditEndpoints.cs:35 + SystemEndpoints.cs:73 客户端可伪造身份 |
| P1-5 | **密码比较用 string ==** | AuthEndpoints.cs:34 应改 CryptographicOperations.FixedTimeEquals |

### 6 个 ✅ 真正合规项（之前 AGENTS.md 没明确写但代码做到了）

| # | 实际合规项 | 证据 |
|---|------|------|
| 1 | **密码哈希** | Common.cs:32-40 PBKDF2-HMAC-SHA512 210k iterations（OWASP 合规，**比 bcrypt 还好**） |
| 2 | **SQL 参数化** | ~200 个 Dapper 调用 **0 拼接**（仅 {w} 条件分支 + [{tableName}] 标识符插值，受控） |
| 3 | **金额非浮点** | migration  03_MoneyRealToInteger.sql + INTEGER(分) 字段 |
| 4 | **数据存储路径独立** | ApiConfig.ResolveDataPath() 22 处调用，0 处 AppData |
| 5 | **软删除 + 审计** | DapperHelpers.SoftDeleteAsync() + deleted_at + udit_logs 表 |
| 6 | **迁移文件唯一来源** | Migrations/Scripts/001-008 + MigrationRunner + schema_versions 表 |

### 行动指引

**任何接手工程管家的开发者**：

1. **v0.70.0 发布前**：P0-1 必须修（OCR key rotate），其他 3 个 P0 在 v0.70.x 立即跟进
2. **新功能开发前**：先读 [P0-FIX-PLAN.md](P0-FIX-PLAN.md) 决定当前 sprint 是否带 1-2 个 P0 修复
3. **不要在 P0 修完前**新增涉及 PII 的新功能（先把 P0-2/P0-3 修了再考虑）
4. **vibe-coding-guide 兼容度**：v2 实证 9/19 完美 + 5/19 缺口 + 5/19 部分合规（详见 v2 报告）

> 历史说明：该审计时点代码确实未做鉴权；此问题已在 v1.0.0 修复（GlobalAuthMiddleware）。当前状态以下一节为准。

---

## ✅ 当前安全状态（P0/P1 均已修复）

**注意**: 上面 "🔴 P0-1/2/3/4 缺口" 是 v1.0.0 之前的审计结果. 实际当前代码状态:

| # | 缺口 | 实际修复状态 | 证据 |
|---|------|------|------|
| P0-1 | OCR API key 公开 | ✅ 已修 (v1.0.0) | OcrEndpoints.cs 走 DPAPI 加密, OcrSetupWizard 首次启动引导 |
| P0-2 | 全 API 无鉴权 | ✅ 已修 (v1.0.0) | GlobalAuthMiddleware + 白名单 (/api/auth/login /api/health /api/ocr/setup) |
| P0-3 | PII 零加密 | ✅ 已修 (v0.72.0) | PiiProtector + 13 列 _enc 加密 + backfill-pii 端点 + API 响应层 Mask |
| P0-4 | 越权读 + 无限流 | ✅ 已修 (v1.0.0 限流 + v0.73.0 P0-4 + v0.74.0 缺口修复) | 限流中间件 (login 5/min + write 30/sec) + 33 个业务端点 user-dim 隔离 (v0.73.0 P0-4 + v0.74.0 修复 inventory/materials GET user-dim 缺口) |
| P1-1 | 静默吞错 | ✅ 已修 (v1.0.0) | 6 处真静默 + 2 处 OCR 假成功已修 |
| P1-2 | admin 默认密码多处公开 | ✅ 已修 (v1.0.0) | 改读环境变量 + 启动日志去明文 |
| P1-3 | OCR ex.Message 直回前端 | ✅ 已修 (v1.0.0) | ex.SanitizedMessage() helper |
| P1-4 | 审计 user_id 来自 DTO | ✅ 已修 (v1.0.0) | 改从 JWT uid claim |
| P1-5 | 密码 string == 比较 | ✅ 已修 (v1.0.0) | CryptographicOperations.FixedTimeEquals |

**v0.73.0 P0-4 闭环 100%**: 33 业务端点 + 4 管理端点 + 6 migrations (009/010/011/013/014/020) + CurrentUser 3 helper + tests 17/17 通过 + 26f1f44 闭环 (cost-ledger/batches user-dim + 4 schema 兼容性修复).

**v0.74.0 PII Mask 完整闭环**:

- 后端去硬 mask (v0.75.0 refactor 19b0acc): 18 处 Common.MaskXxx 调用全部简化, GET 默认返明文. 前端 useMaskedFn hook 完全控制显示.
- api-client 自动加 ?unmask=true (0b14478): PII 端点 GET 自动检测 localStorage v120_mask_enabled, toggle=false 时追加 unmask=true.
- MaskContext 多设备同步 (v0.75.0): MaskProvider 通过 GET /api/user-preferences/pii_mask_enabled 拉后端真值, toggle 时异步 PUT 同步. localStorage 是兜底缓存.
- 9 个 PII 组件响应 toggle (41c6102 + 532fd87): useMaskedFn hook 替代写死 maskIdCard, MemberCard/MemberDetail 修复明文 PII 暴露.
- User Preferences API (2ff2550): GET/PUT /api/user-preferences + GET/PUT /api/user-preferences/{key}. migration 022_AddUserPreferencesTable.sql.
- 测试覆盖: 26/26 后端 + 48/48 vitest (37 PII + 11 api-client).

**v0.74.0 修复的真实缺口**:

- Partners POST/PUT 500 bug (1e2a0c5): migration 021_AddPartnersTaxNumber.sql 加 tax_number 列.
- GET /api/inventory + /api/materials 越权 (532fd87): 加 user-dim, 之前 GET 全表返回.

*本节与 CHANGELOG.md、P0-FIX-PLAN.md 保持同步.*
