-- ============================================================
-- 071: 凭证过账（T6b）
-- 过账即终态：不提供反过账；过账后凭证行与分录只读（触发器兜底）。
-- 金额仍为 INTEGER 分（项目红线）；表名 [] 包裹。
-- 幂等：列用「已存在则跳过」语义（MigrationRunner 对 schema 语句吞 duplicate column）；
--       触发器用 IF NOT EXISTS。
-- ============================================================

-- 过账时间 / 过账人（user id）；草稿为 NULL
ALTER TABLE [vouchers] ADD COLUMN [posted_at] TEXT;
ALTER TABLE [vouchers] ADD COLUMN [posted_by] TEXT;

-- 1) 已过账凭证不可再 UPDATE（含反过账、改总额、改号）
CREATE TRIGGER IF NOT EXISTS [trg_vouchers_posted_immutable]
BEFORE UPDATE ON [vouchers]
FOR EACH ROW
WHEN OLD.[status] = 'posted'
BEGIN
  SELECT RAISE(ABORT, '已过账凭证不可修改或反过账');
END;

-- 2) 已过账凭证不可删除（终态）
CREATE TRIGGER IF NOT EXISTS [trg_vouchers_posted_no_delete]
BEFORE DELETE ON [vouchers]
FOR EACH ROW
WHEN OLD.[status] = 'posted'
BEGIN
  SELECT RAISE(ABORT, '已过账凭证不可删除');
END;

-- 3) 已过账凭证的分录不可修改
CREATE TRIGGER IF NOT EXISTS [trg_voucher_entries_posted_no_update]
BEFORE UPDATE ON [voucher_entries]
FOR EACH ROW
WHEN (SELECT [status] FROM [vouchers] WHERE [id] = OLD.[voucher_id]) = 'posted'
BEGIN
  SELECT RAISE(ABORT, '已过账凭证的分录不可修改');
END;

-- 4) 已过账凭证的分录不可删除
CREATE TRIGGER IF NOT EXISTS [trg_voucher_entries_posted_no_delete]
BEFORE DELETE ON [voucher_entries]
FOR EACH ROW
WHEN (SELECT [status] FROM [vouchers] WHERE [id] = OLD.[voucher_id]) = 'posted'
BEGIN
  SELECT RAISE(ABORT, '已过账凭证的分录不可删除');
END;