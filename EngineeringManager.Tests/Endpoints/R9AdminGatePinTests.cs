using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R9-8 Z2：D7 钉住——POST /api/audit/clear 的 admin-only 门（isAdmin==0 → 403）。
///
/// R9-8 闭卷清点（Z1）：D4/D5（templates）/ D8（sqlite/migrate）已有 worker→403 既有覆盖
/// （WritePermissionB1Tests / WritePermissionT1Tests），唯一缺覆盖 = D7（audit/clear，grep 零命中）。
/// 本文件钉住 D7 既有行为：worker（默认矩阵，无 admin 身份）调 audit/clear → 403 且
/// 早于 cutoff 的审计行仍在（无副作用）。零生产代码改动——钉的是既有行为，全部应绿。
/// </summary>
public class R9AdminGatePinTests : ApiTestBase
{
    private const string WorkerUid = "r9-8-worker";
    private const string WorkerUsername = "r9-8-worker";
    private const string Password = "admin123";
    private const string Now = "2026-08-01 00:00:00";

    private async Task<string> LoginAsync(string username)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("data").GetProperty("token").GetString()!;
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private void SeedWorker()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "r9-8-worker-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = WorkerUid, Username = WorkerUsername, Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "工人", RoleId = "worker", Status = "active", Now
            });
    }

    /// <summary>seed 一行早于 90 天 cutoff 的审计日志（default cutoff=90 天），返回 id</summary>
    private long SeedOldAuditLog()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        // created_at 用 2026-01-01（远早于 2026-08-10 减 90 天 ≈ 2026-05-12）
        return conn.ExecuteScalar<long>(@"INSERT INTO audit_logs (action, level, user_id, user_name, resource, resource_id, details, ip_address, created_at)
            VALUES ('test', 'info', 'seed', 'seed', 'test', '1', '{}', '127.0.0.1', '2026-01-01 00:00:00');
            SELECT last_insert_rowid();");
    }

    // ── D7 钉住：worker 调 audit/clear → 403 且早于 cutoff 的审计行仍在 ──
    [Fact]
    public async Task D7_AuditClear_Worker_Returns403_AndOldLogsStay()
    {
        SeedWorker();
        SetAuth(await LoginAsync(WorkerUsername));

        var logId = SeedOldAuditLog();

        var resp = await Client.PostAsJsonAsync("/api/audit/clear", new { daysToKeep = 90 });
        // 既有行为：worker 非 admin → isAdmin==0 → 403
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        // 无副作用：早于 cutoff 的审计行仍在（未被清空）
        using (var conn = new SqliteConnection(ConnectionString))
        {
            Assert.Equal(1L, conn.ExecuteScalar<long>("SELECT COUNT(*) FROM audit_logs WHERE id=@Id", new { Id = logId }));
        }
    }
}
