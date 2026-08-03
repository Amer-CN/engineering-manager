using Xunit;
using EngineeringManager.Api;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// X12.1: EditionFeatures 映射表正确性测试。
/// 27.2 F1 改造：删除 SetEdition/ResetEdition（反射改 _cachedEdition + 环境变量切换），
/// 改为直接调 EditionResolver.Resolve（纯函数）+ Path.GetTempFileName() 造 config fixture。
/// 端点级 warning 透传测试见 SystemEndpointsConfigTests。
/// </summary>
public class EditionFeaturesTests
{
    // ═══════════════════════════════════════════════════════════
    // 第 1 层：纯函数验证映射表（无环境变量、无反射、无 config.json）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void Personal_GetFeaturesForEdition_ReturnsEmpty()
    {
        var features = EditionFeatures.GetFeaturesForEdition("personal");
        Assert.Empty(features);
    }

    [Fact]
    public void Enterprise_GetFeaturesForEdition_ExactlyThese5Keys()
    {
        // 18.3(a): 精确集合相等（不是 Contains 逐个——那不排除多出来的键）
        var features = EditionFeatures.GetFeaturesForEdition("enterprise");
        var expected = new HashSet<string>
        {
            EditionFeatures.UserManagement,
            EditionFeatures.RoleManagement,
            EditionFeatures.ProjectAuthorization,
            EditionFeatures.MultiUserDataScope,
            EditionFeatures.AuditUserFilter,
        };
        var actual = new HashSet<string>(features);
        Assert.Equal(expected, actual); // 集合相等：多一个少一个都红
    }

    [Fact]
    public void CloudSync_NotIn_AnyEdition()
    {
        var personal = EditionFeatures.GetFeaturesForEdition("personal");
        var enterprise = EditionFeatures.GetFeaturesForEdition("enterprise");
        Assert.DoesNotContain(EditionFeatures.CloudSync, personal);
        Assert.DoesNotContain(EditionFeatures.CloudSync, enterprise);
    }

    [Fact]
    public void UnknownEdition_GetFeaturesForEdition_ReturnsEmpty()
    {
        // 防御性测试：纯函数对未知 edition 返回空集。
        // 生产不可达（GetEdition 已规范化），但保留以防 EditionMap 被误改。
        var features = EditionFeatures.GetFeaturesForEdition("typo-edition");
        Assert.Empty(features);
    }

    [Fact]
    public void ReservedKeys_CoverOrphanedKeys()
    {
        var personalSet = new HashSet<string>(EditionFeatures.GetFeaturesForEdition("personal"));
        var enterpriseSet = new HashSet<string>(EditionFeatures.GetFeaturesForEdition("enterprise"));

        foreach (var key in EditionFeatures.AllFeatureKeys)
        {
            bool inSomeEdition = personalSet.Contains(key) || enterpriseSet.Contains(key);
            bool isReserved = EditionFeatures.ReservedKeys.Contains(key);
            Assert.True(inSomeEdition || isReserved,
                $"Key '{key}' is neither in any edition nor in ReservedKeys");
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 第 2 层（27.2 F1）：EditionResolver.Resolve 纯函数测试
    // 用 Path.GetTempFileName() 造 config fixture，无环境变量、无反射。
    // ═══════════════════════════════════════════════════════════

    private static string WriteFixture(string json)
    {
        var path = Path.GetTempFileName();
        File.WriteAllText(path, json);
        return path;
    }

    private static void DeleteFixture(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); } catch { }
    }

    // 用例 1: env=enterprise，config 不存在 → enterprise，无 warning
    [Fact]
    public void Resolve_EnvEnterprise_ConfigMissing_Enterprise_NoWarning()
    {
        var configPath = Path.GetTempFileName(); // 存在但无 edition 字段 → 走 env 优先
        try
        {
            var r = EditionResolver.Resolve("enterprise", configPath);
            Assert.Equal("enterprise", r.Edition);
            Assert.Null(r.Warning);
        }
        finally { DeleteFixture(configPath); }
    }

    // 用例 2: env=null，config 内容合法 enterprise → enterprise，无 warning
    [Fact]
    public void Resolve_NoEnv_ConfigEnterprise_Enterprise_NoWarning()
    {
        var configPath = WriteFixture("{\"edition\": \"enterprise\"}");
        try
        {
            var r = EditionResolver.Resolve(null, configPath);
            Assert.Equal("enterprise", r.Edition);
            Assert.Null(r.Warning);
        }
        finally { DeleteFixture(configPath); }
    }

    // 用例 3: env=null，config 文件不存在 → personal，无 warning
    [Fact]
    public void Resolve_NoEnv_ConfigMissing_Personal_NoWarning()
    {
        var configPath = Path.Combine(Path.GetTempPath(), $"nope-{Guid.NewGuid()}.json");
        var r = EditionResolver.Resolve(null, configPath);
        Assert.Equal("personal", r.Edition);
        Assert.Null(r.Warning);
    }

    // 用例 4: env=null，config 是坏 JSON → personal，有 warning，warning 含路径
    // (15.1(c)/24.1(c) 欠的债：config 读取失败可在单测中可靠触发)
    [Fact]
    public void Resolve_NoEnv_ConfigBadJson_Personal_WarningContainsPath()
    {
        var configPath = WriteFixture("{ this is not valid json !!! ");
        try
        {
            var r = EditionResolver.Resolve(null, configPath);
            Assert.Equal("personal", r.Edition);
            Assert.NotNull(r.Warning);
            Assert.Contains(configPath, r.Warning!);
            Assert.Contains("配置文件读取失败", r.Warning!);
        }
        finally { DeleteFixture(configPath); }
    }

    // 用例 5: env=null，config 路径指向一个目录（读取抛异常）→ personal，有 warning
    [Fact]
    public void Resolve_NoEnv_ConfigPathIsDirectory_Personal_Warning()
    {
        var dirPath = Path.Combine(Path.GetTempPath(), $"cfg-dir-{Guid.NewGuid()}");
        Directory.CreateDirectory(dirPath);
        try
        {
            var r = EditionResolver.Resolve(null, dirPath);
            Assert.Equal("personal", r.Edition);
            Assert.NotNull(r.Warning);
            Assert.Contains(dirPath, r.Warning!);
        }
        finally { try { Directory.Delete(dirPath); } catch { } }
    }

    // 用例 6: env="ENTERPRISE " 带空格大写 → enterprise（归一化）
    [Fact]
    public void Resolve_EnvEnterpriseWithSpacesAndUpper_NormalizedToEnterprise()
    {
        var configPath = Path.GetTempFileName();
        try
        {
            var r = EditionResolver.Resolve(" ENTERPRISE ", configPath);
            Assert.Equal("enterprise", r.Edition);
            Assert.Null(r.Warning);
        }
        finally { DeleteFixture(configPath); }
    }

    // 用例 7: env="typo" → personal + 告警
    [Fact]
    public void Resolve_EnvTypo_Personal_Warning()
    {
        var configPath = Path.GetTempFileName();
        try
        {
            var r = EditionResolver.Resolve("typo", configPath);
            Assert.Equal("personal", r.Edition);
            Assert.NotNull(r.Warning);
            Assert.Contains("typo", r.Warning!);
        }
        finally { DeleteFixture(configPath); }
    }

    // ═══════════════════════════════════════════════════════════
    // 第 3 层：规范化防线（11.3.1 的 trim + lowercase）— 经 Resolve 纯函数
    // ═══════════════════════════════════════════════════════════

    [Theory]
    [InlineData("enterprise", "enterprise")]
    [InlineData("Enterprise", "enterprise")]
    [InlineData("ENTERPRISE", "enterprise")]
    [InlineData(" enterprise ", "enterprise")]
    [InlineData("personal", "personal")]
    [InlineData("Personal", "personal")]
    [InlineData("PERSONAL", "personal")]
    [InlineData(" personal ", "personal")]
    [InlineData("typo", "personal")]  // 未知值 fallback 到 personal
    public void Resolve_Normalizes_Input(string input, string expected)
    {
        var configPath = Path.GetTempFileName();
        try
        {
            var r = EditionResolver.Resolve(input, configPath);
            Assert.Equal(expected, r.Edition);
        }
        finally { DeleteFixture(configPath); }
    }

    [Fact]
    public void Resolve_UnknownEnvValue_OutputsWarning()
    {
        // V8 核心举证：未知 edition 时告警确实被输出到 Console.Error
        var configPath = Path.GetTempFileName();
        var originalErr = Console.Error;
        using var sw = new System.IO.StringWriter();
        Console.SetError(sw);
        try
        {
            var r = EditionResolver.Resolve("enterpirse", configPath); // 典型拼错
            Assert.Equal("personal", r.Edition);
            Assert.NotNull(r.Warning);
        }
        finally
        {
            Console.SetError(originalErr);
            DeleteFixture(configPath);
        }
        var output = sw.ToString();
        Assert.Contains("enterpirse", output);
        Assert.Contains("personal", output);
    }
}
