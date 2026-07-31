using Xunit;
using EngineeringManager.Api;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// X12.1: EditionFeatures 映射表正确性测试。
/// 使用 internal GetFeaturesForEdition() 纯函数验证映射表，
/// 不依赖环境变量、不依赖反射、不依赖 config.json。
/// </summary>
public class EditionFeaturesTests
{
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
    public void UnknownEdition_ReturnsEmpty()
    {
        var features = EditionFeatures.GetFeaturesForEdition("typo-edition");
        Assert.Empty(features);
    }

    [Fact]
    public void ReservedKeys_CoverOrphanedKeys()
    {
        // AllFeatureKeys 中每个键要么属于某 edition，要么在预留白名单
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

    [Fact]
    public void Has_PublicApi_NonExistentKey_ReturnsFalse()
    {
        // 覆盖公共入口 Has()：不存在的键必返 false
        Assert.False(EditionFeatures.Has("nonExistentKey"));
    }
}
