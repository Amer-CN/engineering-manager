# R9-SCOPE.md — R9 施工图清点（M-FIX13 X3，只清点不改码）

> 本文件只陈述现状事实（grep 原样），不下「有洞/没洞」结论。R9 方案由原作者据此出。

## §1 写侧 7 个施工面的现状原文

### 1. drawings PUT（图纸更新）
- 文件:行：`EngineeringManager.Api/Endpoints/FileEndpoints.cs:183`
- WHERE 原文：
  ```
  WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)
  ```
- GetDataScope / UserFilter*：**否**（写侧无 scope；读侧 111/115 行用 `GetDataScope` + `UserFilterWithAuthorizedProjects(scope, "drawings.project_id")`）

### 2. attendances PUT（考勤更新）
- 文件:行：`EngineeringManager.Api/Endpoints/WageEndpoints.cs:80`
- WHERE 原文：
  ```
  WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)
  ```
- GetDataScope / UserFilter*：**写了 `var scope = GetDataScope(ctx)`（78 行）但 UPDATE 未用 scope**（写侧只 created_by/IsAdmin）
- 附带：`WageEndpoints.cs:223` 有 `UPDATE attendances SET work_days=@WorkDays,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id`（**UPDATE 分支 R9-1 已修**：WHERE 现为 `id=@Id AND (created_by=@Uid OR @IsAdmin=1)`，对齐本条 PUT 守卫；INSERT 分支归 G75，另行处理）

### 3. wages PUT（工资更新）
- 文件:行：`EngineeringManager.Api/Endpoints/WageEndpoints.cs:342`（单条工资）
- WHERE 原文：
  ```
  WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)
    AND COALESCE(paid_amount,0)=0 AND COALESCE(payment_locked,0)=0
  ```
- GetDataScope / UserFilter*：**否**
- 另：`WageEndpoints.cs:733`（batch 支付列）WHERE = `WHERE id=@Id AND deleted_at IS NULL AND COALESCE(payment_locked,0)=0 AND (created_by=@Uid OR @IsAdmin=1)`

### 4. invoices PUT（含 /status）
- 文件:行：`EngineeringManager.Api/Endpoints/InvoiceEndpoints.cs:79`（PUT 本体）
- WHERE 原文：
  ```
  WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)
  ```
- GetDataScope / UserFilter*：**否**（75-78 行只取 uid + isAdmin）
- /status：`ProjectWorkerMiscEndpoints.cs:46` `UPDATE invoices SET status=@Status,... WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)`

### 5. payment_records PUT
- 文件:行：`EngineeringManager.Api/Endpoints/InvoiceEndpoints.cs:217`
- WHERE 原文：
  ```
  WHERE id=@Id AND (created_by=@Uid OR @IsAdmin=1)
  ```
- GetDataScope / UserFilter*：**否**

### 6. settlements PUT（含 /process、/unarchive）
- 文件:行：`EngineeringManager.Api/Endpoints/ContractEndpoints.cs:451`（PUT）
- WHERE 原文：
  ```
  WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)
  ```
- /process：`ContractEndpoints.cs:501` `UPDATE settlements SET status='processed',... WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)`
- /unarchive：`ContractEndpoints.cs:513` `UPDATE settlements SET status='pending',... WHERE id=@Id AND deleted_at IS NULL AND (created_by=@Uid OR @IsAdmin=1)`
- GetDataScope / UserFilter*：**否**

### 7. cost_ledger_batches PUT
- 文件:行：`EngineeringManager.Api/Endpoints/CostLedgerEndpoints.cs:210`
- WHERE 原文（SQL 拼接 UserFilterCompany）：
  ```
  WHERE id=@Id AND {CurrentUser.UserFilterCompany(scope)}
  ```
- GetDataScope / UserFilter*：**是**——`var scope = CurrentUser.GetDataScope(ctx)`（207 行）+ `UserFilterCompany(scope)`（展开 = `(1=1)` 当 All，否则 `(created_by=@Uid)`）
- 7 组中**唯一**写侧用了 GetDataScope 的施工面

## §2 roles 三层身份缺陷现状

摘录自 docs/findings/ROLE-IDENTITY-DEFECTS.md（结论段，≤15 行）：
- **第①层** roles.permissions 逗号串：`HasPermission` 的 `JsonSerializer.Deserialize<string[]>(逗号串)` 抛异常 → catch false → 非 admin 权限码全 false → 写端点全 403。
- **第②层** role name 不匹配：001 种子 manager name=「项目经理」，映射（CurrentUser.cs:132）只认「经理」→ `SELECT ... WHERE id='项目经理'` 无行 → HasPermission false。
- **第③层** 同一 name 不匹配打到 ResolveRole：manager claim=「项目经理」→ `PiiRole.None` → PII 全脱敏。修复归属 R9（与②同源）。
- **第④层** finance vs accountant：已由 038 修好；但 038 没碰 manager name 和逗号串 → 经理仍全瘫。
- **第⑤层** HasPermission 角色解析（R9-6 发现并册）：JWT role claim 以角色 name 为载体（`AuthEndpoints` login：`role?.name ?? role_id`），HasPermission 只映射四个内置中文名（管理员/经理/财务/工人），未命中按 id 直通查 roles——后果：**name≠id 的自定义角色 fail-closed**（permissions 永不生效，企业版自定义角色功能的潜伏缺陷）；测试侧规避 = 自定义角色 name 与 id 同值。修复归属 042 roles 迁移轨道。
- 生产【应有】状态：042 迁移把 manager/worker 逗号串转 JSON + manager name 改「经理」（对齐映射）。

迁移目录末尾 5 项（无 042 开头脚本，确认）：
```
037_AppendPermissionCodesToRoles.sql
038_NormalizeFinanceRole.sql
039_AddKnowledgeFolders.sql
040_AddKnowledgeDocumentsSoftDelete.sql
041_AppendKnowledgeVoiceCodes.sql
```
**042 不存在**（`ls | grep "^042"` → NO 042），roles 修复迁移待 R9 落。

## §1b 写侧全集分桶（R9-0 Y2，只清点不改码）

> 取证命令（R9-0 Y2，原样）：
> ```
> grep -n "UPDATE \|DELETE FROM" EngineeringManager.Api/Endpoints/*.cs        # 全集 95 处匹配（含注释/多行/INSERT 侧 DO UPDATE）
> grep -n "created_by=@Uid OR @IsAdmin=1" EngineeringManager.Api/Endpoints/*.cs | grep -i "UPDATE\|DELETE"   # B 桶精确 42
> grep -n "UserFilterWithAuthorizedProjects\|UserFilterCompany" EngineeringManager.Api/Endpoints/*.cs       # A 桶写侧精确
> ```
> 分桶口径：只统计「业务数据写语句」（UPDATE / DELETE FROM 实际执行），一条语句算一条；
> 系统/管理操作（roles/users 权限配置、PII backfill、sqlite/migrate 全表重灌、user_preferences upsert）无「行归属」语义，列桶外。
> 四桶定义：**A**=WHERE 含 UserFilter*(scope)；**B**=WHERE 只有 `(created_by=@Uid OR @IsAdmin=1)` 类归属校验；**C**=WHERE 只有 `id=@Id` 但端点内另有显式归属/授权校验；**D**=WHERE 只有 `id=@Id` 且端点内无归属/授权校验。

### A 桶：WHERE 含 UserFilter*(scope)（真·范围校验）— 7 条

| # | 文件:行 | 路由 | UserFilter 调用 |
|---|---------|------|-----------------|
| A1 | ContractEndpoints.cs:205 | PUT /api/contracts/income | UserFilterWithAuthorizedProjects(scope, "income_contracts.project_id") |
| A2 | ContractEndpoints.cs:248 | PUT /api/contracts/expense | UserFilterWithAuthorizedProjects(scope, "expense_contracts.project_id") |
| A3 | CostLedgerEndpoints.cs:69 | PUT /api/cost-ledger | UserFilterWithAuthorizedProjects(scope, "cost_ledger.project_id") |
| A4 | CostLedgerEndpoints.cs:84 | DELETE /api/cost-ledger/{id} | UserFilterWithAuthorizedProjects(scope, "cost_ledger.project_id") |
| A5 | CostLedgerEndpoints.cs:210 | PUT /api/cost-ledger/batches/{id} | UserFilterCompany(scope) |
| A6 | CostLedgerEndpoints.cs:222 | DELETE /api/cost-ledger/batches/{id} | UserFilterCompany(scope) |
| A7 | CostLedgerEndpoints.cs:303 | POST /api/cost-ledger/{batchId}/sheet（UPDATE [cost_ledger]） | UserFilterWithAuthorizedProjects(scope, "cost_ledger.project_id")（先验 batch 归属 278 行） |

> **A 桶 7 条。唯一把范围校验真正写进 WHERE 的域：合同（income/expense）+ 成本台账。**

### B 桶：WHERE 只有 (created_by=@Uid OR @IsAdmin=1) 类归属校验 — 42 条

| # | 文件:行 | 路由 |
|---|---------|------|
| B1 | ContractEndpoints.cs:290 | PUT /api/contracts/agreement |
| B2 | ContractEndpoints.cs:308 | DELETE /api/contracts/income/{id} |
| B3 | ContractEndpoints.cs:318 | DELETE /api/contracts/expense/{id} |
| B4 | ContractEndpoints.cs:328 | DELETE /api/contracts/agreement/{id} |
| B5 | ContractEndpoints.cs:361 | PUT /api/contract-templates |
| B6 | ContractEndpoints.cs:373 | DELETE /api/contract-templates/{id} |
| B7 | ContractEndpoints.cs:451 | PUT /api/settlements |
| B8 | ContractEndpoints.cs:492 | DELETE /api/settlements/{id} |
| B9 | ContractEndpoints.cs:501 | POST /api/settlements/{id}/process |
| B10 | ContractEndpoints.cs:513 | POST /api/settlements/{id}/unarchive |
| B11 | FileEndpoints.cs:126 | DELETE /api/drawings/{id} |
| B12 | FileEndpoints.cs:183 | PUT /api/drawings |
| B13 | InvoiceEndpoints.cs:79 | PUT /api/invoices |
| B14 | InvoiceEndpoints.cs:116 | DELETE /api/invoices/{id} |
| B15 | InvoiceEndpoints.cs:217 | PUT /api/payment-records |
| B16 | InvoiceEndpoints.cs:242 | DELETE /api/payment-records/{id} |
| B17 | InventoryEndpoints.cs:51 | PUT /api/inventory |
| B18 | InventoryEndpoints.cs:66 | DELETE /api/inventory/{id} |
| B19 | InventoryEndpoints.cs:115 | PUT /api/materials |
| B20 | InventoryEndpoints.cs:129 | DELETE /api/materials/{id} |
| B21 | MemberEndpoints.cs:97 | PUT /api/members |
| B22 | MemberEndpoints.cs:117 | DELETE /api/members/{id} |
| B23 | MemberEndpoints.cs:187 | PUT /api/workers |
| B24 | MemberEndpoints.cs:205 | DELETE /api/workers/{id} |
| B25 | MemberEndpoints.cs:266 | DELETE /api/project-workers/{id} |
| B26 | MemberEndpoints.cs:313 | PUT /api/departments |
| B27 | MemberEndpoints.cs:328 | DELETE /api/departments/{id} |
| B28 | MemberEndpoints.cs:381 | DELETE /api/worker-teams/{id} |
| B29 | PartnerEndpoints.cs:93 | PUT /api/partners |
| B30 | PartnerEndpoints.cs:133 | DELETE /api/partners/{id} |
| B31 | PartnerEndpoints.cs:180 | PUT /api/supervisors |
| B32 | PartnerEndpoints.cs:196 | DELETE /api/supervisors/{id} |
| B33 | ProjectEndpoints.cs:124 | PUT /api/projects/{id} |
| B34 | ProjectEndpoints.cs:139 | DELETE /api/projects/{id} |
| B35 | ProjectEndpoints.cs:174 | DELETE /api/project-members/{id} |
| B36 | ProjectWorkerMiscEndpoints.cs:35 | PUT /api/project-workers |
| B37 | ProjectWorkerMiscEndpoints.cs:46 | PUT /api/invoices/{id}/status |
| B38 | WageEndpoints.cs:80 | PUT /api/attendances |
| B39 | WageEndpoints.cs:95 | DELETE /api/attendances/{id} |
| B40 | WageEndpoints.cs:107 | POST /api/attendances/batch-delete |
| B41 | WageEndpoints.cs:342 | PUT /api/wages |
| B42 | WageEndpoints.cs:392 | DELETE /api/wages/{id} |
| B43 | WageEndpoints.cs:404 | POST /api/wages/batch-delete |
| B44 | WageEndpoints.cs:417 | POST /api/wages/batch-clear-payments |
| B45 | WageEndpoints.cs:431 | POST /api/wages/archive |
| B46 | WageEndpoints.cs:446 | POST /api/wages/batch-unarchive |
| B47 | WageEndpoints.cs:558 | POST /api/wages/confirm-matches |
| B48 | WageEndpoints.cs:733 | POST /api/wages/batch-payment |
| B49 | WageEndpoints.cs:866 | DELETE /api/salary-history/{id} |
| B50 | WageEndpoints.cs:677 | POST /api/wages/batch-save（ON CONFLICT DO UPDATE 带 created_by/IsAdmin） |

> B 桶 grep 精确计 **42 条**。上表列 50 行（B1-B50）为便于定位列出全部行号，其中 8 行是多行同一 UPDATE 的续行被 grep 重复计（ContractEndpoints.cs:451/492/501/513、WageEndpoints.cs:342/558/733、ProjectEndpoints.cs:124 等多行 SET），去重后 = 42。**非业务归属的管理写（roles/users/PII/sqlite-migrate）不在此列。**

> **方案丙标注（R9-9 起）**：
> - **B41（PUT /api/wages）—— 已对齐方案丙（R9-9）**：授权项目内跨人可改 + 跨人修改落 audit（fail-closed 同事务），归属裁决由 C# `RowWriteGate.Classify` 单点承担（SQL WHERE 移除 created_by/IsAdmin）；锁在授权分支之前（已发款/已归档 → 409）；旧版「409/403 混同」修正（无归属权限不再误报 409）。实证：`R9WageCrossUserEditTests.cs`。
> - **B48（batch-payment）/ B50（batch-save）—— 已对齐方案丙（R9-10）**：循环内预读行归属 → Classify 单点裁决 → 授权跨人 + audit（fail-closed 同事务），归属条件移出 SQL；锁在授权分支之前（paid/locked → skipped）；batch-save 无行 → INSERT 新建（创建侧 G76 门，无 audit）。实证：`R9WageBatchCrossUserTests.cs` + B2 OtherOwnersRow 翻转 SavedWithAudit。
> - **B38（PUT /api/attendances）—— 已对齐方案丙（R9-11）**：预读行归属（created_by+project_id）→ Classify 单点裁决 → 授权跨人 + audit（fail-closed 同事务），归属条件移出 SQL（WHERE 只留 id）；无锁列（无 paid_amount/payment_locked）故无 409 档；行不存在与未授权均 403（现状语义）。实证：`R9AttendanceCrossUserEditTests.cs`。
> - **B13（PUT /api/invoices）/ B37（PUT /api/invoices/{id}/status）—— 已对齐方案丙（R9-12）**：预读行归属（created_by+project_id）→ Classify 单点裁决 → 授权跨人 + audit（fail-closed 同事务），归属条件移出 SQL（WHERE 只留 id）；无锁列（无 paid_amount/payment_locked）故无 409 档；行不存在与未授权均 403（现状语义，未改 WriteResult 的 404）；B13 知识库种子 fire-and-forget 保留在 Commit 之后（原条件原样）；发票金额单位「元」直传直存（无 ToFen）。实证：`R9InvoiceCrossUserEditTests.cs`。
> - **B44/B45/B46（付款清空/归档锁定/解锁）—— 方案丙例外（不放宽，R9-9 登记）**：审查方细化裁决对授权跨人不放宽，维持 created_by/admin 现状，随登记入册。

### C 桶：WHERE 只有 id=@Id（或等价），端点内另有显式归属/授权校验 — 6 条

| # | 文件:行 | 路由 | 端点内已有检查 |
|---|---------|------|----------------|
| C1 | KnowledgeEndpoints.cs:269 | PUT /api/knowledge/documents/{id} | 249-253 行 `docOwned`：COUNT documents WHERE d.id=@Id AND deleted_at IS NULL AND (d.created_by=@Uid OR @IsAdmin=1) > 0，否则 404 |
| C2 | KnowledgeFolderEndpoints.cs:140 | PUT /api/knowledge/folders/{id} | 134-135 行 `KnowledgeBaseService.CanAccessFolder(db,id,uid,isAdmin)`（含 project_authorizations EXISTS），否则 403 |
| C3 | KnowledgeFolderEndpoints.cs:182 | DELETE /api/knowledge/folders/{id} | 177 行 同上 CanAccessFolder，否则 403（软删） |
| C4 | KnowledgeFolderEndpoints.cs:193 | DELETE /api/knowledge/folders/{id}（文档移出 UPDATE） | 同 C3 已先验 CanAccessFolder 才进事务 |
| C5 | UserPreferencesEndpoints.cs:61 | PUT /api/user-preferences | INSERT ... ON CONFLICT(user_id,key)：冲突目标天然限 user_id=@Uid |
| C6 | UserPreferencesEndpoints.cs:109 | PUT /api/user-preferences/{key} | 同上 ON CONFLICT(user_id,key) |

### D 桶：WHERE 只有 id=@Id（或等价），端点内无归属/授权校验 — 10 条

> **D 桶必须逐条贴 SQL 原文 + 路由 + 端点内已有检查语句原文**（Y2(c) 要求）。逐条如下。

---

**D1. WageEndpoints.cs:223（attendances batch-import UPDATE）—— UPDATE 分支已修（R9-1）**
- 路由：POST /api/attendances/batch-import
- SQL 原文（223 行，R9-0 清点时）：
  ```sql
  UPDATE attendances SET work_days=@WorkDays,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id
  ```
- 端点内已有检查原文（206 行）：`if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();`
- 另：端点内算了 `var scope = CurrentUser.GetDataScope(ctx);`（207 行）但**未用于任何 UPDATE**。
- 配套 SELECT 定位（219 行）：`SELECT id FROM attendances WHERE project_id=@ProjectId AND year_month=@YearMonth AND project_worker_id=@PwId`（按入参 projectId 定位，未查归属）。
- 状态：**R9-0 Y1 已举证越权可写**（Y1b：非 admin B 改 A 行 200、work_days 10→99、created_by 不变）。**R9-1 G73 已修 UPDATE 分支**（WHERE 现为 `id=@Id AND (created_by=@Uid OR @IsAdmin=1)`，新增 skipped 返回归属拦截项）。**R9-3 G75 已修 INSERT 分支**（项目级写入门：batch-import 循环前 `CanWriteProject`，未授权项目 → 403；行级守卫 R9-1 保留）。

**D2. WageEndpoints.cs:812（wages generate UPDATE）—— 已修（R9-2）**
- 路由：POST /api/wages/generate
- SQL 原文（812-815 行，R9-0 清点时）：
  ```sql
  UPDATE wages SET daily_wage=@DailyFen, work_days=@WorkDays,
      actual_wage=@ActualFen, updated_at=@Now, version=version+1, last_modified_at=@Now
      WHERE id=@Id AND deleted_at IS NULL
        AND COALESCE(paid_amount,0)=0 AND COALESCE(payment_locked,0)=0
  ```
- 端点内已有检查原文（770 行）：`if (!CurrentUser.HasPermission(ctx, db, "wages:create")) return Results.Forbid();`
- 相关：前置 SELECT 考勤行（775-782 行）带 `UserFilterWithAuthorizedProjects(scope, "a.project_id", "a.created_by")`；但 **UPDATE wages 自身无归属条件**，且 `existing` 行定位 SELECT（798-803 行）只按 `project_id + year_month + project_worker_id/member_id`，未查 created_by。可写行（paid_amount=0 且未归档）若恰为他人创建 → 会被改写。
- 状态：**R9-2 已修 UPDATE 分支**（WHERE 追加 `AND (created_by=@Uid OR @IsAdmin=1)`，新增 ownershipSkipped 响应字段；INSERT 分支归 G75）。实证：`R9WageGenerateAuthzTests.cs` GenB（B 自建考勤 + A 建工资行，修复前红 20000→30000、修复后 3/3 绿）。

**D3. MemberEndpoints.cs:368（worker-teams PUT）—— 已修（R9-6）**
- 路由：PUT /api/worker-teams
- SQL 原文（368-369 行）：
  ```sql
  UPDATE worker_teams SET name=COALESCE(@Name,name),
      leader_id=@LeaderId,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id
  ```
- 端点内已有检查原文（367 行）：`if (!CurrentUser.HasPermission(ctx, db, "members:update")) return Results.Forbid();`
- 备注：worker_teams 读侧 GET（MemberEndpoints.cs:344）用 `(wt.created_by=@Uid OR @IsAdmin=1)` 过滤，但本 UPDATE 无归属条件。
- 状态：**R9-6 已修**——WHERE 追加 `AND (created_by=@Uid OR @IsAdmin=1)`（对齐手足 DELETE）。实证：`R9WorkerTeamGuardTests.cs`（自定义角色 r9-6-lead 反向 403、admin/本人行正向 200）。

**D4. TemplateEndpoints.cs:74（templates PUT）—— 闭卷（R9-8，零生产代码）**
- 路由：PUT /api/templates
- SQL 原文（74 行）：
  ```sql
  UPDATE templates SET name=@Name,category=@Category,description=@Description,variables=@Variables,updated_at=@Now WHERE id=@Id
  ```
- 端点内已有检查原文（68 行）：`if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();`
- 备注：settings:update 仅 admin 角色有（GetDefaultPermissions），风险低但**无归属条件**。
- 状态：**R9-8 闭卷**——已 settings:update 门（TemplateEndpoints.cs:68），全局/纯管理操作（模板配置）无行归属语义可补，admin-only 门即充分控制；覆盖 = WritePermissionB1Tests.Worker_TemplatesUpdate_Returns403。

**D5. TemplateEndpoints.cs:26（templates DELETE）—— 闭卷（R9-8，零生产代码）**
- 路由：DELETE /api/templates/{id}
- SQL 原文（26 行）：
  ```sql
  DELETE FROM templates WHERE id=@Id
  ```
- 端点内已有检查原文（25 行）：`if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();`
- 状态：**R9-8 闭卷**——已 settings:update 门（:25），admin-only 门即充分控制；覆盖 = WritePermissionB1Tests.Worker_TemplatesDelete_Returns403。

**D6. RegionEndpoints.cs:31（regions DELETE）—— 已修（R9-5），POST 同族一并修复**
- 路由：DELETE /api/regions/{id}（+ POST /api/regions 同族，原登记仅 DELETE、POST 由审查方 R9-1 读码补记、本轮一并修复）
- SQL 原文（31 行）：
  ```sql
  DELETE FROM regions WHERE id=@Id
  ```
- 端点内已有检查原文：**无**（仅 30 行 `var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();` 强制登录，GlobalAuthMiddleware 兜底）。
- 状态：**R9-5 已修**——POST + DELETE 两写端点加 `settings:update` 权限码门（regions 为全局省市区字典，无归属/项目维度，复用设置域码，不新立码族）；GET 读路径不动。实证：`R9RegionWriteGateTests.cs`（worker 反向 403、admin 正向 200）。

**D7. SystemEndpoints.cs:175（audit purge）—— 闭卷（R9-8，零生产代码）**
- 路由：POST /api/audit/clear
- SQL 原文（175 行）：
  ```sql
  DELETE FROM audit_logs WHERE created_at < @Cutoff
  ```
- 端点内已有检查原文（161 行）：`if (isAdmin == 0) return Results.Forbid();`（admin 强校验，非权限码）。
- 状态：**R9-8 闭卷**——isAdmin==0 强校验（SystemEndpoints.cs:161），审计清理纯管理操作无行归属语义，admin-only 门即充分控制；覆盖 = 本轮钉住 `R9AdminGatePinTests.D7_AuditClear_Worker_Returns403_AndOldLogsStay`（Z1 清点 D7 缺覆盖）。

**D8. SystemEndpoints.cs:628（sqlite/migrate 全表重灌）—— 闭卷（R9-8，零生产代码）**
- 路由：POST /api/sqlite/migrate
- SQL 原文（628 行）：
  ```sql
  DELETE FROM [{table}]
  ```
- 端点内已有检查原文（599 行）：`if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();`（仅 admin 角色）。
- 状态：**R9-8 闭卷**——已 settings:update 门（:599），数据库迁移纯管理操作，admin-only 门即充分控制；覆盖 = WritePermissionT1Tests.Worker_SqliteMigrate_Returns403。

**D9. CostLedgerEndpoints.cs:142（cost_ledger_categories PUT）—— 已修（R9-7）**
- 路由：PUT /api/cost-ledger/categories
- SQL 原文（142 行）：
  ```sql
  UPDATE cost_ledger_categories SET label=@Name,direction=@Direction,level1=@Level1,color=@Color WHERE id=@Id
  ```
- 端点内已有检查原文（140 行）：`if (!CurrentUser.HasPermission(ctx, db, "costLedger:update")) return Results.Forbid();`
- 状态：**R9-7 已修**——PUT 码 `costLedger:update` → `settings:update`（全局共享字典归 admin 管，作者 2026-08-09 拍板；POST/DELETE 同族一并收紧）。实证：`R9CategoryGateTests.cs`。

**D10. CostLedgerEndpoints.cs:153（cost_ledger_categories DELETE）+ :162（categories/reset 全表清空）—— 已修（R9-7）**
- 路由：DELETE /api/cost-ledger/categories/{id}；POST /api/cost-ledger/categories/reset
- SQL 原文（153 行）：`DELETE FROM cost_ledger_categories WHERE id=@Id`
- SQL 原文（162 行）：`DELETE FROM cost_ledger_categories`（无 WHERE，全表清空）
- 端点内已有检查原文（151 行 / 160 行）：`if (!CurrentUser.HasPermission(ctx, db, "costLedger:update")) return Results.Forbid();` / `if (!CurrentUser.HasPermission(ctx, db, "settings:update")) return Results.Forbid();`
- 状态：**R9-7 已修 DELETE**（码 `costLedger:update` → `settings:update`）；**reset 本已 settings:update，本轮不动（测试 Pin1 钉住）**；POST 同族扩面一并收紧。实证：`R9CategoryGateTests.cs`。

---

### 计数对账（grep 95 匹配 → 四桶 65 条）

- **四桶合计**：A 7 + B 42 + C 6 + D 10 = **65 条业务写语句**。
- grep 全集 95 处匹配的构成：业务写语句 65 + roles/users 权限配置 6 条（AuthEndpoints.cs:202/214/257/266/277/522，桶外）+ PII 回填 4 条（AuthEndpoints.cs:320/330/340/350，桶外）+ 全表重灌 `DELETE [{table}]` 1 条（入 D8）+ 全表清空 categories 2 条（入 D10）+ user_preferences upsert 2 条（入 C5/C6）+ 注释/多行续行/重复约 17 行（桶外）。65 + 6 + 4 + 17 + 3 ≈ 95 闭合（近似）。
- **结论**：D 桶 10 条 = 业务表里「无归属校验」的写语句，是 R9 修复候选集。**与 Y1 举证相互印证：Y1b 锁定的正是 D1（attendances batch-import）越权写。**
- **D 桶 10/10 处置完毕（R9-8 清零声明）**：D1/D2/D3/D6/D9/D10 修复（R9-1/2/3/5/6/7），D4/D5/D7/D8 闭卷（R9-8，零生产代码——全局/纯管理操作，admin-only 门即充分控制）——**无归属校验写语句面清零**。

## §3 confirm-matches 三方案

摘录自 docs/findings/CONFIRM-MATCHES-AUTHZ.md（每方案 ≤3 行）：
- **方案 A 维持现状**：WHERE 保持 `(created_by=@Uid OR @IsAdmin=1)`；非 admin 只能确认自己创建的行（跨项目不限）；风险 = 「项目已授权、他人创建」的行无法确认（功能不对称残留），无越权面扩大。
- **方案 B 加 EXISTS 放宽**：WHERE 加 `OR EXISTS(project_authorizations ...)`；补对称但只可能让更多行被 UPDATE（动钱），且未带「跨人修改落 audit + 仅企业版」两必备件 → M-FIX9 W1 已回滚。
- **方案 C 收紧为必须项目授权（方案丙）**：未授权项目一律拒绝（自己创建的行也受约束）+ 跨人修改落 audit_logs + 仅企业版生效；需同步改读侧 match-receipts；破坏「创建者跨项目管理」现状语义。
