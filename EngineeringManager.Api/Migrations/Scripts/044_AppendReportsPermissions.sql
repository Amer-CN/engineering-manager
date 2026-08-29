-- 044: 报告中心 reports:read/create 权限码追加到 roles.permissions
--
-- 背景：265e976 引入报告中心（AI 一键生成日/周/月报），代码侧 GetDefaultPermissions
--      与前端 SYSTEM_ROLES 都授予了 admin/manager/accountant 三角色 reports 权限，
--      但该提交没带迁移脚本 — 老库 roles.permissions JSON 里没有这两个码：
--      前端 RequirePermission("reports:create") 拦截 → 「报告中心」无权限访问。
--      修复参照 037/042 铁律（与 038 accountant 重置行内容对齐）：
--   · 只做「追加」，禁止重置/覆盖角色权限 JSON
--   · 幂等：instr() 判码已在 JSON 内则整条 UPDATE 无操作
--   · 空/NULL/[] 权限兜底为单码数组
--   · JSON 守卫：permissions LIKE '[%' 才追加
--
-- 授予角色：admin / manager / accountant（与代码默认值一致；worker 不生成报告）

-- ── admin ──
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["reports:read"]'
       WHEN instr(permissions, '"reports:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"reports:read"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"reports:read"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["reports:create"]'
       WHEN instr(permissions, '"reports:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"reports:create"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"reports:create"') = 0));

-- ── manager ──
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["reports:read"]'
       WHEN instr(permissions, '"reports:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"reports:read"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"reports:read"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["reports:create"]'
       WHEN instr(permissions, '"reports:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"reports:create"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"reports:create"') = 0));

-- ── accountant ──
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["reports:read"]'
       WHEN instr(permissions, '"reports:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"reports:read"]'
       ELSE permissions END
WHERE id = 'accountant'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"reports:read"') = 0));
UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["reports:create"]'
       WHEN instr(permissions, '"reports:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"reports:create"]'
       ELSE permissions END
WHERE id = 'accountant'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"reports:create"') = 0));
