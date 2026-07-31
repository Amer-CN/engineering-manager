namespace EngineeringManager.Api;

/// <summary>
/// M-EDITION1 X8: edition → 能力集合映射表（唯一一处）。
///
/// config.json 仍只有 edition 一个字段（personal / enterprise），单一真源不变。
/// 本文件是 edition 到具体能力的唯一映射。业务代码通过 Features.Has("key") 判断，
/// 禁止直接使用 IsPersonal / IsEnterprise。
///
/// 新增能力时：在 FeatureKeys 加常量 + 在两个 edition 的集合中决定是否启用。
/// </summary>
public static class EditionFeatures
{
    // ── 能力键常量 ──
    public const string UserManagement = "userManagement";
    public const string RoleManagement = "roleManagement";
    public const string ProjectAuthorization = "projectAuthorization";
    public const string MultiUserDataScope = "multiUserDataScope";
    public const string AuditUserFilter = "auditUserFilter";
    public const string CloudSync = "cloudSync"; // 预留，当前恒 false

    // ── edition → 能力集合映射（唯一映射点） ──
    private static readonly Dictionary<string, HashSet<string>> EditionMap = new()
    {
        ["personal"] = new HashSet<string>
        {
            // personal 不启用以下能力：
            // UserManagement, RoleManagement, ProjectAuthorization,
            // MultiUserDataScope, AuditUserFilter, CloudSync
        },
        ["enterprise"] = new HashSet<string>
        {
            UserManagement,
            RoleManagement,
            ProjectAuthorization,
            MultiUserDataScope,
            AuditUserFilter,
            // CloudSync 预留，当前不启用
        },
    };

    /// <summary>当前 edition 是否拥有指定能力。</summary>
    public static bool Has(string featureKey)
    {
        var edition = ApiConfig.GetEdition();
        return EditionMap.TryGetValue(edition, out var features) && features.Contains(featureKey);
    }

    /// <summary>当前 edition 的全部能力列表（供 GET /api/config 下发前端）。</summary>
    public static string[] GetActiveFeatures()
    {
        var edition = ApiConfig.GetEdition();
        return EditionMap.TryGetValue(edition, out var features)
            ? features.ToArray()
            : Array.Empty<string>();
    }

    /// <summary>全部已定义的能力键（供测试/文档）。</summary>
    public static readonly string[] AllFeatureKeys =
    {
        UserManagement, RoleManagement, ProjectAuthorization,
        MultiUserDataScope, AuditUserFilter, CloudSync,
    };
}
