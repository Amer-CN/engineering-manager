-- ============================================================
-- 063: 税率主数据（带生效期）+ 税率规则（P1 / T1）
-- 背景：前端 src/components/features/invoices/constants.ts 把 6 档税率写死在
--   下拉里，无法按业务维度（业务类型/对方纳税人类别/项目类别）取默认，也无法
--   表达「同一 code 不同生效期」。本迁移落两张主数据表，默认税率解析改走服务端
--   （TaxEndpoints.cs）。金蝶口径：BD_TaxRate（FEFFECTIVEDATE/FEXPIRYDATE）
--   + 规则引擎（BD_TAXRULE/BD_TAXRULECONDITION，同级取 StartDate 最新）。
--
-- 列语义注（SQLite 无 COMMENT ON，记于此）：
--   tax_rates.rate          税率小数（REAL，非金额，不受「金额一律 INTEGER 分」约束）
--   tax_rates.effective_from/to  生效区间 YYYY-MM-DD；to 为 NULL = 无失效日
--   tax_rates.code          税目编码，与 effective_from 组成唯一键
--   tax_rates.is_default    1 = 全局兜底默认（规则不命中时使用）
--   tax_rules.tax_rate_id   外键 → tax_rates.id
--   tax_rules.priority      同维度数下的大者优先；再同级取 id 大者
--
-- 法律口径：docs/finance-knowledge FP07（增值税法第十/十一条）。
--   本迁移【不新增任何税率数值来源】：6 档与 constants.ts 的
--   taxRateOptions 完全一致（0 / 0.01 / 0.03 / 0.06 / 0.09 / 0.13）。
--
-- 幂等：CREATE TABLE/INDEX IF NOT EXISTS；种子 INSERT OR IGNORE（唯一键
--   code+effective_from 冲突即跳过，重跑不重复、不覆盖手工改价）。
--   末尾 UPDATE 把 is_default 重新钉到 rate=0 行，保证重复执行后仍恰好一档默认
--   （只收敛 is_default 标志，不改税率数值）。
-- 表名与列名 [] 包裹（项目红线）；无金额列。
-- ============================================================

CREATE TABLE IF NOT EXISTS [tax_rates] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [code] TEXT NOT NULL,
  [name] TEXT NOT NULL,
  [rate] REAL NOT NULL,
  [category] TEXT,
  [effective_from] TEXT NOT NULL,
  [effective_to] TEXT,
  [is_default] INTEGER NOT NULL DEFAULT 0,
  [source_note] TEXT,
  [created_at] TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS [ux_tax_rates_code_from]
  ON [tax_rates]([code], [effective_from]);

CREATE TABLE IF NOT EXISTS [tax_rules] (
  [id] INTEGER PRIMARY KEY AUTOINCREMENT,
  [business_type] TEXT,
  [partner_tax_type] TEXT,
  [item_category] TEXT,
  [tax_rate_id] INTEGER NOT NULL,
  [priority] INTEGER NOT NULL DEFAULT 0,
  [enabled] INTEGER NOT NULL DEFAULT 1,
  [created_at] TEXT DEFAULT (datetime('now')),
  FOREIGN KEY ([tax_rate_id]) REFERENCES [tax_rates]([id])
);

CREATE INDEX IF NOT EXISTS [idx_tax_rules_enabled]
  ON [tax_rules]([enabled], [business_type], [partner_tax_type], [item_category]);

-- 种子：6 档（与 constants.ts taxRateOptions 一一对应），统一自 2026-01-01 生效。
-- 0% 行为全局默认；1% 为阶段性优惠，源注记 FP07 已标注需复核。
INSERT OR IGNORE INTO [tax_rates]
  ([code], [name], [rate], [category], [effective_from], [effective_to], [is_default], [source_note])
VALUES
  ('VAT0',   '不征税', 0,    'zero',      '2026-01-01', NULL, 1, 'FP07 增值税法第十/十一条；0.01 为阶段性优惠，需复核'),
  ('VAT1',   '1%',     0.01, 'levy',      '2026-01-01', NULL, 0, 'FP07 增值税法第十/十一条；0.01 为阶段性优惠，需复核'),
  ('VAT3',   '3%',     0.03, 'levy',      '2026-01-01', NULL, 0, 'FP07 增值税法第十/十一条；0.01 为阶段性优惠，需复核'),
  ('VAT6',   '6%',     0.06, 'general',   '2026-01-01', NULL, 0, 'FP07 增值税法第十/十一条；0.01 为阶段性优惠，需复核'),
  ('VAT9',   '9%',     0.09, 'general',   '2026-01-01', NULL, 0, 'FP07 增值税法第十/十一条；0.01 为阶段性优惠，需复核'),
  ('VAT13',  '13%',    0.13, 'general',   '2026-01-01', NULL, 0, 'FP07 增值税法第十/十一条；0.01 为阶段性优惠，需复核');

-- 兜底不变式：恰好 rate=0 那一档为默认（重复执行结果一致）。
-- 注：本句【只收敛 is_default 标志】，把重复执行/手工改动造成的默认档漂移拉回 rate=0 行；
--     【不改任何税率数值】—— rate/name/code/生效期一律不动（种子用 INSERT OR IGNORE，
--     既有的数值行不会被本迁移覆盖）。若将来需要增删档位或调价，另开新迁移，勿改本句。
UPDATE [tax_rates] SET [is_default] = CASE WHEN [rate] = 0 THEN 1 ELSE 0 END;
