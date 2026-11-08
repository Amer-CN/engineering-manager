using System.Data;
using Dapper;

namespace EngineeringManager.Api.Services;

/// <summary>
/// 期间锁定（T7c）：锁定后禁止新增凭证/过账/反过账/删除草稿/保存期初余额。
/// 只做「期间锁定」，不做完整损益结转（明确边界）。
/// </summary>
public static class PeriodLockService
{
    public static bool IsLocked(IDbConnection db, string? period, IDbTransaction? tx = null)
    {
        if (string.IsNullOrWhiteSpace(period)) return false;
        return db.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [period_locks] WHERE [period]=@Period",
            new { Period = period }, tx) > 0;
    }

    public static string LockedMessage(string? period) =>
        $"期间 {period} 已锁定，禁止新增凭证、过账、反过账或修改期初余额";
}