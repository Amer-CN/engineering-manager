using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;

namespace EngineeringManager.Api;

// ============================================================
// 个税引擎 Wave-T1 端点（纯后端，T2前无前端）：
//   POST /api/wages/calc-tax    试算纯读（不写库）
//   POST /api/wages/confirm-tax 落库（wage_tax_ledger upsert）
// 单位契约：库内一律分（INTEGER），API一律元；换算只走 MoneyUnit 单点，
//   禁止散写 ×100 / ÷100（含 SQL 表达式）。
// 口径见 Services/TaxCalculationService.cs（GS01/GS02/GS03文号注）。
// 鉴权/限流/user-dim照WageEndpoints同模板：GlobalAuth默认鉴权（不得加白），
//   calc-tax要求wages:read，confirm-tax要求wages:update；写侧RowWriteGate +
//   同事务audit（照PUT/batch-save），已发款/归档行409只读拒绝。
// ============================================================

public static class WageTaxEndpoints
{
    public static void RegisterWageTaxEndpoints(this WebApplication app)
    {
        var now = () => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        // POST /api/wages/calc-tax — 试算纯读，一行不写
        app.MapPost("/api/wages/calc-tax", (HttpContext ctx, WageTaxRequest dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "wages:read")) return Results.Forbid();
            var (ok, err, calc) = TryCalc(ctx, db, dto);
            if (!ok) return Results.BadRequest(new { success = false, error = err });
            return Common.Ok(calc!.Response);
        });

        // POST /api/wages/confirm-tax — 落库（upsert wage_tax_ledger）
        app.MapPost("/api/wages/confirm-tax", async (HttpContext ctx, WageTaxRequest dto, IDbConnection db) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            // G2 B2：个税落库是工资写操作 → wages:update
            if (!CurrentUser.HasPermission(ctx, db, "wages:update")) return Results.Forbid();
            var (ok, err, calc) = TryCalc(ctx, db, dto);
            if (!ok) return Results.BadRequest(new { success = false, error = err });
            var c = calc!;

            // 锁最先：该人员当月工资行已发款/已归档 → 409（admin/授权也不例外，照PUT语义）
            var wageRows = QueryWageRows(db, dto);
            foreach (var r in wageRows)
            {
                var paid = Convert.ToInt64(r.paid ?? 0);
                var locked = Convert.ToInt64(r.locked ?? 0);
                if (paid != 0 || locked != 0)
                    return Results.Json(new { success = false, error = "该人员当月工资行已发款或已归档，个税落库不可再写（归档请先解锁）" }, statusCode: 409);
            }

            // 项目级写入门（照batch-save G76）：有工资行时，distinct project须全部可写
            var projectIds = wageRows
                .Select(r => (long?)Convert.ToInt64(r.project_id ?? 0))
                .Where(p => p.HasValue && p.Value != 0)
                .Select(p => p!.Value)
                .Distinct()
                .ToList();
            foreach (var pid in projectIds)
                if (!CurrentUser.CanWriteProject(ctx, db, pid)) return Results.Forbid();

            // 归属裁决：既有ledger行 → Classify；新建 → 创建分支无audit（照batch-save）
            var existing = db.QueryFirstOrDefault(
                "SELECT [id], [created_by] FROM [wage_tax_ledger] WHERE [person_key]=@K AND [year_month]=@YM",
                new { K = c.PersonKey, YM = c.YearMonth });
            string? ledgerCreatedBy = existing?.created_by as string;
            long? gateProjectId = projectIds.Count > 0 ? projectIds[0] : null;
            var access = RowWriteOutcome.AllowedOwn;
            if (existing != null)
            {
                access = RowWriteGate.Classify(ctx, db, ledgerCreatedBy, gateProjectId);
                if (access == RowWriteOutcome.Denied) return Results.Forbid();
            }

            using var tx = db.BeginTransaction();
            long ledgerId;
            if (existing != null)
            {
                await db.ExecuteAsync(@"UPDATE [wage_tax_ledger] SET
                        [gross_fen]=@Gross, [social_fen]=@Social, [housing_fen]=@Housing,
                        [extra_1]=@E1, [extra_2]=@E2, [extra_3]=@E3, [extra_4]=@E4,
                        [extra_5]=@E5, [extra_6]=@E6, [extra_7]=@E7,
                        [extra_total_fen]=@ETotal, [extra_json]=@EJson,
                        [threshold_fen]=@Threshold,
                        [cum_taxable_fen]=@CumTaxable, [cum_tax_fen]=@CumTax,
                        [paid_tax_fen]=@Paid, [bonus_mode]=@BMode, [bonus_fen]=@BFen,
                        [city_code]=@City, [updated_at]=@Now
                    WHERE [person_key]=@K AND [year_month]=@YM",
                    new
                    {
                        Gross = c.GrossFen,
                        Social = c.SocialFen,
                        Housing = c.HousingFen,
                        E1 = c.Extra1Fen,
                        E2 = c.Extra2Fen,
                        E3 = c.Extra3Fen,
                        E4 = c.Extra4Fen,
                        E5 = c.Extra5Fen,
                        E6 = c.Extra6Fen,
                        E7 = c.Extra7Fen,
                        ETotal = c.ExtraTotalFen,
                        EJson = c.ExtraJson,
                        Threshold = TaxCalculationService.ThresholdMonthlyFen,
                        CumTaxable = c.CumTaxableFen,
                        CumTax = c.CumTaxFen,
                        Paid = c.CurrentWithholdingFen,
                        BMode = c.BonusRecommended,
                        BFen = c.BonusFen,
                        City = dto.CityCode,
                        Now = now(),
                        K = c.PersonKey,
                        YM = c.YearMonth,
                    }, tx);
                ledgerId = Convert.ToInt64(existing.id);
                if (access == RowWriteOutcome.AllowedViaAuthorization)
                    AuditWriter.CrossUserEdit(db, tx, ctx, "wage_tax_ledger", ledgerId, "POST /api/wages/confirm-tax", ledgerCreatedBy, gateProjectId);
            }
            else
            {
                ledgerId = await db.ExecuteScalarAsync<long>(@"INSERT INTO [wage_tax_ledger]
                    ([person_key],[tax_year],[year_month],[gross_fen],[social_fen],[housing_fen],
                     [extra_1],[extra_2],[extra_3],[extra_4],[extra_5],[extra_6],[extra_7],
                     [extra_total_fen],[extra_json],[threshold_fen],
                     [cum_taxable_fen],[cum_tax_fen],[paid_tax_fen],
                     [bonus_mode],[bonus_fen],[city_code],[created_by],[created_at],[updated_at])
                    VALUES (@K,@Y,@YM,@Gross,@Social,@Housing,
                     @E1,@E2,@E3,@E4,@E5,@E6,@E7,
                     @ETotal,@EJson,@Threshold,
                     @CumTaxable,@CumTax,@Paid,
                     @BMode,@BFen,@City,@By,@Now,@Now);
                    SELECT last_insert_rowid();",
                    new
                    {
                        K = c.PersonKey,
                        Y = c.TaxYear,
                        YM = c.YearMonth,
                        Gross = c.GrossFen,
                        Social = c.SocialFen,
                        Housing = c.HousingFen,
                        E1 = c.Extra1Fen,
                        E2 = c.Extra2Fen,
                        E3 = c.Extra3Fen,
                        E4 = c.Extra4Fen,
                        E5 = c.Extra5Fen,
                        E6 = c.Extra6Fen,
                        E7 = c.Extra7Fen,
                        ETotal = c.ExtraTotalFen,
                        EJson = c.ExtraJson,
                        Threshold = TaxCalculationService.ThresholdMonthlyFen,
                        CumTaxable = c.CumTaxableFen,
                        CumTax = c.CumTaxFen,
                        Paid = c.CurrentWithholdingFen,
                        BMode = c.BonusRecommended,
                        BFen = c.BonusFen,
                        City = dto.CityCode,
                        By = uid,
                        Now = now(),
                    }, tx);
            }
            tx.Commit();
            return Common.Ok(new
            {
                ledgerId,
                personKey = c.PersonKey,
                yearMonth = c.YearMonth,
                calc = c.Response,
            });
        });
    }

    // ── 试算核心（calc/confirm共用，纯读不写库） ──

    private sealed class CalcResult
    {
        public string PersonKey { get; set; } = "";
        public string TaxYear { get; set; } = "";
        public string YearMonth { get; set; } = "";
        public long GrossFen { get; set; }
        public long SocialFen { get; set; }
        public long HousingFen { get; set; }
        public long Extra1Fen { get; set; }
        public long Extra2Fen { get; set; }
        public long Extra3Fen { get; set; }
        public long Extra4Fen { get; set; }
        public long Extra5Fen { get; set; }
        public long Extra6Fen { get; set; }
        public long Extra7Fen { get; set; }
        public long ExtraTotalFen { get; set; }
        public string ExtraJson { get; set; } = "{}";
        public long CumTaxableFen { get; set; }
        public long CumTaxFen { get; set; }
        public long CurrentWithholdingFen { get; set; }
        public long BonusFen { get; set; }
        public string BonusRecommended { get; set; } = "separate";
        public object Response { get; set; } = new { };
    }

    private static (bool Ok, string? Error, CalcResult? Calc) TryCalc(HttpContext ctx, IDbConnection db, WageTaxRequest dto)
    {
        // 1. yearMonth 严格校验（非法 → 400，不抛 500）
        if (!TaxCalculationService.TryParseYearMonth(dto.YearMonth, out var year, out var month))
            return (false, "calc-tax: yearMonth 须为 YYYY-MM（01-12）", null);
        var yearMonth = dto.YearMonth!;
        var taxYear = year.ToString("D4");

        // 2. 人员归属：memberId / projectWorkerId 二选一必填
        if (!dto.MemberId.HasValue && !dto.ProjectWorkerId.HasValue)
            return (false, "calc-tax: memberId / projectWorkerId 二选一必填", null);
        if (dto.MemberId.HasValue && dto.ProjectWorkerId.HasValue)
            return (false, "calc-tax: memberId 与 projectWorkerId 不可同时传（累计态按人按年，粒度唯一）", null);
        var personKey = dto.MemberId.HasValue ? $"member:{dto.MemberId.Value}" : $"pw:{dto.ProjectWorkerId!.Value}";

        // 3. 城市配置：缺参/无行/必需项NULL → 拒绝并提示缺项名，禁默认值兜底（GS04）
        if (string.IsNullOrWhiteSpace(dto.CityCode))
            return (false, "calc-tax: city_code必填（无城市配置时拒绝计算，禁默认值兜底）", null);
        var cityCode = dto.CityCode.Trim();
        dynamic? city = db.QueryFirstOrDefault(
            "SELECT * FROM [city_insurance_rates] WHERE [city_code]=@C", new { C = cityCode });
        if (city == null)
            return (false, $"calc-tax: 城市配置缺失: city_code={cityCode}（请先配置该城市费率）", null);
        var missingCity = MissingCityField((object)city);
        if (missingCity != null)
            return (false, $"calc-tax: 城市配置缺项: {missingCity}（city_code={cityCode}，请补配置，禁默认值兜底）", null);

        dynamic c = city;
        double pensionPersonal = Convert.ToDouble(c.pension_personal);
        double medicalPersonal = Convert.ToDouble(c.medical_personal);
        double unempPersonal = Convert.ToDouble(c.unemp_personal);
        long baseMin = Convert.ToInt64(c.base_min_fen);
        long baseMax = Convert.ToInt64(c.base_max_fen);
        double housingMinRate = Convert.ToDouble(c.housing_min_rate);
        double housingMaxRate = Convert.ToDouble(c.housing_max_rate);
        long housingBaseMin = Convert.ToInt64(c.housing_base_min_fen);
        long housingBaseMax = Convert.ToInt64(c.housing_base_max_fen);

        // 4. 基数：入参（元，可改）→ 成员base_salary（分直取）→ 上月实际 → 0
        long inputBaseFen;
        string baseSource;
        if (dto.ContributionBase.HasValue)
        {
            inputBaseFen = MoneyUnit.ToFen(dto.ContributionBase.Value);
            baseSource = "input";
        }
        else if (TryGetMemberBaseFen(db, dto, out var memberBaseFen))
        {
            inputBaseFen = memberBaseFen;
            baseSource = "member_base_salary";
        }
        else if (TryGetPrevMonthActualFen(db, dto, yearMonth, out var prevFen) && prevFen > 0)
        {
            inputBaseFen = prevFen;
            baseSource = "prev_month_actual";
        }
        else
        {
            inputBaseFen = 0;
            baseSource = "zero_no_source";
        }

        // 5. 钳制 + 理论值（社保个人=养老+医疗+失业；公积金=钳制后基数×housingRate）
        var socialClamped = TaxCalculationService.ClampBase(inputBaseFen, baseMin, baseMax);
        var socialTheory = TaxCalculationService.CalcContributionTheory(socialClamped, pensionPersonal + medicalPersonal + unempPersonal);
        var housingRate = dto.HousingRate.HasValue ? dto.HousingRate.Value : housingMinRate;
        if (housingRate < housingMinRate || housingRate > housingMaxRate)
            return (false, $"calc-tax: housingRate须在[{housingMinRate},{housingMaxRate}]内（该城市公积金自定区间）", null);
        var housingClamped = TaxCalculationService.ClampBase(inputBaseFen, housingBaseMin, housingBaseMax);
        var housingTheory = TaxCalculationService.CalcContributionTheory(housingClamped, housingRate);

        // 理论值与成员记录值（055五列）差异提示，不静默覆盖记录列
        var diffWarnings = new List<string>();
        if (dto.MemberId.HasValue)
        {
            object? memObj = db.QueryFirstOrDefault<object>(
                "SELECT [social_security_personal], [housing_fund_personal] FROM [members] WHERE [id]=@M",
                new { M = dto.MemberId.Value });
            if (memObj != null)
            {
                var memDict = (IDictionary<string, object?>)memObj;
                memDict.TryGetValue("social_security_personal", out var sv);
                memDict.TryGetValue("housing_fund_personal", out var hv);
                var recSocial = sv == null || sv is DBNull ? (long?)null : Convert.ToInt64(sv);
                var recHousing = hv == null || hv is DBNull ? (long?)null : Convert.ToInt64(hv);
                if (recSocial.HasValue && recSocial.Value != socialTheory)
                    diffWarnings.Add($"社保个人理论值{MoneyUnit.ToYuan(socialTheory)}元与成员记录值{MoneyUnit.ToYuan(recSocial.Value)}元存在差异（未覆盖记录列）");
                if (recHousing.HasValue && recHousing.Value != housingTheory)
                    diffWarnings.Add($"公积金个人理论值{MoneyUnit.ToYuan(housingTheory)}元与成员记录值{MoneyUnit.ToYuan(recHousing.Value)}元存在差异（未覆盖记录列）");
            }
        }

        // 6. 本月收入：入参（元）优先，否则 wages实际和（分直取）
        long grossFen;
        string grossSource;
        if (dto.GrossMonthly.HasValue)
        {
            grossFen = MoneyUnit.ToFen(dto.GrossMonthly.Value);
            grossSource = "input";
        }
        else
        {
            grossFen = QueryWageSumFen(db, dto, yearMonth);
            grossSource = "wages_sum";
        }

        // 7. 专项7分项（元→分，缺省0）
        long e1 = MoneyUnit.ToFen(dto.ChildEdu ?? 0);
        long e2 = MoneyUnit.ToFen(dto.ContEdu ?? 0);
        long e3 = MoneyUnit.ToFen(dto.Medical ?? 0);
        long e4 = MoneyUnit.ToFen(dto.Mortgage ?? 0);
        long e5 = MoneyUnit.ToFen(dto.Rent ?? 0);
        long e6 = MoneyUnit.ToFen(dto.Elderly ?? 0);
        long e7 = MoneyUnit.ToFen(dto.Infant ?? 0);
        long extraTotal = TaxCalculationService.SumExtra(e1, e2, e3, e4, e5, e6, e7);
        var extraJson = JsonSerializer.Serialize(new
        {
            child_edu = dto.ChildEdu ?? 0,
            cont_edu = dto.ContEdu ?? 0,
            medical = dto.Medical ?? 0,
            mortgage = dto.Mortgage ?? 0,
            rent = dto.Rent ?? 0,
            elderly = dto.Elderly ?? 0,
            infant = dto.Infant ?? 0,
        });

        // 8. 累计：无ledger年份从0起算并注明"本年首次测算"
        var prior = db.QueryFirstOrDefault(@"SELECT
                COALESCE(SUM([gross_fen]),0) AS g, COALESCE(SUM([social_fen]),0) AS s,
                COALESCE(SUM([housing_fen]),0) AS h, COALESCE(SUM([extra_total_fen]),0) AS e,
                COALESCE(SUM([paid_tax_fen]),0) AS p, COUNT(*) AS n
            FROM [wage_tax_ledger] WHERE [person_key]=@K AND [tax_year]=@Y AND [year_month]<@YM",
            new { K = personKey, Y = taxYear, YM = yearMonth });
        long priorGross = prior == null ? 0 : Convert.ToInt64(prior.g ?? 0);
        long priorSocial = prior == null ? 0 : Convert.ToInt64(prior.s ?? 0);
        long priorHousing = prior == null ? 0 : Convert.ToInt64(prior.h ?? 0);
        long priorExtra = prior == null ? 0 : Convert.ToInt64(prior.e ?? 0);
        long priorPaid = prior == null ? 0 : Convert.ToInt64(prior.p ?? 0);
        long priorCount = prior == null ? 0 : Convert.ToInt64(prior.n ?? 0);
        bool isFirst = priorCount == 0;

        long cumGross = priorGross + grossFen;
        long cumSocial = priorSocial + socialTheory;
        long cumHousing = priorHousing + housingTheory;
        long cumExtra = priorExtra + extraTotal;
        long cumTaxable = TaxCalculationService.CalcCumTaxable(cumGross, month, cumSocial, cumHousing, cumExtra, 0);
        long cumTax = TaxCalculationService.CalcAnnualTax(cumTaxable);
        long current = TaxCalculationService.CalcWithholding(cumTax, priorPaid);

        // 9. 年终奖择优（GS03：2005年9号方法+164号+2023年30号至2027-12-31）
        long bonusFen = MoneyUnit.ToFen(dto.Bonus ?? 0);
        var (separate, combined, recommended, saving) =
            TaxCalculationService.ChooseBonusMode(cumTaxable, bonusFen);

        var refundNote = current < 0 ? "应退，走汇算" : "";
        var firstNote = isFirst ? "本年首次测算" : $"本年累计{priorCount}笔";
        var calcNote = $"累计口径：累计收入{MoneyUnit.ToYuan(cumGross)}元 − 累计减除{MoneyUnit.ToYuan(TaxCalculationService.ThresholdMonthlyFen * (long)month)}元" +
            $" − 累计社保个人{MoneyUnit.ToYuan(cumSocial)}元 − 累计公积金个人{MoneyUnit.ToYuan(cumHousing)}元" +
            $" − 累计专附{MoneyUnit.ToYuan(cumExtra)}元 − 其他0 = 累计应纳税{MoneyUnit.ToYuan(cumTaxable)}元；" +
            $"累计税{MoneyUnit.ToYuan(cumTax)}元 − 已缴{MoneyUnit.ToYuan(priorPaid)}元 = 本期{MoneyUnit.ToYuan(current)}元" +
            (refundNote == "" ? "" : $"（{refundNote}）") + $"；{firstNote}";

        var response = new
        {
            personKey,
            taxYear,
            yearMonth,
            monthsElapsed = month,
            isFirstCalcOfYear = isFirst,
            firstNote,
            grossYuan = MoneyUnit.ToYuan(grossFen),
            grossSource,
            contributionBaseYuan = MoneyUnit.ToYuan(inputBaseFen),
            baseSource,
            socialClampedBaseYuan = MoneyUnit.ToYuan(socialClamped),
            housingClampedBaseYuan = MoneyUnit.ToYuan(housingClamped),
            housingRate,
            socialTheoryYuan = MoneyUnit.ToYuan(socialTheory),
            housingTheoryYuan = MoneyUnit.ToYuan(housingTheory),
            diffWarnings,
            extraYuan = new
            {
                childEdu = MoneyUnit.ToYuan(e1),
                contEdu = MoneyUnit.ToYuan(e2),
                medical = MoneyUnit.ToYuan(e3),
                mortgage = MoneyUnit.ToYuan(e4),
                rent = MoneyUnit.ToYuan(e5),
                elderly = MoneyUnit.ToYuan(e6),
                infant = MoneyUnit.ToYuan(e7),
                total = MoneyUnit.ToYuan(extraTotal),
            },
            cumGrossYuan = MoneyUnit.ToYuan(cumGross),
            cumSocialYuan = MoneyUnit.ToYuan(cumSocial),
            cumHousingYuan = MoneyUnit.ToYuan(cumHousing),
            cumExtraYuan = MoneyUnit.ToYuan(cumExtra),
            thresholdTotalYuan = MoneyUnit.ToYuan(TaxCalculationService.ThresholdMonthlyFen * (long)month),
            cumTaxableYuan = MoneyUnit.ToYuan(cumTaxable),
            cumTaxYuan = MoneyUnit.ToYuan(cumTax),
            priorPaidYuan = MoneyUnit.ToYuan(priorPaid),
            currentWithholdingYuan = MoneyUnit.ToYuan(current),
            refundNote,
            bonus = new
            {
                amountYuan = MoneyUnit.ToYuan(bonusFen),
                separateTaxYuan = MoneyUnit.ToYuan(separate),
                combinedExtraYuan = MoneyUnit.ToYuan(combined),
                recommended,
                savingYuan = MoneyUnit.ToYuan(saving),
                // GS03引用链（引用必带30号）
                lawRef = "国税发〔2005〕9号方法 + 财税〔2018〕164号 + 财政部 税务总局公告2023年第30号（执行至2027-12-31）",
            },
            calcNote,
        };

        var calc = new CalcResult
        {
            PersonKey = personKey,
            TaxYear = taxYear,
            YearMonth = yearMonth,
            GrossFen = grossFen,
            SocialFen = socialTheory,
            HousingFen = housingTheory,
            Extra1Fen = e1,
            Extra2Fen = e2,
            Extra3Fen = e3,
            Extra4Fen = e4,
            Extra5Fen = e5,
            Extra6Fen = e6,
            Extra7Fen = e7,
            ExtraTotalFen = extraTotal,
            ExtraJson = extraJson,
            CumTaxableFen = cumTaxable,
            CumTaxFen = cumTax,
            CurrentWithholdingFen = current,
            BonusFen = bonusFen,
            BonusRecommended = recommended,
            Response = response,
        };
        return (true, null, calc);
    }

    private static string? MissingCityField(object cityObj)
    {
        var d = (IDictionary<string, object?>)cityObj;
        object? V(string k) => d.TryGetValue(k, out var v) ? v : null;
        if (V("pension_personal") is null or DBNull) return "pension_personal";
        if (V("medical_personal") is null or DBNull) return "medical_personal";
        if (V("unemp_personal") is null or DBNull) return "unemp_personal";
        if (V("base_min_fen") is null or DBNull) return "base_min_fen";
        if (V("base_max_fen") is null or DBNull) return "base_max_fen";
        if (V("housing_min_rate") is null or DBNull) return "housing_min_rate";
        if (V("housing_max_rate") is null or DBNull) return "housing_max_rate";
        if (V("housing_base_min_fen") is null or DBNull) return "housing_base_min_fen";
        if (V("housing_base_max_fen") is null or DBNull) return "housing_base_max_fen";
        return null;
    }

    private static bool TryGetMemberBaseFen(IDbConnection db, WageTaxRequest dto, out long fen)
    {
        fen = 0;
        if (!dto.MemberId.HasValue) return false;
        var v = db.ExecuteScalar<object?>(
            "SELECT [base_salary] FROM [members] WHERE [id]=@M", new { M = dto.MemberId.Value });
        if (v == null || v is DBNull) return false;
        fen = Convert.ToInt64(v);
        return fen > 0;
    }

    private static bool TryGetPrevMonthActualFen(IDbConnection db, WageTaxRequest dto, string yearMonth, out long fen)
    {
        fen = 0;
        if (!TaxCalculationService.TryParseYearMonth(yearMonth, out var y, out var m)) return false;
        m--;
        if (m < 1) { m = 12; y--; }
        var prev = $"{y:D4}-{m:D2}";
        fen = QueryWageSumFen(db, dto, prev);
        return fen > 0;
    }

    private static long QueryWageSumFen(IDbConnection db, WageTaxRequest dto, string yearMonth)
    {
        try
        {
            if (dto.MemberId.HasValue)
                return Convert.ToInt64(db.ExecuteScalar<object?>(
                    "SELECT COALESCE(SUM([actual_wage]),0) FROM [wages] WHERE [member_id]=@M AND [year_month]=@YM AND [deleted_at] IS NULL",
                    new { M = dto.MemberId.Value, YM = yearMonth }) ?? 0);
            if (dto.ProjectWorkerId.HasValue)
                return Convert.ToInt64(db.ExecuteScalar<object?>(
                    "SELECT COALESCE(SUM([actual_wage]),0) FROM [wages] WHERE [project_worker_id]=@PW AND [year_month]=@YM AND [deleted_at] IS NULL",
                    new { PW = dto.ProjectWorkerId.Value, YM = yearMonth }) ?? 0);
        }
        catch (Exception ex) { Console.Error.WriteLine($"[WageTax] wages_sum 查询失败: {ex.Message}"); }
        return 0;
    }

    private static List<(long? project_id, object? paid, object? locked)> QueryWageRows(IDbConnection db, WageTaxRequest dto)
    {
        var list = new List<(long? project_id, object? paid, object? locked)>();
        try
        {
            // yearMonth 必填已在 TryCalc 校验；此处缺失则不查锁（试算已先 400）
            if (string.IsNullOrEmpty(dto.YearMonth)) return list;
            IEnumerable<dynamic> rows = dto.MemberId.HasValue
                ? db.Query("SELECT [project_id], COALESCE([paid_amount],0) AS paid, COALESCE([payment_locked],0) AS locked FROM [wages] WHERE [member_id]=@M AND [year_month]=@YM AND [deleted_at] IS NULL",
                    new { M = dto.MemberId.Value, YM = dto.YearMonth })
                : dto.ProjectWorkerId.HasValue
                    ? db.Query("SELECT [project_id], COALESCE([paid_amount],0) AS paid, COALESCE([payment_locked],0) AS locked FROM [wages] WHERE [project_worker_id]=@PW AND [year_month]=@YM AND [deleted_at] IS NULL",
                        new { PW = dto.ProjectWorkerId.Value, YM = dto.YearMonth })
                    : Enumerable.Empty<dynamic>();
            foreach (var r in rows)
            {
                long? pid = r.project_id == null || r.project_id is DBNull ? null : Convert.ToInt64(r.project_id);
                list.Add((pid, r.paid, r.locked));
            }
        }
        catch (Exception ex) { Console.Error.WriteLine($"[WageTax] wages_lock 查询失败: {ex.Message}"); }
        return list;
    }
}

// calc/confirm 共用请求体（camelCase 由 Web 默认反序列化绑定；金额一律元，落库经 MoneyUnit.ToFen 转分）
public record WageTaxRequest(
    long? MemberId,
    long? ProjectWorkerId,
    string? YearMonth,
    string? CityCode,
    double? ContributionBase,
    double? GrossMonthly,
    double? ChildEdu,
    double? ContEdu,
    double? Medical,
    double? Mortgage,
    double? Rent,
    double? Elderly,
    double? Infant,
    double? Bonus,
    string? BonusMode,
    double? HousingRate);
