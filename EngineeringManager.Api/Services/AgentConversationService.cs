using System.Data;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;

namespace EngineeringManager.Api.Services;

/// <summary>
/// Agent 对话服务 — 管理对话生命周期与消息持久化
///
/// 对话表: agent_conversations
/// 消息表: agent_messages
/// 自动生成标题：取首条消息前 20 字符
/// </summary>
public class AgentConversationService
{
    /// <summary>
    /// 创建新对话 — 标题取首条消息前 20 字符
    /// </summary>
    public async Task<long> CreateConversationAsync(
        IDbConnection db,
        string userId,
        string title)
    {
        var now = Common.NowString();
        var id = await db.ExecuteScalarAsync<long>(@"
            INSERT INTO agent_conversations (user_id, title, created_at, updated_at)
            VALUES (@UserId, @Title, @Now, @Now);
            SELECT last_insert_rowid();
        ", new { UserId = userId, Title = title, Now = now });

        return id;
    }

    /// <summary>
    /// 保存消息到对话
    /// </summary>
    public async Task SaveMessageAsync(
        IDbConnection db,
        long conversationId,
        AgentMessage message)
    {
        var now = Common.NowString();
        var toolCallsJson = message.ToolCalls != null && message.ToolCalls.Count > 0
            ? JsonSerializer.Serialize(message.ToolCalls)
            : null;

        await db.ExecuteAsync(@"
            INSERT INTO agent_messages (conversation_id, role, content, tool_calls, tool_call_id, name, created_at)
            VALUES (@ConversationId, @Role, @Content, @ToolCalls, @ToolCallId, @Name, @Now)
        ", new
        {
            ConversationId = conversationId,
            message.Role,
            message.Content,
            ToolCalls = toolCallsJson,
            message.ToolCallId,
            message.Name,
            Now = now,
        });

        // 更新时间戳
        await db.ExecuteAsync(@"
            UPDATE agent_conversations SET updated_at = @Now
            WHERE id = @Id
        ", new { Now = now, Id = conversationId });
    }

    /// <summary>
    /// 获取用户对话列表（含消息数和最后一条消息摘要）
    /// </summary>
    public async Task<IEnumerable<object>> GetConversationsAsync(
        IDbConnection db,
        string userId)
    {
        var conversations = await db.QueryAsync<dynamic>(@"
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM agent_messages WHERE conversation_id = c.id) as message_count,
                   (SELECT content FROM agent_messages
                    WHERE conversation_id = c.id
                    ORDER BY created_at DESC LIMIT 1) as last_message
            FROM agent_conversations c
            WHERE c.user_id = @UserId AND c.deleted_at IS NULL
            ORDER BY c.updated_at DESC
        ", new { UserId = userId });

        return conversations.Select(c => (object)new
        {
            id = (long)c.id,
            title = (string)c.title,
            createdAt = (string)c.created_at,
            updatedAt = (string)c.updated_at,
            messageCount = (long)c.message_count,
            lastMessage = (string?)c.last_message,
        });
    }

    /// <summary>
    /// 获取对话详情（含消息列表）
    /// 必须校验 user_id 归属，防止越权读
    /// </summary>
    public async Task<object?> GetConversationDetailAsync(
        IDbConnection db,
        long conversationId,
        string userId)
    {
        var conv = await db.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT id, user_id, title, created_at, updated_at
            FROM agent_conversations
            WHERE id = @Id AND user_id = @UserId AND deleted_at IS NULL
        ", new { Id = conversationId, UserId = userId });

        if (conv == null) return null;

        var messages = await db.QueryAsync<dynamic>(@"
            SELECT id, role, content, tool_calls, tool_call_id, name, created_at
            FROM agent_messages
            WHERE conversation_id = @ConversationId
            ORDER BY created_at ASC
        ", new { ConversationId = conversationId });

        var messageList = messages.Select(m =>
        {
            List<ToolCallResult>? toolCalls = null;
            if (!string.IsNullOrEmpty(m.tool_calls))
            {
                try
                {
                    toolCalls = JsonSerializer.Deserialize<List<ToolCallResult>>(m.tool_calls);
                }
                catch { /* ignore deserialization errors */ }
            }

            return new
            {
                id = (long)m.id,
                role = (string)m.role,
                content = (string?)m.content,
                toolCalls,
                createdAt = (string)m.created_at,
            };
        });

        return new
        {
            id = (long)conv.id,
            title = (string)conv.title,
            messages = messageList,
            createdAt = (string)conv.created_at,
            updatedAt = (string)conv.updated_at,
        };
    }

    /// <summary>
    /// 获取最近 N 条消息（用于 LLM 上下文），返回 AgentMessage 列表
    /// </summary>
    public async Task<List<AgentMessage>> GetMessagesForLlmAsync(
        IDbConnection db,
        long conversationId,
        int limit = 50)
    {
        var rows = await db.QueryAsync<dynamic>(@"
            SELECT role, content, tool_calls, tool_call_id, name
            FROM agent_messages
            WHERE conversation_id = @ConversationId
            ORDER BY created_at ASC
            LIMIT @Limit
        ", new { ConversationId = conversationId, Limit = limit });

        var messages = new List<AgentMessage>();
        foreach (var row in rows)
        {
            List<ToolCall>? toolCalls = null;
            if (!string.IsNullOrEmpty(row.tool_calls))
            {
                try
                {
                    toolCalls = JsonSerializer.Deserialize<List<ToolCall>>(row.tool_calls);
                }
                catch { /* ignore */ }
            }

            // Check if tool_calls is actually tool results (from assistant or tool messages)
            if (row.role == "tool" && !string.IsNullOrEmpty(row.content))
            {
                // tool message with results
            }

            messages.Add(new AgentMessage
            {
                Role = (string)row.role,
                Content = row.content,
                ToolCalls = toolCalls,
                ToolCallId = row.tool_call_id,
                Name = row.name,
            });
        }

        return messages;
    }

    /// <summary>
    /// 软删除对话
    /// </summary>
    public async Task<bool> DeleteConversationAsync(
        IDbConnection db,
        long conversationId,
        string userId)
    {
        var now = Common.NowString();
        var affected = await db.ExecuteAsync(@"
            UPDATE agent_conversations
            SET deleted_at = @Now
            WHERE id = @Id AND user_id = @UserId AND deleted_at IS NULL
        ", new { Now = now, Id = conversationId, UserId = userId });

        return affected > 0;
    }
}