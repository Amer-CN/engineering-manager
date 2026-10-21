-- ============================================================
-- 070: 发票 OCR 字段骨架（T8）
-- 补金蝶收票字段字典中工程管家缺的 5 列（税收分类编码已在 064 完成）。
-- 本轮只落库与手工录入；OCR 自动识别后续单独接。
-- ============================================================

ALTER TABLE [invoices] ADD COLUMN [verify_code] TEXT;      -- 校验码
ALTER TABLE [invoices] ADD COLUMN [seller_tax_no] TEXT;    -- 销方税号
ALTER TABLE [invoices] ADD COLUMN [drawer] TEXT;           -- 开票人
ALTER TABLE [invoices] ADD COLUMN [payee] TEXT;            -- 收款人
ALTER TABLE [invoices] ADD COLUMN [reviewer] TEXT;         -- 复核人
