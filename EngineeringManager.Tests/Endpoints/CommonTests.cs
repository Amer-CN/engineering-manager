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
}
