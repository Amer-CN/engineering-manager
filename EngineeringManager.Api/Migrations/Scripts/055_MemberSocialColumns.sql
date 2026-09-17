-- ============================================================
-- 055: members 社保字段补列（记录型止血：先加列存数）
-- 背景：StaffForm 收 socialSecurityPersonal / socialSecurityCompany /
-- housingFund / housingFundPersonal / companyCoversSocial 共 5 字段，
-- 但 MemberDto 无属性、members 表无列 → 填了存不住，详情页恒显示 ¥0。
-- 决策备忘录 .work/decisions/社保功能取舍.md：先加列存数止血，
-- 城市费率计算引擎暂缓（本脚本不建费率表、不做任何计算）。
-- 单位契约（分制）：4 金额列 INTEGER（分），读写走 MoneyUnit 单点；
-- 开关列 INTEGER 0/1（NULL 透传不断言）。
-- 幂等：ALTER ADD COLUMN 重复跑 → duplicate column name 被 MigrationRunner 良性吞掉。
-- ============================================================

ALTER TABLE [members] ADD COLUMN [social_security_personal] INTEGER;
ALTER TABLE [members] ADD COLUMN [social_security_company] INTEGER;
ALTER TABLE [members] ADD COLUMN [housing_fund] INTEGER;
ALTER TABLE [members] ADD COLUMN [housing_fund_personal] INTEGER;
ALTER TABLE [members] ADD COLUMN [company_covers_social] INTEGER DEFAULT 0;
