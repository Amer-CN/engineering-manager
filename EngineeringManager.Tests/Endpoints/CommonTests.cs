using EngineeringManager.Api;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

public class CommonTests
{
    [Fact]
    public void HashPassword_ProducesConsistentHash()
    {
        var salt = "test-salt-1234567890123456";
        var hash1 = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);
        var hash2 = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);

        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void HashPassword_DifferentSaltsProduceDifferentHashes()
    {
        var hash1 = EngineeringManager.Api.Common.HashPassword("admin123", "salt1", 2);
        var hash2 = EngineeringManager.Api.Common.HashPassword("admin123", "salt2", 2);

        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void GetDefaultPermissions_AdminHasAllPermissions()
    {
        var permissions = EngineeringManager.Api.Common.GetDefaultPermissions("admin");

        Assert.Contains("projects:read", permissions);
        Assert.Contains("projects:update", permissions);
        Assert.Contains("projects:delete", permissions);
    }

    [Fact]
    public void GetDefaultPermissions_WorkerHasLimitedPermissions()
    {
        var permissions = EngineeringManager.Api.Common.GetDefaultPermissions("worker");

        Assert.Contains("projects:read", permissions);
        Assert.DoesNotContain("projects:delete", permissions);
    }

    [Fact]
    public void GetDefaultPermissions_ReturnsFourRoles()
    {
        var adminPerms = EngineeringManager.Api.Common.GetDefaultPermissions("admin");
        var managerPerms = EngineeringManager.Api.Common.GetDefaultPermissions("manager");
        var accountantPerms = EngineeringManager.Api.Common.GetDefaultPermissions("accountant");
        var workerPerms = EngineeringManager.Api.Common.GetDefaultPermissions("worker");

        Assert.NotNull(adminPerms);
        Assert.NotNull(managerPerms);
        Assert.NotNull(accountantPerms);
        Assert.NotNull(workerPerms);
    }

    // ════════ v0.76.0 累计待办 #1: PII ACL ════════

    [Fact]
    public void MaskPiiField_CanReadPii_ReturnsOriginal()
    {
        // admin/manager/accountant 看明文
        Assert.Equal("110101199001011234", EngineeringManager.Api.Common.MaskPiiField("idCard", "110101199001011234", true));
        Assert.Equal("[已脱敏]", EngineeringManager.Api.Common.MaskPiiField("phone", "[已脱敏]", true));
        Assert.Equal("6228480012345678", EngineeringManager.Api.Common.MaskPiiField("bankAccount", "6228480012345678", true));
        Assert.Equal("北京市朝阳区", EngineeringManager.Api.Common.MaskPiiField("idCardAddress", "北京市朝阳区", true));
    }

    [Fact]
    public void MaskPiiField_WorkerRole_MasksAllFields()
    {
        // worker 看脱敏
        Assert.Equal("1101****1234", EngineeringManager.Api.Common.MaskPiiField("idCard", "110101199001011234", false));
        Assert.Equal("138****8000", EngineeringManager.Api.Common.MaskPiiField("phone", "[已脱敏]", false));
        Assert.Equal("6228****5678", EngineeringManager.Api.Common.MaskPiiField("bankAccount", "6228480012345678", false));
    }

    [Fact]
    public void MaskPiiField_NullOrEmpty_PassesThrough()
    {
        Assert.Null(EngineeringManager.Api.Common.MaskPiiField("idCard", null, false));
        Assert.Equal("", EngineeringManager.Api.Common.MaskPiiField("phone", "", false));
        Assert.Null(EngineeringManager.Api.Common.MaskPiiField("idCard", null, true));
    }
}