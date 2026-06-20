using Microsoft.AspNetCore.Http;

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

    /// <summary>
    /// 旧调用兼容: 项目级表 (有 project_id 列) 的 created_by OR admin 过滤片段。
    /// 保留 const 形式供现有 5 处调用 (拼接形式)。
    /// 新代码请用 <see cref="UserFilterWithAuthorizedProjects"/>。
    /// </summary>
    public const string UserFilterFragment = @"
        (created_by = @Uid
         OR @IsAdmin = 1
         OR EXISTS(SELECT 1 FROM project_authorizations
                   WHERE project_id = @ProjectId AND user_id = @Uid))";

    /// <summary>
    /// 公司维度表过滤 (无 project_id 列, 如 projects / members / workers / partners / supervisors / inventory_items / materials)
    /// 简单看: 创建人 OR admin
    /// 入参: createdByCol 当前行 created_by 列 (默认 "created_by", 当主查询 JOIN 多个有 created_by 的表时需带表别名如 "m.created_by")
    /// </summary>
    public static string UserFilterCompany(string createdByCol = "created_by") =>
        $"({createdByCol} = @Uid OR @IsAdmin = 1)";

    /// <summary>
    /// 项目级表过滤 (有 project_id 列, 如 income_contracts / wages / attendances / invoices / cost_ledger / expenses / drawings / inventory_transactions)
    /// 逻辑: created_by 自己 OR admin 全表 OR 当前行 project_id 在 admin 授权的 project_authorizations 列表中
    /// 入参:
    ///   projectCol 当前行 project_id 列 (默认 "project_id", 可带表别名如 "pw.project_id")
    ///   createdByCol 当前行 created_by 列 (默认 "created_by", 当主查询 JOIN 多个有 created_by 的表时需带表别名如 "i.created_by")
    /// </summary>
    public static string UserFilterWithAuthorizedProjects(
        string projectCol = "project_id",
        string createdByCol = "created_by") =>
        $@"({createdByCol} = @Uid
            OR @IsAdmin = 1
            OR EXISTS(SELECT 1 FROM project_authorizations
                      WHERE project_id = {projectCol} AND user_id = @Uid))";

    /// <summary>
    /// 当前用户是否可读 PII 字段 (身份证/手机/地址/银行账号)
    /// 规则: admin / manager / accountant 可读; worker 不可读 (只看脱敏)
    /// v0.76.0: 累计待办 #1 — PII 解密 ACL 字段
    /// </summary>
    public static bool CanReadPii(HttpContext ctx)
    {
        var roleClaims = ctx.User?.FindAll(System.Security.Claims.ClaimTypes.Role);
        if (roleClaims == null) return false;
        foreach (var c in roleClaims)
        {
            // 兼容中文 roleName (管理员/经理/财务) 和英文 roleId (admin/manager/accountant)
            if (c.Value == "管理员" || c.Value == "admin" ||
                c.Value == "经理" || c.Value == "manager" ||
                c.Value == "财务" || c.Value == "accountant")
                return true;
        }
        return false;
    }
}
