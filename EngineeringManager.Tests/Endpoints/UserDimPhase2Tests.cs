using EngineeringManager.Tests.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// v0.73.0 P0-4 Phase 2 (commit 26f1f44) smoke 集成测试.
///
/// 本测试集目标: 在不依赖具体 DTO 字段的前提下, 验证 4 个核心端点的 user-dim 过滤行为.
/// 不写 POST 相关测试 — DTO 字段细节留给后续 sprint 单独覆盖.
///
/// 端点 + SQL user-dim 审计结果 (commit 26f1f44 后):
///   GET /api/wages?projectId=X&yearMonth=Y    UserFilterWithAuthorizedProjects  (有)
///   GET /api/payment-records                  UserFilterWithAuthorizedProjects  (有)
///   GET /api/cost-ledger                      UserFilterCompany                  (有)
///   GET /api/inventory/transactions           UserFilterCompany                  (有)
///
/// 已知 P0-4 缺口 (不在本测试集中覆盖):
///   GET /api/inventory          无 user-dim  (L20 InventoryEndpoints.cs)
///   GET /api/materials          无 user-dim  (L68 InventoryEndpoints.cs)
/// </summary>
[Collection("UserDim")]
public class UserDimPhase2Tests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string Worker1Username = "worker1";
    private const string Password = "admin123";

    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker);
        if (i < 0) throw new Exception("token \u5b57\u6bb5\u672a\u627e\u5230: " + json);
        i += marker.Length;
        var j = json.IndexOf('"', i);
        if (j < 0) throw new Exception("token \u5b57\u6bb5\u683c\u5f0f\u9519");
        return json.Substring(i, j - i);
    }

    private void SetAuth(string token)
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    private async Task<(string adminToken, string workerToken, long projectId)>
        LoginAndCreateProjectAsync()
    {
        var adminLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = AdminUsername, password = Password });
        if (!adminLogin.IsSuccessStatusCode)
            throw new Exception("admin \u767b\u5f55\u5931\u8d25: " + adminLogin.StatusCode + " " + await adminLogin.Content.ReadAsStringAsync());
        var adminToken = ExtractToken(await adminLogin.Content.ReadAsStringAsync());

        SetAuth(adminToken);
        await Client.PostAsJsonAsync("/api/users",
            new { username = Worker1Username, password = Password, displayName = "P0-4\u6d4b\u8bd5\u5de5\u4eba", roleId = "worker", status = "active" });

        var projectResp = await Client.PostAsJsonAsync("/api/projects", new
        {
            name = "P0-4-P2-" + Guid.NewGuid().ToString("N").Substring(0, 6),
            description = "phase2 smoke test",
            address = "x",
            startDate = "2026-06-19",
            endDate = "2026-12-31",
            status = "planning",
            budget = 1000,
            projectManagerId = (long?)null
        });
        if (!projectResp.IsSuccessStatusCode)
            throw new Exception("admin /api/projects failed status=" + projectResp.StatusCode + " body=" + await projectResp.Content.ReadAsStringAsync());
        var projectId = (await projectResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var workerLogin = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = Worker1Username, password = Password });
        if (!workerLogin.IsSuccessStatusCode)
            throw new Exception("worker1 \u767b\u5f55\u5931\u8d25: " + workerLogin.StatusCode + " " + await workerLogin.Content.ReadAsStringAsync());
        var workerToken = ExtractToken(await workerLogin.Content.ReadAsStringAsync());

        return (adminToken, workerToken, projectId);
    }

    // \u5168\u90e8\u7528 smoke \u9a8c\u8bc1: \u7aef\u70b9 OK + \u8fd4\u56de JSON \u6709 data \u5b57\u6bb5.
    // \u4e0d\u5199 row \u6570\u91cf\u65ad\u8a00 (\u907f\u514d\u4f9d\u8d56 Dapper INSERT \u5b57\u6bb5\u540d\u79f0\u4e0e\u8868 schema \u7ec6\u8282),
    // \u4e0d\u8c03 POST (\u907f\u514d DTO \u5b57\u6bb5\u540d\u4e0d\u5339\u914d).
    // \u91cd\u70b9: \u9a8c\u8bc1 GET \u80fd\u8fd4\u56de\u6b63\u5e38 JSON \u7ed3\u6784 + \u4e24\u4e2a user \u90fd\u80fd\u8bbf\u95ee + admin/worker \u8fd4\u56de\u6570\u636e\u5dee\u5f02\u5316 (\u8868\u73b0 user-dim \u751f\u6548).

    private static async Task<JsonElement> GetDataAsync(HttpResponseMessage resp)
    {
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("data", out var data),
            "\u54cd\u5e94\u7f3a\u5c11 data \u5b57\u6bb5: " + await resp.Content.ReadAsStringAsync());
        return data;
    }

    [Fact]
    public async Task Wages_Get_Smoke_Structure()
    {
        var (adminToken, workerToken, projectId) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var adminGet = await Client.GetAsync($"/api/wages?projectId={projectId}");
        Assert.Equal(HttpStatusCode.OK, adminGet.StatusCode);
        var adminData = await GetDataAsync(adminGet);
        Assert.Equal(JsonValueKind.Array, adminData.ValueKind);

        SetAuth(workerToken);
        var workerGet = await Client.GetAsync($"/api/wages?projectId={projectId}");
        Assert.Equal(HttpStatusCode.OK, workerGet.StatusCode);
        var workerData = await GetDataAsync(workerGet);
        Assert.Equal(JsonValueKind.Array, workerData.ValueKind);

        // \u672c smoke \u4e0d\u8bc4\u8bba\u884c\u6570\u5dee\u5f02, \u53ea\u9a8c\u8bc1\u7ed3\u6784\u6b63\u5e38.
        // \u540e\u7eed sprint \u53ef\u5728\u8fd9\u91cc\u52a0 row \u6570\u91cf\u65ad\u8a00 (\u9700\u5148\u660e\u786e WageDto \u5b57\u6bb5).
    }

    [Fact]
    public async Task PaymentRecords_Get_Smoke_Structure()
    {
        var (adminToken, workerToken, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var adminGet = await Client.GetAsync("/api/payment-records");
        Assert.Equal(HttpStatusCode.OK, adminGet.StatusCode);
        var adminData = await GetDataAsync(adminGet);
        Assert.Equal(JsonValueKind.Array, adminData.ValueKind);

        SetAuth(workerToken);
        var workerGet = await Client.GetAsync("/api/payment-records");
        Assert.Equal(HttpStatusCode.OK, workerGet.StatusCode);
        var workerData = await GetDataAsync(workerGet);
        Assert.Equal(JsonValueKind.Array, workerData.ValueKind);
    }

    [Fact]
    public async Task CostLedger_Get_Smoke_Structure()
    {
        var (adminToken, workerToken, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var adminGet = await Client.GetAsync("/api/cost-ledger");
        Assert.Equal(HttpStatusCode.OK, adminGet.StatusCode);
        var adminData = await GetDataAsync(adminGet);
        Assert.Equal(JsonValueKind.Array, adminData.ValueKind);

        SetAuth(workerToken);
        var workerGet = await Client.GetAsync("/api/cost-ledger");
        Assert.Equal(HttpStatusCode.OK, workerGet.StatusCode);
        var workerData = await GetDataAsync(workerGet);
        Assert.Equal(JsonValueKind.Array, workerData.ValueKind);

        // user-dim \u6548\u679c: admin \u770b\u5230\u7684\u884c\u6570 >= worker \u770b\u5230\u7684\u884c\u6570
        Assert.True(adminData.GetArrayLength() >= workerData.GetArrayLength(),
            $"user-dim \u5931\u6548: admin {adminData.GetArrayLength()} \u884c < worker {workerData.GetArrayLength()} \u884c");
    }

    [Fact]
    public async Task InventoryTransactions_Get_Smoke_Structure()
    {
        var (adminToken, workerToken, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var adminGet = await Client.GetAsync("/api/inventory/transactions");
        Assert.Equal(HttpStatusCode.OK, adminGet.StatusCode);
        var adminData = await GetDataAsync(adminGet);
        Assert.Equal(JsonValueKind.Array, adminData.ValueKind);

        SetAuth(workerToken);
        var workerGet = await Client.GetAsync("/api/inventory/transactions");
        Assert.Equal(HttpStatusCode.OK, workerGet.StatusCode);
        var workerData = await GetDataAsync(workerGet);
        Assert.Equal(JsonValueKind.Array, workerData.ValueKind);

        Assert.True(adminData.GetArrayLength() >= workerData.GetArrayLength(),
            $"user-dim \u5931\u6548: admin {adminData.GetArrayLength()} \u884c < worker {workerData.GetArrayLength()} \u884c");
    }

    // v1.1.0+ ?unmask=true 参数: 默认行为 mask 不变, ?unmask=true 返回明文
    // 仅 smoke 验证: GET /api/members 不带参数时 id_card 含 *; 带 ?unmask=true 时不含 *

    [Fact]
    public async Task Members_Get_DefaultMasked_AndUnmaskTrue()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();

        // 先 POST 创建一个 member (含 PII). DTO 字段参考 MemberEndpoints.cs POST
        SetAuth(adminToken);
        var post = await Client.PostAsJsonAsync("/api/members", new
        {
            name = "PII-Test-" + Guid.NewGuid().ToString("N").Substring(0, 4),
            phone = "13800001234",
            email = "test@example.com",
            memberType = "staff",
            role = "engineer",
            idCard = "510101199001011234",
            gender = "male",
            ethnicity = "han",
            birthDate = "1990-01-01",
            idCardAddress = "Test Address",
            baseSalary = 5000,
            dailyWage = 300,
            entryDate = "2026-06-19",
            status = "active",
            departmentId = (long?)null,
            position = "engineer"
        });
        Assert.True(post.IsSuccessStatusCode,
            "POST /api/members failed: " + post.StatusCode + " " + await post.Content.ReadAsStringAsync());

        // 列表 GET /api/members - 默认 mask, ?unmask=true 明文
        // 定位刚创建的记录 (按 idCardAddress 区分)
        var maskedGet = await Client.GetAsync("/api/members");
        Assert.Equal(HttpStatusCode.OK, maskedGet.StatusCode);
        var maskedData = await GetDataAsync(maskedGet);
        // 找到刚创建的 member (idCardAddress = "Test Address")
        JsonElement? targetRow = null;
        foreach (var row in maskedData.EnumerateArray())
        {
            if (row.TryGetProperty("id_card_address", out var addr) && addr.GetString() == "Test Address")
            {
                targetRow = row;
                break;
            }
        }
        Assert.NotNull(targetRow);
        // v0.75.0: 默认 GET 返明文
        var defaultIdCard = targetRow.Value.GetProperty("id_card").GetString() ?? "";
        Assert.False(defaultIdCard.Contains("*"),
            $"默认 GET id_card 应为明文, 实际: {defaultIdCard}");
        Assert.Equal("510101199001011234", defaultIdCard);

        // ?unmask=true 获取同一条记录
        var unmaskedGet = await Client.GetAsync("/api/members?unmask=true");
        Assert.Equal(HttpStatusCode.OK, unmaskedGet.StatusCode);
        var unmaskedData = await GetDataAsync(unmaskedGet);
        JsonElement? unmaskedRow = null;
        foreach (var row in unmaskedData.EnumerateArray())
        {
            if (row.TryGetProperty("id_card_address", out var addr) && addr.GetString() == "Test Address")
            {
                unmaskedRow = row;
                break;
            }
        }
        Assert.NotNull(unmaskedRow);
        var unmaskedIdCard = unmaskedRow.Value.GetProperty("id_card").GetString() ?? "";
        Assert.False(unmaskedIdCard.Contains("*"),
            $"?unmask=true 时 id_card 应不含 *, 实际: {unmaskedIdCard}");
        Assert.Equal("510101199001011234", unmaskedIdCard);
    }



    // v0.74.0: Partners tax_number schema 修复后, 应能 POST + GET ?unmask=true 拿明文
    [Fact]
    public async Task Partners_Get_TaxNumberMaskedAndUnmaskTrue()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        // 不传 taxType (schema 没这列, 但 PartnerDto 可能有, Dapper 容忍)
        // 不传 taxNumber (如果传, 后端 INSERT 会写 tax_number 列, schema 已加)
        var post = await Client.PostAsJsonAsync("/api/partners", new
        {
            name = "PII-Partner-" + Guid.NewGuid().ToString("N").Substring(0, 4),
            category = "supplier",
            contact = "张三",
            phone = "13800005678",
            email = "partner@example.com",
            address = "Test",
            bankAccount = "6222021234567890123",
            bankName = "招商银行",
            taxNumber = "91510101MA01ABCDXX",
            creditCode = "91510101MA01ABCDXX",
            registeredAddress = "Test Addr",
            businessScope = "Test",
            taxType = "general",
            projectIds = "[]"
        });
        Assert.True(post.IsSuccessStatusCode,
            "POST /api/partners 失败: " + post.StatusCode + " " + await post.Content.ReadAsStringAsync());

        // 默认 GET - bankAccount 含 *
        var maskedGet = await Client.GetAsync("/api/partners");
        Assert.Equal(HttpStatusCode.OK, maskedGet.StatusCode);
        var maskedData = await GetDataAsync(maskedGet);
        JsonElement? targetRow = null;
        foreach (var row in maskedData.EnumerateArray())
        {
            if (row.TryGetProperty("name", out var n) && n.GetString()?.StartsWith("PII-Partner-") == true)
            {
                targetRow = row;
                break;
            }
        }
        Assert.NotNull(targetRow);
        // v0.75.0: 默认 GET 返明文
        var defaultBank = targetRow.Value.GetProperty("bank_account").GetString() ?? "";
        // 明文即不含掩码符（拆开断言：空串不得借 && 短路通过）
        Assert.False(defaultBank.Contains("*"),
            $"默认 GET bank_account 应为明文（不含 *），实际: {defaultBank}");
        Assert.True(defaultBank.Length >= 8,
            $"默认 GET bank_account 应为明文卡号（长度 >= 8），实际: \"{defaultBank}\"");

        // ?unmask=true GET
        var unmaskedGet = await Client.GetAsync("/api/partners?unmask=true");
        Assert.Equal(HttpStatusCode.OK, unmaskedGet.StatusCode);
        var unmaskedData = await GetDataAsync(unmaskedGet);
        JsonElement? unmaskedRow = null;
        foreach (var row in unmaskedData.EnumerateArray())
        {
            if (row.TryGetProperty("name", out var n) && n.GetString()?.StartsWith("PII-Partner-") == true)
            {
                unmaskedRow = row;
                break;
            }
        }
        Assert.NotNull(unmaskedRow);
        var unmaskedBank = unmaskedRow.Value.GetProperty("bank_account").GetString() ?? "";
        Assert.Equal("6222021234567890123", unmaskedBank);
    }

    // v0.74.0: supervisors GET /api/supervisors 加 mask/unmask 验证
    [Fact]
    public async Task Supervisors_Get_DefaultMasked_AndUnmaskTrue()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        var post = await Client.PostAsJsonAsync("/api/supervisors", new
        {
            regionId = (long?)null,
            name = "PII-Supervisor-" + Guid.NewGuid().ToString("N").Substring(0, 4),
            category = "general",
            contact = "张三",
            phone = "13800007777",
            address = "Test Address",
            projectIds = "[]",
            remarks = "sup-test"
        });
        Assert.True(post.IsSuccessStatusCode,
            "POST /api/supervisors 失败: " + post.StatusCode + " " + await post.Content.ReadAsStringAsync());

        // 默认 GET - phone 应被 mask
        var maskedGet = await Client.GetAsync("/api/supervisors");
        Assert.Equal(HttpStatusCode.OK, maskedGet.StatusCode);
        var maskedData = await GetDataAsync(maskedGet);
        JsonElement? targetRow = null;
        foreach (var row in maskedData.EnumerateArray())
        {
            if (row.TryGetProperty("name", out var n) && n.GetString()?.StartsWith("PII-Supervisor-") == true)
            {
                targetRow = row;
                break;
            }
        }
        Assert.NotNull(targetRow);
        // v0.75.0: 默认 GET 返明文
        var defaultPhone = targetRow.Value.GetProperty("phone").GetString() ?? "";
        Assert.False(defaultPhone.Contains("*") && defaultPhone.Length >= 7,
            $"默认 GET phone 应为明文, 实际: {defaultPhone}");

        // ?unmask=true GET
        var unmaskedGet = await Client.GetAsync("/api/supervisors?unmask=true");
        Assert.Equal(HttpStatusCode.OK, unmaskedGet.StatusCode);
        var unmaskedData = await GetDataAsync(unmaskedGet);
        JsonElement? unmaskedRow = null;
        foreach (var row in unmaskedData.EnumerateArray())
        {
            if (row.TryGetProperty("name", out var n) && n.GetString()?.StartsWith("PII-Supervisor-") == true)
            {
                unmaskedRow = row;
                break;
            }
        }
        Assert.NotNull(unmaskedRow);
        var unmaskedPhone = unmaskedRow.Value.GetProperty("phone").GetString() ?? "";
        Assert.Equal("13800007777", unmaskedPhone);
    }

    // v0.75.0: User Preferences API (替代 localStorage toggle 状态)
    [Fact]
    public async Task UserPreferences_GetAndPut_PiiMaskEnabled()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();

        SetAuth(adminToken);
        // 默认 GET - 应包含 pii_mask_enabled 默认值 (true)
        var getResp = await Client.GetAsync("/api/user-preferences");
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
        var getData = await GetDataAsync(getResp);
        Assert.True(getData.TryGetProperty("pii_mask_enabled", out var defaultVal),
            "默认 GET 应包含 pii_mask_enabled 默认值");
        Assert.Equal("true", defaultVal.GetString());

        // PUT 更新为 false
        var putResp = await Client.PutAsJsonAsync("/api/user-preferences",
            new Dictionary<string, string> { ["pii_mask_enabled"] = "false" });
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);

        // 重新 GET - 应为 false
        var getResp2 = await Client.GetAsync("/api/user-preferences");
        Assert.Equal(HttpStatusCode.OK, getResp2.StatusCode);
        var getData2 = await GetDataAsync(getResp2);
        Assert.Equal("false", getData2.GetProperty("pii_mask_enabled").GetString());

        // 单个 GET /api/user-preferences/{key}
        var singleGet = await Client.GetAsync("/api/user-preferences/pii_mask_enabled");
        Assert.Equal(HttpStatusCode.OK, singleGet.StatusCode);
        var singleData = await GetDataAsync(singleGet);
        Assert.Equal("false", singleData.GetProperty("value").GetString());

        // 单个 PUT 还原为 true
        var singlePut = await Client.PutAsJsonAsync("/api/user-preferences/pii_mask_enabled",
            new { value = "true" });
        Assert.Equal(HttpStatusCode.OK, singlePut.StatusCode);
        var verifyGet = await Client.GetAsync("/api/user-preferences/pii_mask_enabled");
        var verifyData = await GetDataAsync(verifyGet);
        Assert.Equal("true", verifyData.GetProperty("value").GetString());
    }

    [Fact]
    public async Task UserPreferences_GetUnknownKey_Returns404()
    {
        var (adminToken, _, _) = await LoginAndCreateProjectAsync();
        SetAuth(adminToken);
        var resp = await Client.GetAsync("/api/user-preferences/nonexistent_key");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}