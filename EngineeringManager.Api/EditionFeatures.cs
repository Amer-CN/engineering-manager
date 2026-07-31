namespace EngineeringManager.Api;

/// <summary>
/// M-EDITION1 X8: edition -> 能力集合映射表（唯一一处）。
///
/// config.json 仍只有 edition 一个字段（personal / enterprise），单一真源不变。
/// 本文件是 edition 到具体能力的唯一映射。业务代码通过 EditionFeatures.Has("key") 判断，
/// 禁止直接使用 IsPersonal / IsEnterprise。
///
/// 新增能力时：在常量区加键 + 在对应 edition 的显式集合中添加。
/// 两个 edition 都使用【显式集合】，不用补集计算（补集无法表达「两者都不启用」的预留能力）。
/// 未知 edition 由 ApiConfig.GetEdition() 兜成 personal（fail-closed 到最小权限），
/// EditionFeatures 侧的空集分支是防御性冗余（不可达但保留）。
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
    public const string CloudSync = "cloudSync";

    /// <summary>全部已定义的能力键（从常量区派生的唯一列表）。</summary>
    public static readonly System.Collections.Immutable.ImmutableArray<string> AllFeatureKeys =
        System.Collections.Immutable.ImmutableArray.Create(
            UserManagement, RoleManagement, ProjectAuthorization,
            MultiUserDataScope, AuditUserFilter, CloudSync);

    /// <summary>预留能力白名单：当前两个 edition 都不启用，未来按需开放。</summary>
    public static readonly System.Collections.Immutable.ImmutableHashSet<string> ReservedKeys =
        System.Collections.Immutable.ImmutableHashSet.Create(CloudSync);

    // ── edition -> 能力集合映射（唯一映射点，两个 edition 都是显式集合） ──
    private static readonly Dictionary<string, HashSet<string>> EditionMap = new()
    {
        ["personal"] = new HashSet<string>
        {
            // personal 当前无企业能力，显式空集
        },
        ["enterprise"] = new HashSet<string>
        {
            UserManagement,
            RoleManagement,
            ProjectAuthorization,
            MultiUserDataScope,
            AuditUserFilter,
            // CloudSync 预留，当前不启用（不在任何 edition 中）
        },
    };

    private static volatile bool _validated;
    private static readonly object _validateLock = new();

    /// <summary>
    /// 启动时触发 GetEdition() 首次解析（确保配置错误在启动时暴露而非首次请求时）。
    /// 未知 edition 的告警由 ApiConfig.GetEdition() 内部输出（实际 fallback 发生处）。
    /// 本方法不再独立告警——GetEdition() 永不返回未知值（已规范化为 personal/enterprise）。
    /// </summary>
    public static void ValidateEdition()
    {
        if (_validated) return;
        lock (_validateLock)
        {
            if (_validated) return;
            _validated = true;
            var edition = ApiConfig.GetEdition();
            // GetEdition() 已保证返回值必为 "personal" 或 "enterprise"。
            // 以下分支为防御性冗余（生产不可达）。
            if (!EditionMap.ContainsKey(edition))
            {
                Console.Error.WriteLine(
                    $"[EditionFeatures] DEFENSIVE: edition '{edition}' not in EditionMap. " +
                    $"This should be unreachable (GetEdition normalizes to personal/enterprise).");
            }
        }
    }

    /// <summary>当前 edition 是否拥有指定能力。首次调用时自动触发 ValidateEdition。</summary>
    public static bool Has(string featureKey)
    {
        ValidateEdition();
        var edition = ApiConfig.GetEdition();
        return EditionMap.TryGetValue(edition, out var features) && features.Contains(featureKey);
    }

    /// <summary>
    /// 纯函数：返回指定 edition 的能力列表（不读 config，不依赖缓存）。
    /// 供测试直接验证映射表正确性，无需环境变量或反射。
    /// </summary>
    internal static string[] GetFeaturesForEdition(string edition)
    {
        return EditionMap.TryGetValue(edition, out var features)
            ? features.ToArray()
            : Array.Empty<string>();
    }

    /// <summary>当前 edition 的全部能力列表（供 GET /api/config 下发前端）。</summary>
    public static string[] GetActiveFeatures()
    {
        ValidateEdition();
        var edition = ApiConfig.GetEdition();
        return EditionMap.TryGetValue(edition, out var features)
            ? features.ToArray()
            : Array.Empty<string>();
    }
}
