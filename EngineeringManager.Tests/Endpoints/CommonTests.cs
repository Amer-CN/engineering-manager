using EngineeringManager.Api;
using Xunit;

using EngineeringManager.Api.Security;

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
        var canRead = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "idCard", "phone", "bankAccount", "idCardAddress" });
        Assert.Equal("110101199001011234", EngineeringManager.Api.Common.MaskPiiField("idCard", "110101199001011234", canRead));
        Assert.Equal("13800138000", EngineeringManager.Api.Common.MaskPiiField("phone", "13800138000", canRead));
        Assert.Equal("6228480012345678", EngineeringManager.Api.Common.MaskPiiField("bankAccount", "6228480012345678", canRead));
        Assert.Equal("北京市朝阳区", EngineeringManager.Api.Common.MaskPiiField("idCardAddress", "北京市朝阳区", canRead));
    }

    [Fact]
    public void MaskPiiField_WorkerRole_MasksAllFields()
    {
        // worker 看脱敏
        var masked = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        Assert.Equal("1101****1234", EngineeringManager.Api.Common.MaskPiiField("idCard", "110101199001011234", masked));
        Assert.Equal("138****8000", EngineeringManager.Api.Common.MaskPiiField("phone", "13800138000", masked));
        Assert.Equal("6228****5678", EngineeringManager.Api.Common.MaskPiiField("bankAccount", "6228480012345678", masked));
    }

    [Fact]
    public void MaskPiiField_NullOrEmpty_PassesThrough()
    {
        var masked = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        var canRead = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "idCard", "phone" });
        Assert.Null(EngineeringManager.Api.Common.MaskPiiField("idCard", null, masked));
        Assert.Equal("", EngineeringManager.Api.Common.MaskPiiField("phone", "", masked));
        Assert.Null(EngineeringManager.Api.Common.MaskPiiField("idCard", null, canRead));
    }

    // ════════ v0.80 D-2: PII 字段权限分级 ════════

    [Fact]
    public void MaskPiiField_WorkerRole_AddressAlsoMasked()
    {
        // worker 下 address 字段也应脱敏（修复的漏洞）
        var masked = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        Assert.Equal("北***区", EngineeringManager.Api.Common.MaskPiiField("address", "北京市朝阳区", masked));
    }

    [Fact]
    public void MaskPiiField_AdminRole_AllFieldsReadable()
    {
        // admin 可读所有 PII 字段（行为保持）
        var adminAccess = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "id_card", "phone", "bank_account", "address", "id_card_address" });
        Assert.Equal("110101199001011234", EngineeringManager.Api.Common.MaskPiiField("id_card", "110101199001011234", adminAccess));
        Assert.Equal("13800138000", EngineeringManager.Api.Common.MaskPiiField("phone", "13800138000", adminAccess));
        Assert.Equal("6228480012345678", EngineeringManager.Api.Common.MaskPiiField("bank_account", "6228480012345678", adminAccess));
        Assert.Equal("北京市朝阳区", EngineeringManager.Api.Common.MaskPiiField("address", "北京市朝阳区", adminAccess));
        Assert.Equal("北京市朝阳区某街道", EngineeringManager.Api.Common.MaskPiiField("id_card_address", "北京市朝阳区某街道", adminAccess));
    }

    [Fact]
    public void MaskPiiField_ManagerRole_AllFieldsReadable()
    {
        // manager 与 admin 同权（当前行为保持映射）
        var mgrAccess = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "id_card", "phone", "bank_account", "address", "id_card_address" });
        Assert.Equal("110101199001011234", EngineeringManager.Api.Common.MaskPiiField("id_card", "110101199001011234", mgrAccess));
        Assert.Equal("北京市朝阳区", EngineeringManager.Api.Common.MaskPiiField("address", "北京市朝阳区", mgrAccess));
    }

    [Fact]
    public void MaskPiiField_WorkerRole_AllFieldsMasked()
    {
        // worker 全部脱敏
        var workerAccess = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        Assert.Equal("1101****1234", EngineeringManager.Api.Common.MaskPiiField("id_card", "110101199001011234", workerAccess));
        Assert.Equal("138****8000", EngineeringManager.Api.Common.MaskPiiField("phone", "13800138000", workerAccess));
        Assert.Equal("6228****5678", EngineeringManager.Api.Common.MaskPiiField("bank_account", "6228480012345678", workerAccess));
        Assert.Equal("北***区", EngineeringManager.Api.Common.MaskPiiField("address", "北京市朝阳区", workerAccess));
        Assert.Equal("北***区", EngineeringManager.Api.Common.MaskPiiField("id_card_address", "北京市朝阳区", workerAccess));
    }

    [Fact]
    public void MaskPiiField_FieldNameVariant_Consistency()
    {
        // 同一字段 camelCase 与 snake_case 应得到相同脱敏结果（worker）
        var workerAccess = new CurrentUser.PiiAccess(new HashSet<string>(StringComparer.OrdinalIgnoreCase));
        Assert.Equal(
            Common.MaskPiiField("id_card", "110101199001011234", workerAccess),
            Common.MaskPiiField("idCard", "110101199001011234", workerAccess));
    }

    [Theory]
    [InlineData("admin", "id_card", true)]
    [InlineData("admin", "phone", true)]
    [InlineData("admin", "address", true)]
    [InlineData("manager", "id_card", true)]
    [InlineData("manager", "address", true)]
    [InlineData("accountant", "id_card", true)]
    [InlineData("accountant", "bank_account", true)]
    [InlineData("worker", "id_card", false)]
    [InlineData("worker", "phone", false)]
    [InlineData("worker", "address", false)]
    [InlineData("worker", "bank_account", false)]
    public void MaskPiiField_RoleFieldMatrix(string role, string field, bool expectReadable)
    {
        var readable = role switch
        {
            "admin" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "id_card", "phone", "bank_account", "address", "id_card_address" },
            "manager" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "id_card", "phone", "bank_account", "address", "id_card_address" },
            "accountant" => new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "id_card", "phone", "bank_account", "address", "id_card_address" },
            "worker" => new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            _ => new HashSet<string>(StringComparer.OrdinalIgnoreCase),
        };
        var access = new CurrentUser.PiiAccess(readable);
        var masked = Common.MaskPiiField(field, "12345678901234567", access);

        if (expectReadable)
            Assert.Equal("12345678901234567", masked);
        else
            Assert.NotEqual("12345678901234567", masked);
    }
}