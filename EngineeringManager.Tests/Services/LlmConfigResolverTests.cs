using System.Text.Json;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EngineeringManager.Tests.Services;

/// <summary>
/// 回归：LlmConfigResolver.ToInMemory 必须把持久化 DTO 的 ProxyUrl 拷入内存配置。
/// 此前漏拷导致：保存代理后回显被清空、运行时 BuildClient 拿不到代理、重启后代理丢失。
/// </summary>
public class LlmConfigResolverTests
{
    private static PersistedMultiConfig Persisted(string? proxyUrl)
        => new()
        {
            ActiveProviderId = "p1",
            UseBuiltIn = false,
            Temperature = 0.3,
            MaxTokens = 2048,
            ProxyUrl = proxyUrl,
            Providers =
            [
                new PersistedProviderEntry
                {
                    Id = "p1",
                    Name = "测试服务商",
                    BaseUrl = "https://api.example.com/v1",
                    ApiKeyEnc = "",
                    Models = [new() { Id = "model-a" }],
                    ActiveModelId = "model-a",
                },
            ],
        };

    [Fact]
    public void ToInMemory_保留ProxyUrl()
    {
        var result = LlmConfigResolver.ToInMemory(Persisted("http://127.0.0.1:7890"));
        Assert.Equal("http://127.0.0.1:7890", result.ProxyUrl);
    }

    [Fact]
    public void ToInMemory_空ProxyUrl_保持null()
    {
        var result = LlmConfigResolver.ToInMemory(Persisted(null));
        Assert.Null(result.ProxyUrl);
    }

    [Fact]
    public void ToInMemory_保留Temperature和MaxTokens()
    {
        var result = LlmConfigResolver.ToInMemory(Persisted("http://127.0.0.1:7890"));
        Assert.Equal(0.3, result.Temperature);
        Assert.Equal(2048, result.MaxTokens);
    }

    /// <summary>
    /// 回归：旧版单配置迁移时温度/MaxTokens 零值补推荐默认（0.7/4096）。
    /// 旧结构没有这两个字段（C# 默认 0），不补默认会让设置页回显 0.0。
    /// </summary>
    [Fact]
    public void MigrateLegacyPersisted_零值温度和MaxTokens_补默认()
    {
        var legacy = new PersistedLlmConfig { ProviderName = "OpenAI" };
        var migrated = LlmConfigResolver.MigrateLegacyPersisted(legacy);
        Assert.Equal(0.7, migrated.Temperature);
        Assert.Equal(4096, migrated.MaxTokens);
    }

    [Fact]
    public void MigrateLegacyPersisted_显式温度和MaxTokens_原样保留()
    {
        var legacy = new PersistedLlmConfig { ProviderName = "OpenAI", Temperature = 0.2, MaxTokens = 8192 };
        var migrated = LlmConfigResolver.MigrateLegacyPersisted(legacy);
        Assert.Equal(0.2, migrated.Temperature);
        Assert.Equal(8192, migrated.MaxTokens);
    }
}

/// <summary>
/// 2026-09-07 数据丢失事故回归：UseBuiltIn=true 时持久化服务商列表必须完整加载。
/// 事故链：ResolveMulti 按内置模式弃用整份持久化配置 → 内存 providers 清空 →
/// 前端整态自动保存把空列表写回磁盘，用户服务商整体丢失。加载必须忠实于文件，
/// 内置与否只影响 ExpandMulti 展开的调用生效方。
/// 挂 G2 Env-Isolated 集合：与所有改 ENGINEERING_MANAGER_DATA_PATH 的测试串行，防并行互踩。
/// </summary>
[Collection("G2 Env-Isolated WritePermission Tests")]
public class LlmConfigResolverLoadRegressionTests : IDisposable
{
    private readonly string? _oldDataPath;
    private readonly string _isolatedDataPath;

    public LlmConfigResolverLoadRegressionTests()
    {
        _oldDataPath = Environment.GetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH");
        _isolatedDataPath = Path.Combine(Path.GetTempPath(), $"llm-cfg-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_isolatedDataPath);
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH", _isolatedDataPath);
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_DATA_PATH", _oldDataPath);
        try { Directory.Delete(_isolatedDataPath, recursive: true); } catch { /* 临时目录清理尽力而为 */ }
    }

    private static LlmConfigResolver NewResolver()
        => new(NullLogger<LlmConfigResolver>.Instance, new ConfigurationBuilder().Build());

    private static PersistedMultiConfig Persisted(bool useBuiltIn, params string[] providerNames)
        => new()
        {
            ActiveProviderId = providerNames.Length > 0 ? "p0" : null,
            UseBuiltIn = useBuiltIn,
            Temperature = 0.2,
            MaxTokens = 16384,
            Providers = providerNames.Select((name, i) => new PersistedProviderEntry
            {
                Id = $"p{i}",
                Name = name,
                BaseUrl = $"https://api-{i}.example.com/v1",
                ApiKeyEnc = "",
                Models = [new() { Id = "model-a" }],
                ActiveModelId = "model-a",
            }).ToList(),
        };

    private static MultiProviderConfig InMemory(string providerName)
        => new()
        {
            ActiveProviderId = "p0",
            UseBuiltIn = false,
            Temperature = 0.7,
            MaxTokens = 4096,
            Providers = [new ProviderEntry
            {
                Id = "p0",
                Name = providerName,
                BaseUrl = "https://api.example.com/v1",
                ApiKey = "sk-test",
                Models = [new() { Id = "model-a" }],
                ActiveModelId = "model-a",
            }],
        };

    /// <summary>复刻事故现场：UseBuiltIn=true + 有服务商的文件，构造加载后服务商必须原样在</summary>
    [Fact]
    public void 加载_UseBuiltIn为true_服务商完整加载()
    {
        var filePath = Path.Combine(_isolatedDataPath, "llm-config.dpapi.json");
        File.WriteAllText(filePath,
            JsonSerializer.Serialize(Persisted(true, "甲服务商", "乙服务商"), new JsonSerializerOptions { WriteIndented = true }));

        var multi = NewResolver().GetMultiWithKey();

        Assert.Equal(2, multi.Providers.Count);
        Assert.True(multi.UseBuiltIn);
        Assert.Equal("p0", multi.ActiveProviderId);
    }

    /// <summary>修复只让「加载」忠实于文件：调用生效方仍由 ExpandMulti 决定，内置模式照常展开 Agnes</summary>
    [Fact]
    public void 加载_UseBuiltIn为true_调用方展开仍走内置Agnes()
    {
        var filePath = Path.Combine(_isolatedDataPath, "llm-config.dpapi.json");
        File.WriteAllText(filePath,
            JsonSerializer.Serialize(Persisted(true, "甲服务商"), new JsonSerializerOptions { WriteIndented = true }));

        var config = NewResolver().GetConfig();

        Assert.Equal("Agnes", config.ProviderName);
        Assert.True(config.UseBuiltIn);
    }

    /// <summary>安全网：每次覆盖落盘前把上一版存成 .bak，事故后至少能回滚一步</summary>
    [Fact]
    public async Task 保存_覆盖前写bak单代备份()
    {
        var resolver = NewResolver();
        await resolver.SaveMultiConfigAsync(InMemory("旧服务商"));
        await resolver.SaveMultiConfigAsync(InMemory("新服务商"));

        // 落盘 JSON 默认编码器把非 ASCII 转义为 \uXXXX，故断言语义（解析后取 Name）而非原始子串
        var bak = JsonDocument.Parse(File.ReadAllText(Path.Combine(_isolatedDataPath, "llm-config.dpapi.json.bak")));
        Assert.Equal("旧服务商", bak.RootElement.GetProperty("Providers")[0].GetProperty("Name").GetString());
        var current = JsonDocument.Parse(File.ReadAllText(Path.Combine(_isolatedDataPath, "llm-config.dpapi.json")));
        Assert.Equal("新服务商", current.RootElement.GetProperty("Providers")[0].GetProperty("Name").GetString());
    }
}
