using Xunit;
using EngineeringManager.Api;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// X12.1: EditionFeatures 映射表正确性测试。
/// 验证 personal 为空集、cloudSync 在两个 edition 下都为 false。
/// </summary>
public class EditionFeaturesTests
{
    [Fact]
    public void Personal_GetActiveFeatures_ReturnsEmpty()
    {
        // Arrange: force edition to personal
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", "personal");
        // Reset cached edition via reflection
        var field = typeof(ApiConfig).GetField("_cachedEdition",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        field!.SetValue(null, null);

        try
        {
            // Act
            var features = EditionFeatures.GetActiveFeatures();

            // Assert: personal must be empty
            Assert.Empty(features);
        }
        finally
        {
            Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", null);
            field.SetValue(null, null);
        }
    }

    [Fact]
    public void CloudSync_IsFalse_InBothEditions()
    {
        var field = typeof(ApiConfig).GetField("_cachedEdition",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);

        // Test personal
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", "personal");
        field!.SetValue(null, null);
        Assert.False(EditionFeatures.Has(EditionFeatures.CloudSync),
            "cloudSync must be false in personal");

        // Test enterprise
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", "enterprise");
        field.SetValue(null, null);
        Assert.False(EditionFeatures.Has(EditionFeatures.CloudSync),
            "cloudSync must be false in enterprise");

        // Cleanup
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", null);
        field.SetValue(null, null);
    }

    [Fact]
    public void Enterprise_HasExpectedFeatures()
    {
        var field = typeof(ApiConfig).GetField("_cachedEdition",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", "enterprise");
        field!.SetValue(null, null);

        try
        {
            Assert.True(EditionFeatures.Has(EditionFeatures.UserManagement));
            Assert.True(EditionFeatures.Has(EditionFeatures.RoleManagement));
            Assert.True(EditionFeatures.Has(EditionFeatures.ProjectAuthorization));
            Assert.True(EditionFeatures.Has(EditionFeatures.MultiUserDataScope));
            Assert.True(EditionFeatures.Has(EditionFeatures.AuditUserFilter));
            Assert.False(EditionFeatures.Has(EditionFeatures.CloudSync));

            var features = EditionFeatures.GetActiveFeatures();
            Assert.Equal(5, features.Length);
        }
        finally
        {
            Environment.SetEnvironmentVariable("ENGINEERING_MANAGER_EDITION", null);
            field.SetValue(null, null);
        }
    }

    [Fact]
    public void ReservedKeys_NotInAnyEdition()
    {
        // AllFeatureKeys中不存在「不属于任何edition集合、且未在预留白名单中」的键
        var personalSet = new HashSet<string>(); // personal is empty
        var enterpriseSet = new HashSet<string>
        {
            EditionFeatures.UserManagement,
            EditionFeatures.RoleManagement,
            EditionFeatures.ProjectAuthorization,
            EditionFeatures.MultiUserDataScope,
            EditionFeatures.AuditUserFilter,
        };

        foreach (var key in EditionFeatures.AllFeatureKeys)
        {
            bool inSomeEdition = personalSet.Contains(key) || enterpriseSet.Contains(key);
            bool isReserved = EditionFeatures.ReservedKeys.Contains(key);
            Assert.True(inSomeEdition || isReserved,
                $"Key '{key}' is neither in any edition nor in ReservedKeys");
        }
    }
}
