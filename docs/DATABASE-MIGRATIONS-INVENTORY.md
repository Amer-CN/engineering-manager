# 数据库迁移史盘点（工程管家）

> 生成基线：`bbddc22f` · 日期：2026-08-22
> 数据源：`EngineeringManager.Api/Migrations/Scripts/*.sql`（42 个脚本）
> 迁移运行器：`MigrationRunner.cs`（幂等执行，吞「duplicate column name」良性错误）

## 目录

1. [迁移编号总览](#迁移编号总览)
2. [初始架构（001）](#初始架构001)
3. [金额单位迁移（003）](#金额单位迁移003)
4. [软删除迁移（004）](#软删除迁移004)
5. [created_by 列迁移（009/011/014）](#created_by-列迁移009011014)
6. [PII 加密迁移（011/023/026）](#pii-加密迁移011023026)
7. [密码哈希迁移（012）](#密码哈希迁移012)
8. [项目授权迁移（013）](#项目授权迁移013)
9. [云同步列迁移（024/025）](#云同步列迁移024025)
10. [Agent/STT/知识库迁移（027/028/029/030/033）](#agentstt知识库迁移027028029030033)
11. [工资锁与唯一索引迁移（035/036）](#工资锁与唯一索引迁移035036)
12. [权限码追加迁移（037/038/041/042）](#权限码追加迁移037038041042)
13. [知识库文件夹迁移（039/040）](#知识库文件夹迁移039040)
14. [写作中心迁移（042）](#写作中心迁移042)
15. [完整表清单与字段演变](#完整表清单与字段演变)

---

## 迁移编号总览

| 编号 | 文件名 | 主题 | 影响 |
|------|--------|------|------|
| 001 | InitialSchema | 初始建表（29 张表 + 角色种子） | 全量 |
| 002 | SeedAdminUser | 种子管理员用户 | users |
| 003 | MoneyRealToInteger | 金额 REAL→INTEGER（分） | 15 张表 |
| 004 | SoftDeleteFields | 财务表加 deleted_at | 5 张表 |
| 005 | NormalizeTextFields | 文本字段规范化 | — |
| 006 | AddIndexes | 添加索引 | — |
| 007 | AddAuditFields | 审计字段 | — |
| 007b | AddProjectMembersCreatedAt | project_members 加 created_at | project_members |
| 008 | RestoreProjectManagerId | 恢复 project_manager_id | projects |
| 009 | AddCreatedByToBusinessTables | 19 个业务表加 created_by + 索引 | 19 张表 |
| 010 | AddProjectMembersUserId | project_members 加 user_id | project_members |
| 011 | AddPiiEncryptionColumns | 13 个 PII 列加 _enc | members/workers/partners/supervisors |
| 011(2) | AddCreatedByToInvoicesAndPaymentRecords | invoices/payment_records 加 created_by | 2 张表 |
| 012 | MigrateUsersToPasswordHash | 密码哈希迁移 | users |
| 013 | AddProjectAuthorizations | 项目授权表 | 新建表 |
| 014 | AddCreatedByToRemainingTables | 6 张表补 created_by + wage_history | 6+1 张表 |
| 016 | AddProjectsManagerId | projects 加 manager_id | projects |
| 017 | AddContractsPartnerId | 合同加 partner_id | income/expense/agreement_contracts |
| 018 | AddContractsMissingColumns | 合同补缺失列 | contracts |
| 019 | RenameRemarkToRemarks | remark→remarks | 多表 |
| 020 | AddCostLedgerBatchesCreatedBy | cost_ledger_batches 加 created_by | cost_ledger_batches |
| 021 | AddPartnersTaxNumber | partners 加 tax_number | partners |
| 022 | AddUserPreferencesTable | 用户偏好表 | 新建表 |
| 023 | AddPiiKeyRotation | PII 密钥轮换表 | 新建 pii_keys |
| 024 | AddCloudSyncColumns | 27 表加云同步列（version/last_modified_at/sync_status） | 27 张表 |
| 025 | AddSyncQueueAndDevices | 同步队列 + 设备注册表 | 新建 2 表 |
| 026 | AddPiiReencryptStatus | PII 重加密状态列 | pii_keys |
| 027 | AddAgentTables | Agent 对话/消息/配置表 | 新建 3 表 |
| 028 | AddSpeechToText | STT 任务表 | 新建 stt_jobs |
| 029 | AddKnowledgeBase | 知识库三表（documents/chunks/fts） | 新建 3 表 |
| 030 | AddKnowledgeDocUniqueIndex | 知识库文档唯一索引 | knowledge_documents |
| 031 | FixSchemaDriftWriteEndpoints | 写端点 schema 漂移修复 | 多表 |
| 032 | AddAgentConversationArchive | Agent 对话归档列 | agent_conversations |
| 032(2) | DropExpensesTable | 删除 expenses 表 | expenses（删除） |
| 033 | AddKnowledgeEntitySeeds | 知识库实体种子表 | 新建 knowledge_entity_seeds |
| 034 | AddUserProfileFields | 用户资料字段 | users |
| 035 | AddUniqueIndexWages | wages 部分唯一索引 | wages |
| 036 | AddWagePaymentColumns | wages 付款列（payment_locked/bank_receipt_path） | wages |
| 037 | AppendPermissionCodesToRoles | 9 个权限码追加 | roles |
| 038 | NormalizeFinanceRole | 财务角色 ID 规范化 | roles |
| 039 | AddKnowledgeFolders | 知识库文件夹表 | 新建 knowledge_folders |
| 040 | AddKnowledgeDocumentsSoftDelete | knowledge_documents 加 deleted_at | knowledge_documents |
| 041 | AppendKnowledgeVoiceCodes | 知识/语音权限码追加 | roles |
| 042 | AddWritingCenter | 写作中心表 + 权限码 | 新建 writing_documents |

---

## 初始架构（001）

`001_InitialSchema.sql` 创建了 29 张表：

| 表名 | 用途 | 主键 |
|------|------|------|
| projects | 工程项目 | INTEGER AUTO |
| members | 成员/员工 | INTEGER AUTO |
| workers | 工人 | INTEGER AUTO |
| project_workers | 项目工人关联 | INTEGER AUTO |
| income_contracts | 收入合同 | INTEGER AUTO |
| expense_contracts | 支出合同 | INTEGER AUTO |
| agreement_contracts | 协议合同 | INTEGER AUTO |
| invoices | 发票 | INTEGER AUTO |
| payment_records | 支付记录 | INTEGER AUTO |
| partners | 合作伙伴 | INTEGER AUTO |
| supervisors | 监管单位 | INTEGER AUTO |
| wages | 工资 | INTEGER AUTO |
| attendances | 考勤 | INTEGER AUTO |
| settlements | 结算 | INTEGER AUTO |
| cost_ledger | 成本台账 | INTEGER AUTO |
| cost_ledger_categories | 成本分类 | INTEGER AUTO |
| cost_ledger_match_rules | 匹配规则 | INTEGER AUTO |
| inventory_items | 库存项目 | INTEGER AUTO |
| inventory_transactions | 库存交易 | INTEGER AUTO |
| materials | 材料 | INTEGER AUTO |
| templates | 模板 | INTEGER AUTO |
| audit_logs | 审计日志 | INTEGER AUTO |
| roles | 角色 | TEXT |
| users | 用户 | TEXT |
| snapshots | 快照 | INTEGER AUTO |
| departments | 部门 | INTEGER AUTO |
| salary_history | 薪资历史 | INTEGER AUTO |
| worker_teams | 工人班组 | INTEGER AUTO |
| project_members | 项目成员 | INTEGER AUTO |
| regions | 区域 | INTEGER AUTO |
| drawings | 图纸 | INTEGER AUTO |
| expenses | 费用（后删） | INTEGER AUTO |
| contract_templates | 合同模板 | INTEGER AUTO |

**角色种子**：admin / manager / finance / worker（注意 038 后 finance 改为 accountant）。

---

## 金额单位迁移（003）

`003_MoneyRealToInteger.sql` 将 15 张表的金额列从 REAL（元）改为 INTEGER（分），乘以 100 取整。

**受影响表与列**：

| 表 | 迁移列 |
|----|--------|
| projects | budget |
| members | base_salary, daily_wage |
| workers | daily_wage |
| project_workers | daily_wage |
| income_contracts | amount |
| expense_contracts | amount |
| agreement_contracts | amount |
| invoices | amount, price_amount, tax_amount, received_amount |
| payment_records | amount |
| wages | daily_wage, bonus, deduction, actual_wage, paid_amount |
| settlements | amount |
| cost_ledger | amount |
| inventory_transactions | unit_price |
| expenses | amount |
| salary_history | base_salary, subsidy |

**迁移方式**：每张表创建 `_new` 表（INTEGER 列）→ INSERT SELECT（`CAST(COALESCE(col,0)*100 AS INTEGER)`）→ DROP 旧表 → RENAME。

**注意**：`tax_rate` 保持 REAL（是百分比，不是金额）。`work_days` 保持 REAL（是天数，不是金额）。

---

## 软删除迁移（004）

`004_SoftDeleteFields.sql` 为 5 张财务表加 `deleted_at TEXT` 列：
- invoices
- payment_records
- wages
- settlements
- cost_ledger

所有 DELETE 端点改为 `UPDATE SET deleted_at=@Now`（软删），查询端点加 `deleted_at IS NULL` 过滤。

---

## created_by 列迁移（009/011/014）

三批迁移为所有业务表加 `created_by TEXT` 列 + 索引，支持用户维度数据隔离。

| 批次 | 表数 | 表清单 |
|------|------|--------|
| 009 | 17 | projects, project_members, project_workers, income_contracts, expense_contracts, agreement_contracts, wages, attendances, members, workers, partners, supervisors, inventory_items, inventory_transactions, materials, expenses, drawings |
| 011(2) | 2 | invoices, payment_records |
| 014 | 6+1 | cost_ledger, settlements, worker_teams, departments, contract_templates, salary_history + 新建 wage_history |

每张表都创建 `idx_<table>_created_by` 索引。

---

## PII 加密迁移（011/023/026）

### 011: 加密列

为 4 张表加 13 个 `_enc` 加密列：

| 表 | 加密列 |
|----|--------|
| members | id_card_enc, id_card_address_enc, phone_enc, bank_account_enc |
| workers | id_card_enc, phone_enc, address_enc, bank_account_enc |
| partners | phone_enc, bank_account_enc, credit_code_enc, tax_number_enc |
| supervisors | phone_enc |

策略：保留原明文列（兼容老代码读 + 新代码写 _enc），新代码优先读 _enc。回填由 C# 端 `PiiProtector` 完成（AES-GCM 加密不能在 SQL 里跑）。

### 023: 密钥轮换

新建 `pii_keys` 表：
```sql
CREATE TABLE pii_keys (
    key_id INTEGER PRIMARY KEY AUTOINCREMENT,
    encrypted_key BLOB NOT NULL,      -- DPAPI 加密的 32 字节 AES key
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    created_by TEXT,
    retired_at TEXT
);
```

密文格式升级（兼容旧密文）：
- 旧（无 version）：`base64(nonce[12] || tag[16] || ciphertext)`
- 新（带 version）：`base64(version[1] || nonce[12] || tag[16] || ciphertext)`
- 解密时读首字节 = version，找对应 key；无 version → fallback 到 key_id=1

### 026: 重加密状态

为 `pii_keys` 加 `reencrypt_status` 列，跟踪后台 re-encrypt worker 进度。

---

## 密码哈希迁移（012）

`012_MigrateUsersToPasswordHash.sql` 从旧 `password+salt` 迁移到 `password_hash+password_salt+password_hash_version`：
- 加 3 个新列（幂等）
- 旧 password_hash 为空 → 强制重置（登录失败 → 引导走 reset-password）
- password_salt 初始化：有 salt 列→复制；无→`legacy-salt-needs-reset`

---

## 项目授权迁移（013）

新建 `project_authorizations` 表（admin 手动授权用户访问项目）：
```sql
CREATE TABLE project_authorizations (
    project_id INTEGER NOT NULL,
    user_id    TEXT    NOT NULL,
    granted_by TEXT,
    granted_at TEXT,
    PRIMARY KEY (project_id, user_id)
);
```

SELECT 过滤逻辑变为：`created_by=@Uid OR @IsAdmin=1 OR EXISTS(SELECT 1 FROM project_authorizations WHERE project_id=X.project_id AND user_id=@Uid)`。

---

## 云同步列迁移（024/025）

### 024: 27 表加 5 列

为 27 张业务表加云同步准备列：
- `version INTEGER DEFAULT 1` — 乐观锁（CAS），UPDATE 时 +1
- `last_modified_by_device TEXT` — 多设备追踪
- `last_modified_at TEXT` — sync 面时间戳
- `sync_status TEXT DEFAULT 'synced'` — synced/pending/conflict
- `deleted_at TEXT` — 软删标记（部分表已有 004 加过）

### 025: 同步队列 + 设备注册

新建 `sync_queue` 和 `device_registrations` 表。

---

## Agent/STT/知识库迁移（027/028/029/030/033）

### 027: Agent 表

新建 3 张表：
- `agent_conversations`（对话，含 deleted_at + archived_at）
- `agent_messages`（消息，含 tool_calls JSON）
- `agent_settings`（用户 LLM 配置，备选存储）

### 028: STT 表

新建 `stt_jobs` 表（语音转写任务）。

### 029: 知识库三表

- `knowledge_documents` — 文档元信息
- `knowledge_chunks` — 分块文本 + embedding BLOB
- `knowledge_fts` — FTS5 trigram 全文索引（触发器自动同步 chunks）

### 030: 文档唯一索引

`(created_by, source_type, source_ref)` 唯一索引，支持幂等入库。

### 033: 实体种子

新建 `knowledge_entity_seeds` 表，存储实体→文档关联（供语义检索偏置）。

---

## 工资锁与唯一索引迁移（035/036）

### 035: 部分唯一索引

```sql
CREATE UNIQUE INDEX ux_wages_pw_month
ON wages(project_id, project_worker_id, year_month)
WHERE deleted_at IS NULL;
```

支持 batch-save 的显式 upsert 冲突目标。软删行不参与冲突。

### 036: 付款列

- `payment_locked INTEGER DEFAULT 0` — 人工归档锁定（≠ paid_amount 自动已发款保护）
- `bank_receipt_path TEXT` — 银行回单凭证路径

---

## 权限码追加迁移（037/038/041/042）

### 037: 9 个权限码追加

为 admin/manager 追加：`settlement:approve`, `inventory:create/update/delete`, `drawings:create/update/delete`, `projects:export`, `contracts:export`。

### 038: 财务角色规范化

`finance` → `accountant`（角色 ID 与权限码对齐）。

### 041: 知识/语音权限码

为 admin/manager 追加：`voice:read`, `knowledge:create/update/delete`。

### 042: 写作中心权限码

为 admin/manager 追加：`writing:read/create/update/delete`。

**铁律**：只做追加，禁止重置/覆盖角色权限 JSON；幂等（`instr()` 判码已在 JSON 内则无操作）；空/NULL/[] 兜底为单码数组；JSON 守卫（`permissions LIKE '[%'` 才追加）。

---

## 知识库文件夹迁移（039/040）

### 039: 文件夹表

新建 `knowledge_folders` 表 + `knowledge_documents.folder_id` 列。不依赖 PRAGMA foreign_keys，文档移出由应用层显式 UPDATE folder_id=NULL。

### 040: 文档软删

`knowledge_documents` 加 `deleted_at`（029 建表时未加，因为 004 早于 029）。

---

## 写作中心迁移（042）

新建 `writing_documents` 表：
```sql
CREATE TABLE writing_documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    doc_type    TEXT NOT NULL,
    style_id    TEXT,
    content_md  TEXT NOT NULL DEFAULT '',
    project_id  INTEGER,
    source_type TEXT NOT NULL DEFAULT 'manual',
    source_ref  TEXT,
    created_by  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT
);
```

---

## 完整表清单与字段演变

以下是所有表在不同迁移后的最终状态：

### 公司级表（无 project_id）

| 表 | created_by | _enc 列 | version | deleted_at | 软删 |
|----|-----------|---------|---------|-----------|------|
| projects | ✓(009) | — | ✓(024) | — | ✗ |
| members | ✓(009) | ✓(011) 4列 | ✓(024) | — | ✗ |
| workers | ✓(009) | ✓(011) 4列 | ✓(024) | — | ✗ |
| partners | ✓(009) | ✓(011) 4列 | ✓(024) | — | ✗ |
| supervisors | ✓(009) | ✓(011) 1列 | ✓(024) | — | ✗ |
| inventory_items | ✓(009) | — | ✓(024) | — | ✗ |
| materials | ✓(009) | — | ✓(024) | — | ✗ |
| departments | ✓(014) | — | ✓(024) | — | ✗ |
| contract_templates | ✓(014) | — | ✓(024) | — | ✗ |
| templates | — | — | — | — | ✗ |
| roles | — | — | — | — | ✗ |
| users | — | — | — | — | ✗ |
| regions | — | — | — | — | ✗ |
| audit_logs | — | — | — | — | ✗ |
| snapshots | — | — | — | — | ✗ |

### 项目级表（有 project_id）

| 表 | created_by | _enc 列 | version | deleted_at | 软删 | 备注 |
|----|-----------|---------|---------|-----------|------|------|
| income_contracts | ✓(009) | — | ✓(024) | — | ✗ | 金额 INTEGER(003) |
| expense_contracts | ✓(009) | — | ✓(024) | — | ✗ | 金额 INTEGER(003) |
| agreement_contracts | ✓(009) | — | ✓(024) | — | ✗ | 金额 INTEGER(003) |
| invoices | ✓(011b) | — | ✓(024) | ✓(004) | ✓ | 多金额列 INTEGER(003) |
| payment_records | ✓(011b) | — | ✓(024) | ✓(004) | ✓ | 金额 INTEGER(003) |
| settlements | ✓(014) | — | ✓(024) | ✓(004) | ✓ | 金额 INTEGER(003) |
| cost_ledger | ✓(014) | — | ✓(024) | ✓(004) | ✓ | 金额 REAL（M-FIX1: 003 转分后又改回元） |
| wages | ✓(009) | — | ✓(024) | ✓(004) | ✓ | 金额 INTEGER(003) + payment_locked(036) + 唯一索引(035) |
| attendances | ✓(009) | — | ✓(024) | — | ✗ | — |
| cost_ledger_batches | ✓(020) | — | ✓(024) | — | ✗ | — |
| cost_ledger_categories | — | — | — | — | ✗ | 全局字典 |
| cost_ledger_match_rules | — | — | — | — | ✗ | 全局 |
| drawings | ✓(009) | — | ✓(024) | — | ✗ | — |
| worker_teams | ✓(014) | — | ✓(024) | — | ✗ | — |
| project_workers | ✓(009) | — | ✓(024) | — | ✗ | 金额 INTEGER(003) |
| project_members | ✓(009) | — | ✓(024) | — | ✗ | — |
| inventory_transactions | ✓(009) | — | ✓(024) | — | ✗ | 金额 INTEGER(003) |
| salary_history | ✓(014) | — | ✓(024) | — | ✗ | 金额 INTEGER(003) |
| wage_history | ✓(014新建) | — | ✓(024) | — | ✗ | 新建于 014 |

### 功能模块表

| 表 | 迁移 | 说明 |
|----|------|------|
| project_authorizations | 013 | 项目授权 |
| pii_keys | 023 | PII 密钥轮换 |
| user_preferences | 022 | 用户偏好 |
| agent_conversations | 027 | Agent 对话（archived_at: 032） |
| agent_messages | 027 | Agent 消息 |
| agent_settings | 027 | Agent LLM 配置 |
| stt_jobs | 028 | 语音转写任务 |
| knowledge_documents | 029 | 知识库文档（folder_id: 039, deleted_at: 040, 唯一索引: 030） |
| knowledge_chunks | 029 | 知识库分块 + embedding BLOB |
| knowledge_fts | 029 | FTS5 trigram 索引 |
| knowledge_entity_seeds | 033 | 实体种子 |
| knowledge_folders | 039 | 知识库文件夹 |
| writing_documents | 042 | 写作中心文档 |
| sync_queue | 025 | 同步队列 |
| device_registrations | 025 | 设备注册 |

### 已删除表

| 表 | 删除迁移 | 说明 |
|----|---------|------|
| expenses | 032(2) | 被 cost_ledger 取代 |

---

*文档结束。*
