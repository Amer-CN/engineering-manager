-- 036: wages 付款列补齐（payment_locked / bank_receipt_path）
--
-- 背景：前端代码（WageDetailTable/WageRecordsTab/useWageActions 等 47 处引用）
-- 与后端端点（batch-delete/batch-clear-payments/archive 的 SQL）早就引用了
-- payment_locked、bank_receipt_path 两列，但迁移漏建——属「代码先写、迁移漏了」，
-- 本轮补迁移还债，不是加功能。
--
-- 语义：
--   payment_locked INTEGER NOT NULL DEFAULT 0 — 人工归档锁定（1=已归档，
--     付款/工资均不可改）；与 paid_amount（自动「已发款」守卫）是两件事
--   bank_receipt_path TEXT — 银行回单凭证文件路径（仅存储）
-- 不做数据回填：现有 wages 表 0 行，DEFAULT 已覆盖。
-- 幂等：MigrationRunner.ExecuteScriptIdempotent 对「duplicate column name」
-- 走良性错误跳过；重复执行不炸。
ALTER TABLE wages ADD COLUMN payment_locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE wages ADD COLUMN bank_receipt_path TEXT;
