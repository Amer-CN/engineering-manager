using System.Data;
using System.Security.Claims;
using Dapper;
using EngineeringManager.Api;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// F6-2: AI 画像 prompt dump——系统 prompt 必须带上个人资料字段的具体值。
/// 这是「让 AI 了解用户」需求的唯一验收点：断言具体字段值出现在 prompt 里，
/// 不只断言 prompt 非空。
/// </summary>
public class AiProfilePromptTests
{
    private static SqliteConnection CreateDbWithProfile()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute("PRAGMA journal_mode=WAL");
        conn.Execute(@"
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                username TEXT,
                display_name TEXT,
                company_name TEXT,
                position TEXT,
                specialty TEXT,
                business_description TEXT,
                password_hash TEXT
            );");
        conn.Execute(@"
            INSERT INTO users (id, username, display_name, company_name, position, specialty, business_description, password_hash)
            VALUES ('user-f62', 'testuser', '测试用户', 'F6画像公司', '高级工程师', '结构设计', '工程咨询与项目管理', 'x');");
        return conn;
    }

    private static HttpContext CreateHttpContext(string userId)
    {
        var ctx = new DefaultHttpContext();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new("uid", userId),
        };
        ctx.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        return ctx;
    }

    [Fact]
    public void BuildSystemPrompt_ContainsConcreteProfileValues()
    {
        using var db = CreateDbWithProfile();
        var ctx = CreateHttpContext("user-f62");

        var prompt = AgentEndpoints.BuildSystemPrompt(ctx, db);

        // 断言具体字段值（不是只断言非空）
        Assert.Contains("## 当前用户画像", prompt);
        Assert.Contains("姓名: 测试用户", prompt);
        Assert.Contains("公司: F6画像公司", prompt);
        Assert.Contains("职位: 高级工程师", prompt);
        Assert.Contains("工种/专业: 结构设计", prompt);
        Assert.Contains("主要业务: 工程咨询与项目管理", prompt);
    }

    [Fact]
    public void BuildSystemPrompt_NoProfile_NoProfileBlock()
    {
        // 无画像数据（查不到用户）时，prompt 不含画像块，且不抛异常
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        conn.Execute("PRAGMA journal_mode=WAL");
        conn.Execute(@"CREATE TABLE users (
                id TEXT PRIMARY KEY,
                username TEXT,
                display_name TEXT,
                company_name TEXT,
                position TEXT,
                specialty TEXT,
                business_description TEXT,
                password_hash TEXT
            );");
        using var db = conn;
        var ctx = CreateHttpContext("nonexistent-user");

        var prompt = AgentEndpoints.BuildSystemPrompt(ctx, db);

        Assert.DoesNotContain("当前用户画像", prompt);
        // 主 prompt 仍存在（非空）
        Assert.False(string.IsNullOrWhiteSpace(prompt));
    }
}
