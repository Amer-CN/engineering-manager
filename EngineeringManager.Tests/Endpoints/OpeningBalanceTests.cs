using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// T7b 期初余额：按期间+科目保存（INTEGER 分），保存前借贷必须平衡；整期替换 + 审计。
/// </summary>
public class OpeningBalanceTests : ApiTestBase
{
    private const string Password = "admin123";

    private async Task<string> LoginAsync(string username)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private async Task AuthAdminAsync() => SetAuth(await LoginAsync("admin"));

    private void SeedUser(string id, string username, string roleId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = $"t7b-{id}-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO [users]
            (id,username,password,password_hash,password_salt,password_hash_version,display_name,role_id,status,created_at)
            VALUES (@Id,@Username,@Password,@Hash,@Salt,2,@DisplayName,@RoleId,'active',@Now)",
            new
            {
                Id = id, Username = username, Password, Hash = hash, Salt = salt,
                DisplayName = username, RoleId = roleId, Now = "2026-05-01 00:00:00"
            });
    }

    private static object Row(string code, string? name, decimal debit, decimal credit) =>
        new { accountCode = code, accountName = name, debit, credit };

    private async Task<HttpResponseMessage> SaveAsync(string period, object[] rows) =>
        await Client.PutAsJsonAsync($"/api/opening-balances?period={period}", new { rows });

    private async Task<HttpResponseMessage> GetRawAsync(string period) =>
        await Client.GetAsync($"/api/opening-balances?period={period}");

    private static async Task<JsonElement> ReadData(HttpResponseMessage resp)
    {
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data");
    }

    private static async Task<string> ReadError(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.TryGetProperty("error", out var e) ? e.GetString() ?? "" : "";
    }

    private T Scalar<T>(string sql, object? param = null)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<T>(sql, param)!;
    }

    [Fact]
    public async Task SaveBalanced_StoresFen_AndWritesAudit()
    {
        await AuthAdminAsync();
        var data = await ReadData(await SaveAsync("202605", new[]
        {
            Row("1001", "库存现金", 1000.50m, 0m),
            Row("2001", "短期借款", 0m, 1000.50m),
        }));

        Assert.Equal("202605", data.GetProperty("period").GetString());
        Assert.Equal(2, data.GetProperty("rows").GetArrayLength());
        Assert.Equal(1000.50m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(1000.50m, data.GetProperty("totalCredit").GetDecimal());
        Assert.True(data.GetProperty("balanced").GetBoolean());

        // 库内分：1000.50 元 = 100050 分
        Assert.Equal(100050L, Scalar<long>(
            "SELECT [debit_fen] FROM [opening_balances] WHERE [period]='202605' AND [account_code]='1001'"));
        Assert.Equal(1L, Scalar<long>(
            "SELECT COUNT(*) FROM [audit_logs] WHERE [action]='opening_balances.save'"));
    }

    [Fact]
    public async Task SaveUnbalanced_Returns400_AndWritesNothing()
    {
        await AuthAdminAsync();
        var resp = await SaveAsync("202605", new[]
        {
            Row("1001", "库存现金", 100m, 0m),
            Row("2001", "短期借款", 0m, 90m),
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不平衡", await ReadError(resp));
        Assert.Equal(0L, Scalar<long>("SELECT COUNT(*) FROM [opening_balances]"));
    }

    [Fact]
    public async Task Save_InvalidPeriod_Returns400()
    {
        await AuthAdminAsync();
        var resp = await SaveAsync("2026-05", new[] { Row("1001", "现金", 0m, 0m) });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("YYYYMM", await ReadError(resp));
    }

    [Fact]
    public async Task Save_MissingAccountCode_Returns400()
    {
        await AuthAdminAsync();
        var resp = await SaveAsync("202605", new[] { Row("", "现金", 0m, 0m) });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("科目编码", await ReadError(resp));
    }

    [Fact]
    public async Task Save_BothSidesOnOneRow_Returns400()
    {
        await AuthAdminAsync();
        var resp = await SaveAsync("202605", new[]
        {
            Row("1001", "现金", 100m, 100m),
            Row("2001", "借款", 0m, 0m),
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("不能同时", await ReadError(resp));
    }

    [Fact]
    public async Task Save_NegativeAmount_Returns400()
    {
        await AuthAdminAsync();
        var resp = await SaveAsync("202605", new[] { Row("1001", "现金", -1m, 0m) });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("负数", await ReadError(resp));
    }

    [Fact]
    public async Task Save_DuplicateAccountCode_Returns400()
    {
        await AuthAdminAsync();
        var resp = await SaveAsync("202605", new[]
        {
            Row("1001", "现金", 100m, 0m),
            Row("1001", "现金2", 0m, 100m),
        });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Contains("重复", await ReadError(resp));
    }

    [Fact]
    public async Task Save_ReplacesWholePeriod()
    {
        await AuthAdminAsync();
        Assert.Equal(HttpStatusCode.OK, (await SaveAsync("202605", new[]
        {
            Row("1001", "现金", 100m, 0m),
            Row("2001", "借款", 0m, 100m),
        })).StatusCode);

        var data = await ReadData(await SaveAsync("202605", new[]
        {
            Row("1002", "银行存款", 200m, 0m),
            Row("2001", "借款", 0m, 100m),
            Row("3001", "实收资本", 0m, 100m),
        }));
        Assert.Equal(3, data.GetProperty("rows").GetArrayLength());
        Assert.Equal(0L, Scalar<long>(
            "SELECT COUNT(*) FROM [opening_balances] WHERE [period]='202605' AND [account_code]='1001'"));
    }

    [Fact]
    public async Task Save_AccountNameOptional_StoresEmpty()
    {
        await AuthAdminAsync();
        var data = await ReadData(await SaveAsync("202605", new[] { Row("1001", null, 0m, 0m) }));
        var row = data.GetProperty("rows")[0];
        Assert.Equal("1001", row.GetProperty("accountCode").GetString());
        Assert.Equal("", row.GetProperty("accountName").GetString());
    }

    [Fact]
    public async Task Get_EmptyPeriod_ReturnsZeros()
    {
        await AuthAdminAsync();
        var data = await ReadData(await GetRawAsync("209901"));
        Assert.Equal(0, data.GetProperty("rows").GetArrayLength());
        Assert.Equal(0m, data.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(0m, data.GetProperty("totalCredit").GetDecimal());
        Assert.True(data.GetProperty("balanced").GetBoolean());
    }

    [Fact]
    public async Task Periods_AreIsolated()
    {
        await AuthAdminAsync();
        Assert.Equal(HttpStatusCode.OK, (await SaveAsync("202605", new[]
        {
            Row("1001", "现金", 100m, 0m), Row("2001", "借款", 0m, 100m),
        })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await SaveAsync("202606", new[]
        {
            Row("1002", "银行", 200m, 0m), Row("2001", "借款", 0m, 200m),
        })).StatusCode);

        var may = await ReadData(await GetRawAsync("202605"));
        var june = await ReadData(await GetRawAsync("202606"));
        Assert.Equal(100m, may.GetProperty("totalDebit").GetDecimal());
        Assert.Equal(200m, june.GetProperty("totalDebit").GetDecimal());
    }

    [Fact]
    public async Task Worker_Returns403_ForGetAndPut()
    {
        SeedUser("t7b-worker", "t7b-worker", "worker");
        SetAuth(await LoginAsync("t7b-worker"));

        Assert.Equal(HttpStatusCode.Forbidden, (await GetRawAsync("202605")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await SaveAsync("202605", new[] { Row("1001", "现金", 0m, 0m) })).StatusCode);
    }

    [Fact]
    public async Task Accountant_CanSaveAndRead()
    {
        SeedUser("t7b-acc", "t7b-acc", "accountant");
        SetAuth(await LoginAsync("t7b-acc"));

        var save = await SaveAsync("202605", new[]
        {
            Row("1001", "现金", 50m, 0m), Row("2001", "借款", 0m, 50m),
        });
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);

        var data = await ReadData(await GetRawAsync("202605"));
        Assert.Equal(50m, data.GetProperty("totalDebit").GetDecimal());
    }
}