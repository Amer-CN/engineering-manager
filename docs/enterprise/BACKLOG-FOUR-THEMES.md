# BACKLOG：four-themes 审查建议收编（R8.11）

> 来源：`docs/handoff/four-themes-review-context.md` 第六节「审查建议聚焦」（10 条）。
> 会话（2026-08-01, 265e976, 分支 feat/folderstack3d-react）已关闭；遗留项由
> feat/edition-split 流水线接管。本表核对基准 = 2026-08-06 feat/edition-split HEAD。
> 状态定义：已修 / 未修 / 不适用 / 已被后续改动覆盖。红线级问题在【状态】列标红。

| # | 条目原文（摘要） | 当前状态 | 证据（grep/读码原文） |
|---|---|---|---|
| 1 | CostLedgerEndpoints L239-305：sheet POST 权限过滤是否充分（UPDATE 有 scope filter，INSERT 无 project 授权校验） | **已修**（B1 修复，R4.x 时代覆盖） | `CostLedgerEndpoints.cs:252` 注释 `// B1 修复：先校验 batch 归属（口径与 UPDATE 一致：UserFilterWithAuthorizedProjects）`；`:255` `SELECT [id], [project_id] FROM [cost_ledger_batches] WHERE [id]=@BatchId AND {CurrentUser.UserFilterWithAuthorizedProjects(scope, "cost_ledger_batches.project_id")}` |
| 2i | ReportGenerationService L136-165：KPI scope 越权（本条目 R8.13(c) 拆分） | **已修**（完整 SQL 原文佐证，非注释） | `AggregateKpiAsync`（ReportGenerationService.cs:164-216）scopeFilter 构建原文：`:174` `if (request.Scope == "user" \|\| (!isAdmin && request.Scope != "project")) { scopeFilter = " AND [created_by] = @UserId"; }`、`:179` `else if (request.Scope == "project" && request.ScopeId.HasValue) { scopeFilter = " AND [project_id] = @ScopeId"; }`、`:186` `// scope=all + isAdmin: 不加额外过滤`。四条聚合 SQL 均引用：`:190-194` `SELECT COUNT(*) FROM [income_contracts] WHERE {dateFilter}{scopeFilter}`（invoices/settlements/wages 同构）。入口授权校验 `:45-49`（scope=project 非 admin 需指定 scopeId）。**过滤存在**：created_by / project_id / all-admin 三分支 |
| 2ii | AggregateKpiAsync 返回全 0（R8.13(c) 拆分，与长队列既有条目同源） | **未修（长队列条目）** | `ReportGenerationService.cs:214-217` `catch (Exception ex) { Console.Error.WriteLine("[ReportGeneration] KPI 聚合部分失败: " + ex.Message); }` —— 聚合异常被吞 → 返回全 0。**根因未证实**（候选：聚合 SQL 列名/表名与 DDL 漂移）。与长队列「AggregateKpiAsync 返回全 0」同一条，不重复登记 |
| 3 | ReportEndpoints：权限校验位置是否正确 | **已修** | `ReportEndpoints.cs:21,29` `GetUserId(ctx)` + `IsAdmin(ctx)` 在 `/api/reports/generate` 端点内执行（端点内校验，非中间件兜底） |
| 4 | KnowledgeEndpoints L354-373：seed-entities admin 限制 | **已修** | `KnowledgeEndpoints.cs:354` `MapPost("/api/knowledge/seed-entities")` 内 `:359` `if (!isAdmin) return 403 "无权限：仅管理员可触发全量实体种子扫描"` |
| 5 | univerEngine.tsx L216-262：readUniverEntries 的 Univer API 兼容（getCellMatrix().getValue() vs getCell()） | **已修（浏览器实测仍待办）** | `univerEngine.tsx:17` 注释「尝试多种方式获取 worksheet（兼容 Univer 0.25.x 不同 API 路径）」；`:31` `// M1: 禁止静默回退——取不到 sheet 说明 Univer API 不兼容，必须报错`；`:37` `sheet.getCellMatrix?.()?.getValue?.(row, col)`。真实浏览器验证仍在 `four-themes-review-context.md` 九-3 遗留 |
| 6 | AgentConversationService：归档/恢复 SQL 是否带 user_id 归属校验 | **已修** | `AgentConversationService.cs:274-283` `UPDATE [agent_conversations] SET archived_at = @Now WHERE id = @Id AND user_id = @UserId AND deleted_at IS NULL`（archive/unarchive 同构，端点传 uid） |
| 7 | KnowledgeEntityService：fire-and-forget 中 ctx.RequestServices 请求结束后 ObjectDisposed | **🔴 未修（有兜底，标红待修复轮）** | `KnowledgeEntityService.cs:13` 注释仍为「业务写端点 fire-and-forget 调用」；无 `IServiceScopeFactory` 改造（原审建议）。兜底 = catch + seed 全量补救（原文档九-2 自认）。根治方向：改 `IServiceScopeFactory.CreateScope()` 注入独立 scope |
| 8 | 组件行数是否 < 400（铁律） | **已修（400 铁律满足；350/250 建议线警告仍在）** | `AgentComposer.tsx` 305 行、`univerEngine.tsx` 328 行（<400）。npm run check 13 警告含行数 SOFT WARN（350/250 建议线）。**与 M-REFACTOR1（12 个文件拆组件）同源**——不重复登记 |
| 9 | SQL 是否全参数化、表名 [] 包裹 | **已修（门禁化）** | B1/B5/B6 门禁（check-backend-rules.cjs）全覆盖；CostLedgerEndpoints 全量 `[表名]` + `@Param`（R4-R8 门禁钉住）。**与长队列 B1（28 项登记：21 B1 token 口径误报 + 7 B3）同源** |
| 10 | 金额字段是否 INTEGER（分） | **🔴 部分**（R8.13(b) 实跑重判，与长队列「金额 double vs INTEGER（分）」同源） | ① C# 写路径类型：`Common.cs:165` `record InvoiceDto(..., double? Amount, double? PriceAmount, ...)`；`:166` `PaymentRecordDto(..., double? Amount, ...)`；`:168` `WageDto(..., double? DailyWage, ..., double? ActualWage, double? PaidAmount, ...)`；`:186-187` `CostLedgerEntryDto/CostLedgerSheetEntry(..., double? Amount, ...)`；端点 `(decimal?)a.GetDouble()`（ContractEndpoints.cs:89 等 8 处）——**无 ×100 换算，未找到换算代码**。② 迁移 003（历史库）：`003_MoneyRealToInteger.sql:136` `CAST(COALESCE(amount, 0) * 100 AS INTEGER)`（元→分 ✓，重建 INTEGER 表 + DROP/RENAME）。③ 运行时常量 DDL（Program.cs，新库路径）：`:480` `project_workers(... daily_wage REAL ...)`；`:484-510` `invoices(... amount REAL DEFAULT 0, price_amount REAL ...)`；`:509-516` `payment_records(... amount REAL DEFAULT 0 ...)`；`:525` `wages(... daily_wage REAL, work_days REAL, bonus REAL DEFAULT 0, deduction REAL DEFAULT 0, actual_wage REAL, paid_amount REAL ...)`；`:527` `settlements(... amount REAL ...)`；`:528` `cost_ledger(... amount REAL ...)`。**判定**：历史迁移做了元→分；运行 DDL（新库）仍是 REAL；C# 写路径 double 无换算（若表为 INTEGER 分会单位错乱）→ **部分**。与长队列「金额 double vs INTEGER（分）」同一条，不得再标已修 |

## 未修项优先级建议

| 优先级 | 条目 | 建议 |
|---|---|---|
| P1 | #7 fire-and-forget `ctx.RequestServices` ObjectDisposed | 改 `IServiceScopeFactory`（原审建议），列入修复轮（R9 或之后）；现兜底（catch + seed 补救）下风险=实体索引缺失，非越权 |
| P2 | #2 KPI scope 细粒度 | 已在长队列（AggregateKpiAsync），跟踪长队列即可 |
| P3 | #5 Univer 浏览器实测 | 需真实浏览器验证（Univer 0.25.x），无自动化手段，标注环境依赖 |

## 与既有队列重合标注（不重复登记）

- #2 KPI scope ↔ 长队列（AggregateKpiAsync KPI scope）
- #8 组件行数 ↔ M-REFACTOR1（12 个文件）+ npm check 行数 SOFT WARN
- #9 SQL 参数化 ↔ B1 门禁 + TD-BACKEND-28（21 B1 token 口径误报 + 7 B3）
- #10 金额 INTEGER ↔ AGENTS.md 红线 5（已满足）
