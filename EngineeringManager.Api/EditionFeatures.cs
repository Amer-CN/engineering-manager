namespace EngineeringManager.Api;

/// <summary>
/// M-EDITION1 X8: edition → 能力集合映射表（唯一一处）。
///
/// config.json 仍只有 edition 一个字段（personal / enterprise），单一真源不变。
/// 本文件是 edition 到具体能力的唯一映射。业务代码通过 EditionFeatures.Has("key") 判断，
/// 禁止直接使用 IsPersonal / IsEnterprise。
///
/// 新增能力时：在 FeatureKeys 加常量 + 在 enterprise 集合中添加。
/// personal 集合 = AllFeatureKeys - enterprise 集合（自动互补，无需手写）。
///
/// 缓存策略：ApiConfig.GetEdition() 进程启动时读一次并缓存（_cachedEdition），
/// 此后 Has() 每次调用仅做 Dictionary.TryGetValue + HashSet.Contains，无文件 I/O。
/// edition 在进程生命周期内不变，需重启生效。
/// </summary>
public static class EditionFeatures
{
    // ── 能力键常量（唯一来源） ──
    public const string UserManagement = "userManagement";
    public const string RoleManagement = "roleManagement";
    public const string ProjectAuthorization = "projectAuthorization";
    public const string MultiUserDataScope = "multiUserDataScope";
    public const string AuditUserFilter = "auditUserFilter";
    public const string CloudSync = "cloudSync"; // 预留，当前恒 false

    /// <summary>全部已定义的能力键（从常量区派生的唯一列表）。</summary>
    public static readonly string[] AllFeatureKeys =
    {
        UserManagement, RoleManagement, ProjectAuthorization,
        MultiUserDataScope, AuditUserFilter, CloudSync,
    };

    // ── enterprise 显式能力集合 ──
    private static readonly HashSet<string> EnterpriseFeatures = new()
    {
        UserManagement,
        RoleManagement,
        ProjectAuthorization,
        MultiUserDataScope,
        AuditUserFilter,
        // CloudSync 预留，当前不启用
    };

    // ── edition → 能力集合映射（唯一映射点） ──
    // personal = 全集 - enterprise（自动互补，不手写注释清单）
    private static readonly Dictionary<string, HashSet<string>> EditionMap = new()
    {
        ["personal"] = new HashSet<string>(
            AllFeatureKeys.Except(EnterpriseFeatures)),
        ["enterprise"] = EnterpriseFeatures,
    };

    private static bool _validated;

    /// <summary>
    /// 启动时校验 edition 是否在映射表内。未知值记 warning 并 fail-safe 到 personal。
    /// 应在 app 启动后、首次请求前调用一次。
    /// </summary>
    public static void ValidateEdition()
    {
        if (_validated) return;
        _validated = true;
        var edition = ApiConfig.GetEdition();
        if (!EditionMap.ContainsKey(edition))
        {
            Console.Error.WriteLine(
                $"[EditionFeatures] WARNING: unknown edition '{edition}' in config.json. " +
                $"Valid values: {string.Join(", ", EditionMap.Keys)}. Falling back to empty feature set (personal behavior).");
        }
    }

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
}
