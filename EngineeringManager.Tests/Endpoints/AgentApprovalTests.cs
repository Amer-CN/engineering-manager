using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// Agent 审批门（approval）端到端测试 — 建议 → 确认 → 执行闭环。
///
/// 覆盖（AgentApprovalTests 契约：docs/AGENT-APPROVAL-CARD-INTEGRATION.md）：
///   S1 未登录 resolve → 401
///   S2 无权限（worker 无 invoices:update）resolve → 403，数据不变
///   S3 confirm 正常路径：非流式 chat + 手写 tool_calls（Fake LLM）→ 响应携带确认卡
///      （真实发票数据）→ resolve confirm → 发票 status 真实变更 + resolution 回填 +
///      执行结果 assistant 消息追加；确认前不执行
///   S4 幂等防重放：同一 requestId 二次 resolve → alreadyResolved，version 只 +1（执行计数=1）
///   S5 非法 optionKey → 400 拒绝，数据不变
///   S6 cancel → 不执行、回填 resolution、不追加执行结果消息
///   S7 requestId 找不到 → 404
///
/// 执行体参数取服务端持久化 tool_calls 原样参数（不信任请求 body），故 S3 里故意把
/// resolve 请求 body 只带 requestId/optionKey/resolvedAt。
/// </summary>
public class AgentApprovalTests : ApiTestBase
{
    private const string AdminUid = "1";              // ApiTestBase 基座种子 admin
    private const string WorkerUid = "approval-worker";
    private const string WorkerUsername = "approval-worker";
    private const string Password = "admin123";
    private const string Now = "2026-09-06 09:00:00";

    private ApprovalFakeLlm? _fake;

    protected override void ConfigureExtraServices(IServiceCollection services)
    {
        _fake = new ApprovalFakeLlm();
        services.AddSingleton<ILlmChatService>(_fake);
    }

    // ═══════════════════════════════════════════════════════════
    // 测试替身：第 1 轮返回 markInvoicesReceived tool_call，第 2 轮返回最终文本
    // ═══════════════════════════════════════════════════════════

    private sealed class ApprovalFakeLlm : ILlmChatService
    {
        /// <summary>第 1 轮 tool_call 的 arguments（测试种子后注入真实 invoiceIds）</summary>
        public string FirstRoundToolArgs { get; set; } = "{\"invoiceIds\":[]}";

        private int _callCount;

        public Task<ChatCompletionResponse?> ChatAsync(
            List<AgentMessage> messages,
            List<object>? tools = null,
            string? model = null,
            string? reasoningEffort = null,
            CancellationToken ct = default)
        {
            _callCount++;
            if (_callCount == 1)
            {
                return Task.FromResult<ChatCompletionResponse?>(new ChatCompletionResponse
                {
                    Id = "approval-fake-1",
                    Choices = new List<ChatChoice>
                    {
                        new()
                        {
                            Index = 0,
                            Message = new ChatResponseMessage
                            {
                                Role = "assistant",
                                Content = null,
                                ToolCalls = new List<ToolCall>
                                {
                                    new()
                                    {
                                        Id = "call-approval-1",
                                        Type = "function",
                                        Function = new ToolCallFunction
                                        {
                                            Name = "markInvoicesReceived",
                                            Arguments = FirstRoundToolArgs,
                                        },
                                    }
                                },
                            },
                            FinishReason = "tool_calls",
                        }
                    }
                });
            }

            return Task.FromResult<ChatCompletionResponse?>(new ChatCompletionResponse
            {
                Id = "approval-fake-2",
                Choices = new List<ChatChoice>
                {
                    new()
                    {
                        Index = 0,
                        Message = new ChatResponseMessage
                        {
                            Role = "assistant",
                            Content = "操作待确认：请在下方确认卡上点选是否执行。",
                            ToolCalls = null,
                        },
                        FinishReason = "stop",
                    }
                }
            });
        }

        public async IAsyncEnumerable<string> ChatStreamAsync(
            List<AgentMessage> messages,
            List<object>? tools = null,
            string? model = null,
            string? reasoningEffort = null,
            [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
        {
            await Task.CompletedTask;
            yield break;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 种子与辅助
    // ═══════════════════════════════════════════════════════════

    private async Task<string> LoginAsync(string username)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { username, password = Password });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var token = json.GetProperty("data").GetProperty("token").GetString()!;
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return token;
    }

    private long SeedInvoice(string name, string invoiceNo, string createdBy, string status = "pending", double amount = 100000)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(@"INSERT INTO invoices
            (project_id,name,invoice_no,amount,status,type,created_by,created_at,updated_at,version,last_modified_at)
            VALUES (NULL,@N,@No,@A,@S,'invoice_out',@By,@Now,@Now,1,@Now);
            SELECT last_insert_rowid();",
            new { N = name, No = invoiceNo, A = amount, S = status, By = createdBy, Now });
    }

    private dynamic? QueryInvoice(long invId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        return conn.QueryFirstOrDefault("SELECT name, status, amount, version FROM invoices WHERE id=@Id", new { Id = invId });
    }

    private long SeedConversation(string ownerUid, string title = "审批门测试会话")
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(
            "INSERT INTO agent_conversations (user_id, title, created_at, updated_at) VALUES (@Uid, @Title, @Now, @Now)",
            new { Uid = ownerUid, Title = title, Now });
        return conn.ExecuteScalar<long>("SELECT last_insert_rowid()");
    }

    /// <summary>按后端写入路径的真实形状插一条带确认卡的 assistant 消息（tool_calls 列存 LLM 描述符）</summary>
    private void SeedApprovalMessage(long conversationId, string requestId, string toolArgs)
    {
        var toolCalls = JsonSerializer.Serialize(new List<ToolCall>
        {
            new ToolCall
            {
                Id = "call-approval-seed",
                Type = "function",
                Function = new ToolCallFunction { Name = "markInvoicesReceived", Arguments = toolArgs },
            },
        });
        var approval = JsonSerializer.Serialize(new
        {
            requestId,
            title = "是否将这 2 张发票标记为已收齐？",
            body = "将把以下发票标记为已收齐",
            options = new object[]
            {
                new { key = "confirm", label = "确认执行", @short = "将 2 张发票标记为已收齐", signal = 3, signalLabel = "写操作 · 需确认", tone = "success", primary = true },
                new { key = "cancel", label = "取消", @short = "本轮不执行任何修改", signal = 0 },
            },
            // 后端内部扩展字段（对齐 BuildApprovalRequestAsync 真实形状）：resolve 从这里取执行参数
            action = new
            {
                tool = "markInvoicesReceived",
                args = toolArgs,
            },
        });
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        conn.Execute(@"
            INSERT INTO agent_messages (conversation_id, role, content, tool_calls, approval, created_at)
            VALUES (@Cid, 'assistant', '操作待确认', @ToolCalls, @Approval, @Now)",
            new { Cid = conversationId, ToolCalls = toolCalls, Approval = approval, Now });
    }

    private void SeedWorkerUser()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var salt = "approval-worker-salt-123456";
        var hash = EngineeringManager.Api.Common.HashPassword(Password, salt, 2);
        conn.Execute(@"INSERT OR IGNORE INTO users (id, username, password, password_hash, password_salt, password_hash_version, display_name, role_id, status, created_at)
            VALUES (@Id, @Username, @Password, @Hash, @Salt, @Version, @DisplayName, @RoleId, @Status, @Now)",
            new
            {
                Id = WorkerUid, Username = WorkerUsername, Password = Password, Hash = hash, Salt = salt,
                Version = 2, DisplayName = "工人甲", RoleId = "worker", Status = "active", Now
            });
    }

    private string? GetApprovalJson(long conversationId, string requestId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        var rows = conn.Query<string>(
            "SELECT approval FROM agent_messages WHERE conversation_id=@Cid AND approval IS NOT NULL ORDER BY id DESC",
            new { Cid = conversationId });
        foreach (var text in rows)
        {
            try
            {
                using var doc = JsonDocument.Parse(text);
                if (doc.RootElement.TryGetProperty("requestId", out var rid) && rid.GetString() == requestId)
                    return text;
            }
            catch { /* 坏 JSON 跳过 */ }
        }
        return null;
    }

    private long CountExecutionResultMessages(long conversationId)
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        return conn.ExecuteScalar<long>(
            "SELECT COUNT(*) FROM agent_messages WHERE conversation_id=@Cid AND role='assistant' AND content LIKE '✓ 已将%'",
            new { Cid = conversationId });
    }

    private async Task<(long ConversationId, string RequestId)> ChatToApprovalAsync(
        long[] invoiceIds, string[] expectedInvoiceNos)
    {
        Assert.NotNull(_fake);
        _fake.FirstRoundToolArgs = JsonSerializer.Serialize(new { invoiceIds });

        var resp = await Client.PostAsJsonAsync("/api/agent/chat", new { message = "把这两张发票标记为已收齐" });
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var data = json.GetProperty("data");
        Assert.True(data.GetProperty("success").GetBoolean());

        var convId = data.GetProperty("conversationId").GetInt64();
        var message = data.GetProperty("message");
        Assert.True(message.TryGetProperty("approval", out var approvalEl), "响应应携带确认卡 approval");
        var approval = approvalEl.ValueKind == JsonValueKind.Null ? (JsonElement?)null : approvalEl;
        Assert.NotNull(approval);

        var requestId = approval!.Value.GetProperty("requestId").GetString()!;
        Assert.StartsWith($"approval_{convId}_", requestId);
        // requestId 后缀为 Guid（并发防撞号）：approval_{cid}_{32位hex}
        var suffix = requestId.Substring($"approval_{convId}_".Length);
        Assert.True(suffix.Length == 32 && suffix.All(char.IsAsciiHexDigit),
            $"requestId 后缀应为 32 位 hex Guid，实际: {requestId}");
        Assert.Equal($"是否将这 {invoiceIds.Length} 张发票标记为已收齐？", approval.Value.GetProperty("title").GetString());

        // 防失配：建卡时 action 字段绑定工具名 + 原样参数，args 内的发票 ID 与请求的完全一致
        Assert.True(approval.Value.TryGetProperty("action", out var actionEl), "approval 应携带 action 绑定");
        Assert.Equal("markInvoicesReceived", actionEl.GetProperty("tool").GetString());
        var boundIds = actionEl.GetProperty("args").GetProperty("invoiceIds")
            .EnumerateArray().Select(x => x.GetInt64()).OrderBy(x => x).ToArray();
        Assert.Equal(invoiceIds.OrderBy(x => x).ToArray(), boundIds);

        // 确认卡正文必须含数据库里的真实发票数据（票号 + 金额 ¥ 千分位格式化）
        var body = approval.Value.GetProperty("body").GetString()!;
        foreach (var no in expectedInvoiceNos)
            Assert.Contains(no, body);
        Assert.Contains("¥100,000.00", body);

        // 确认前不得执行：发票状态仍是 pending
        return (convId, requestId);
    }

    private async Task<HttpResponseMessage> ResolveAsync(long conversationId, string requestId, string optionKey) =>
        await Client.PostAsJsonAsync($"/api/agent/conversations/{conversationId}/approval/resolve",
            new { requestId, optionKey, resolvedAt = "2026-09-06T10:00:00.000Z" });

    // ═══════════════════════════════════════════════════════════
    // S1：未登录 → 401
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task S1_ResolveWithoutLogin_Returns401()
    {
        Client.DefaultRequestHeaders.Authorization = null;
        var resp = await ResolveAsync(123, "approval_123_1", "confirm");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ═══════════════════════════════════════════════════════════
    // S2：无权限（worker 无 invoices:update）→ 403，数据不变
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task S2_ResolveWithoutPermission_Returns403_NoChange()
    {
        SeedWorkerUser();
        var invId = SeedInvoice("工人视角发票", "INV-APPROVAL-W", WorkerUid);
        var cid = SeedConversation(WorkerUid);
        var requestId = $"approval_{cid}_{Guid.NewGuid():N}";
        SeedApprovalMessage(cid, requestId, JsonSerializer.Serialize(new { invoiceIds = new[] { invId } }));

        await LoginAsync(WorkerUsername);
        var resp = await ResolveAsync(cid, requestId, "confirm");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        // 数据不变 + resolution 未回填
        Assert.Equal("pending", (string)QueryInvoice(invId)!.status);
        using var doc = JsonDocument.Parse(GetApprovalJson(cid, requestId)!);
        Assert.False(doc.RootElement.TryGetProperty("resolution", out _));
    }

    // ═══════════════════════════════════════════════════════════
    // S3：confirm 正常路径（非流式 chat + 手写 tool_calls 的等价闭环）
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task S3_Confirm_ExecutesInvoiceUpdate_AndBackfillsResolution()
    {
        var inv1 = SeedInvoice("材料采购发票A", "INV-APPROVAL-001", AdminUid);
        var inv2 = SeedInvoice("材料采购发票B", "INV-APPROVAL-002", AdminUid);
        await LoginAsync("admin");

        var (cid, requestId) = await ChatToApprovalAsync(
            new[] { inv1, inv2 }, new[] { "INV-APPROVAL-001", "INV-APPROVAL-002" });

        // 确认前：拦截生效，发票状态不变（工具循环未执行写操作）
        Assert.Equal("pending", (string)QueryInvoice(inv1)!.status);

        var resp = await ResolveAsync(cid, requestId, "confirm");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var json = await resp.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.False(json.GetProperty("data").GetProperty("alreadyResolved").GetBoolean());

        // 数据真实变更：status → received，version +1（各执行一次）
        Assert.Equal("received", (string)QueryInvoice(inv1)!.status);
        Assert.Equal("received", (string)QueryInvoice(inv2)!.status);
        Assert.Equal(2L, (long)QueryInvoice(inv1)!.version);

        // 消息回填：approval JSON 含 resolution（optionKey=confirm）
        var approvalText = GetApprovalJson(cid, requestId)!;
        using var doc = JsonDocument.Parse(approvalText);
        var resolution = doc.RootElement.GetProperty("resolution");
        Assert.Equal("confirm", resolution.GetProperty("optionKey").GetString());
        Assert.Equal(requestId, resolution.GetProperty("requestId").GetString());

        // 执行结果 assistant 消息追加（静态文案，未再调 LLM）
        Assert.Equal(1L, CountExecutionResultMessages(cid));

        // 历史装配：重进会话（GET 对话详情）确认卡带回前端，且已决态保持（resolution 随 approval 列回放）
        var detailResp = await Client.GetAsync($"/api/agent/conversations/{cid}");
        var detailJson = await detailResp.Content.ReadFromJsonAsync<JsonElement>();
        JsonElement? replayed = null;
        foreach (var m in detailJson.GetProperty("data").GetProperty("messages").EnumerateArray())
        {
            if (m.TryGetProperty("approval", out var a) && a.ValueKind == JsonValueKind.Object
                && a.GetProperty("requestId").GetString() == requestId)
            {
                replayed = a;
                break;
            }
        }
        Assert.NotNull(replayed);
        Assert.Equal("confirm", replayed!.Value.GetProperty("resolution").GetProperty("optionKey").GetString());

        // 审计：agent_approval_executed 一条，含 requestId 与 optionKey；
        // 防失配：审计里的 updatedIds 必须等于 approval.action.args 绑定的发票 ID
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var audit = conn.QueryFirstOrDefault<string>(
            "SELECT details FROM audit_logs WHERE action='agent_approval_executed'");
        Assert.NotNull(audit);
        Assert.Contains($"requestId={requestId}; optionKey=confirm", audit);
        Assert.Contains($"updatedIds=[{inv1},{inv2}]", audit);
    }

    // ═══════════════════════════════════════════════════════════
    // S4：幂等防重放 — 同一 requestId 二次 resolve 执行次数 = 1
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task S4_ResolveSameRequestIdTwice_ExecutesOnlyOnce()
    {
        var inv1 = SeedInvoice("幂等发票A", "INV-APPROVAL-101", AdminUid);
        var inv2 = SeedInvoice("幂等发票B", "INV-APPROVAL-102", AdminUid);
        await LoginAsync("admin");
        var (cid, requestId) = await ChatToApprovalAsync(
            new[] { inv1, inv2 }, new[] { "INV-APPROVAL-101", "INV-APPROVAL-102" });

        var first = await ResolveAsync(cid, requestId, "confirm");
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var versionAfterFirst = (long)QueryInvoice(inv1)!.version;

        var second = await ResolveAsync(cid, requestId, "confirm");
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var secondJson = await second.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(secondJson.GetProperty("data").GetProperty("alreadyResolved").GetBoolean());

        // 执行计数 = 1：version 不再 +1，执行结果消息仍只有一条
        Assert.Equal(versionAfterFirst, (long)QueryInvoice(inv1)!.version);
        Assert.Equal(1L, CountExecutionResultMessages(cid));
    }

    // ═══════════════════════════════════════════════════════════
    // S5：非法 optionKey → 拒绝，数据不变
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task S5_InvalidOptionKey_Rejected_NoChange()
    {
        var inv1 = SeedInvoice("非法选项发票A", "INV-APPROVAL-201", AdminUid);
        var inv2 = SeedInvoice("非法选项发票B", "INV-APPROVAL-202", AdminUid);
        await LoginAsync("admin");
        var (cid, requestId) = await ChatToApprovalAsync(
            new[] { inv1, inv2 }, new[] { "INV-APPROVAL-201", "INV-APPROVAL-202" });

        var resp = await ResolveAsync(cid, requestId, "deleteEverything");
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);

        Assert.Equal("pending", (string)QueryInvoice(inv1)!.status);
        Assert.Equal(0L, CountExecutionResultMessages(cid));
    }

    // ═══════════════════════════════════════════════════════════
    // S6：cancel → 不执行、回填 resolution、不追加执行结果消息
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task S6_Cancel_NoExecution_BackfillsResolution()
    {
        var inv1 = SeedInvoice("取消发票A", "INV-APPROVAL-301", AdminUid);
        var inv2 = SeedInvoice("取消发票B", "INV-APPROVAL-302", AdminUid);
        await LoginAsync("admin");
        var (cid, requestId) = await ChatToApprovalAsync(
            new[] { inv1, inv2 }, new[] { "INV-APPROVAL-301", "INV-APPROVAL-302" });

        var resp = await ResolveAsync(cid, requestId, "cancel");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        Assert.Equal("pending", (string)QueryInvoice(inv1)!.status);
        Assert.Equal(1L, (long)QueryInvoice(inv1)!.version); // 未执行 → version 不变
        Assert.Equal(0L, CountExecutionResultMessages(cid));

        var approvalText = GetApprovalJson(cid, requestId)!;
        using var doc = JsonDocument.Parse(approvalText);
        Assert.Equal("cancel", doc.RootElement.GetProperty("resolution").GetProperty("optionKey").GetString());
    }

    // ═══════════════════════════════════════════════════════════
    // S7：requestId 找不到 → 404
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task S7_UnknownRequestId_Returns404()
    {
        var inv1 = SeedInvoice("404发票A", "INV-APPROVAL-401", AdminUid);
        var inv2 = SeedInvoice("404发票B", "INV-APPROVAL-402", AdminUid);
        await LoginAsync("admin");
        var (cid, _) = await ChatToApprovalAsync(
            new[] { inv1, inv2 }, new[] { "INV-APPROVAL-401", "INV-APPROVAL-402" });

        var resp = await ResolveAsync(cid, "approval_999_9", "confirm");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ═══════════════════════════════════════════════════════════
    // S8：action 绑定对账 — 后续轮再调写工具（防失配）：resolve 只执行
    // approval.action.args 里绑定的发票 ID，不落位置邻近消息的参数
    // ═══════════════════════════════════════════════════════════

    [Fact]
    public async Task S8_ResolveExecutesOnlyBoundActionArgs()
    {
        // 卡绑定的目标票（action.args 里只有这张）
        var boundId = SeedInvoice("绑定目标票", "INV-APPROVAL-501", AdminUid);
        // 干扰票：位置邻近 assistant 消息的 tool_calls 里描述这张（老实现会错位执行它）
        var decoyId = SeedInvoice("干扰票", "INV-APPROVAL-502", AdminUid);
        await LoginAsync("admin");

        var cid = SeedConversation(AdminUid);
        var requestId = $"approval_{cid}_{Guid.NewGuid():N}";
        var approval = JsonSerializer.Serialize(new
        {
            requestId,
            title = "是否将这 1 张发票标记为已收齐？",
            body = "将把以下发票标记为已收齐",
            options = new object[]
            {
                new { key = "confirm", label = "确认执行", @short = "将 1 张发票标记为已收齐", signal = 3, signalLabel = "写操作 · 需确认", tone = "success", primary = true },
                new { key = "cancel", label = "取消", @short = "本轮不执行任何修改", signal = 0 },
            },
            action = new
            {
                tool = "markInvoicesReceived",
                args = JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(new { invoiceIds = new[] { boundId } })),
            },
        });
        // 模拟历史现场：位置在卡消息前面的 assistant 轮消息，tool_calls 描述的是干扰票
        var decoyToolCalls = JsonSerializer.Serialize(new List<ToolCall>
        {
            new ToolCall
            {
                Id = "call-decoy",
                Type = "function",
                Function = new ToolCallFunction
                {
                    Name = "markInvoicesReceived",
                    Arguments = JsonSerializer.Serialize(new { invoiceIds = new[] { decoyId } }),
                },
            },
        });
        using (var conn = new SqliteConnection(ConnectionString))
        {
            conn.Open();
            conn.Execute(@"
                INSERT INTO agent_messages (conversation_id, role, content, tool_calls, created_at)
                VALUES (@Cid, 'assistant', '我准备标记发票', @ToolCalls, @Now)",
                new { Cid = cid, ToolCalls = decoyToolCalls, Now });
            conn.Execute(@"
                INSERT INTO agent_messages (conversation_id, role, content, approval, created_at)
                VALUES (@Cid, 'assistant', '操作待确认', @Approval, @Now)",
                new { Cid = cid, Approval = approval, Now });
        }

        var resp = await ResolveAsync(cid, requestId, "confirm");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        // 只执行 action.args 绑定的那张；干扰票不动
        Assert.Equal("received", (string)QueryInvoice(boundId)!.status);
        Assert.Equal("pending", (string)QueryInvoice(decoyId)!.status);

        // 审计记录的 updatedIds 结构化解析后必须精确等于 [boundId]
        using var conn2 = new SqliteConnection(ConnectionString);
        conn2.Open();
        var audit = conn2.QueryFirstOrDefault<string>(
            "SELECT details FROM audit_logs WHERE action='agent_approval_executed' ORDER BY id DESC");
        Assert.NotNull(audit);
        var updatedSeg = audit!.Split("updatedIds=[").Last().Split("]")[0];
        var auditedIds = updatedSeg.Split(',').Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(long.Parse).ToList();
        Assert.Equal(new[] { boundId }, auditedIds);
    }
}
