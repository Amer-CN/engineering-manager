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
    /// 默认过滤软删除（deleted_at IS NULL），只返回未删除会话。
    /// </summary>
    public async Task<IEnumerable<object>> GetConversationsAsync(
        IDbConnection db,
        string userId)
    {
        var conversations = await db.QueryAsync<dynamic>(@"
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(CASE WHEN role IN ('user','assistant') THEN 1 END)
                    FROM [agent_messages] WHERE conversation_id = c.id) as message_count,
                   (SELECT content FROM [agent_messages]
                    WHERE conversation_id = c.id
                    ORDER BY created_at DESC LIMIT 1) as last_message
            FROM [agent_conversations] c
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
            ORDER BY created_at ASC, id ASC
        ", new { ConversationId = conversationId });

        var rows = messages.ToList();

        // 预处理：role='tool' 消息的 content 存的是单个 ToolCallResult JSON
        // （写库见 AgentEndpoints.cs：Content = JsonSerializer.Serialize(result)）。
        // 解析失败 / content 为空 → 跳过该条（不产生空壳条目），不抛错。
        var parsedToolResults = new List<ToolCallResult?>(rows.Count);
        foreach (var row in rows)
        {
            if ((string)row.role != MessageRole.Tool || string.IsNullOrEmpty((string?)row.content))
            {
                parsedToolResults.Add(null);
                continue;
            }
            try
            {
                parsedToolResults.Add(JsonSerializer.Deserialize<ToolCallResult>((string)row.content));
            }
            catch
            {
                parsedToolResults.Add(null); /* 坏 JSON：跳过 */
            }
        }

        // 装配：单次顺序遍历（查询已按 created_at ASC, id ASC 排序，按 id 顺序归属，不用时间差）。
        // 每条 tool 消息的解析结果归属它前面最近的一条 assistant；
        // 遇到新 assistant 即切换归属（一轮内多次工具调用的多条 tool 消息全部归入同一条 assistant，
        // 与 live 路径 done 事件 toolCalls 数组形状一致）。
        // assistant 行 tool_calls 列存的是 LLM 描述符 JSON（id/type/function 形状），对前端无用，
        // 不再参与 toolCalls 反序列化；user/system 消息不受影响。
        var toolCallsByRow = new List<ToolCallResult>?[rows.Count];
        var currentAssistantIndex = -1;
        for (var i = 0; i < rows.Count; i++)
        {
            var role = (string)rows[i].role;
            if (role == MessageRole.Assistant)
            {
                currentAssistantIndex = i;
            }
            else if (role == MessageRole.Tool && currentAssistantIndex >= 0 && parsedToolResults[i] != null)
            {
                var list = toolCallsByRow[currentAssistantIndex] ??= new List<ToolCallResult>();
                list.Add(parsedToolResults[i]!);
            }
        }

        var messageList = new List<object>(rows.Count);
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            messageList.Add(new
            {
                id = (long)row.id,
                role = (string)row.role,
                content = (string?)row.content,
                toolCalls = toolCallsByRow[i],
                createdAt = (string)row.created_at,
            });
        }

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
    /// 校验对话归属：存在、属于该用户且未软删除。
    /// 供 chat / chat-stream 写入前做越权校验（同 detail 的归属口径）。
    /// </summary>
    public async Task<bool> IsConversationOwnedAsync(
        IDbConnection db,
        long conversationId,
        string userId)
    {
        var count = await db.ExecuteScalarAsync<long>(@"
            SELECT COUNT(*) FROM [agent_conversations]
            WHERE id = @Id AND user_id = @UserId AND deleted_at IS NULL
        ", new { Id = conversationId, UserId = userId });
        return count > 0;
    }

    /// <summary>
    /// 获取最近 N 条消息（用于 LLM 上下文），返回 AgentMessage 列表
    /// 按 id DESC 取最近 N 条后内存反转为时间正序
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
            ORDER BY id DESC
            LIMIT @Limit
        ", new { ConversationId = conversationId, Limit = limit });
        // 反转为时间正序，供 LLM 按对话顺序消费
        rows = rows.Reverse();

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

    /// <summary>
    /// 重命名会话（带所有权校验，软删除的不可改）
    /// </summary>
    public async Task<bool> RenameConversationAsync(
        IDbConnection db, long conversationId, string userId, string title)
    {
        var now = Common.NowString();
        var affected = await db.ExecuteAsync(
            @"UPDATE agent_conversations
              SET title = @Title, updated_at = @Now
              WHERE id = @Id AND user_id = @UserId AND deleted_at IS NULL",
            new { Title = title, Now = now, Id = conversationId, UserId = userId });
        return affected > 0;
    }

    /// <summary>
    /// 永久清理软删除超过 retentionDays 天的会话（连带 agent_messages）。
    /// 应用启动时 fire-and-forget 调用，用户不可见 — 防误删数据只保留 7 天。
    /// </summary>
    public async Task PurgeExpiredDeletedAsync(IDbConnection db, int retentionDays = 7)
    {
        // deleted_at 由 Common.NowString() 写入（本地时间 yyyy-MM-dd HH:mm:ss），字符串比较即时间比较
        var cutoff = DateTime.Now.AddDays(-retentionDays).ToString("yyyy-MM-dd HH:mm:ss");
        await db.ExecuteAsync(@"
            DELETE FROM [agent_messages]
            WHERE conversation_id IN (
                SELECT id FROM [agent_conversations]
                WHERE deleted_at IS NOT NULL AND deleted_at < @Cutoff
            );
            DELETE FROM [agent_conversations]
            WHERE deleted_at IS NOT NULL AND deleted_at < @Cutoff;
        ", new { Cutoff = cutoff });
    }
}