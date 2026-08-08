# CONFIRM-MATCHES-AUTHZ.md — confirm-matches 权限现状与 R9 候选方案（M-FIX9 W1）

## 1. 现状 WHERE 原文 + 语义

`EngineeringManager.Api/Endpoints/WageEndpoints.cs` POST /api/wages/confirm-matches：

```sql
UPDATE wages SET
    paid_amount=@PaidAmount, paid_date=@PaidDate, bank_receipt_path=@BankReceiptPath,
    updated_at=@Now, version=version+1, last_modified_at=@Now
WHERE id=@Id AND deleted_at IS NULL
  AND COALESCE(payment_locked, 0) = 0
  AND (created_by=@Uid OR @IsAdmin=1)
```

**语义**：非 admin 只能确认**自己创建（created_by=@Uid）**的工资行，admin 可确认全部。
- 跨项目不限：创建者对自己创建的行，无论其 project_id 是否被当前用户授权，都可确认（写付款列）。
- 他人创建的行，非 admin 一律 skipped（无项目授权分支可放行）。

## 2. 读写两侧不对称（事实）

- 读侧 `match-receipts`（同文件）：`WHERE w.project_id=@ProjectId AND <UserFilterWithAuthorizedProjects(scope, "w.project_id", "w.created_by")>`，
  即「本人创建 OR 项目已授权」都可见。
- 写侧 `confirm-matches`：只 `created_by=@Uid OR @IsAdmin=1`，**无项目授权分支**。
- 结论：同一用户对「他人创建、但项目已授权」的行——读侧 match 能匹配到（可见），写侧 confirm 却 skipped（不可确认）。
  读写不对称，且写侧是「更严格」方向（不构成越权，但构成功能不对称）。

## 3. 候选方案（M-FIX8 T4(e) 曾实装方案丙一半，M-FIX9 W1 已回滚）

### 方案 A：维持现状
- WHERE 保持 `(created_by=@Uid OR @IsAdmin=1)`。
- 影响面：非 admin 只能确认自己创建的行；跨项目不限（创建者全权）。
- 风险：无越权面扩大；但「项目已授权、他人创建」的行无法确认（功能不对称残留）。

### 方案 B：加 EXISTS 放宽（= T4(e) 已实装后被回滚的做法）
- WHERE = `(created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations pa WHERE pa.project_id=wages.project_id AND pa.user_id=@Uid))`。
- 影响面：非 admin 可确认「项目已授权、他人创建」的行（补对称）；同时**自己创建的未授权项目行仍可确认**（OR 第一分支）。
- 风险：**只可能让更多行被 UPDATE，不可能更少**——权限放宽，动钱（paid_amount/paid_date/bank_receipt_path）。
  未带「跨人修改落 audit_logs」与「仅企业版生效」两个方案丙必备件 → M-FIX9 W1 裁定回滚。

### 方案 C：收紧为必须项目授权（方案丙）
- 未授权项目一律拒绝（自己创建的行也受 project_authorizations 约束）+ 跨人修改落 audit_logs + 仅企业版生效。
- 影响面：非 admin 确认任何行都必须其 project_id 已授权；读侧 match-receipts 的「本人创建跨项目可见」需同步收紧；
  个人版（multiUserDataScope 关闭）不受影响（GetDataScope 恒 All）。
- 风险：破坏「创建者对自己跨项目行可管理」的现状语义；需同步改读侧 + 落审计。

## 4. 裁定状态

**待 R9 由原作者拍板**（三个方案不做选择）。本文件只记录现状事实与候选影响面。
- 测试锁定现状：`ReceiptMatchTests.Confirm_OthersRow_AlwaysSkipped_NonAdmin`（他人行无论项目一律 skipped）
  与 `Confirm_OwnRow_UnauthorizedProject_StillSaved`（自己行跨项目可确认）——若 R9 改方案，这两条必须同步改断言。
- M-FIX8 曾实装的「方案 B 一半」（加 EXISTS 无审计无 edition 门控）已在 M-FIX9 W1 逐字回滚，
  本文件即其回归记录。
