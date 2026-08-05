-- 037: 权限码追加到 roles.permissions（窗口 C 拍板 Q1：G3 缺码按静态 SYSTEM_ROLES 授予）
--
-- 背景：后端写操作权限门禁（C-4）将按权限码执行。以下 9 个码当前不在任何角色
--      （GetDefaultPermissions 缺失）：
--        settlement:approve / inventory:delete / projects:export / contracts:export
--        inventory:create / inventory:update / drawings:create / drawings:update / drawings:delete
--      其中 4 个（settlement:approve / inventory:delete / projects:export / contracts:export）
--      前端已在用 → can() 恒 false → 功能失效（findings/PERMISSION-GAPS.md）。
--
-- 铁律（与 AuthEndpoints 角色重置路径无关）：
--   · 只做「追加」，禁止重置/覆盖角色权限 JSON
--   · 幂等：instr() 判码已在 JSON 内则整条 UPDATE 无操作
--   · 空/NULL/[] 权限兜底为单码数组
--   · 与 Common.GetDefaultPermissions、src/types/permissions.ts 同 commit（拍板 Q1）

-- admin：补 settlement:approve / inventory:create / inventory:update / inventory:delete /
--        drawings:create / drawings:update / drawings:delete / projects:export / contracts:export
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["settlement:approve"]'
       WHEN instr(permissions, '"settlement:approve"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"settlement:approve"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"settlement:approve"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["inventory:create"]'
       WHEN instr(permissions, '"inventory:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"inventory:create"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"inventory:create"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["inventory:update"]'
       WHEN instr(permissions, '"inventory:update"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"inventory:update"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"inventory:update"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["inventory:delete"]'
       WHEN instr(permissions, '"inventory:delete"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"inventory:delete"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"inventory:delete"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["drawings:create"]'
       WHEN instr(permissions, '"drawings:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"drawings:create"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"drawings:create"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["drawings:read"]'
       WHEN instr(permissions, '"drawings:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"drawings:read"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"drawings:read"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["drawings:update"]'
       WHEN instr(permissions, '"drawings:update"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"drawings:update"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"drawings:update"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["drawings:delete"]'
       WHEN instr(permissions, '"drawings:delete"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"drawings:delete"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"drawings:delete"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["projects:export"]'
       WHEN instr(permissions, '"projects:export"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"projects:export"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"projects:export"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["contracts:export"]'
       WHEN instr(permissions, '"contracts:export"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"contracts:export"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"contracts:export"') = 0));

-- manager：补 inventory:create / inventory:update / drawings:create / drawings:update /
--          projects:export / contracts:export
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["inventory:create"]'
       WHEN instr(permissions, '"inventory:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"inventory:create"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"inventory:create"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["inventory:update"]'
       WHEN instr(permissions, '"inventory:update"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"inventory:update"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"inventory:update"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["drawings:create"]'
       WHEN instr(permissions, '"drawings:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"drawings:create"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"drawings:create"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["drawings:read"]'
       WHEN instr(permissions, '"drawings:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"drawings:read"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"drawings:read"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["drawings:update"]'
       WHEN instr(permissions, '"drawings:update"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"drawings:update"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"drawings:update"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["projects:export"]'
       WHEN instr(permissions, '"projects:export"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"projects:export"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"projects:export"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["contracts:export"]'
       WHEN instr(permissions, '"contracts:export"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"contracts:export"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"contracts:export"') = 0));

-- accountant：补 settlement:approve / contracts:export
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["settlement:approve"]'
       WHEN instr(permissions, '"settlement:approve"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"settlement:approve"]'
       ELSE permissions END
WHERE id = 'accountant'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"settlement:approve"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["contracts:export"]'
       WHEN instr(permissions, '"contracts:export"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"contracts:export"]'
       ELSE permissions END
WHERE id = 'accountant'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"contracts:export"') = 0));

-- worker：补 projects:export / contracts:export（只读导出，静态 SYSTEM_ROLES 已授予）
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["projects:export"]'
       WHEN instr(permissions, '"projects:export"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"projects:export"]'
       ELSE permissions END
WHERE id = 'worker'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"projects:export"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["contracts:export"]'
       WHEN instr(permissions, '"contracts:export"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"contracts:export"]'
       ELSE permissions END
WHERE id = 'worker'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"contracts:export"') = 0));
