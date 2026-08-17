-- 042: 写作中心 writing_documents 表 + writing 权限码追加到 roles.permissions
--
-- 背景：v0.92.0 写作中心新模块。表结构见 docs/superpowers/specs/
--      2026-08-16-writing-center-design.md §3。权限追加铁律与 041 完全一致：
--   · 只做「追加」，禁止重置/覆盖角色权限 JSON
--   · 幂等：instr() 判码已在 JSON 内则整条 UPDATE 无操作
--   · 空/NULL/[] 权限兜底为单码数组
--   · JSON 守卫：permissions LIKE '[%' 才追加
--
-- admin + manager 各追加：writing:read / writing:create / writing:update / writing:delete
--（accountant/worker 不写公文，与既有授予集合一致，不追加）

-- ── 表 ──
CREATE TABLE IF NOT EXISTS writing_documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    doc_type    TEXT NOT NULL,              -- 白名单枚举，见 WritingSkillService.DocTypes
    style_id    TEXT,                       -- S1..S6，记录生成时风格
    content_md  TEXT NOT NULL DEFAULT '',
    project_id  INTEGER,                    -- 可选关联项目
    source_type TEXT NOT NULL DEFAULT 'manual', -- manual / stt
    source_ref  TEXT,                       -- 如 stt_job.id
    created_by  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    deleted_at  TEXT                        -- 软删
);

CREATE INDEX IF NOT EXISTS idx_writing_documents_type ON writing_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_writing_documents_updated ON writing_documents(updated_at);

-- ── 权限追加（admin）──

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["writing:read"]'
       WHEN instr(permissions, '"writing:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"writing:read"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"writing:read"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["writing:create"]'
       WHEN instr(permissions, '"writing:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"writing:create"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"writing:create"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["writing:update"]'
       WHEN instr(permissions, '"writing:update"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"writing:update"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"writing:update"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["writing:delete"]'
       WHEN instr(permissions, '"writing:delete"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"writing:delete"]'
       ELSE permissions END
WHERE id = 'admin'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"writing:delete"') = 0));

-- ── 权限追加（manager）──

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["writing:read"]'
       WHEN instr(permissions, '"writing:read"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"writing:read"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"writing:read"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["writing:create"]'
       WHEN instr(permissions, '"writing:create"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"writing:create"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"writing:create"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["writing:update"]'
       WHEN instr(permissions, '"writing:update"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"writing:update"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"writing:update"') = 0));

UPDATE roles SET permissions =
  CASE WHEN permissions IS NULL OR permissions = '' OR permissions = '[]' THEN '["writing:delete"]'
       WHEN instr(permissions, '"writing:delete"') = 0 THEN substr(permissions, 1, length(permissions) - 1) || ',"writing:delete"]'
       ELSE permissions END
WHERE id = 'manager'
  AND (permissions IS NULL OR permissions = '' OR permissions = '[]' OR (permissions LIKE '[%' AND instr(permissions, '"writing:delete"') = 0));