-- ============================================================
-- M2: 知识库 (Knowledge Base) 表结构
-- 对应 C# Services/KnowledgeBaseService.cs, Endpoints/KnowledgeEndpoints.cs
--
-- 三张表:
--   knowledge_documents  — 文档元信息（来源/标题/全文/说话人/项目）
--   knowledge_chunks     — 分块文本 + 向量 (BLOB)
--   knowledge_fts        — FTS5 trigram 全文索引（触发器自动同步）
--
-- created_by 类型: TEXT（与 028_AddSpeechToText.sql 的 stt_jobs.created_by 一致）
-- ============================================================

-- 1. 文档表
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_type TEXT NOT NULL,          -- call/meeting/upload/manual
    source_ref  TEXT,                   -- 对应 stt_job.id / 文件名 / 自定义标识
    project_id  INTEGER,                -- 关联项目（可空，Phase2 实体链接锚定种子）
    title       TEXT NOT NULL,
    full_text   TEXT NOT NULL,
    speakers    TEXT,                   -- JSON: 归一化后的说话人列表 + 时间段
    occurred_at TEXT,                   -- 录音/文档发生时间
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  TEXT NOT NULL           -- 创建用户 ID（与 028 一致: TEXT）
);

-- 2. 分块表
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text        TEXT NOT NULL,
    embedding   BLOB                    -- 入库时算好的 L2 归一化向量（float[] 原始字节）
);

-- 3. FTS5 全文索引（trigram tokenizer，支持中文子串匹配）
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
    text,
    content='knowledge_chunks',
    content_rowid='id',
    tokenize='trigram'
);

-- 4. 触发器：保持 knowledge_fts 与 knowledge_chunks 同步
--    INSERT: 插入新行到 FTS
CREATE TRIGGER IF NOT EXISTS knowledge_fts_ai
AFTER INSERT ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
END;

--    DELETE: 从 FTS 删除
CREATE TRIGGER IF NOT EXISTS knowledge_fts_ad
AFTER DELETE ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
END;

--    UPDATE: 先删旧值再插新值
CREATE TRIGGER IF NOT EXISTS knowledge_fts_au
AFTER UPDATE ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_fts(knowledge_fts, rowid, text) VALUES('delete', old.id, old.text);
    INSERT INTO knowledge_fts(rowid, text) VALUES (new.id, new.text);
END;

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_created_by ON knowledge_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_project ON knowledge_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source ON knowledge_documents(source_type, source_ref);
