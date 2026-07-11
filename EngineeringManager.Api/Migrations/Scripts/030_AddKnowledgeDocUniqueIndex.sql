-- ============================================================
-- M2 第四轮: 知识库文档幂等唯一索引
--
-- 目的: 数据库级并发安全，防止"先查再插"竞态导致重复文档
--
-- 唯一约束: (created_by, source_type, source_ref)
--   - 同用户 + 同来源类型 + 同来源标识 → 只能存在 1 条文档
--   - manual 类型不受限制（source_ref 通常为 NULL）
--   - source_ref 为 NULL 的记录不受限制
--
-- 注意: 不修改已发布/执行过的 029 迁移，使用新迁移号 030
-- ============================================================

-- 部分唯一索引：仅对非 manual 且 source_ref 非空的记录生效
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_doc_unique
ON knowledge_documents(created_by, source_type, source_ref)
WHERE source_type <> 'manual' AND source_ref IS NOT NULL;
