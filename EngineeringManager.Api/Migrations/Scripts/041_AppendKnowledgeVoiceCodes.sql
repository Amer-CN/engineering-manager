-- 041: knowledge/voice 权限码追加到 roles.permissions（M3-M4 知识库功能合并阻断项）
--
-- 背景：M3 引入 knowledge:create/update/delete 与 voice:read（Common.cs + permissions.ts
--      静态角色已授），但真实库的 roles.permissions 是 037 时代的 JSON 快照——
--      没有本次迁移，老库上管理员建不了文件夹、语音页面对老用户显示无权限，
--      功能等于没发布（2026-08-07 终审合并阻断项）。
--
-- 铁律（与 037 完全一致）：
--   · 只做「追加」，禁止重置/覆盖角色权限 JSON
--   · 幂等：instr() 判码已在 JSON 内则整条 UPDATE 无操作
--   · 空/NULL/[] 权限兜底为单码数组
--   · JSON 守卫：permissions LIKE '[%' 才追加——旧格式（如 'all' / 'project:read'）
--     一律不碰（037 遗留的非 JSON 快照保持原样）
--
-- admin + manager 各追加：voice:read / knowledge:create / knowledge:update / knowledge:delete
--（accountant/worker 无 knowledge:read，与既有授予集合一致，不追加）

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["voice:read"]'
       WHEN instr(permissions, '"voice:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"voice:read"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"voice:read"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["knowledge:create"]'
       WHEN instr(permissions, '"knowledge:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"knowledge:create"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"knowledge:create"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["knowledge:update"]'
       WHEN instr(permissions, '"knowledge:update"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"knowledge:update"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"knowledge:update"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["knowledge:delete"]'
       WHEN instr(permissions, '"knowledge:delete"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"knowledge:delete"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"knowledge:delete"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["voice:read"]'
       WHEN instr(permissions, '"voice:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"voice:read"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"voice:read"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["knowledge:create"]'
       WHEN instr(permissions, '"knowledge:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"knowledge:create"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"knowledge:create"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["knowledge:update"]'
       WHEN instr(permissions, '"knowledge:update"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"knowledge:update"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"knowledge:update"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["knowledge:delete"]'
       WHEN instr(permissions, '"knowledge:delete"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"knowledge:delete"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"knowledge:delete"') = 0));
