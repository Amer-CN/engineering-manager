using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// 多服务商配置的纯函数测试：展开映射（ExpandMulti）与旧配置迁移（MigrateLegacyPersisted）
/// </summary>
public class MultiProviderConfigTests
{
    private const string BuiltinBaseUrl = "https://apihub.agnes-ai.com/v1";
    private const string BuiltinKey = "builtin-key";
    private const string BuiltinModel = "agnes-2.5-flash";

    private static ProviderEntry MakeProvider(string id = "p1", string name = "DeepSeek") => new()
    {
        Id = id,
        Name = name,
        BaseUrl = "https://api.deepseek.com/v1",
        ApiKey = "sk-test",
        ActiveModelId = "deepseek-chat",
        Models = new List<ProviderModelEntry>
        {
            new() { Id = "deepseek-chat", Input = new List<string> { "text" }, Output = new List<string> { "text" } },
            new() { Id = "deepseek-vl", Input = new List<string> { "text", "image" }, Output = new List<string> { "text" } },
        },
    };

    // ── ExpandMulti ──

    [Fact]
    public void ExpandMulti_UseBuiltIn_ReturnsAgnesFallback()
    {
        var multi = new MultiProviderConfig
        {
            UseBuiltIn = true,
            ActiveProviderId = "p1",
            Providers = new List<ProviderEntry> { MakeProvider() },
            Temperature = 0.5,
            MaxTokens = 8192,
        };

        var cfg = LlmConfigResolver.ExpandMulti(multi, BuiltinBaseUrl, BuiltinKey, BuiltinModel);

        Assert.Equal("Agnes", cfg.ProviderName);
        Assert.Equal(BuiltinBaseUrl, cfg.BaseUrl);
        Assert.Equal(BuiltinKey, cfg.ApiKey);
        Assert.Equal(BuiltinModel, cfg.Model);
        Assert.True(cfg.UseBuiltIn);
        Assert.Equal(new List<string> { BuiltinModel }, cfg.AvailableModels);
        // 用户在设置里保存的参数即使回落内置也生效
        Assert.Equal(0.5, cfg.Temperature);
        Assert.Equal(8192, cfg.MaxTokens);
    }

    [Fact]
    public void ExpandMulti_ActiveProviderMissing_FallsBackToAgnes()
    {
        var multi = new MultiProviderConfig
        {
            UseBuiltIn = false,
            ActiveProviderId = "ghost",
            Providers = new List<ProviderEntry> { MakeProvider() },
        };

        var cfg = LlmConfigResolver.ExpandMulti(multi, BuiltinBaseUrl, BuiltinKey, BuiltinModel);

        Assert.True(cfg.UseBuiltIn);
        Assert.Equal("Agnes", cfg.ProviderName);
    }

    [Fact]
    public void ExpandMulti_ActiveProvider_ExpandsToLegacyShape()
    {
        var multi = new MultiProviderConfig
        {
            UseBuiltIn = false,
            ActiveProviderId = "p1",
            Providers = new List<ProviderEntry> { MakeProvider() },
            Temperature = 0.3,
            MaxTokens = 2048,
        };

        var cfg = LlmConfigResolver.ExpandMulti(multi, BuiltinBaseUrl, BuiltinKey, BuiltinModel);

        Assert.Equal("DeepSeek", cfg.ProviderName);
        Assert.Equal("https://api.deepseek.com/v1", cfg.BaseUrl);
        Assert.Equal("sk-test", cfg.ApiKey);
        Assert.Equal("deepseek-chat", cfg.Model);
        Assert.False(cfg.UseBuiltIn);
        Assert.Equal(new List<string> { "deepseek-chat", "deepseek-vl" }, cfg.AvailableModels);
        // 能力标记按模型 ID 映射
        Assert.Contains("image", cfg.ModelCapabilities["deepseek-vl"].Input);
        Assert.Contains("text", cfg.ModelCapabilities["deepseek-chat"].Input);
        Assert.Equal(0.3, cfg.Temperature);
        Assert.Equal(2048, cfg.MaxTokens);
    }

    [Fact]
    public void NormalizeMulti_RemovesExactAndCaseInsensitiveDuplicates()
    {
        var multi = new MultiProviderConfig
        {
            UseBuiltIn = false,
            ActiveProviderId = "p1",
            Providers = new List<ProviderEntry>
            {
                new()
                {
                    Id = "p1",
                    Name = "Gateway",
                    BaseUrl = "https://gw.example.com/v1",
                    Models = new List<ProviderModelEntry>
                    {
                        new() { Id = "gpt-4o" },
                        new() { Id = "GPT-4O" },           // 大小写变体
                        new() { Id = "gpt-4o" },            // 完全重复
                        new() { Id = " deepseek-chat " },   // 首尾空白
                        new() { Id = "  " },                // 纯空白 → 丢弃
                    },
                    ActiveModelId = "GPT-4O",
                },
            },
        };

        var normalized = LlmConfigResolver.NormalizeMulti(multi);

        var provider = Assert.Single(normalized.Providers);
        // 三种 gpt-4o 变体合并为一条（保留首次出现），空白 trim，纯空白丢弃
        Assert.Equal(2, provider.Models.Count);
        Assert.Equal("gpt-4o", provider.Models[0].Id);
        Assert.Equal("deepseek-chat", provider.Models[1].Id);
        // activeModelId 指向被合并掉的变体 → 校正到去重后的规范 ID
        Assert.Equal("gpt-4o", provider.ActiveModelId);
    }

    [Fact]
    public void NormalizeMulti_DanglingActiveModel_CorrectsToFirst()
    {
        var multi = new MultiProviderConfig
        {
            UseBuiltIn = false,
            ActiveProviderId = "p1",
            Providers = new List<ProviderEntry>
            {
                new()
                {
                    Id = "p1",
                    Name = "X",
                    BaseUrl = "https://x.example.com/v1",
                    Models = new List<ProviderModelEntry> { new() { Id = "m1" }, new() { Id = "m2" } },
                    ActiveModelId = "ghost",
                },
            },
        };

        var normalized = LlmConfigResolver.NormalizeMulti(multi);
        Assert.Equal("m1", Assert.Single(normalized.Providers).ActiveModelId);
    }

    [Fact]
    public void ExpandMulti_ProxyUrl_PassedThroughBothBranches()
    {
        var provider = MakeProvider();
        var custom = new MultiProviderConfig
        {
            UseBuiltIn = false,
            ActiveProviderId = "p1",
            Providers = new List<ProviderEntry> { provider },
            ProxyUrl = "http://127.0.0.1:7890",
        };
        Assert.Equal("http://127.0.0.1:7890",
            LlmConfigResolver.ExpandMulti(custom, BuiltinBaseUrl, BuiltinKey, BuiltinModel).ProxyUrl);

        var builtin = new MultiProviderConfig
        {
            UseBuiltIn = true,
            Providers = new List<ProviderEntry> { provider },
            ProxyUrl = "http://127.0.0.1:7890",
        };
        Assert.Equal("http://127.0.0.1:7890",
            LlmConfigResolver.ExpandMulti(builtin, BuiltinBaseUrl, BuiltinKey, BuiltinModel).ProxyUrl);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("  ", null)]
    [InlineData("127.0.0.1:7890", "http://127.0.0.1:7890")]
    [InlineData("http://127.0.0.1:7890", "http://127.0.0.1:7890")]
    [InlineData("https://proxy.corp.local:8443", "https://proxy.corp.local:8443")]
    public void NormalizeProxyUrl_TrimsAndDefaultsToHttpScheme(string? input, string? expected)
    {
        Assert.Equal(expected, LlmProviderService.NormalizeProxyUrl(input));
    }

    [Fact]
    public void ExpandMulti_EmptyActiveModelId_UsesFirstModel()
    {
        var provider = MakeProvider() with { ActiveModelId = "" };
        var multi = new MultiProviderConfig
        {
            UseBuiltIn = false,
            ActiveProviderId = "p1",
            Providers = new List<ProviderEntry> { provider },
        };

        var cfg = LlmConfigResolver.ExpandMulti(multi, BuiltinBaseUrl, BuiltinKey, BuiltinModel);

        Assert.Equal("deepseek-chat", cfg.Model);
    }

    // ── MigrateLegacyPersisted ──

    [Fact]
    public void MigrateLegacy_CustomConfig_BecomesSingleProvider()
    {
        var legacy = new PersistedLlmConfig
        {
            ProviderName = "DeepSeek",
            BaseUrl = "https://api.deepseek.com/v1",
            ApiKeyEnc = "ENC==",
            Model = "deepseek-chat",
            UseBuiltIn = false,
            Temperature = 0.4,
            MaxTokens = 8192,
            AvailableModels = new List<string> { "deepseek-chat", "deepseek-reasoner" },
            ModelCapabilities = new Dictionary<string, ModelCapability>
            {
                ["deepseek-reasoner"] = new() { Input = new List<string> { "text" }, Output = new List<string> { "text" } },
            },
        };

        var migrated = LlmConfigResolver.MigrateLegacyPersisted(legacy);

        Assert.False(migrated.UseBuiltIn);
        Assert.Equal("default", migrated.ActiveProviderId);
        var provider = Assert.Single(migrated.Providers);
        Assert.Equal("default", provider.Id);
        Assert.Equal("DeepSeek", provider.Name);
        Assert.Equal("ENC==", provider.ApiKeyEnc);          // 加密文本原样搬运
        Assert.Equal("deepseek-chat", provider.ActiveModelId);
        // 模型清单 = availableModels，能力缺失时补默认纯文本
        Assert.Equal(2, provider.Models.Count);
        Assert.Equal("deepseek-chat", provider.Models[0].Id);
        Assert.Equal("deepseek-reasoner", provider.Models[1].Id);
        Assert.Equal(0.4, migrated.Temperature);
        Assert.Equal(8192, migrated.MaxTokens);
    }

    [Fact]
    public void MigrateLegacy_BuiltInConfig_ActiveIsNull()
    {
        var legacy = new PersistedLlmConfig
        {
            ProviderName = "Agnes",
            UseBuiltIn = true,
            Model = "agnes-2.5-flash",
        };

        var migrated = LlmConfigResolver.MigrateLegacyPersisted(legacy);

        Assert.True(migrated.UseBuiltIn);
        Assert.Null(migrated.ActiveProviderId);
        Assert.Single(migrated.Providers);
    }

    [Fact]
    public void MigrateLegacy_ManualModelOutsideList_InsertedFirst()
    {
        var legacy = new PersistedLlmConfig
        {
            ProviderName = "Custom",
            BaseUrl = "https://api.example.com/v1",
            Model = "my-local-model",
            UseBuiltIn = false,
            AvailableModels = new List<string> { "deepseek-chat" },
        };

        var migrated = LlmConfigResolver.MigrateLegacyPersisted(legacy);

        var provider = Assert.Single(migrated.Providers);
        Assert.Equal("my-local-model", provider.Models[0].Id);   // 当前模型排首位
        Assert.Contains(provider.Models, m => m.Id == "deepseek-chat");
    }
}
