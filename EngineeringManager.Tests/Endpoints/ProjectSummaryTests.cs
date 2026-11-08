using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// T6：项目维度只读聚合（成本台账 / 发票 / 结算）。
/// 单位口径：invoices.amount、cost_ledger.amount、settlements.amount 均为 INTEGER 分（053 迁移后），接口输出元。
/// </summary>
public class ProjectSummaryTests : ApiTestBase
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

    /// <summary>复制 admin 的密码哈希造指定角色用户。</summary>
    private void SeedUser(string id, string username, string roleId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = $"t6-{id}-salt-123456";
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

    private async Task<long> CreateProjectAsync(string name)
    {
        var resp = await Client.PostAsJsonAsync("/api/projects", new { name });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private async Task<long> CreateInvoiceAsync(long projectId, decimal amount)
    {
        var resp = await Client.PostAsJsonAsync("/api/invoices", new
        {
            name = $"聚合发票-{Guid.NewGuid():N}",
            amount,
            priceAmount = amount,
            taxAmount = 0m,
            taxRate = 0m,
            status = "issued",
            type = "invoice_out",
            invoiceKind = "paper_special",
            invoiceMedium = "paper",
            invoiceCategory = "special",
            issueDate = "2026-10-01",
            projectId
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetInt64();
    }

    private void InsertCost(long projectId, long fen, bool deleted = false)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT INTO [cost_ledger] ([project_id],[amount],[date],[deleted_at],[created_at],[updated_at])
            VALUES (@P,@A,'2026-10-01',@Deleted,datetime('now'),datetime('now'))",
            new { P = projectId, A = fen, Deleted = deleted ? "2026-10-02 00:00:00" : null });
    }

    private void InsertSettlement(long projectId, long fen, bool deleted = false)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"INSERT INTO [settlements] ([project_id],[name],[amount],[status],[date],[deleted_at],[created_at],[updated_at])
            VALUES (@P,'结算单',@A,'confirmed','2026-10-01',@Deleted,datetime('now'),datetime('now'))",
            new { P = projectId, A = fen, Deleted = deleted ? "2026-10-02 00:00:00" : null });
    }

    private async Task<JsonElement> GetSummaryAsync(string query = "")
    {
        var resp = await Client.GetAsync($"/api/projects/financial-summary{query}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
    }

    [Fact]
    public async Task Summary_AggregatesCostSettlementAndInvoice()
    {
        await AuthAdminAsync();
        var projectId = await CreateProjectAsync("聚合项目A");
        InsertCost(projectId, 10025);
        InsertCost(projectId, 2000);
        InsertSettlement(projectId, 5050);
        await CreateInvoiceAsync(projectId, 1060m);

        var data = await GetSummaryAsync($"?projectId={projectId}");
        var row = Assert.Single(data.EnumerateArray());

        Assert.Equal(12025L, row.GetProperty("costFen").GetInt64());
        Assert.Equal(120.25m, row.GetProperty("costAmount").GetDecimal());
        Assert.Equal(2, row.GetProperty("costCount").GetInt32());
        Assert.Equal(5050L, row.GetProperty("settlementFen").GetInt64());
        Assert.Equal(50.5m, row.GetProperty("settlementAmount").GetDecimal());
        Assert.Equal(1, row.GetProperty("settlementCount").GetInt32());
        Assert.Equal(106000L, row.GetProperty("invoiceFen").GetInt64());
        Assert.Equal(1060m, row.GetProperty("invoiceAmount").GetDecimal());
        Assert.Equal(1, row.GetProperty("invoiceCount").GetInt32());
    }

    [Fact]
    public async Task Summary_ExcludesSoftDeletedCostAndSettlement()
    {
        await AuthAdminAsync();
        var projectId = await CreateProjectAsync("聚合项目-软删");
        InsertCost(projectId, 10000);
        InsertCost(projectId, 99900, deleted: true);
        InsertSettlement(projectId, 5000);
        InsertSettlement(projectId, 88800, deleted: true);

        var row = Assert.Single((await GetSummaryAsync($"?projectId={projectId}")).EnumerateArray());
        Assert.Equal(10000L, row.GetProperty("costFen").GetInt64());
        Assert.Equal(1, row.GetProperty("costCount").GetInt32());
        Assert.Equal(5000L, row.GetProperty("settlementFen").GetInt64());
        Assert.Equal(1, row.GetProperty("settlementCount").GetInt32());
    }

    [Fact]
    public async Task Summary_ExcludesCancelledAndRedFlushedInvoices()
    {
        await AuthAdminAsync();
        var projectId = await CreateProjectAsync("聚合项目-作废票");
        await CreateInvoiceAsync(projectId, 1060m);
        var cancelled = await CreateInvoiceAsync(projectId, 500m);
        var redFlushed = await CreateInvoiceAsync(projectId, 700m);

        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("UPDATE [invoices] SET [status]='cancelled' WHERE [id]=@Id", new { Id = cancelled });
            conn.Execute("UPDATE [invoices] SET [status]='red_flushed' WHERE [id]=@Id", new { Id = redFlushed });
        }

        var row = Assert.Single((await GetSummaryAsync($"?projectId={projectId}")).EnumerateArray());
        Assert.Equal(106000L, row.GetProperty("invoiceFen").GetInt64());
        Assert.Equal(1, row.GetProperty("invoiceCount").GetInt32());
    }

    [Fact]
    public async Task Summary_EmptyProject_ReturnsZeros()
    {
        await AuthAdminAsync();
        var projectId = await CreateProjectAsync("聚合项目-空");

        var row = Assert.Single((await GetSummaryAsync($"?projectId={projectId}")).EnumerateArray());
        Assert.Equal(0L, row.GetProperty("costFen").GetInt64());
        Assert.Equal(0L, row.GetProperty("settlementFen").GetInt64());
        Assert.Equal(0L, row.GetProperty("invoiceFen").GetInt64());
        Assert.Equal(0, row.GetProperty("costCount").GetInt32());
    }

    [Fact]
    public async Task Summary_NonAdminWithoutAuthorization_CannotSeeProject()
    {
        await AuthAdminAsync();
        var projectId = await CreateProjectAsync("聚合项目-隔离");
        InsertCost(projectId, 10000);

        SeedUser("2", "acc1", "accountant");
        SetAuth(await LoginAsync("acc1"));

        // 列表不含（不可见）
        var listResp = await Client.GetAsync("/api/projects/financial-summary");
        Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);
        var list = (await listResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.DoesNotContain(list.EnumerateArray(), r => r.GetProperty("projectId").GetInt64() == projectId);

        // 指定 projectId → 404（不泄露存在性）
        var oneResp = await Client.GetAsync($"/api/projects/financial-summary?projectId={projectId}");
        Assert.Equal(HttpStatusCode.NotFound, oneResp.StatusCode);

        // 授权后可读
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute("INSERT OR IGNORE INTO [project_authorizations] ([project_id],[user_id]) VALUES (@P,'2')",
                new { P = projectId });
        }
        var authorized = await GetSummaryAsync($"?projectId={projectId}");
        var row = Assert.Single(authorized.EnumerateArray());
        Assert.Equal(10000L, row.GetProperty("costFen").GetInt64());
    }
}
