-- ============================================================
-- 050: 写作中心双写 content_html（全链路样式保留）
-- 阶段 0 probe 结论：@tiptap/markdown 3.31.3 序列化对 inline style 静默丢弃，
--   颜色/字号/字体/高亮/对齐等样式唯一载体是 editor.getHTML()。
-- writing_documents / writing_document_versions 各加 content_html 列：
--   保存时与 content_md 同进同出（端点白名单同步放开），
--   加载/预览/导出优先用 HTML，为空回退 markdown（老文档 + AI 初稿不变）。
-- NOT NULL DEFAULT ''：存量行自动补空串，读取端按「空 = 无样式，走 markdown 回退」。
-- ============================================================

ALTER TABLE [writing_documents] ADD COLUMN content_html TEXT NOT NULL DEFAULT '';
ALTER TABLE [writing_document_versions] ADD COLUMN content_html TEXT NOT NULL DEFAULT '';
