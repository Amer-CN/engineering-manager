using Microsoft.AspNetCore.Http;
using System.Data;
using Dapper;

namespace EngineeringManager.Api.Security;

/// <summary>
/// 当前用户上下文辅助（v1.1.0 P0-4 完整版）
/// 从 HttpContext.User 中提取 uid / 角色，用于所有 INSERT 端点写入 created_by，
/// SELECT/DELETE/UPDATE 端点做用户维度过滤。
///
/// 必须在 GlobalAuthMiddleware 之后使用（中间件已校验 JWT）。
/// </summary>
public static class CurrentUser
{
    /// <summary>从 JWT token 中提取用户 ID（uid claim）。未登录返回 null。</summary>
    public static string? GetUserId(HttpContext ctx) =>
        ctx.User?.FindFirst("uid")?.Value;

    /// <summary>当前用户是否为 admin 角色（admin role claim 由登录端点写入）。</summary>
    public static bool IsAdmin(HttpContext ctx) =>
        // 登录端点 JWT 写入的 role claim 是中文"管理员"或英文"admin" (取决于 role.name)
        // 兼容两种: 中文 roleName + 英文 roleId
        ctx.User?.HasClaim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "管理员")
        ?? ctx.User?.HasClaim("http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "admin")
        ?? false;

    // ── v0.80 D-1: 数据范围枚举(替代 @IsAdmin 布尔字面量;参考若依 @DataScope) ──
    /// <summary>数据可见范围。Company 预留(需先加 company_id/org_id 列,当前库无此锚点)。</summary>
    public enum DataScope { SelfOnly, AuthorizedProjects, All /*, Company */ }

    /// <summary>当前请求的数据范围。行为保持映射:admin→All,其余→AuthorizedProjects
    /// (其 created_by 分支已覆盖 SelfOnly)。</summary>
    public static DataScope GetDataScope(HttpContext ctx) =>
        IsAdmin(ctx) ? DataScope.All : DataScope.AuthorizedProjects;

    /// <summary>
    /// 项目级表过滤片段 (有 project_id 列), 已弃 const UserFilterFragment 改用此方法。
    /// All→(1=1); 非 All→created_by ∨ 授权项目。
    /// </summary>
    public static string UserFilterFragmentForProject(DataScope scope) =>
        scope == DataScope.All
            ? "(1 = 1)"
            : @"
        (created_by = @Uid
         OR EXISTS(SELECT 1 FROM project_authorizations
                   WHERE project_id = @ProjectId AND user_id = @Uid))";

    /// <summary>
    /// 公司维度表过滤 (无 project_id 列, 如 projects / members / workers / partners / supervisors / inventory_items / materials)
    /// 简单看: 创建人 OR admin
    /// 入参: createdByCol 当前行 created_by 列 (默认 "created_by", 当主查询 JOIN 多个有 created_by 的表时需带表别名如 "m.created_by")
    /// </summary>
    public static string UserFilterCompany(DataScope scope, string createdByCol = "created_by") =>
        scope == DataScope.All ? "(1 = 1)" : $"({createdByCol} = @Uid)";

    /// <summary>
    /// 项目级表过滤 (有 project_id 列, 如 income_contracts / wages / attendances / invoices / cost_ledger / expenses / drawings / inventory_transactions)
    /// 逻辑: created_by 自己 OR admin 全表 OR 当前行 project_id 在 admin 授权的 project_authorizations 列表中
    /// 入参:
    ///   projectCol 当前行 project_id 列 (默认 "project_id", 可带表别名如 "pw.project_id")
    ///   createdByCol 当前行 created_by 列 (默认 "created_by", 当主查询 JOIN 多个有 created_by 的表时需带表别名如 "i.created_by")
    /// </summary>
    public static string UserFilterWithAuthorizedProjects(
        DataScope scope,
        string projectCol = "project_id",
        string createdByCol = "created_by") =>
        scope == DataScope.All
            ? "(1 = 1)"
            : $@"({createdByCol} = @Uid
            OR EXISTS(SELECT 1 FROM project_authorizations
                      WHERE project_id = {projectCol} AND user_id = @Uid))";

    // ── v0.80 D-2: PII 字段权限分级 ──

    /// <summary>PII 列全集(以 DB 列名为准)</summary>
    public static readonly string[] AllPiiColumns =
        { "id_card", "phone", "bank_account", "address", "id_card_address" };

    public enum PiiRole { Admin, Accountant, Manager, Worker, None }

    /// <summary>角色 → 可读明文的 PII 字段集合(未列出一律脱敏;默认拒绝)。
    /// 当前为「行为保持」映射,与原 CanReadPii 等价。收紧 manager 只改这一处。</summary>
    private static readonly IReadOnlyDictionary<PiiRole, HashSet<string>> PiiReadable =
        new Dictionary<PiiRole, HashSet<string>>
        {
            [PiiRole.Admin]      = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Accountant] = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Manager]    = new(StringComparer.OrdinalIgnoreCase) { "id_card", "idCard", "phone", "bank_account", "bankAccount", "address", "id_card_address", "idCardAddress" },
            [PiiRole.Worker]     = new(StringComparer.OrdinalIgnoreCase) { },
            [PiiRole.None]       = new(StringComparer.OrdinalIgnoreCase) { },
        };

    public readonly struct PiiAccess
    {
        private readonly HashSet<string> _readable;
        public PiiAccess(HashSet<string> readable) => _readable = readable;
        public bool CanRead(string field) => _readable.Contains(field);
    }

    /// <summary>集中角色解析(兼容中文 roleName 与英文 roleId)</summary>
    public static PiiRole ResolveRole(HttpContext ctx)
    {
        var roleClaims = ctx.User?.FindAll(System.Security.Claims.ClaimTypes.Role);
        if (roleClaims == null) return PiiRole.None;
        foreach (var c in roleClaims)
            switch (c.Value)
            {
                case "管理员": case "admin":      return PiiRole.Admin;
                case "经理":   case "manager":    return PiiRole.Manager;
                case "财务":   case "accountant": return PiiRole.Accountant;
                case "工人":   case "worker":     return PiiRole.Worker;
            }
        return PiiRole.None;
    }

    public static PiiAccess GetPiiAccess(HttpContext ctx) =>
        new PiiAccess(PiiReadable[ResolveRole(ctx)]);

    // ── M4: 服务端权限检查 ──

    /// <summary>
    /// 检查当前用户是否拥有指定权限码（如 "knowledge:read"）。
    /// admin 角色直接返回 true（管理员拥有全部权限）。
    /// 非 admin 从 roles.permissions JSON 字段中查找。
    /// </summary>
    public static bool HasPermission(HttpContext ctx, IDbConnection db, string permissionCode)
    {
        if (IsAdmin(ctx)) return true;
        var uid = GetUserId(ctx);
        if (uid == null) return false;

        var roleId = ctx.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        // 兼容中文角色名
        if (roleId == "管理员") roleId = "admin";
        else if (roleId == "经理") roleId = "manager";
        else if (roleId == "财务") roleId = "accountant";
        else if (roleId == "工人") roleId = "worker";

        var permissionsJson = db.QueryFirstOrDefault<string>(
            "SELECT permissions FROM roles WHERE id = @RoleId",
            new { RoleId = roleId });
        if (string.IsNullOrEmpty(permissionsJson)) return false;

        try
        {
            var perms = System.Text.Json.JsonSerializer.Deserialize<string[]>(permissionsJson);
            return perms != null && perms.Contains(permissionCode);
        }
        catch { return false; }
    }
}
