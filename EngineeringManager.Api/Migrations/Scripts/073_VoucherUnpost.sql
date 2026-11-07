-- ============================================================
-- 073: 反过账（T7a）
-- 071 的触发器把 posted 凭证钉成完全只读；反过账需要且仅需要 posted→draft。
-- 放宽为：OLD=posted 时，只有「NEW=draft 且业务字段全部不变」才允许；
-- 分录仍保持只读（entries 触发器的 WHEN 仍按 parent status='posted' 判定），
-- 因此反过账不会顺手改分录；反过账后 parent=draft，分录自然解冻。
-- ============================================================

DROP TRIGGER IF EXISTS [trg_vouchers_posted_immutable];

CREATE TRIGGER IF NOT EXISTS [trg_vouchers_posted_immutable]
BEFORE UPDATE ON [vouchers]
FOR EACH ROW
WHEN OLD.[status] = 'posted' AND NOT (
  NEW.[status] = 'draft'
  AND NEW.[posted_at] IS NULL
  AND NEW.[posted_by] IS NULL
  AND NEW.[voucher_no] IS OLD.[voucher_no]
  AND NEW.[voucher_date] IS OLD.[voucher_date]
  AND NEW.[period] IS OLD.[period]
  AND NEW.[source_type] IS OLD.[source_type]
  AND NEW.[source_id] IS OLD.[source_id]
  AND NEW.[project_id] IS OLD.[project_id]
  AND NEW.[template_code] IS OLD.[template_code]
  AND NEW.[total_debit_fen] = OLD.[total_debit_fen]
  AND NEW.[total_credit_fen] = OLD.[total_credit_fen]
  AND NEW.[created_by] IS OLD.[created_by]
)
BEGIN
  SELECT RAISE(ABORT, '已过账凭证不可修改；仅允许反过账（posted→draft）');
END;