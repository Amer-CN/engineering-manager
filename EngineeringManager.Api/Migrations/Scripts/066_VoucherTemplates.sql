-- ============================================================
-- 066: 凭证模板最小实现（T5a）
-- 依据：金蝶 T_BAS_VCHTEMPLATE / TEMPLATEENTRY / AcctEntry（lane-finance），
--       取数魔法值 @AutoCal（差额倒挤）、FDC=1 借 / -1 贷、科目按 priority 首个命中。
-- 本轮只支撑「发票 → 凭证预览」，不建凭证表、不过账。
-- 幂等：CREATE IF NOT EXISTS + 以 code/line_no 为锚的 NOT EXISTS 插入。
-- 表名 [] 包裹（项目红线）。
-- ============================================================

CREATE TABLE IF NOT EXISTS [voucher_templates] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [code] TEXT NOT NULL UNIQUE,
  [name] TEXT NOT NULL,
  [business_type] TEXT NOT NULL,        -- invoice_out / invoice_in
  [description] TEXT,
  [enabled] INTEGER NOT NULL DEFAULT 1,
  [created_at] TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS [voucher_template_entries] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [template_id] INTEGER NOT NULL,
  [line_no] INTEGER NOT NULL,
  [dc] INTEGER NOT NULL,                -- 1=借, -1=贷
  [summary_template] TEXT,
  [amount_expr] TEXT NOT NULL,          -- '@AutoCal' | '{invoice.amount}' | '{invoice.taxAmount}' | '{invoice.priceAmount}'
  [filter_expr] TEXT,                   -- JSON 条件，可空（空=该行总命中）
  [created_at] TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS [ux_voucher_template_entries] ON [voucher_template_entries]([template_id],[line_no]);

CREATE TABLE IF NOT EXISTS [voucher_account_maps] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [entry_id] INTEGER NOT NULL,
  [account_code] TEXT NOT NULL,
  [account_name] TEXT NOT NULL,
  [priority] INTEGER NOT NULL DEFAULT 0,
  [filter_expr] TEXT,                   -- JSON 条件，可空（空=该科目总命中）
  [created_at] TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS [idx_voucher_account_maps_entry] ON [voucher_account_maps]([entry_id]);

-- ── 种子：开票收入凭证 ──────────────────────────────────────
INSERT OR IGNORE INTO [voucher_templates] ([code],[name],[business_type],[description],[enabled])
VALUES ('INV_REVENUE','开票收入凭证','invoice_out','借 应收账款；贷 主营业务收入 + 应交税费（销项，差额倒挤）',1);

INSERT INTO [voucher_template_entries] ([template_id],[line_no],[dc],[summary_template],[amount_expr],[filter_expr])
SELECT t.[id],1,1,'{invoice.name}','{invoice.amount}',NULL FROM [voucher_templates] t
WHERE t.[code]='INV_REVENUE'
  AND NOT EXISTS (SELECT 1 FROM [voucher_template_entries] e WHERE e.[template_id]=t.[id] AND e.[line_no]=1);
INSERT INTO [voucher_template_entries] ([template_id],[line_no],[dc],[summary_template],[amount_expr],[filter_expr])
SELECT t.[id],2,-1,'{invoice.name}','@AutoCal',NULL FROM [voucher_templates] t
WHERE t.[code]='INV_REVENUE'
  AND NOT EXISTS (SELECT 1 FROM [voucher_template_entries] e WHERE e.[template_id]=t.[id] AND e.[line_no]=2);
INSERT INTO [voucher_template_entries] ([template_id],[line_no],[dc],[summary_template],[amount_expr],[filter_expr])
SELECT t.[id],3,-1,'销项税额','{invoice.taxAmount}',NULL FROM [voucher_templates] t
WHERE t.[code]='INV_REVENUE'
  AND NOT EXISTS (SELECT 1 FROM [voucher_template_entries] e WHERE e.[template_id]=t.[id] AND e.[line_no]=3);

INSERT INTO [voucher_account_maps] ([entry_id],[account_code],[account_name],[priority],[filter_expr])
SELECT e.[id],'1122','应收账款',0,NULL FROM [voucher_template_entries] e
JOIN [voucher_templates] t ON t.[id]=e.[template_id]
WHERE t.[code]='INV_REVENUE' AND e.[line_no]=1
  AND NOT EXISTS (SELECT 1 FROM [voucher_account_maps] m WHERE m.[entry_id]=e.[id]);
INSERT INTO [voucher_account_maps] ([entry_id],[account_code],[account_name],[priority],[filter_expr])
SELECT e.[id],'6001','主营业务收入',0,NULL FROM [voucher_template_entries] e
JOIN [voucher_templates] t ON t.[id]=e.[template_id]
WHERE t.[code]='INV_REVENUE' AND e.[line_no]=2
  AND NOT EXISTS (SELECT 1 FROM [voucher_account_maps] m WHERE m.[entry_id]=e.[id]);
INSERT INTO [voucher_account_maps] ([entry_id],[account_code],[account_name],[priority],[filter_expr])
SELECT e.[id],'22210105','应交税费-应交增值税（销项税额）',0,NULL FROM [voucher_template_entries] e
JOIN [voucher_templates] t ON t.[id]=e.[template_id]
WHERE t.[code]='INV_REVENUE' AND e.[line_no]=3
  AND NOT EXISTS (SELECT 1 FROM [voucher_account_maps] m WHERE m.[entry_id]=e.[id]);

-- ── 种子：收票成本凭证 ──────────────────────────────────────
INSERT OR IGNORE INTO [voucher_templates] ([code],[name],[business_type],[description],[enabled])
VALUES ('INV_COST','收票成本凭证','invoice_in','借 原材料/成本 + 应交税费（进项）；贷 应付账款（差额倒挤）',1);

INSERT INTO [voucher_template_entries] ([template_id],[line_no],[dc],[summary_template],[amount_expr],[filter_expr])
SELECT t.[id],1,1,'{invoice.name}','{invoice.priceAmount}',NULL FROM [voucher_templates] t
WHERE t.[code]='INV_COST'
  AND NOT EXISTS (SELECT 1 FROM [voucher_template_entries] e WHERE e.[template_id]=t.[id] AND e.[line_no]=1);
INSERT INTO [voucher_template_entries] ([template_id],[line_no],[dc],[summary_template],[amount_expr],[filter_expr])
SELECT t.[id],2,1,'进项税额','{invoice.taxAmount}',NULL FROM [voucher_templates] t
WHERE t.[code]='INV_COST'
  AND NOT EXISTS (SELECT 1 FROM [voucher_template_entries] e WHERE e.[template_id]=t.[id] AND e.[line_no]=2);
INSERT INTO [voucher_template_entries] ([template_id],[line_no],[dc],[summary_template],[amount_expr],[filter_expr])
SELECT t.[id],3,-1,'{invoice.name}','@AutoCal',NULL FROM [voucher_templates] t
WHERE t.[code]='INV_COST'
  AND NOT EXISTS (SELECT 1 FROM [voucher_template_entries] e WHERE e.[template_id]=t.[id] AND e.[line_no]=3);

INSERT INTO [voucher_account_maps] ([entry_id],[account_code],[account_name],[priority],[filter_expr])
SELECT e.[id],'1403','原材料',0,NULL FROM [voucher_template_entries] e
JOIN [voucher_templates] t ON t.[id]=e.[template_id]
WHERE t.[code]='INV_COST' AND e.[line_no]=1
  AND NOT EXISTS (SELECT 1 FROM [voucher_account_maps] m WHERE m.[entry_id]=e.[id]);
INSERT INTO [voucher_account_maps] ([entry_id],[account_code],[account_name],[priority],[filter_expr])
SELECT e.[id],'22210101','应交税费-应交增值税（进项税额）',0,NULL FROM [voucher_template_entries] e
JOIN [voucher_templates] t ON t.[id]=e.[template_id]
WHERE t.[code]='INV_COST' AND e.[line_no]=2
  AND NOT EXISTS (SELECT 1 FROM [voucher_account_maps] m WHERE m.[entry_id]=e.[id]);
INSERT INTO [voucher_account_maps] ([entry_id],[account_code],[account_name],[priority],[filter_expr])
SELECT e.[id],'2202','应付账款',0,NULL FROM [voucher_template_entries] e
JOIN [voucher_templates] t ON t.[id]=e.[template_id]
WHERE t.[code]='INV_COST' AND e.[line_no]=3
  AND NOT EXISTS (SELECT 1 FROM [voucher_account_maps] m WHERE m.[entry_id]=e.[id]);
