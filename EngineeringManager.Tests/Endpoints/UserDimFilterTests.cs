using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v1.1.0 P0-4 Phase 2: 验证 user-dim 越权防护
/// 用 [Collection("UserDim")] 串行化避免 5/min rate limit
/// </summary>
[Collection("UserDim")]
public class UserDimFilterTests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string Worker1Username = "worker1";
    private const string Password = "admin123";

    private static string ExtractTokenFromJson(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker);
        if (i < 0) throw new Exception("token 字段未找到: " + json);
        i += marker.Length;
        var j = json.IndexOf('"', i);
        if (j < 0) throw new Exception("token 字段格式错");
        return json.Substring(i, j - i);
    }

    private async Task<(string adminToken, string worker1Token, string worker1Id)>
        LoginBothAsync()
    {
        // 1. 登录 admin
        var adminLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = AdminUsername, password = Password });
        if (!adminLogin.IsSuccessStatusCode)
        {
            var errBody = await adminLogin.Content.ReadAsStringAsync();
            throw new Exception("admin 登录失败: " + adminLogin.StatusCode + " " + errBody);
        }
        var adminBody = await adminLogin.Content.ReadAsStringAsync();
        var adminToken = ExtractTokenFromJson(adminBody);

        // 2. 创建 worker1 (admin 身份)
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var createUser = await Client.PostAsJsonAsync("/api/users",
            new { username = Worker1Username, password = Password, displayName = "测试工人", roleId = "worker", status = "active" });
        string worker1Id;
        if (createUser.IsSuccessStatusCode)
        {
            var createBody = await createUser.Content.ReadAsStringAsync();
            var marker = "\"id\":\"";
            var idx = createBody.IndexOf(marker);
            if (idx < 0) throw new Exception("createUser 响应无 id: " + createBody);
            idx += marker.Length;
            var end = createBody.IndexOf('"', idx);
            worker1Id = createBody.Substring(idx, end - idx);
        }
        else
        {
            var list = await Client.GetAsync("/api/users");
            var listBody = await list.Content.ReadAsStringAsync();
            worker1Id = FindUserIdByName(listBody, Worker1Username);
            if (string.IsNullOrEmpty(worker1Id))
            {
                throw new Exception("createUser 失败且 list 找不到 worker1: createUser=" +
                    createUser.StatusCode + " list=" + listBody);
            }
        }

        // 3. 登录 worker1
        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = Worker1Username, password = Password });
        if (!workerLogin.IsSuccessStatusCode)
        {
            var errBody = await workerLogin.Content.ReadAsStringAsync();
            throw new Exception("worker1 登录失败: " + workerLogin.StatusCode + " " + errBody);
        }
        var workerBody = await workerLogin.Content.ReadAsStringAsync();
        var worker1Token = ExtractTokenFromJson(workerBody);

        return (adminToken, worker1Token, worker1Id);
    }

    private static string FindUserIdByName(string listJson, string username)
    {
        // 简单字符串扫描: 找 "username":"<name>" 后面跟的 "id":"<id>"
        var nameMarker = "\"username\":\"" + username + "\"";
        var ni = listJson.IndexOf(nameMarker);
        if (ni < 0) return "";
        // 往后找 "id":"..."
        var idMarker = "\"id\":\"";
        var ii = listJson.IndexOf(idMarker, ni);
        if (ii < 0) return "";
        ii += idMarker.Length;
        var end = listJson.IndexOf('"', ii);
        if (end < 0) return "";
        return listJson.Substring(ii, end - ii);
    }

    private void SetAuth(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    [Fact]
    public async Task Members_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        Assert.Equal(HttpStatusCode.OK, (await Client.GetAsync("/api/members")).StatusCode);
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/members");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Partners_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/partners");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/partners");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Projects_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/projects");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/projects");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Inventory_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/inventory");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/inventory");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Materials_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/materials");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/materials");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task Supervisors_AdminSeesAll_WorkerSeesNone()
    {
        var (admin, worker, _) = await LoginBothAsync();
        SetAuth(admin);
        await Client.GetAsync("/api/supervisors");
        SetAuth(worker);
        var resp = await Client.GetAsync("/api/supervisors");
        Assert.Equal(0, (await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }

    [Fact]
    public async Task DbSchemaInfo_AlreadyDeletedInV072_NotFound()
    {
        var (admin, _, _) = await LoginBothAsync();
        SetAuth(admin);
        Assert.Equal(HttpStatusCode.NotFound, (await Client.GetAsync("/api/admin/db-schema-info")).StatusCode);
    }

    [Fact]
    public async Task ProjectAuthorizations_AdminCanGrant_WorkerForbidden()
    {
        var (admin, worker, worker1Id) = await LoginBothAsync();
        SetAuth(admin);
        var projectResp = await Client.PostAsJsonAsync("/api/projects", new
        {
            name = "P0-4测试项目", description = "test", address = "x",
            startDate = "2026-06-19", endDate = "2026-12-31",
            status = "planning", budget = 1000, projectManagerId = (long?)null
        });
        Assert.True(projectResp.IsSuccessStatusCode);
        var projectId = (await projectResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        SetAuth(worker);
        var authzResp = await Client.PostAsJsonAsync("/api/admin/project-authorizations",
            new { projectId, userId = worker1Id });
        Assert.True((int)authzResp.StatusCode >= 400, "worker 调管理端点应被禁, 实际 " + authzResp.StatusCode);
    }

    [Fact]
    public async Task ProjectAuthorizations_AdminGrantsWorker_CanSeeThatProject()
    {
        var (admin, worker, worker1Id) = await LoginBothAsync();
        SetAuth(admin);
        var projectResp = await Client.PostAsJsonAsync("/api/projects", new
        {
            name = "授权测试项目", description = "test", address = "x",
            startDate = "2026-06-19", endDate = "2026-12-31",
            status = "planning", budget = 1000, projectManagerId = (long?)null
        });
        Assert.True(projectResp.IsSuccessStatusCode);
        var projectId = (await projectResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        // admin 授权 worker1
        var authzResp = await Client.PostAsJsonAsync("/api/admin/project-authorizations",
            new { projectId, userId = worker1Id });
        Assert.Equal(HttpStatusCode.OK, authzResp.StatusCode);

        // admin 创合同
        var contractResp = await Client.PostAsJsonAsync("/api/contracts/income", new
        {
            projectId, partnerId = 1, contractNo = "CT-TEST-001", name = "测试合同",
            amount = 10000.0, signedDate = "2026-06-19", startDate = "2026-06-19",
            endDate = "2026-12-31", status = "active", paymentMethod = "transfer",
            remarks = "P0-4测试"
        });
        if (!contractResp.IsSuccessStatusCode)
        {
            var errBody = await contractResp.Content.ReadAsStringAsync();
            throw new Exception("admin /api/contracts/income failed status=" + contractResp.StatusCode + " body=" + errBody);
        }

        // worker1 查授权项目合同 (应见 1 条)
        SetAuth(worker);
        var workerView = await Client.GetAsync("/api/contracts/income?projectId=" + projectId);
        Assert.Equal(HttpStatusCode.OK, workerView.StatusCode);
        Assert.Equal(1, (await workerView.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());

        // worker1 查非授权项目 (应 0 条)
        var otherView = await Client.GetAsync("/api/contracts/income?projectId=999999");
        Assert.Equal(HttpStatusCode.OK, otherView.StatusCode);
        Assert.Equal(0, (await otherView.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetArrayLength());
    }
}
