-- ============================================================
-- 067: 补回填「字符串金额」的历史核销（T4c）
-- 背景：065 的回填只接受 json_type(paymentAmount) IN ('integer','real')，
--       运行时 ParseInvoiceAllocations 还接受数字字符串；历史若以字符串存
--       paymentAmount，065 会漏行，导致超额校验的 otherAllocatedFen 偏小。
-- 做法：只对 json_type='text' 且内容为纯数字（可带小数点、无其它字符）的条目补回填；
--       INSERT OR IGNORE + 唯一索引保证重复执行不重复。
-- 表名 [] 包裹（项目红线）。
-- ============================================================

INSERT OR IGNORE INTO [invoice_allocations] ([invoice_id],[payment_id],[amount_fen])
SELECT CAST(json_extract(j.value,'$.invoiceId') AS INTEGER) AS invoice_id,
       p.[id] AS payment_id,
       -- 与 065/运行时口径一致：同一 payment 内重复 invoiceId 先累加再落一行
       SUM(CAST(ROUND(CAST(json_extract(j.value,'$.paymentAmount') AS REAL) * 100) AS INTEGER)) AS amount_fen
FROM [payment_records] p, json_each(p.[invoice_details]) j
WHERE p.[deleted_at] IS NULL
  AND p.[invoice_details] IS NOT NULL AND p.[invoice_details] <> '[]'
  AND json_valid(p.[invoice_details])
  AND json_type(p.[invoice_details]) = 'array'
  AND json_type(j.value) = 'object'
  AND json_type(j.value,'$.invoiceId') = 'integer'
  AND CAST(json_extract(j.value,'$.invoiceId') AS INTEGER) > 0
  AND json_type(j.value,'$.paymentAmount') = 'text'
  AND TRIM(json_extract(j.value,'$.paymentAmount')) NOT GLOB '*[^0-9.]*'
  AND TRIM(json_extract(j.value,'$.paymentAmount')) NOT GLOB ''
  AND TRIM(json_extract(j.value,'$.paymentAmount')) NOT GLOB '*.*.*'
  AND CAST(json_extract(j.value,'$.paymentAmount') AS REAL) > 0
GROUP BY invoice_id, payment_id;
