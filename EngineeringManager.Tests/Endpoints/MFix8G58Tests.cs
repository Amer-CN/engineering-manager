using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Dapper;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// M-FIX8 T2 (G58): knowledge folder 写侧（PUT/DELETE /api/knowledge/folders/{id}）
/// 越权实证——修复前两处 UPDATE 的 WHERE 只有 id + deleted_at，零 created_by/授权范围，
/// 任何持有 knowledge:update/delete 权限码的用户都能改/删他人文件夹。
///
/// 先红后绿：本文件先跑（修复前）前两条必须拿到 200（越权成功）；修复后转 403。
/// 用户：userA = admin（created_by 本人，正向用例）；userB = manager（有 knowledge:* 权限码、
///       非 admin、非 created_by、无 project_authorizations → 越权方）。
/// </summary>
public class MFix8G58Tests : ApiTestBase
{
    private const string AdminUid = "mfix8-admin";
    private const string OtherUid = "mfix8-other";

    private static string ExtractToken(string json)
    {
        var marker = "\"token\":\"";
        var i = json.IndexOf(marker, StringComparison.Ordinal);
        if (i < 0) throw new Exception("token not found: " + json);
        var start = i + marker.Length;
        var end = json.IndexOf('\"', start);
        return json.Substring(start, end - start);
    }

    private void SetAuth(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private void Seed()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        var salt = "test-salt-1234567890123456";
        var hash = EngineeringManager.Api.Common.HashPassword("admin123", salt, 2);

        // 用户 A：admin 角色（正向用例的文件夹创建者）
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new { Id = AdminUid, Username = "mfix8-admin", Password = "admin123", Hash = hash, Salt = salt, Version = 2, DisplayName = "管理员", RoleId = "admin", Status = "active", Now = now });
        // 用户 B：manager 角色（有 knowledge:update/delete 权限码，非 admin，无项目授权）
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new { Id = OtherUid, Username = "mfix8-other", Password = "admin123", Hash = hash, Salt = salt, Version = 2, DisplayName = "经理", RoleId = "manager", Status = "active", Now = now });

        // 项目 + 授权：P1 归 admin 创建，用户 B 无任何 project_authorizations
        conn.Execute("INSERT INTO projects (id, name, created_by, created_at) VALUES (1, 'P1', @Admin, @Now)",
            new { Admin = AdminUid, Now = now });

        // 文件夹 1（admin 创建，挂 P1）
        conn.Execute(@"INSERT INTO knowledge_folders (id, name, english_name, project_id, category, created_at, updated_at, created_by)
            VALUES (1, 'F1', 'folder-one', 1, '演示', @Now, @Now, @Admin)",
            new { Admin = AdminUid, Now = now });
        // 文件夹 2（other 用户创建，不挂项目）——给 DELETE 越权用另一只夹，避免用例间串扰
        conn.Execute(@"INSERT INTO knowledge_folders (id, name, english_name, project_id, category, created_at, updated_at, created_by)
            VALUES (2, 'F2', 'folder-two', NULL, NULL, @Now, @Now, 'some-other-user')",
            new { Now = now });

        // 文档挂到文件夹 1（DELETE 后断言 folder_id 被置 NULL 用）
        conn.Execute(@"INSERT INTO knowledge_documents (id, title, full_text, source_type, source_ref, project_id, folder_id, occurred_at, created_at, updated_at, created_by)
            VALUES (1, 'doc-in-F1', '测试全文', 'manual', 'ref-1', 1, 1, @Now, @Now, @Now, @Admin)",
            new { Admin = AdminUid, Now = now });
    }

    private async Task LoginAs(string username)
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login", new { username, password = "admin123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        SetAuth(ExtractToken(await login.Content.ReadAsStringAsync()));
    }

    // ── 修复后绿：越权方（用户 B）PUT 他人文件夹 → 403 ──
    // 注意：不传 projectId（改名字/分类），绕过 PUT 端点里"新项目"的 CanAccessProject 校验，
    // 专门验证 G58 的修复（目标文件夹本身可访问判定）。
    [Fact]
    public async Task UserB_Put_OtherUsersFolder_Returns403()
    {
        Seed();
        await LoginAs("mfix8-other"); // manager，有 knowledge:update
        var resp = await Client.PutAsJsonAsync("/api/knowledge/folders/1", new
        {
            name = "hijacked-by-B",
            englishName = "hijacked",
            projectId = (int?)null,   // 不携带项目变更 → 端点内 CanAccessProject 分支不触发
            category = "越权",
        });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── 修复后绿：越权方（用户 B）DELETE 他人文件夹 → 403 ──
    [Fact]
    public async Task UserB_Delete_OtherUsersFolder_Returns403()
    {
        Seed();
        await LoginAs("mfix8-other"); // manager，有 knowledge:delete
        var resp = await Client.DeleteAsync("/api/knowledge/folders/2");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    // ── 修复后绿：本人（用户 A）PUT 自己的文件夹 → 200 ──
    [Fact]
    public async Task UserA_Put_OwnFolder_Returns200()
    {
        Seed();
        await LoginAs("mfix8-admin"); // admin 即 created_by
        var resp = await Client.PutAsJsonAsync("/api/knowledge/folders/1", new
        {
            name = "F1-renamed",
            englishName = "folder-one-new",
            projectId = 1,
            category = "演示",
        });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ── 修复后绿：本人（用户 A）DELETE 自己的文件夹 → 200 + 文档 folder_id 置 NULL ──
    [Fact]
    public async Task UserA_Delete_OwnFolder_Returns200_And_DocumentsDetached()
    {
        Seed();
        await LoginAs("mfix8-admin"); // admin 即 created_by
        var resp = await Client.DeleteAsync("/api/knowledge/folders/1");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        // (f) 正向断言：DELETE 后 knowledge_documents.folder_id 被置 NULL
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var folderId = conn.ExecuteScalar<long?>(
            "SELECT folder_id FROM knowledge_documents WHERE id = 1");
        Assert.Null(folderId);
        // 文件夹本身已软删
        var deleted = conn.ExecuteScalar<string?>(
            "SELECT deleted_at FROM knowledge_folders WHERE id = 1");
        Assert.NotNull(deleted);
    }
}
