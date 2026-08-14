using System.Data;
using Dapper;
using EngineeringManager.Api.Security;

namespace EngineeringManager.Api.Security;

/// <summary>
/// 方案丙更新侧行级写入门（R9-9 批次 1a）。
/// 语义：授权项目内可改不可删 + 跨人修改落 audit（fail-closed 必备件）+ 仅企业版。
/// 「仅企业版」由 GetDataScope 天然承担——个人版 GetDataScope 恒返 All 且 IsAdmin 恒真，
/// 永远走 AllowedOwn 路径（行为不变，零新开关）。
/// </summary>
public enum RowWriteOutcome
{
    Denied,
    AllowedOwn,
    AllowedViaAuthorization
}

public static class RowWriteGate
{
    /// <summary>
    /// 行级写归类（C# 单点裁决，杜绝「同一事实两处各写一份」）。
    /// 四态：
    ///   IsAdmin → AllowedOwn（admin 全放行，归属语义视作本人）；
    ///   uid null → Denied（未登录 fail-closed）；
    ///   rowCreatedBy == uid → AllowedOwn（本人行）；
    ///   GetDataScope == AuthorizedProjects 且 rowProjectId 非空 且
    ///     EXISTS(project_authorizations WHERE project_id=@P AND user_id=@U) → AllowedViaAuthorization
    ///     （企业版授权项目内跨人可改，方案丙更新侧）；
    ///   否则 → Denied。
    /// </summary>
    public static RowWriteOutcome Classify(HttpContext ctx, IDbConnection db, string? rowCreatedBy, long? rowProjectId)
    {
        if (CurrentUser.IsAdmin(ctx)) return RowWriteOutcome.AllowedOwn;
        var uid = CurrentUser.GetUserId(ctx);
        if (uid == null) return RowWriteOutcome.Denied;
        if (string.Equals(rowCreatedBy, uid, StringComparison.Ordinal)) return RowWriteOutcome.AllowedOwn;
        if (CurrentUser.GetDataScope(ctx) == CurrentUser.DataScope.AuthorizedProjects
            && rowProjectId.HasValue
            && db.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM project_authorizations WHERE project_id=@P AND user_id=@U",
                new { P = rowProjectId.Value, U = uid }) > 0)
            return RowWriteOutcome.AllowedViaAuthorization;
        return RowWriteOutcome.Denied;
    }
}

public static class AuditWriter
{
    /// <summary>
    /// 跨人修改落审计（方案丙 fail-closed 必备件）。
    /// **不写 try/catch**——审计写不进 → 事务回滚 → 修改不生效（fail-closed）。
    /// 列集与值形态对齐 CostLedgerEndpoints sheet 段既有先例。
    /// </summary>
    public static void CrossUserEdit(IDbConnection db, IDbTransaction tx, HttpContext ctx,
        string table, long rowId, string endpoint, string? rowOwner, long? projectId)
    {
        var uid = CurrentUser.GetUserId(ctx) ?? "";
        db.Execute(@"INSERT INTO audit_logs
            (action, level, user_id, user_name, resource, resource_id, details, ip_address, created_at)
            VALUES (@Action, @Level, @UserId, @UserName, @Resource, @ResourceId, @Details, @IpAddress, @CreatedAt)",
            new
            {
                Action = "cross_user_edit",
                Level = "warning",
                UserId = uid,
                UserName = uid,
                Resource = table,
                ResourceId = rowId.ToString(),
                Details = $"endpoint={endpoint}; rowOwner={rowOwner ?? "(null)"}; projectId={projectId?.ToString() ?? "(null)"}",
                IpAddress = ctx.Connection.RemoteIpAddress?.ToString() ?? "",
                CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            }, tx);
    }
}
