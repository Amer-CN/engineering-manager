using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// 对话详情 tool 结果装配测试（GetConversationDetailAsync）
///
/// 根因回归：assistant 行 tool_calls 列存的是 LLM 描述符 JSON（id/type/function 形状），
/// 真正的 ToolCallResult 存在 role='tool' 消息的 content 列。
/// 修复后：detail 响应中 assistant 消息的 toolCalls 应由紧随其后的 role='tool'
/// 消息 content 反序列化装配；tool 消息本身仍原样返回（前端过滤现状不变）。
///
/// 场景覆盖:
/// 1. assistant+tool 正常装配（toolCalls[0].toolName/success/result 真实值）
/// 2. 多轮交错 + 一轮内多次工具调用归属正确
/// 3. tool content 坏 JSON 跳过不炸
/// 4. 空 content 的 tool 消息跳过
/// 5. 旧数据 assistant tool_calls 描述符不再产生空壳
/// </summary>
public class AgentConversationDetailToolResultTests
{
    private const string UserId = "u1";
    private const string Now = "2026-09-04 10:00:00";

    private static SqliteConnection CreateDb()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        // 表结构对齐 Migrations/Scripts/027_AddAgentTables.sql（detail 查询涉及的列）
        conn.Execute(@"
            CREATE TABLE agent_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT '新对话',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT
            );
            CREATE TABLE agent_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT,
                tool_calls TEXT,
                tool_call_id TEXT,
                name TEXT,
                created_at TEXT NOT NULL
            );
        ");
        return conn;
    }

    private static long InsertConversation(SqliteConnection db)
    {
        db.Execute(
            "INSERT INTO agent_conversations (user_id, title, created_at, updated_at) VALUES (@Uid, @Title, @Now, @Now)",
            new { Uid = UserId, Title = "工具结果装配测试", Now });
        return db.ExecuteScalar<long>("SELECT last_insert_rowid()");
    }

    /// <summary>按写入路径的真实形状插一条消息（created_at 相同，依赖 id ASC 排序）</summary>
    private static void InsertMessage(
        SqliteConnection db,
        long conversationId,
        string role,
        string? content = null,
        string? toolCalls = null,
        string? name = null,
        string? toolCallId = null)
    {
        db.Execute(@"
            INSERT INTO agent_messages (conversation_id, role, content, tool_calls, tool_call_id, name, created_at)
            VALUES (@Cid, @Role, @Content, @ToolCalls, @ToolCallId, @Name, @Now)",
            new { Cid = conversationId, Role = role, Content = content, ToolCalls = toolCalls, ToolCallId = toolCallId, Name = name, Now });
    }

    /// <summary>与 AgentEndpoints 写库路径一致：Content = JsonSerializer.Serialize(result)</summary>
    private static string SerializeResult(ToolCallResult result) => JsonSerializer.Serialize(result);

    /// <summary>LLM 描述符 JSON（旧数据 assistant.tool_calls 列的形状，与 LLM 返回的 tool_calls 一致）</summary>
    private static string Descriptor(string callId, string toolName) =>
        JsonSerializer.Serialize(new List<ToolCall>
        {
            new ToolCall
            {
                Id = callId,
                Type = "function",
                Function = new ToolCallFunction { Name = toolName, Arguments = "{\"limit\":10}" },
            },
        });

    /// <summary>调 GetConversationDetailAsync 并把匿名响应定型为消息 JsonElement 列表</summary>
    private static List<JsonElement> GetDetailMessages(SqliteConnection db, long conversationId)
    {
        var service = new AgentConversationService();
        var detail = service.GetConversationDetailAsync(db, conversationId, UserId).GetAwaiter().GetResult();
        Assert.NotNull(detail);
        var doc = JsonDocument.Parse(JsonSerializer.Serialize(detail));
        return doc.RootElement.GetProperty("messages").EnumerateArray().Select(e => e.Clone()).ToList();
    }

    private static List<JsonElement>? GetToolCalls(JsonElement message) =>
        message.TryGetProperty("toolCalls", out var tc) && tc.ValueKind == JsonValueKind.Array
            ? tc.EnumerateArray().ToList()
            : null;

    // ═══════════════════════════════════════════════════════════
    // 场景 1：assistant+tool 正常装配
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void S1_AssistantTool_AssemblesRealResultFromToolMessageContent()
    {
        using var db = CreateDb();
        var cid = InsertConversation(db);

        InsertMessage(db, cid, MessageRole.User, content: "有哪些待开发票？");
        InsertMessage(db, cid, MessageRole.Assistant,
            content: null,
            toolCalls: Descriptor("call_1", "getInvoices"));
        InsertMessage(db, cid, MessageRole.Tool,
            content: SerializeResult(new ToolCallResult
            {
                ToolName = "getInvoices",
                ToolCallId = "call_1",
                Success = true,
                Result = new[]
                {
                    new { id = 189, invoiceNumber = "INV-001", amount = 1234500 },
                    new { id = 190, invoiceNumber = "INV-002", amount = 6789000 },
                },
            }),
            name: "getInvoices",
            toolCallId: "call_1");
        InsertMessage(db, cid, MessageRole.Assistant, content: "共 2 张待开发票。");

        var messages = GetDetailMessages(db, cid);
        Assert.Equal(4, messages.Count);

        // 发起调用的 assistant：toolCalls 装配真实结果
        var toolCalls = GetToolCalls(messages[1]);
        Assert.NotNull(toolCalls);
        var tc = Assert.Single(toolCalls);
        Assert.Equal("getInvoices", tc.GetProperty("toolName").GetString());
        Assert.True(tc.GetProperty("success").GetBoolean());
        Assert.Equal("call_1", tc.GetProperty("toolCallId").GetString());
        var result = tc.GetProperty("result");
        Assert.Equal(JsonValueKind.Array, result.ValueKind);
        Assert.Equal(2, result.GetArrayLength());
        Assert.Equal("INV-001", result[0].GetProperty("invoiceNumber").GetString());

        // tool 消息本身仍按现状原样返回（前端过滤现状不变）
        Assert.Equal(MessageRole.Tool, (string)messages[2].GetProperty("role").GetString()!);

        // 最终文本 assistant：无 toolCalls
        Assert.Null(GetToolCalls(messages[3]));

        // user 消息不受影响
        Assert.Equal(MessageRole.User, (string)messages[0].GetProperty("role").GetString()!);
        Assert.Equal("有哪些待开发票？", messages[0].GetProperty("content").GetString());
    }

    // ═══════════════════════════════════════════════════════════
    // 场景 2：多轮交错 + 一轮内多次工具调用
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void S2_InterleavedRounds_MultiToolCalls_AttributeToNearestAssistant()
    {
        using var db = CreateDb();
        var cid = InsertConversation(db);

        // assistant1 → tool A1 → tool A2 → assistant2 → tool B1 → assistant3(最终文本)
        InsertMessage(db, cid, MessageRole.Assistant, toolCalls: Descriptor("call_A1", "getInvoices"));
        InsertMessage(db, cid, MessageRole.Tool,
            content: SerializeResult(new ToolCallResult { ToolName = "getInvoices", ToolCallId = "call_A1", Success = true, Result = new[] { new { id = 1 } } }),
            name: "getInvoices", toolCallId: "call_A1");
        InsertMessage(db, cid, MessageRole.Tool,
            content: SerializeResult(new ToolCallResult { ToolName = "getProjects", ToolCallId = "call_A2", Success = true, Result = new[] { new { id = 2 } } }),
            name: "getProjects", toolCallId: "call_A2");
        InsertMessage(db, cid, MessageRole.Assistant, toolCalls: Descriptor("call_B1", "getMembers"));
        InsertMessage(db, cid, MessageRole.Tool,
            content: SerializeResult(new ToolCallResult { ToolName = "getMembers", ToolCallId = "call_B1", Success = true, Result = new[] { new { id = 3 } } }),
            name: "getMembers", toolCallId: "call_B1");
        InsertMessage(db, cid, MessageRole.Assistant, content: "查询完成。");

        var messages = GetDetailMessages(db, cid);
        Assert.Equal(6, messages.Count);

        // assistant1 收齐同轮两条 tool 结果，顺序保持
        var first = GetToolCalls(messages[0]);
        Assert.NotNull(first);
        Assert.Equal(2, first.Count);
        Assert.Equal("getInvoices", first[0].GetProperty("toolName").GetString());
        Assert.Equal("getProjects", first[1].GetProperty("toolName").GetString());

        // assistant2 只归它后面那段 tool
        var second = GetToolCalls(messages[3]);
        Assert.NotNull(second);
        var b1 = Assert.Single(second);
        Assert.Equal("getMembers", b1.GetProperty("toolName").GetString());

        // 最终文本 assistant 无 toolCalls
        Assert.Null(GetToolCalls(messages[5]));
    }

    // ═══════════════════════════════════════════════════════════
    // 场景 3：tool content 坏 JSON 跳过不炸
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void S3_BrokenJsonToolContent_Skipped_NoThrow()
    {
        using var db = CreateDb();
        var cid = InsertConversation(db);

        InsertMessage(db, cid, MessageRole.Assistant, toolCalls: Descriptor("call_1", "getInvoices"));
        InsertMessage(db, cid, MessageRole.Tool, content: "{ broken json!!!", name: "getInvoices", toolCallId: "call_1");
        InsertMessage(db, cid, MessageRole.Tool,
            content: SerializeResult(new ToolCallResult { ToolName = "getInvoices", ToolCallId = "call_2", Success = true, Result = new[] { new { id = 5 } } }),
            name: "getInvoices", toolCallId: "call_2");
        InsertMessage(db, cid, MessageRole.Assistant, content: "完成。");

        var messages = GetDetailMessages(db, cid); // 不抛异常即通过"不炸"
        var toolCalls = GetToolCalls(messages[0]);

        // 坏 JSON 那条被跳过，不产生空壳条目；只收下合法那条
        Assert.NotNull(toolCalls);
        var tc = Assert.Single(toolCalls);
        Assert.Equal("getInvoices", tc.GetProperty("toolName").GetString());
        Assert.Equal("call_2", tc.GetProperty("toolCallId").GetString());
        Assert.True(tc.GetProperty("success").GetBoolean());
    }

    // ═══════════════════════════════════════════════════════════
    // 场景 4：空 content 的 tool 消息跳过
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void S4_EmptyContentToolMessages_Skipped()
    {
        using var db = CreateDb();
        var cid = InsertConversation(db);

        InsertMessage(db, cid, MessageRole.Assistant, toolCalls: Descriptor("call_1", "getSettlements"));
        InsertMessage(db, cid, MessageRole.Tool, content: null, name: "getSettlements", toolCallId: "call_1");
        InsertMessage(db, cid, MessageRole.Tool, content: "", name: "getSettlements", toolCallId: "call_1");
        InsertMessage(db, cid, MessageRole.Tool,
            content: SerializeResult(new ToolCallResult { ToolName = "getSettlements", ToolCallId = "call_1", Success = true, Result = new[] { new { id = 9 } } }),
            name: "getSettlements", toolCallId: "call_1");
        InsertMessage(db, cid, MessageRole.Assistant, content: "完成。");

        var messages = GetDetailMessages(db, cid);
        var toolCalls = GetToolCalls(messages[0]);

        // null / 空串 content 均跳过，只收下有内容的这条
        Assert.NotNull(toolCalls);
        var tc = Assert.Single(toolCalls);
        Assert.Equal("getSettlements", tc.GetProperty("toolName").GetString());
        Assert.True(tc.GetProperty("success").GetBoolean());
        Assert.Equal(1, tc.GetProperty("result").GetArrayLength());
    }

    // ═══════════════════════════════════════════════════════════
    // 场景 5：旧数据 assistant tool_calls 描述符不再产生空壳
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public void S5_LegacyDescriptorToolCalls_NoEmptyShell()
    {
        using var db = CreateDb();
        var cid = InsertConversation(db);

        // 旧数据形状：assistant.tool_calls = 描述符 JSON，其后无 tool 消息
        InsertMessage(db, cid, MessageRole.Assistant,
            content: "好的，我来查询。",
            toolCalls: Descriptor("call_legacy", "getInvoices"));
        InsertMessage(db, cid, MessageRole.Assistant, content: "查询结果如下……");

        var messages = GetDetailMessages(db, cid);
        Assert.Equal(2, messages.Count);

        // 描述符不再被反序列化成全默认值空壳（toolName=""/success=false/result=null）
        Assert.Null(GetToolCalls(messages[0]));

        // 整个响应里不出现空壳特征字段值
        var raw = JsonSerializer.Serialize(messages);
        Assert.DoesNotContain("\"toolName\":\"\"", raw);
        Assert.DoesNotContain("call_legacy", raw);
    }
}
