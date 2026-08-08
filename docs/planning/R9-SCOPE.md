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
- 附带：`WageEndpoints.cs:223` 有 `UPDATE attendances SET work_days=@WorkDays,updated_at=@Now, version=version+1, last_modified_at=@Now WHERE id=@Id`（**无任何守卫条件**）

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

## §3 confirm-matches 三方案

摘录自 docs/findings/CONFIRM-MATCHES-AUTHZ.md（每方案 ≤3 行）：
- **方案 A 维持现状**：WHERE 保持 `(created_by=@Uid OR @IsAdmin=1)`；非 admin 只能确认自己创建的行（跨项目不限）；风险 = 「项目已授权、他人创建」的行无法确认（功能不对称残留），无越权面扩大。
- **方案 B 加 EXISTS 放宽**：WHERE 加 `OR EXISTS(project_authorizations ...)`；补对称但只可能让更多行被 UPDATE（动钱），且未带「跨人修改落 audit + 仅企业版」两必备件 → M-FIX9 W1 已回滚。
- **方案 C 收紧为必须项目授权（方案丙）**：未授权项目一律拒绝（自己创建的行也受约束）+ 跨人修改落 audit_logs + 仅企业版生效；需同步改读侧 match-receipts；破坏「创建者跨项目管理」现状语义。
