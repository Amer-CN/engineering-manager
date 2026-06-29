using System.Data;
using System.Text;
using System.Text.Json;
using Dapper;
using EngineeringManager.Api.Models;
using EngineeringManager.Api.Security;
using EngineeringManager.Api.Services;
using Microsoft.AspNetCore.Http;

namespace EngineeringManager.Api;

/// <summary>
/// Agent AI 助手端点 — 基于 LLM function calling 的智能查询
///
/// 路由分组: /api/agent
/// 权限控制: 聊天/对话需登录; setup 为白名单; setup/save 需 admin
/// </summary>
public static class AgentEndpoints
{
    public static void RegisterAgentEndpoints(this WebApplication app)
    {
        // ═══════════════════════════════════════════════════════════
        // 核心聊天
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/chat", async (
            HttpContext ctx,
            IDbConnection db,
            AgentChatRequest request,
            LlmProviderService llm,
            AgentToolService tools,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                // 1. 创建或获取对话
                long conversationId;
                if (request.ConversationId.HasValue)
                {
                    conversationId = request.ConversationId.Value;
                }
                else
                {
                    var title = request.Message.Truncate(20);
                    conversationId = await conversations.CreateConversationAsync(db, uid, title);
                }

                // 2. 保存用户消息
                var userMsg = new AgentMessage
                {
                    Role = MessageRole.User,
                    Content = request.Message,
                };
                await conversations.SaveMessageAsync(db, conversationId, userMsg);

                // 3. 构建 LLM 消息列表
                var llmMessages = new List<AgentMessage>
                {
                    new AgentMessage
                    {
                        Role = MessageRole.System,
                        Content = BuildSystemPrompt(),
                    }
                };

                // 加载历史消息（最近 40 条）
                var history = await conversations.GetMessagesForLlmAsync(db, conversationId, 40);
                llmMessages.AddRange(history);

                // 4. 获取可用工具
                var availableTools = tools.GetAvailableTools(ctx);

                // 5. 调用 LLM（最多 5 轮 tool_use 循环）
                var maxRounds = 5;
                var toolResults = new List<ToolCallResult>();

                for (int round = 0; round < maxRounds; round++)
                {
                    var response = await llm.ChatAsync(llmMessages, availableTools);

                    if (response == null)
                    {
                        toolResults.Add(new ToolCallResult
                        {
                            ToolName = "llm",
                            ToolCallId = "",
                            Success = false,
                            Error = "LLM 调用失败，请检查配置",
                        });
                        break;
                    }

                    var choice = response.Choices.FirstOrDefault();
                    if (choice == null) break;

                    // 检查是否有 tool_calls
                    if (choice.Message.ToolCalls != null && choice.Message.ToolCalls.Count > 0)
                    {
                        // 保存 assistant 消息（含 tool_calls）
                        var assistantMsg = new AgentMessage
                        {
                            Role = MessageRole.Assistant,
                            Content = choice.Message.Content,
                            ToolCalls = choice.Message.ToolCalls,
                        };
                        await conversations.SaveMessageAsync(db, conversationId, assistantMsg);

                        // 添加 assistant 消息到 LLM 上下文
                        llmMessages.Add(assistantMsg);

                        // 执行每个工具调用
                        foreach (var tc in choice.Message.ToolCalls)
                        {
                            JsonElement args;
                            try
                            {
                                args = JsonDocument.Parse(tc.Function.Arguments).RootElement;
                            }
                            catch
                            {
                                args = JsonDocument.Parse("{}").RootElement;
                            }

                            var result = await tools.ExecuteToolAsync(
                                tc.Function.Name, args, ctx, db);
                            result = result with { ToolCallId = tc.Id };

                            toolResults.Add(result);

                            // 构建 tool 消息反馈 LLM
                            var toolMsg = new AgentMessage
                            {
                                Role = MessageRole.Tool,
                                Content = JsonSerializer.Serialize(result),
                                ToolCallId = tc.Id,
                                Name = tc.Function.Name,
                            };
                            await conversations.SaveMessageAsync(db, conversationId, toolMsg);
                            llmMessages.Add(toolMsg);
                        }

                        // 继续循环，让 LLM 处理工具结果
                        continue;
                    }

                    // 无 tool_calls：最终文本回复
                    var finalContent = choice.Message.Content ?? "";
                    var finalMsg = new AgentMessage
                    {
                        Role = MessageRole.Assistant,
                        Content = finalContent,
                    };
                    await conversations.SaveMessageAsync(db, conversationId, finalMsg);

                    // 注意：字段名必须是 content，与前端 AgentMessage.content 契约对齐
                    return Common.Ok(new
                    {
                        success = true,
                        conversationId,
                        message = new
                        {
                            role = MessageRole.Assistant.ToString().ToLower(),
                            content = finalContent,
                        },
                        toolCalls = toolResults,
                    });
                }

                // 达到最大轮数（tool_use loop 终止），返回最后一个非 tool 回复
                return Common.Ok(new
                {
                    success = true,
                    conversationId,
                    message = new
                    {
                        role = MessageRole.Assistant.ToString().ToLower(),
                        content = "已执行工具查询，详见上方结果。",
                    },
                    toolCalls = toolResults,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/chat 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 核心聊天 — SSE 流式版本
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/chat/stream", async (
            HttpContext ctx,
            IDbConnection db,
            AgentChatRequest request,
            LlmProviderService llm,
            AgentToolService tools,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
            {
                ctx.Response.StatusCode = 401;
                await ctx.Response.WriteAsync("data: {\"error\":\"未登录\"}\n\n");
                return;
            }

            // 设置 SSE 响应头
            ctx.Response.ContentType = "text/event-stream";
            ctx.Response.Headers.Append("Cache-Control", "no-cache");
            ctx.Response.Headers.Append("Connection", "keep-alive");
            ctx.Response.Headers.Append("X-Accel-Buffering", "no");

            try
            {
                // 1. 创建或获取对话
                long conversationId;
                if (request.ConversationId.HasValue)
                {
                    conversationId = request.ConversationId.Value;
                }
                else
                {
                    var title = request.Message.Truncate(20);
                    conversationId = await conversations.CreateConversationAsync(db, uid, title);
                }

                // 发送对话 ID
                await WriteSSE(ctx, new { type = "conversation_id", conversationId });

                // 2. 保存用户消息
                var userMsg = new AgentMessage
                {
                    Role = MessageRole.User,
                    Content = request.Message,
                };
                await conversations.SaveMessageAsync(db, conversationId, userMsg);

                // 3. 构建 LLM 消息列表
                var llmMessages = new List<AgentMessage>
                {
                    new AgentMessage
                    {
                        Role = MessageRole.System,
                        Content = BuildSystemPrompt(),
                    }
                };

                // 加载历史消息（最近 40 条）
                var history = await conversations.GetMessagesForLlmAsync(db, conversationId, 40);
                llmMessages.AddRange(history);

                // 4. 获取可用工具
                var availableTools = tools.GetAvailableTools(ctx);

                // 5. 调用 LLM（最多 5 轮 tool_use 循环）
                var maxRounds = 5;
                var toolResults = new List<ToolCallResult>();

                for (int round = 0; round < maxRounds; round++)
                {
                    var response = await llm.ChatAsync(llmMessages, availableTools);

                    if (response == null)
                    {
                        toolResults.Add(new ToolCallResult
                        {
                            ToolName = "llm",
                            ToolCallId = "",
                            Success = false,
                            Error = "LLM 调用失败，请检查配置",
                        });
                        await WriteSSE(ctx, new { type = "error", error = "LLM 调用失败，请检查配置" });
                        break;
                    }

                    var choice = response.Choices.FirstOrDefault();
                    if (choice == null) break;

                    // 检查是否有 tool_calls
                    if (choice.Message.ToolCalls != null && choice.Message.ToolCalls.Count > 0)
                    {
                        // 保存 assistant 消息（含 tool_calls）
                        var assistantMsg = new AgentMessage
                        {
                            Role = MessageRole.Assistant,
                            Content = choice.Message.Content,
                            ToolCalls = choice.Message.ToolCalls,
                        };
                        await conversations.SaveMessageAsync(db, conversationId, assistantMsg);
                        llmMessages.Add(assistantMsg);

                        // 执行每个工具调用
                        foreach (var tc in choice.Message.ToolCalls)
                        {
                            // 发送工具执行进度
                            await WriteSSE(ctx, new { type = "tool", name = tc.Function.Name });

                            JsonElement args;
                            try
                            {
                                args = JsonDocument.Parse(tc.Function.Arguments).RootElement;
                            }
                            catch
                            {
                                args = JsonDocument.Parse("{}").RootElement;
                            }

                            var result = await tools.ExecuteToolAsync(
                                tc.Function.Name, args, ctx, db);
                            result = result with { ToolCallId = tc.Id };

                            toolResults.Add(result);

                            // 构建 tool 消息反馈 LLM
                            var toolMsg = new AgentMessage
                            {
                                Role = MessageRole.Tool,
                                Content = JsonSerializer.Serialize(result),
                                ToolCallId = tc.Id,
                                Name = tc.Function.Name,
                            };
                            await conversations.SaveMessageAsync(db, conversationId, toolMsg);
                            llmMessages.Add(toolMsg);
                        }

                        // 继续循环，让 LLM 处理工具结果
                        continue;
                    }

                    // 无 tool_calls：流式输出最终文本回复
                    var finalContentBuilder = new StringBuilder();

                    // 使用流式 API 输出最终回复
                    await foreach (var chunk in llm.ChatStreamAsync(llmMessages))
                    {
                        try
                        {
                            var chunkDoc = JsonDocument.Parse(chunk);
                            var delta = chunkDoc.RootElement
                                .GetProperty("choices")[0]
                                .GetProperty("delta");

                            if (delta.TryGetProperty("content", out var contentProp))
                            {
                                var text = contentProp.GetString();
                                if (!string.IsNullOrEmpty(text))
                                {
                                    finalContentBuilder.Append(text);
                                    await WriteSSE(ctx, new { type = "content", text });
                                }
                            }
                        }
                        catch
                        {
                            // 忽略解析错误的 chunk
                        }
                    }

                    // 保存最终消息
                    var finalContent = finalContentBuilder.ToString();
                    if (!string.IsNullOrEmpty(finalContent))
                    {
                        var finalMsg = new AgentMessage
                        {
                            Role = MessageRole.Assistant,
                            Content = finalContent,
                        };
                        await conversations.SaveMessageAsync(db, conversationId, finalMsg);
                    }

                    // 发送完成信号
                    await WriteSSE(ctx, new
                    {
                        type = "done",
                        conversationId,
                        toolCalls = toolResults,
                    });

                    return;
                }

                // 达到最大轮数
                await WriteSSE(ctx, new
                {
                    type = "done",
                    conversationId,
                    message = "已执行工具查询，详见上方结果。",
                    toolCalls = toolResults,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/chat/stream 失败: {ex.Message}");
                await WriteSSE(ctx, new { type = "error", error = Common.Sanitize(ex.Message) });
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 对话列表
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/agent/conversations", async (
            HttpContext ctx,
            IDbConnection db,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                var list = await conversations.GetConversationsAsync(db, uid);
                return Common.Ok(list);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/conversations 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 对话详情
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/agent/conversations/{id}", async (
            HttpContext ctx,
            long id,
            IDbConnection db,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                var detail = await conversations.GetConversationDetailAsync(db, id, uid!);
                if (detail == null)
                    return Common.NotFound("对话不存在");
                return Common.Ok(detail);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/conversations/{id} 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 删除对话
        // ═══════════════════════════════════════════════════════════

        app.MapDelete("/api/agent/conversations/{id}", async (
            HttpContext ctx,
            long id,
            IDbConnection db,
            AgentConversationService conversations) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                var ok = await conversations.DeleteConversationAsync(db, id, uid);
                return ok ? Common.Ok() : Common.NotFound("对话不存在或无权操作");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/conversations/{id} DELETE 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 配置状态（白名单，无需登录）
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/agent/setup/status", (LlmProviderService llm) =>
        {
            try
            {
                var config = llm.GetConfig();
                string source = config.UseBuiltIn ? "builtin" :
                    (config.ProviderName == "env" ? "env" : "custom");

                return Common.Ok(new
                {
                    configured = true,
                    provider = config.ProviderName,
                    model = config.Model,
                    useBuiltIn = config.UseBuiltIn,
                    source,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/setup/status 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 测试连接（白名单，无需登录）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/setup/test", async (
            HttpContext ctx,
            LlmProviderService llm) =>
        {
            try
            {
                using var doc = await JsonDocument.ParseAsync(ctx.Request.Body);
                var root = doc.RootElement;

                var baseUrl = root.GetProperty("baseUrl").GetString() ?? "";
                var apiKey = root.GetProperty("apiKey").GetString() ?? "";

                if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(apiKey))
                    return Common.Fail("baseUrl 和 apiKey 不能为空");

                var (success, models, error) = await llm.TestConnectionAsync(baseUrl, apiKey);

                return Common.Ok(new
                {
                    success,
                    message = success ? "连接成功" : error,
                    data = new { models, modelCount = models.Length },
                    error,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/setup/test 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 保存配置（需 admin）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/setup/save", async (
            HttpContext ctx,
            LlmProviderService llm) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);
            if (!CurrentUser.IsAdmin(ctx))
                return Common.Fail("仅管理员可修改配置", 403);

            try
            {
                using var doc = await JsonDocument.ParseAsync(ctx.Request.Body);
                var root = doc.RootElement;

                var config = new LlmProviderConfig
                {
                    ProviderName = GetStringProp(root, "providerName") ?? "Custom",
                    BaseUrl = GetStringProp(root, "baseUrl") ?? "https://apihub.agnes-ai.com/v1",
                    ApiKey = GetStringProp(root, "apiKey") ?? "",
                    Model = GetStringProp(root, "model") ?? "agnes-2.0-flash",
                    UseBuiltIn = GetBoolProp(root, "useBuiltIn"),
                    Temperature = GetDoubleProp(root, "temperature"),
                    MaxTokens = GetIntProp(root, "maxTokens"),
                };

                await llm.SaveUserConfigAsync(config);
                return Common.Ok(new { message = "配置已保存" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/setup/save 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 获取配置（需登录）
        // ═══════════════════════════════════════════════════════════

        app.MapGet("/api/agent/config", (HttpContext ctx, LlmProviderService llm) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);

            try
            {
                var config = llm.GetConfig();
                return Common.Ok(new
                {
                    config.ProviderName,
                    config.BaseUrl,
                    config.Model,
                    config.UseBuiltIn,
                    config.Temperature,
                    config.MaxTokens,
                    hasApiKey = !string.IsNullOrEmpty(config.ApiKey),
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/config 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 重载配置（需 admin）
        // ═══════════════════════════════════════════════════════════

        app.MapPost("/api/agent/config/reload", async (
            HttpContext ctx,
            LlmProviderService llm) =>
        {
            var uid = CurrentUser.GetUserId(ctx);
            if (string.IsNullOrEmpty(uid))
                return Common.Fail("未登录", 401);
            if (!CurrentUser.IsAdmin(ctx))
                return Common.Fail("仅管理员可重载配置", 403);

            try
            {
                await llm.ReloadConfigAsync();
                return Common.Ok(new { message = "配置已重新加载" });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AgentEndpoints] /api/agent/config/reload 失败: {ex.Message}");
                return Common.Fail(Common.Sanitize(ex.Message));
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // 辅助方法
    // ═══════════════════════════════════════════════════════════════

    private static string BuildSystemPrompt()
    {
        var lines = new string[]
        {
            "你是工程管家 AI 助手，一个面向建筑工程管理场景的智能数据分析与查询助手。",
            "",
            "## 你的身份",
            "- 你是工程管家系统的内置 AI 助手",
            "- 你可以查询项目、成员、发票、结算、合同、库存、成本等数据",
            "- 你的回答应当专业、简洁、准确",
            "",
            "## 数据权限",
            "- 你只能访问当前登录用户有权查看的数据",
            "- 你的查询结果会自动反映用户的权限范围",
            "",
            "## 可用功能",
            "你可以调用以下工具来获取实时数据：",
            "- getDashboardStats — 仪表盘总览（项目数、成员数、发票数、收支统计）",
            "- getProjects — 项目列表",
            "- getProjectDetail — 项目详情（需要 projectId）",
            "- getInvoices — 发票列表，可选按项目筛选",
            "- getPendingInvoices — 待处理发票",
            "- getSettlements — 结算记录，可选按项目筛选",
            "- getPendingSettlements — 待处理结算",
            "- getMembers — 成员列表",
            "- getWorkers — 工人列表",
            "- getContracts — 合同列表（收入+支出），可选按项目筛选",
            "- getInventory — 库存物料列表",
            "- getCostSummary — 成本汇总（按分类统计收支），可选按项目筛选",
            "- getPartners — 合作伙伴列表",
            "- runSafeQuery — 受限只读查询（高级功能，仅 admin/manager 可用）",
            "",
            "## runSafeQuery 使用说明",
            "当现有工具无法满足查询需求时，可以使用 runSafeQuery 执行自定义 SQL 查询。",
            "限制条件：",
            "- 只允许 SELECT 语句",
            "- 只能查询白名单表：projects, members, workers, invoices, settlements, cost_ledger, income_contracts, expense_contracts, inventory_items, partners",
            "- 不允许 SELECT *，必须明确指定列名",
            "- 查询结果会自动按你的权限过滤（只能看到你有权访问的数据）",
            "- 自动添加 LIMIT 100",
            "- 敏感信息（身份证、手机、银行账号）会自动脱敏",
            "",
            "示例用法：",
            "```sql",
            "SELECT name, status, budget FROM projects WHERE status = 'active'",
            "```",
            "",
            "## 术语映射（中文 → 数据库表名）",
            "- 项目 = projects",
            "- 成员/员工 = members",
            "- 工人 = workers",
            "- 发票 = invoices",
            "- 结算 = settlements",
            "- 成本台账/成本明细 = cost_ledger",
            "- 收入合同 = income_contracts",
            "- 支出合同 = expense_contracts",
            "- 合作伙伴/合作方 = partners",
            "- 库存/物料 = inventory_items",
            "",
            "## 字段含义说明",
            "- projects.status: 项目状态（active=进行中, completed=已完成, pending=待开工）",
            "- cost_ledger.direction: 收支方向（income=收入, expense=支出）",
            "- cost_ledger.category: 成本分类（人工费, 材料费, 机械费, 管理费, 其他）",
            "- members.member_type: 成员类型（staff=管理人员, worker=工人）",
            "- members.status: 成员状态（active=在职, left=离职）",
            "- invoices.type: 发票类型（income=收入发票, expense=支出发票）",
            "- invoices.status: 发票状态（pending=待处理, received=已收, sent=已开）",
            "- settlements.status: 结算状态（pending=待结算, completed=已结算）",
            "- partners.category: 合作方分类（labor=劳务分包, material=材料供应, equipment=设备租赁）",
            "",
            "## 工具选择指引",
            "1. 查询项目列表 → getProjects",
            "2. 查询单个项目详情 → getProjectDetail（需要 projectId）",
            "3. 查询发票 → getInvoices（可选 projectId 筛选）",
            "4. 查询待处理发票 → getPendingInvoices",
            "5. 查询结算记录 → getSettlements（可选 projectId 筛选）",
            "6. 查询成本汇总（按分类统计）→ getCostSummary（可选 projectId 筛选）",
            "7. 查询成本明细（按时间/项目）→ runSafeQuery（自定义 SQL）",
            "8. 按项目筛选数据 → 先 getProjects 获取 projectId，再用 projectId 调用其他工具",
            "",
            "## 回答规范",
            "1. 当用户询问数据时，主动调用对应工具获取最新数据",
            "2. 将查询结果用中文清晰呈现，必要时用列表或表格形式",
            "3. 如果数据为空，如实告知用户\u300c暂无相关数据\u300d",
            "4. 涉及金额时保留两位小数，加上\u300c元\u300d单位",
            "5. 当用户问及敏感个人信息（身份证、手机号、银行账号），提醒已做脱敏处理",
            "6. 在回答末尾可附加简要的数据总结",
            "",
            "## 禁止行为",
            "- 不要编造数据，只回答基于工具查询获得的真实数据",
            "- 不要透露系统底层技术细节",
            "- 不要执行任何修改操作，你只有只读查询权限",
            "- 不要泄露 API 密钥或内部配置信息",
        };
        return string.Join("\n", lines);
    }

    private static string? GetStringProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String)
            return prop.GetString();
        return null;
    }

    private static bool GetBoolProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.True) return true;
            if (prop.ValueKind == JsonValueKind.False) return false;
        }
        return true; // default: use built-in
    }

    private static double GetDoubleProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
            return prop.GetDouble();
        return 0.7;
    }

    private static int GetIntProp(JsonElement root, string name)
    {
        if (root.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.Number)
            return prop.GetInt32();
        return 4096;
    }

    /// <summary>
    /// 写入 SSE 事件并刷新响应流
    /// </summary>
    private static async Task WriteSSE(HttpContext ctx, object data)
    {
        var json = JsonSerializer.Serialize(data);
        await ctx.Response.WriteAsync($"data: {json}\n\n");
        await ctx.Response.Body.FlushAsync();
    }
}