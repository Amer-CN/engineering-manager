-- ============================================================
-- 033: 知识库实体种子表 (Knowledge Entity Seeds)
-- 业务表 → knowledge_entity_seeds → knowledge_documents 关联层
--
-- entity_type 枚举值:
--   project, income_contract, expense_contract, partner,
--   invoice, settlement, wage, cost_ledger, material
--
-- UNIQUE(entity_type, entity_id) 保证幂等 upsert
-- ============================================================

CREATE TABLE IF NOT EXISTS [knowledge_entity_seeds] (
    [id]              INTEGER PRIMARY KEY AUTOINCREMENT,
    [entity_type]     TEXT    NOT NULL,
    [entity_id]       INTEGER NOT NULL,
    [entity_name]     TEXT    NOT NULL,
    [project_id]      INTEGER,
    [reference_doc_id] INTEGER,
    [created_at]      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE([entity_type], [entity_id])
);

CREATE INDEX IF NOT EXISTS [idx_kes_entity_type] ON [knowledge_entity_seeds]([entity_type]);
CREATE INDEX IF NOT EXISTS [idx_kes_project]      ON [knowledge_entity_seeds]([project_id]);
