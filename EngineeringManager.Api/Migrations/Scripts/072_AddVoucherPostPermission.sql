-- ============================================================
-- 072: 给 roles.permissions 追加凭证过账权限码（vouchers:approve）
--
-- 背景：T6b 引入凭证过账（draft → posted），过账是独立动作，不复用
--       vouchers:create/delete，避免与「改分录」混淆。
-- 老库 roles.permissions 是 038 快照 + 041/042/044/069 追加的 JSON，不含
-- vouchers:approve → accountant 在真实企业库调用过账会 403（admin 靠 IsAdmin 短路）。
-- 先例：037 / 041 / 044 / 069 的「只追加、不重置」铁律与 JSON 守卫。
-- 幂等：instr 已存在则跳过；非 JSON（NULL/空/[]）等价处理。
-- 表名 [] 包裹（项目红线）。
-- ============================================================

-- admin: vouchers:approve
UPDATE [roles] SET [permissions] =
  CASE WHEN [permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]' THEN '["vouchers:approve"]'
       WHEN instr([permissions], '"vouchers:approve"') = 0 THEN substr([permissions], 1, length([permissions]) - 1) || ',"vouchers:approve"]'
       ELSE [permissions] END
WHERE [id] = 'admin'
  AND ([permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]'
       OR ([permissions] LIKE '[%' AND instr([permissions], '"vouchers:approve"') = 0));

-- accountant: vouchers:approve
UPDATE [roles] SET [permissions] =
  CASE WHEN [permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]' THEN '["vouchers:approve"]'
       WHEN instr([permissions], '"vouchers:approve"') = 0 THEN substr([permissions], 1, length([permissions]) - 1) || ',"vouchers:approve"]'
       ELSE [permissions] END
WHERE [id] = 'accountant'
  AND ([permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]'
       OR ([permissions] LIKE '[%' AND instr([permissions], '"vouchers:approve"') = 0));