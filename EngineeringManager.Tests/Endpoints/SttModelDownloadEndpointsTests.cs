using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EngineeringManager.Api.Services.Stt;
using EngineeringManager.Tests.Common;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// 模型下载中心端点测试：状态接口结构 / 下载接口鉴权与未知引擎 / 同引擎重复触发闸 /
/// 手动放置项拒绝。
/// 与 M2FourthRoundTests 共用 SttModelManager 静态注入点（EngineDirProvider），
/// 必须同集合串行，否则互相覆盖导致 flaky。
/// </summary>
[Collection("M2FifthRound")]
public class SttModelDownloadEndpointsTests : ApiTestBase, IDisposable
{
    private readonly string _tempDir;

    public SttModelDownloadEndpointsTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"stt-ep-models-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        SttModelManager.SetEngineDirProvider(() => _tempDir);
    }

    void IDisposable.Dispose()
    {
        SttModelManager.SetEngineDirProvider(null);
        SttModelManager.SetDownloadDelegate(null);
        try { Directory.Delete(_tempDir, true); } catch { }
        base.Dispose();
    }

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

    private async Task<string> LoginAdminAsync()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });
        login.EnsureSuccessStatusCode();
        return ExtractTokenFromJson(await login.Content.ReadAsStringAsync());
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    // ═══════════════════════════════════════════════════════════
    // 状态接口
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task ModelsStatus_Unauthorized_WithoutLogin()
    {
        var resp = await Client.GetAsync("/api/stt/models/status");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task ModelsStatus_ReturnsTwoEnginesWithMissingFiles()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.GetAsync("/api/stt/models/status");
        resp.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        Assert.True(root.GetProperty("success").GetBoolean());

        var engines = root.GetProperty("data").GetProperty("engines").EnumerateArray().ToList();
        Assert.Equal(2, engines.Count);

        foreach (var e in engines)
        {
            Assert.False(string.IsNullOrWhiteSpace(e.GetProperty("engineId").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(e.GetProperty("displayName").GetString()));
            Assert.False(e.GetProperty("ready").GetBoolean()); // 空目录：全部未就绪
            Assert.True(e.GetProperty("missingBytes").GetInt64() > 0);
            Assert.NotEmpty(e.GetProperty("missingFiles").EnumerateArray());
            foreach (var f in e.GetProperty("missingFiles").EnumerateArray())
            {
                Assert.False(string.IsNullOrWhiteSpace(f.GetProperty("relPath").GetString()));
                Assert.True(f.GetProperty("bytes").GetInt64() > 0);
                Assert.True(f.GetProperty("downloadable").GetBoolean()); // 当前两个现役引擎的清单文件全部有已验证地址
            }
        }
    }

    [Fact]
    public async Task ModelsStatus_ReadyEngine_ReportsReadyAndNoMissing()
    {
        foreach (var f in SttModelManager.FindEngineSpec(ParaformerEngine.EngineId)!.Files)
        {
            var full = Path.Combine(_tempDir, f.RelPath.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(full)!);
            using var fs = File.Create(full);
            fs.SetLength(f.Bytes);
        }

        SetAuth(await LoginAdminAsync());
        var resp = await Client.GetAsync("/api/stt/models/status");
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var para = doc.RootElement.GetProperty("data").GetProperty("engines")
            .EnumerateArray().First(e => e.GetProperty("engineId").GetString() == ParaformerEngine.EngineId);

        Assert.True(para.GetProperty("ready").GetBoolean());
        Assert.Equal(0, para.GetProperty("missingBytes").GetInt64());
        Assert.Empty(para.GetProperty("missingFiles").EnumerateArray());
    }

    // ═══════════════════════════════════════════════════════════
    // 下载接口
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task Download_Unauthorized_WithoutLogin()
    {
        var resp = await Client.PostAsync($"/api/stt/models/{ParaformerEngine.EngineId}/download", null);
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Download_UnknownEngine_Returns400()
    {
        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsync("/api/stt/models/no-such-engine/download", null);
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        Assert.False(doc.RootElement.GetProperty("success").GetBoolean());
        Assert.Contains("未知引擎", doc.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Download_AlreadyReady_IsNoOp()
    {
        foreach (var f in SttModelManager.FindEngineSpec(ParaformerEngine.EngineId)!.Files)
        {
            var full = Path.Combine(_tempDir, f.RelPath.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(full)!);
            using var fs = File.Create(full);
            fs.SetLength(f.Bytes);
        }
        var calls = 0;
        SttModelManager.SetDownloadDelegate((_, _, _) => { Interlocked.Increment(ref calls); return Task.CompletedTask; });

        SetAuth(await LoginAdminAsync());
        var resp = await Client.PostAsync($"/api/stt/models/{ParaformerEngine.EngineId}/download", null);
        resp.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        Assert.True(doc.RootElement.GetProperty("data").GetProperty("alreadyReady").GetBoolean());
        Assert.Equal(0, calls);
    }

    [Fact]
    public async Task Download_SecondTriggerWhileRunning_ReturnsAlreadyRunning()
    {
        var gate = new TaskCompletionSource();
        SttModelManager.SetDownloadDelegate(async (_, destPath, _) =>
        {
            await gate.Task;
            Directory.CreateDirectory(Path.GetDirectoryName(destPath)!);
            using var fs = File.Create(destPath);
            fs.SetLength(75756);
        });

        SetAuth(await LoginAdminAsync());
        var first = await Client.PostAsync($"/api/stt/models/{ParaformerEngine.EngineId}/download", null);
        first.EnsureSuccessStatusCode();
        using (var doc1 = JsonDocument.Parse(await first.Content.ReadAsStringAsync()))
            Assert.True(doc1.RootElement.GetProperty("data").GetProperty("accepted").GetBoolean());

        var second = await Client.PostAsync($"/api/stt/models/{ParaformerEngine.EngineId}/download", null);
        second.EnsureSuccessStatusCode();
        using var doc2 = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        Assert.True(doc2.RootElement.GetProperty("data").GetProperty("alreadyRunning").GetBoolean());

        gate.SetResult();
        // 等后台跑完（第二项大小不符 → error），避免影响后续测试
        for (var i = 0; i < 400 && SttModelManager.IsModelDownloadActive(ParaformerEngine.EngineId); i++)
            await Task.Delay(25);
    }

    [Fact]
    public void Download_ManualPlacementFile_NotDownloadable()
    {
        // 手动放置项（无验证地址）→ Downloadable=false，是 UI 显示"找管理员拷"的依据；
        // 下载接口对含此类项的引擎直接拒绝，不会下到一半卡住
        var spec = new SttModelManager.SttModelFileSpec { RelPath = "manual/x.bin", Bytes = 1 };
        Assert.False(spec.Downloadable);

        // 两个现役引擎当前均无可下载项（地址全部经验证）
        foreach (var s in SttModelManager.ModelManifest)
            Assert.All(s.Files, f => Assert.True(f.Downloadable, $"{s.EngineId} 的 {f.RelPath} 无地址"));
    }
}
