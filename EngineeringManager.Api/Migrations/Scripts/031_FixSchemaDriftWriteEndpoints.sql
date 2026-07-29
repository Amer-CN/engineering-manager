-- v0.85.x (M-REVIEW1 延伸): 修复 4 张表的建表漂移 —— 端点 INSERT/UPDATE 引用的列在
-- 001_InitialSchema.sql 建表语句中缺失, 导致 POST/PUT 缺参 500 "no such column"。
-- 这批端点 (templates/settlements/drawings/inventory_transactions + payment_records/expenses 的
-- 同步列) 历史上因 dynamic dto 缺参已必 500, 本次改强类型 DTO 后暴露了更深一层的列漂移。
-- MigrationRunner 幂等执行 (吞"列已存在"错误), 与 009/014/024 已补过的列不冲突。

-- settlements: 端点引用 contract_id/type/sub_type/settlement_no/settlement_date/remarks/items 但 001 未建
ALTER TABLE settlements ADD COLUMN contract_id INTEGER;
ALTER TABLE settlements ADD COLUMN type TEXT;
ALTER TABLE settlements ADD COLUMN sub_type TEXT;
ALTER TABLE settlements ADD COLUMN settlement_no TEXT;
ALTER TABLE settlements ADD COLUMN settlement_date TEXT;
ALTER TABLE settlements ADD COLUMN remarks TEXT;
ALTER TABLE settlements ADD COLUMN items TEXT;
ALTER TABLE settlements ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE settlements ADD COLUMN last_modified_at TEXT;

-- templates: 端点引用 description/file_name/stored_file_name/file_type 但 001 未建
ALTER TABLE templates ADD COLUMN description TEXT;
ALTER TABLE templates ADD COLUMN file_name TEXT;
ALTER TABLE templates ADD COLUMN stored_file_name TEXT;
ALTER TABLE templates ADD COLUMN file_type TEXT;
ALTER TABLE templates ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE templates ADD COLUMN last_modified_at TEXT;

-- drawings: 端点/前端契约(Drawing type)用 category/file_path/position/remarks，但 001 建表用的是
-- file_url/file_name/remark(单数) 一套死 schema。补规范列使全新库与真库(file_path/category/position/remarks)趋同。
ALTER TABLE drawings ADD COLUMN category TEXT;
ALTER TABLE drawings ADD COLUMN file_path TEXT;
ALTER TABLE drawings ADD COLUMN position TEXT;
ALTER TABLE drawings ADD COLUMN remarks TEXT;
ALTER TABLE drawings ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE drawings ADD COLUMN last_modified_at TEXT;

-- inventory_transactions: 端点/前端契约用 transaction_date/unit_price/total_amount/counterparty_id/document_no/remarks，
-- 但 001 建表用 date/remark 一套死 schema。补规范列与真库趋同。
ALTER TABLE inventory_transactions ADD COLUMN unit_price REAL;
ALTER TABLE inventory_transactions ADD COLUMN total_amount REAL;
ALTER TABLE inventory_transactions ADD COLUMN contract_id INTEGER;
ALTER TABLE inventory_transactions ADD COLUMN counterparty_id INTEGER;
ALTER TABLE inventory_transactions ADD COLUMN transaction_date TEXT;
ALTER TABLE inventory_transactions ADD COLUMN document_no TEXT;
ALTER TABLE inventory_transactions ADD COLUMN remarks TEXT;

-- payment_records/expenses: PUT 引用 version+1/last_modified_at
ALTER TABLE payment_records ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE payment_records ADD COLUMN last_modified_at TEXT;
ALTER TABLE expenses ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE expenses ADD COLUMN last_modified_at TEXT;

-- inventory_items: 端点/前端契约(InventoryItem type)用 code/specifications/purchase_price/sale_price/
-- current_stock/min_stock/max_stock/supplier_id/remarks，但 001 建表用 quantity/min_quantity/location/notes 死 schema。补规范列与真库趋同。
ALTER TABLE inventory_items ADD COLUMN code TEXT;
ALTER TABLE inventory_items ADD COLUMN specifications TEXT;
ALTER TABLE inventory_items ADD COLUMN purchase_price REAL;
ALTER TABLE inventory_items ADD COLUMN sale_price REAL;
ALTER TABLE inventory_items ADD COLUMN current_stock REAL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN min_stock REAL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN max_stock REAL;
ALTER TABLE inventory_items ADD COLUMN supplier_id INTEGER;
ALTER TABLE inventory_items ADD COLUMN remarks TEXT;

-- materials: 端点/前端契约(Material type)用 project_id/quantity/price，但 001 建表用 specifications/supplier/notes 死 schema。
ALTER TABLE materials ADD COLUMN project_id INTEGER;
ALTER TABLE materials ADD COLUMN quantity REAL DEFAULT 0;
ALTER TABLE materials ADD COLUMN price REAL DEFAULT 0;

-- cost_ledger_categories: 端点/前端契约(CostLedgerCategory type)用 label，但 001 建表用 name 死 schema。补 label 与真库趋同。
ALTER TABLE cost_ledger_categories ADD COLUMN label TEXT;
