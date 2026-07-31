using EngineeringManager.Tests.Common;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M-REVIEW1 回归测试：本批修复的"从未可用"写端点（原 dynamic dto 缺参必 500）。
///
/// 核心防线：这些端点历史上因 Minimal API 不给 dynamic 绑 body 而缺参必 500，
/// 功能从代码诞生起就是坏的。本测试锁死"POST/PUT 不再返回 500"，防回归。
/// 同时验证 403/404 区分语义（Common.WriteResult）。
///
/// 覆盖端点：contract-templates / templates / payment-records / drawings /
///          expenses(PUT) / inventory-transactions / settlements
/// </summary>
[Collection("UserDim")]
public class ReviewFixRegressionTests : ApiTestBase
{
    private const string AdminUsername = "admin";
    private const string Password = "admin123";

    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker);
        if (i < 0) throw new Exception("token 字段未找到: " + json);
        i += marker.Length;
        var j = json.IndexOf('"', i);
        return json.Substring(i, j - i);
    }

    private async Task LoginAdminAsync()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = AdminUsername, password = Password });
        Assert.True(login.IsSuccessStatusCode, "admin 登录应成功");
        var token = ExtractToken(await login.Content.ReadAsStringAsync());
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    // ── contract-templates：bug#10 本尊 ──

    [Fact]
    public async Task ContractTemplate_PostThenPut_NoServerError()
    {
        await LoginAdminAsync();
        var post = await Client.PostAsJsonAsync("/api/contract-templates",
            new { name = "回归模板-" + Guid.NewGuid().ToString("N")[..6], type = "income", content = "总价{{金额}}", variables = "[]" });
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        var id = (await post.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var put = await Client.PutAsJsonAsync("/api/contract-templates",
            new { id, name = "回归模板改", type = "income", content = "改", variables = "[]" });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        await Client.DeleteAsync($"/api/contract-templates/{id}");
    }

    [Fact]
    public async Task ContractTemplate_PutNonExistent_Returns404()
    {
        await LoginAdminAsync();
        var put = await Client.PutAsJsonAsync("/api/contract-templates",
            new { id = 99999999L, name = "x", type = "income", content = "x", variables = "[]" });
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);
    }

    // ── templates：本批甄别的坏端点 ──

    [Fact]
    public async Task Template_PostThenPut_NoServerError()
    {
        await LoginAdminAsync();
        var post = await Client.PostAsJsonAsync("/api/templates",
            new { name = "回归模板-" + Guid.NewGuid().ToString("N")[..6], category = "contract", description = "正文", variables = "[]" });
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        var id = (await post.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64();

        var put = await Client.PutAsJsonAsync("/api/templates",
            new { id, name = "改", category = "contract", description = "改", variables = "[]" });
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);
    }

    // ── payment-records：本批甄别的坏端点 ──

    [Fact]
    public async Task PaymentRecord_Post_NoServerError()
    {
        await LoginAdminAsync();
        var post = await Client.PostAsJsonAsync("/api/payment-records",
            new { type = "invoice_in", amount = 100.5, recordDate = "2026-07-01", remarks = "回归" });
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
    }

    [Fact]
    public async Task PaymentRecord_PutNonExistent_Returns404()
    {
        await LoginAdminAsync();
        var put = await Client.PutAsJsonAsync("/api/payment-records",
            new { id = 99999999L, type = "invoice_in", amount = 1.0, recordDate = "2026-07-01" });
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);
    }

    // ── drawings / inventory-transactions：本批甄别的坏端点（列名须对齐前端契约+真库，回读验证防假绿）──

    [Fact]
    public async Task Drawing_PostThenRead_UsesCanonicalColumns()
    {
        await LoginAdminAsync();
        var post = await Client.PostAsJsonAsync("/api/drawings",
            new { name = "回归图纸", category = "结构", remarks = "备注", position = "3层", fileName = "t.pdf", fileData = "" });
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        // 回读断言：category/remarks/position 真实落库（前端契约列名，防照死 schema 假绿）
        var list = (await Client.GetFromJsonAsync<JsonElement>("/api/drawings")).GetProperty("data");
        var mine = list.EnumerateArray().FirstOrDefault(d => d.TryGetProperty("name", out var nm) && nm.GetString() == "回归图纸");
        Assert.Equal(JsonValueKind.Object, mine.ValueKind);
        Assert.Equal("结构", mine.GetProperty("category").GetString());
        Assert.Equal("3层", mine.GetProperty("position").GetString());
    }

    [Fact]
    public async Task InventoryTransaction_PostThenRead_UsesCanonicalColumns()
    {
        await LoginAdminAsync();
        // 先建物料以拿到 itemId
        var item = await Client.PostAsJsonAsync("/api/inventory/items", new { name = "回归物料", unit = "个" });
        long itemId = item.IsSuccessStatusCode ? (await item.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data").GetInt64() : 1;
        var post = await Client.PostAsJsonAsync("/api/inventory/transactions",
            new { itemId, type = "purchase", quantity = 5.0, unitPrice = 10.0, totalAmount = 50.0, transactionDate = "2026-07-01", documentNo = "RK-001", remarks = "回归" });
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        // 回读断言：transaction_date/document_no 真实落库（API 返回原始 snake_case 列名）
        var list = (await Client.GetFromJsonAsync<JsonElement>($"/api/inventory/transactions?itemId={itemId}")).GetProperty("data");
        Assert.Contains(list.EnumerateArray(), t => t.TryGetProperty("document_no", out var dn) && dn.GetString() == "RK-001");
    }

    // ── settlements：本批甄别的坏端点（POST 曾引用 settler_id 幽灵列；type 仅 income/expense）──

    [Fact]
    public async Task Settlement_Post_NoServerError()
    {
        await LoginAdminAsync();
        var post = await Client.PostAsJsonAsync("/api/settlements",
            new { type = "income", subType = "labor", name = "回归结算", amount = 200.0, settlementNo = "S-" + Guid.NewGuid().ToString("N")[..6] });
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
    }

    // ── 列漂移全库根治批：inventory item / material / expense / cost-ledger category 创建（对齐前端契约=真库）──

    [Fact]
    public async Task InventoryItem_PostThenRead_UsesCanonicalColumns()
    {
        await LoginAdminAsync();
        var post = await Client.PostAsJsonAsync("/api/inventory",
            new { code = "WL-" + Guid.NewGuid().ToString("N")[..6], name = "回归物料", category = "钢材", unit = "吨", specifications = "HRB400", purchasePrice = 3500.0, salePrice = 3800.0, currentStock = 10.0, minStock = 2.0, maxStock = 100.0, remarks = "回归" });
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
        // 回读断言：current_stock/purchase_price 真实落库（前端契约列名，防照死 schema 假绿）
        var list = (await Client.GetFromJsonAsync<JsonElement>("/api/inventory")).GetProperty("data");
        var mine = list.EnumerateArray().FirstOrDefault(x => x.TryGetProperty("name", out var nm) && nm.GetString() == "回归物料");
        Assert.Equal(JsonValueKind.Object, mine.ValueKind);
        Assert.Equal(10.0, mine.GetProperty("current_stock").GetDouble());
    }

    [Fact]
    public async Task Material_Post_NoServerError()
    {
        await LoginAdminAsync();
        var post = await Client.PostAsJsonAsync("/api/materials",
            new { projectId = (long?)null, name = "回归材料", category = "水泥", unit = "包", quantity = 50.0, price = 25.0 });
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
    }

    [Fact]
    public async Task Expenses_AllEndpoints_Removed_Returns404()
    {
        await LoginAdminAsync();
        // v0.87.0 防复活哨兵：expenses 表及其 4 个端点已移除
        // （GET/POST/DELETE 原在 ExpenseEndpoints.cs，PUT 原在 FileEndpoints.cs）。
        // 任一动词重新出现即失败。
        var get = await Client.GetAsync("/api/expenses");
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
        var post = await Client.PostAsJsonAsync("/api/expenses",
            new { projectId = 1, category = "test", amount = 1.0 });
        Assert.Equal(HttpStatusCode.NotFound, post.StatusCode);
        var put = await Client.PutAsJsonAsync("/api/expenses",
            new { id = 1, category = "test", amount = 1.0 });
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);
        var del = await Client.DeleteAsync("/api/expenses/1");
        Assert.Equal(HttpStatusCode.NotFound, del.StatusCode);
    }

    [Fact]
    public async Task CostLedgerCategory_Post_NoServerError()
    {
        await LoginAdminAsync();
        var post = await Client.PostAsJsonAsync("/api/cost-ledger/categories",
            new { name = "回归分类", direction = "expense", level1 = "材料费", color = "#3b82f6" });
        Assert.NotEqual(HttpStatusCode.InternalServerError, post.StatusCode);
        Assert.Equal(HttpStatusCode.OK, post.StatusCode);
    }
}
