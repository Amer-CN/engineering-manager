using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using Microsoft.Data.Sqlite;

namespace EngineeringManager.Api;

/// <summary>
/// 期初余额（T7b）：按期间 + 科目录入建账期初（库内 INTEGER 分，接口为元）。
/// 保存前必须借贷合计相等；保存为整期替换（同事务删旧插新 + 审计）。
/// </summary>
public static class OpeningBalanceEndpoints
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public sealed record OpeningBalanceInput(string? AccountCode, string? AccountName, decimal? Debit, decimal? Credit);
    public sealed record OpeningBalanceSaveRequest(List<OpeningBalanceInput>? Rows);

    private sealed class OpeningBalanceRow
    {
        public long Id { get; set; }
        public string Period { get; set; } = "";
        public string AccountCode { get; set; } = "";
        public string AccountName { get; set; } = "";
        public long DebitFen { get; set; }
        public long CreditFen { get; set; }
    }

    public static void RegisterOpeningBalanceEndpoints(this WebApplication app)
    {
        // 查询某期间的期初余额（只读）。
        app.MapGet("/api/opening-balances", async (HttpContext ctx, IDbConnection db, string? period) =>
        {
            _ = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:read")) return Results.Forbid();
            if (!IsPeriod(period)) return Common.Fail("period 格式应为 YYYYMM", 400);

            var rows = (await db.QueryAsync<OpeningBalanceRow>(
                @"SELECT [id] AS Id,[period] AS Period,[account_code] AS AccountCode,[account_name] AS AccountName,
                         [debit_fen] AS DebitFen,[credit_fen] AS CreditFen
                  FROM [opening_balances] WHERE [period]=@Period ORDER BY [account_code]",
                new { Period = period })).ToList();
            return Common.Ok(BuildResponse(period!, rows));
        });

        // 整期保存期初余额（借贷必须平衡；同事务替换 + 审计）。
        app.MapPut("/api/opening-balances", async (HttpContext ctx, IDbConnection db, string? period) =>
        {
            var uid = CurrentUser.GetUserId(ctx) ?? throw new UnauthorizedAccessException();
            if (!CurrentUser.HasPermission(ctx, db, "vouchers:approve")) return Results.Forbid();
            if (!IsPeriod(period)) return Common.Fail("period 格式应为 YYYYMM", 400);

            using var reader = new StreamReader(ctx.Request.Body);
            var bodyText = await reader.ReadToEndAsync();
            OpeningBalanceSaveRequest? request;
            try
            {
                request = JsonSerializer.Deserialize<OpeningBalanceSaveRequest>(bodyText, JsonOpts);
            }
            catch (JsonException ex)
            {
                Console.Error.WriteLine($"[OpeningBalances] 请求体 JSON 解析失败: {ex.Message}");
                return Common.Fail("请求体不是合法 JSON", 400);
            }
            if (request == null) return Common.Fail("请求体必须是 JSON 对象", 400);

            var normalized = new List<(string Code, string Name, long DebitFen, long CreditFen)>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var row in request.Rows ?? new List<OpeningBalanceInput>())
            {
                var code = (row.AccountCode ?? "").Trim();
                if (code.Length == 0) return Common.Fail("科目编码必填", 400);
                if (code.Length > 50) return Common.Fail("科目编码不得超过 50 字符", 400);
                if (!seen.Add(code)) return Common.Fail($"科目编码重复：{code}", 400);

                var debit = row.Debit ?? 0m;
                var credit = row.Credit ?? 0m;
                if (debit < 0 || credit < 0) return Common.Fail($"科目 {code} 的期初金额不能为负数", 400);
                if (debit > 0 && credit > 0)
                    return Common.Fail($"科目 {code} 的借方与贷方不能同时有金额", 400);

                normalized.Add((code, (row.AccountName ?? "").Trim(),
                    MoneyUnit.ToFen(debit) ?? 0, MoneyUnit.ToFen(credit) ?? 0));
            }

            var totalDebitFen = normalized.Sum(r => r.DebitFen);
            var totalCreditFen = normalized.Sum(r => r.CreditFen);
            if (totalDebitFen != totalCreditFen)
                return Common.Fail(
                    $"期初余额借贷不平衡：借 {MoneyUnit.ToYuanDecimal(totalDebitFen):0.00} 元，贷 {MoneyUnit.ToYuanDecimal(totalCreditFen):0.00} 元",
                    400);

            using var tx = BeginWriteTransaction(db);
            var now = Common.NowString();
            try
            {
                // T7c：锁定期间禁止修改期初余额
                if (PeriodLockService.IsLocked(db, period, tx))
                {
                    tx.Rollback();
                    return Common.Fail(PeriodLockService.LockedMessage(period), 400);
                }

                await db.ExecuteAsync("DELETE FROM [opening_balances] WHERE [period]=@Period",
                    new { Period = period }, tx);
                foreach (var row in normalized)
                {
                    await db.ExecuteAsync(
                        @"INSERT INTO [opening_balances]
                            ([period],[account_code],[account_name],[debit_fen],[credit_fen],[created_by],[created_at],[updated_at])
                          VALUES (@Period,@Code,@Name,@Debit,@Credit,@Uid,@Now,@Now)",
                        new
                        {
                            Period = period, Code = row.Code, Name = row.Name,
                            Debit = row.DebitFen, Credit = row.CreditFen, Uid = uid, Now = now
                        }, tx);
                }

                await db.ExecuteAsync(
                    @"INSERT INTO [audit_logs]
                        ([action],[level],[user_id],[user_name],[resource],[resource_id],[details],[ip_address],[created_at])
                      VALUES ('opening_balances.save','info',@UserId,@UserName,'opening_balances',@ResourceId,@Details,@Ip,@CreatedAt)",
                    new
                    {
                        UserId = uid,
                        UserName = uid,
                        ResourceId = period,
                        Details = $"period={period}; rows={normalized.Count}; debitFen={totalDebitFen}; creditFen={totalCreditFen}",
                        Ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                        CreatedAt = now
                    }, tx);

                tx.Commit();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[OpeningBalances] save period={period}: {ex.Message}");
                tx.Rollback();
                throw;
            }

            var saved = (await db.QueryAsync<OpeningBalanceRow>(
                @"SELECT [id] AS Id,[period] AS Period,[account_code] AS AccountCode,[account_name] AS AccountName,
                         [debit_fen] AS DebitFen,[credit_fen] AS CreditFen
                  FROM [opening_balances] WHERE [period]=@Period ORDER BY [account_code]",
                new { Period = period })).ToList();
            return Common.Ok(BuildResponse(period!, saved));
        });
    }

    private static object BuildResponse(string period, List<OpeningBalanceRow> rows)
    {
        var totalDebitFen = rows.Sum(r => r.DebitFen);
        var totalCreditFen = rows.Sum(r => r.CreditFen);
        return new
        {
            period,
            rows = rows.Select(r => new
            {
                accountCode = r.AccountCode,
                accountName = r.AccountName,
                debit = MoneyUnit.ToYuanDecimal(r.DebitFen),
                credit = MoneyUnit.ToYuanDecimal(r.CreditFen)
            }),
            totalDebit = MoneyUnit.ToYuanDecimal(totalDebitFen),
            totalCredit = MoneyUnit.ToYuanDecimal(totalCreditFen),
            balanced = totalDebitFen == totalCreditFen
        };
    }

    private static bool IsPeriod(string? period) =>
        !string.IsNullOrWhiteSpace(period) && period.Length == 6 && period.All(char.IsDigit);

    /// <summary>写事务统一 IMMEDIATE（同凭证端点先例），避免整期替换出现并发窗口。</summary>
    private static IDbTransaction BeginWriteTransaction(IDbConnection db) =>
        db is SqliteConnection sqlite ? sqlite.BeginTransaction(deferred: false) : db.BeginTransaction();
}