using System.Net.Http.Json;
using EngineeringManager.Api;
using EngineeringManager.Tests.Common;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// 27.2(d): GET /api/config 的 warning 字段透传测试（F1）。
///
/// 端点级限制（如实说明）：GetEdition() 为静态缓存薄壳（_cachedEdition 进程级缓存），
/// 且 config 路径硬编码 %APPDATA%\工程管家\config.json，端点级无法可靠拿到「坏 config」的干净状态。
/// 因此：
///   - 「坏 config → warning 出现」的解析逻辑由 EditionResolverTests 纯函数测试覆盖（用例 4/5）。
///   - 本测试用反射注入 _editionWarning 验证【透传层】——SystemEndpoints 是否把 warning 放进响应。
///     这是对 SystemEndpoints 代码本身的验证（非恒真：若删掉 warning 字段，测试红）。
/// </summary>
public class SystemEndpointsConfigTests : ApiTestBase
{
    // 反射注入 _editionWarning（只动 warning 字段，不动 _cachedEdition / 环境变量）
    private static void SetEditionWarning(string? warning)
    {
        var field = typeof(ApiConfig).GetField("_editionWarning",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        field!.SetValue(null, warning);
    }

    [Fact]
    public async Task GetConfig_WarningSet_ResponseContainsWarning()
    {
        try
        {
            SetEditionWarning("config read failed, running as personal");
            var res = await Client.GetAsync("/api/config");
            res.EnsureSuccessStatusCode();
            var json = await res.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            // Common.Ok 包装：{ success, data: {...} }，warning 在 data 内
            Assert.True(json.TryGetProperty("data", out var data), "data field must exist");
            Assert.True(data.TryGetProperty("warning", out var w), "warning field must exist when _editionWarning set");
            Assert.Equal("config read failed, running as personal", w.GetString());
        }
        finally { SetEditionWarning(null); }
    }

    [Fact]
    public async Task GetConfig_NoWarning_ResponseHasNoWarningField()
    {
        try
        {
            SetEditionWarning(null);
            var res = await Client.GetAsync("/api/config");
            res.EnsureSuccessStatusCode();
            var json = await res.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            // 字段不存在（不是空串，是不存在）
            Assert.True(json.TryGetProperty("data", out var data), "data field must exist");
            Assert.False(data.TryGetProperty("warning", out _), "warning field must NOT exist when _editionWarning is null");
        }
        finally { SetEditionWarning(null); }
    }

    [Fact]
    public async Task GetConfig_AlwaysContainsEditionAndFeatures()
    {
        var res = await Client.GetAsync("/api/config");
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(json.TryGetProperty("data", out var data), "data field must exist");
        Assert.True(data.TryGetProperty("edition", out var edition));
        Assert.True(edition.GetString() == "enterprise" || edition.GetString() == "personal");
        Assert.True(data.TryGetProperty("features", out _));
    }
}
