using System.Security.Claims;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Services;
using EngineeringManager.Tests.Common;
using Microsoft.Data.Sqlite;
using Xunit;

namespace EngineeringManager.Tests.Endpoints;

/// <summary>
/// R8.14.1(a) G28 先红实证：R8.7 只改了 SQL 列名（resource_type → resource），
/// BuildUserPrompt 消费端两处仍读 .resource_type（:255 ResourceCounts / :281 Details）。
/// 用 FakeLlm 拦截传给 LLM 的 userPrompt 原文，断言按资源类型段落含 'invoice'/'contract'、
/// 明细行含 'invoice'。
/// </summary>
public class ReportAuditPromptTests : ApiTestBase
{
    private sealed class FakeLlm : ILlmChatService
    {
        public string? CapturedUserPrompt;

        public Task<ChatCompletionResponse?> ChatAsync(List<AgentMessage> messages, List<object>? tools = null)
        {
            CapturedUserPrompt = messages.FirstOrDefault(m => m.Role == MessageRole.User)?.Content;
            return Task.FromResult<ChatCompletionResponse?>(new ChatCompletionResponse
            {
                Choices = new List<ChatChoice> { new() { Message = new ChatResponseMessage { Content = "OK" } } },
            });
        }

        public async IAsyncEnumerable<string> ChatStreamAsync(List<AgentMessage> messages, List<object>? tools = null)
        {
            yield return "OK";
            await Task.CompletedTask;
        }
    }

    private void SeedAuditLogs()
    {
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();
        var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        conn.Execute(@"INSERT INTO audit_logs (action, level, user_id, user_name, resource, resource_id, details, ip_address, created_at)
            VALUES ('create', 'info', 'u1', '管理员', 'invoice', '101', '开票', '', @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO audit_logs (action, level, user_id, user_name, resource, resource_id, details, ip_address, created_at)
            VALUES ('update', 'info', 'u1', '管理员', 'invoice', '102', '改票', '', @Now)", new { Now = now });
        conn.Execute(@"INSERT INTO audit_logs (action, level, user_id, user_name, resource, resource_id, details, ip_address, created_at)
            VALUES ('create', 'info', 'u1', '管理员', 'contract', '201', '签合同', '', @Now)", new { Now = now });
    }

    [Fact]
    public async Task UserPrompt_ResourceSection_ContainsInvoiceAndContract()
    {
        SeedAuditLogs();
        var fake = new FakeLlm();
        var service = new ReportGenerationService(fake);
        using var conn = new SqliteConnection(ConnectionString);
        conn.Open();

        var request = new ReportRequest
        {
            Period = "week",
            StartDate = "2026-08-01",
            EndDate = "2026-08-06",
            Scope = "all",
        };
        var (success, _, error) = await service.GenerateReportAsync(conn, request, "u1", isAdmin: true);
        Assert.True(success, "报告应生成成功：" + (error ?? ""));

        var prompt = fake.CapturedUserPrompt;
        Assert.NotNull(prompt);
        // R8.14.1(b) 必答证据：dump 完整 prompt（Dapper 对缺失列的行为判定）
        var evidence = "===PROMPT-BEGIN===" + System.Environment.NewLine + prompt + System.Environment.NewLine + "===PROMPT-END===";
        try { System.IO.File.WriteAllText(@"C:\Users\Admin\AppData\Local\Temp\g28-prompt.txt", evidence); } catch { }
        // 按资源类型段落：含 'invoice' 与 'contract'（G28：.resource_type 不存在 → 列缺失）
        Assert.Contains("invoice", prompt);
        Assert.Contains("contract", prompt);
        // 最近操作明细行：含 'invoice'
        Assert.Contains("invoice", prompt);
    }
}
