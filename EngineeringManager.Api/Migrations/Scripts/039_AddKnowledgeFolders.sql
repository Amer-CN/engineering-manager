-- 039: 知识库文件夹（knowledge_folders）+ 文档挂文件夹（folder_id）
--
-- 背景：知识库首页 3D 玻璃文件夹轮播（M2 落地，演示数据）需要真实文件夹；
--       knowledge_documents（029 建）已有 project_id 列（可空 = 跨项目通用资料），
--       缺的是文件夹概念。
--
-- 语义（幂等、守卫，可在任意库态安全重跑；MigrationRunner 的 ExecuteScriptIdempotent
--   会吞掉 "duplicate column name" / "already exists" 等良性错误）：
--   a. 建 knowledge_folders 表（软删 deleted_at 列；project_id 可空 = 跨项目通用资料）
--   b. knowledge_documents 加 folder_id 列（可空：历史文档无文件夹）。
--      SQLite 的 ADD COLUMN 不支持 REFERENCES 约束生效（外键需 PRAGMA 且易踩坑），
--      故只加纯列；文档移出/文件夹软删由应用层显式 UPDATE folder_id=NULL，
--      不依赖 PRAGMA foreign_keys（决策见 HANDOFF §七-2 与 M3 评审补强 ①）
--   c. 建索引：folders.project_id（按项目筛选）+ folders.deleted_at（软删过滤）
--      + documents.folder_id（按文件夹查文档）
--
-- 幂等论证：a/c 用 IF NOT EXISTS；b 的 ADD COLUMN 重复跑 → duplicate column name
--   被 MigrationRunner 判为良性错误跳过。

-- a. 文件夹表
CREATE TABLE IF NOT EXISTS knowledge_folders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    english_name TEXT,
    project_id  INTEGER,                -- 可空 = 跨项目通用资料
    category    TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  TEXT NOT NULL,          -- 与 knowledge_documents.created_by 一致 TEXT
    deleted_at  TEXT                    -- 软删标记（DELETE 端点只置此列）
);

-- b. 文档表挂文件夹（可空；历史文档无文件夹）
ALTER TABLE knowledge_documents ADD COLUMN folder_id INTEGER;

-- c. 索引
CREATE INDEX IF NOT EXISTS idx_knowledge_folders_project ON knowledge_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_folders_deleted ON knowledge_folders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_folder ON knowledge_documents(folder_id);
