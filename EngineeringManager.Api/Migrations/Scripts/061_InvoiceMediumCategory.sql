-- ============================================================
-- 061: invoices 票种两维模型（介质 + 票种细分类）
-- 背景：invoice_kind 四值把"介质"与"票种"揉在一列，无法覆盖
-- 旅客运输/过路费/火车/飞机/定额/卷票等票种（金蝶 T_IV_GTINVOICE
-- 分列存 FINVOICEKIND/FINVOICETYPE）。本脚本拆两列：
--   invoice_medium   ∈ {electronic,paper}
--   invoice_category ∈ {special,regular,passenger_transport,
--                       toll,train,plane,quota,roll}
-- invoice_kind 保留，兼容旧客户端；服务端双向派生单点在端点。
-- 回填：electronic_* → electronic，paper_* → paper；
--       *_special → special，*_regular → regular。
-- 幂等：逐列独立回填，只补 NULL 列，已有值一律不覆盖；
--       半状态（一列有值/一列 NULL）重复执行也不会丢 category。
--       ALTER ADD COLUMN 重复跑 → duplicate column name 被
--       MigrationRunner 良性吞掉；索引用 IF NOT EXISTS。
-- 表名 [] 包裹（项目红线）；非金额列，无分制影响。
-- ============================================================

ALTER TABLE [invoices] ADD COLUMN [invoice_medium] TEXT;
ALTER TABLE [invoices] ADD COLUMN [invoice_category] TEXT;

UPDATE [invoices] SET [invoice_medium] = CASE
    WHEN [invoice_kind] LIKE 'electronic_%' THEN 'electronic'
    WHEN [invoice_kind] LIKE 'paper_%' THEN 'paper' END
WHERE [invoice_medium] IS NULL AND [invoice_kind] IS NOT NULL;

UPDATE [invoices] SET [invoice_category] = CASE
    WHEN [invoice_kind] LIKE '%_special' THEN 'special'
    WHEN [invoice_kind] LIKE '%_regular' THEN 'regular' END
WHERE [invoice_category] IS NULL AND [invoice_kind] IS NOT NULL;

CREATE INDEX IF NOT EXISTS [idx_invoices_medium] ON [invoices]([invoice_medium]);
CREATE INDEX IF NOT EXISTS [idx_invoices_category] ON [invoices]([invoice_category]);
