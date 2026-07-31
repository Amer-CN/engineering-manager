using Xunit;
using EngineeringManager.Api;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// X12.1: EditionFeatures 映射表正确性测试。
///
/// 分两层：
/// 1. 纯函数层（GetFeaturesForEdition）：验证映射表数据正确性，无外部依赖
/// 2. 公共 API 集成层（Has / GetActiveFeatures）：验证实际端点走的路径，
///    需要切换 edition（当前唯一手段是 ENGINEERING_MANAGER_EDITION 环境变量）
///
/// F1 连带修改项：第 2 层测试依赖 ENGINEERING_MANAGER_EDITION 环境变量。
/// F1 移除该变量时，必须同步改造这些测试（改为 config fixture 文件），而不是让它们崩掉。
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
    public void Enterprise_GetFeaturesForEdition_Returns5()
    {
        var features = EditionFeatures.GetFeaturesForEdition("enterprise");
        Assert.Equal(5, features.Length);
        Assert.Contains(EditionFeatures.UserManagement, features);
        Assert.Contains(EditionFeatures.RoleManagement, features);
        Assert.Contains(EditionFeatures.ProjectAuthorization, features);
        Assert.Contains(EditionFeatures.MultiUserDataScope, features);
        Assert.Contains(EditionFeatures.AuditUserFilter, features);
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
    // 第 2 层：公共 API 集成测试（走 Has / GetActiveFeatures 实际路径）
    // 依赖 ENGINEERING_MANAGER_EDITION 环境变量切换 edition。
    // F1 移除环境变量时必须同步改造为 config fixture。
    // ═══════════════════════════════════════════════════════════

    private static void SetEdition(string edition)
    {
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", edition);
        // 重置缓存（GetEdition 内部无锁，仅 null 检查赋值）
        var field = typeof(ApiConfig).GetField("_cachedEdition",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        field!.SetValue(null, null);
    }

    private static void ResetEdition()
    {
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", null);
        var field = typeof(ApiConfig).GetField("_cachedEdition",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        field!.SetValue(null, null);
    }

    [Fact]
    public void Has_Enterprise_UserManagement_True_CloudSync_False()
    {
        // 破坏性验证：若 personal 拿回 cloudSync 或 enterprise 丢失 userManagement，此测试红
        try
        {
            SetEdition("enterprise");
            Assert.True(EditionFeatures.Has(EditionFeatures.UserManagement),
                "enterprise must have userManagement");
            Assert.True(EditionFeatures.Has(EditionFeatures.RoleManagement),
                "enterprise must have roleManagement");
            Assert.False(EditionFeatures.Has(EditionFeatures.CloudSync),
                "enterprise must NOT have cloudSync");

            var active = EditionFeatures.GetActiveFeatures();
            Assert.Equal(5, active.Length);
        }
        finally { ResetEdition(); }
    }

    [Fact]
    public void Has_Personal_AllFalse()
    {
        // 破坏性验证：若 personal 获得任何能力，此测试红
        try
        {
            SetEdition("personal");
            Assert.False(EditionFeatures.Has(EditionFeatures.UserManagement),
                "personal must NOT have userManagement");
            Assert.False(EditionFeatures.Has(EditionFeatures.CloudSync),
                "personal must NOT have cloudSync");

            var active = EditionFeatures.GetActiveFeatures();
            Assert.Empty(active);
        }
        finally { ResetEdition(); }
    }

    // ═══════════════════════════════════════════════════════════
    // 第 3 层：规范化防线（11.3.1 的 trim + lowercase）
    // 验证 GetEdition 对 " Enterprise " / "PERSONAL" 等输入正确解析
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
    public void GetEdition_Normalizes_Input(string input, string expected)
    {
        try
        {
            SetEdition(input);
            var actual = ApiConfig.GetEdition();
            Assert.Equal(expected, actual);
        }
        finally { ResetEdition(); }
    }

    [Fact]
    public void GetActiveFeatures_UnknownEdition_FallsBackToPersonal()
    {
        // V8: 未知 edition 由 GetEdition() 规范化为 personal（fail-closed 到最小权限）
        // 实际路径：gibberish -> GetEdition 返回 "personal" -> personal 能力集（当前为空）
        // 注意：此测试验证的是 fallback 到 personal 的行为，不是"未知->空集"
        try
        {
            SetEdition("gibberish-edition");
            var edition = ApiConfig.GetEdition();
            Assert.Equal("personal", edition); // 确认 fallback 目标
            var features = EditionFeatures.GetActiveFeatures();
            // personal 当前为空集，所以结果为空——但原因是 personal 为空，不是"未知=空"
            Assert.Equal(EditionFeatures.GetFeaturesForEdition("personal"), features);
        }
        finally { ResetEdition(); }
    }

    [Fact]
    public void GetEdition_UnknownValue_OutputsWarning()
    {
        // V8 核心举证：未知 edition 时告警确实被输出到 Console.Error
        try
        {
            var originalErr = Console.Error;
            using var sw = new System.IO.StringWriter();
            Console.SetError(sw);
            try
            {
                SetEdition("enterpirse"); // 典型拼错
                var edition = ApiConfig.GetEdition();
                Assert.Equal("personal", edition);
            }
            finally
            {
                Console.SetError(originalErr);
            }
            var output = sw.ToString();
            Assert.Contains("unknown edition", output);
            Assert.Contains("enterpirse", output);
            Assert.Contains("personal", output);
        }
        finally { ResetEdition(); }
    }
}
