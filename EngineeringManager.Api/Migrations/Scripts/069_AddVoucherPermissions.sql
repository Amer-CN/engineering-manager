-- ============================================================
-- 069: 给 roles.permissions 追加凭证权限码（vouchers:create/read/delete）
--
-- 背景：T6a 引入凭证草稿，代码侧 GetDefaultPermissions 与前端 SYSTEM_ROLES
--       已授予 admin / accountant 三个 vouchers 权限码，但老库 roles.permissions
--       是 038 快照 + 041/042/044 追加的 JSON，不含 vouchers:* →
--       真实企业库 accountant 调用 /api/vouchers/* 会 403（admin 靠 IsAdmin 短路）。
-- 先例：037 / 041 / 044 的「只追加、不重置」铁律与 JSON 守卫。
-- 幂等：instr 已存在则跳过；非 JSON（NULL/空/[]）等价处理。
-- 表名 [] 包裹（项目红线）。
-- ============================================================

-- admin: vouchers:create
UPDATE [roles] SET [permissions] =
  CASE WHEN [permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]' THEN '["vouchers:create"]'
       WHEN instr([permissions], '"vouchers:create"') = 0 THEN substr([permissions], 1, length([permissions]) - 1) || ',"vouchers:create"]'
       ELSE [permissions] END
WHERE [id] = 'admin'
  AND ([permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]'
       OR ([permissions] LIKE '[%' AND instr([permissions], '"vouchers:create"') = 0));

-- admin: vouchers:read
UPDATE [roles] SET [permissions] =
  CASE WHEN [permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]' THEN '["vouchers:read"]'
       WHEN instr([permissions], '"vouchers:read"') = 0 THEN substr([permissions], 1, length([permissions]) - 1) || ',"vouchers:read"]'
       ELSE [permissions] END
WHERE [id] = 'admin'
  AND ([permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]'
       OR ([permissions] LIKE '[%' AND instr([permissions], '"vouchers:read"') = 0));

-- admin: vouchers:delete
UPDATE [roles] SET [permissions] =
  CASE WHEN [permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]' THEN '["vouchers:delete"]'
       WHEN instr([permissions], '"vouchers:delete"') = 0 THEN substr([permissions], 1, length([permissions]) - 1) || ',"vouchers:delete"]'
       ELSE [permissions] END
WHERE [id] = 'admin'
  AND ([permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]'
       OR ([permissions] LIKE '[%' AND instr([permissions], '"vouchers:delete"') = 0));

-- accountant: vouchers:create
UPDATE [roles] SET [permissions] =
  CASE WHEN [permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]' THEN '["vouchers:create"]'
       WHEN instr([permissions], '"vouchers:create"') = 0 THEN substr([permissions], 1, length([permissions]) - 1) || ',"vouchers:create"]'
       ELSE [permissions] END
WHERE [id] = 'accountant'
  AND ([permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]'
       OR ([permissions] LIKE '[%' AND instr([permissions], '"vouchers:create"') = 0));

-- accountant: vouchers:read
UPDATE [roles] SET [permissions] =
  CASE WHEN [permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]' THEN '["vouchers:read"]'
       WHEN instr([permissions], '"vouchers:read"') = 0 THEN substr([permissions], 1, length([permissions]) - 1) || ',"vouchers:read"]'
       ELSE [permissions] END
WHERE [id] = 'accountant'
  AND ([permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]'
       OR ([permissions] LIKE '[%' AND instr([permissions], '"vouchers:read"') = 0));

-- accountant: vouchers:delete
UPDATE [roles] SET [permissions] =
  CASE WHEN [permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]' THEN '["vouchers:delete"]'
       WHEN instr([permissions], '"vouchers:delete"') = 0 THEN substr([permissions], 1, length([permissions]) - 1) || ',"vouchers:delete"]'
       ELSE [permissions] END
WHERE [id] = 'accountant'
  AND ([permissions] IS NULL OR [permissions] = '' OR [permissions] = '[]'
       OR ([permissions] LIKE '[%' AND instr([permissions], '"vouchers:delete"') = 0));
