-- v0.74.0: 修复 partners 表缺 tax_number 列 (post/put/PATCH 一直 500)
-- 背景: 001_InitialSchema.sql L167 CREATE TABLE partners 没建 tax_number 列,
--       但 PartnerEndpoints.cs L50 POST /api/partners 已引用 tax_number 列,
--       Dapper 报 "no such column: tax_number" -> 500.
-- 之前一直没暴露: 前端通常走 GET /api/partners?projectId=... 不直接 POST.
-- 与 PartnerEndpoints.cs POST/PUT 已使用的列对齐 (@TaxNumber -> tax_number)
-- 与 011_AddPiiEncryptionColumns.sql 的 tax_number_enc 列对齐 (双写: 明文 + 密文)

ALTER TABLE partners ADD COLUMN tax_number TEXT DEFAULT '';
