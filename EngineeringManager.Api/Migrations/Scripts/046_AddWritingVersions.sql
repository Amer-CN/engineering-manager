-- 046: 写作中心版本历史（writing_document_versions）
--
-- 背景：T2 版本快照 / 草稿找回。PUT documents 保存直接覆盖 content_md，
--       改坏了找不回上一版。本迁移建快照表，保存时自动留档旧内容，
--       编辑器可查历史列表并一键回滚（端点在 WritingVersionEndpoints）。
--
-- 语义（幂等、守卫，可在任意库态安全重跑；MigrationRunner 的 ExecuteScriptIdempotent
--   会吞掉 "duplicate column name" / "already exists" 等良性错误）：
--   a. 建 writing_document_versions 表：快照 = 某次保存前的完整 title + content_md，
--      created_by 记触发保存的用户（与 writing_documents.created_by 一致 TEXT）
--   b. 建索引 idx_writing_versions_doc(document_id, created_at DESC)：
--      版本列表按文档 + 时间倒序分页查询的主路径
--
-- 幂等论证：a/b 均 IF NOT EXISTS，任意库态重复执行无副作用。
-- 编号说明：简报原定 044，但基线已含 044（reports 权限）/045（audit 对齐），
--   迁移编号门禁（check-migration-naming.cjs）对重复数字前缀 HARD FAIL，故顺延为 046。

-- a. 版本快照表
CREATE TABLE IF NOT EXISTS writing_document_versions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,             -- 所属文档（应用层维护，不加外键，与 043 决策一致）
    title       TEXT NOT NULL,                -- 快照时的文档标题
    content_md  TEXT NOT NULL,                -- 快照时的正文（保存前的旧内容）
    created_by  TEXT NOT NULL,                -- 触发保存的用户
    created_at  TEXT NOT NULL
);

-- b. 索引（版本列表：按文档过滤 + created_at 倒序）
CREATE INDEX IF NOT EXISTS idx_writing_versions_doc ON writing_document_versions(document_id, created_at DESC);
