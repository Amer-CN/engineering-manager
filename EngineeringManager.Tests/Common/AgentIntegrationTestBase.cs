using System.Net.Http.Headers;
using System.Net.Http.Json;
using Dapper;
using EngineeringManager.Api.Services;
using EngineeringManager.Tests.Common;
using EngineeringManager.Tests.Endpoints;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;

namespace EngineeringManager.Tests.Common;

/// <summary>
/// Agent 集成测试基类 — 继承 ApiTestBase，在 DI 中替换 ILlmChatService 为 FakeLlmChatService。
///
/// 关键设计：
///   - 调用 ApiConfig.ConfigureServices 注册全部生产服务
///   - 然后用 FakeLlmChatService 覆盖 ILlmChatService 注册
///   - 真实执行 AgentEndpoints 的 HTTP 路由和 tool loop
///   - Fake 只控制 LLM 返回内容
/// </summary>
public abstract class AgentIntegrationTestBase : ApiTestBase
{
    protected FakeLlmChatService FakeLlm { get; private set; } = null!;

    /// <summary>子类创建具体的 FakeLlmChatService 实例</summary>
    protected abstract FakeLlmChatService CreateFakeLlm();

    protected override void ConfigureExtraServices(IServiceCollection services)
    {
        FakeLlm = CreateFakeLlm();
        // 覆盖 ILlmChatService 注册为 Fake
        services.AddSingleton<ILlmChatService>(FakeLlm);
    }

    /// <summary>登录 admin 并返回 token（同时设置 Authorization header）</summary>
    protected async Task<string> LoginAdminAsync()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login",
            new { username = "admin", password = "admin123" });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadAsStringAsync();
        var marker = "\"token\":\"";
        var i = body.IndexOf(marker) + marker.Length;
        var j = body.IndexOf('"', i);
        var token = body.Substring(i, j - i);
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return token;
    }

    /// <summary>在测试数据库中入库知识库文档</summary>
    protected async Task<long> IngestKnowledgeDocument(
        string fullText,
        string title,
        string createdBy = "1",
        int? projectId = null,
        string sourceType = "manual",
        string? sourceRef = null,
        string? occurredAt = null)
    {
        await using var conn = new SqliteConnection(ConnectionString);
        await conn.OpenAsync();
        var embedding = new FakeEmbeddingService();
        var service = new KnowledgeBaseService(conn, embedding);
        var result = await service.IngestAsync(
            fullText: fullText,
            title: title,
            sourceType: sourceType,
            sourceRef: sourceRef,
            projectId: projectId,
            createdBy: createdBy,
            occurredAt: occurredAt);
        return result.DocumentId;
    }

    /// <summary>创建项目并返回 ID</summary>
    protected long CreateProject(string name, string createdBy = "1")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(
            "INSERT INTO projects (name, status, created_by, created_at, updated_at) VALUES (@Name, 'active', @CreatedBy, @Now, @Now)",
            new { Name = name, CreatedBy = createdBy, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
        return Convert.ToInt64(conn.ExecuteScalar("SELECT last_insert_rowid()"));
    }

    /// <summary>授权用户访问项目</summary>
    protected void AuthorizeProject(long projectId, string userId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(
            "INSERT OR IGNORE INTO project_authorizations (project_id, user_id) VALUES (@Pid, @Uid)",
            new { Pid = projectId, Uid = userId });
    }

    /// <summary>查询数据库中的 agent 消息链</summary>
    protected List<dynamic> GetAgentMessages(long conversationId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.Query<dynamic>(
            "SELECT id, role, content, tool_calls, tool_call_id, name, created_at FROM agent_messages WHERE conversation_id = @Id ORDER BY id ASC",
            new { Id = conversationId }).ToList();
    }
}
