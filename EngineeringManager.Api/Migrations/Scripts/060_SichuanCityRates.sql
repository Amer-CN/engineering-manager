-- ============================================================
-- 060: 个税引擎 Wave-T2（四川主力市场种子：省行 + 成都行）
-- 背景：T1 四城（059）后补四川；独立迁移，不碰 059 与四城种子行。
-- 列语义注（SQLite 无 COMMENT ON，记于此）：
--   wage_tax_ledger.paid_tax_fen 存本期预扣额（可负=应退走汇算）；
--   SUM(paid_tax_fen) 即累计已缴（与 WageTaxEndpoints priorPaid 口径一致）。
-- 幂等：INSERT OR IGNORE 按主键 city_code，重跑不覆盖手工改价。
-- 表名 [] 包裹；金额列 INTEGER（分）；费率列 REAL（小数）。
-- 未确认/浮动项一律存 NULL，理由写对应 note（GS04：禁默认值兜底，
--   省行公积金四列 NULL → 用省行 calc-tax 会报缺项 housing_min_rate，须用城市行）。
-- ============================================================

-- 四川省行（status 转载；社保年度=自然年度；社保基数2026-09-07发布）
INSERT OR IGNORE INTO [city_insurance_rates]
    ([city_code], [city_name], [pension_corp], [pension_personal], [medical_corp], [medical_personal],
     [unemp_corp], [unemp_personal], [injury_corp], [injury_personal], [maternity_corp],
     [injury_note], [maternity_note],
     [base_min_fen], [base_max_fen], [medical_base_min_fen], [medical_base_max_fen],
     [unemp_base_min_fen], [unemp_base_max_fen],
     [housing_min_rate], [housing_max_rate], [housing_base_min_fen], [housing_base_max_fen],
     [effective_year], [source_note], [status])
VALUES
    ('sichuan', '四川', 0.16, 0.08, 0.083, 0.02,
     0.006, 0.004, NULL, NULL, NULL,
     '0.24%~2.28%八档浮动2026-07-01起，个人不缴；工程项目按合同总造价0.15%一次性，另分支',
     '已并入医保',
     469900, 2349300, NULL, NULL,
     NULL, NULL,
     NULL, NULL, NULL, NULL,
     '2026', '社保年度=自然年度；社保基数2026-09-07发布；养老0.16/0.08（转载）、医疗0.083/0.02（转载）、失业0.006/0.004（转载）；工伤浮动见injury_note（转载）；生育见maternity_note（转载）；医保/失业基数与社保同故存NULL；公积金分中心制，省行四列置NULL按城市行（转载）', '转载');

-- 成都行（status 转载；社保沿用省值；公积金自2026-01-01适用）
INSERT OR IGNORE INTO [city_insurance_rates]
    ([city_code], [city_name], [pension_corp], [pension_personal], [medical_corp], [medical_personal],
     [unemp_corp], [unemp_personal], [injury_corp], [injury_personal], [maternity_corp],
     [injury_note], [maternity_note],
     [base_min_fen], [base_max_fen], [medical_base_min_fen], [medical_base_max_fen],
     [unemp_base_min_fen], [unemp_base_max_fen],
     [housing_min_rate], [housing_max_rate], [housing_base_min_fen], [housing_base_max_fen],
     [effective_year], [source_note], [status])
VALUES
    ('chengdu', '成都', 0.16, 0.08, 0.083, 0.02,
     0.006, 0.004, NULL, NULL, NULL,
     '0.24%~2.28%八档浮动2026-07-01起，个人不缴；工程项目按合同总造价0.15%一次性，另分支',
     '已并入医保',
     469900, 2349300, NULL, NULL,
     NULL, NULL,
     0.05, 0.12, 220000, 3296900,
     '2026', '社保沿用省值（转载）；医保/失业基数与社保同故存NULL；医保执行：2025口径自2025-10-01且不补差，2026执行通知截至2026-09-17未见（转载）；公积金自2026-01-01适用，下限取县市新城2200与新区2330中小值，适用分区见成都公积金中心通告（转载）', '转载');
