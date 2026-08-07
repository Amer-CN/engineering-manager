-- 040: knowledge_documents 补 deleted_at 软删列
--
-- 背景：004_SoftDeleteFields 早于 029_AddKnowledgeBase（v0.84 M2 才建表），
--       ALTER 加 deleted_at 只作用于当时存在的表，knowledge_documents 从未获得该列。
--       M4 的文件夹端点（KnowledgeFolderEndpoints）子查询引用 d.deleted_at，
--       旧库（含正式库，039 已应用）500——补列即可（可空，既有行留 NULL = 未删除）。
--
-- 幂等：ALTER ADD COLUMN 重复跑 → duplicate column name 被 MigrationRunner 良性吞掉。
ALTER TABLE knowledge_documents ADD COLUMN deleted_at TEXT;
