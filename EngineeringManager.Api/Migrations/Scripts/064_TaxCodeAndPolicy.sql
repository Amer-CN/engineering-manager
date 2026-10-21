-- ============================================================
-- 064: invoices 税收分类编码与优惠政策字段（T3）
-- 背景：金蝶发票需要登记税收分类编码（FTAXCODE / PT 新增 IV_GTTAXCODE 口径）
-- 与优惠政策标识（FTAXPOLICY），本轮只打通手工录入与读写链路。
--   tax_code    税收分类编码，TEXT 可空（业务校验 ≤32 且仅 [0-9A-Za-z]）
--   tax_policy  优惠政策标识，TEXT 可空（业务校验 ≤64 且无控制字符）
-- 幂等：ADD COLUMN 重复执行 → duplicate column name 由
-- MigrationRunner 良性吞掉（与 062 同款）。
-- 存量行：两列均为 NULL（可空，无默认值）。
-- 表名 [] 包裹（项目红线）。
-- ============================================================

ALTER TABLE [invoices] ADD COLUMN [tax_code] TEXT;
ALTER TABLE [invoices] ADD COLUMN [tax_policy] TEXT;
