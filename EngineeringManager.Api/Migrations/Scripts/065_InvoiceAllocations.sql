-- ============================================================
-- 065: 发票核销表（T4a）
-- 背景：payment_records.invoice_details 是 JSON 数组
--   [{ invoiceId, paymentAmount }]，paymentAmount 单位为【元】；
-- 本表把该 JSON 投影为规范化核销行，amount_fen 单位为【分】，
-- 供「已核销 / 未核销余额」查询与后续账龄、按结算看资金使用。
--
-- 金额口径：invoice_details.paymentAmount 元 → ROUND(x*100) 分；
--           invoices.amount 等库内金额列本身已是分（053 迁移）。
--
-- 幂等：CREATE IF NOT EXISTS + 唯一索引 + INSERT OR IGNORE；
--       回填重跑不产生重复行。json_valid 过滤脏 JSON，避免
--       malformed JSON 让整条迁移失败；软删除付款记录不参与回填。
-- 同一付款记录内重复 invoiceId 先按 SUM 聚合，与端点同步逻辑
-- （累加后插入）保持一致，避免唯一索引把第二笔静默丢弃。
-- 表名 [] 包裹（项目红线）。
-- ============================================================

CREATE TABLE IF NOT EXISTS [invoice_allocations] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [invoice_id] INTEGER NOT NULL,
  [payment_id] INTEGER NOT NULL,
  [amount_fen] INTEGER NOT NULL,           -- 本次核销金额（分）
  [created_at] TEXT DEFAULT (datetime('now')),
  [updated_at] TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS [ux_invoice_allocations_pair] ON [invoice_allocations]([invoice_id],[payment_id]);
CREATE INDEX IF NOT EXISTS [idx_invoice_allocations_invoice] ON [invoice_allocations]([invoice_id]);
CREATE INDEX IF NOT EXISTS [idx_invoice_allocations_payment] ON [invoice_allocations]([payment_id]);

-- 存量回填：JSON（元）→ 核销行（分）
INSERT OR IGNORE INTO [invoice_allocations] ([invoice_id],[payment_id],[amount_fen])
SELECT CAST(json_extract(j.value,'$.invoiceId') AS INTEGER) AS invoice_id,
       p.[id] AS payment_id,
       SUM(CAST(ROUND(CAST(json_extract(j.value,'$.paymentAmount') AS REAL) * 100) AS INTEGER)) AS amount_fen
FROM [payment_records] p, json_each(p.[invoice_details]) j
WHERE p.[deleted_at] IS NULL
  AND p.[invoice_details] IS NOT NULL AND p.[invoice_details] <> '[]'
  AND json_valid(p.[invoice_details])
  AND json_type(p.[invoice_details]) = 'array'
  AND json_type(j.value) = 'object'
  AND json_type(j.value,'$.invoiceId') = 'integer'
  AND json_type(j.value,'$.paymentAmount') IN ('integer','real')
  AND CAST(json_extract(j.value,'$.invoiceId') AS INTEGER) > 0
  AND CAST(json_extract(j.value,'$.paymentAmount') AS REAL) > 0
GROUP BY invoice_id, payment_id;
