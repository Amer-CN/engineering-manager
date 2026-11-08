-- ============================================================
-- 059: 个税引擎 Wave-T1（wage_tax_ledger + city_insurance_rates，四城种子）
-- 背景：累计预扣 + 专项扣除 + 年终奖择优 + 城市费率表（后端闭环，T2前纯后端）。
--   · wages是按项目按月行，累计是按人按年态，粒度不同 → 新表 wage_tax_ledger
--     按 (person_key, year_month) 存累计态，不扩展 generate。
--   · 城市表一行一城，年度错位用行note说明，不做多年度版本。
-- 口径（单位：分 INTEGER；费率：小数；API契约恒为元，换算只走 MoneyUnit）：
--   · GS01 个人所得税法（2018修正）：年度7级 (3600000,3%,0)…(∞,45%,18192000)
--   · GS03 国税发〔2005〕9号方法 + 财税〔2018〕164号 + 2023年30号（执行至2027-12-31，
--     引用必带30号）：bonus/12查月度表，税=bonus×rate−速算扣除
--   · GS02 国发〔2018〕41号 + 国发〔2023〕13号：7分项默认值见 TaxCalculationService；
--     婴幼儿项来源注"国发〔2023〕13号，设立文号待复核"
--   · GS04 设计红线：无城市配置拒绝计算，禁默认值兜底；未知项存NULL
-- 幂等：CREATE TABLE/INDEX 用 IF NOT EXISTS；ALTER 重复跑 → duplicate column
--   name 被 MigrationRunner 良性吞掉；种子行 INSERT OR IGNORE 按主键（city_code），
--   重跑不覆盖手工改价。
-- 表名 [] 包裹（项目红线）；金额列 INTEGER（分，红线1）；费率列 REAL（小数，非金额）。
-- 扩展列说明：injury_corp/personal、maternity_corp、medical/unemp独立基数列为
--   "未知项NULL列"——浮动费率/并入医保/未确认基数一律存NULL，理由写对应note。
-- ============================================================

CREATE TABLE IF NOT EXISTS [wage_tax_ledger] (
    [id] INTEGER PRIMARY KEY AUTOINCREMENT,
    [person_key] TEXT NOT NULL,
    [tax_year] TEXT NOT NULL,
    [year_month] TEXT NOT NULL,
    [gross_fen] INTEGER NOT NULL DEFAULT 0,
    [social_fen] INTEGER NOT NULL DEFAULT 0,
    [housing_fen] INTEGER NOT NULL DEFAULT 0,
    [extra_1] INTEGER NOT NULL DEFAULT 0,
    [extra_2] INTEGER NOT NULL DEFAULT 0,
    [extra_3] INTEGER NOT NULL DEFAULT 0,
    [extra_4] INTEGER NOT NULL DEFAULT 0,
    [extra_5] INTEGER NOT NULL DEFAULT 0,
    [extra_6] INTEGER NOT NULL DEFAULT 0,
    [extra_7] INTEGER NOT NULL DEFAULT 0,
    [extra_total_fen] INTEGER NOT NULL DEFAULT 0,
    [extra_json] TEXT,
    [threshold_fen] INTEGER NOT NULL DEFAULT 500000,
    [cum_taxable_fen] INTEGER NOT NULL DEFAULT 0,
    [cum_tax_fen] INTEGER NOT NULL DEFAULT 0,
    [paid_tax_fen] INTEGER NOT NULL DEFAULT 0,
    [bonus_mode] TEXT,
    [bonus_fen] INTEGER NOT NULL DEFAULT 0,
    [city_code] TEXT,
    [created_by] TEXT,
    [created_at] TEXT,
    [updated_at] TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS [ux_ledger_person_month] ON [wage_tax_ledger]([person_key], [year_month]);
CREATE INDEX IF NOT EXISTS [idx_ledger_person_year] ON [wage_tax_ledger]([person_key], [tax_year]);

CREATE TABLE IF NOT EXISTS [city_insurance_rates] (
    [city_code] TEXT PRIMARY KEY,
    [city_name] TEXT NOT NULL,
    [pension_corp] REAL,
    [pension_personal] REAL,
    [medical_corp] REAL,
    [medical_personal] REAL,
    [unemp_corp] REAL,
    [unemp_personal] REAL,
    [injury_corp] REAL,
    [injury_personal] REAL,
    [maternity_corp] REAL,
    [injury_note] TEXT,
    [maternity_note] TEXT,
    [base_min_fen] INTEGER,
    [base_max_fen] INTEGER,
    [medical_base_min_fen] INTEGER,
    [medical_base_max_fen] INTEGER,
    [unemp_base_min_fen] INTEGER,
    [unemp_base_max_fen] INTEGER,
    [housing_min_rate] REAL,
    [housing_max_rate] REAL,
    [housing_base_min_fen] INTEGER,
    [housing_base_max_fen] INTEGER,
    [effective_year] TEXT,
    [source_note] TEXT,
    [status] TEXT
);

-- 北京（社保/公积金2026年度2026-07~2027-06；status official）
INSERT OR IGNORE INTO [city_insurance_rates]
    ([city_code], [city_name], [pension_corp], [pension_personal], [medical_corp], [medical_personal],
     [unemp_corp], [unemp_personal], [injury_corp], [injury_personal], [maternity_corp],
     [injury_note], [maternity_note],
     [base_min_fen], [base_max_fen], [medical_base_min_fen], [medical_base_max_fen],
     [unemp_base_min_fen], [unemp_base_max_fen],
     [housing_min_rate], [housing_max_rate], [housing_base_min_fen], [housing_base_max_fen],
     [effective_year], [source_note], [status])
VALUES
    ('beijing', '北京', 0.16, 0.08, 0.098, 0.02,
     0.005, 0.005, NULL, NULL, NULL,
     '0.2%-1.9%八档浮动，个人不缴', '并入医保',
     727000, 3634800, NULL, NULL,
     NULL, NULL,
     0.05, 0.12, 254000, 3634800,
     '2026', '社保/公积金2026年度2026-07~2027-06；医疗个人另+3元/月；医保/失业基数与社保同故存NULL；年度错位无（单年度行）', 'official');

-- 上海（2026年度；公积金上下限转载待换文号，其余official → 行status转载）
INSERT OR IGNORE INTO [city_insurance_rates]
    ([city_code], [city_name], [pension_corp], [pension_personal], [medical_corp], [medical_personal],
     [unemp_corp], [unemp_personal], [injury_corp], [injury_personal], [maternity_corp],
     [injury_note], [maternity_note],
     [base_min_fen], [base_max_fen], [medical_base_min_fen], [medical_base_max_fen],
     [unemp_base_min_fen], [unemp_base_max_fen],
     [housing_min_rate], [housing_max_rate], [housing_base_min_fen], [housing_base_max_fen],
     [effective_year], [source_note], [status])
VALUES
    ('shanghai', '上海', 0.16, 0.08, 0.09, 0.02,
     0.005, 0.005, NULL, NULL, NULL,
     '0.2%-1.9%八档浮动，个人不缴', '并入医保',
     754600, 3773100, NULL, NULL,
     NULL, NULL,
     0.05, 0.07, 274000, 3773100,
     '2026', '2026年度；公积金0.05/0.07（note补充：补充公积金最高1%-5%另计；上下限转载待换文号）；医保/失业基数与社保同故存NULL', '转载');

-- 广州（社保2025年度2025-07~2026-06；医保2026自然年；公积金2025年度；三轨年份见note；status待核实）
INSERT OR IGNORE INTO [city_insurance_rates]
    ([city_code], [city_name], [pension_corp], [pension_personal], [medical_corp], [medical_personal],
     [unemp_corp], [unemp_personal], [injury_corp], [injury_personal], [maternity_corp],
     [injury_note], [maternity_note],
     [base_min_fen], [base_max_fen], [medical_base_min_fen], [medical_base_max_fen],
     [unemp_base_min_fen], [unemp_base_max_fen],
     [housing_min_rate], [housing_max_rate], [housing_base_min_fen], [housing_base_max_fen],
     [effective_year], [source_note], [status])
VALUES
    ('guangzhou', '广州', 0.16, 0.08, 0.06, 0.02,
     0.08, 0.002, NULL, NULL, NULL,
     '0.2%-1.4%八档浮动', '并入医保',
     551000, 2754900, 623400, 3117000,
     NULL, NULL,
     0.05, 0.12, 250000, 3982800,
     '2025', '三轨年份：社保2025年度2025-07~2026-06；医保2026自然年（基数623400/3117000）；公积金2025年度（个人≥单位）；失业省政策延至2025-12-31、2026年未确认；失业/工伤基数传41112/2500未确认故存NULL；年度错位见本note，不做多年度版本', '待核实');

-- 深圳（社保2025年度；医保2026自然年；公积金2025年度数字+2026转载值；status待核实）
INSERT OR IGNORE INTO [city_insurance_rates]
    ([city_code], [city_name], [pension_corp], [pension_personal], [medical_corp], [medical_personal],
     [unemp_corp], [unemp_personal], [injury_corp], [injury_personal], [maternity_corp],
     [injury_note], [maternity_note],
     [base_min_fen], [base_max_fen], [medical_base_min_fen], [medical_base_max_fen],
     [unemp_base_min_fen], [unemp_base_max_fen],
     [housing_min_rate], [housing_max_rate], [housing_base_min_fen], [housing_base_max_fen],
     [effective_year], [source_note], [status])
VALUES
    ('shenzhen', '深圳', 0.16, 0.08, 0.06, 0.02,
     0.08, 0.002, NULL, NULL, NULL,
     '0.2%-1.4%八档浮动', '0.005之说待核实',
     477500, 2754900, 672700, 3363300,
     NULL, NULL,
     0.05, 0.12, 252000, 4426500,
     '2025', '社保2025年度（养老深户+1%地补待核实）；医保2026自然年（一档0.06/0.02为主，二档0.015/0.005见note，档位规则：深户强制一档）；失业2026年0.07/0.003之说未确认+省政策只到2025-12-31；工伤同广州轨；生育0.005未确认故存NULL；公积金2025值（2026上限48471未确认）；失业/工伤基数未确认故存NULL', '待核实');
