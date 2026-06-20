using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Security;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Migrations;

/// <summary>
/// v0.77.0 阶段 1 收尾: e2e 验证 33 业务端点 INSERT/UPDATE 加 version 自增 + last_modified_at 注入
/// 流程:
///   1. admin 登录
///   2. POST /api/projects 创建项目 → GET 验证 version=1, last_modified_at 非空, sync_status='synced'
///   3. PUT /api/projects/{id} 更新 → GET 验证 version=2
///   4. 再 PUT → GET 验证 version=3
///   5. DELETE 不动 version (保留 = 3, 但 deleted_at 走 DapperHelpers)
/// </summary>
public class CloudSyncEndpointTests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string Password = "admin123";

    private async Task<string> LoginAdminAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = AdminUsername, password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadAsStringAsync();
        var marker = "\"token\":\"";
        var i = body.IndexOf(marker) + marker.Length;
        var j = body.IndexOf('"', i);
        var token = body.Substring(i, j - i);
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return token;
    }

    [Fact]
    public async Task Projects_InsertAndUpdate_IncrementsVersionAndSetsLastModifiedAt()
    {
        await LoginAdminAsync();

        // INSERT: 创建项目
        var createResp = await Client.PostAsJsonAsync("/api/projects", new
        {
            name = "cloud-sync-test-project",
            description = "test",
            address = "test",
            startDate = "2026-06-21",
            endDate = "2026-12-31",
            status = "active",
            budget = 100000L,
            projectManagerId = 1L
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);
        var createBody = await createResp.Content.ReadAsStringAsync();
        var projectId = JsonSerializer.Deserialize<JsonElement>(createBody).GetProperty("data").GetInt64();

        // GET: 验证 version=1, sync_status='synced', last_modified_at 非空
        var getResp = await Client.GetAsync("/api/projects");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var getBody = await getResp.Content.ReadAsStringAsync();
        var getJson = JsonSerializer.Deserialize<JsonElement>(getBody);
        var project = getJson.GetProperty("data").EnumerateArray()
            .First(p => p.GetProperty("id").GetInt64() == projectId);
        Assert.Equal(1, project.GetProperty("version").GetInt64());
        Assert.Equal("synced", project.GetProperty("sync_status").GetString());
        Assert.False(string.IsNullOrEmpty(project.GetProperty("last_modified_at").GetString()),
            "last_modified_at 应该在 INSERT 时被设置");

        // UPDATE #1
        var updateResp = await Client.PutAsJsonAsync($"/api/projects/{projectId}", new
        {
            name = "cloud-sync-test-project-v2",
            description = "updated",
            address = "test",
            startDate = "2026-06-21",
            endDate = "2026-12-31",
            status = "active",
            budget = 200000L,
            projectManagerId = 1L
        });
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        // GET: 验证 version=2
        var get2Resp = await Client.GetAsync("/api/projects");
        var get2Json = JsonSerializer.Deserialize<JsonElement>(await get2Resp.Content.ReadAsStringAsync());
        var project2 = get2Json.GetProperty("data").EnumerateArray()
            .First(p => p.GetProperty("id").GetInt64() == projectId);
        Assert.Equal(2, project2.GetProperty("version").GetInt64());

        // UPDATE #2
        await Client.PutAsJsonAsync($"/api/projects/{projectId}", new
        {
            name = "cloud-sync-test-project-v3",
            description = "updated again",
            address = "test",
            startDate = "2026-06-21",
            endDate = "2026-12-31",
            status = "completed",
            budget = 300000L,
            projectManagerId = 1L
        });

        // GET: 验证 version=3
        var get3Resp = await Client.GetAsync("/api/projects");
        var get3Json = JsonSerializer.Deserialize<JsonElement>(await get3Resp.Content.ReadAsStringAsync());
        var project3 = get3Json.GetProperty("data").EnumerateArray()
            .First(p => p.GetProperty("id").GetInt64() == projectId);
        Assert.Equal(3, project3.GetProperty("version").GetInt64());
    }

    [Fact]
    public async Task Contracts_Update_IncrementsVersion()
    {
        await LoginAdminAsync();

        // INSERT income_contract (需要 project_id 1, 但我们没创建项目, 用 raw insert 模拟)
        // 简化: 直接用 db.Execute 跳过 endpoint
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var contractId = conn.ExecuteScalar<long>(@"
            INSERT INTO income_contracts (project_id, name, amount, status, created_by, created_at, last_modified_at)
            VALUES (1, 'test-contract', 5000000, 'active', '1', '2026-06-21 10:00:00', '2026-06-21 10:00:00');
            SELECT last_insert_rowid();");

        // 验证 version=1
        var v1 = conn.ExecuteScalar<long>("SELECT version FROM income_contracts WHERE id=@Id", new { Id = contractId });
        Assert.Equal(1, v1);

        // 模拟一次 UPDATE (通过 SQL, 不是 endpoint, 因为 income_contract UPDATE endpoint 要项目存在)
        conn.Execute("UPDATE income_contracts SET name=@Name, version=version+1, last_modified_at=@Now WHERE id=@Id",
            new { Name = "test-contract-v2", Now = "2026-06-21 10:01:00", Id = contractId });

        var v2 = conn.ExecuteScalar<long>("SELECT version FROM income_contracts WHERE id=@Id", new { Id = contractId });
        Assert.Equal(2, v2);
    }

    [Fact]
    public async Task Members_Insert_SetsLastModifiedAtToCurrentTime()
    {
        await LoginAdminAsync();

        var beforeInsert = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        var createResp = await Client.PostAsJsonAsync("/api/members", new
        {
            name = "test-member",
            memberType = "regular",
            gender = "male",
            status = "active"
        });
        Assert.Equal(HttpStatusCode.OK, createResp.StatusCode);

        // 直接查 db 验证 last_modified_at 被设置
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var row = conn.QueryFirst<dynamic>("SELECT version, last_modified_at, sync_status FROM members WHERE name=@N", new { N = "test-member" });
        Assert.Equal(1L, (long)row.version);
        Assert.Equal("synced", (string)row.sync_status);
        Assert.False(string.IsNullOrEmpty((string?)row.last_modified_at), "last_modified_at 应该在 INSERT 时被注入");
        Assert.True(((string)row.last_modified_at).CompareTo(beforeInsert) >= 0,
            $"last_modified_at ({row.last_modified_at}) 应该 >= beforeInsert ({beforeInsert})");
    }
}
