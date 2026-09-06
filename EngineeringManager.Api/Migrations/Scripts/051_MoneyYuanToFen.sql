-- ═══════════════════════════════════════════════════════════════
-- 051_MoneyYuanToFen — 金额分制贯彻：历史元数据一次性 ×100 转换
--
-- 契约终点（2026-09 用户拍板）：全库金额列 = 分（整数值），API = 元，
-- 换算只允许 MoneyUnit.ToFen / ToYuan 单点。本迁移执行时（启动早期、
-- 端点监听之前）所有库中的数据均为旧代码写入的「元」，此后新代码
-- 写入即「分」——执行时序保证不存在二次转换窗口。
--
-- 防丢分：ROUND(x*100) 而非 CAST 截断（003 的 CAST 教训，审计 D-13：
-- 0.29*100=28.999… CAST→28 丢 1 分；ROUND→29）。
--
-- 守卫：wages 表用日薪量级判别（真实日薪 100~2000 元，
-- ToFen 分制日薪 10000+；阈值 5000 两侧不交集）——保护升级前用旧版
-- （v0.93+ 含 ToFen）录工资产生的分制行不被二次 ×100。
--
-- 豁免（非金额列，严禁出现在本迁移）：invoices.tax_rate（税率）、
-- wages.work_days / attendances.work_days（天数）、各类数量列、
-- snapshots.size（字节）、JSON 块（invoice_details / items / files——
-- 前端直读块恒为元，契约见 MoneyUnit）。
--
-- wage_history 不在本迁移内：生产库为旧 schema（daily_wage REAL 元值
-- 28 行）与 014 产物列（base_daily_wage/actual_wage/paid_amount）不
-- 相交，无法安全覆盖；其 28 行保持元值，读出端点（休眠）直读直出自洽。
--
-- payment_invoices / settlement_invoices 不在本迁移内：生产库无此二表
-- （005 回填未实跑），全新库中恒空且全后端零读写路径。
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS [app_meta] ([key] TEXT PRIMARY KEY, [value] TEXT NOT NULL);

-- projects.budget
UPDATE [projects] SET [budget] = CAST(ROUND([budget] * 100) AS INTEGER);

-- members
UPDATE [members] SET [base_salary] = CAST(ROUND([base_salary] * 100) AS INTEGER), [daily_wage] = CAST(ROUND([daily_wage] * 100) AS INTEGER);

-- workers
UPDATE [workers] SET [daily_wage] = CAST(ROUND([daily_wage] * 100) AS INTEGER);

-- project_workers
UPDATE [project_workers] SET [daily_wage] = CAST(ROUND([daily_wage] * 100) AS INTEGER);

-- contracts ×3
UPDATE [income_contracts] SET [amount] = CAST(ROUND([amount] * 100) AS INTEGER);
UPDATE [expense_contracts] SET [amount] = CAST(ROUND([amount] * 100) AS INTEGER);
UPDATE [agreement_contracts] SET [amount] = CAST(ROUND([amount] * 100) AS INTEGER);

-- invoices（tax_rate 税率不动）
UPDATE [invoices] SET [amount] = CAST(ROUND([amount] * 100) AS INTEGER), [price_amount] = CAST(ROUND([price_amount] * 100) AS INTEGER), [tax_amount] = CAST(ROUND([tax_amount] * 100) AS INTEGER), [received_amount] = CAST(ROUND([received_amount] * 100) AS INTEGER);

-- payment_records
UPDATE [payment_records] SET [amount] = CAST(ROUND([amount] * 100) AS INTEGER);

-- settlements
UPDATE [settlements] SET [amount] = CAST(ROUND([amount] * 100) AS INTEGER);

-- cost_ledger
UPDATE [cost_ledger] SET [amount] = CAST(ROUND([amount] * 100) AS INTEGER);

-- inventory
UPDATE [inventory_items] SET [purchase_price] = CAST(ROUND([purchase_price] * 100) AS INTEGER), [sale_price] = CAST(ROUND([sale_price] * 100) AS INTEGER);
UPDATE [inventory_transactions] SET [total_amount] = CAST(ROUND([total_amount] * 100) AS INTEGER), [unit_price] = CAST(ROUND([unit_price] * 100) AS INTEGER);
UPDATE [materials] SET [price] = CAST(ROUND([price] * 100) AS INTEGER);

-- salary_history
UPDATE [salary_history] SET [base_salary] = CAST(ROUND([base_salary] * 100) AS INTEGER), [subsidy] = CAST(ROUND([subsidy] * 100) AS INTEGER);

-- wages（带日薪守卫：分制行 > 5000 跳过）
UPDATE [wages] SET [daily_wage] = CAST(ROUND([daily_wage] * 100) AS INTEGER), [bonus] = CAST(ROUND([bonus] * 100) AS INTEGER), [deduction] = CAST(ROUND([deduction] * 100) AS INTEGER), [actual_wage] = CAST(ROUND([actual_wage] * 100) AS INTEGER), [paid_amount] = CAST(ROUND([paid_amount] * 100) AS INTEGER) WHERE [daily_wage] IS NULL OR [daily_wage] <= 5000;

-- 标记（审计追踪：确认转换已执行及时间）
INSERT OR REPLACE INTO [app_meta] ([key], [value]) VALUES ('money_unit', 'fen-051');
INSERT OR REPLACE INTO [app_meta] ([key], [value]) VALUES ('money_unit_converted_at', datetime('now', 'localtime'));
