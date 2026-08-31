-- 047: 台账 Excel 边界（spec 2026-08-29）——字段补齐 + 考勤手动修改标记
ALTER TABLE attendances ADD COLUMN manually_edited INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_workers ADD COLUMN contract_signer TEXT;
ALTER TABLE project_workers ADD COLUMN contract_start TEXT;
ALTER TABLE project_workers ADD COLUMN contract_end TEXT;
ALTER TABLE project_workers ADD COLUMN safety_training INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_workers ADD COLUMN work_section TEXT;
ALTER TABLE project_workers ADD COLUMN exit_date TEXT;
ALTER TABLE workers ADD COLUMN current_address TEXT;
ALTER TABLE workers ADD COLUMN current_address_enc TEXT;
ALTER TABLE wages ADD COLUMN paid_channel TEXT;
